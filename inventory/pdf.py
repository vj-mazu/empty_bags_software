import io
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.pdfbase.pdfmetrics import stringWidth

def format_date_dmy(d_str):
    """Formats date string to Day/Month/Year (DD/MM/YYYY)."""
    if not d_str:
        return '-'
    s = str(d_str).strip()
    parts = s.split('T')[0].split('-')
    if len(parts) == 3 and len(parts[0]) == 4:
        return f"{parts[2]}/{parts[1]}/{parts[0]}"
    return s

def wrap_text_by_width(text, font_name="Helvetica", font_size=7.0, max_width=100):
    """Accurately wraps text based on point width so ZERO characters or words are ever dropped."""
    if not text:
        return ["-"]
    text = str(text).strip()
    words = text.split()
    if not words:
        return ["-"]
    
    lines = []
    current_line = ""
    for w in words:
        test_line = (current_line + " " + w).strip() if current_line else w
        if stringWidth(test_line, font_name, font_size) <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
                current_line = w
            else:
                # Word itself is wider than max_width, split by characters
                sub_w = ""
                for char in w:
                    if stringWidth(sub_w + char, font_name, font_size) <= max_width:
                        sub_w += char
                    else:
                        if sub_w:
                            lines.append(sub_w)
                        sub_w = char
                current_line = sub_w
    if current_line:
        lines.append(current_line)
    return lines if lines else [text]

