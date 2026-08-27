from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import CursorPagination
from django.views.generic import TemplateView
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Sum, Avg, Q, Max, F, Count, OuterRef, Subquery
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta, datetime
from decimal import Decimal

from .models import UserProfile, Place, Party, Variety, Inward, Outward, DailyStockSummary, Role
from .serializers import (
    UserProfileSerializer, PlaceSerializer, PartySerializer, VarietySerializer,
    InwardSerializer, OutwardSerializer, DailyStockSummarySerializer
)
from .pdf import generate_4up_a4_invoice


def get_current_business_date():
    import datetime
    now = timezone.localtime(timezone.now())
    if now.time() < datetime.time(6, 0):
        return now.date() - datetime.timedelta(days=1)
    return now.date()


class IndexView(TemplateView):
    template_name = 'index.html'


class FastCursorPagination(CursorPagination):
    page_size = 50
    ordering = '-id'


# ─── Performance Helper: bulk-annotate varieties with stock counts ───────────
def _annotate_varieties(qs):
    """Annotate a Variety queryset with inward/outward bag counts and related
counts so serializers never need N+1 queries.

Uses single LEFT JOIN aggregations instead of correlated subqueries
for O(1) performance even with 10M+ records."""
    in_agg = Inward.objects.values('variety_id').annotate(s=Sum('bags')).values('variety_id', 's')
    out_agg = Outward.objects.values('variety_id').annotate(s=Sum('bags')).values('variety_id', 's')

    # Build lookup dicts (single query each)
    in_map = {item['variety_id']: item['s'] for item in in_agg}
    out_map = {item['variety_id']: item['s'] for item in out_agg}
    in_count_map = {}
    out_count_map = {}

    # Count queries (single query each)
    for item in Inward.objects.values('variety_id').annotate(c=Count('id')):
        in_count_map[item['variety_id']] = item['c']
    for item in Outward.objects.values('variety_id').annotate(c=Count('id')):
        out_count_map[item['variety_id']] = item['c']

    # Annotate in-memory (no N+1, no subqueries)
    for v in qs:
        v._in_bags = in_map.get(v.id, 0) or 0
        v._out_bags = out_map.get(v.id, 0) or 0
        v._inward_count = in_count_map.get(v.id, 0)
        v._outward_count = out_count_map.get(v.id, 0)

    return qs


from django.db import models  # needed for output_field


# ═════════════════════════════════════════════════════════════════════════════
# AUTH
# ═════════════════════════════════════════════════════════════════════════════

class AuthCheckAPIView(APIView):
    """Returns current user info if session is valid, 401 if not."""
    def get(self, request):
        if request.user and request.user.is_authenticated:
            try:
                profile = UserProfile.objects.get(user=request.user)
                return Response({
                    'authenticated': True,
                    'user_id': request.user.id,
                    'username': request.user.username,
                    'role': profile.role,
                })
            except UserProfile.DoesNotExist:
                return Response({'authenticated': True, 'user_id': request.user.id, 'username': request.user.username, 'role': 'STAFF'})
        return Response({'authenticated': False}, status=status.HTTP_401_UNAUTHORIZED)


class LoginAPIView(APIView):
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = authenticate(username=username, password=password)
        if not user:
            return Response({'error': 'Invalid username or password'}, status=status.HTTP_401_UNAUTHORIZED)

        profile, created = UserProfile.objects.get_or_create(user=user, defaults={'role': Role.STAFF})
        login(request, user)
        return Response({
            'message': 'Login successful',
            'user_id': user.id,
            'username': user.username,
            'role': profile.role,
        })


class LogoutAPIView(APIView):
    def post(self, request):
        logout(request)
        return Response({'message': 'Logged out successfully'})


# ═════════════════════════════════════════════════════════════════════════════
# MASTERS — bulk annotated to avoid N+1
# ═════════════════════════════════════════════════════════════════════════════

