import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  isDanger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  isDanger = true
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div style={{
        background: '#13171F',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '420px',
        padding: '1.8rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
          {isDanger ? (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', padding: '0.6rem', borderRadius: '50%', display: 'flex' }}>
              <AlertTriangle size={20} />
            </div>
          ) : (
            <div style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-blue)', padding: '0.6rem', borderRadius: '50%', display: 'flex' }}>
              <Trash2 size={20} />
            </div>
          )}
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: '700' }}>{title}</h2>
        </div>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 0 2rem' }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end' }}>
          <button 
            className="btn" 
            style={{ 
              background: 'transparent', 
              color: 'var(--text-muted)',
              border: '1px solid rgba(255,255,255,0.05)'
            }} 
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button 
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`} 
            style={{ 
              padding: '0.75rem 1.5rem',
              ...(isDanger ? {} : { color: '#000' })
            }}
            onClick={onConfirm}
          >
            {isDanger && <Trash2 size={14} style={{ marginRight: '0.4rem' }} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
