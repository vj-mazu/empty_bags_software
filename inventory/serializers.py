from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Place, Party, Variety, Inward, Outward, DailyStockSummary, Role
from django.db.models import Sum

class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')
    email = serializers.EmailField(source='user.email', required=False, allow_blank=True)
    role = serializers.CharField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['id', 'user_id', 'username', 'email', 'role', 'can_delete']

    def get_can_delete(self, obj):
        inward_cnt = Inward.objects.filter(created_by=obj.user).count()
        outward_cnt = Outward.objects.filter(created_by=obj.user).count()
        return (inward_cnt + outward_cnt) == 0

class PlaceSerializer(serializers.ModelSerializer):
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Place
        fields = ['id', 'name', 'created_at', 'can_delete']

    def get_can_delete(self, obj):
        return obj.parties.count() == 0

class PartySerializer(serializers.ModelSerializer):
    place_name = serializers.ReadOnlyField(source='place.name')
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Party
        fields = ['id', 'name', 'shortcut_name', 'phone_number', 'place', 'place_name', 'created_at', 'can_delete']

    def get_can_delete(self, obj):
        return (obj.inwards.count() + obj.outwards.count()) == 0

class VarietySerializer(serializers.ModelSerializer):
    current_stock_bags = serializers.SerializerMethodField()
    current_stock_kgs = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Variety
        fields = ['id', 'name', 'photo', 'kgs_per_bag', 'created_at', 'current_stock_bags', 'current_stock_kgs', 'can_delete']

    def get_current_stock_bags(self, obj):
        in_bags = Inward.objects.filter(variety=obj).aggregate(Sum('bags'))['bags__sum'] or 0
        out_bags = Outward.objects.filter(variety=obj).aggregate(Sum('bags'))['bags__sum'] or 0
        return in_bags - out_bags

    def get_current_stock_kgs(self, obj):
        stock_bags = self.get_current_stock_bags(obj)
        return float(stock_bags) * float(obj.kgs_per_bag)

    def get_can_delete(self, obj):
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
    created_by_name = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = Outward
        fields = [
            'id', 'sl_no', 'invoice_no', 'date', 'party', 'party_name', 
            'variety', 'variety_name', 'kgs_per_bag', 'rate', 'bags', 
            'total_kgs', 'lf_toggle', 'lf_amount', 'total_value', 'per_bag_cost', 'created_by', 'created_by_name', 'created_at'
        ]

    def validate(self, data):
        variety = data.get('variety')
        requested_bags = data.get('bags', 0)
        in_bags = Inward.objects.filter(variety=variety).aggregate(Sum('bags'))['bags__sum'] or 0
        out_bags = Outward.objects.filter(variety=variety).aggregate(Sum('bags'))['bags__sum'] or 0
        
        if self.instance:
            out_bags -= self.instance.bags

        available_stock = in_bags - out_bags
        if requested_bags > available_stock:
            raise serializers.ValidationError({
                "bags": f"Insufficient stock! Available stock for '{variety.name}' is only {available_stock} bags. Cannot fulfill outward request of {requested_bags} bags."
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
