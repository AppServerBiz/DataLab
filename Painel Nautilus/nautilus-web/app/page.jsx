"use client";
import React, { useState, useEffect } from 'react';

const fallbackData = {
  account: '',
  balance: 0,
  equity: 0,
  dbDate: 'Aguardando',
  serverTime: '--:--',
  localTime: '--:--',
  globalRiskLevel: 0,
  ddPct: 0,
  dmeMax: 100,
  totalProfit: 0,
  dayProfit: 0,
  weekProfit: 0,
  monthProfit: 0,
  totalFloating: 0,
  activeBuyLots: 0,
  activeSellLots: 0,
  activeEAs: 0,
  robots: []
};

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

function getRiskClass(level) {
  if (level === 3) return 'critical';
  if (level === 2) return 'orange';
  if (level === 1) return 'warning';
  return 'normal';
}

function SemanticCircles({ level }) {
  return (
    <div className="semaphore-container">
      <div className={`sem-circle green ${level >= 0 ? 'active' : ''}`}></div>
      <div className={`sem-circle yellow ${level >= 1 ? 'active' : ''}`}></div>
      <div className={`sem-circle orange ${level >= 2 ? 'active' : ''}`}></div>
      <div className={`sem-circle red ${level >= 3 ? 'active' : ''}`}></div>
    </div>
  );
}

