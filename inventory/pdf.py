import io
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors

def draw_invoice_slip(c, x, y, width, height, title, entry_data, logo_path=None):
    """Draws a single professional invoice slip within designated bounding box."""
    c.saveState()
    
    # Outer Border Box
    c.setStrokeColor(colors.HexColor('#1e293b'))
    c.setLineWidth(1)
    c.rect(x + 5, y + 5, width - 10, height - 10)
    
    # Header Banner (Thinner for 4-up vertical fit)
    c.setFillColor(colors.HexColor('#1e3a8a'))
    c.rect(x + 5, y + height - 25, width - 10, 20, fill=True, stroke=False)
    
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x + 15, y + height - 17, "MOTHER INDIA MILL")
    
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(x + width - 15, y + height - 17, f"{title.upper()} SLIP")
    
    # Metadata Row
    c.setFillColor(colors.HexColor('#334155'))
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(x + 15, y + height - 35, f"Invoice No: {entry_data.get('invoice_no')}")
    c.drawRightString(x + width - 15, y + height - 35, f"Date: {entry_data.get('date')}")
    
    lf_rate_str = f"Rs. {entry_data.get('lf_amount', '0.00')}" if entry_data.get('lf_toggle') else "NO"

    details = [
        ("Party / Customer:", str(entry_data.get('party_name'))),
        ("Variety:", str(entry_data.get('variety_name'))),
        ("Kgs / Bag:", f"{entry_data.get('kgs_per_bag')} kg"),
        ("Bags Count:", f"{entry_data.get('bags')} Bags"),
        ("Total Weight:", f"{entry_data.get('total_kgs')} kg"),
        ("Rate / Bag:", f"Rs. {entry_data.get('rate')}"),
        ("LF Total Charge:", lf_rate_str),
        ("Grand Total Value:", f"Rs. {entry_data.get('total_value')}"),
        ("Per Bag Net Cost:", f"Rs. {entry_data.get('per_bag_cost', '0.00')}"),
    ]

    # Content Table Details with Gridlines / Borders
    table_x = x + 15
    table_y_top = y + height - 40
    table_w = width - 30
    row_h = 11.5
    table_h = len(details) * row_h
    
    # Draw table outer border
    c.setStrokeColor(colors.HexColor('#475569'))
    c.setLineWidth(0.75)
    c.rect(table_x, table_y_top - table_h, table_w, table_h, fill=False, stroke=True)
    
    # Draw vertical gridline divider
    divider_x = table_x + 180
    c.line(divider_x, table_y_top - table_h, divider_x, table_y_top)
    
    cur_y = table_y_top
    for i, (label, val) in enumerate(details):
        # Draw label
        c.setFillColor(colors.HexColor('#334155'))
        c.setFont("Helvetica-Bold" if "Total" in label or "Grand" in label or "Cost" in label else "Helvetica", 7.5)
        c.drawString(table_x + 6, cur_y - 8.5, label)
        
        # Draw value
        c.setFillColor(colors.HexColor('#0f172a'))
        c.setFont("Helvetica-Bold" if "Total" in label or "Grand" in label or "Cost" in label else "Helvetica", 7.5)
        c.drawString(divider_x + 6, cur_y - 8.5, val)
        
        # Draw horizontal gridline divider (except last row)
        if i < len(details) - 1:
            c.setStrokeColor(colors.HexColor('#cbd5e1'))
            c.setLineWidth(0.5)
            c.line(table_x, cur_y - row_h, table_x + table_w, cur_y - row_h)
            
        cur_y -= row_h
        
    # Footer Signatures
    c.setStrokeColor(colors.HexColor('#cbd5e1'))
    c.line(x + 15, y + 25, x + width - 15, y + 25)
    
    c.setFont("Helvetica", 7.5)
    c.setFillColor(colors.HexColor('#64748b'))
    c.drawString(x + 15, y + 14, "Prepared By: Staff")
    c.drawRightString(x + width - 15, y + 14, "Authorized Signatory")
    
    c.restoreState()

def generate_4up_a4_invoice(entry_type, entry_data):
    """Generates an A4 PDF containing 4 identical vertical horizontal stacked invoice slips."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    page_w, page_h = A4
    
    slip_w = page_w
    slip_h = page_h / 4.0
    
    title = "INWARD" if entry_type == 'inward' else "OUTWARD"
    
    # 4 Vertical stacked slips
    slips = [
        (0, 3 * slip_h),
        (0, 2 * slip_h),
        (0, 1 * slip_h),
        (0, 0),
    ]
    
    for sx, sy in slips:
        draw_invoice_slip(c, sx, sy, slip_w, slip_h, title, entry_data)
        
    c.showPage()
    c.save()
    
    pdf_out = buffer.getvalue()
    buffer.close()
    return pdf_out
