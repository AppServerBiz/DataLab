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

function LoginModal({ onLogin, allUsers }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'Naut1lus') {
      onLogin('Naut1lus');
    } else {
      const found = allUsers.find(u => u.username === username);
      if (found) {
        onLogin(username);
      } else {
        setError('Usuário Inválido');
      }
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="sidebar-logo" style={{ marginBottom: '1.5rem', alignItems: 'center' }}>
          <span className="logo-small">Supervision</span>
          <span className="logo-large">Nautilus</span>
          <span className="logo-small">Ultimate</span>
        </div>
        <h1>Área de Membros</h1>
        <p>Acesse o terminal com sua credencial</p>
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="text"
            className="login-input"
            placeholder="Nome de Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
          <button type="submit" className="login-btn">Entrar no Terminal</button>
        </form>
        {error && <div className="login-error">{error}</div>}
      </div>
    </div>
  );
}

function SettingsView({ users, onUpdateUsers }) {
  const [newUsername, setNewUsername] = useState('');
  const [newAccounts, setNewAccounts] = useState('');

  const handleAdd = () => {
    if (!newUsername) return;
    const accList = newAccounts.split(',').map(s => s.trim()).filter(s => s);
    const updated = [...users, { username: newUsername, accounts: accList }];
    onUpdateUsers(updated);
    setNewUsername('');
    setNewAccounts('');
  };

  const handleRemove = (index) => {
    if (!confirm('Deseja realmente excluir este usuário?')) return;
    const updated = users.filter((_, i) => i !== index);
    onUpdateUsers(updated);
  };

  const handleUpdateAccountList = (index, value) => {
    const accList = value.split(',').map(s => s.trim()).filter(s => s);
    const updated = [...users];
    updated[index].accounts = accList;
    onUpdateUsers(updated);
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <header className="app-header">
        <div className="app-title">
          <h1>Painel de Controle de Acesso</h1>
          <p>Gerencie as permissões dos usuários e vincule terminais ativos.</p>
        </div>
      </header>

      <div className="settings-grid">
        <div className="settings-group">
          <div className="settings-title">
            <h3>Novo Acesso Cliente</h3>
          </div>
          <div className="login-form" style={{ flexDirection: 'row', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>NOME DO USUÁRIO</label>
              <input 
                className="login-input" 
                placeholder="Ex: Alpha1" 
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
              />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>NÚMEROS DAS CONTAS (SEPARADOS POR VÍRGULA)</label>
              <input 
                className="login-input" 
                placeholder="Ex: 87647958, 1529945" 
                value={newAccounts}
                onChange={e => setNewAccounts(e.target.value)}
              />
            </div>
            <button className="login-btn" onClick={handleAdd} style={{ padding: '1rem 2rem' }}>ATIVAR</button>
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-title">
            <h3>Usuários Ativos</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{users.length} FILTROS ATIVOS</span>
          </div>
          <div className="table-container">
            <table className="robots-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Contas Autorizadas (Edição Rápida)</th>
                  <th style={{ width: '150px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={i}>
                    <td className="bot-name" style={{ fontSize: '1.1rem', color: '#fff' }}>{u.username}</td>
                    <td>
                      <input 
                        className="login-input settings-table-input" 
                        value={u.accounts.join(', ')}
                        onChange={(e) => handleUpdateAccountList(i, e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-danger-soft" onClick={() => handleRemove(i)}>
                        REVOGAR ACESSO
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Nenhum usuário configurado. Os dados globais serão visíveis apenas para Naut1lus.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <p style={{ marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
        ⚠️ Alterações nas contas vinculadas são sincronizadas em tempo real.
      </p>
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
  if (!data || data.account === 'Offline') {
    return (
      <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="summary-card" style={{ textAlign: 'center' }}>
          <h3>Aguardando Conexão</h3>
          <p>Nenhuma conta vinculada está enviando dados no momento.</p>
        </div>
      </div>
    );
  }

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
          <div className={`summary-value ${tFloat > 0 ? 'profit-text' : tFloat < 0 ? 'loss-text' : ''}`}>
            {tFloat > 0 ? '+' : tFloat < 0 ? '-' : ''}{formatCurrency(Math.abs(tFloat))}
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
              <div className="summary-value equity-value" style={{ fontSize: '1.65rem', lineHeight: '1.2' }}>
                {formatCurrency(data.equity || 0)}
              </div>
              <div className="summary-subtitle" style={{ marginTop: '0' }}>Saldo Líquido (Equity)</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="summary-value" style={{ color: 'var(--text-muted)', fontSize: '1.65rem', lineHeight: '1.2' }}>
                {formatCurrency(data.balance || 0)}
              </div>
              <div className="summary-subtitle" style={{ marginTop: '0' }}>Saldo Bruto (Balance)</div>
            </div>
          </div>

          <div className="performance-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: '1.5rem' }}>
            <div className="perf-item">
              <span className="perf-label">Dia</span>
              <span className={`perf-val ${dProf >= 0 ? 'profit-text' : 'loss-text'}`} style={{ fontSize: '1.45rem' }}>{dProf > 0 ? '+' : ''}{dProf.toFixed(1)}</span>
              <span className={`pct-small ${dProf >= 0 ? 'profit-text' : 'loss-text'}`}>{((dProf) / (dbal || 1) * 100).toFixed(2)}%</span>
            </div>
            <div className="perf-item">
              <span className="perf-label">Semana</span>
              <span className={`perf-val ${wProf >= 0 ? 'profit-text' : 'loss-text'}`} style={{ fontSize: '1.45rem' }}>{wProf > 0 ? '+' : ''}{wProf.toFixed(1)}</span>
              <span className={`pct-small ${wProf >= 0 ? 'profit-text' : 'loss-text'}`}>{((wProf) / (dbal || 1) * 100).toFixed(2)}%</span>
            </div>
            <div className="perf-item">
              <span className="perf-label">Total</span>
              <span className={`perf-val ${tProf >= 0 ? 'profit-text' : 'loss-text'}`} style={{ fontSize: '1.45rem' }}>{tProf > 0 ? '+' : ''}{tProf.toFixed(1)}</span>
              <span className={`pct-small ${tProf >= 0 ? 'profit-text' : 'loss-text'}`}>{((tProf) / (dbal || 1) * 100).toFixed(2)}%</span>
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
              <div className="perf-label" style={{ marginBottom: '0.25rem' }}>ROBÔS<br/>ATRIBUÍDOS</div>
              <div className="summary-value" style={{ fontSize: '1.25rem' }}>{data.activeEAs || 0}</div>
            </div>
            <div>
              <div className="perf-label" style={{ marginBottom: '0.25rem' }}>ROBÔS<br/>OPERANDO</div>
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
              <th>Lucro Mês</th>
              <th>Lucro Total</th>
              <th>Status do Risco e Lotes</th>
              <th>Exposição Flutuante</th>
              <th>Semáforo</th>
            </tr>
          </thead>
          <tbody>
            {robotsArray.map(r => {
              const effD = r.d_tot > 0 ? (r.d_won / r.d_tot * 100).toFixed(0) : 0;
              const effM = r.m_tot > 0 ? (r.m_won / r.m_tot * 100).toFixed(0) : 0;
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
                      <span className={`metric-primary ${r.m_prof >= 0 ? 'profit-text' : 'loss-text'}`}>
                        {r.m_prof >= 0 ? '+' : ''}{(r.m_prof || 0).toFixed(2)} USD
                      </span>
                      <span className="metric-secondary">Acerto: {effM}% ({r.m_won || 0}/{r.m_tot || 0})</span>
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

function HomeView({ accounts, status, toggleSidebar, setCurrentView }) {
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
          <div>
            <h1>Gestão Global Consolidada</h1>
            <p>Visão Sintética de Múltiplas Contas Selecionadas</p>
          </div>
        </div>
        <div className={`status-badge ${status === 'Sincronizado' ? 'sync' : 'offline'}`}>
          <span className="dot">●</span> {status}
        </div>
      </header>

      <div className="account-summary">
        <div className="summary-card">
          <h3>Drawdown & Exposição</h3>
          <div className={`summary-value ${totalFloating > 0 ? 'profit-text' : totalFloating < 0 ? 'loss-text' : ''}`}>
            {totalFloating > 0 ? '+' : totalFloating < 0 ? '-' : ''}{formatCurrency(Math.abs(totalFloating))}
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
          <h3>Capital Global</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.5rem' }}>
            <div>
              <div className="summary-value equity-value" style={{ fontSize: '1.65rem', lineHeight: '1.2' }}>
                {formatCurrency(totalEquity)}
              </div>
              <div className="summary-subtitle" style={{ marginTop: '0' }}>Saldo Líquido (Equity)</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="summary-value" style={{ color: 'var(--text-muted)', fontSize: '1.65rem', lineHeight: '1.2' }}>
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
              <div className="perf-label" style={{ marginBottom: '0.25rem' }}>ROBÔS<br/>ATRIBUÍDOS</div>
              <div className="summary-value" style={{ fontSize: '1.25rem' }}>{accounts.reduce((sum, acc) => sum + (acc.activeEAs || 0), 0)}</div>
            </div>
            <div>
              <div className="perf-label" style={{ marginBottom: '0.25rem' }}>ROBÔS<br/>OPERANDO</div>
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
              <th>Meta Mes</th>
              <th>Total</th>
              <th>Trades Mês</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc, i) => {
               const gross = acc.balance || 1;
               const shortAcc = (acc.account || 'DESCONHECIDA').split('-')[0].trim().substring(0, 15).toUpperCase();
              const brokerStr = acc.broker || 'N/A';
              return (
                <tr key={i} className="oakmont-row" onClick={() => setCurrentView(acc.account)}>
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
                      <span className={(acc.totalFloating || 0) >= 0 ? 'profit-text' : 'loss-text'}>
                        {formatCurrency(acc.totalFloating || 0)}
                      </span>
                      <span className={`pct-small ${acc.ddPct > 0 ? 'loss-text' : ''}`}>
                        {formatPercent(acc.ddPct || 0)}
                      </span>
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
                   <td>{acc.tradesMonth || acc.tradesToday || 0}</td>
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
  const [accounts, setAccounts] = useState([]);
  const [users, setUsers] = useState([]);
  const [robotsInfo, setRobotsInfo] = useState({});
  const [status, setStatus] = useState('Sincronizando');
  const [selectedRobot, setSelectedRobot] = useState(null);
  const [currentView, setCurrentView] = useState('home'); // 'home' or account string or 'settings'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nautilus_user');
    }
    return null;
  });

  const handleUpdateUsers = async (newUsers) => {
    setUsers(newUsers);
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUsers)
    });
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('nautilus_user', user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('home');
    localStorage.removeItem('nautilus_user');
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const u = await response.json();
          setUsers(u);
        }
      } catch (e) {}
    };
    fetchUsers();

    const fetchRobotsInfo = async () => {
      try {
        const response = await fetch('/api/robots-info');
        if (response.ok) {
          const info = await response.json();
          setRobotsInfo(info);
        }
      } catch (e) {}
    };
    fetchRobotsInfo();

    const fetchData = async () => {
      try {
        const response = await fetch('/api/data');
        if (response.ok) {
          const result = await response.json();
          if (Array.isArray(result)) {
            setAccounts(result);
          } else if (result && result.account) {
            setAccounts([result]);
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
    const fetchTimer = setInterval(fetchData, 10000); 

    return () => clearInterval(fetchTimer);
  }, []);

  // Filtra as contas baseadas no usuário
  const filteredAccounts = accounts.filter(acc => {
    if (!currentUser) return false;
    if (currentUser === 'Naut1lus') return true;
    const userConfig = users.find(u => u.username === currentUser);
    if (!userConfig) return false;
    
    // Procura número da conta em qualquer parte da string 'account'
    const match = acc.account?.match(/\d{5,}/);
    const accNumber = match ? match[0] : '';
    return userConfig.accounts.includes(accNumber);
  });

  const activeAccountData = filteredAccounts.find(a => a.account === currentView) || filteredAccounts[0];

  if (!currentUser) {
    return <LoginModal onLogin={handleLogin} allUsers={users} />;
  }

  const handleToggleSidebar = () => setIsSidebarOpen(prev => !prev);

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className={`app-sidebar ${isSidebarOpen ? '' : 'closed'}`}>
         <div className="sidebar-header">
           <div className="sidebar-logo">
             <span className="logo-small">Supervision</span>
             <span className="logo-large">Nautilus</span>
             <span className="logo-small">Ultimate</span>
           </div>
           <button className="sidebar-toggle-btn" onClick={handleToggleSidebar} title="Recolher/Expandir Menu">☰</button>
         </div>
        <nav className="sidebar-nav">
            <button
              className={`nav-item ${currentView === 'home' ? 'active' : ''}`}
              onClick={() => setCurrentView('home')}
            >
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span className="nav-text">Gestão Global</span>
            </button>

          <div className="nav-group">Contas de Operação</div>
          {filteredAccounts.map(acc => (
            <button
              key={acc.account}
              className={`nav-item ${currentView === acc.account ? 'active' : ''}`}
              onClick={() => setCurrentView(acc.account)}
            >
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              <span className="nav-text">{acc.account}</span>
            </button>
          ))}

          {currentUser === 'Naut1lus' && (
            <>
              <div className="nav-group">Sistema</div>
              <button
                className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
                onClick={() => setCurrentView('settings')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 \
1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <span className="nav-text">Configurações</span>
              </button>
            </>
          )}
        </nav>
        <div style={{ marginTop: 'auto', padding: '0.8rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Logado: <b style={{ color: 'var(--accent-blue)' }}>{currentUser}</b></span>
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontWeight: 'bold' }}>Sair</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {currentView === 'settings' && currentUser === 'Naut1lus' ? (
          <SettingsView users={users} onUpdateUsers={handleUpdateUsers} />
        ) : currentView === 'home' ? (
          <HomeView accounts={filteredAccounts} status={status} toggleSidebar={handleToggleSidebar} setCurrentView={setCurrentView} />
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