def draw_invoice_slip(c, x, y, width, height, title, entry_data, logo_path=None):
    """Draws a single professional invoice slip within designated bounding box."""
    c.saveState()
    
    # Outer Border Box
    c.setStrokeColor(colors.HexColor('#1e293b'))
    c.setLineWidth(1)
    c.rect(x + 5, y + 5, width - 10, height - 10)
    
    # Header Banner
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
    c.drawRightString(x + width - 15, y + height - 35, f"Date: {format_date_dmy(entry_data.get('date'))}")
    
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

    table_x = x + 15
    table_y_top = y + height - 40
    table_w = width - 30
    row_h = 11.5
    table_h = len(details) * row_h
    
    c.setStrokeColor(colors.HexColor('#475569'))
    c.setLineWidth(0.75)
    c.rect(table_x, table_y_top - table_h, table_w, table_h, fill=False, stroke=True)
    
    divider_x = table_x + 180
    c.line(divider_x, table_y_top - table_h, divider_x, table_y_top)
    
    cur_y = table_y_top
    for i, (label, val) in enumerate(details):
        c.setFillColor(colors.HexColor('#334155'))
        c.setFont("Helvetica-Bold" if "Total" in label or "Grand" in label or "Cost" in label else "Helvetica", 7.5)
        c.drawString(table_x + 6, cur_y - 8.5, label)
        
        c.setFillColor(colors.HexColor('#0f172a'))
        c.setFont("Helvetica-Bold" if "Total" in label or "Grand" in label or "Cost" in label else "Helvetica", 7.5)
        c.drawString(divider_x + 6, cur_y - 8.5, val)
        
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
    """Generates an A4 PDF containing 4 identical vertical stacked invoice slips."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    page_w, page_h = A4
    
    slip_w = page_w
    slip_h = page_h / 4.0
    
    title = "INWARD" if entry_type == 'inward' else "OUTWARD"
    
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

def _batch_fetch_varieties(row_list):
    """Pre-fetch all Variety objects needed by PDF rows in ONE query."""
    from inventory.models import Variety
    variety_ids = set()
    for r in row_list:
        v_id = r.get('variety') or r.get('variety_id')
        if isinstance(v_id, dict):
            v_id = v_id.get('id')
        if v_id:
            variety_ids.add(v_id)
    
    if not variety_ids:
        return {}
    
    return {
        v['id']: float(v['kgs_per_bag'])
        for v in Variety.objects.filter(id__in=variety_ids).values('id', 'kgs_per_bag')
    }

def generate_stocks_summary_pdf(title, date_str, inwards_data, outwards_data):
    """Generates a portrait PDF report for Stocks with zero text overlap and multi-page header support."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    page_w, page_h = A4

    variety_kgs_map = _batch_fetch_varieties(inwards_data + outwards_data)

    def draw_top_banner():
        c.setFillColor(colors.HexColor('#1e3a8a'))
        c.rect(0, page_h - 45, page_w, 45, fill=True, stroke=False)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(20, page_h - 28, "MOTHER INDIA MILL")
        c.setFont("Helvetica-Bold", 10)
        c.drawRightString(page_w - 20, page_h - 28, title.upper())

        c.setFillColor(colors.HexColor('#475569'))
        c.setFont("Helvetica", 9)
        c.drawString(20, page_h - 58, f"Report Period / Date: {format_date_dmy(date_str)}")
        c.setStrokeColor(colors.HexColor('#cbd5e1'))
        c.line(20, page_h - 64, page_w - 20, page_h - 64)

    draw_top_banner()
    cur_y = page_h - 80

    def draw_section_table(section_title, rows, header_color):
        nonlocal cur_y
        if cur_y < 120:
            c.showPage()
            draw_top_banner()
            cur_y = page_h - 80

        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor(header_color))
        c.drawString(20, cur_y, f"--- {section_title} ---")
        cur_y -= 16

        headers = ["SL", "Invoice No", "Party Name", "Variety Name", "Bags", "Rate", "LF", "p/b cost", "Total Val (Rs)"]
        col_widths = [18, 65, 115, 125, 38, 38, 40, 42, 74]  # sum = 555pt
        
        def render_headers():
            nonlocal cur_y
            c.setStrokeColor(colors.black)
            c.setLineWidth(0.6)
            x_pos = 20
            for h, w in zip(headers, col_widths):
                c.setFillColor(colors.HexColor(header_color))
                c.rect(x_pos, cur_y - 14, w, 14, fill=True, stroke=True)
                c.setFillColor(colors.white)
                c.setFont("Helvetica-Bold", 7.0)
                c.drawString(x_pos + 3, cur_y - 10, h)
                x_pos += w
            cur_y -= 14

        render_headers()

        total_bags = 0
        total_val = 0.0

        for idx, r in enumerate(rows):
            bags = int(r.get('bags', 0))
            val = float(r.get('total_value', 0) or 0)
            pb = float(r.get('per_bag_cost', 0) or 0)
            rate = float(r.get('rate', 0) or 0)
            lf_amt = float(r.get('lf_amount', 0) or 0)
            lf_display = f"Rs.{lf_amt:.2f}" if r.get('lf_toggle') and lf_amt > 0 else "-"
            
            kgs = float(r.get('kgs_per_bag', 0) or 0)
            if kgs == 0:
                v_id = r.get('variety') or r.get('variety_id')
                if isinstance(v_id, dict):
                    v_id = v_id.get('id')
                if v_id:
                    kgs = variety_kgs_map.get(v_id, 0)

            v_name = str(r.get('variety_name', '-'))
            if kgs > 0 and f"({kgs}" not in v_name:
                v_name = f"{v_name} ({kgs:.1f} kg)"

            party_name = str(r.get('party_name', '-'))
            
            party_lines = wrap_text_by_width(party_name, "Helvetica", 7.0, col_widths[2] - 6)
            variety_lines = wrap_text_by_width(v_name, "Helvetica", 7.0, col_widths[3] - 6)
            max_lines = max(len(variety_lines), len(party_lines), 1)
            row_h = 13 if max_lines == 1 else (max_lines * 9.5 + 4)

            if cur_y - row_h < 45:
                c.showPage()
                draw_top_banner()
                cur_y = page_h - 80
                render_headers()

            total_bags += bags
            total_val += val
            bg = colors.HexColor('#f8fafc') if idx % 2 == 0 else colors.white

            row_cells = [
                [str(idx + 1)],
                [str(r.get('invoice_no', '-'))],
                party_lines,
                variety_lines,
                [str(bags)],
                [f"Rs.{rate:.2f}"],
                [lf_display],
                [f"Rs.{pb:.2f}"],
                [f"{val:,.2f}"]
            ]

            x_pos = 20
            for lines_list, w in zip(row_cells, col_widths):
                c.setFillColor(bg)
                c.setStrokeColor(colors.black)
                c.setLineWidth(0.5)
                c.rect(x_pos, cur_y - row_h, w, row_h, fill=True, stroke=True)
                
                c.setFillColor(colors.HexColor('#0f172a'))
                c.setFont("Helvetica", 7.0)
                if len(lines_list) == 1:
                    y_text = cur_y - (row_h / 2.0) - 2.5
                    c.drawString(x_pos + 3, y_text, lines_list[0])
                else:
                    for l_idx, line_str in enumerate(lines_list):
                        y_text = cur_y - 8.5 - (l_idx * 9.0)
                        c.drawString(x_pos + 3, y_text, line_str)
                x_pos += w
            cur_y -= row_h

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
    """Generates a portrait PDF report for Empty Bags Ledger with zero text overlap and multi-page header support."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    page_w, page_h = A4

    variety_kgs_map = _batch_fetch_varieties(inwards_data + outwards_data)

    def draw_top_banner():
        c.setFillColor(colors.HexColor('#1e3a8a'))
        c.rect(0, page_h - 45, page_w, 45, fill=True, stroke=False)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(20, page_h - 28, "MOTHER INDIA MILL")
        c.setFont("Helvetica-Bold", 10)
        c.drawRightString(page_w - 20, page_h - 28, title.upper())

        c.setFillColor(colors.HexColor('#475569'))
        c.setFont("Helvetica", 9)
        c.drawString(20, page_h - 58, f"Filter / Period: {format_date_dmy(date_str)}")
        c.setStrokeColor(colors.HexColor('#cbd5e1'))
        c.line(20, page_h - 64, page_w - 20, page_h - 64)

    draw_top_banner()
    cur_y = page_h - 80

    def draw_ledger_section(section_title, rows, header_color, is_inward):
        nonlocal cur_y
        if cur_y < 120:
            c.showPage()
            draw_top_banner()
            cur_y = page_h - 80

        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor(header_color))
        c.drawString(20, cur_y, f"--- {section_title.upper()} ---")
        cur_y -= 16

        headers = ["SL", "Variety Name", "Party Name", "Op. Bags", "Rate (Man)", "Avg Rate (p/b)", "LF Total", "Mov. Bags", "Cl. Bags", "Total Val (Rs)"]
        col_widths = [18, 120, 105, 36, 38, 40, 40, 42, 42, 74]  # sum = 555pt

        def render_headers():
            nonlocal cur_y
            c.setStrokeColor(colors.black)
            c.setLineWidth(0.6)
            x_pos = 20
            for h, w in zip(headers, col_widths):
                c.setFillColor(colors.HexColor(header_color))
                c.rect(x_pos, cur_y - 14, w, 14, fill=True, stroke=True)
                c.setFillColor(colors.white)
                c.setFont("Helvetica-Bold", 7.0)
                c.drawString(x_pos + 3, cur_y - 10, h)
                x_pos += w
            cur_y -= 14

        render_headers()

        tot_op, tot_mov, tot_cl, tot_val, tot_lf = 0, 0, 0, 0.0, 0.0

        for idx, r in enumerate(rows):
            op = int(r.get('opening_bags', 0))
            mov_b = int(r.get('inward_bags' if is_inward else 'outward_bags', 0))
            cl = int(r.get('closing_bags', 0))
            val = float(r.get('total_value', 0) or 0.0)
            lf = float(r.get('lf_total', 0) or 0.0)
            rate_man = float(r.get('rate_per_bag', 0) or 0.0)
            rate_avg = float(r.get('rate_per_bag', 0) or 0.0)
            
            kgs = float(r.get('kgs_per_bag', 0) or 0.0)
            if kgs == 0:
                v_id = r.get('variety') or r.get('variety_id')
                if isinstance(v_id, dict):
                    v_id = v_id.get('id')
                if v_id:
                    kgs = variety_kgs_map.get(v_id, 0)

            v_name = str(r.get('variety_name', '-'))
            if kgs > 0 and f"({kgs}" not in v_name:
                v_name = f"{v_name} ({kgs:.1f} kg)"

            party_name = str(r.get('latest_party', '-'))

            variety_lines = wrap_text_by_width(v_name, "Helvetica", 7.0, col_widths[1] - 6)
            party_lines = wrap_text_by_width(party_name, "Helvetica", 7.0, col_widths[2] - 6)
            max_lines = max(len(variety_lines), len(party_lines), 1)
            row_h = 13 if max_lines == 1 else (max_lines * 9.5 + 4)

            if cur_y - row_h < 45:
                c.showPage()
                draw_top_banner()
                cur_y = page_h - 80
                render_headers()

            tot_op += op
            tot_mov += mov_b
            tot_cl += cl
            tot_val += val
            tot_lf += lf
            bg = colors.HexColor('#f8fafc') if idx % 2 == 0 else colors.white

            row_cells = [
                [str(idx + 1)],
                variety_lines,
                party_lines,
                [str(op)],
                [f"Rs.{rate_man:.2f}"],
                [f"Rs.{rate_avg:.2f}"],
                [f"Rs.{lf:,.2f}" if lf > 0 else "-"],
                [f"{'+' if is_inward else '-'}{mov_b}"],
                [str(cl)],
                [f"{val:,.2f}"]
            ]

            x_pos = 20
            for lines_list, w in zip(row_cells, col_widths):
                c.setFillColor(bg)
                c.setStrokeColor(colors.black)
                c.setLineWidth(0.5)
                c.rect(x_pos, cur_y - row_h, w, row_h, fill=True, stroke=True)
                
                c.setFillColor(colors.HexColor('#0f172a'))
                c.setFont("Helvetica", 7.0)
                if len(lines_list) == 1:
                    y_text = cur_y - (row_h / 2.0) - 2.5
                    c.drawString(x_pos + 3, y_text, lines_list[0])
                else:
                    for l_idx, line_str in enumerate(lines_list):
                        y_text = cur_y - 8.5 - (l_idx * 9.0)
                        c.drawString(x_pos + 3, y_text, line_str)
                x_pos += w
            cur_y -= row_h

        # Summary Footer Row
        c.setFillColor(colors.HexColor('#e2e8f0'))
        c.setStrokeColor(colors.black)
        c.rect(20, cur_y - 14, sum(col_widths), 14, fill=True, stroke=True)
        c.setFillColor(colors.HexColor('#0f172a'))
        c.setFont("Helvetica-Bold", 8)
        c.drawString(22, cur_y - 10, f"TOTAL {section_title}")
        c.drawString(22 + sum(col_widths[:3]), cur_y - 10, f"{tot_op} Op + {tot_mov} Mov = {tot_cl} Cl")
        c.drawRightString(20 + sum(col_widths) - 4, cur_y - 10, f"Rs. {tot_val:,.2f}")
        cur_y -= 25

    draw_ledger_section("INWARD", inwards_data, "#10b981", True)
    draw_ledger_section("OUTWARD", outwards_data, "#ef4444", False)

    c.showPage()
    c.save()
    pdf_out = buffer.getvalue()
    buffer.close()
    return pdf_out
