import { useState, useEffect } from 'react';
import { fetchPortfolios, fetchPortfolioRobots } from '../api';
import { Network, FolderLock, Printer } from 'lucide-react';

const fmtNumber = (val: number, decimals = 2) => val.toFixed(decimals);

export default function Transmitir() {
  const [lockedPortfolios, setLockedPortfolios] = useState<any[]>([]);
  const [robotsByPortfolio, setRobotsByPortfolio] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [now] = useState(new Date().toLocaleString('pt-BR'));

  useEffect(() => {
    const load = async () => {
      try {
        const pfs = await fetchPortfolios();
        const locked = pfs.filter((p: any) => p.locked === 1);
        setLockedPortfolios(locked);

        const robotsMap: Record<string, any[]> = {};
        await Promise.all(locked.map(async (pf) => {
          const robots = await fetchPortfolioRobots(pf.id);
          robotsMap[pf.id] = robots;
        }));
        
        setRobotsByPortfolio(robotsMap);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handlePrint = () => {
     window.print();
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Carregando dados de transmissão...</div>;
  }

  return (
    <div className="transmitir-page">
      <div className="flex-between no-print" style={{ marginBottom: '1.8rem' }}>
        <h1 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Network size={20} /> Transmissão VPS
        </h1>
        <button className="btn btn-success" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Printer size={16} /> Imprimir
        </button>
      </div>

      <div className="print-header" style={{ display: 'none', marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>
         <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#000' }}>DATA_LAB Nautilus — Transmissão VPS</h1>
         <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#333' }}>Relatório Gerencial de Lotes — Impresso em: {now}</p>
      </div>

      <div style={{ marginBottom: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '800px' }} className="no-print">
        Abaixo estão listados todos os robôs contidos em <strong>Portfólios Travados</strong>. Utilize esses dados para configurar o balanceamento exato de Lotes e Parciais no ambiente da sua VPS no MT5.
      </div>

      {lockedPortfolios.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.05)' }}>
          <FolderLock size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 0.5rem', color: '#fff' }}>Nenhum portfólio travado</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Acesse a página de "Gerenciar Portfólio", adicione robôs e clique em "Travar" para prepará-los para transmissão.
          </p>
        </div>
      )}

      {lockedPortfolios.map(pf => {
        const robots = robotsByPortfolio[pf.id] || [];
        return (
          <div key={pf.id} style={{ marginBottom: '3rem' }} className="portfolio-section">
            <h2 className="portfolio-title" style={{ fontSize: '1rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <FolderLock size={16} /> {pf.name} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({robots.length} robôs)</span>
            </h2>
            
            <div className="table-container" style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <table className="oakmont-table" style={{ fontSize: '0.75rem', width: '100%' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '0.8rem 0.6rem', textAlign: 'left' }}>ROBÔ / ALOCAÇÃO</th>
                    <th style={{ padding: '0.8rem 0.6rem' }}>ATIVO</th>
                    <th style={{ padding: '0.8rem 0.6rem' }}>PERÍODO</th>
                    <th style={{ padding: '0.8rem 0.6rem' }}>PESO LOTE</th>
                    <th style={{ padding: '0.8rem 0.6rem', color: 'var(--accent-green)' }}>LOTE INIT</th>
                    <th style={{ padding: '0.8rem 0.6rem', color: 'var(--accent-red)' }}>LOTE MAX</th>
                    <th style={{ padding: '0.8rem 0.6rem', color: '#F59E0B' }}>PARCIAL</th>
                    <th style={{ padding: '0.8rem 0.6rem', color: '#8B5CF6' }}>SOMA</th>
                  </tr>
                </thead>
                <tbody>
                  {robots.map((r: any) => {
                    let params: any = {};
                    try {
                      if (r.parameters) params = JSON.parse(r.parameters);
                    } catch (e) {}

                    const weight = r.weight || 1;
                    
                    const lotePer1000 = parseFloat(params['Lot_Per_1000'] || '0');
                    const loteMax = parseFloat(params['Lot_Max'] || '0');
                    const partialClose = parseFloat(params['PartialClose_MinProfit'] || '0');

                    const calculatedLoteInit = lotePer1000 * weight;
                    const calculatedLoteMax = loteMax * weight;
                    const calculatedParcial = partialClose * weight;

                    const gtccy = parseFloat(params['GlobalTakeProfit_ccy'] || '0');
                    const gt = parseFloat(params['GlobalTakeProfit'] || '0');
                    const mptc = parseFloat(params['MinProfitToClose'] || '0');
                    const mptcm = parseFloat(params['MinProfitToClose_ModeP'] || '0');

                    const somaStr = (gtccy !== 0 || gt !== 0 || mptc !== 0 || mptcm !== 0) ? 'Sim' : 'Não';
                    const somaColor = somaStr === 'Sim' ? '#22C55E' : 'var(--text-muted)';
                    
                    // Increased to 40 characters as requested
                    const displayName = r.name.length > 40 ? r.name.slice(0, 37) + '...' : r.name;

                    return (
                      <tr key={r.robot_id} className="oakmont-row">
                        <td style={{ padding: '0.8rem 0.6rem' }}>
                          <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.8rem' }} className="r-name">
                            {displayName}
                          </div>
                        </td>
                        <td style={{ padding: '0.8rem 0.6rem', color: 'var(--text-muted)' }}>{r.asset || '—'}</td>
                        <td style={{ padding: '0.8rem 0.6rem', color: 'var(--text-muted)' }}>{r.timeframe || '—'}</td>
                        <td style={{ padding: '0.8rem 0.6rem', fontWeight: '800' }}>{fmtNumber(weight)}x</td>
                        <td style={{ padding: '0.8rem 0.6rem', fontWeight: '700', color: 'var(--accent-green)' }}>{fmtNumber(calculatedLoteInit, 2)}</td>
                        <td style={{ padding: '0.8rem 0.6rem', fontWeight: '700', color: 'var(--accent-red)' }}>{fmtNumber(calculatedLoteMax, 2)}</td>
                        <td style={{ padding: '0.8rem 0.6rem', fontWeight: '700', color: '#F59E0B' }}>{fmtNumber(calculatedParcial, 2)}</td>
                        <td style={{ padding: '0.8rem 0.6rem', fontWeight: '800', color: somaColor }}>{somaStr}</td>
                      </tr>
                    );
                  })}
                  {robots.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum robô alocado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <style>{`
        @media print {
          @page { size: A4; margin: 1cm; }
          
          /* RESET GLOBAL PARA IMPRESSÃO - FORÇAR ALTURA AUTOMÁTICA EM TUDO */
          html, body { 
            height: auto !important; 
            overflow: visible !important; 
            background: #fff !important; 
            color: #000 !important; 
          }

          .sidebar, .no-print, .btn, .oakmont-btn { display: none !important; }

          /* DESBLOQUEAR CONTAINERS DE LAYOUT */
          .app-container, .main-content, .layout-container, .page-wrapper, .transmitir-page { 
            display: block !important;
            position: static !important;
            width: 100% !important; 
            height: auto !important; 
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important; 
            padding: 0 !important; 
            margin: 0 !important; 
            background: #fff !important; 
          }

          .print-header { display: block !important; margin-bottom: 1.5rem; }

          .portfolio-section { 
            page-break-inside: avoid; 
            margin-bottom: 2.5rem !important; 
            display: block !important;
            width: 100% !important;
          }

          .portfolio-title { 
            color: #1e40af !important; 
            border-bottom: 1px solid #ddd; 
            padding-bottom: 0.3rem; 
            font-size: 11px !important; 
            margin-bottom: 0.8rem !important;
          }

          .table-container { 
            background: #fff !important; 
            border: 1px solid #ddd !important; 
            border-radius: 0 !important; 
            overflow: visible !important; 
            width: 100% !important; 
            height: auto !important; 
          }

          .oakmont-table { 
            border-collapse: collapse !important; 
            color: #000 !important; 
            font-size: 8px !important; 
            width: 100% !important; 
            table-layout: fixed !important; /* Força larguras fixas */
          }

          /* AJUSTE DE LARGURAS DE COLUNA */
          .oakmont-table th:nth-child(1), .oakmont-table td:nth-child(1) { width: 35% !important; } /* NOME DO ROBÔ MAIOR */
          .oakmont-table th:nth-child(2), .oakmont-table td:nth-child(2) { width: 12% !important; } /* ATIVO */
          .oakmont-table th:nth-child(3), .oakmont-table td:nth-child(3) { width: 8% !important; }  /* PERIODO */
          .oakmont-table th:nth-child(4), .oakmont-table td:nth-child(4) { width: 10% !important; } /* PESO */
          .oakmont-table th:nth-child(5), .oakmont-table td:nth-child(5) { width: 10% !important; } /* LOTE INIT */
          .oakmont-table th:nth-child(6), .oakmont-table td:nth-child(6) { width: 10% !important; } /* LOTE MAX */
          .oakmont-table th:nth-child(7), .oakmont-table td:nth-child(7) { width: 8% !important; }  /* PARCIAL */
          .oakmont-table th:nth-child(8), .oakmont-table td:nth-child(8) { width: 7% !important; }  /* SOMA */

          .oakmont-table th { 
            background: #f8fafc !important; 
            color: #1e293b !important; 
            border: 1px solid #ddd !important; 
            padding: 0.2rem !important; 
            font-size: 8.5px !important; /* Aumentado em 20% */
            text-transform: uppercase; 
          }

          .oakmont-table td { 
            border: 1px solid #ddd !important; 
            color: #334155 !important; 
            padding: 0.3rem !important; 
            font-size: 8px !important; 
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .oakmont-row:hover { background: transparent !important; }

          .r-name { 
            color: #000 !important; 
            font-size: 8px !important; 
            white-space: nowrap !important; /* Garante uma única linha */
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            width: 100% !important;
            display: block !important;
          }

          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
