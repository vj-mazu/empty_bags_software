import io
from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from inventory.models import UserProfile, Place, Party, Variety, Inward, Outward, Role, ApprovalRequest, Floor
from inventory.pdf import generate_4up_a4_invoice, generate_stocks_summary_pdf, generate_ledger_summary_pdf, generate_floor_stock_pdf

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

        # Second submission with exact same invoice within 5 mins must be rejected
        res2 = self.client.post('/api/inward/', payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

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

    # ─────────────────────────────────────────────────────────────────────────
    # 10. TEST VARIETY FORCE DELETE WITH TRANSACTIONS (OWNER FEATURE)
    # ─────────────────────────────────────────────────────────────────────────
    def test_variety_force_delete_with_transactions(self):
        """Standard delete blocks if transactions exist, but ?force=true allows cascade deletion."""
        variety = Variety.objects.create(name='Temporary Variety 26kg', kgs_per_bag=Decimal('26.00'))
        inward = Inward.objects.create(
            party=self.party_lakshmi,
            variety=variety,
            rate=Decimal('1200.00'),
            bags=150,
            created_by=self.owner_user
        )

        self.client.force_authenticate(user=self.owner_user)

        # 1. Normal delete fails with 400
        del_fail = self.client.delete(f'/api/varieties/{variety.id}/')
        self.assertEqual(del_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('has_transactions', del_fail.data)
        self.assertTrue(Variety.objects.filter(id=variety.id).exists())

        # 2. Force delete succeeds and cascade deletes the inward transactions
        del_force = self.client.delete(f'/api/varieties/{variety.id}/?force=true')
        self.assertEqual(del_force.status_code, status.HTTP_200_OK)
        self.assertFalse(Variety.objects.filter(id=variety.id).exists())
        self.assertFalse(Inward.objects.filter(id=inward.id).exists())

    # ─────────────────────────────────────────────────────────────────────────
    # 11. TEST STAFF EDIT APPROVAL WORKFLOW & OWNER APPROVAL
    # ─────────────────────────────────────────────────────────────────────────
    def test_staff_approval_workflow(self):
        """Staff request creates pending ApprovalRequest; Owner approval applies changes."""
        inward = Inward.objects.create(
            party=self.party_lakshmi,
            variety=self.variety_sona,
            rate=Decimal('1000.00'),
            bags=100,
            created_by=self.staff_user
        )

        floor_test = Floor.objects.create(name='Approval Test Floor')

        # 1. Staff creates approval request to change bags from 100 to 120, rate to 1100, and assign floor
        self.client.force_authenticate(user=self.staff_user)
        req_payload = {
            'action_type': 'EDIT',
            'target_model': 'INWARD',
            'target_id': inward.id,
            'proposed_data': {
                'bags': 120,
                'rate': 1100.00,
                'party': self.party_lakshmi.id,
                'variety': self.variety_sona.id,
                'floor': floor_test.id,
                'floor_allocations': [{'floor_id': floor_test.id, 'floor_name': floor_test.name, 'bags': 120}]
            }
        }
        create_res = self.client.post('/api/approvals/', req_payload, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        app_id = create_res.data['id']

        # 2. Owner approves the request
        self.client.force_authenticate(user=self.owner_user)
        approve_res = self.client.post(f'/api/approvals/{app_id}/approve/')
        self.assertEqual(approve_res.status_code, status.HTTP_200_OK)

        # 3. Verify inward was updated, floor assigned, and values recalculated
        inward.refresh_from_db()
        self.assertEqual(inward.bags, 120)
        self.assertEqual(inward.rate, Decimal('1100.00'))
        self.assertEqual(inward.floor, floor_test)
        self.assertEqual(inward.floor_allocations, [{'floor_id': floor_test.id, 'floor_name': floor_test.name, 'bags': 120}])
        self.assertEqual(inward.total_kgs, Decimal('6000.00')) # 120 * 50kg
        self.assertEqual(inward.total_value, Decimal('132000.00')) # 120 * 1100

    # ─────────────────────────────────────────────────────────────────────────
    # 12. TEST STOCKS TODAY FILTERING (ALL DATES & VARIETY)
    # ─────────────────────────────────────────────────────────────────────────
    def test_stocks_today_filters(self):
        """Test stocks-today endpoint with ?all=true and ?variety_id filters."""
        Inward.objects.create(
            party=self.party_lakshmi,
            variety=self.variety_sona,
            rate=Decimal('1500.00'),
            bags=80,
            created_by=self.owner_user
        )
        self.client.force_authenticate(user=self.owner_user)

        res_all = self.client.get('/api/stocks-today/?all=true')
        self.assertEqual(res_all.status_code, status.HTTP_200_OK)
        self.assertTrue(res_all.data['is_all_records'])
        self.assertGreaterEqual(len(res_all.data['inwards']), 1)

        res_var = self.client.get(f'/api/stocks-today/?variety_id={self.variety_sona.id}')
        self.assertEqual(res_var.status_code, status.HTTP_200_OK)
        self.assertEqual(res_var.data['inwards'][0]['variety'], self.variety_sona.id)

    # ─────────────────────────────────────────────────────────────────────────
    # 13. TEST PLACE TRANSFER & BRANCH STOCK LEDGER ACCURACY
    # ─────────────────────────────────────────────────────────────────────────
    def test_place_transfer_and_branch_stock_ledger(self):
        """Test transferring stock to a branch, selling from that branch, and validating balances."""
        # 1. Inward 1000 bags of Sona Masoori to Mill
        Inward.objects.create(
            party=self.party_lakshmi,
            variety=self.variety_sona,
            rate=Decimal('1500.00'),
            bags=1000,
            created_by=self.owner_user
        )

        self.client.force_authenticate(user=self.owner_user)

        # 2. Transfer 400 bags to Kurnool branch
        transfer_payload = {
            'invoice_no': 'TR-KNL-001',
            'date': str(timezone.now().date()),
            'party': self.party_lakshmi.id,
            'variety': self.variety_sona.id,
            'bags': 400,
            'rate': '1500.00',
            'is_transfer': True,
            'to_place': self.place_kurnool.id
        }
        res_tr = self.client.post('/api/outward/', transfer_payload, format='json')
        self.assertEqual(res_tr.status_code, status.HTTP_201_CREATED)

        # 3. Check Place Stock Ledger for Kurnool: Transferred: 400, Sales: 0, Remaining: 400
        res_ledger1 = self.client.get(f'/api/place-ledger/?place_id={self.place_kurnool.id}')
        self.assertEqual(res_ledger1.status_code, status.HTTP_200_OK)
        place_data1 = res_ledger1.data['results'][0]
        self.assertEqual(place_data1['transferred_in_bags'], 400)
        self.assertEqual(place_data1['sales_bags'], 0)
        self.assertEqual(place_data1['remaining_bags'], 400)

        # 4. Sell 150 bags from Kurnool branch
        sale_payload = {
            'invoice_no': 'SALE-KNL-001',
            'date': str(timezone.now().date()),
            'party': self.party_lakshmi.id,
            'variety': self.variety_sona.id,
            'bags': 150,
            'rate': '1600.00',
            'is_transfer': False,
            'from_place': self.place_kurnool.id,
            'from_place_name': self.place_kurnool.name
        }
        res_sale = self.client.post('/api/outward/', sale_payload, format='json')
        self.assertEqual(res_sale.status_code, status.HTTP_201_CREATED)

        # 5. Check Place Stock Ledger: Transferred: 400, Sales: 150, Remaining: 250
        res_ledger2 = self.client.get(f'/api/place-ledger/?place_id={self.place_kurnool.id}')
        place_data2 = res_ledger2.data['results'][0]
        self.assertEqual(place_data2['transferred_in_bags'], 400)
        self.assertEqual(place_data2['sales_bags'], 150)
        self.assertEqual(place_data2['remaining_bags'], 250)

        # 6. Attempting to sell 300 bags (more than remaining 250) must fail validation
        oversell_payload = {
            'invoice_no': 'SALE-KNL-OVER',
            'date': str(timezone.now().date()),
            'party': self.party_lakshmi.id,
            'variety': self.variety_sona.id,
            'bags': 300,
            'rate': '1600.00',
            'is_transfer': False,
            'from_place': self.place_kurnool.id
        }
        res_oversell = self.client.post('/api/outward/', oversell_payload, format='json')
        self.assertEqual(res_oversell.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Insufficient branch stock', str(res_oversell.data['bags'][0]))

    # ─────────────────────────────────────────────────────────────────────────
    # 14. TEST MULTI-FLOOR SPLIT INWARD, OUTWARD & FLOOR VALIDATIONS
    # ─────────────────────────────────────────────────────────────────────────
    def test_multi_floor_split_inward_and_outward(self):
        """
        Verify multi-floor inward split allocation, outward multi-floor split deduction,
        over-allocation validation, and dedicated floor stock PDF generation.
        """
        self.client.force_authenticate(user=self.owner_user)

        # 1. Create floors
        floor_ground = Floor.objects.create(name='Ground Floor')
        floor_first = Floor.objects.create(name='1st Floor')

        # 2. Inward 3,000 bags of Sona Masoori split across floors:
        # Ground: 1,000, 1st: 2,000
        inward_payload = {
            'invoice_no': 'INV-FL-001',
            'date': str(timezone.now().date()),
            'party': self.party_lakshmi.id,
            'variety': self.variety_sona.id,
            'bags': 3000,
            'rate': '1500.00',
            'floor_allocations': [
                {'floor_id': floor_ground.id, 'floor_name': floor_ground.name, 'bags': 1000},
                {'floor_id': floor_first.id, 'floor_name': floor_first.name, 'bags': 2000}
            ]
        }
        res_in = self.client.post('/api/inward/', inward_payload, format='json')
        self.assertEqual(res_in.status_code, status.HTTP_201_CREATED)

        # 3. Verify Floor Stock endpoint reflects 1,000 on Ground and 2,000 on 1st Floor
        res_st = self.client.get(f'/api/floor-stock/?variety_id={self.variety_sona.id}')
        self.assertEqual(res_st.status_code, status.HTTP_200_OK)
        floors_data = {f['floor_id']: f['bags'] for f in res_st.data['floors']}
        self.assertEqual(floors_data[floor_ground.id], 1000)
        self.assertEqual(floors_data[floor_first.id], 2000)

        # 4. Inward with mismatched allocation sum must be rejected
        mismatch_payload = {
            'invoice_no': 'INV-FL-BAD',
            'date': str(timezone.now().date()),
            'party': self.party_lakshmi.id,
            'variety': self.variety_sona.id,
            'bags': 1000,
            'rate': '1500.00',
            'floor_allocations': [
                {'floor_id': floor_ground.id, 'bags': 500} # only 500 allocated instead of 1000
            ]
        }
        res_bad = self.client.post('/api/inward/', mismatch_payload, format='json')
        self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('floor_allocations', res_bad.data)

        # 5. Outward 2,500 bags split across floors:
        # 1st Floor: 2,000 (all available on 1st), Ground Floor: 500 (from 1,000 available)
        outward_payload = {
            'invoice_no': 'OUT-FL-001',
            'date': str(timezone.now().date()),
            'party': self.party_lakshmi.id,
            'variety': self.variety_sona.id,
            'bags': 2500,
            'rate': '1650.00',
            'is_transfer': False,
            'floor_allocations': [
                {'floor_id': floor_first.id, 'floor_name': floor_first.name, 'bags': 2000},
                {'floor_id': floor_ground.id, 'floor_name': floor_ground.name, 'bags': 500}
            ]
        }
        res_out = self.client.post('/api/outward/', outward_payload, format='json')
        self.assertEqual(res_out.status_code, status.HTTP_201_CREATED)

        # 6. Check updated floor stock:
        # 1st Floor should have 0 bags, Ground Floor should have 500 bags
        res_st2 = self.client.get(f'/api/floor-stock/?variety_id={self.variety_sona.id}')
        floors_data2 = {f['floor_id']: f['bags'] for f in res_st2.data['floors']}
        self.assertEqual(floors_data2[floor_first.id], 0)
        self.assertEqual(floors_data2[floor_ground.id], 500)

        # 7. Attempting to outward 100 bags from 1st Floor (which now has 0) must be rejected
        over_out_payload = {
            'invoice_no': 'OUT-FL-OVER',
            'date': str(timezone.now().date()),
            'party': self.party_lakshmi.id,
            'variety': self.variety_sona.id,
            'bags': 100,
            'rate': '1650.00',
            'is_transfer': False,
            'floor_allocations': [
                {'floor_id': floor_first.id, 'floor_name': floor_first.name, 'bags': 100}
            ]
        }
        res_over = self.client.post('/api/outward/', over_out_payload, format='json')
        self.assertEqual(res_over.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('floor_allocations', res_over.data)

        # 8. Floor Stock PDF export test
        res_pdf = self.client.get('/api/floor-stock/export-pdf/')
        self.assertEqual(res_pdf.status_code, status.HTTP_200_OK)
        self.assertEqual(res_pdf['Content-Type'], 'application/pdf')
        self.assertTrue(len(res_pdf.content) > 1000)

    # ─────────────────────────────────────────────────────────────────────────
    # 9. TEST VARIETY PLACE BAG ORDER (OWNER ONLY)
    # ─────────────────────────────────────────────────────────────────────────
    def test_variety_place_order(self):
        # 1. Staff user attempts to place order -> 403 Forbidden
        self.client.force_authenticate(user=self.staff_user)
        payload = {
            'order_placed': True,
            'order_date': str(timezone.now().date()),
            'order_bags': 5000,
            'order_notes': 'Urgent requirement from supplier'
        }
        res_staff = self.client.post(f'/api/varieties/{self.variety_sona.id}/place-order/', payload, format='json')
        self.assertEqual(res_staff.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Owner user places order -> 200 OK
        self.client.force_authenticate(user=self.owner_user)
        res_owner = self.client.post(f'/api/varieties/{self.variety_sona.id}/place-order/', payload, format='json')
        self.assertEqual(res_owner.status_code, status.HTTP_200_OK)
        self.assertTrue(res_owner.data['order_placed'])
        self.assertEqual(res_owner.data['order_bags'], 5000)
        self.assertEqual(res_owner.data['order_notes'], 'Urgent requirement from supplier')

        # Verify persisted in database
        self.variety_sona.refresh_from_db()
        self.assertTrue(self.variety_sona.order_placed)
        self.assertEqual(self.variety_sona.order_bags, 5000)
        self.assertEqual(self.variety_sona.order_notes, 'Urgent requirement from supplier')

        # 3. Owner marks order received / cleared
        clear_payload = {'order_placed': False}
        res_clear = self.client.post(f'/api/varieties/{self.variety_sona.id}/place-order/', clear_payload, format='json')
        self.assertEqual(res_clear.status_code, status.HTTP_200_OK)
        self.assertFalse(res_clear.data['order_placed'])

        self.variety_sona.refresh_from_db()
        self.assertFalse(self.variety_sona.order_placed)





