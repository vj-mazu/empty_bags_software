from django.test import TestCase
from django.contrib.auth.models import User
from inventory.models import UserProfile, Place, Party, Variety, Inward, Outward, Role
from inventory.pdf import generate_4up_a4_invoice
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

class MotherIndiaMillTestCase(TestCase):
    def setUp(self):
        self.owner_user = User.objects.create_user(username='test_owner', password='p123')
        UserProfile.objects.create(user=self.owner_user, role=Role.OWNER)

        self.staff_user = User.objects.create_user(username='test_staff', password='p123')
        UserProfile.objects.create(user=self.staff_user, role=Role.STAFF)

        self.place = Place.objects.create(name='Tenali')
        self.party = Party.objects.create(name='Kisan Traders', shortcut_name='KT', phone_number='9876543210', place=self.place)
        self.variety = Variety.objects.create(name='Sona Masoori 50kg', kgs_per_bag=Decimal('50.00'))

    def test_inward_and_outward_calculation(self):
        inward = Inward.objects.create(
            party=self.party, variety=self.variety, rate=Decimal('1500.00'), bags=100, lf_toggle=False, created_by=self.owner_user
        )
        self.assertEqual(inward.total_kgs, Decimal('5000.00'))
        self.assertEqual(inward.total_value, Decimal('150000.00'))

        outward = Outward.objects.create(
            party=self.party, variety=self.variety, rate=Decimal('1600.00'), bags=40, lf_toggle=True, lf_amount=Decimal('100.00'), created_by=self.staff_user
        )
        # Total value with LF toggle = 40 * 1600 + 100 = 64000 + 100 = 64100
        self.assertEqual(outward.total_value, Decimal('64100.00'))
        # per_bag_cost = 64100 / 40 = 1602.50
        self.assertEqual(outward.per_bag_cost, Decimal('1602.50'))

    def test_pdf_invoice_generation(self):
        entry_data = {
            'sl_no': 1,
            'invoice_no': 'MI-IN-20260723-0001',
            'date': '2026-07-23',
            'party_name': 'Kisan Traders',
            'variety_name': 'Sona Masoori 50kg',
            'kgs_per_bag': '50.00',
            'bags': 100,
            'rate': '1500.00',
            'lf_toggle': False,
            'lf_amount': '0.00',
            'per_bag_cost': '1500.00',
            'total_value': '150000.00'
        }
        pdf_bytes = generate_4up_a4_invoice('inward', entry_data)
        self.assertTrue(len(pdf_bytes) > 0)
        self.assertTrue(pdf_bytes.startswith(b'%PDF'))