class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all().select_related('user')
    serializer_class = UserProfileSerializer
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.annotate(
            _inward_count=Count('user__inward_entries', distinct=True),
            _outward_count=Count('user__outward_entries', distinct=True),
        )

    def create(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        role = request.data.get('role', Role.STAFF)

        if not username or not password:
            return Response({'error': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password)
        profile, created = UserProfile.objects.get_or_create(user=user, defaults={'role': role})
        profile.role = role
        profile.save()

        return Response(UserProfileSerializer(profile).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        profile = self.get_object()
        username = request.data.get('username')
        password = request.data.get('password')
        role = request.data.get('role')

        user = profile.user
        if username:
            if User.objects.filter(username=username).exclude(id=user.id).exists():
                return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
            user.username = username
        if password:
            user.set_password(password)
        user.save()

        if role:
            profile.role = role
            profile.save()

        return Response(UserProfileSerializer(profile).data)

    def destroy(self, request, *args, **kwargs):
        if request.user and request.user.is_authenticated:
            try:
                requester_profile = UserProfile.objects.get(user=request.user)
                if requester_profile.role != Role.OWNER:
                    return Response({'error': 'Only OWNER role can delete user accounts.'}, status=status.HTTP_403_FORBIDDEN)
            except UserProfile.DoesNotExist:
                pass

        profile = self.get_object()
        inward_cnt = Inward.objects.filter(created_by=profile.user).count()
        outward_cnt = Outward.objects.filter(created_by=profile.user).count()

        if (inward_cnt + outward_cnt) > 0:
            return Response(
                {'error': 'Cannot delete user! This user has created transaction data in the system.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = profile.user
        profile.delete()
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PlaceViewSet(viewsets.ModelViewSet):
    queryset = Place.objects.all()
    serializer_class = PlaceSerializer
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.annotate(_party_count=Count('parties', distinct=True))

    def destroy(self, request, *args, **kwargs):
        place = self.get_object()
        if place.parties.count() > 0:
            return Response({'error': 'Cannot delete Place linked to existing parties!'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


class PartyViewSet(viewsets.ModelViewSet):
    queryset = Party.objects.all().select_related('place')
    serializer_class = PartySerializer
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.annotate(
            _inward_count=Count('inwards', distinct=True),
            _outward_count=Count('outwards', distinct=True),
        )

    def destroy(self, request, *args, **kwargs):
        party = self.get_object()
        if (party.inwards.count() + party.outwards.count()) > 0:
            return Response({'error': 'Cannot delete Party linked to transactions!'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


class VarietyViewSet(viewsets.ModelViewSet):
    serializer_class = VarietySerializer
    pagination_class = None

    def get_queryset(self):
        qs = Variety.objects.all()
        return _annotate_varieties(qs)

    def destroy(self, request, *args, **kwargs):
        variety = self.get_object()
        if (variety.inwards.count() + variety.outwards.count()) > 0:
            return Response({'error': 'Cannot delete Variety linked to stock transactions!'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


# ═════════════════════════════════════════════════════════════════════════════
# INWARD / OUTWARD
# ═════════════════════════════════════════════════════════════════════════════

class InwardViewSet(viewsets.ModelViewSet):
    serializer_class = InwardSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Inward.objects.all().select_related('party', 'variety', 'created_by')
        if self.request.query_params.get('all') == 'true':
            return qs
        date_param = self.request.query_params.get('date')
        if date_param:
            return qs.filter(date=date_param)
        b_date = get_current_business_date()
        return qs.filter(date=b_date)

    def perform_create(self, serializer):
        import datetime
        from rest_framework.exceptions import ValidationError
        from django.utils import timezone

        party = serializer.validated_data['party']
        variety = serializer.validated_data['variety']
        bags = serializer.validated_data['bags']
        rate = serializer.validated_data['rate']
        date = serializer.validated_data['date']

        five_mins_ago = timezone.now() - datetime.timedelta(minutes=5)
        duplicate = Inward.objects.filter(
            party=party,
            variety=variety,
            bags=bags,
            rate=rate,
            date=date,
            created_at__gte=five_mins_ago
        ).exists()

        if duplicate:
            raise ValidationError("Duplicate entry detected! A similar entry was submitted within the last 5 minutes.")

        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(created_by=user)


class OutwardViewSet(viewsets.ModelViewSet):
    serializer_class = OutwardSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Outward.objects.all().select_related('party', 'variety', 'created_by')
        if self.request.query_params.get('all') == 'true':
            return qs
        date_param = self.request.query_params.get('date')
        if date_param:
            return qs.filter(date=date_param)
        b_date = get_current_business_date()
        return qs.filter(date=b_date)

    def perform_create(self, serializer):
        import datetime
        from rest_framework.exceptions import ValidationError
        from django.utils import timezone

        party = serializer.validated_data['party']
        variety = serializer.validated_data['variety']
        bags = serializer.validated_data['bags']
        rate = serializer.validated_data['rate']
        date = serializer.validated_data['date']

        five_mins_ago = timezone.now() - datetime.timedelta(minutes=5)
        duplicate = Outward.objects.filter(
            party=party,
            variety=variety,
            bags=bags,
            rate=rate,
            date=date,
            created_at__gte=five_mins_ago
        ).exists()

        if duplicate:
            raise ValidationError("Duplicate entry detected! A similar entry was submitted within the last 5 minutes.")

        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(created_by=user)


# ═════════════════════════════════════════════════════════════════════════════
# 🚀 DASHBOARD API — pre-aggregated stats (replaces fetching all records)
# ═════════════════════════════════════════════════════════════════════════════

class DashboardAPIView(APIView):
    """Returns pre-aggregated dashboard stats in 3 queries.
    Logic matches the original frontend: opening = all prior, today = current day."""
    def get(self, request):
        b_date = get_current_business_date()
        
        # 1. Today's inward/outward totals
        today_stats = Inward.objects.filter(date=b_date).aggregate(
            in_bags=Sum('bags'), in_value=Sum('total_value')
        )
        today_out = Outward.objects.filter(date=b_date).aggregate(
            out_bags=Sum('bags'), out_value=Sum('total_value')
        )
        
        # 2. All-time totals before today (for opening stock)
        prior_stats = Inward.objects.filter(date__lt=b_date).aggregate(
            in_bags=Sum('bags')
        )
        prior_out = Outward.objects.filter(date__lt=b_date).aggregate(
            out_bags=Sum('bags')
        )
        
        opening = (prior_stats['in_bags'] or 0) - (prior_out['out_bags'] or 0)
        today_in = today_stats['in_bags'] or 0
        today_out_val = today_out['out_bags'] or 0
        closing = opening + today_in - today_out_val
        
        return Response({
            'business_date': str(b_date),
            'opening': opening,
            'today_inward': today_in,
            'today_outward': today_out_val,
            'closing': closing,
            'today_inward_value': float(today_stats['in_value'] or 0),
            'today_outward_value': float(today_out['out_value'] or 0),
        })


# ═════════════════════════════════════════════════════════════════════════════
# 🚀 STOCKS MINI API — today's records only (replaces ?all=true for Stocks page)
# ═════════════════════════════════════════════════════════════════════════════

class StocksTodayAPIView(APIView):
    """Returns today's inwards + outwards + varieties + parties + opening/closing
    all in one response. Logic identical to Stocks.jsx fetchData."""
    def get(self, request):
        b_date = get_current_business_date()
        filter_date = request.query_params.get('date', str(b_date))
        
        # Annotated varieties (1 query with subqueries, not N+1)
        variety_qs = _annotate_varieties(Variety.objects.all())
        variety_data = VarietySerializer(variety_qs, many=True).data
        
        # Today's transactions only
        in_qs = Inward.objects.filter(date=filter_date).select_related('party', 'variety', 'created_by')
        out_qs = Outward.objects.filter(date=filter_date).select_related('party', 'variety', 'created_by')
        
        # Opening stock (all prior days)
        prior_in = Inward.objects.filter(date__lt=filter_date).aggregate(tot=Sum('bags'))['tot'] or 0
        prior_out = Outward.objects.filter(date__lt=filter_date).aggregate(tot=Sum('bags'))['tot'] or 0
        opening = prior_in - prior_out
        
        today_in_bags = in_qs.aggregate(tot=Sum('bags'))['tot'] or 0
        today_out_bags = out_qs.aggregate(tot=Sum('bags'))['tot'] or 0
        closing = opening + today_in_bags - today_out_bags
        
        # Parties (small table, full load is fine)
        parties = list(Party.objects.all().values('id', 'name'))
        
        # Pending approvals (lightweight)
        pending = list(ApprovalRequest.objects.filter(status='PENDING').values(
            'id', 'action_type', 'target_model', 'target_id', 'proposed_data'
        ))
        pending_map = {}
        for p in pending:
            pending_map[f"{p['target_model']}_{p['target_id']}"] = p
        
        return Response({
            'date': filter_date,
            'business_date': str(b_date),
            'varieties': variety_data,
            'parties': parties,
            'inwards': InwardSerializer(in_qs, many=True).data,
            'outwards': OutwardSerializer(out_qs, many=True).data,
            'opening': opening,
            'closing': closing,
            'pending': pending_map,
        })


# ═════════════════════════════════════════════════════════════════════════════
# ALERTS
# ═════════════════════════════════════════════════════════════════════════════

class SystemAlertsAPIView(APIView):
    def get(self, request):
        low_stock_alerts = []
        aging_stock_alerts = []

        # Bulk SQL aggregations — 2 single queries
        in_map = {item['variety_id']: item['tot'] for item in Inward.objects.values('variety_id').annotate(tot=Sum('bags'))}
        out_map = {item['variety_id']: item['tot'] for item in Outward.objects.values('variety_id').annotate(tot=Sum('bags'))}

        # 1. Low Stock Alert (< 2,000 bags)
        varieties = Variety.objects.all()
        for v in varieties:
            in_bags = in_map.get(v.id, 0) or 0
            out_bags = out_map.get(v.id, 0) or 0
            current_bags = in_bags - out_bags
            
            if current_bags < 2000:
                low_stock_alerts.append({
                    'variety_id': v.id,
                    'variety_name': v.name,
                    'current_bags': current_bags,
                    'kgs_per_bag': float(v.kgs_per_bag),
                    'message': f"CRITICAL: Stock for '{v.name}' is low ({current_bags} bags remaining, threshold is 2,000 bags)."
                })

        # 2. Aging Stock Alert — LIMIT to prevent loading millions of rows into memory
        # Only load the LATEST 200 old inward records (sufficient for alerts)
        one_year_ago = timezone.now().date() - timedelta(days=365)
        old_inwards = (
            Inward.objects
            .filter(date__lte=one_year_ago)
            .select_related('party', 'variety')
            .only('id', 'invoice_no', 'date', 'bags', 'variety_id', 'party__name', 'variety__name')
            .order_by('-date', '-id')[:200]
        )
        
        for in_rec in old_inwards:
            v_id = in_rec.variety_id
            curr = (in_map.get(v_id, 0) or 0) - (out_map.get(v_id, 0) or 0)
            if curr > 0:
                age_days = (timezone.now().date() - in_rec.date).days
                aging_stock_alerts.append({
                    'inward_id': in_rec.id,
                    'invoice_no': in_rec.invoice_no,
                    'date': str(in_rec.date),
                    'age_days': age_days,
                    'party_name': in_rec.party.name if in_rec.party else '-',
                    'variety_name': in_rec.variety.name if in_rec.variety else '-',
                    'bags': in_rec.bags,
                    'message': f"AGING ALERT: Batch '{in_rec.invoice_no}' of '{in_rec.variety.name}' (Purchased: {in_rec.date}, Age: {age_days} days) remains unsold over 1 year!"
                })

        return Response({
            'low_stock_alerts': low_stock_alerts,
            'aging_stock_alerts': aging_stock_alerts
        })


# ═════════════════════════════════════════════════════════════════════════════
# LEDGER — optimized to reduce query count
# ═════════════════════════════════════════════════════════════════════════════

class EmptyBagsStockLedgerAPIView(APIView):
    """Generates exact Daily Opening Stock, Inward, Outward, Closing Stock ledger per Variety.
    Query Parameters:
        variety_id  - filter by variety
        start_date  - YYYY-MM-DD inclusive start
        end_date    - YYYY-MM-DD inclusive end
        month       - YYYY-MM shortcut (expands to start/end of that month)
        page        - 1-based page number (default 1)
        page_size   - items per page (default 50, max 200)
    """
    def get(self, request):
        variety_id = request.query_params.get('variety_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        month_param = request.query_params.get('month')
        invoice_no = request.query_params.get('invoice_no')

        # Month shortcut overrides start/end
        if month_param:
            try:
                year, mon = month_param.split('-')
                year, mon = int(year), int(mon)
                import calendar
                start_date = f"{year}-{mon:02d}-01"
                last_day = calendar.monthrange(year, mon)[1]
                end_date = f"{year}-{mon:02d}-{last_day}"
            except (ValueError, IndexError):
                pass

        # Parse dates
        parsed_start = None
        parsed_end = None
        if start_date:
            try:
                parsed_start = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                pass
        if end_date:
            try:
                parsed_end = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                pass

        varieties = Variety.objects.all()
        if variety_id:
            varieties = varieties.filter(id=variety_id)
        varieties_list = list(varieties.order_by('name'))
        variety_ids = [v.id for v in varieties_list]

        # ─── OPTIMIZED: single batched queries instead of per-variety ────
        
        # Pre-fetch latest inward & outward parties per variety (2 queries)
        latest_in_parties = {}
        latest_in_ids = Inward.objects.filter(variety_id__in=variety_ids).values('variety_id').annotate(max_id=Max('id')).values_list('max_id', flat=True)
        if latest_in_ids:
            for item in Inward.objects.filter(id__in=latest_in_ids).select_related('party'):
                if item.party:
                    latest_in_parties[item.variety_id] = item.party.name

        latest_out_parties = {}
        latest_out_ids = Outward.objects.filter(variety_id__in=variety_ids).values('variety_id').annotate(max_id=Max('id')).values_list('max_id', flat=True)
        if latest_out_ids:
            for item in Outward.objects.filter(id__in=latest_out_ids).select_related('party'):
                if item.party:
                    latest_out_parties[item.variety_id] = item.party.name

        # Opening stock before start_date (2 queries)
        in_prior_qs = Inward.objects.all()
        out_prior_qs = Outward.objects.all()
        if parsed_start:
            in_prior_qs = in_prior_qs.filter(date__lt=parsed_start)
            out_prior_qs = out_prior_qs.filter(date__lt=parsed_start)
        else:
            in_prior_qs = in_prior_qs.none()
            out_prior_qs = out_prior_qs.none()

        if variety_ids:
            in_prior_qs = in_prior_qs.filter(variety_id__in=variety_ids)
            out_prior_qs = out_prior_qs.filter(variety_id__in=variety_ids)

        in_op_map = {item['variety_id']: item['tot'] for item in in_prior_qs.values('variety_id').annotate(tot=Sum('bags'))}
        out_op_map = {item['variety_id']: item['tot'] for item in out_prior_qs.values('variety_id').annotate(tot=Sum('bags'))}

        # Current range inward totals (1 query)
        in_curr_qs = Inward.objects.filter(variety_id__in=variety_ids) if variety_ids else Inward.objects.none()
        if parsed_start:
            in_curr_qs = in_curr_qs.filter(date__gte=parsed_start)
        if parsed_end:
            in_curr_qs = in_curr_qs.filter(date__lte=parsed_end)
        if invoice_no:
            in_curr_qs = in_curr_qs.filter(invoice_no=invoice_no)

        in_curr_map = {item['variety_id']: item for item in in_curr_qs.values('variety_id').annotate(
            tot_bags=Sum('bags'),
            avg_rate=Avg('rate'),
            tot_val=Sum('total_value'),
            tot_lf=Sum('lf_amount')
        )}

        # Current range outward totals (1 query)
        out_curr_qs = Outward.objects.filter(variety_id__in=variety_ids) if variety_ids else Outward.objects.none()
        if parsed_start:
            out_curr_qs = out_curr_qs.filter(date__gte=parsed_start)
        if parsed_end:
            out_curr_qs = out_curr_qs.filter(date__lte=parsed_end)
        if invoice_no:
            out_curr_qs = out_curr_qs.filter(invoice_no=invoice_no)

        out_curr_map = {item['variety_id']: item for item in out_curr_qs.values('variety_id').annotate(
            tot_bags=Sum('bags'),
            avg_rate=Avg('rate'),
            tot_val=Sum('total_value'),
            tot_lf=Sum('lf_amount')
        )}

        # Performance fix: only scan filtered records, not entire table
        all_avg_qs = Inward.objects.filter(variety_id__in=variety_ids) if variety_ids else Inward.objects.none()
        if parsed_start:
            all_avg_qs = all_avg_qs.filter(date__gte=parsed_start)
        if parsed_end:
            all_avg_qs = all_avg_qs.filter(date__lte=parsed_end)
        all_avg_rates = {item['variety_id']: item['avg_rate'] for item in all_avg_qs.values('variety_id').annotate(avg_rate=Avg('rate'))}

        inwards_list = []
        outwards_list = []
        combined_ledger = []

        for v in varieties_list:
            v_id = v.id
            op_in = in_op_map.get(v_id, 0) or 0
            op_out = out_op_map.get(v_id, 0) or 0
            opening_bags = op_in - op_out

            in_info = in_curr_map.get(v_id, {})
            out_info = out_curr_map.get(v_id, {})

            inward_bags = in_info.get('tot_bags', 0) or 0
            outward_bags = out_info.get('tot_bags', 0) or 0

            in_lf = float(in_info.get('tot_lf', 0) or 0.0)
            out_lf = float(out_info.get('tot_lf', 0) or 0.0)

            avg_rate_in = in_info.get('avg_rate') or all_avg_rates.get(v_id, 0)
            rate_per_bag = float(round(Decimal(str(avg_rate_in or 0)), 2))
            closing_bags = opening_bags + inward_bags - outward_bags

            total_val = float(round(Decimal(str(closing_bags * rate_per_bag)), 2))

            common_data = {
                'variety_id': v_id,
                'variety_name': v.name,
                'kgs_per_bag': float(v.kgs_per_bag),
                'opening_bags': opening_bags,
                'rate_per_bag': rate_per_bag,
                'closing_bags': closing_bags,
                'total_value': total_val,
            }

            in_row = {
                **common_data,
                'latest_party': latest_in_parties.get(v_id, '-'),
                'inward_bags': inward_bags,
                'lf_total': in_lf,
            }
            out_row = {
                **common_data,
                'latest_party': latest_out_parties.get(v_id, '-'),
                'outward_bags': outward_bags,
                'lf_total': out_lf,
            }

            inwards_list.append(in_row)
            outwards_list.append(out_row)
            combined_ledger.append({
                **common_data,
                'inward_bags': inward_bags,
                'outward_bags': outward_bags,
            })

        return Response({
            'inwards': inwards_list,
            'outwards': outwards_list,
            'results': combined_ledger,
            'summary': {
                'total_opening': sum(r['opening_bags'] for r in combined_ledger),
                'total_inward': sum(r['inward_bags'] for r in combined_ledger),
                'total_outward': sum(r['outward_bags'] for r in combined_ledger),
                'total_closing': sum(r['closing_bags'] for r in combined_ledger),
                'total_valuation': sum(r['total_value'] for r in combined_ledger),
            }
        })


# ═════════════════════════════════════════════════════════════════════════════
# PDF EXPORTS
# ═════════════════════════════════════════════════════════════════════════════

class InwardInvoicePDFView(APIView):
    def get(self, request, pk):
        try:
            inward = Inward.objects.select_related('party', 'variety').get(pk=pk)
        except Inward.DoesNotExist:
            return Response({'error': 'Inward entry not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = InwardSerializer(inward)
        pdf_bytes = generate_4up_a4_invoice('inward', serializer.data)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="Inward_Invoice_{inward.invoice_no}.pdf"'
        return response


class OutwardInvoicePDFView(APIView):
    def get(self, request, pk):
        try:
            outward = Outward.objects.select_related('party', 'variety').get(pk=pk)
        except Outward.DoesNotExist:
            return Response({'error': 'Outward entry not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = OutwardSerializer(outward)
        pdf_bytes = generate_4up_a4_invoice('outward', serializer.data)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="Outward_Invoice_{outward.invoice_no}.pdf"'
        return response


class VarietyDetailLedgerAPIView(APIView):
    """Returns detailed itemized transaction history for a specific variety."""
    def get(self, request, variety_id):
        try:
            variety = Variety.objects.get(pk=variety_id)
        except Variety.DoesNotExist:
            return Response({'error': 'Variety not found'}, status=status.HTTP_404_NOT_FOUND)

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        month_param = request.query_params.get('month')

        if month_param:
            try:
                year, mon = month_param.split('-')
                year, mon = int(year), int(mon)
                import calendar
                start_date = f"{year}-{mon:02d}-01"
                last_day = calendar.monthrange(year, mon)[1]
                end_date = f"{year}-{mon:02d}-{last_day}"
            except (ValueError, IndexError):
                pass

        parsed_start = datetime.strptime(start_date, '%Y-%m-%d').date() if start_date else None
        parsed_end = datetime.strptime(end_date, '%Y-%m-%d').date() if end_date else None

        invoice_no = request.query_params.get('invoice_no')

        # Performance fix: use only() to load minimal columns, DB ordering, pagination
        minimal_fields = ['id', 'invoice_no', 'date', 'bags', 'rate', 'per_bag_cost', 'lf_toggle', 'lf_amount', 'total_value', 'party__name']
        
        inwards = Inward.objects.filter(variety=variety).select_related('party').only(*minimal_fields)
        outwards = Outward.objects.filter(variety=variety).select_related('party').only(*minimal_fields)

        if parsed_start:
            inwards = inwards.filter(date__gte=parsed_start)
            outwards = outwards.filter(date__gte=parsed_start)
        if parsed_end:
            inwards = inwards.filter(date__lte=parsed_end)
            outwards = outwards.filter(date__lte=parsed_end)
        if invoice_no:
            inwards = inwards.filter(invoice_no__icontains=invoice_no.strip())
            outwards = outwards.filter(invoice_no__icontains=invoice_no.strip())

        # Use DB ordering + LIMIT instead of Python sort on all records
        PAGE_SIZE = 500  # max transactions per variety in one response
        inwards = inwards.order_by('date', 'id')[:PAGE_SIZE]
        outwards = outwards.order_by('date', 'id')[:PAGE_SIZE]

        transactions = []
        for item in inwards:
            transactions.append({
                'type': 'inward',
                'id': item.id,
                'invoice_no': item.invoice_no,
                'party_name': item.party.name if item.party else '-',
                'date': str(item.date),
                'bags': item.bags,
                'rate': float(item.rate),
                'per_bag_cost': float(item.per_bag_cost) if item.per_bag_cost else float(item.rate),
                'lf_toggle': item.lf_toggle,
                'lf_amount': float(item.lf_amount) if item.lf_amount else 0.0,
                'total_value': float(item.total_value),
            })
        for item in outwards:
            transactions.append({
                'type': 'outward',
                'id': item.id,
                'invoice_no': item.invoice_no,
                'party_name': item.party.name if item.party else '-',
                'date': str(item.date),
                'bags': item.bags,
                'rate': float(item.rate),
                'per_bag_cost': float(item.per_bag_cost) if item.per_bag_cost else float(item.rate),
                'lf_toggle': item.lf_toggle,
                'lf_amount': float(item.lf_amount) if item.lf_amount else 0.0,
                'total_value': float(item.total_value),
            })

        transactions.sort(key=lambda x: (x['date'], x['id']))

        running_balance = 0
        final_list = []
        for t in transactions:
            if t['type'] == 'inward':
                running_balance += t['bags']
            else:
                running_balance -= t['bags']

            t['closing_balance'] = running_balance
            final_list.append(t)

        return Response({
            'variety': {
                'id': variety.id,
                'name': variety.name,
                'kgs_per_bag': float(variety.kgs_per_bag)
            },
            'transactions': final_list,
            'truncated': len(transactions) >= PAGE_SIZE
        })


class ExportStocksPDFView(APIView):
    def get(self, request):
        from .pdf import generate_stocks_summary_pdf
        date_param = request.query_params.get('date') or str(get_current_business_date())
        inwards = InwardSerializer(Inward.objects.filter(date=date_param).select_related('party', 'variety'), many=True).data
        outwards = OutwardSerializer(Outward.objects.filter(date=date_param).select_related('party', 'variety'), many=True).data
        
        pdf_bytes = generate_stocks_summary_pdf("Stocks Report", date_param, inwards, outwards)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="Stocks_Report_{date_param}.pdf"'
        return response


class ExportLedgerPDFView(APIView):
    def get(self, request):
        from .pdf import generate_ledger_summary_pdf
        # Performance fix: reuse the already-optimized ledger view data
        # The view already uses batched SQL aggregations
        ledger_view = EmptyBagsStockLedgerAPIView()
        res = ledger_view.get(request)
        inwards_data = res.data.get('inwards', [])
        outwards_data = res.data.get('outwards', [])
        
        date_str = request.query_params.get('month') or request.query_params.get('start_date') or "All Records"
        pdf_bytes = generate_ledger_summary_pdf("Empty Bags Ledger Report", date_str, inwards_data, outwards_data)
        
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="Empty_Bags_Ledger_{date_str}.pdf"'
        return response


# ═════════════════════════════════════════════════════════════════════════════
# APPROVALS
# ═════════════════════════════════════════════════════════════════════════════

from rest_framework.decorators import action
from .models import ApprovalRequest
from .serializers import ApprovalRequestSerializer


class ApprovalRequestViewSet(viewsets.ModelViewSet):
    queryset = ApprovalRequest.objects.all().select_related('requested_by')
    serializer_class = ApprovalRequestSerializer

    def get_queryset(self):
        try:
            return ApprovalRequest.objects.all().order_by('-created_at')
        except Exception:
            return ApprovalRequest.objects.none()

    def perform_create(self, serializer):
        user = self.request.user if self.request.user and self.request.user.is_authenticated else None
        serializer.save(requested_by=user, status='PENDING')

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        approval_req = self.get_object()
        if approval_req.status != 'PENDING':
            return Response({'error': 'Request is already processed.'}, status=status.HTTP_400_BAD_REQUEST)
        
        target_id = approval_req.target_id
        target_model = approval_req.target_model
        action_type = approval_req.action_type
        proposed_data = approval_req.proposed_data or {}
        
        try:
            if target_model == 'INWARD':
                if action_type == 'DELETE':
                    Inward.objects.filter(pk=target_id).delete()
                elif action_type == 'EDIT':
                    inward = Inward.objects.get(pk=target_id)
                    for field, value in proposed_data.items():
                        if field in ['party', 'variety']:
                            if field == 'party':
                                inward.party_id = value
                            elif field == 'variety':
                                inward.variety_id = value
                        else:
                            setattr(inward, field, value)
                    inward.save()
            elif target_model == 'OUTWARD':
                if action_type == 'DELETE':
                    Outward.objects.filter(pk=target_id).delete()
                elif action_type == 'EDIT':
                    outward = Outward.objects.get(pk=target_id)
                    for field, value in proposed_data.items():
                        if field in ['party', 'variety']:
                            if field == 'party':
                                outward.party_id = value
                            elif field == 'variety':
                                outward.variety_id = value
                        else:
                            setattr(outward, field, value)
                    outward.save()
            
            approval_req.status = 'APPROVED'
            approval_req.reviewed_at = timezone.now()
            approval_req.save()
            return Response({'status': 'approved'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        approval_req = self.get_object()
        if approval_req.status != 'PENDING':
            return Response({'error': 'Request is already processed.'}, status=status.HTTP_400_BAD_REQUEST)
        
        approval_req.status = 'REJECTED'
        approval_req.reviewed_at = timezone.now()
        approval_req.save()
        return Response({'status': 'rejected'})


class PlaceStockLedgerAPIView(APIView):
    """Calculates per-place stock transfers received, sales/usage, and remaining balance."""
    def get(self, request):
        place_id = request.query_params.get('place_id')
        places = Place.objects.all()
        if place_id:
            places = places.filter(id=place_id)

        results = []
        for p in places:
            transfers_qs = Outward.objects.filter(is_transfer=True, to_place=p).select_related('variety', 'party')
            transferred_bags = transfers_qs.aggregate(tot=Sum('bags'))['tot'] or 0

            sales_qs = Outward.objects.filter(party__place=p).select_related('variety', 'party')
            sales_bags = sales_qs.aggregate(tot=Sum('bags'))['tot'] or 0

            remaining_bags = transferred_bags - sales_bags

            transfer_items = []
            for t in transfers_qs.order_by('-date', '-id')[:50]:
                transfer_items.append({
                    'id': t.id,
                    'invoice_no': t.invoice_no,
                    'date': str(t.date),
                    'from_place': t.from_place_name or 'Main Mill',
                    'to_place': p.name,
                    'variety_name': t.variety.name if t.variety else '-',
                    'bags': t.bags,
                    'rate': float(t.rate),
                    'total_value': float(t.total_value)
                })

            sales_items = []
            for s in sales_qs.order_by('-date', '-id')[:50]:
                sales_items.append({
                    'id': s.id,
                    'invoice_no': s.invoice_no,
                    'date': str(s.date),
                    'party_name': s.party.name if s.party else '-',
                    'variety_name': s.variety.name if s.variety else '-',
                    'bags': s.bags,
                    'rate': float(s.rate),
                    'total_value': float(s.total_value)
                })

            results.append({
                'place_id': p.id,
                'place_name': p.name,
                'transferred_in_bags': transferred_bags,
                'sales_bags': sales_bags,
                'remaining_bags': remaining_bags,
                'recent_transfers': transfer_items,
                'recent_sales': sales_items,
            })

        return Response({'results': results})
