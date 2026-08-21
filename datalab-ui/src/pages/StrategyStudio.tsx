import React, { useState, useRef, useEffect } from 'react';
import { 
  Cpu, 
  UploadCloud, 
  FileCode, 
  FileText, 
  BookOpen, 
  Send, 
  ShieldCheck, 
  RefreshCw, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  Zap, 
  HelpCircle, 
  Code2, 
  Sliders, 
  Layers, 
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { analyzeStrategyFiles, chatStrategyLab } from '../api';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const StrategyStudio: React.FC = () => {
  const [robotName, setRobotName] = useState('');
  const [userRational, setUserRational] = useState('');
  const [isCPower, setIsCPower] = useState(true);
  const [docText, setDocText] = useState('https://communitypowerea.com/docs/');
  const [setFileName, setSetFileName] = useState<string | null>(null);
  const [setContent, setSetContent] = useState<string>('');
  const [htmlFileName, setHtmlFileName] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [mqlFileName, setMqlFileName] = useState<string | null>(null);
  const [mqlContent, setMqlContent] = useState<string>('');

  const [analyzing, setAnalyzing] = useState(false);
  const [strategyContext, setStrategyContext] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Read file helper with UTF-16LE / UTF-8 auto detection
  const readFileText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const buffer = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);
        // Check for UTF-16LE BOM or zero bytes pattern
        const isUtf16Le = (bytes[0] === 0xFF && bytes[1] === 0xFE) || (bytes.length > 20 && bytes[1] === 0x00 && bytes[3] === 0x00);
        const decoder = new TextDecoder(isUtf16Le ? 'utf-16le' : 'utf-8');
        resolve(decoder.decode(buffer));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleSetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileText(file);
      setSetFileName(file.name);
      setSetContent(text);
      if (!robotName) setRobotName(file.name.replace(/\.[^/.]+$/, ""));
    } catch (err) {
      console.error('Erro ao ler arquivo .set:', err);
    }
  };

  const handleHtmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileText(file);
      setHtmlFileName(file.name);
      setHtmlContent(text);
    } catch (err) {
      console.error('Erro ao ler arquivo HTML:', err);
    }
  };

  const handleMqlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileText(file);
      setMqlFileName(file.name);
      setMqlContent(text);
    } catch (err) {
      console.error('Erro ao ler arquivo MQL:', err);
    }
  };

  const handleCPowerToggle = (checked: boolean) => {
    setIsCPower(checked);
    if (checked && !docText) {
      setDocText('https://communitypowerea.com/docs/');
    }
  };

  const handleAnalyze = async () => {
    if (!setContent && !htmlContent && !mqlContent && !userRational) {
      alert('Por favor, faça upload de pelo menos um arquivo (.set, .html ou .mq5) ou descreva a estratégia.');
      return;
    }

    setAnalyzing(true);
    try {
      const documentationEffective = isCPower 
        ? `${docText || 'https://communitypowerea.com/docs/'}\n(Motor Base: EA CommunityPower 3.01 - Lógica de Grid, Martingale Fibonacci, Filtros de Média, Horários e Fechamento Parcial)`
        : docText;

      const res = await analyzeStrategyFiles({
        robotName: robotName || 'Nova Estratégia',
        setContent,
        htmlContent,
        mqlCode: mqlContent,
        docText: documentationEffective,
        userRational
      });

      setStrategyContext(res.context);
      setParsedData(res);

      // Trigger first automated comprehensive analysis from AI
      setLoadingChat(true);
      const initialUserMsg: Message = {
        role: 'user',
        parts: [{ text: `Analise detalhadamente esta estratégia. Apresente:\n1. Raio-X Técnico da Estratégia (Ativo, Timeframe, Direção, Gatilhos, Gestão de Stop/TP e Grid/Lotes);\n2. Racional Operacional Completo (Tese de mercado por trás do robô);\n3. Pontos Cegos e Riscos de Drawdown;\n4. Validação/Correção (Perguntas para confirmar se compreendeu tudo perfeitamente antes de gerar blueprints).` }]
      };

      const chatRes = await chatStrategyLab([initialUserMsg], res.context);
      setMessages([
        initialUserMsg,
        { role: 'model', parts: [{ text: chatRes.text }] }
      ]);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao analisar estratégia: ' + (err.response?.data?.error || err.message));
    } finally {
      setAnalyzing(false);
      setLoadingChat(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || !strategyContext || loadingChat) return;

    const userMsg: Message = { role: 'user', parts: [{ text: query }] };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!textToSend) setInput('');
    setLoadingChat(true);

    try {
      const response = await chatStrategyLab(newMessages, strategyContext);
      setMessages([...newMessages, { role: 'model', parts: [{ text: response.text }] }]);
    } catch (err: any) {
      console.error(err);
      setMessages([...newMessages, { 
        role: 'model', 
        parts: [{ text: `❌ Erro ao processar: ${err.response?.data?.error || err.message}` }] 
      }]);
    } finally {
      setLoadingChat(false);
    }
  };

  const copyMarkdown = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const downloadMarkdown = (text: string) => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${robotName || 'Estrategia_Quant'}_Blueprint.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    if (confirm('Deseja limpar todo o espaço de trabalho da estratégia?')) {
      setRobotName('');
      setUserRational('');
      setIsCPower(true);
      setDocText('https://communitypowerea.com/docs/');
      setSetFileName(null);
      setSetContent('');
      setHtmlFileName(null);
      setHtmlContent('');
      setMqlFileName(null);
      setMqlContent('');
      setStrategyContext(null);
      setParsedData(null);
      setMessages([]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', gap: '0.8rem' }}>
      {/* Header */}
      <div className="flex-between">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Cpu size={22} style={{ color: 'var(--accent-blue)' }} />
            <h1 className="section-title" style={{ margin: 0, fontSize: '1.4rem' }}>Strategy AI Studio</h1>
            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: '0.7rem' }}>
              Quant Copilot & Reverse-Engineering
            </span>
          </div>
        </div>
        {messages.length > 0 && (
          <button className="btn btn-danger" onClick={clearAll} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
            <Trash2 size={13} /> Novo Estudo
          </button>
        )}
      </div>

      {/* Main Grid - Optimized Left Column (300px) giving maximum space to Chat */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Panel: Compact Strategy Ingestion Hub */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem' }}>
            <Sliders size={15} style={{ color: 'var(--accent-blue)' }} />
            <h2 style={{ fontSize: '0.88rem', fontWeight: 600, margin: 0 }}>Dossiê da Estratégia</h2>
          </div>

          {/* Robot Name */}
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Identificador do Robô
            </label>
            <input 
              type="text"
              className="input-field" 
              placeholder="Ex: Obi-wan Kenobi Nasdaq H1" 
              value={robotName}
              onChange={e => setRobotName(e.target.value)}
              style={{ width: '100%', fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}
            />
          </div>

          {/* Upload Files Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Arquivos de Entrada
            </label>

            {/* .SET File Upload */}
            <div style={{ 
              border: '1px dashed rgba(255,255,255,0.15)', 
              borderRadius: '6px', 
              padding: '0.45rem 0.6rem', 
              background: setFileName ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                <FileCode size={14} style={{ color: setFileName ? 'var(--accent-green)' : 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                  {setFileName || '.SET (Parâmetros)'}
                </span>
              </div>
              <label className="btn btn-secondary" style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', cursor: 'pointer' }}>
                {setFileName ? 'Trocar' : 'Subir'}
                <input type="file" accept=".set,.txt" onChange={handleSetUpload} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Backtest HTML File Upload */}
            <div style={{ 
              border: '1px dashed rgba(255,255,255,0.15)', 
              borderRadius: '6px', 
              padding: '0.45rem 0.6rem', 
              background: htmlFileName ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                <FileSpreadsheet size={14} style={{ color: htmlFileName ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                  {htmlFileName || 'Backtest (.HTML)'}
                </span>
              </div>
              <label className="btn btn-secondary" style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', cursor: 'pointer' }}>
                {htmlFileName ? 'Trocar' : 'Subir'}
                <input type="file" accept=".html,.htm" onChange={handleHtmlUpload} style={{ display: 'none' }} />
              </label>
            </div>

            {/* MQL5 / Code Upload */}
            <div style={{ 
              border: '1px dashed rgba(255,255,255,0.15)', 
              borderRadius: '6px', 
              padding: '0.45rem 0.6rem', 
              background: mqlFileName ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255,255,255,0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                <Code2 size={14} style={{ color: mqlFileName ? '#a855f7' : 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                  {mqlFileName || 'MQL5 (.mq5 / .mqh)'}
                </span>
              </div>
              <label className="btn btn-secondary" style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', cursor: 'pointer' }}>
                {mqlFileName ? 'Trocar' : 'Subir'}
                <input type="file" accept=".mq5,.mqh,.cpp,.py,.txt" onChange={handleMqlUpload} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* User Rational Input */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🧠 Racional Operacional
            </label>
            <textarea 
              className="input-field" 
              placeholder="Descreva a tese do robô (ex: Seguidor de tendência no Nasdaq, entradas na média 3, grid defensivo com recuperação suave...)"
              value={userRational}
              onChange={e => setUserRational(e.target.value)}
              rows={4}
              style={{ width: '100%', fontSize: '0.82rem', resize: 'vertical', minHeight: '80px', padding: '0.5rem 0.7rem', lineHeight: '1.4' }}
            />
          </div>

          {/* Documentation / Links with CPower default tick */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📖 Documentação / Regras
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--accent-blue)' }}>
                <input 
                  type="checkbox" 
                  checked={isCPower} 
                  onChange={e => handleCPowerToggle(e.target.checked)} 
                  style={{ cursor: 'pointer', accentColor: 'var(--accent-blue)' }}
                />
                <span style={{ fontWeight: 600 }}>CPower</span>
              </label>
            </div>
            <textarea 
              className="input-field" 
              placeholder={isCPower ? "Regras ou referências CPower..." : "Cole links ou regras da documentação..."}
              value={docText}
              onChange={e => setDocText(e.target.value)}
              rows={3}
              style={{ width: '100%', fontSize: '0.8rem', resize: 'vertical', minHeight: '65px', padding: '0.5rem 0.7rem', lineHeight: '1.4' }}
            />
          </div>

          {/* Ingest / Analyze Button */}
          <button 
            className="btn btn-primary" 
            onClick={handleAnalyze} 
            disabled={analyzing || (!setContent && !htmlContent && !mqlContent && !userRational)}
            style={{ 
              marginTop: 'auto', 
              padding: '0.7rem', 
              fontSize: '0.88rem', 
              fontWeight: 600, 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '0.4rem',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)'
            }}
          >
            {analyzing ? (
              <>
                <RefreshCw size={15} className="spin" /> Processando...
              </>
            ) : (
              <>
                <Sparkles size={15} /> Processar Estratégia
              </>
            )}
          </button>
        </div>

        {/* Right Panel: Interactive Workspace & AI Analysis */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          
          {/* Workspace Action Bar */}
          <div style={{ 
            padding: '0.75rem 1.2rem', 
            background: 'rgba(255,255,255,0.03)', 
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Zap size={15} style={{ color: 'var(--accent-yellow)' }} /> Ações Rápidas de Engenharia Quantitativa:
            </span>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleSendMessage("Como criar uma estratégia complementar de HEDGE para cobrir o ponto cego deste robô? Detalhe os gatilhos matemáticos de entrada e saída.")}
                disabled={!strategyContext || loadingChat}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <ShieldCheck size={14} style={{ color: 'var(--accent-green)' }} /> 🛡️ Desenhar Hedge
              </button>

              <button 
                className="btn btn-secondary" 
                onClick={() => handleSendMessage("Como transpor essa estratégia para o par EURUSD (ou Forex em geral)? Explique os ajustes necessários de pips, volatilidade, horários e direção.")}
                disabled={!strategyContext || loadingChat}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Layers size={14} style={{ color: 'var(--accent-blue)' }} /> 🌍 Transpor p/ EURUSD
              </button>

              <button 
                className="btn btn-secondary" 
                onClick={() => handleSendMessage("Gere a Devolutiva Técnica Final completa em formato Markdown estruturado (com especificação de inputs, lógica de estados e regras operacionais) para que eu possa construir e codificar o robô no Antigravity.")}
                disabled={!strategyContext || loadingChat}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <FileText size={14} style={{ color: '#a855f7' }} /> 📑 Exportar Markdown Blueprint
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {messages.length === 0 ? (
              <div style={{ 
                margin: 'auto', 
                textAlign: 'center', 
                maxWidth: '480px', 
                opacity: 0.6, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '1rem' 
              }}>
                <Cpu size={48} style={{ color: 'var(--accent-blue)', opacity: 0.5 }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Laboratório de Estratégias & Hedge</h3>
                <p style={{ fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                  Faça o upload do arquivo <code>.set</code>, relatório de backtest ou código MQL5 no painel lateral e clique em <strong>Processar Estratégia</strong> para iniciar a engenharia reversa.
                </p>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: m.role === 'user' ? '80%' : '100%',
                    width: m.role === 'model' ? '100%' : 'auto',
                    background: m.role === 'user' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: m.role === 'user' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '1rem 1.2rem',
                    position: 'relative'
                  }}
                >
                  {/* Message Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: m.role === 'user' ? 'var(--accent-blue)' : 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {m.role === 'user' ? '👤 Engenheiro Quant' : '🤖 Quant AI Architect'}
                    </span>
                    {m.role === 'model' && (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button 
                          onClick={() => copyMarkdown(m.parts[0].text, idx)}
                          className="btn btn-secondary" 
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                          title="Copiar Markdown"
                        >
                          {copiedIndex === idx ? <Check size={12} style={{ color: 'var(--accent-green)' }} /> : <Copy size={12} />}
                          {copiedIndex === idx ? 'Copiado' : 'Copiar'}
                        </button>
                        <button 
                          onClick={() => downloadMarkdown(m.parts[0].text)}
                          className="btn btn-secondary" 
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                          title="Baixar Blueprint .md"
                        >
                          <Download size={12} /> .md
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Message Content with Markdown */}
                  <div className="strategy-markdown-content" style={{ fontSize: '0.88rem', lineHeight: '1.6', color: '#e2e8f0' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.parts[0].text}
                    </ReactMarkdown>
                  </div>
                </div>
              ))
            )}
            {loadingChat && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--accent-blue)', padding: '0.8rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', width: 'fit-content' }}>
                <RefreshCw size={16} className="spin" />
                <span style={{ fontSize: '0.85rem' }}>Quant Architect analisando e sintetizando blueprint...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Bar - Generous and Comfortable */}
          <div style={{ padding: '0.9rem 1.2rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
            >
              <textarea 
                className="input-field" 
                placeholder={strategyContext ? "Faça perguntas sobre o trade, solicite ajustes no racional, peça um hedge ou gere código..." : "Processe uma estratégia primeiro para habilitar o chat quantitativo."}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={!strategyContext || loadingChat}
                rows={2}
                style={{ flex: 1, fontSize: '0.9rem', padding: '0.65rem 1rem', resize: 'none', lineHeight: '1.4' }}
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={!input.trim() || !strategyContext || loadingChat}
                style={{ padding: '0.8rem 1.4rem', height: '100%', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
              >
                <Send size={16} /> Enviar
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};

export default StrategyStudio;
