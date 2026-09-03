"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '../hooks/useIsMobile';
import { IconShield } from '../components/icons';
import { useToast } from '../contexts/ToastContext';
import posthog from '../contexts/posthog';

export default function HomePage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const toast = useToast();
  const [demoEmail, setDemoEmail] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleLogin = () => {
    posthog.capture('landing_login_click');
    router.push('/login');
  };

  const handleSignup = () => {
    posthog.capture('landing_signup_click');
    router.push('/login?mode=register');
  };

  const handleDemoRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoEmail.trim()) {
      toast.warning('Введите email');
      return;
    }

    setDemoLoading(true);
    try {
      // Имитация отправки (в будущем — эндпоинт /api/v1/demo-requests)
      await new Promise(resolve => setTimeout(resolve, 1000));
      posthog.capture('landing_demo_request', { email: demoEmail });
      toast.success('Заявка отправлена! Свяжемся с вами в течение 24 часов.');
      setDemoEmail('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDemoLoading(false);
    }
  };

  const handlePricingClick = (plan: string) => {
    posthog.capture('landing_pricing_click', { plan });
    router.push('/login');
  };

  const problems = [
    { num: '500 000 ₽', text: 'штраф за нарушение 152-ФЗ для юрлиц' },
    { num: '10 дней', text: 'срок ответа на запрос субъекта ПДн' },
    { num: '2–3 часа', text: 'ручная подготовка документов юристом' },
  ];

  const audiences = [
    { title: 'ИП и малый бизнес', desc: 'Онлайн-запись, услуги, розница' },
    { title: 'ООО и корпорации', desc: 'HR-отделы, бухгалтерия, продажи' },
    { title: 'Салоны и клиники', desc: 'Медицина, красота, фитнес' },
    { title: 'Маркетплейсы', desc: 'E-commerce, подписки, SaaS' },
  ];

  const features = [
    { title: 'Реестр субъектов', desc: 'Все, чьи данные вы обрабатываете' },
    { title: 'Автогенерация документов', desc: 'Политика, согласия, приказы' },
    { title: 'Проверка сайта', desc: 'Автоматический аудит на 152-ФЗ' },
    { title: 'Карта обработки ПДн', desc: 'Реестр информационных систем' },
    { title: 'Запросы субъектов', desc: 'Ответы за 30 секунд вместо 3 часов' },
    { title: 'Шаблоны для РКН', desc: 'Готовые документы для проверок' },
  ];

  const steps = [
    { num: '1', title: 'Регистрация', desc: '2 минуты, без карты' },
    { num: '2', title: 'Добавьте компанию', desc: 'ИНН, название, сайт' },
    { num: '3', title: 'Заполните реестр', desc: 'Сотрудники, клиенты, подрядчики' },
    { num: '4', title: 'Готово к проверке', desc: 'Все документы сгенерированы' },
  ];

  const plans = [
    {
      name: 'Free',
      price: '0 ₽',
      period: 'навсегда',
      features: ['1 компания', '10 субъектов в реестре', '1 информационная система', '5 документов'],
      cta: 'Начать бесплатно',
      highlighted: false,
    },
    {
      name: 'Starter',
      price: '990 ₽',
      period: 'в месяц',
      features: ['3 компании', '50 субъектов', '3 ИС', 'Все документы', 'Проверка сайта'],
      cta: 'Попробовать',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '2 990 ₽',
      period: 'в месяц',
      features: ['10 компаний', '500 субъектов', '10 ИС', 'Запросы субъектов', 'Приоритетная поддержка'],
      cta: 'Выбрать Pro',
      highlighted: true,
    },
    {
      name: 'Business',
      price: '9 990 ₽',
      period: 'в месяц',
      features: ['Без ограничений', 'API доступ', 'White-label', 'Персональный менеджер'],
      cta: 'Связаться',
      highlighted: false,
    },
  ];

  const faqs = [
    {
      q: 'Нужно ли мне это, если у меня ИП?',
      a: 'Да. С 2022 года все ИП, обрабатывающие персональные данные (клиенты, сотрудники), обязаны соблюдать 152-ФЗ. Штрафы для ИП — до 20 000 ₽ за нарушение.',
    },
    {
      q: 'Как быстро я получу документы?',
      a: 'Мгновенно. После заполнения реестра вы можете скачать пакет документов (Политика, согласия, приказы) одним кликом.',
    },
    {
      q: 'Что делать, если придёт проверка РКН?',
      a: 'В ComplianceBox уже есть все документы, которые запрашивает Роскомнадзор. Вы просто скачиваете их и показываете инспектору.',
    },
    {
      q: 'Можно ли отменить подписку?',
      a: 'Да, в любой момент. Подписка продлевается автоматически, но вы можете отключить её в личном кабинете. Данные сохраняются 30 дней.',
    },
    {
      q: 'Безопасно ли хранить данные у вас?',
      a: 'Все данные шифруются при передаче (HTTPS) и хранении. Мы не передаём данные третьим лицам и соответствуем требованиям 152-ФЗ.',
    },
    {
      q: 'Есть ли бесплатный период для Pro-тарифа?',
      a: 'Да, 14 дней бесплатно. Если не подойдёт — отмените подписку до списания.',
    },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      color: '#FFFFFF',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }}>
      {/* Hero */}
      <section style={{
        padding: isMobile ? '2rem 1rem 3rem' : '4rem 2rem 5rem',
        textAlign: 'center',
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'rgba(255, 107, 53, 0.1)',
          border: '1px solid #FF6B35',
          borderRadius: '20px',
          marginBottom: '2rem',
          fontSize: '0.9rem',
          color: '#FF6B35',
          fontWeight: 600,
        }}>
          <IconShield size={16} />
          Защита от штрафов РКН до 500 000 ₽
        </div>

        <h1 style={{
          fontSize: isMobile ? '2rem' : '3.5rem',
          fontWeight: 700,
          lineHeight: 1.2,
          marginBottom: '1.5rem',
          letterSpacing: '-0.02em',
        }}>
          Соответствие 152-ФЗ<br />
          <span style={{ color: '#FF6B35' }}>без юристов и головной боли</span>
        </h1>

        <p style={{
          fontSize: isMobile ? '1.1rem' : '1.3rem',
          color: '#A0A0A0',
          marginBottom: '2.5rem',
          lineHeight: 1.5,
        }}>
          Автоматическая генерация документов, реестр субъектов ПДн,<br />
          проверка сайта и готовность к проверкам Роскомнадзора
        </p>

        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexDirection: isMobile ? 'column' : 'row',
          maxWidth: '500px',
          margin: '0 auto',
        }}>
          <button
            onClick={handleSignup}
            style={{
              flex: 1,
              padding: '1rem 2rem',
              background: '#FF6B35',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.3s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#E55A2B')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#FF6B35')}
          >
            Попробовать бесплатно
          </button>
          <button
            onClick={handleLogin}
            style={{
              flex: 1,
              padding: '1rem 2rem',
              background: 'transparent',
              color: '#FFFFFF',
              border: '1px solid #3A3A3A',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#FF6B35';
              e.currentTarget.style.color = '#FF6B35';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#3A3A3A';
              e.currentTarget.style.color = '#FFFFFF';
            }}
          >
            Войти
          </button>
        </div>
      </section>

      {/* Проблема */}
      <section style={{
        padding: isMobile ? '2rem 1rem' : '4rem 2rem',
        background: '#141414',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: isMobile ? '1.75rem' : '2.5rem',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '3rem',
          }}>
            Почему это важно
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '2rem',
          }}>
            {problems.map((p, i) => (
              <div
                key={i}
                style={{
                  padding: '2rem',
                  background: '#1A1A1A',
                  borderRadius: '12px',
                  border: '1px solid #2A2A2A',
                  textAlign: 'center',
                }}
              >
                <div style={{
                  fontSize: isMobile ? '2.5rem' : '3rem',
                  fontWeight: 700,
                  color: '#FF6B35',
                  marginBottom: '0.5rem',
                }}>
                  {p.num}
                </div>
                <p style={{
                  margin: 0,
                  color: '#A0A0A0',
                  fontSize: '1rem',
                  lineHeight: 1.5,
                }}>
                  {p.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Для кого */}
      <section style={{
        padding: isMobile ? '2rem 1rem' : '4rem 2rem',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: isMobile ? '1.75rem' : '2.5rem',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '3rem',
          }}>
            Для кого
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
            gap: '1.5rem',
          }}>
            {audiences.map((a, i) => (
              <div
                key={i}
                style={{
                  padding: '1.5rem',
                  background: '#1A1A1A',
                  borderRadius: '12px',
                  border: '1px solid #2A2A2A',
                  textAlign: 'center',
                }}
              >
                <h3 style={{
                  margin: '0 0 0.5rem',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: '#FFFFFF',
                }}>
                  {a.title}
                </h3>
                <p style={{
                  margin: 0,
                  color: '#A0A0A0',
                  fontSize: '0.9rem',
                }}>
                  {a.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Фичи */}
      <section style={{
        padding: isMobile ? '2rem 1rem' : '4rem 2rem',
        background: '#141414',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: isMobile ? '1.75rem' : '2.5rem',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '3rem',
          }}>
            Что внутри продукта
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '1.5rem',
          }}>
            {features.map((f, i) => (
              <div
                key={i}
                style={{
                  padding: '1.5rem',
                  background: '#1A1A1A',
                  borderRadius: '12px',
                  border: '1px solid #2A2A2A',
                }}
              >
                <h3 style={{
                  margin: '0 0 0.5rem',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: '#FF6B35',
                }}>
                  {f.title}
                </h3>
                <p style={{
                  margin: 0,
                  color: '#A0A0A0',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Как работает */}
      <section style={{
        padding: isMobile ? '2rem 1rem' : '4rem 2rem',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: isMobile ? '1.75rem' : '2.5rem',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '3rem',
          }}>
            Как работает
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
            gap: '1.5rem',
          }}>
            {steps.map((s, i) => (
              <div
                key={i}
                style={{
                  padding: '1.5rem',
                  background: '#1A1A1A',
                  borderRadius: '12px',
                  border: '1px solid #2A2A2A',
                  textAlign: 'center',
                }}
              >
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: '#FF6B35',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  margin: '0 auto 1rem',
                }}>
                  {s.num}
                </div>
                <h3 style={{
                  margin: '0 0 0.5rem',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: '#FFFFFF',
                }}>
                  {s.title}
                </h3>
                <p style={{
                  margin: 0,
                  color: '#A0A0A0',
                  fontSize: '0.9rem',
                }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Тарифы */}
      <section style={{
        padding: isMobile ? '2rem 1rem' : '4rem 2rem',
        background: '#141414',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: isMobile ? '1.75rem' : '2.5rem',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '3rem',
          }}>
            Тарифы
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
            gap: '1.5rem',
          }}>
            {plans.map((plan, i) => (
              <div
                key={i}
                style={{
                  padding: '2rem 1.5rem',
                  background: '#1A1A1A',
                  borderRadius: '12px',
                  border: plan.highlighted ? '2px solid #FF6B35' : '1px solid #2A2A2A',
                  position: 'relative',
                }}
              >
                {plan.highlighted && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#FF6B35',
                    color: '#FFFFFF',
                    padding: '0.25rem 1rem',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}>
                    Популярный
                  </div>
                )}
                <h3 style={{
                  margin: '0 0 0.5rem',
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  color: '#FFFFFF',
                }}>
                  {plan.name}
                </h3>
                <div style={{
                  marginBottom: '1.5rem',
                }}>
                  <span style={{
                    fontSize: '2rem',
                    fontWeight: 700,
                    color: '#FF6B35',
                  }}>
                    {plan.price}
                  </span>
                  <span style={{
                    fontSize: '0.9rem',
                    color: '#A0A0A0',
                    marginLeft: '0.5rem',
                  }}>
                    {plan.period}
                  </span>
                </div>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 2rem',
                }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{
                      padding: '0.5rem 0',
                      color: '#A0A0A0',
                      fontSize: '0.9rem',
                      borderBottom: j < plan.features.length - 1 ? '1px solid #2A2A2A' : 'none',
                    }}>
                      ✓ {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePricingClick(plan.name)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: plan.highlighted ? '#FF6B35' : 'transparent',
                    color: plan.highlighted ? '#FFFFFF' : '#FF6B35',
                    border: plan.highlighted ? 'none' : '1px solid #FF6B35',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                  onMouseEnter={(e) => {
                    if (!plan.highlighted) {
                      e.currentTarget.style.background = '#FF6B35';
                      e.currentTarget.style.color = '#FFFFFF';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!plan.highlighted) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#FF6B35';
                    }
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{
        padding: isMobile ? '2rem 1rem' : '4rem 2rem',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: isMobile ? '1.75rem' : '2.5rem',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '3rem',
          }}>
            Частые вопросы
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {faqs.map((faq, i) => (
              <div
                key={i}
                style={{
                  background: '#1A1A1A',
                  borderRadius: '12px',
                  border: '1px solid #2A2A2A',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%',
                    padding: '1.25rem 1.5rem',
                    background: 'transparent',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    fontWeight: 600,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  {faq.q}
                  <span style={{
                    fontSize: '1.5rem',
                    color: '#FF6B35',
                    transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)',
                    transition: 'transform 0.3s',
                  }}>
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div style={{
                    padding: '0 1.5rem 1.25rem',
                    color: '#A0A0A0',
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                  }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA-форма */}
      <section style={{
        padding: isMobile ? '2rem 1rem' : '4rem 2rem',
        background: '#141414',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontSize: isMobile ? '1.75rem' : '2rem',
            fontWeight: 700,
            marginBottom: '1rem',
          }}>
            Записаться на демо
          </h2>
          <p style={{
            color: '#A0A0A0',
            marginBottom: '2rem',
            fontSize: '1rem',
          }}>
            Покажем продукт за 15 минут и ответим на вопросы
          </p>
          <form onSubmit={handleDemoRequest} style={{
            display: 'flex',
            gap: '1rem',
            flexDirection: isMobile ? 'column' : 'row',
          }}>
            <input
              type="email"
              value={demoEmail}
              onChange={(e) => setDemoEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                flex: 1,
                padding: '1rem',
                background: '#0A0A0A',
                border: '1px solid #2A2A2A',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '1rem',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#FF6B35';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#2A2A2A';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              type="submit"
              disabled={demoLoading}
              style={{
                padding: '1rem 2rem',
                background: demoLoading ? '#4A4A4A' : '#FF6B35',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: demoLoading ? 'not-allowed' : 'pointer',
                transition: 'background 0.3s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!demoLoading) e.currentTarget.style.background = '#E55A2B';
              }}
              onMouseLeave={(e) => {
                if (!demoLoading) e.currentTarget.style.background = '#FF6B35';
              }}
            >
              {demoLoading ? 'Отправка...' : 'Записаться'}
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '2rem 1rem',
        textAlign: 'center',
        borderTop: '1px solid #2A2A2A',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
        }}>
          <IconShield size={20} strokeWidth={1.8} />
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
            Compliance<span style={{ color: '#FF6B35' }}>Box</span>
          </span>
        </div>
        <p style={{
          margin: 0,
          color: '#666666',
          fontSize: '0.85rem',
        }}>
          © 2026 ComplianceBox. Все права защищены.
        </p>
      </footer>
    </div>
  );
}