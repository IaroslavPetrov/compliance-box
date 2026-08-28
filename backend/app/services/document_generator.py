from fpdf import FPDF
from datetime import datetime


class DocumentGenerator:
    """Генератор документов по 152-ФЗ и ФСТЭК"""

    def generate_policy_152fz(self, company_data: dict) -> bytes:
        """Генерация Политики обработки персональных данных"""
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", size=14)
        
        pdf.cell(0, 10, "ПОЛИТИКА", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.cell(0, 10, "обработки персональных данных", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(10)
        
        pdf.set_font("Helvetica", size=12)
        pdf.multi_cell(0, 8, "1. Общие положения")
        pdf.multi_cell(0, 8, f"1.1. Настоящая Политика разработана в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».")
        pdf.multi_cell(0, 8, f"1.2. Оператором персональных данных является {company_data.get('name', 'Организация')} (ИНН: {company_data.get('inn', '')}).")
        pdf.ln(5)
        
        pdf.multi_cell(0, 8, "2. Цели обработки персональных данных")
        pdf.multi_cell(0, 8, "2.1. Обработка персональных данных осуществляется в следующих целях:")
        pdf.cell(0, 8, "   - Исполнение договоров с клиентами", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Выполнение требований законодательства РФ", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Информирование клиентов о услугах", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        
        pdf.multi_cell(0, 8, "3. Принципы обработки персональных данных")
        pdf.multi_cell(0, 8, "3.1. Обработка персональных данных осуществляется на законной и справедливой основе.")
        pdf.multi_cell(0, 8, "3.2. Обработка персональных данных ограничивается достижением конкретных, заранее определенных и законных целей.")
        pdf.ln(10)
        
        pdf.cell(0, 8, f"Дата утверждения: {datetime.now().strftime('%d.%m.%Y')}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, f"Генеральный директор _________________ /{company_data.get('name', '')[:50]}/", new_x="LMARGIN", new_y="NEXT")
        
        return pdf.output()

    def generate_notification_152fz(self, company_data: dict) -> bytes:
        """Генерация Уведомления об обработке ПДн"""
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", size=14)
        
        pdf.cell(0, 10, "УВЕДОМЛЕНИЕ", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.cell(0, 10, "об обработке персональных данных", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(10)
        
        pdf.set_font("Helvetica", size=12)
        pdf.multi_cell(0, 8, f"1. Наименование оператора: {company_data.get('name', '')}")
        pdf.multi_cell(0, 8, f"2. ИНН: {company_data.get('inn', '')}")
        pdf.multi_cell(0, 8, f"3. Адрес: {company_data.get('address', 'Не указан')}")
        pdf.multi_cell(0, 8, f"4. Email: {company_data.get('email', '')}")
        pdf.ln(5)
        
        pdf.multi_cell(0, 8, "5. Категории субъектов ПДн:")
        pdf.cell(0, 8, "   - Клиенты (физические лица)", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Сотрудники", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Контрагенты", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        
        pdf.multi_cell(0, 8, "6. Цели обработки:")
        pdf.cell(0, 8, "   - Заключение и исполнение договоров", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Информирование о услугах", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Выполнение требований законодательства", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        
        pdf.multi_cell(0, 8, "7. Перечень обрабатываемых данных:")
        pdf.cell(0, 8, "   - ФИО", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Контактные данные (телефон, email)", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Паспортные данные", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)
        
        pdf.cell(0, 8, f"Дата: {datetime.now().strftime('%d.%m.%Y')}", new_x="LMARGIN", new_y="NEXT")
        
        return pdf.output()

    def generate_threat_model_fstek(self, company_data: dict) -> bytes:
        """Генерация Модели угроз (ФСТЭК)"""
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", size=14)
        
        pdf.cell(0, 10, "МОДЕЛЬ УГРОЗ", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.cell(0, 10, "безопасности персональных данных", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(10)
        
        pdf.set_font("Helvetica", size=12)
        pdf.multi_cell(0, 8, f"Оператор: {company_data.get('name', '')}")
        pdf.multi_cell(0, 8, f"ИНН: {company_data.get('inn', '')}")
        pdf.multi_cell(0, 8, f"Дата составления: {datetime.now().strftime('%d.%m.%Y')}")
        pdf.ln(5)
        
        pdf.multi_cell(0, 8, "1. Объект защиты")
        pdf.multi_cell(0, 8, f"Персональные данные, обрабатываемые в информационной системе {company_data.get('name', '')}.")
        pdf.ln(5)
        
        pdf.multi_cell(0, 8, "2. Актуальные угрозы")
        pdf.cell(0, 8, "   1. Несанкционированный доступ к ПДн (внешний нарушитель)", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   2. Уничтожение ПДн (внутренний нарушитель)", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   3. Модификация ПДн (внешний нарушитель)", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        
        pdf.multi_cell(0, 8, "3. Меры защиты")
        pdf.cell(0, 8, "   - Разграничение прав доступа", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Регулярное резервное копирование", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Антивирусная защита", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, "   - Шифрование каналов связи", new_x="LMARGIN", new_y="NEXT")
        
        return pdf.output()


# Создаём один экземпляр, который будем использовать везде
document_generator = DocumentGenerator()