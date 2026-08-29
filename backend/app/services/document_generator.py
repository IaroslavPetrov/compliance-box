import os
from fpdf import FPDF
from datetime import datetime

# Путь к шрифтам внутри проекта
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONT_DIR = os.path.join(BASE_DIR, "app", "fonts")
FONT_PATH = os.path.join(FONT_DIR, "Roboto-Regular.ttf")
FONT_BOLD_PATH = os.path.join(FONT_DIR, "Roboto-Bold.ttf")


class DocumentGenerator:
    def _make_pdf(self, title: str, lines: list[str]) -> bytes:
        pdf = FPDF()
        pdf.add_page()
        pdf.add_font('Roboto', '', FONT_PATH, uni=True)
        pdf.add_font('Roboto', 'B', FONT_BOLD_PATH, uni=True)
        
        pdf.set_font('Roboto', 'B', 14)
        pdf.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(10)
        
        pdf.set_font('Roboto', '', 12)
        for line in lines:
            pdf.cell(0, 8, line, new_x="LMARGIN", new_y="NEXT")
        
        return pdf.output()

    def generate_policy_152fz(self, company_data: dict) -> bytes:
        lines = [
            f"Оператор: {company_data.get('name', 'Организация')}",
            f"ИНН: {company_data.get('inn', '')}",
            f"Email: {company_data.get('email', '')}",
            "",
            "1. Цели обработки: исполнение договоров, выполнение требований законодательства РФ.",
            "",
            f"Дата: {datetime.now().strftime('%d.%m.%Y')}",
        ]
        return self._make_pdf("ПОЛИТИКА обработки персональных данных", lines)

    def generate_notification_152fz(self, company_data: dict) -> bytes:
        lines = [
            f"Оператор: {company_data.get('name', '')}",
            f"ИНН: {company_data.get('inn', '')}",
            f"Email: {company_data.get('email', '')}",
            "",
            f"Дата: {datetime.now().strftime('%d.%m.%Y')}",
        ]
        return self._make_pdf("УВЕДОМЛЕНИЕ об обработке ПДн", lines)

    def generate_threat_model_fstek(self, company_data: dict) -> bytes:
        lines = [
            f"Оператор: {company_data.get('name', '')}",
            f"ИНН: {company_data.get('inn', '')}",
            "",
            "1. Объект защиты: Персональные данные, обрабатываемые в информационной системе.",
            "",
            "2. Актуальные угрозы: Несанкционированный доступ, уничтожение данных, модификация данных.",
            "",
            f"Дата: {datetime.now().strftime('%d.%m.%Y')}",
        ]
        return self._make_pdf("МОДЕЛЬ УГРОЗ безопасности ПДн", lines)


document_generator = DocumentGenerator()