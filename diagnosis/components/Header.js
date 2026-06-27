import React, { useState } from 'react';

export default function Header({ 
  title, 
  subtitle, 
  email, 
  setEmail, 
  password,
  setPassword,
  emailStatus, 
  credits, 
  isCheckingEmail, 
  onVerifyEmail, 
  onLogout,
  themeMode = 'light',
  onToggleTheme
}) {
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <>
      <header className="site-header">
        <div className="header-container">
          <div className="logo-section">
            <img src="/fde-logo-mark.png" alt="FDE FAN Diagnosis Logo" className="logo-img" />
            <div>
              <h1 className="logo-title">{title}</h1>
              {subtitle && <span className="logo-tagline">{subtitle}</span>}
            </div>
          </div>

          <div className="user-section">
            <button
              type="button"
              className="mobile-menu-trigger"
              onClick={() => setShowMobileMenu(prev => !prev)}
              aria-expanded={showMobileMenu}
              aria-label="打开账号菜单"
            >
              {emailStatus === 'verified' ? '账号' : '登录'}
            </button>

            <div className={`header-actions ${showMobileMenu ? 'mobile-open' : ''}`}>
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="theme-toggle-btn"
                aria-label="切换亮色或暗色模式"
              >
                {themeMode === 'light' ? '🌙 暗色' : '☀️ 亮色'}
              </button>
            )}
            {emailStatus === 'verified' ? (
              <div className="user-stack">
                <div className="user-badge">
                  <span className="user-email">✉️ {email}</span>
                  <span className="user-credits">💎 诊断额度: <strong>{credits}</strong></span>
                  <button onClick={() => setShowRechargeModal(true)} className="btn-recharge">⚡ 咨询服务</button>
                  <button onClick={() => { setShowMobileMenu(false); onLogout(); }} className="btn-logout">退出</button>
                </div>
              </div>
            ) : (
              <div className="login-stack">
                <div className="login-form">
                  <input
                    type="email"
                    placeholder="账号 (邮箱)..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="login-input email-input"
                  />
                  <input
                    type="password"
                    placeholder="密码..."
                    value={password || ''}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input password-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onVerifyEmail(email, password);
                    }}
                  />
                  <button
                    onClick={() => onVerifyEmail(email, password)}
                    disabled={isCheckingEmail || !email || !password}
                    className="btn-login"
                  >
                    {isCheckingEmail ? '登录中...' : '登录 / 注册'}
                  </button>
                </div>
                <div className="auth-helper">首次使用会自动注册；当前不发送邮箱验证码，请使用真实邮箱并保存密码。</div>
              </div>
            )}
            </div>
          </div>
        </div>
      </header>

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(11, 17, 32, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.25s ease-out'
        }} onClick={() => setShowRechargeModal(false)}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(20, 30, 55, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
            border: '1px solid rgba(45, 212, 191, 0.3)',
            borderRadius: '24px',
            padding: '36px 32px',
            maxWidth: '380px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 50px rgba(45, 212, 191, 0.15)',
            position: 'relative',
            animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }} onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setShowRechargeModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: '1rem',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(239, 68, 68, 0.8)';
                e.target.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.color = 'var(--color-text-muted)';
              }}
            >✕</button>
            
            <div style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.2) 0%, rgba(14, 165, 233, 0.2) 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: '1px solid rgba(45, 212, 191, 0.4)'
            }}>
              <span style={{ fontSize: '2rem' }}>💎</span>
            </div>

            <h3 style={{ 
              fontFamily: 'var(--font-title)', 
              fontSize: '1.4rem', 
              color: '#fff',
              margin: '0 0 12px 0',
              fontWeight: '700',
              letterSpacing: '0.02em'
            }}>FDE FAN 咨询服务</h3>
            
            <p style={{ 
              color: 'var(--color-text-muted)', 
              fontSize: '0.9rem', 
              lineHeight: '1.6',
              margin: '0 0 24px 0' 
            }}>请联系课程顾问，了解企业 AI 转型诊断、FDE 培训和项目交付支持。</p>

            <div style={{
              background: '#fff',
              padding: '16px',
              borderRadius: '16px',
              display: 'inline-block',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}>
              <img src="/wechat-share.jpg" alt="FDE FAN 咨询入口" style={{
                width: '180px',
                height: '180px',
                display: 'block',
                borderRadius: '8px'
              }} />
            </div>
            
            <div style={{ 
              marginTop: '20px', 
              fontSize: '0.8rem', 
              color: 'rgba(148, 163, 184, 0.6)',
              fontWeight: '500'
            }}>微信号: UA5201314fyh</div>
          </div>
        </div>
      )}

      <style jsx global>{`
        :root {
          --color-bg-main: #0b1120;
          --color-bg-card: rgba(30, 41, 59, 0.7);
          --color-bg-card-hover: rgba(30, 41, 59, 0.95);
          --color-primary: #0d9488;
          --color-primary-hover: #0f766e;
          --color-accent: #f59e0b;
          --color-accent-hover: #d97706;
          --color-text-main: #f8fafc;
          --color-text-muted: #94a3b8;
          --color-border: rgba(255, 255, 255, 0.08);
          --font-title: 'Outfit', 'Inter', -apple-system, sans-serif;
          --font-body: 'Inter', -apple-system, sans-serif;
        }

        body {
          margin: 0;
          padding: 0;
          background-color: var(--color-bg-main);
          color: var(--color-text-main);
          font-family: var(--font-body);
          -webkit-font-smoothing: antialiased;
          background-image: 
            radial-gradient(at 0% 0%, rgba(13, 148, 136, 0.1) 0, transparent 50%),
            radial-gradient(at 50% 0%, rgba(245, 158, 11, 0.05) 0, transparent 50%),
            radial-gradient(at 100% 100%, rgba(13, 148, 136, 0.08) 0, transparent 50%);
          background-attachment: fixed;
        }

        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
      `}</style>
      <style jsx>{`
        /* Header Styling */
        .site-header {
          background-color: var(--color-bg-card);
          border-bottom: 1px solid var(--color-border);
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .header-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .logo-img {
          width: 36px;
          height: 36px;
          border-radius: 8px;
        }

        .logo-title {
          font-family: var(--font-title);
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
          color: #f8fafc;
          letter-spacing: -0.02em;
        }

        .logo-tagline {
          font-size: 0.75rem;
          color: var(--color-accent);
          font-weight: 500;
          display: block;
        }

	        /* User Authentication Styling */
	        .user-section {
	          display: flex;
	          align-items: center;
	          gap: 0.75rem;
	          min-width: 0;
	          position: relative;
	        }

	        .header-actions {
	          display: flex;
	          align-items: center;
	          gap: 0.75rem;
	          min-width: 0;
	        }

	        .mobile-menu-trigger {
	          display: none;
	          border: 1px solid var(--color-border);
	          background: rgba(255, 255, 255, 0.08);
	          color: var(--color-text-main);
	          border-radius: 999px;
	          padding: 0.5rem 0.85rem;
	          font-size: 0.82rem;
	          font-weight: 800;
	          cursor: pointer;
	          white-space: nowrap;
	        }

	        .theme-toggle-btn {
	          border: 1px solid var(--color-border);
	          background: rgba(255, 255, 255, 0.06);
	          color: var(--color-text-main);
	          border-radius: 999px;
	          padding: 0.45rem 0.75rem;
	          font-size: 0.78rem;
	          font-weight: 700;
	          cursor: pointer;
	          white-space: nowrap;
	        }

	        .login-stack,
	        .user-stack {
	          display: flex;
	          flex-direction: column;
	          align-items: flex-end;
	          gap: 0.35rem;
	          min-width: 0;
	        }

	        .auth-helper {
	          color: var(--color-text-muted);
	          font-size: 0.68rem;
	          line-height: 1.35;
	          text-align: right;
	          max-width: 520px;
	        }

	        .auth-helper.success {
	          color: #10b981;
	        }

	        .theme-light .site-header {
	          background-color: rgba(255, 255, 255, 0.86);
	          border-bottom-color: rgba(15, 23, 42, 0.08);
	          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
	        }

	        .theme-light .theme-toggle-btn,
	        .theme-light .mobile-menu-trigger,
	        .theme-light .user-badge {
	          background: #ffffff;
	          color: #0f172a;
	          border-color: rgba(15, 23, 42, 0.12);
	          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
	        }

	        .theme-light .logo-title,
	        .theme-light .user-email {
	          color: #0f172a;
	        }

	        .theme-light .logo-tagline {
	          color: #0f766e;
	        }

	        .theme-light .login-input {
	          background-color: #ffffff;
	          border-color: rgba(15, 23, 42, 0.12);
	          color: #0f172a;
	        }

	        .theme-light .login-input::placeholder {
	          color: #94a3b8;
	        }

	        .theme-light .user-credits,
	        .theme-light .btn-logout {
	          color: #64748b;
	        }

	        .theme-light .auth-helper.success {
	          color: #047857;
	        }

	        .theme-light .btn-logout:hover {
	          color: #0f172a;
	        }

	        .theme-light .btn-recharge {
	          background: #fff7ed;
	          color: #c2410c;
	          border-color: rgba(251, 146, 60, 0.35);
	        }

	        .login-form {
	          display: flex;
	          gap: 0.75rem;
	        }

        .login-input {
          background-color: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 0.5rem 0.85rem;
          color: var(--color-text-main);
          font-size: 0.85rem;
          width: 220px;
          transition: all 0.3s ease;
        }

        .login-input:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .btn-login {
          background-color: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-login:hover:not(:disabled) {
          background-color: var(--color-primary-hover);
        }

        .btn-login:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .user-badge {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          background-color: rgba(15, 23, 42, 0.4);
          padding: 0.4rem 1.25rem;
          border-radius: 50px;
          border: 1px solid var(--color-border);
        }

        .user-email {
          font-size: 0.85rem;
          color: var(--color-text-main);
        }

        .user-credits {
          font-size: 0.85rem;
          color: var(--color-text-muted);
        }

        .user-credits strong {
          color: var(--color-accent);
          font-weight: 700;
        }

        .btn-recharge {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.05) 100%);
          border: 1px solid rgba(245, 158, 11, 0.4);
          color: var(--color-accent);
          border-radius: 6px;
          padding: 0.25rem 0.65rem;
          font-weight: 700;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-recharge:hover {
          background-color: rgba(245, 158, 11, 0.15);
          transform: translateY(-1px);
        }

        .btn-logout {
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          font-size: 0.85rem;
          padding: 0.25rem 0.5rem;
          transition: color 0.2s ease;
        }

	        .btn-logout:hover {
	          color: #f1f5f9;
	        }

	        @media (max-width: 920px) {
	          .header-container {
	            align-items: center;
	            flex-direction: row;
	            gap: 0.75rem;
	            padding: 0.85rem 1rem;
	          }

	          .logo-section {
	            min-width: 0;
	            flex: 1;
	            gap: 0.65rem;
	          }

	          .logo-img {
	            width: 32px;
	            height: 32px;
	          }

	          .logo-section > div {
	            min-width: 0;
	          }

	          .logo-title,
	          .logo-tagline {
	            overflow: hidden;
	            text-overflow: ellipsis;
	            white-space: nowrap;
	          }

	          .user-section {
	            margin-left: auto;
	            flex-shrink: 0;
	          }

	          .mobile-menu-trigger {
	            display: inline-flex;
	            align-items: center;
	            justify-content: center;
	          }

	          .header-actions {
	            display: none;
	            position: absolute;
	            right: 0;
	            top: calc(100% + 0.65rem);
	            width: min(86vw, 340px);
	            z-index: 80;
	            background: rgba(15, 23, 42, 0.96);
	            border: 1px solid var(--color-border);
	            border-radius: 16px;
	            padding: 0.85rem;
	            box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28);
	            backdrop-filter: blur(16px);
	            -webkit-backdrop-filter: blur(16px);
	            flex-direction: column;
	            align-items: stretch;
	            gap: 0.7rem;
	          }

	          .header-actions.mobile-open {
	            display: flex;
	          }

	          .theme-light .header-actions {
	            background: rgba(255, 255, 255, 0.98);
	            border-color: rgba(15, 23, 42, 0.08);
	            box-shadow: 0 18px 42px rgba(15, 23, 42, 0.14);
	          }

	          .theme-toggle-btn,
	          .login-stack,
	          .user-stack,
	          .login-form,
	          .user-badge {
	            width: 100%;
	            align-items: stretch;
	          }

	          .theme-toggle-btn {
	            text-align: center;
	          }

	          .login-form,
	          .user-badge {
	            flex-direction: column;
	            border-radius: 14px;
	            gap: 0.6rem;
	          }

	          .login-input,
	          .btn-login,
	          .btn-recharge,
	          .btn-logout {
	            width: 100%;
	            box-sizing: border-box;
	            min-height: 40px;
	          }

	          .auth-helper {
	            text-align: left;
	            max-width: none;
	          }
	        }

	        @media (max-width: 560px) {
	          .logo-title {
	            font-size: 1.05rem;
	          }

	          .logo-tagline {
	            font-size: 0.68rem;
	          }

	          .header-container {
	            padding: 0.7rem 0.85rem;
	          }

	          .header-actions {
	            width: min(90vw, 330px);
	          }

	          .user-email,
	          .user-credits {
	            font-size: 0.78rem;
	            overflow-wrap: anywhere;
	          }
	        }
	      `}</style>
    </>
  );
}
