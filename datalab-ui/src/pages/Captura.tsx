import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, CheckCircle, Loader, GitMerge } from 'lucide-react';
import { uploadFiles, uploadMergeFiles } from '../api';
import { useNavigate } from 'react-router-dom';

const Captura = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergeFileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await uploadFiles(files);
      setResult(data);
      setTimeout(() => navigate('/comparativo'), 1500);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Erro no upload. Verifique se a API está rodando!');
    } finally {
      setLoading(false);
    }
  };

  const processMergeFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await uploadMergeFiles(files);
      setResult(data);
      setTimeout(() => navigate('/comparativo'), 1500);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message || 'Erro ao realizar o merge dos arquivos.';
      alert(`⚠️ Falha no Merge:\n\n${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  };

  const handleMergeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processMergeFiles(Array.from(e.target.files));
      e.target.value = '';
    }
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
          <div>
            <h2 className="card-title" style={{ marginBottom: '0.2rem' }}>Importar Relatórios MT5</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
              Envie arquivos <code style={{ background: '#1E232F', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent-blue)' }}>.html</code> e <code style={{ background: '#1E232F', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent-blue)' }}>.csv</code> individuais ou faça o merge de séries temporais sequenciais.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button 
              className="btn" 
              style={{ 
                background: 'linear-gradient(135deg, rgba(147,51,234,0.15), rgba(79,70,229,0.15))', 
                color: '#A855F7', 
                border: '1px solid rgba(168,85,247,0.3)', 
                fontSize: '0.75rem',
                fontWeight: '600'
              }} 
              onClick={(e) => {
                e.stopPropagation();
                mergeFileInputRef.current?.click();
              }} 
              disabled={loading}
              title="Selecione múltiplos arquivos CSV (ex: partes A, B, C, D) para unir cronologicamente em um único robô contínuo"
            >
               {loading ? 'Processando...' : <><GitMerge size={14} /> Arquivos Merge</>}
            </button>
            <button 
              className="btn btn-success" 
              style={{ fontSize: '0.75rem' }} 
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }} 
              disabled={loading}
            >
               {loading ? 'Processando...' : <><UploadCloud size={14} /> Selecionar Arquivos</>}
            </button>
          </div>
        </div>

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
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".html,.htm,.csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={loading}
        />
        <input
          ref={mergeFileInputRef}
          type="file"
          multiple
          accept=".csv,.html,.htm"
          onChange={handleMergeFileChange}
          style={{ display: 'none' }}
          disabled={loading}
        />
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
