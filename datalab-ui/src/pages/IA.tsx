import { useState, useEffect, useRef } from 'react';
import { Bot, User, Send, ChevronRight, Briefcase, Database, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { fetchRobots, fetchPortfolios, fetchIAInfo, chatWithIA } from '../api';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const IA = () => {
  const [robots, setRobots] = useState<any[]>([]);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<{ type: 'robot' | 'portfolio', id: string, name: string } | null>(null);
  const [context, setContext] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRobots().then(setRobots).catch(console.error);
    fetchPortfolios().then(setPortfolios).catch(console.error);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSelect = async (type: 'robot' | 'portfolio', id: string, name: string) => {
    setSelectedItem({ type, id, name });
    setLoadingContext(true);
    setMessages([]);
    try {
      const { context: ctx } = await fetchIAInfo(type, id);
      setContext(ctx);
      setMessages([{
        role: 'model',
        parts: [{ text: `Olá! Carreguei os dados diários do ${type === 'robot' ? 'robô' : 'portfólio'} **${name}**. \nO que você gostaria de saber sobre o desempenho dele? Posso analisar lucros em datas específicas, drawdowns ou métricas gerais.` }]
      }]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContext(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedItem || loading) return;

    const userMsg: Message = { role: 'user', parts: [{ text: input }] };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await chatWithIA(newMessages, context);
      setMessages([...newMessages, { role: 'model', parts: [{ text: response.text }] }]);
    } catch (e: any) {
      console.error(e);
      const errorMsg = e.response?.data?.error || "Erro ao processar resposta da IA.";
      const details = e.response?.data?.details ? `\n\nDetalhes: ${e.response.data.details}` : "";
      
      setMessages([...newMessages, { 
        role: 'model', 
        parts: [{ text: `❌ ${errorMsg}${details}\n\nVerifique se o servidor está rodando e se a GROQ_API_KEY está configurada corretamente no ambiente de produção.` }] 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (selectedItem) {
      handleSelect(selectedItem.type, selectedItem.id, selectedItem.name);
    } else {
      setMessages([]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)' }}>
      <div className="flex-between mb-4">
        <div>
          <h1 className="section-title" style={{ marginBottom: '0.2rem' }}>Nautilus AI Expert</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Analista quantitativo focado em seus dados históricos</p>
        </div>
        {messages.length > 1 && (
          <button className="btn btn-danger" onClick={clearChat} style={{ padding: '0.5rem 1rem' }}>
            <Trash2 size={16} /> Limpar Chat
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, gap: '1.5rem', overflow: 'hidden' }}>
        
        {/* Sidebar de Seleção */}
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
          
          <div className="card" style={{ padding: '1rem' }}>
            <h2 className="card-title" style={{ fontSize: '0.7rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={14} /> Robôs Aprovados
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {robots.length === 0 && <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>Nenhum robô aprovado.</p>}
              {robots.map(r => (
                <div 
                  key={r.id} 
                  className={`nav-item ${selectedItem?.id === r.id ? 'active' : ''}`}
                  style={{ cursor: 'pointer', padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}
                  onClick={() => handleSelect('robot', r.id, r.name)}
                >
                  <ChevronRight size={14} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '1rem' }}>
            <h2 className="card-title" style={{ fontSize: '0.7rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={14} /> Portfólios
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {portfolios.length === 0 && <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>Nenhum portfólio criado.</p>}
              {portfolios.map(p => (
                <div 
                  key={p.id} 
                  className={`nav-item ${selectedItem?.id === p.id ? 'active' : ''}`}
                  style={{ cursor: 'pointer', padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}
                  onClick={() => handleSelect('portfolio', p.id, p.name)}
                >
                  <ChevronRight size={14} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Área de Chat */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', position: 'relative' }}>
          
          {!selectedItem ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.4, textAlign: 'center', padding: '2rem' }}>
              <Bot size={64} style={{ marginBottom: '1.5rem' }} />
              <h3 style={{ fontFamily: 'var(--font-header)', fontSize: '1.2rem', marginBottom: '1rem' }}>Selecione um Robô ou Portfólio</h3>
              <p style={{ maxWidth: '400px' }}>Clique em um item na lateral para carregar o histórico diário e iniciar a análise com a IA.</p>
            </div>
          ) : (
            <>
              {/* Header do Chat */}
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                <Sparkles size={20} className="text-blue" />
                <div>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Conversando sobre:</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedItem.name}</div>
                </div>
                {loadingContext && <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--accent-blue)' }}>
                  <Loader2 size={16} className="animate-spin" /> Carregando Histórico...
                </div>}
              </div>

              {/* Mensagens */}
              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: '1rem', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                    {m.role === 'model' && (
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Bot size={18} className="text-blue" />
                      </div>
                    )}
                    <div style={{ 
                      padding: '1rem', 
                      borderRadius: '12px', 
                      backgroundColor: m.role === 'user' ? 'var(--accent-blue)' : 'var(--bg-card-hover)',
                      color: m.role === 'user' ? '#000' : 'var(--text-main)',
                      fontSize: '0.9rem',
                      lineHeight: '1.6',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {m.parts[0].text}
                    </div>
                    {m.role === 'user' && (
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={18} />
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div style={{ display: 'flex', gap: '1rem', alignSelf: 'flex-start' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bot size={18} className="text-blue" />
                    </div>
                    <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-muted)' }}>
                      <Loader2 size={18} className="animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '0.8rem', position: 'relative' }}>
                  <input 
                    className="input-field" 
                    placeholder="Pergunte sobre lucros em datas, drawdowns ou análise geral..." 
                    style={{ borderRadius: '24px', paddingRight: '4rem' }}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <button 
                    className="btn btn-primary" 
                    style={{ position: 'absolute', right: '4px', top: '4px', bottom: '4px', width: '42px', borderRadius: '50%', padding: 0 }}
                    onClick={handleSend}
                    disabled={loading || !input.trim() || !selectedItem}
                  >
                    <Send size={18} />
                  </button>
                </div>
                <div style={{ fontSize: '0.65rem', textAlign: 'center', color: 'var(--text-muted)', marginTop: '0.8rem' }}>
                  Groq Llama 3.3 • Nautilus DataLab Assistant
                </div>
              </div>
            </>
          )}

        </div>

      </div>

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default IA;
