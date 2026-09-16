import os
import sys
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mother_india.settings')
application = get_wsgi_application()

# Ensure database tables are migrated and initial admin/owner exists in production
try:
    from django.core.management import call_command
    from django.contrib.auth.models import User
    call_command('migrate', interactive=False)
    if not User.objects.exists():
        call_command('seed_data', interactive=False)
except Exception as e:
    print(f"WSGI Startup DB init notice: {e}", file=sys.stderr)
