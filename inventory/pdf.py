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

def generate_stocks_summary_pdf(title, date_str, inwards_data, outwards_data):
    """Generates a portrait PDF report for Stocks (Inward & Outward registers)."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    page_w, page_h = A4

    # Header Banner
    c.setFillColor(colors.HexColor('#1e3a8a'))
    c.rect(0, page_h - 45, page_w, 45, fill=True, stroke=False)
    
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(20, page_h - 28, "MOTHER INDIA MILL")
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(page_w - 20, page_h - 28, title.upper())

    c.setFillColor(colors.HexColor('#475569'))
    c.setFont("Helvetica", 9)
    c.drawString(20, page_h - 58, f"Report Period / Date: {date_str}")
    c.setStrokeColor(colors.HexColor('#cbd5e1'))
    c.line(20, page_h - 64, page_w - 20, page_h - 64)

    cur_y = page_h - 80

    def draw_section_table(section_title, rows, header_color):
        nonlocal cur_y
        if cur_y < 120:
            c.showPage()
            cur_y = page_h - 50

        # Section Header
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor(header_color))
        c.drawString(20, cur_y, f"--- {section_title} ---")
        cur_y -= 15

        headers = ["SL", "Invoice No", "Party Name", "Variety Name", "Bags", "Rate", "LF", "p/b cost", "Total Val (Rs)"]
        col_widths = [18, 75, 125, 100, 38, 38, 40, 42, 59]
        
        # Table Header Row
        c.setFillColor(colors.HexColor(header_color))
        c.setStrokeColor(colors.black)
        c.setLineWidth(0.6)
        
        x_pos = 20
        for h, w in zip(headers, col_widths):
            c.setFillColor(colors.HexColor(header_color))
            c.rect(x_pos, cur_y - 14, w, 14, fill=True, stroke=True)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 7.0)
            c.drawString(x_pos + 2, cur_y - 10, h)
            x_pos += w
        cur_y -= 14

        total_bags = 0
        total_val = 0.0

        c.setFont("Helvetica", 7.0)
        from inventory.models import Variety
        for idx, r in enumerate(rows):
            if cur_y < 50:
                c.showPage()
                cur_y = page_h - 50

            bg = colors.HexColor('#f8fafc') if idx % 2 == 0 else colors.white
            bags = int(r.get('bags', 0))
            val = float(r.get('total_value', 0) or 0)
            pb = float(r.get('per_bag_cost', 0) or 0)
            lf_amt = float(r.get('lf_amount', 0) or 0)
            lf_display = f"Rs.{lf_amt:.2f}" if r.get('lf_toggle') and lf_amt > 0 else "-"
            
            kgs = float(r.get('kgs_per_bag', 0) or 0)
            if kgs == 0:
                try:
                    v_id = r.get('variety') or r.get('variety_id')
                    if isinstance(v_id, dict):
                        v_id = v_id.get('id')
                    if v_id:
                        v_obj = Variety.objects.get(id=v_id)
                        kgs = float(v_obj.kgs_per_bag or 0)
                except Exception:
                    pass
                    
            v_name = str(r.get('variety_name', '-'))
            if kgs > 0 and f"({kgs}" not in v_name:
                v_name = f"{v_name} ({kgs:.1f} kg)"

            total_bags += bags
            total_val += val

            row_data = [
                str(idx + 1),
                str(r.get('invoice_no', '-'))[:15],
                str(r.get('party_name', '-'))[:22],
                v_name[:18],
                str(bags),
                f"{r.get('rate', 0)}",
                lf_display,
                f"{pb:.2f}",
                f"{val:,.2f}"
            ]

            x_pos = 20
            for val_str, w in zip(row_data, col_widths):
                c.setFillColor(bg)
                c.setStrokeColor(colors.black)
                c.setLineWidth(0.5)
                c.rect(x_pos, cur_y - 12, w, 12, fill=True, stroke=True)
                
                c.setFillColor(colors.HexColor('#0f172a'))
                c.drawString(x_pos + 2, cur_y - 9, val_str)
                x_pos += w
            cur_y -= 12

        # Section Summary Row
        c.setFillColor(colors.HexColor('#e2e8f0'))
        c.setStrokeColor(colors.black)
        c.rect(20, cur_y - 14, sum(col_widths), 14, fill=True, stroke=True)
        c.setFillColor(colors.HexColor('#0f172a'))
        c.setFont("Helvetica-Bold", 8)
        c.drawString(22, cur_y - 10, f"TOTAL {section_title.upper()}")
        c.drawString(22 + sum(col_widths[:4]), cur_y - 10, f"{total_bags} Bags")
        c.drawRightString(20 + sum(col_widths) - 4, cur_y - 10, f"Rs. {total_val:,.2f}")
        cur_y -= 25

    draw_section_table("INWARD REGISTER", inwards_data, "#10b981")
    draw_section_table("OUTWARD REGISTER", outwards_data, "#ef4444")

    c.showPage()
    c.save()
    pdf_out = buffer.getvalue()
    buffer.close()
    return pdf_out

def generate_ledger_summary_pdf(title, date_str, inwards_data, outwards_data):
    """Generates a portrait PDF report for Empty Bags Ledger with separate Inward (Green) and Outward (Red) tables and cell borders."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    page_w, page_h = A4

    # Header Banner
    c.setFillColor(colors.HexColor('#1e3a8a'))
    c.rect(0, page_h - 45, page_w, 45, fill=True, stroke=False)
    
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(20, page_h - 28, "MOTHER INDIA MILL")
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(page_w - 20, page_h - 28, title.upper())

    c.setFillColor(colors.HexColor('#475569'))
    c.setFont("Helvetica", 9)
    c.drawString(20, page_h - 58, f"Filter / Period: {date_str}")
    c.setStrokeColor(colors.HexColor('#cbd5e1'))
    c.line(20, page_h - 64, page_w - 20, page_h - 64)

    cur_y = page_h - 80

    def draw_ledger_section(section_title, rows, header_color, is_inward):
        nonlocal cur_y
        if cur_y < 120:
            c.showPage()
            cur_y = page_h - 50

        # Section Header Title
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor(header_color))
        c.drawString(20, cur_y, f"--- {section_title.upper()} ---")
        cur_y -= 15

        headers = ["SL", "Variety Name", "Party Name", "Op. Bags", "Rate (Man)", "Avg Rate (p/b)", "LF Total", "Mov. Bags", "Cl. Bags", "Total Val (Rs)"]
        col_widths = [18, 90, 85, 42, 45, 48, 45, 45, 42, 55]

        # Table Header Row
        c.setStrokeColor(colors.black)
        c.setLineWidth(0.6)
        x_pos = 20
        for h, w in zip(headers, col_widths):
            c.setFillColor(colors.HexColor(header_color))
            c.rect(x_pos, cur_y - 14, w, 14, fill=True, stroke=True)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 7.0)
            c.drawString(x_pos + 2, cur_y - 10, h)
            x_pos += w
        cur_y -= 14

        c.setFont("Helvetica", 7.0)
        tot_op, tot_mov, tot_cl, tot_val, tot_lf = 0, 0, 0, 0.0, 0.0

        for idx, r in enumerate(rows):
            if cur_y < 50:
                c.showPage()
                cur_y = page_h - 50

            bg = colors.HexColor('#f8fafc') if idx % 2 == 0 else colors.white
            op = int(r.get('opening_bags', 0))
            mov_b = int(r.get('inward_bags' if is_inward else 'outward_bags', 0))
            cl = int(r.get('closing_bags', 0))
            val = float(r.get('total_value', 0) or 0.0)
            lf = float(r.get('lf_total', 0) or 0.0)
            rate_man = float(r.get('rate_per_bag', 0) or 0.0)
            rate_avg = float(r.get('rate_per_bag', 0) or 0.0)
            
            kgs = float(r.get('kgs_per_bag', 0) or 0.0)
            if kgs == 0:
                try:
                    from inventory.models import Variety
                    v_id = r.get('variety') or r.get('variety_id')
                    if isinstance(v_id, dict):
                        v_id = v_id.get('id')
                    if v_id:
                        v_obj = Variety.objects.get(id=v_id)
                        kgs = float(v_obj.kgs_per_bag or 0)
                except Exception:
                    pass

            v_name = str(r.get('variety_name', '-'))
            if kgs > 0 and f"({kgs}" not in v_name:
                v_name = f"{v_name} ({kgs:.1f} kg)"

            tot_op += op
            tot_mov += mov_b
            tot_cl += cl
            tot_val += val
            tot_lf += lf

            row_data = [
                str(idx + 1),
                v_name[:16],
                str(r.get('latest_party', '-'))[:15],
                str(op),
                f"Rs.{rate_man:.2f}",
                f"Rs.{rate_avg:.2f}",
                f"Rs.{lf:,.2f}" if lf > 0 else "-",
                f"{'+' if is_inward else '-'}{mov_b}",
                str(cl),
                f"{val:,.2f}"
            ]

            x_pos = 20
            for val_str, w in zip(row_data, col_widths):
                c.setFillColor(bg)
                c.setStrokeColor(colors.black)
                c.setLineWidth(0.5)
                c.rect(x_pos, cur_y - 12, w, 12, fill=True, stroke=True)
                
                c.setFillColor(colors.HexColor('#0f172a'))
                c.drawString(x_pos + 2, cur_y - 9, val_str)
                x_pos += w
            cur_y -= 12

        # Summary Footer Row
        c.setFillColor(colors.HexColor('#e2e8f0'))
        c.setStrokeColor(colors.black)
        c.rect(20, cur_y - 14, sum(col_widths), 14, fill=True, stroke=True)
        c.setFillColor(colors.HexColor('#0f172a'))
        c.setFont("Helvetica-Bold", 8)
        c.drawString(22, cur_y - 10, f"TOTAL {section_title}")
        
        c.drawString(22 + sum(col_widths[:3]), cur_y - 10, str(tot_op))
        c.drawString(22 + sum(col_widths[:4]), cur_y - 10, f"Rs. {tot_lf:,.2f}" if tot_lf > 0 else "-")
        c.drawString(22 + sum(col_widths[:5]), cur_y - 10, f"{'+' if is_inward else '-'}{tot_mov}")
        c.drawString(22 + sum(col_widths[:6]), cur_y - 10, str(tot_cl))
        c.drawRightString(20 + sum(col_widths) - 4, cur_y - 10, f"Rs. {tot_val:,.2f}")
        cur_y -= 25

    draw_ledger_section("INWARD EMPTY BAGS LEDGER", inwards_data, "#10b981", True)
    draw_ledger_section("OUTWARD EMPTY BAGS LEDGER", outwards_data, "#ef4444", False)

    c.showPage()
    c.save()
    pdf_out = buffer.getvalue()
    buffer.close()
    return pdf_out
