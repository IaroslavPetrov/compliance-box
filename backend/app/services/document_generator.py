from fpdf import FPDF
from datetime import datetime


class DocumentGenerator:
    def generate_policy_152fz(self, company_data: dict) -> bytes:
        pdf = FPDF()
        pdf.add_page()
        
        # Используем встроенный шрифт Courier (моноширинный, но работает везде)
        pdf.set_font('Courier', 'B', 14)
        pdf.cell(0, 10, "POLITIKA OBRABOTKI PERSONALNYKH DANNYKH", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(5)
        
        pdf.set_font('Courier', '', 12)
        pdf.cell(0, 8, f"Operator: {company_data.get('name', 'Organization')}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, f"INN: {company_data.get('inn', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, f"Email: {company_data.get('email', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        pdf.cell(0, 8, "1. Tseli obrabotki: ispolnenie dogovorov, trebovaniya zakonodatelstva RF.", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        pdf.cell(0, 8, f"Data: {datetime.now().strftime('%d.%m.%Y')}", new_x="LMARGIN", new_y="NEXT")
        
        return pdf.output()

    def generate_notification_152fz(self, company_data: dict) -> bytes:
        pdf = FPDF()
        pdf.add_page()
        
        pdf.set_font('Courier', 'B', 14)
        pdf.cell(0, 10, "UVEDOMLENIE OB OBRABOTKE PDn", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(5)
        
        pdf.set_font('Courier', '', 12)
        pdf.cell(0, 8, f"Operator: {company_data.get('name', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, f"INN: {company_data.get('inn', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, f"Email: {company_data.get('email', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        pdf.cell(0, 8, f"Data: {datetime.now().strftime('%d.%m.%Y')}", new_x="LMARGIN", new_y="NEXT")
        
        return pdf.output()

    def generate_threat_model_fstek(self, company_data: dict) -> bytes:
        pdf = FPDF()
        pdf.add_page()
        
        pdf.set_font('Courier', 'B', 14)
        pdf.cell(0, 10, "MODEL UGROZ BEZOPASNOSTI PDn", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(5)
        
        pdf.set_font('Courier', '', 12)
        pdf.cell(0, 8, f"Operator: {company_data.get('name', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, f"INN: {company_data.get('inn', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        pdf.cell(0, 8, "1. Obiekt zashchity: Personalnye dannye v IS.", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        pdf.cell(0, 8, "2. Ugrozy: Nesanktsionirovanny dostup, unichtozhenie dannykh.", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        pdf.cell(0, 8, f"Data: {datetime.now().strftime('%d.%m.%Y')}", new_x="LMARGIN", new_y="NEXT")
        
        return pdf.output()


document_generator = DocumentGenerator()