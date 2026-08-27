from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserProfileViewSet, PlaceViewSet, PartyViewSet, VarietyViewSet,
    InwardViewSet, OutwardViewSet, LoginAPIView, LogoutAPIView, AuthCheckAPIView,
    SystemAlertsAPIView, EmptyBagsStockLedgerAPIView, VarietyDetailLedgerAPIView,
    InwardInvoicePDFView, OutwardInvoicePDFView, ApprovalRequestViewSet,
    ExportStocksPDFView, ExportLedgerPDFView, DashboardAPIView, StocksTodayAPIView,
    PlaceStockLedgerAPIView
)

router = DefaultRouter()
router.register(r'users', UserProfileViewSet, basename='userprofile')
router.register(r'places', PlaceViewSet, basename='place')
router.register(r'parties', PartyViewSet, basename='party')
router.register(r'varieties', VarietyViewSet, basename='variety')
router.register(r'inward', InwardViewSet, basename='inward')
router.register(r'outward', OutwardViewSet, basename='outward')
router.register(r'approvals', ApprovalRequestViewSet, basename='approval')

urlpatterns = [
    path('auth/login/', LoginAPIView.as_view(), name='api-login'),
    path('auth/logout/', LogoutAPIView.as_view(), name='api-logout'),
    path('auth/check/', AuthCheckAPIView.as_view(), name='api-auth-check'),
    path('dashboard/', DashboardAPIView.as_view(), name='api-dashboard'),
    path('stocks-today/', StocksTodayAPIView.as_view(), name='api-stocks-today'),
    path('alerts/', SystemAlertsAPIView.as_view(), name='api-alerts'),
    path('empty-bags-ledger/', EmptyBagsStockLedgerAPIView.as_view(), name='api-empty-bags-ledger'),
    path('place-ledger/', PlaceStockLedgerAPIView.as_view(), name='api-place-ledger'),
    path('variety-ledger/<int:variety_id>/', VarietyDetailLedgerAPIView.as_view(), name='api-variety-ledger'),
    path('stocks/export-pdf/', ExportStocksPDFView.as_view(), name='stocks-export-pdf'),
    path('ledger/export-pdf/', ExportLedgerPDFView.as_view(), name='ledger-export-pdf'),
    path('inward/<int:pk>/pdf/', InwardInvoicePDFView.as_view(), name='inward-pdf'),
    path('outward/<int:pk>/pdf/', OutwardInvoicePDFView.as_view(), name='outward-pdf'),
    path('', include(router.urls)),
]
