from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from inventory.models import UserProfile, Role


class Command(BaseCommand):
    help = 'Seeds only the Owner account for Mother India Mill.'

    def handle(self, *args, **options):
        self.stdout.write("Seeding Mother India Mill owner account...")

        owner_user, created = User.objects.get_or_create(
            username='owner',
            defaults={'email': 'owner@motherindiamill.com'}
        )
        owner_user.set_password('owner123')
        owner_user.save()
        UserProfile.objects.update_or_create(
            user=owner_user,
            defaults={'role': Role.OWNER}
        )

        if created:
            self.stdout.write(self.style.SUCCESS("Owner account created: owner / owner123"))
        else:
            self.stdout.write(self.style.SUCCESS("Owner account already exists. Password reset to 'owner123'."))

        self.stdout.write(self.style.SUCCESS("Seed complete. No dummy data created."))
