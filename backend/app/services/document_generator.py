from fpdf import FPDF
from datetime import datetime
import os


class DocumentGenerator:
    """Генератор документов по 152-ФЗ и ФСТЭК"""
    
    def _setup_font(self, pdf):
        """Настройка шрифта с поддержкой кириллицы"""
        # Используем встроенный шрифт с поддержкой кириллицы
        pdf.add_font('DejaVu', '', 'backend/app/fonts/DejaVuSans.ttf', uni=True)
        pdf.add_font('DejaVu', 'B', 'backend/app/fonts/DejaVuSans-Bold.ttf', uni=True)
        pdf.set_font('DejaVu', '', 12)
    
    def generate_policy_152fz(self, company_data: dict) -> bytes:
        """Генерация Политики обработки персональных данных"""
        pdf = FPDF()
        pdf.add_page()
        
        # Заголовок
        pdf.set_font('DejaVu', 'B', 14)
        pdf.cell(0, 10, "POLITIKA", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.cell(0, 10, "obrabotki personalnykh dannykh", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(10)
        
        pdf.set_font('DejaVu', '', 12)
        pdf.multi_cell(0, 8, "1. General provisions")
        pdf.multi_cell(0, 8, f"1.1. This Policy is developed in accordance with Federal Law No. 152-FZ dated 27.07.2006 'On Personal Data'.")
        pdf.multi_cell(0, 8, f"1.2. The personal data operator is {company_data.get('name', 'Organization')} (INN: {company_data.get('inn', '')}).")
        pdf.ln(5)
        
        pdf.multi_cell(0, 8, "2. Purposes of personal data processing")
        pdf.multi_cell(0, 8, "2.1. Personal data is processed for the following purposes:")
        pdf.cell(0, 8, "   - Execution of contracts with clients", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Compliance with RF legislation requirements", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Informing clients about services", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        
        pdf.multi_cell(0, 8, "3. Principles of personal data processing")
        pdf.multi_cell(0, 8, "3.1. Personal data processing is carried out on a lawful and fair basis.")
        pdf.multi_cell(0, 8, "3.2. Personal data processing is limited to achieving specific, predetermined and lawful purposes.")
        pdf.ln(10)
        
        pdf.cell(0, 8, f"Date of approval: {datetime.now().strftime('%d.%m.%Y')}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, f"General Director _________________ /{company_data.get('name', '')[:50]}/", new_x="LMARGIN", new_y="NEXT")
        
        return pdf.output()

    def generate_notification_152fz(self, company_data: dict) -> bytes:
        """Генерация Уведомления об обработке ПДн"""
        pdf = FPDF()
        pdf.add_page()
        
        pdf.set_font('DejaVu', 'B', 14)
        pdf.cell(0, 10, "NOTIFICATION", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.cell(0, 10, "on personal data processing", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(10)
        
        pdf.set_font('DejaVu', '', 12)
        pdf.multi_cell(0, 8, f"1. Operator name: {company_data.get('name', '')}")
        pdf.multi_cell(0, 8, f"2. INN: {company_data.get('inn', '')}")
        pdf.multi_cell(0, 8, f"3. Address: {company_data.get('address', 'Not specified')}")
        pdf.multi_cell(0, 8, f"4. Email: {company_data.get('email', '')}")
        pdf.ln(5)
        
        pdf.multi_cell(0, 8, "5. Categories of personal data subjects:")
        pdf.cell(0, 8, "   - Clients (individuals)", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Employees", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Counterparties", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        
        pdf.multi_cell(0, 8, "6. Processing purposes:")
        pdf.cell(0, 8, "   - Conclusion and execution of contracts", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Informing about services", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Compliance with legislation requirements", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        
        pdf.multi_cell(0, 8, "7. List of processed data:")
        pdf.cell(0, 8, "   - Full name", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Contact details (phone, email)", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Passport data", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)
        
        pdf.cell(0, 8, f"Date: {datetime.now().strftime('%d.%m.%Y')}", new_x="LMARGIN", new_y="NEXT")
        
        return pdf.output()

    def generate_threat_model_fstek(self, company_data: dict) -> bytes:
        """Генерация Модели угроз (ФСТЭК)"""
        pdf = FPDF()
        pdf.add_page()
        
        pdf.set_font('DejaVu', 'B', 14)
        pdf.cell(0, 10, "THREAT MODEL", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.cell(0, 10, "of personal data security", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(10)
        
        pdf.set_font('DejaVu', '', 12)
        pdf.multi_cell(0, 8, f"Operator: {company_data.get('name', '')}")
        pdf.multi_cell(0, 8, f"INN: {company_data.get('inn', '')}")
        pdf.multi_cell(0, 8, f"Date of compilation: {datetime.now().strftime('%d.%m.%Y')}")
        pdf.ln(5)
        
        pdf.multi_cell(0, 8, "1. Object of protection")
        pdf.multi_cell(0, 8, f"Personal data processed in the information system of {company_data.get('name', '')}.")
        pdf.ln(5)
        
        pdf.multi_cell(0, 8, "2. Actual threats")
        pdf.cell(0, 8, "   1. Unauthorized access to personal data (external violator)", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   2. Destruction of personal data (internal violator)", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   3. Modification of personal data (external violator)", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        
        pdf.multi_cell(0, 8, "3. Protection measures")
        pdf.cell(0, 8, "   - Access rights separation", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Regular backup", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Antivirus protection", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Communication channels encryption", new_x="LMARGIN", new_y="NEXT")
        
        return pdf.output()


# Создаём один экземпляр, который будем использовать везде
document_generator = DocumentGenerator()