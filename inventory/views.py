from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import CursorPagination
from django.views.generic import TemplateView
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Sum, Q, Max, F
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

class IndexView(TemplateView):
    template_name = 'index.html'

class FastCursorPagination(CursorPagination):
    page_size = 50
    ordering = '-id'

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

class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all().select_related('user')
    serializer_class = UserProfileSerializer
    pagination_class = None

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
        return Response(status=status.HTTP_24_NO_CONTENT if hasattr(status, 'HTTP_24_NO_CONTENT') else status.HTTP_204_NO_CONTENT)

class PlaceViewSet(viewsets.ModelViewSet):
    queryset = Place.objects.all()
    serializer_class = PlaceSerializer
    pagination_class = None

    def destroy(self, request, *args, **kwargs):
        place = self.get_object()
        if place.parties.count() > 0:
            return Response({'error': 'Cannot delete Place linked to existing parties!'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

class PartyViewSet(viewsets.ModelViewSet):
    queryset = Party.objects.all().select_related('place')
    serializer_class = PartySerializer
    pagination_class = None

    def destroy(self, request, *args, **kwargs):
        party = self.get_object()
        if (party.inwards.count() + party.outwards.count()) > 0:
            return Response({'error': 'Cannot delete Party linked to transactions!'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

class VarietyViewSet(viewsets.ModelViewSet):
    queryset = Variety.objects.all()
    serializer_class = VarietySerializer
    pagination_class = None

    def destroy(self, request, *args, **kwargs):
        variety = self.get_object()
        if (variety.inwards.count() + variety.outwards.count()) > 0:
            return Response({'error': 'Cannot delete Variety linked to stock transactions!'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

def get_current_business_date():
    import datetime
    from django.utils import timezone
    now = timezone.localtime(timezone.now())
    if now.time() < datetime.time(6, 0):
        return now.date() - datetime.timedelta(days=1)
    return now.date()

class InwardViewSet(viewsets.ModelViewSet):
    queryset = Inward.objects.all().select_related('party', 'variety', 'created_by')
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
    queryset = Outward.objects.all().select_related('party', 'variety', 'created_by')
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

class SystemAlertsAPIView(APIView):
    def get(self, request):
        low_stock_alerts = []
        aging_stock_alerts = []

        # 1. Low Stock Alert (< 2,000 bags)
        varieties = Variety.objects.all()
        for v in varieties:
            in_bags = Inward.objects.filter(variety=v).aggregate(Sum('bags'))['bags__sum'] or 0
            out_bags = Outward.objects.filter(variety=v).aggregate(Sum('bags'))['bags__sum'] or 0
            current_bags = in_bags - out_bags
            
            if current_bags < 2000:
                low_stock_alerts.append({
                    'variety_id': v.id,
                    'variety_name': v.name,
                    'current_bags': current_bags,
                    'kgs_per_bag': float(v.kgs_per_bag),
                    'message': f"CRITICAL: Stock for '{v.name}' is low ({current_bags} bags remaining, threshold is 2,000 bags)."
                })

        # 2. Aging Stock Alert (> 1 year purchased and unsold/unmoved)
        one_year_ago = timezone.now().date() - timedelta(days=365)
        old_inwards = Inward.objects.filter(date__lte=one_year_ago)
        
        for in_rec in old_inwards:
            v = in_rec.variety
            in_bags = Inward.objects.filter(variety=v).aggregate(Sum('bags'))['bags__sum'] or 0
            out_bags = Outward.objects.filter(variety=v).aggregate(Sum('bags'))['bags__sum'] or 0
            curr = in_bags - out_bags
            if curr > 0:
                aging_stock_alerts.append({
                    'inward_id': in_rec.id,
                    'invoice_no': in_rec.invoice_no,
                    'date': str(in_rec.date),
                    'party_name': in_rec.party.name,
                    'variety_name': v.name,
                    'bags': in_rec.bags,
                    'message': f"AGING ALERT: Batch '{in_rec.invoice_no}' of '{v.name}' purchased on {in_rec.date} has been in stock over 1 year!"
                })

        return Response({
            'low_stock_alerts': low_stock_alerts,
            'aging_stock_alerts': aging_stock_alerts
        })

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
        month_param = request.query_params.get('month')  # e.g. "2026-07"
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

        result_ledger = []

        for v in varieties:
            inwards = Inward.objects.filter(variety=v).select_related('party').order_by('date', 'id')
            outwards = Outward.objects.filter(variety=v).select_related('party').order_by('date', 'id')

            if invoice_no:
                inwards = inwards.filter(invoice_no=invoice_no)
                outwards = outwards.filter(invoice_no=invoice_no)

            transactions = []
            for item in inwards:
                transactions.append({
                    'type': 'inward',
                    'id': item.id,
                    'party_name': item.party.name,
                    'date': item.date,
                    'bags': item.bags,
                    'kgs': item.total_kgs,
                    'lf_toggle': item.lf_toggle,
                    'lf_amount': float(item.lf_amount) if item.lf_amount else 0.0,
                })
            for item in outwards:
                transactions.append({
                    'type': 'outward',
                    'id': item.id,
                    'party_name': item.party.name,
                    'date': item.date,
                    'bags': item.bags,
                    'kgs': item.total_kgs,
                    'lf_toggle': item.lf_toggle,
                    'lf_amount': float(item.lf_amount) if item.lf_amount else 0.0,
                })

            transactions.sort(key=lambda x: (x['date'], x['type'], x['id']))

            running_opening_bags = 0
            running_opening_kgs = Decimal('0.00')

            for t in transactions:
                if t['type'] == 'inward':
                    in_bags = t['bags']
                    in_kgs = t['kgs']
                    out_bags = 0
                    out_kgs = Decimal('0.00')
                else:
                    in_bags = 0
                    in_kgs = Decimal('0.00')
                    out_bags = t['bags']
                    out_kgs = t['kgs']

                closing_bags = running_opening_bags + in_bags - out_bags
                closing_kgs = running_opening_kgs + in_kgs - out_kgs

                in_range = True
                if parsed_start and t['date'] < parsed_start:
                    in_range = False
                if parsed_end and t['date'] > parsed_end:
                    in_range = False

                if in_range:
                    result_ledger.append({
                        'variety_id': v.id,
                        'variety_name': v.name,
                        'party_name': t['party_name'],
                        'date': str(t['date']),
                        'opening_bags': running_opening_bags,
                        'opening_kgs': float(running_opening_kgs),
                        'lf_toggle': t['lf_toggle'],
                        'lf_amount': t['lf_amount'],
                        'inward_bags': in_bags,
                        'inward_kgs': float(in_kgs),
                        'outward_bags': out_bags,
                        'outward_kgs': float(out_kgs),
                        'closing_bags': closing_bags,
                        'closing_kgs': float(closing_kgs),
                    })

                running_opening_bags = closing_bags
                running_opening_kgs = closing_kgs

        # Sort by date ascending
        result_ledger.sort(key=lambda x: x['date'])

        # Pagination
        try:
            page = max(1, int(request.query_params.get('page', 1)))
        except (ValueError, TypeError):
            page = 1
        try:
            page_size = min(200, max(1, int(request.query_params.get('page_size', 50))))
        except (ValueError, TypeError):
            page_size = 50

        total_count = len(result_ledger)
        total_pages = max(1, (total_count + page_size - 1) // page_size)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_data = result_ledger[start_idx:end_idx]

        return Response({
            'results': page_data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_previous': page > 1,
            }
        })

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

from rest_framework.decorators import action
from django.utils import timezone
from .models import ApprovalRequest
from .serializers import ApprovalRequestSerializer

class ApprovalRequestViewSet(viewsets.ModelViewSet):
    queryset = ApprovalRequest.objects.all().select_related('requested_by')
    serializer_class = ApprovalRequestSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ApprovalRequest.objects.none()
        
        profile = getattr(user, 'profile', None)
        if profile and profile.role == 'OWNER':
            return self.queryset
        return self.queryset.filter(requested_by=user)

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(requested_by=user, status='PENDING')

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        user = request.user
        profile = getattr(user, 'profile', None)
        if not profile or profile.role != 'OWNER':
            return Response({'error': 'Only owners can approve requests.'}, status=status.HTTP_403_FORBIDDEN)
        
        approval_req = self.get_object()
        if approval_req.status != 'PENDING':
            return Response({'error': 'Request is already processed.'}, status=status.HTTP_400_BAD_REQUEST)
        
        target_id = approval_req.target_id
        target_model = approval_req.target_model
        action_type = approval_req.action_type
        proposed_data = approval_req.proposed_data
        
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
        user = request.user
        profile = getattr(user, 'profile', None)
        if not profile or profile.role != 'OWNER':
            return Response({'error': 'Only owners can reject requests.'}, status=status.HTTP_403_FORBIDDEN)
        
        approval_req = self.get_object()
        if approval_req.status != 'PENDING':
            return Response({'error': 'Request is already processed.'}, status=status.HTTP_400_BAD_REQUEST)
        
        approval_req.status = 'REJECTED'
        approval_req.reviewed_at = timezone.now()
        approval_req.save()
        return Response({'status': 'rejected'})
