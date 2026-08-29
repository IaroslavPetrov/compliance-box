import os
from fpdf import FPDF
from datetime import datetime


BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONT_DIR = os.path.join(BASE_DIR, "app", "fonts")
FONT_PATH = os.path.join(FONT_DIR, "Roboto-Regular.ttf")
FONT_BOLD_PATH = os.path.join(FONT_DIR, "Roboto-Bold.ttf")


class DocumentGenerator:
    def _make_pdf(self, title: str, sections: list[dict]) -> bytes:
        """
        Универсальный метод создания PDF.
        sections — список словарей вида:
            {"type": "title"|"subtitle"|"text"|"item"|"sign", "content": "..."}
        """
        pdf = FPDF()
        pdf.add_page()
        pdf.add_font('Roboto', '', FONT_PATH, uni=True)
        pdf.add_font('Roboto', 'B', FONT_BOLD_PATH, uni=True)

        # Главный заголовок
        pdf.set_font('Roboto', 'B', 14)
        pdf.multi_cell(0, 8, title, align='C')
        pdf.ln(4)

        # Дата и город
        pdf.set_font('Roboto', '', 10)
        today = datetime.now().strftime('%d.%m.%Y')
        pdf.cell(0, 6, f"г. Москва, {today}", align='R', new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)

        # Основной контент
        for section in sections:
            stype = section.get("type", "text")
            content = section.get("content", "")

            if stype == "subtitle":
                pdf.set_font('Roboto', 'B', 12)
                pdf.ln(2)
                pdf.multi_cell(0, 7, content)
                pdf.ln(1)

            elif stype == "text":
                pdf.set_font('Roboto', '', 11)
                pdf.multi_cell(0, 6, content)
                pdf.ln(1)

            elif stype == "item":
                pdf.set_font('Roboto', '', 11)
                # Отступ для подпунктов
                pdf.set_x(15)
                pdf.multi_cell(0, 6, content)
                pdf.ln(0.5)

            elif stype == "sign":
                pdf.ln(4)
                pdf.set_font('Roboto', '', 11)
                pdf.multi_cell(0, 6, content)

        return pdf.output()

    def generate_policy_152fz(self, company_data: dict) -> bytes:
        """Политика в отношении обработки персональных данных"""
        name = company_data.get('name', 'Организация')
        inn = company_data.get('inn', '')
        email = company_data.get('email', '')

        title = f"ПОЛИТИКА В ОТНОШЕНИИ ОБРАБОТКИ ПЕРСОНАЛЬНЫХ ДАННЫХ\n{name}"

        sections = [
            {"type": "subtitle", "content": "1. ОБЩИЕ ПОЛОЖЕНИЯ"},
            {"type": "item", "content": f"1.1. Настоящая Политика разработана в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» (далее — Закон № 152-ФЗ) и определяет порядок обработки персональных данных и меры по обеспечению их безопасности, предпринимаемые {name} (далее — Оператор)."},
            {"type": "item", "content": f"1.2. Оператор ставит своей важнейшей целью и условием осуществления своей деятельности соблюдение прав и свобод человека и гражданина при обработке его персональных данных, в том числе защиты прав на неприкосновенность частной жизни, личную и семейную тайну."},
            {"type": "item", "content": "1.3. Настоящая Политика применяется ко всей информации, которую Оператор может получить о посетителях веб-сайта, клиентах, сотрудниках и контрагентах."},

            {"type": "subtitle", "content": "2. ЦЕЛИ ОБРАБОТКИ ПЕРСОНАЛЬНЫХ ДАННЫХ"},
            {"type": "item", "content": "2.1. Оператор обрабатывает персональные данные в следующих целях:"},
            {"type": "item", "content": "— исполнение договоров, стороной которых является субъект персональных данных;"},
            {"type": "item", "content": "— предоставление услуг и сервисов клиентам Оператора;"},
            {"type": "item", "content": "— трудоустройство и кадровое делопроизводство;"},
            {"type": "item", "content": "— направление информационных и рекламных сообщений (с согласия субъекта);"},
            {"type": "item", "content": "— соблюдение требований законодательства Российской Федерации."},

            {"type": "subtitle", "content": "3. ПРАВОВЫЕ ОСНОВАНИЯ ОБРАБОТКИ"},
            {"type": "item", "content": "3.1. Правовыми основаниями обработки персональных данных Оператором являются:"},
            {"type": "item", "content": "— Конституция Российской Федерации;"},
            {"type": "item", "content": "— Федеральный закон № 152-ФЗ «О персональных данных»;"},
            {"type": "item", "content": "— Трудовой кодекс Российской Федерации;"},
            {"type": "item", "content": "— согласие субъекта персональных данных на обработку его персональных данных."},

            {"type": "subtitle", "content": "4. ОБЪЕМ И КАТЕГОРИИ ОБРАБАТЫВАЕМЫХ ДАННЫХ"},
            {"type": "item", "content": "4.1. Оператор может обрабатывать следующие персональные данные:"},
            {"type": "item", "content": "— фамилия, имя, отчество;"},
            {"type": "item", "content": "— дата и место рождения;"},
            {"type": "item", "content": "— адрес электронной почты, номер телефона;"},
            {"type": "item", "content": "— паспортные данные;"},
            {"type": "item", "content": "— сведения о трудовой деятельности."},
            {"type": "item", "content": "4.2. Оператор не обрабатывает специальные категории персональных данных (расовая, национальная принадлежность, политические взгляды и т.д.), за исключением случаев, прямо предусмотренных законом."},

            {"type": "subtitle", "content": "5. ПОРЯДОК И УСЛОВИЯ ОБРАБОТКИ"},
            {"type": "item", "content": "5.1. Обработка персональных данных осуществляется с согласия субъекта, за исключением случаев, предусмотренных Законом № 152-ФЗ."},
            {"type": "item", "content": "5.2. Оператор не раскрывает третьим лицам и не распространяет персональные данные без согласия субъекта, если иное не предусмотрено федеральным законом."},
            {"type": "item", "content": "5.3. Оператор принимает необходимые правовые, организационные и технические меры для защиты персональных данных от неправомерного или случайного доступа, уничтожения, изменения, блокирования, копирования и распространения."},

            {"type": "subtitle", "content": "6. ПРАВА СУБЪЕКТА ПЕРСОНАЛЬНЫХ ДАННЫХ"},
            {"type": "item", "content": "6.1. Субъект персональных данных имеет право:"},
            {"type": "item", "content": "— получать сведения об обработке своих персональных данных;"},
            {"type": "item", "content": "— требовать уточнения, блокирования или уничтожения своих данных;"},
            {"type": "item", "content": "— отозвать согласие на обработку персональных данных;"},
            {"type": "item", "content": "— обжаловать действия Оператора в уполномоченный орган (Роскомнадзор) или в суд."},

            {"type": "subtitle", "content": "7. МЕРЫ ПО ОБЕСПЕЧЕНИЮ БЕЗОПАСНОСТИ"},
            {"type": "item", "content": "7.1. Оператор применяет следующие меры защиты:"},
            {"type": "item", "content": "— назначение ответственного за организацию обработки персональных данных;"},
            {"type": "item", "content": "— ограничение доступа к персональным данным;"},
            {"type": "item", "content": "— использование средств защиты информации;"},
            {"type": "item", "content": "— регулярный контроль и оценку эффективности принимаемых мер."},

            {"type": "subtitle", "content": "8. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ"},
            {"type": "item", "content": "8.1. Настоящая Политика действует бессрочно до момента её отзыва Оператором."},
            {"type": "item", "content": "8.2. Оператор вправе вносить изменения в настоящую Политику. Новая редакция вступает в силу с момента её размещения на официальном сайте Оператора."},

            {"type": "sign", "content": f"Оператор: {name}\nИНН: {inn}\nEmail: {email}\n\nГенеральный директор _________________ / _________________"},
        ]

        return self._make_pdf(title, sections)

    def generate_notification_152fz(self, company_data: dict) -> bytes:
        """Уведомление об обработке ПДн (пока заглушка — доработаем после Политики)"""
        pdf = FPDF()
        pdf.add_page()
        pdf.add_font('Roboto', '', FONT_PATH, uni=True)
        pdf.add_font('Roboto', 'B', FONT_BOLD_PATH, uni=True)

        pdf.set_font('Roboto', 'B', 14)
        pdf.cell(0, 10, "УВЕДОМЛЕНИЕ об обработке ПДн", align='C', new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)

        pdf.set_font('Roboto', '', 12)
        pdf.cell(0, 8, f"Оператор: {company_data.get('name', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, f"ИНН: {company_data.get('inn', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, f"Email: {company_data.get('email', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)
        pdf.cell(0, 8, f"Дата: {datetime.now().strftime('%d.%m.%Y')}", new_x="LMARGIN", new_y="NEXT")

        return pdf.output()

    def generate_threat_model_fstek(self, company_data: dict) -> bytes:
        """Модель угроз (пока заглушка)"""
        pdf = FPDF()
        pdf.add_page()
        pdf.add_font('Roboto', '', FONT_PATH, uni=True)
        pdf.add_font('Roboto', 'B', FONT_BOLD_PATH, uni=True)

        pdf.set_font('Roboto', 'B', 14)
        pdf.cell(0, 10, "МОДЕЛЬ УГРОЗ безопасности ПДн", align='C', new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)

        pdf.set_font('Roboto', '', 12)
        pdf.cell(0, 8, f"Оператор: {company_data.get('name', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, f"ИНН: {company_data.get('inn', '')}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        pdf.multi_cell(0, 6, "1. Объект защиты: Персональные данные, обрабатываемые в информационной системе.")
        pdf.ln(5)
        pdf.multi_cell(0, 6, "2. Актуальные угрозы: Несанкционированный доступ, уничтожение данных, модификация данных.")
        pdf.ln(10)
        pdf.cell(0, 8, f"Дата: {datetime.now().strftime('%d.%m.%Y')}", new_x="LMARGIN", new_y="NEXT")

        return pdf.output()


document_generator = DocumentGenerator()