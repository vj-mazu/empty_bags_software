from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0008_inward_inventory_i_date_38988d_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='outward',
            name='is_transfer',
            field=models.BooleanField(default=False, verbose_name='Transfer Toggle (Yes/No)'),
        ),
        migrations.AddField(
            model_name='outward',
            name='from_place_name',
            field=models.CharField(blank=True, help_text='Origin place name (manual entry)', max_length=150, null=True),
        ),
        migrations.AddField(
            model_name='outward',
            name='to_place',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='transfer_outwards', to='inventory.place'),
        ),
        migrations.AddIndex(
            model_name='outward',
            index=models.Index(fields=['to_place', '-date'], name='inventory_o_to_plac_e65d83_idx'),
        ),
    ]
