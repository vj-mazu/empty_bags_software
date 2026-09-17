from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Place, Party, Variety, Inward, Outward, DailyStockSummary, Role
from django.db.models import Sum, Count, Q


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')
    email = serializers.EmailField(source='user.email', required=False, allow_blank=True)
    role = serializers.CharField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['id', 'user_id', 'username', 'email', 'role', 'can_delete']

    def get_can_delete(self, obj):
        # Use prefetched counts if available (set by view), otherwise single query
        if hasattr(obj, '_inward_count') and hasattr(obj, '_outward_count'):
            return (obj._inward_count + obj._outward_count) == 0
        inward_cnt = Inward.objects.filter(created_by=obj.user).count()
        outward_cnt = Outward.objects.filter(created_by=obj.user).count()
        return (inward_cnt + outward_cnt) == 0


class PlaceSerializer(serializers.ModelSerializer):
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Place
        fields = ['id', 'name', 'created_at', 'can_delete']

    def get_can_delete(self, obj):
        if hasattr(obj, '_party_count'):
            return obj._party_count == 0
        return obj.parties.count() == 0


class PartySerializer(serializers.ModelSerializer):
    place_name = serializers.ReadOnlyField(source='place.name')
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Party
        fields = ['id', 'name', 'shortcut_name', 'phone_number', 'place', 'place_name', 'created_at', 'can_delete']

    def get_can_delete(self, obj):
        if hasattr(obj, '_inward_count') and hasattr(obj, '_outward_count'):
            return (obj._inward_count + obj._outward_count) == 0
        return (obj.inwards.count() + obj.outwards.count()) == 0


class VarietySerializer(serializers.ModelSerializer):
    current_stock_bags = serializers.SerializerMethodField()
    current_stock_kgs = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Variety
        fields = ['id', 'name', 'photo', 'photo_data', 'photo_url', 'kgs_per_bag', 'created_at', 'current_stock_bags', 'current_stock_kgs', 'can_delete']

    def get_photo_url(self, obj):
        if obj.photo_data:
            return obj.photo_data
        if obj.photo:
            try:
                return obj.photo.url
            except Exception:
                return None
        return None

    def get_current_stock_bags(self, obj):
        # Use prefetched annotation if available (set by view), otherwise single query
        if hasattr(obj, '_in_bags') and hasattr(obj, '_out_bags'):
            return (obj._in_bags or 0) - (obj._out_bags or 0)
        in_bags = Inward.objects.filter(variety=obj).aggregate(Sum('bags'))['bags__sum'] or 0
        out_bags = Outward.objects.filter(variety=obj).aggregate(Sum('bags'))['bags__sum'] or 0
        return in_bags - out_bags

    def get_current_stock_kgs(self, obj):
        stock_bags = self.get_current_stock_bags(obj)
        return float(stock_bags) * float(obj.kgs_per_bag)

    def get_can_delete(self, obj):
        if hasattr(obj, '_inward_count') and hasattr(obj, '_outward_count'):
            return (obj._inward_count + obj._outward_count) == 0
        return (obj.inwards.count() + obj.outwards.count()) == 0


class InwardSerializer(serializers.ModelSerializer):
    party_name = serializers.ReadOnlyField(source='party.name')
    variety_name = serializers.ReadOnlyField(source='variety.name')
    kgs_per_bag = serializers.ReadOnlyField(source='variety.kgs_per_bag')
    created_by_name = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = Inward
        fields = [
            'id', 'sl_no', 'invoice_no', 'date', 'party', 'party_name', 
            'variety', 'variety_name', 'kgs_per_bag', 'rate', 'bags', 
            'total_kgs', 'lf_toggle', 'lf_amount', 'total_value', 'per_bag_cost', 'created_by', 'created_by_name', 'created_at'
        ]


