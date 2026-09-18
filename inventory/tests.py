import io
from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from inventory.models import UserProfile, Place, Party, Variety, Inward, Outward, Role, ApprovalRequest
from inventory.pdf import generate_4up_a4_invoice, generate_stocks_summary_pdf, generate_ledger_summary_pdf

class MotherIndiaMillComprehensiveTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.owner_user = User.objects.create_user(username='test_owner', password='owner_password_123')
        self.owner_profile = UserProfile.objects.create(user=self.owner_user, role=Role.OWNER)

        self.staff_user = User.objects.create_user(username='test_staff', password='staff_password_123')
        self.staff_profile = UserProfile.objects.create(user=self.staff_user, role=Role.STAFF)

        # Masters
        self.place_raichur = Place.objects.create(name='Raichur')
        self.place_kurnool = Place.objects.create(name='Kurnool')

        self.party_lakshmi = Party.objects.create(
            name='Lakshmi Traders',
            shortcut_name='LT',
            phone_number='9876543210',
            place=self.place_raichur
        )

        self.variety_sona = Variety.objects.create(
            name='Sona Masoori 50kg',
            kgs_per_bag=Decimal('50.00')
        )
        self.variety_bullet = Variety.objects.create(
            name='Bullet Rice 26kg',
            kgs_per_bag=Decimal('26.00')
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 1. TEST INWARD ARITHMETIC & TOTAL VALUATION
    # ─────────────────────────────────────────────────────────────────────────
    def test_inward_calculations(self):
        inward = Inward.objects.create(
            party=self.party_lakshmi,
            variety=self.variety_sona,
            rate=Decimal('1500.00'),
            bags=100,
            lf_toggle=True,
            lf_amount=Decimal('250.00'),
            created_by=self.staff_user
        )
        # Total weight = 100 * 50 = 5000 kg
        self.assertEqual(inward.total_kgs, Decimal('5000.00'))
        # Total value = (100 * 1500) + 250 = 150250.00
        self.assertEqual(inward.total_value, Decimal('150250.00'))
        # Per bag cost = 150250 / 100 = 1502.50
        self.assertEqual(inward.per_bag_cost, Decimal('1502.50'))

    # ─────────────────────────────────────────────────────────────────────────
    # 2. TEST OUTWARD ZERO-STOCK REJECTION
    # ─────────────────────────────────────────────────────────────────────────
    def test_outward_zero_stock_rejection(self):
        """Trying to outward a variety with 0 inward stock must fail validation."""
        self.client.force_authenticate(user=self.owner_user)
        payload = {
            'invoice_no': 'OUT-TEST-0001',
            'date': str(timezone.now().date()),
            'party': self.party_lakshmi.id,
            'variety': self.variety_bullet.id,  # 0 inward bags
            'bags': 10,
            'rate': '1800.00',
            'is_transfer': False
        }
        res = self.client.post('/api/outward/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('bags', res.data)
        self.assertIn('No inward stock exists', str(res.data['bags'][0]))

    # ─────────────────────────────────────────────────────────────────────────
    # 3. TEST OUTWARD TOTAL AVAILABLE STOCK LIMIT
    # ─────────────────────────────────────────────────────────────────────────
    def test_outward_stock_limit_rejection(self):
        """Trying to outward more than total available stock must fail validation."""
        Inward.objects.create(
            party=self.party_lakshmi,
            variety=self.variety_sona,
            rate=Decimal('1500.00'),
            bags=50,
            created_by=self.owner_user
        )
        self.client.force_authenticate(user=self.owner_user)
        payload = {
            'invoice_no': 'OUT-TEST-0002',
            'date': str(timezone.now().date()),
            'party': self.party_lakshmi.id,
            'variety': self.variety_sona.id,
            'bags': 60,  # 60 > 50
            'rate': '1600.00',
            'is_transfer': False
        }
        res = self.client.post('/api/outward/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Insufficient stock', str(res.data['bags'][0]))

    # ─────────────────────────────────────────────────────────────────────────
    # 4. TEST BRANCH TRANSFER AND BRANCH LOCATION SALE VALIDATION
    # ─────────────────────────────────────────────────────────────────────────
    def test_branch_transfer_and_location_sale(self):
        """Test transferring stock to Raichur and then selling from Raichur branch stock."""
        # 1. Inward 200 bags at Mother India Mill
        Inward.objects.create(
            party=self.party_lakshmi,
            variety=self.variety_sona,
            rate=Decimal('1500.00'),
            bags=200,
            created_by=self.owner_user
        )

        self.client.force_authenticate(user=self.owner_user)

        # 2. Transfer 80 bags from Mother India -> Raichur Branch
        transfer_payload = {
            'invoice_no': 'TRF-TEST-0001',
            'date': str(timezone.now().date()),
            'party': self.party_lakshmi.id,
            'variety': self.variety_sona.id,
            'bags': 80,
            'rate': '1500.00',
            'is_transfer': True,
            'from_place_name': 'Mother India',
            'to_place': self.place_raichur.id
        }
        res_trf = self.client.post('/api/outward/', transfer_payload, format='json')
        self.assertEqual(res_trf.status_code, status.HTTP_201_CREATED)

        # 3. Try to sell 90 bags from Raichur Branch (exceeding Raichur's 80 bags) -> Must fail!
        fail_sale_payload = {
            'invoice_no': 'OUT-SALE-FAIL',
            'date': str(timezone.now().date()),
            'party': self.party_lakshmi.id,
            'variety': self.variety_sona.id,
            'bags': 90,  # 90 > 80
            'rate': '1650.00',
            'is_transfer': False,
            'from_place': self.place_raichur.id,
            'from_place_name': 'Raichur'
        }
        res_fail = self.client.post('/api/outward/', fail_sale_payload, format='json')
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Insufficient branch stock', str(res_fail.data['bags'][0]))

        # 4. Sell 30 bags from Raichur Branch -> Must succeed!
        success_sale_payload = {
            'invoice_no': 'OUT-SALE-OK',
            'date': str(timezone.now().date()),
            'party': self.party_lakshmi.id,
            'variety': self.variety_sona.id,
            'bags': 30,
            'rate': '1650.00',
            'is_transfer': False,
            'from_place': self.place_raichur.id,
            'from_place_name': 'Raichur'
        }
        res_ok = self.client.post('/api/outward/', success_sale_payload, format='json')
        self.assertEqual(res_ok.status_code, status.HTTP_201_CREATED)

        # 5. Check Place Stock Ledger for Raichur: Transferred In = 80, Sales = 30, Remaining = 50
        res_ledger = self.client.get(f'/api/place-ledger/?place_id={self.place_raichur.id}')
        self.assertEqual(res_ledger.status_code, status.HTTP_200_OK)
        place_info = res_ledger.data['results'][0]
        self.assertEqual(place_info['transferred_in_bags'], 80)
        self.assertEqual(place_info['sales_bags'], 30)
        self.assertEqual(place_info['remaining_bags'], 50)

    # ─────────────────────────────────────────────────────────────────────────
    # 5. TEST EMPTY BAGS LEDGER STRICT PDF EXPORT FILTERING
    # ─────────────────────────────────────────────────────────────────────────
    def test_empty_bags_ledger_pdf_filtering(self):
        """Test that PDF export strictly honors active filters and type selections."""
        # Create Inward & Outward
        Inward.objects.create(
            party=self.party_lakshmi,
            variety=self.variety_sona,
            rate=Decimal('1500.00'),
            bags=100,
            created_by=self.owner_user
        )
        Outward.objects.create(
            party=self.party_lakshmi,
            variety=self.variety_sona,
            rate=Decimal('1600.00'),
            bags=40,
            created_by=self.owner_user
        )

        # 1. Download Inward Only PDF
        res_in = self.client.get(f'/api/ledger/export-pdf/?type=inward&variety_id={self.variety_sona.id}')
        self.assertEqual(res_in.status_code, status.HTTP_200_OK)
        self.assertEqual(res_in['Content-Type'], 'application/pdf')
        self.assertTrue(res_in.content.startswith(b'%PDF'))

        # 2. Download Outward Only PDF
        res_out = self.client.get(f'/api/ledger/export-pdf/?type=outward&variety_id={self.variety_sona.id}')
        self.assertEqual(res_out.status_code, status.HTTP_200_OK)
        self.assertEqual(res_out['Content-Type'], 'application/pdf')
        self.assertTrue(res_out.content.startswith(b'%PDF'))

        # 3. Download Split View PDF
        res_split = self.client.get(f'/api/ledger/export-pdf/?view_mode=split&variety_id={self.variety_sona.id}')
        self.assertEqual(res_split.status_code, status.HTTP_200_OK)
        self.assertEqual(res_split['Content-Type'], 'application/pdf')
        self.assertTrue(res_split.content.startswith(b'%PDF'))

    # ─────────────────────────────────────────────────────────────────────────
    # 6. TEST 4-UP INVOICE SLIP GENERATION
    # ─────────────────────────────────────────────────────────────────────────
    def test_invoice_slip_pdf(self):
        inward = Inward.objects.create(
            party=self.party_lakshmi,
            variety=self.variety_sona,
            rate=Decimal('1500.00'),
            bags=100,
            created_by=self.owner_user
        )
        res = self.client.get(f'/api/inward/{inward.id}/pdf/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res['Content-Type'], 'application/pdf')
        self.assertTrue(res.content.startswith(b'%PDF'))

    # ─────────────────────────────────────────────────────────────────────────
    # 7. TEST AUTHENTICATION & SECURE LOGOUT SESSION FLUSH
    # ─────────────────────────────────────────────────────────────────────────
    def test_auth_and_logout_flush(self):
        # 1. Check valid login
        login_res = self.client.post('/api/auth/login/', {'username': 'test_staff', 'password': 'staff_password_123'}, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertEqual(login_res.data['role'], 'STAFF')

        # 2. Auth check succeeds
        check_res = self.client.get('/api/auth/check/')
        self.assertEqual(check_res.status_code, status.HTTP_200_OK)
        self.assertTrue(check_res.data['authenticated'])

        # 3. Logout flushes session and deletes cookies
        logout_res = self.client.post('/api/auth/logout/')
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        # 4. Subsequent auth check returns 401
        check_unauth = self.client.get('/api/auth/check/')
        self.assertEqual(check_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

    # ─────────────────────────────────────────────────────────────────────────
    # 8. TEST DUPLICATE PREVENTION (5-MINUTE ANTI-DOUBLE-SUBMISSION)
    # ─────────────────────────────────────────────────────────────────────────
    def test_duplicate_prevention(self):
        self.client.force_authenticate(user=self.owner_user)
        payload = {
            'invoice_no': 'DUP-IN-001',
            'date': str(timezone.now().date()),
            'party': self.party_lakshmi.id,
            'variety': self.variety_sona.id,
            'bags': 50,
            'rate': '1500.00'
        }
        res1 = self.client.post('/api/inward/', payload, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Second submission with different invoice no but exact same items within 5 mins
        payload2 = {
            'invoice_no': 'DUP-IN-002',
            'date': str(timezone.now().date()),
            'party': self.party_lakshmi.id,
            'variety': self.variety_sona.id,
            'bags': 50,
            'rate': '1500.00'
        }
        res2 = self.client.post('/api/inward/', payload2, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Duplicate entry detected', str(res2.data[0]))

    # ─────────────────────────────────────────────────────────────────────────
    # 9. TEST VARIETY MASTER PDF CATALOG EXPORT
    # ─────────────────────────────────────────────────────────────────────────
    def test_variety_master_pdf_export(self):
        """Test downloading Variety Master PDF catalog with embedded data."""
        self.client.force_authenticate(user=self.owner_user)
        res = self.client.get('/api/varieties/export-pdf/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res['Content-Type'], 'application/pdf')
        self.assertIn('inline; filename="Variety_Master_Catalog.pdf"', res['Content-Disposition'])
        self.assertTrue(res.content.startswith(b'%PDF'))

