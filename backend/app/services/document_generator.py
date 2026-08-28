import os
import urllib.request
from fpdf import FPDF
from datetime import datetime

FONT_DIR = "/tmp/fonts"
FONT_PATH = os.path.join(FONT_DIR, "Roboto-Regular.ttf")
FONT_BOLD_PATH = os.path.join(FONT_DIR, "Roboto-Bold.ttf")

def ensure_font():
    if not os.path.exists(FONT_DIR):
        os.makedirs(FONT_DIR)
    if not os.path.exists(FONT_PATH):
        urllib.request.urlretrieve(
            "https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Regular.ttf",
            FONT_PATH
        )
    if not os.path.exists(FONT_BOLD_PATH):
        urllib.request.urlretrieve(
            "https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Bold.ttf",
            FONT_BOLD_PATH
        )

ensure_font()

class DocumentGenerator:
    def generate_policy_152fz(self, company_data: dict) -> bytes:
        pdf = FPDF()
        pdf.add_page()
        pdf.add_font('Roboto', '', FONT_PATH, uni=True)
        pdf.add_font('Roboto', 'B', FONT_BOLD_PATH, uni=True)
        pdf.set_font('Roboto', 'B', 16)
        pdf.cell(0, 10, "POLITIKA obrabotki personalnykh dannykh", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(10)
        pdf.set_font('Roboto', '', 12)
        pdf.multi_cell(0, 8, f"Operator: {company_data.get('name', '')}")
        pdf.multi_cell(0, 8, f"INN: {company_data.get('inn', '')}")
        pdf.ln(10)
        pdf.cell(0, 8, f"Data: {datetime.now().strftime('%d.%m.%Y')}", new_x="LMARGIN", new_y="NEXT")
        return pdf.output()

    def generate_notification_152fz(self, company_data: dict) -> bytes:
        pdf = FPDF()
        pdf.add_page()
        pdf.add_font('Roboto', '', FONT_PATH, uni=True)
        pdf.add_font('Roboto', 'B', FONT_BOLD_PATH, uni=True)
        pdf.set_font('Roboto', 'B', 16)
        pdf.cell(0, 10, "UVEDOMLENIE ob obrabotke PDn", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(10)
        pdf.set_font('Roboto', '', 12)
        pdf.multi_cell(0, 8, f"Operator: {company_data.get('name', '')}")
        pdf.multi_cell(0, 8, f"INN: {company_data.get('inn', '')}")
        pdf.ln(10)
        pdf.cell(0, 8, f"Data: {datetime.now().strftime('%d.%m.%Y')}", new_x="LMARGIN", new_y="NEXT")
        return pdf.output()

    def generate_threat_model_fstek(self, company_data: dict) -> bytes:
        pdf = FPDF()
        pdf.add_page()
        pdf.add_font('Roboto', '', FONT_PATH, uni=True)
        pdf.add_font('Roboto', 'B', FONT_BOLD_PATH, uni=True)
        pdf.set_font('Roboto', 'B', 16)
        pdf.cell(0, 10, "MODEL UGROZ bezopasnosti PDn", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(10)
        pdf.set_font('Roboto', '', 12)
        pdf.multi_cell(0, 8, f"Operator: {company_data.get('name', '')}")
        pdf.multi_cell(0, 8, f"INN: {company_data.get('inn', '')}")
        pdf.ln(10)
        pdf.cell(0, 8, f"Data: {datetime.now().strftime('%d.%m.%Y')}", new_x="LMARGIN", new_y="NEXT")
        return pdf.output()

document_generator = DocumentGenerator()