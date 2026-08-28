from pathlib import Path
from datetime import datetime
from weasyprint import HTML, CSS


class DocumentGenerator:
    """Генератор документов по 152-ФЗ и ФСТЭК"""

    def generate_policy_152fz(self, company_data: dict) -> bytes:
        """Генерация Политики обработки персональных данных"""

        template = f"""
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
                h1 {{ text-align: center; }}
                .section {{ margin: 20px 0; }}
                .signature {{ margin-top: 40px; }}
            </style>
        </head>
        <body>
            <h1>ПОЛИТИКА<br>обработки персональных данных</h1>

            <div class="section">
                <p>1. Общие положения</p>
                <p>1.1. Настоящая Политика обработки персональных данных (далее — Политика) разработана в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».</p>
                <p>1.2. Оператором персональных данных является {company_data.get('name', 'Организация')} (ИНН: {company_data.get('inn', '')}).</p>
            </div>

            <div class="section">
                <p>2. Цели обработки персональных данных</p>
                <p>2.1. Обработка персональных данных осуществляется в следующих целях:</p>
                <ul>
                    <li>Исполнение договоров с клиентами</li>
                    <li>Выполнение требований законодательства РФ</li>
                    <li>Информирование клиентов о услугах</li>
                </ul>
            </div>

            <div class="section">
                <p>3. Принципы обработки персональных данных</p>
                <p>3.1. Обработка персональных данных осуществляется на законной и справедливой основе.</p>
                <p>3.2. Обработка персональных данных ограничивается достижением конкретных, заранее определенных и законных целей.</p>
            </div>

            <div class="signature">
                <p>Дата утверждения: {datetime.now().strftime('%d.%m.%Y')}</p>
                <p>Генеральный директор _________________ /{company_data.get('name', '')[:50]}/</p>
            </div>
        </body>
        </html>
        """

        html = HTML(string=template)
        css = CSS(string='''
            @page {{ size: A4; margin: 2cm; }}
            body {{ font-family: "Times New Roman", Times, serif; }}
        ''')

        return html.write_pdf(stylesheets=[css])

    def generate_notification_152fz(self, company_data: dict) -> bytes:
        """Генерация Уведомления об обработке ПДн"""

        template = f"""
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
                h1 {{ text-align: center; }}
                .section {{ margin: 20px 0; }}
            </style>
        </head>
        <body>
            <h1>УВЕДОМЛЕНИЕ<br>об обработке персональных данных</h1>

            <div class="section">
                <p><strong>1. Наименование оператора:</strong> {company_data.get('name', '')}</p>
                <p><strong>2. ИНН:</strong> {company_data.get('inn', '')}</p>
                <p><strong>3. Адрес:</strong> {company_data.get('address', 'Не указан')}</p>
                <p><strong>4. Email:</strong> {company_data.get('email', '')}</p>
            </div>

            <div class="section">
                <p><strong>5. Категории субъектов ПДн:</strong></p>
                <ul>
                    <li>Клиенты (физические лица)</li>
                    <li>Сотрудники</li>
                    <li>Контрагенты</li>
                </ul>
            </div>

            <div class="section">
                <p><strong>6. Цели обработки:</strong></p>
                <ul>
                    <li>Заключение и исполнение договоров</li>
                    <li>Информирование о услугах</li>
                    <li>Выполнение требований законодательства</li>
                </ul>
            </div>

            <div class="section">
                <p><strong>7. Перечень обрабатываемых данных:</strong></p>
                <ul>
                    <li>ФИО</li>
                    <li>Контактные данные (телефон, email)</li>
                    <li>Паспортные данные</li>
                </ul>
            </div>

            <p style="margin-top: 40px;">Дата: {datetime.now().strftime('%d.%m.%Y')}</p>
        </body>
        </html>
        """

        html = HTML(string=template)
        css = CSS(string='@page { size: A4; margin: 2cm; }')

        return html.write_pdf(stylesheets=[css])

    def generate_threat_model_fstek(self, company_data: dict) -> bytes:
        """Генерация Модели угроз (ФСТЭК)"""

        template = f"""
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
                h1 {{ text-align: center; }}
                .section {{ margin: 20px 0; }}
                table {{ border-collapse: collapse; width: 100%; }}
                th, td {{ border: 1px solid black; padding: 8px; text-align: left; }}
            </style>
        </head>
        <body>
            <h1>МОДЕЛЬ УГРОЗ<br>безопасности персональных данных</h1>

            <div class="section">
                <p><strong>Оператор:</strong> {company_data.get('name', '')}</p>
                <p><strong>ИНН:</strong> {company_data.get('inn', '')}</p>
                <p><strong>Дата составления:</strong> {datetime.now().strftime('%d.%m.%Y')}</p>
            </div>

            <div class="section">
                <h2>1. Объект защиты</h2>
                <p>Персональные данные, обрабатываемые в информационной системе {company_data.get('name', '')}.</p>
            </div>

            <div class="section">
                <h2>2. Актуальные угрозы</h2>
                <table>
                    <tr>
                        <th>№</th>
                        <th>Угроза</th>
                        <th>Источник</th>
                        <th>Уязвимость</th>
                    </tr>
                    <tr>
                        <td>1</td>
                        <td>Несанкционированный доступ к ПДн</td>
                        <td>Внешний нарушитель</td>
                        <td>Отсутствие разграничения прав доступа</td>
                    </tr>
                    <tr>
                        <td>2</td>
                        <td>Уничтожение ПДн</td>
                        <td>Внутренний нарушитель</td>
                        <td>Отсутствие резервного копирования</td>
                    </tr>
                    <tr>
                        <td>3</td>
                        <td>Модификация ПДн</td>
                        <td>Внешний нарушитель</td>
                        <td>Отсутствие контроля целостности</td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2>3. Меры защиты</h2>
                <ul>
                    <li>Разграничение прав доступа</li>
                    <li>Регулярное резервное копирование</li>
                    <li>Антивирусная защита</li>
                    <li>Шифрование каналов связи</li>
                </ul>
            </div>
        </body>
        </html>
        """

        html = HTML(string=template)
        css = CSS(string='@page { size: A4; margin: 2cm; }')

        return html.write_pdf(stylesheets=[css])


# Создаём один экземпляр, который будем использовать везде
document_generator = DocumentGenerator()