function RobotModal({ robot, robotInfo, onClose }) {
  const [activeTab, setActiveTab] = useState('performance');

  if (!robot) return null;

  // Se não encontrar info na planilha, usa o que tem no robot ou fallback
  const info = robotInfo || {
    direcao: 'CARREGANDO...',
    estilo: 'CARREGANDO...',
    indicador: 'CARREGANDO...',
    backtest_period: 'Aguardando Oracle...',
    profit_factor: '--',
    drawdown: '--',
    capital: '--',
    lucro_mes: '--',
    roi_mes: '--',
    roi_ano: '--'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <h2>{robot.comment || 'Dossiê do Robô'}</h2>
              <span className="modal-magic">#{robot.magic}</span>
            </div>
            <div className="badges-container">
              <span className="badge">EA</span>
              <span className="badge outline">{info.direcao}</span>
              <span className="badge outline">{info.estilo}</span>
              <span className="badge outline">{info.indicador}</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-hero-metrics">
          <div className="hero-metric">
            <span className="hero-label">ROI ESTIMADO ANO</span>
            <span className="hero-value profit-text">+{info.roi_ano}</span>
          </div>
          <div className="hero-metric">
            <span className="hero-label">LUCRO MÊS (EST.)</span>
            <span className="hero-value profit-text">+{info.lucro_mes}</span>
          </div>
          <div className="hero-metric">
            <span className="hero-label">DRAWDOWN BACKTEST</span>
            <span className="hero-value loss-text">-${info.drawdown}</span>
          </div>
          <div className="hero-metric">
            <span className="hero-label">PROFIT FACTOR</span>
            <span className="hero-value">{info.profit_factor}</span>
          </div>
        </div>


        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            📈 Performance
          </button>
          <button
            className={`modal-tab ${activeTab === 'strategy' ? 'active' : ''}`}
            onClick={() => setActiveTab('strategy')}
          >
            ⚙️ Setup
          </button>
          <button
            className={`modal-tab ${activeTab === 'risk' ? 'active' : ''}`}
            onClick={() => setActiveTab('risk')}
          >
            🛡️ Gestão de Risco
          </button>
          <button
            className={`modal-tab ${activeTab === 'martingale' ? 'active' : ''}`}
            onClick={() => setActiveTab('martingale')}
          >
            🔄 Grade / Posições
          </button>
        </div>

        <div className="modal-body" style={{ paddingTop: '1rem' }}>
          {activeTab === 'performance' && (
            <div className="tab-pane animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="dossier-section">
                <h3>Métricas de Backtest</h3>
                <div className="doc-grid">
                  <div className="doc-item">
                    <span>Capital Recomendado</span>
                    <strong>${info.capital}</strong>
                  </div>
                  <div className="doc-item">
                    <span>Profit Factor</span>
                    <strong>{info.profit_factor}</strong>
                  </div>
                  <div className="doc-item">
                    <span>Desenho (DD) Máx</span>
                    <strong className="loss-text">${info.drawdown}</strong>
                  </div>
                  <div className="doc-item">
                    <span>Lucro Médio Mês</span>
                    <strong className="profit-text">${info.lucro_mes}</strong>
                  </div>
                </div>
              </div>
              <div className="dossier-section">
                <h3>Visão de Longo Prazo</h3>
                <div className="doc-grid">
                  <div className="doc-item">
                    <span>Retorno % Mês</span>
                    <strong className="profit-text">{info.roi_mes}</strong>
                  </div>
                  <div className="doc-item">
                    <span>Retorno % Ano</span>
                    <strong className="profit-text">{info.roi_ano}</strong>
                  </div>
                  <div className="doc-item" style={{ gridColumn: 'span 2' }}>
                    <span>Janela de Backtest</span>
                    <strong>{info.backtest_period}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'strategy' && (
            <div className="tab-pane animate-fade-in">
              <div className="dossier-section">
                <h3>Indicadores e Setup</h3>
                <div className="doc-grid">
                  <div className="doc-item">
                    <span>Indicador Principal</span>
                    <strong>{info.indicador}</strong>
                  </div>
                  <div className="doc-item">
                    <span>Estilo de Operação</span>
                    <strong>{info.estilo}</strong>
                  </div>
                  <div className="doc-item">
                    <span>Direção Estratégica</span>
                    <strong>{info.direcao}</strong>
                  </div>
                  <div className="doc-item">
                    <span>Filtro Adicional</span>
                    <strong>AUTOMÁTICO</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'risk' && (
            <div className="tab-pane animate-fade-in">
              <div className="dossier-section">
                <h3>Limites e Operacional</h3>
                <div className="doc-grid">
                  <div className="doc-item">
                    <span>Lote Inicial / Máx</span>
                    <strong>0.01 / 0.50</strong>
                  </div>
                  <div className="doc-item">
                    <span>Stop Loss Global</span>
                    <strong>500 pt</strong>
                  </div>
                  <div className="doc-item">
                    <span>Take Profit</span>
                    <strong>100 pt</strong>
                  </div>
                  <div className="doc-item">
                    <span>Trailing Stop</span>
                    <strong>15 / 0.5</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'martingale' && (
            <div className="tab-pane animate-fade-in">
              <div className="dossier-section">
                <h3>Recuperação de Preço (Martingale)</h3>
                <div className="doc-grid">
                  <div className="doc-item">
                    <span>Fator Multiplicador</span>
                    <strong>1.25</strong>
                  </div>
                  <div className="doc-item">
                    <span>Fechamento Parcial</span>
                    <strong>2 Níveis / $1 Min</strong>
                  </div>
                  <div className="doc-item">
                    <span>Distância (Step)</span>
                    <strong>10 pt</strong>
                  </div>
                  <div className="doc-item" style={{ gridColumn: 'span 2' }}>
                    <span>Custom MG (Progressão)</span>
                    <strong style={{ wordBreak: 'break-all', fontSize: '0.85rem' }}>1,1,1,1,1,1,2,3,3,4,5,7,9,11,14,18,22,28...</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            *Nota: Dados sincronizados em tempo real com o Oracle (Google Sheets). Período Backtest: {info.backtest_period}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountView({ data, status, setSelectedRobot, toggleSidebar }) {
  const riskClass = getRiskClass(data.globalRiskLevel || 0);
  const dProf = data.dayProfit || 0;
  const wProf = data.weekProfit || 0;
  const mProf = data.monthProfit || 0;
  const tProf = data.totalProfit || 0;
  const dbal = data.balance || 0;
  const tFloat = data.totalFloating || 0;

  const ddPct = data.ddPct || 0;
  const dmeMax = data.dmeMax || 100;
  const ddRatio = Math.min((ddPct / dmeMax) * 100, 100);

  const robotsArray = data.robots || [];
  const activeWorkingEAs = robotsArray.filter(r => (r.buy_lots || 0) > 0 || (r.sell_lots || 0) > 0).length;

  return (
    <div className="dashboard-container animate-fade-in">
      <header className="app-header">
        <div className="app-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="sidebar-toggle-btn" onClick={toggleSidebar} title="Recolher/Expandir Menu">☰</button>
          <div>
            <h1>Supervision Nautilus Ultimate</h1>
            <p>Terminal Data • Servidor: {data.serverTime || '--:--'} • DataBase: {data.dbDate || '--'}</p>
          </div>
        </div>
        <div className={`status-badge ${status === 'Sincronizado' ? 'sync' : 'offline'}`}>
          <span className="dot">●</span> {status}
        </div>
      </header>

      {/* Global Account Summary */}
      <div className="account-summary">
        <div className="summary-card">
          <h3>Drawdown & Exposição</h3>
          <div className={`summary-value ${tFloat >= 0 ? 'profit-text' : 'loss-text'}`}>
            {formatCurrency(tFloat)}
          </div>
          <div className="summary-subtitle">Flutuante Global no Momento</div>

          <div className="dd-bar-container">
            <div className={`dd-bar-fill ${riskClass}`} style={{ width: `${ddRatio}%` }}></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>DD Atual: {formatPercent(ddPct)}</span>
            <span>Máximo: {dmeMax.toFixed(0)}%</span>
            <SemanticCircles level={data.globalRiskLevel || 0} />
          </div>
        </div>

        <div className="summary-card">
          <h3>Saúde Financeira</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.5rem' }}>
            <div>
              <div className="summary-value" style={{ color: 'var(--text-main)', fontSize: '2rem', lineHeight: '1.2' }}>
                {formatCurrency(data.equity || 0)}
              </div>
              <div className="summary-subtitle" style={{ marginTop: '0' }}>Saldo Líquido (Equity)</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="summary-value" style={{ color: 'var(--text-muted)', fontSize: '1.6rem', lineHeight: '1.2' }}>
                {formatCurrency(data.balance || 0)}
              </div>
              <div className="summary-subtitle" style={{ marginTop: '0' }}>Saldo Bruto (Balance)</div>
            </div>
          </div>

          <div className="performance-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: '1.5rem' }}>
            <div className="perf-item">
              <span className="perf-label">Dia</span>
              <span className={`perf-val ${dProf >= 0 ? 'profit-text' : 'loss-text'}`} style={{ fontSize: '1.45rem' }}>{dProf > 0 ? '+' : ''}{dProf.toFixed(1)}</span>
            </div>
            <div className="perf-item">
              <span className="perf-label">Semana</span>
              <span className={`perf-val ${wProf >= 0 ? 'profit-text' : 'loss-text'}`} style={{ fontSize: '1.45rem' }}>{wProf > 0 ? '+' : ''}{wProf.toFixed(1)}</span>
            </div>
            <div className="perf-item">
              <span className="perf-label">Total</span>
              <span className={`perf-val ${tProf >= 0 ? 'profit-text' : 'loss-text'}`} style={{ fontSize: '1.45rem' }}>{tProf > 0 ? '+' : ''}{tProf.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="summary-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3>Conta Vinculada</h3>
          <div className="summary-value" style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
            {data.account || 'Aguardando Sincronização...'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
            Corretora: <span style={{ color: 'var(--text-main)' }}>{data.broker || '--'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <div className="perf-label" style={{ marginBottom: '0.25rem' }}>Robôs Atrib.</div>
              <div className="summary-value" style={{ fontSize: '1.25rem' }}>{data.activeEAs || 0}</div>
            </div>
            <div>
              <div className="perf-label" style={{ marginBottom: '0.25rem' }}>Robôs Operando</div>
              <div className="summary-value" style={{ fontSize: '1.25rem' }}>{activeWorkingEAs}</div>
            </div>
            <div>
              <div className="perf-label" style={{ marginBottom: '0.25rem' }}>Lotes (Totais)</div>
              <div className="summary-value" style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>
                {((data.activeBuyLots || 0) + (data.activeSellLots || 0)).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="section-title">Portfólio de Robôs em Operação</h2>

      <div className="table-container">
        <table className="robots-table selectable-table">
          <thead>
            <tr>
              <th>Identificação (Magic)</th>
              <th>Lucro Dia / Eficiência</th>
              <th>Lucro Total</th>
              <th>Status do Risco e Lotes</th>
              <th>Exposição Flutuante</th>
              <th>Semáforo</th>
            </tr>
          </thead>
          <tbody>
            {robotsArray.map(r => {
              const effD = r.d_tot > 0 ? (r.d_won / r.d_tot * 100).toFixed(0) : 0;
              const effT = r.t_tot > 0 ? (r.t_won / r.t_tot * 100).toFixed(0) : 0;
              const alertClass = (r.alertLevel === 'danger') ? 'danger' : (r.alertLevel === 'warning') ? 'warning' : 'normal';

              // Dynamic Limits Bar Calculation
              const buyL = r.buy_lots || 0;
              const sellL = r.sell_lots || 0;
              const buyC = r.buy_count || 0;
              const sellC = r.sell_count || 0;
              const maxL = r.limit_max_lots || 0;
              const maxE = r.limit_max_entries || 0;

              let highestRatio = 0;
              if (maxL > 0) highestRatio = Math.max(highestRatio, (buyL / maxL) * 100, (sellL / maxL) * 100);
              if (maxE > 0) highestRatio = Math.max(highestRatio, (buyC / maxE) * 100, (sellC / maxE) * 100);
              const barFill = Math.min(highestRatio, 100);

              let dynBackground = 'linear-gradient(90deg, rgba(16,185,129,0.3) 0%, #10b981 100%)'; // Green degrade
              if (barFill >= 99) dynBackground = 'linear-gradient(90deg, rgba(239,68,68,0.3) 0%, #ef4444 100%)'; // Red degrade
              else if (barFill >= 70) dynBackground = 'linear-gradient(90deg, rgba(245,158,11,0.3) 0%, #f59e0b 100%)'; // Yellow degrade

              return (
                <tr key={r.magic} onClick={() => setSelectedRobot(r)}>
                  <td>
                    <div className="bot-info">
                      <span className="bot-name">{r.comment || 'N/A'}</span>
                      <span className="bot-magic">#{r.magic}</span>
                    </div>
                  </td>
                  <td>
                    <div className="metric-group">
                      <span className={`metric-primary ${r.d_prof >= 0 ? 'profit-text' : 'loss-text'}`}>
                        {r.d_prof >= 0 ? '+' : ''}{(r.d_prof || 0).toFixed(2)} USD
                      </span>
                      <span className="metric-secondary">Acerto: {effD}% ({r.d_won || 0}/{r.d_tot || 0})</span>
                    </div>
                  </td>
                  <td>
                    <div className="metric-group">
                      <span className={`metric-primary ${r.t_prof >= 0 ? 'profit-text' : 'loss-text'}`}>
                        {r.t_prof >= 0 ? '+' : ''}{(r.t_prof || 0).toFixed(2)} USD
                      </span>
                      <span className="metric-secondary">Acerto: {effT}% ({r.t_won || 0}/{r.t_tot || 0})</span>
                    </div>
                  </td>
                  <td>
                    <div className="metric-group" style={{ minWidth: '220px' }}>
                      <div className="dyn-bar-wrapper" style={{ marginBottom: '0.3rem' }}>
                        <div className="dyn-bar-track">
                          <div className="dyn-bar-fill" style={{ width: `${barFill}%`, background: dynBackground }}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          <span>Compras: {buyL.toFixed(2)} ({buyC}x)</span>
                          <span>Vendas: {sellL.toFixed(2)} ({sellC}x)</span>
                        </div>
                      </div>
                      <span className={`alert-pill ${alertClass}`} style={{ alignSelf: 'flex-start' }}>
                        {r.alertMsg || 'LIMITE NÃO EXECUTADO / OK'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="metric-group">
                      <span className={`metric-primary ${(r.floating || 0) >= 0 ? 'profit-text' : 'loss-text'}`}>
                        {(r.floating || 0) >= 0 ? '+' : ''}{(r.floating || 0).toFixed(2)} USD
                      </span>
                      <span className="metric-secondary">DD Relativo: {r.float_pct ? r.float_pct.toFixed(2) : 0}%</span>
                    </div>
                  </td>
                  <td>
                    <SemanticCircles level={r.unit_risk || 0} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {(robotsArray.length === 0) && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhum robô encontrado no momento. Certifique-se de que o EA Supervision Grab está ativo.
          </div>
        )}
      </div>
    </div>
  );
}

function HomeView({ accounts, status, toggleSidebar }) {
  const totalBalance = accounts.reduce((acc, obj) => acc + (obj.balance || 0), 0);
  const totalEquity = accounts.reduce((acc, obj) => acc + (obj.equity || 0), 0);
  const totalDayProfit = accounts.reduce((acc, obj) => acc + (obj.dayProfit || 0), 0);
  const totalWeekProfit = accounts.reduce((acc, obj) => acc + (obj.weekProfit || 0), 0);
  const totalAllProfit = accounts.reduce((acc, obj) => acc + (obj.totalProfit || 0), 0);
  const totalFloating = accounts.reduce((acc, obj) => acc + (obj.totalFloating || 0), 0);

  const activeWorkingEAs = accounts.reduce((sum, acc) => sum + ((acc.robots || []).filter(r => (r.buy_lots || 0) > 0 || (r.sell_lots || 0) > 0).length), 0);
  const totalLots = accounts.reduce((sum, acc) => sum + (acc.activeBuyLots || 0) + (acc.activeSellLots || 0), 0);
  const brokersArr = [...new Set(accounts.filter(a => a.broker && a.account !== 'Offline').map(a => a.broker))];

  return (
    <div className="dashboard-container animate-fade-in">
      <header className="app-header">
        <div className="app-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="sidebar-toggle-btn" onClick={toggleSidebar} title="Recolher/Expandir Menu">☰</button>
          <div>
            <h1>Resumo Global da Gestão</h1>
            <p>Visão Sintética de Múltiplas Contas</p>
          </div>
        </div>
        <div className={`status-badge ${status === 'Sincronizado' ? 'sync' : 'offline'}`}>
          <span className="dot">●</span> {status}
        </div>
      </header>

      <div className="account-summary">
        <div className="summary-card">
          <h3>Drawdown & Exposição</h3>
          <div className={`summary-value ${totalFloating >= 0 ? 'profit-text' : 'loss-text'}`}>
            {totalFloating >= 0 ? '+' : ''}{formatCurrency(totalFloating)}
          </div>
          <div className="summary-subtitle">Flutuante Global no Momento</div>

          <div className="dd-bar-container">
            <div className={`dd-bar-fill ${totalFloating < 0 ? 'loss-bg' : 'profit-bg'}`} style={{ width: `${totalBalance > 0 ? Math.min((Math.abs(totalFloating) / totalBalance) * 100, 100) : 0}%`, background: totalFloating < 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>DD Atual: {totalBalance > 0 ? ((totalFloating / totalBalance) * 100).toFixed(2) : 0}%</span>
            <span>Máximo Global: --%</span>
          </div>
        </div>

        <div className="summary-card">
          <h3>Saúde Financeira</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.5rem' }}>
            <div>
              <div className="summary-value" style={{ color: 'var(--text-main)', fontSize: '2rem', lineHeight: '1.2' }}>
                {formatCurrency(totalEquity)}
              </div>
              <div className="summary-subtitle" style={{ marginTop: '0' }}>Saldo Líquido (Equity)</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="summary-value" style={{ color: 'var(--text-muted)', fontSize: '1.6rem', lineHeight: '1.2' }}>
                {formatCurrency(totalBalance)}
              </div>
              <div className="summary-subtitle" style={{ marginTop: '0' }}>Saldo Bruto (Balance)</div>
            </div>
          </div>

          <div className="performance-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: '1.5rem' }}>
            <div className="perf-item">
              <span className="perf-label">Dia</span>
              <span className={`perf-val ${totalDayProfit >= 0 ? 'profit-text' : 'loss-text'}`} style={{ fontSize: '1.45rem' }}>{totalDayProfit > 0 ? '+' : ''}{totalDayProfit.toFixed(1)}</span>
            </div>
            <div className="perf-item">
              <span className="perf-label">Semana</span>
              <span className={`perf-val ${totalWeekProfit >= 0 ? 'profit-text' : 'loss-text'}`} style={{ fontSize: '1.45rem' }}>{totalWeekProfit > 0 ? '+' : ''}{totalWeekProfit.toFixed(1)}</span>
            </div>
            <div className="perf-item">
              <span className="perf-label">Total</span>
              <span className={`perf-val ${totalAllProfit >= 0 ? 'profit-text' : 'loss-text'}`} style={{ fontSize: '1.45rem' }}>{totalAllProfit > 0 ? '+' : ''}{totalAllProfit.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="summary-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3>Contas Integradas</h3>
          <div className="summary-value" style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
            {accounts.filter(a => a.account !== 'Offline').length} MÚLTIPLAS
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
            Corretoras: <span style={{ color: 'var(--text-main)' }}>{brokersArr.join(', ') || '--'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <div className="perf-label" style={{ marginBottom: '0.25rem' }}>Robôs Atrib.</div>
              <div className="summary-value" style={{ fontSize: '1.25rem' }}>{accounts.reduce((sum, acc) => sum + (acc.activeEAs || 0), 0)}</div>
            </div>
            <div>
              <div className="perf-label" style={{ marginBottom: '0.25rem' }}>Robôs Operando</div>
              <div className="summary-value" style={{ fontSize: '1.25rem' }}>{activeWorkingEAs}</div>
            </div>
            <div>
              <div className="perf-label" style={{ marginBottom: '0.25rem' }}>Lotes (Totais)</div>
              <div className="summary-value" style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>
                {totalLots.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="section-title">Terminais Vinculados</h2>
      <div className="oakmont-panel">
        <table className="oakmont-table">
          <thead>
            <tr>
              <th>Tick/Conta</th>
              <th>Capital Bruto</th>
              <th>Líquido</th>
              <th>Exposição</th>
              <th>Dia</th>
              <th>Semana</th>
              <th>Mês</th>
              <th>Meta</th>
              <th>Total</th>
              <th>Trades</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc, i) => {
              const gross = acc.balance || 1;
              const shortAcc = (acc.account || 'DESCONHECIDA').split('-')[0].trim().substring(0, 6).toUpperCase();
              const brokerStr = acc.broker || 'N/A';
              return (
                <tr key={i} className="oakmont-row">
                  <td>
                    <div className="val-stack">
                      <span className="ticker-name">{shortAcc}</span>
                      <span className="company-name">{brokerStr}</span>
                    </div>
                  </td>
                  <td>{formatCurrency(acc.balance || 0)}</td>
                  <td>{formatCurrency(acc.equity || 0)}</td>
                  <td>
                    <div className="val-stack">
                      <span className={acc.ddPct > 0 ? 'loss-text' : ''}>{formatPercent(acc.ddPct || 0)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="val-stack">
                      <span className={(acc.dayProfit || 0) >= 0 ? 'profit-text' : 'loss-text'}>
                        {(acc.dayProfit || 0) >= 0 ? '+' : ''}{formatCurrency(acc.dayProfit || 0)}
                      </span>
                      <span className={`pct-small ${(acc.dayProfit || 0) >= 0 ? 'profit-text' : 'loss-text'}`}>
                        {((acc.dayProfit || 0) / gross * 100).toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="val-stack">
                      <span className={(acc.weekProfit || 0) >= 0 ? 'profit-text' : 'loss-text'}>
                        {(acc.weekProfit || 0) >= 0 ? '+' : ''}{formatCurrency(acc.weekProfit || 0)}
                      </span>
                      <span className={`pct-small ${(acc.weekProfit || 0) >= 0 ? 'profit-text' : 'loss-text'}`}>
                        {((acc.weekProfit || 0) / gross * 100).toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="val-stack">
                      <span className={(acc.monthProfit || 0) >= 0 ? 'profit-text' : 'loss-text'}>
                        {(acc.monthProfit || 0) >= 0 ? '+' : ''}{formatCurrency(acc.monthProfit || 0)}
                      </span>
                      <span className={`pct-small ${(acc.monthProfit || 0) >= 0 ? 'profit-text' : 'loss-text'}`}>
                        {((acc.monthProfit || 0) / gross * 100).toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{acc.meta || '--'}</td>
                  <td>
                    <div className="val-stack">
                      <span className={(acc.totalProfit || 0) >= 0 ? 'profit-text' : 'loss-text'}>
                        {(acc.totalProfit || 0) >= 0 ? '+' : ''}{formatCurrency(acc.totalProfit || 0)}
                      </span>
                      <span className={`pct-small ${(acc.totalProfit || 0) >= 0 ? 'profit-text' : 'loss-text'}`}>
                        {((acc.totalProfit || 0) / gross * 100).toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td>{acc.tradesToday || 0}</td>
                  <td className={acc.activeEAs > 0 ? 'profit-text' : 'loss-text'}>
                    {acc.activeEAs || 0} EAs
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function App() {
  const [accounts, setAccounts] = useState([{ ...fallbackData, account: 'Offline' }]);
  const [robotsInfo, setRobotsInfo] = useState({});
  const [status, setStatus] = useState('Desconectado');
  const [selectedRobot, setSelectedRobot] = useState(null);
  const [currentView, setCurrentView] = useState('home'); // 'home' or account string
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    // Fetch Robot Detail Info from Sheets once or periodically
    const fetchRobotsInfo = async () => {
      try {
        const response = await fetch('/api/robots-info');
        if (response.ok) {
          const info = await response.json();
          setRobotsInfo(info);
        }
      } catch (e) {
        console.error("Sheets info error:", e);
      }
    };
    fetchRobotsInfo();

    const fetchData = async () => {
      try {
        const response = await fetch('/api/data');
        if (response.ok) {
          const result = await response.json();

          if (Array.isArray(result)) {
            setAccounts(result.length > 0 ? result : [{ ...fallbackData, account: 'Offline' }]);
          } else {
            const accountOriginal = { ...result, account: result.account || 'Desconhecida' };
            setAccounts([accountOriginal]);
          }
          setStatus('Sincronizado');
        } else {
          setStatus('EA Off');
        }
      } catch (error) {
        setStatus('Desconectado');
      }
    };

    fetchData();
    const fetchTimer = setInterval(fetchData, 60000);

    return () => clearInterval(fetchTimer);
  }, []);

  const activeAccountData = accounts.find(a => a.account === currentView) || accounts[0];

  const handleToggleSidebar = () => setIsSidebarOpen(prev => !prev);

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className={`app-sidebar ${isSidebarOpen ? '' : 'closed'}`}>
        <div className="sidebar-logo">Nautilus<br /><span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-muted)', letterSpacing: '1px' }}>WEALTH MANAGER</span></div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentView('home')}
          >
            🏠 Home (Visão Global)
          </button>

          <div className="nav-group">Contas de Operação</div>
          {accounts.map(acc => (
            <button
              key={acc.account}
              className={`nav-item ${currentView === acc.account ? 'active' : ''}`}
              onClick={() => setCurrentView(acc.account)}
            >
              💼 {acc.account}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {currentView === 'home' ? (
          <HomeView accounts={accounts} status={status} toggleSidebar={handleToggleSidebar} />
        ) : (
          <AccountView data={activeAccountData} status={status} setSelectedRobot={setSelectedRobot} toggleSidebar={handleToggleSidebar} />
        )}

        <footer>
          Plataforma em tempo real para <strong>Múltiplas Contas</strong>.<br />
          Desenvolvido por <a href="https://www.nautilusinvesting.com" target="_blank" rel="noopener noreferrer">Nautilus Investing</a> • 2026
        </footer>
      </main>

      <RobotModal
        robot={selectedRobot}
        robotInfo={selectedRobot ? robotsInfo[selectedRobot.comment?.trim()] : null}
        onClose={() => setSelectedRobot(null)}
      />
    </div>
  );
}

export default App;
