import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ShieldAlert, ShieldCheck, Terminal, Compass, Cpu, Globe } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

interface SecurityDetails {
  ip: string;
  country: string;
  city: string;
  region: string;
  isp: string;
  userAgent: string;
  screenRes: string;
  os: string;
  browser: string;
  gpu?: string;
  cores: number;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [showUsername, setShowUsername] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [secData, setSecData] = useState<SecurityDetails | null>(null);

  // Check if already logged in on mount
  useEffect(() => {
    const saved = localStorage.getItem('investhub_user');
    if (saved && saved.trim().toUpperCase() === 'MOJOROVA') {
      onLoginSuccess();
    }
  }, [onLoginSuccess]);

  // Retrieve user metadata and IP geolocation for deterrence log
  useEffect(() => {
    // Determine OS
    const ua = navigator.userAgent;
    let os = "Desconhecido";
    if (ua.indexOf("Win") !== -1) os = "Windows OS";
    else if (ua.indexOf("Mac") !== -1) os = "macOS";
    else if (ua.indexOf("X11") !== -1) os = "UNIX";
    else if (ua.indexOf("Linux") !== -1) os = "Linux OS";

    // Determine Browser
    let browser = "Navegador Desconhecido";
    if (ua.indexOf("Firefox") !== -1) browser = "Mozilla Firefox";
    else if (ua.indexOf("Chrome") !== -1) browser = "Google Chrome";
    else if (ua.indexOf("Safari") !== -1) browser = "Apple Safari";
    else if (ua.indexOf("Edge") !== -1) browser = "Microsoft Edge";

    // Detect GPU if possible
    let gpuName = "Não detectada";
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuName = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch {}

    const initialSecData: SecurityDetails = {
      ip: 'Detectando...',
      country: 'Detectando...',
      city: 'Detectando...',
      region: 'Detectando...',
      isp: 'Detectando...',
      userAgent: ua,
      screenRes: `${window.screen.width}x${window.screen.height} px (dpi: ${window.devicePixelRatio})`,
      os: os,
      browser: browser,
      gpu: gpuName,
      cores: navigator.hardwareConcurrency || 4
    };

    setSecData(initialSecData);

    // Fetch IP and Geo from public API
    fetch('https://ip-api.com/json/')
      .then(res => res.json())
      .then(data => {
        if (data && data.status === 'success') {
          setSecData(prev => prev ? {
            ...prev,
            ip: data.query,
            country: `${data.country} (${data.countryCode})`,
            city: data.city,
            region: data.regionName,
            isp: data.isp
          } : null);
        } else {
          setSecData(prev => prev ? {
            ...prev,
            ip: '127.0.0.1 (Local/Proxy)',
            country: 'Intranet',
            city: 'Proxy Ativo',
            region: 'Indisponível',
            isp: 'Gateway de Segurança'
          } : null);
        }
      })
      .catch(() => {
        setSecData(prev => prev ? {
          ...prev,
          ip: 'Não foi possível ler (Bloqueador/VPN ativo)',
          country: 'Protegido / Mascarado',
          city: 'Ocultado',
          region: 'Ocultado',
          isp: 'Criptografado'
        } : null);
      });
  }, []);

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
    <div className="login-overlay" style={{ flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', padding: '2rem 1rem' }}>
      <div className="login-bg" />

      <div className="login-card" style={{ marginBottom: 0 }}>
        {/* Logo */}
        <div className="login-logo">
          <div className="hub-name" style={{ fontSize: '2.6rem', fontFamily: 'var(--font-header)', fontWeight: 400, letterSpacing: '-0.5px' }}>NAUTILUS</div>
          <div className="hub-sub" style={{ fontSize: '0.85rem', letterSpacing: '4px', color: '#fff', fontWeight: 600, marginTop: '4px' }}>DATA_LAB</div>
        </div>

        <h2>Bem-vindo de volta</h2>
        <p>Acesse a plataforma com sua credencial.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="password-input-wrapper">
            <input
              type={showUsername ? "text" : "password"}
              className="login-input"
              placeholder="***************"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              autoFocus
              autoComplete="username"
              style={{ letterSpacing: showUsername ? 'normal' : '0.25em' }}
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
          Acesso exclusivo a Nautilus Investing.
        </div>
      </div>

      {/* Cyber Coercion and Security Log Area */}
      {secData && (
        <div className="security-coercion-box" style={{
          width: '100%',
          maxWidth: '420px',
          background: 'rgba(10, 14, 20, 0.9)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
          fontFamily: 'var(--font-main)',
          fontSize: '0.75rem',
          color: '#e2e8f0',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle glowing danger bar */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, #ef4444 0%, #f97316 50%, #ef4444 100%)',
            boxShadow: '0 1px 8px rgba(239, 68, 68, 0.5)'
          }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <ShieldAlert size={14} /> SISTEMA DE MONITORAMENTO ATIVO
            </span>
            <span style={{ fontSize: '0.65rem', color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
              SEC-ID: #{Math.floor(100000 + Math.random() * 900000)}
            </span>
          </div>

          {/* Alert Message for Hacker Deterrent */}
          <div style={{ color: '#fca5a5', background: 'rgba(239, 68, 68, 0.08)', padding: '0.65rem', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.15)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
            <strong style={{ color: '#ef4444' }}>ATENÇÃO:</strong> Tentativas de acesso não autorizado, força bruta ou varredura de portas serão registradas e reportadas imediatamente às autoridades competentes de segurança cibernética. Seus metadados de conexão estão sendo gravados em tempo real.
          </div>

          {/* Live Data Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.4rem', color: '#94a3b8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '4px 6px', borderRadius: '4px' }}>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><Globe size={11} /> Endereço IP:</span>
              <strong style={{ color: '#38bdf8' }}>{secData.ip}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '4px 6px', borderRadius: '4px' }}>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><Terminal size={11} /> Geolocalização:</span>
              <span style={{ color: '#cbd5e1', textAlign: 'right' }}>
                {secData.city && secData.city !== 'Detectando...' ? `${secData.city}, ${secData.region} - ${secData.country}` : secData.country}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '4px 6px', borderRadius: '4px' }}>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><Compass size={11} /> Provedor (ISP):</span>
              <span style={{ color: '#cbd5e1', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '240px' }} title={secData.isp}>
                {secData.isp}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '4px 6px', borderRadius: '4px' }}>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><Cpu size={11} /> Sistema / Hardware:</span>
              <span style={{ color: '#cbd5e1' }}>
                {secData.os} ({secData.cores} Cores)
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '4px 6px', borderRadius: '4px' }}>
              <span style={{ color: '#64748b' }}>Navegador / Resolução:</span>
              <span style={{ color: '#cbd5e1' }}>
                {secData.browser} @ {secData.screenRes.split(' ')[0]}
              </span>
            </div>

            {secData.gpu && secData.gpu !== 'Não detectada' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '4px 6px', borderRadius: '4px', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                <span style={{ color: '#64748b' }}>GPU / Vídeo:</span>
                <span style={{ color: '#a7f3d0', fontSize: '0.65rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '240px' }} title={secData.gpu}>
                  {secData.gpu.replace("ANGLE (", "").replace(" Direct3D11 vs_5_0 ps_5_0)", "")}
                </span>
              </div>
            )}
          </div>

          {/* Footer of card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.65rem', color: '#4ade80' }}>
            <ShieldCheck size={12} /> Assinatura Digital TLS_AES_256_GCM ativada para este terminal.
          </div>
        </div>
      )}
    </div>
  );
}

