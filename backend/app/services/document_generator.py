import os
import urllib.request
import logging
from fpdf import FPDF
from datetime import datetime

# Настраиваем логирование, чтобы видеть, если шрифт не скачается
logging.basicConfig(level=logging.INFO)

FONT_DIR = "/tmp/fonts"
FONT_PATH = os.path.join(FONT_DIR, "Roboto-Regular.ttf")
FONT_BOLD_PATH = os.path.join(FONT_DIR, "Roboto-Bold.ttf")

def ensure_font():
    if not os.path.exists(FONT_DIR):
        os.makedirs(FONT_DIR)
    
    # Прямые ссылки на raw-файлы GitHub (гарантированно отдают файл, а не HTML)
    font_url = "https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Regular.ttf"
    font_bold_url = "https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Bold.ttf"
    
    if not os.path.exists(FONT_PATH):
        logging.info("Downloading Roboto-Regular.ttf...")
        urllib.request.urlretrieve(font_url, FONT_PATH)
        logging.info("Download complete.")
        
    if not os.path.exists(FONT_BOLD_PATH):
        logging.info("Downloading Roboto-Bold.ttf...")
        urllib.request.urlretrieve(font_bold_url, FONT_BOLD_PATH)
        logging.info("Download complete.")

# Запускаем загрузку ПРЯМО СЕЙЧАС, при старте приложения
ensure_font()

class DocumentGenerator:
    def generate_policy_152fz(self, company_data: dict) -> bytes:
        pdf = FPDF()
        pdf.add_page()
        
        # Явно добавляем шрифты с флагом uni=True для поддержки Unicode (кириллицы)
        pdf.add_font('Roboto', '', FONT_PATH, uni=True)
        pdf.add_font('Roboto', 'B', FONT_BOLD_PATH, uni=True)
        
        pdf.set_font('Roboto', 'B', 14)
        pdf.cell(0, 10, "ПОЛИТИКА обработки персональных данных", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(10)
        
        pdf.set_font('Roboto', '', 12)
        pdf.cell(0, 8, f"Оператор: {company_data.get('name', 'Организация')}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, f"ИНН: {company_data.get('inn', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, f"Email: {company_data.get('email', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        pdf.multi_cell(0, 8, "1. Цели обработки: исполнение договоров, выполнение требований законодательства РФ.")
        pdf.ln(10)
        pdf.cell(0, 8, f"Дата: {datetime.now().strftime('%d.%m.%Y')}", new_x="LMARGIN", new_y="NEXT")
        
        return pdf.output()

    def generate_notification_152fz(self, company_data: dict) -> bytes:
        pdf = FPDF()
        pdf.add_page()
        pdf.add_font('Roboto', '', FONT_PATH, uni=True)
        pdf.add_font('Roboto', 'B', FONT_BOLD_PATH, uni=True)
        
        pdf.set_font('Roboto', 'B', 14)
        pdf.cell(0, 10, "УВЕДОМЛЕНИЕ об обработке ПДн", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(10)
        
        pdf.set_font('Roboto', '', 12)
        pdf.cell(0, 8, f"Оператор: {company_data.get('name', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, f"ИНН: {company_data.get('inn', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, f"Email: {company_data.get('email', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)
        pdf.cell(0, 8, f"Дата: {datetime.now().strftime('%d.%m.%Y')}", new_x="LMARGIN", new_y="NEXT")
        
        return pdf.output()

    def generate_threat_model_fstek(self, company_data: dict) -> bytes:
        pdf = FPDF()
        pdf.add_page()
        pdf.add_font('Roboto', '', FONT_PATH, uni=True)
        pdf.add_font('Roboto', 'B', FONT_BOLD_PATH, uni=True)
        
        pdf.set_font('Roboto', 'B', 14)
        pdf.cell(0, 10, "МОДЕЛЬ УГРОЗ безопасности ПДн", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(10)
        
        pdf.set_font('Roboto', '', 12)
        pdf.cell(0, 8, f"Оператор: {company_data.get('name', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, f"ИНН: {company_data.get('inn', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        pdf.multi_cell(0, 8, "1. Объект защиты: Персональные данные, обрабатываемые в информационной системе.")
        pdf.ln(5)
        pdf.multi_cell(0, 8, "2. Актуальные угрозы: Несанкционированный доступ, уничтожение данных, модификация данных.")
        pdf.ln(10)
        pdf.cell(0, 8, f"Дата: {datetime.now().strftime('%d.%m.%Y')}", new_x="LMARGIN", new_y="NEXT")
        
        return pdf.output()

document_generator = DocumentGenerator()