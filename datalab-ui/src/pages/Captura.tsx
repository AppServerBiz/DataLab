import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, CheckCircle, Loader } from 'lucide-react';
import { uploadFiles } from '../api';
import { useNavigate } from 'react-router-dom';

const Captura = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await uploadFiles(files);
      setResult(data);
      setTimeout(() => navigate('/comparativo'), 1500);
    } catch (err) {
      console.error(err);
      alert('Erro no upload. Verifique se a API está rodando!');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.csv')
    );
    processFiles(files);
  }, []);

  return (
    <div>
      <h1 className="section-title">Captura de Dados</h1>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="card-title">Importar Relatórios MT5</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.7' }}>
          Faça upload dos arquivos <code style={{ background: '#1E232F', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent-blue)' }}>.html</code> e/ou <code style={{ background: '#1E232F', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent-blue)' }}>.csv</code> exportados pelo MetaTrader 5.
          O sistema fará o <strong style={{ color: '#fff' }}>merge automático</strong> pelo nome do arquivo — envie ambos com o mesmo nome para análise completa.
        </p>

        <div
          className={`file-drop-area ${dragOver ? 'dragover' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !loading && fileInputRef.current?.click()}
        >
          {loading ? (
            <>
              <Loader size={48} className="text-blue" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem', display: 'block' }} />
              <p style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>Processando arquivos...</p>
            </>
          ) : result ? (
            <>
              <CheckCircle size={48} style={{ color: 'var(--accent-green)', margin: '0 auto 1rem', display: 'block' }} />
              <p style={{ color: 'var(--accent-green)', fontWeight: '600' }}>
                {result.processed?.length} robô(s) processado(s)! Redirecionando...
              </p>
            </>
          ) : (
            <>
              <UploadCloud size={48} className="file-drop-icon" style={{ margin: '0 auto 1rem', display: 'block' }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Arraste os arquivos aqui ou clique para selecionar
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Aceita múltiplos arquivos .html e .csv simultaneamente
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".html,.htm,.csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            disabled={loading}
          />
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">📌 Como funciona o Merge HTML + CSV</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '6px', borderLeft: '3px solid var(--accent-blue)' }}>
            <h3 style={{ color: 'var(--accent-blue)', margin: '0 0 0.5rem', fontSize: '0.9rem' }}>📄 Arquivo .html</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, lineHeight: '1.6' }}>
              Contém <strong style={{ color: '#fff' }}>todas as métricas de elite</strong>: Lucro Líquido, Profit Factor, Sharpe, Trades, etc. + Configurações e Parâmetros do robô.
            </p>
          </div>
          <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '6px', borderLeft: '3px solid var(--accent-green)' }}>
            <h3 style={{ color: 'var(--accent-green)', margin: '0 0 0.5rem', fontSize: '0.9rem' }}>📊 Arquivo .csv</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, lineHeight: '1.6' }}>
              Contém o <strong style={{ color: '#fff' }}>histórico tick-a-tick</strong> de Balanço e Equity para o <strong style={{ color: 'var(--accent-red)' }}>gráfico de Drawdown</strong> de alta resolução.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Captura;
