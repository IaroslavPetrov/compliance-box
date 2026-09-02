"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '../hooks/useIsMobile';
import { IconShield } from '../components/icons';
import { useToast } from '../contexts/ToastContext';
import posthog from '../contexts/posthog';

export default function HomePage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isMobile = useIsMobile();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Очищаем пароль от случайных пробелов и символов
    const cleanPassword = password.trim();
    const cleanEmail = email.trim();

    if (cleanPassword.length > 72) {
      toast.error('Пароль слишком длинный (макс. 72 символа). Проверьте, не сработало ли автозаполнение.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const formData = new FormData();
        formData.append('username', cleanEmail);
        formData.append('password', cleanPassword);
        formData.append('grant_type', 'password');

        const res = await fetch('https://compliance-box-backend.onrender.com/api/v1/auth/login', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || 'Ошибка входа');
        }

        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        toast.success('Вход выполнен. Добро пожаловать!');
        posthog.identify(cleanEmail, { email: cleanEmail });
        posthog.capture('user_logged_in');
        router.push('/dashboard');
      } else {
        const res = await fetch('https://compliance-box-backend.onrender.com/api/v1/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: cleanEmail,
            password: cleanPassword,
            full_name: fullName.trim() || null,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || 'Ошибка регистрации');
        }

        // Автоматический вход после регистрации
        const formData = new FormData();
        formData.append('username', cleanEmail);
        formData.append('password', cleanPassword);
        formData.append('grant_type', 'password');

        const loginRes = await fetch('https://compliance-box-backend.onrender.com/api/v1/auth/login', {
          method: 'POST',
          body: formData,
        });

        if (!loginRes.ok) throw new Error('Ошибка входа после регистрации');

        const loginData = await loginRes.json();
        localStorage.setItem('token', loginData.access_token);
        toast.success('Аккаунт создан! Добро пожаловать в ComplianceBox.');
        posthog.identify(cleanEmail, { email: cleanEmail });
        posthog.capture('user_registered');
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Стили для инпутов с эффектом фокуса
  const inputStyle = {
    width: '100%',
    padding: '0.875rem',
    border: '1px solid #2A2A2A',
    borderRadius: '8px',
    fontSize: '1rem',
    background: '#0A0A0A',
    color: '#FFFFFF',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.3s, box-shadow 0.3s',
    outline: 'none',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0A0A0A',
      padding: isMobile ? '1rem' : '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }}>
      <div style={{
        background: '#1A1A1A',
        borderRadius: '16px',
        padding: isMobile ? '2rem 1.5rem' : '3rem',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        border: '1px solid #2A2A2A',
      }}>
        {/* Логотип и заголовок */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1rem',
            color: '#FF6B35',
          }}>
            <IconShield size={40} strokeWidth={1.5} />
          </div>
          <h1 style={{
            margin: 0,
            color: '#FFFFFF',
            fontSize: isMobile ? '2rem' : '2.5rem',
            fontWeight: '700',
            letterSpacing: '-0.02em',
          }}>
            Compliance<span style={{ color: '#FF6B35' }}>Box</span>
          </h1>
          <p style={{
            margin: '0.5rem 0 0',
            color: '#A0A0A0',
            fontSize: '1rem',
          }}>
            Генератор юридических документов
          </p>
        </div>

        {/* Переключатель Вход / Регистрация */}
        <div style={{
          display: 'flex',
          marginBottom: '2rem',
          background: '#0A0A0A',
          borderRadius: '8px',
          padding: '4px',
          border: '1px solid #2A2A2A',
        }}>
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: 'none',
              borderRadius: '6px',
              background: isLogin ? '#FF6B35' : 'transparent',
              color: isLogin ? '#FFFFFF' : '#A0A0A0',
              fontWeight: '600',
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: 'none',
              borderRadius: '6px',
              background: !isLogin ? '#FF6B35' : 'transparent',
              color: !isLogin ? '#FFFFFF' : '#A0A0A0',
              fontWeight: '600',
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#FFFFFF',
                fontWeight: '500',
                fontSize: '0.9rem',
              }}>
                ФИО (необязательно)
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="off"
                style={inputStyle}
                placeholder="Иванов Иван Иванович"
                onFocus={(e) => {
                  e.target.style.borderColor = '#FF6B35';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#2A2A2A';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#FFFFFF',
              fontWeight: '500',
              fontSize: '0.9rem',
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
              style={inputStyle}
              placeholder="you@example.com"
              onFocus={(e) => {
                e.target.style.borderColor = '#FF6B35';
                e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#2A2A2A';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#FFFFFF',
              fontWeight: '500',
              fontSize: '0.9rem',
            }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              maxLength={72}
              autoComplete="off"
              style={inputStyle}
              placeholder="••••••••"
              onFocus={(e) => {
                e.target.style.borderColor = '#FF6B35';
                e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#2A2A2A';
                e.target.style.boxShadow = 'none';
              }}
            />
            <small style={{ color: '#666666', fontSize: '0.8rem', marginTop: '6px', display: 'block' }}>
              Введите вручную, без пробелов. Макс. 72 символа.
            </small>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              background: loading ? '#4A4A4A' : '#FF6B35',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.3s, transform 0.1s',
              letterSpacing: '0.02em',
            }}
            onMouseDown={(e) => {
              if (!loading) e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        {/* Футер */}
        <p style={{
          textAlign: 'center',
          color: '#4A4A4A',
          fontSize: '0.8rem',
          marginTop: '2rem',
          marginBottom: 0,
        }}>
          © 2026 ComplianceBox. Все права защищены.
        </p>
      </div>
    </div>
  );
}