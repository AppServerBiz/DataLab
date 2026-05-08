import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [showUsername, setShowUsername] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if already logged in on mount
  useEffect(() => {
    const saved = localStorage.getItem('investhub_user');
    if (saved && saved.trim().toUpperCase() === 'MOJOROVA') {
      onLoginSuccess();
    }
  }, [onLoginSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const uName = username.trim();
    if (!uName) {
      setError('Informe seu usuário.');
      return;
    }
    
    setLoading(true);

    try {
      // Replicating only 1 admin user allowed: MOJOROVA (case-insensitive for safety, saved as uppercase)
      if (uName.toUpperCase() === 'MOJOROVA') {
        localStorage.setItem('investhub_user', 'MOJOROVA');
        onLoginSuccess();
      } else {
        setError('Usuário não encontrado. Verifique sua credencial.');
      }
    } catch {
      setError('Erro ao conectar ao servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-bg" />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="hub-name" style={{ fontSize: '2.6rem', fontFamily: 'var(--font-header)', fontWeight: 400, letterSpacing: '-0.5px' }}>NAUTILUS</div>
          <div className="hub-sub" style={{ fontSize: '0.85rem', letterSpacing: '4px', color: '#fff', fontWeight: 600, marginTop: '4px' }}>DATA_LAB</div>
        </div>

        <h2>Bem-vindo de volta</h2>
        <p>Acesse a plataforma com sua credencial de investidor</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="password-input-wrapper">
            <input
              type={showUsername ? "text" : "password"}
              className="login-input"
              placeholder="Nome de usuário"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              autoFocus
              autoComplete="username"
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowUsername(!showUsername)}
              aria-label={showUsername ? "Esconder usuário" : "Mostrar usuário"}
            >
              {showUsername ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>

        {error && <div className="login-error" style={{ marginTop: '0.75rem' }}>{error}</div>}

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Acesso exclusivo a investidores Nautilus
        </div>
      </div>
    </div>
  );
}
