from django.apps import AppConfig

class InventoryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'inventory'

    def ready(self):
        import os
        from django.core.management import call_command
        # Avoid running twice when Django's auto-reloader spawns a subprocess
        if os.environ.get('RUN_MAIN') == 'true' or not os.environ.get('RUN_MAIN'):
            try:
                print("--- Automatically applying migrations ---")
                call_command('migrate', interactive=False)
                
                # Check if seed is needed
                from django.contrib.auth.models import User
                if not User.objects.exists():
                    print("--- Seeding initial demo data ---")
                    call_command('seed_data', interactive=False)
            except Exception as e:
                print(f"--- Startup initialization warning: {e} ---")