class OutwardSerializer(serializers.ModelSerializer):
    party_name = serializers.ReadOnlyField(source='party.name')
    variety_name = serializers.ReadOnlyField(source='variety.name')
    kgs_per_bag = serializers.ReadOnlyField(source='variety.kgs_per_bag')
    to_place_name = serializers.ReadOnlyField(source='to_place.name')
    created_by_name = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = Outward
        fields = [
            'id', 'sl_no', 'invoice_no', 'date', 'party', 'party_name', 
            'variety', 'variety_name', 'kgs_per_bag', 'rate', 'bags', 
            'total_kgs', 'lf_toggle', 'lf_amount', 'is_transfer', 
            'from_place', 'from_place_name', 'to_place', 'to_place_name', 'total_value', 
            'per_bag_cost', 'created_by', 'created_by_name', 'created_at'
        ]

    def validate(self, data):
        variety = data.get('variety')
        requested_bags = data.get('bags', 0)
        from_place = data.get('from_place')
        is_transfer = data.get('is_transfer', False)

        # 1. Total Mill-Wide Stock Validation
        in_bags = Inward.objects.filter(variety=variety).aggregate(Sum('bags'))['bags__sum'] or 0
        out_bags = Outward.objects.filter(variety=variety).aggregate(Sum('bags'))['bags__sum'] or 0
        
        if self.instance and self.instance.variety == variety:
            out_bags -= self.instance.bags

        available_stock = in_bags - out_bags
        if in_bags == 0:
            raise serializers.ValidationError({
                "bags": f"No inward stock exists for variety '{variety.name}'! Total inwarded stock is 0 bags. Cannot create outward entry."
            })
        if requested_bags > available_stock:
            raise serializers.ValidationError({
                "bags": f"Insufficient stock! Available total stock for '{variety.name}' is only {available_stock} bags. Cannot fulfill outward request of {requested_bags} bags."
            })

        # 2. Branch-Specific Location Stock Validation (when selling from a Branch)
        if not is_transfer and from_place:
            branch_in = Outward.objects.filter(is_transfer=True, to_place=from_place, variety=variety).aggregate(Sum('bags'))['bags__sum'] or 0
            branch_out = Outward.objects.filter(from_place=from_place, variety=variety).aggregate(Sum('bags'))['bags__sum'] or 0

            if self.instance and self.instance.from_place == from_place and self.instance.variety == variety:
                branch_out -= self.instance.bags

            branch_available = branch_in - branch_out

            if branch_in == 0:
                raise serializers.ValidationError({
                    "bags": f"No inward/transferred stock exists at branch '{from_place.name}' for variety '{variety.name}'! (Transferred: 0 bags). Cannot make a location sale."
                })
            if requested_bags > branch_available:
                raise serializers.ValidationError({
                    "bags": f"Insufficient branch stock! Branch '{from_place.name}' only has {branch_available} bags of '{variety.name}' remaining. Cannot dispatch {requested_bags} bags."
                })

        return data


class DailyStockSummarySerializer(serializers.ModelSerializer):
    variety_name = serializers.ReadOnlyField(source='variety.name')

    class Meta:
        model = DailyStockSummary
        fields = [
            'id', 'variety', 'variety_name', 'date', 
            'opening_bags', 'inward_bags', 'outward_bags', 'closing_bags',
            'opening_kgs', 'inward_kgs', 'outward_kgs', 'closing_kgs'
        ]


from .models import ApprovalRequest, Inward, Outward

class ApprovalRequestSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.ReadOnlyField(source='requested_by.username')
    target_details = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalRequest
        fields = [
            'id', 'action_type', 'target_model', 'target_id', 
            'proposed_data', 'target_details', 'requested_by', 'requested_by_username', 
            'status', 'created_at', 'reviewed_at'
        ]
        read_only_fields = ['requested_by']

    def get_target_details(self, obj):
        try:
            if obj.target_model == 'INWARD':
                item = Inward.objects.filter(pk=obj.target_id).select_related('party', 'variety').first()
                if item:
                    return {
                        'invoice_no': item.invoice_no,
                        'party_name': item.party.name if item.party else '-',
                        'variety_name': item.variety.name if item.variety else '-',
                        'bags': item.bags,
                        'rate': str(item.rate),
                        'total_value': str(item.total_value),
                        'date': str(item.date)
                    }
            elif obj.target_model == 'OUTWARD':
                item = Outward.objects.filter(pk=obj.target_id).select_related('party', 'variety').first()
                if item:
                    return {
                        'invoice_no': item.invoice_no,
                        'party_name': item.party.name if item.party else '-',
                        'variety_name': item.variety.name if item.variety else '-',
                        'bags': item.bags,
                        'rate': str(item.rate),
                        'total_value': str(item.total_value),
                        'date': str(item.date)
                    }
        except Exception:
            pass
        return None
