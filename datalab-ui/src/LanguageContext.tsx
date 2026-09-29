import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'pt' | 'en' | 'es';

export interface Translations {
  [key: string]: {
    pt: string;
    en: string;
    es: string;
  };
}

export const translations = {
  // Common / Global
  'common.loading': { pt: 'Carregando...', en: 'Loading...', es: 'Cargando...' },
  'common.syncing': { pt: 'Sincronizando...', en: 'Syncing...', es: 'Sincronizando...' },
  'common.update': { pt: 'Atualizar', en: 'Refresh', es: 'Actualizar' },
  'common.cancel': { pt: 'Cancelar', en: 'Cancel', es: 'Cancelar' },
  'common.confirm': { pt: 'Confirmar', en: 'Confirm', es: 'Confirmar' },
  'common.save': { pt: 'Salvar', en: 'Save', es: 'Guardar' },
  'common.delete': { pt: 'Excluir', en: 'Delete', es: 'Eliminar' },
  'common.edit': { pt: 'Editar', en: 'Edit', es: 'Editar' },
  'common.actions': { pt: 'Ações', en: 'Actions', es: 'Acciones' },
  'common.status': { pt: 'Status', en: 'Status', es: 'Estado' },
  'common.name': { pt: 'Nome', en: 'Name', es: 'Nombre' },
  'common.asset': { pt: 'Ativo', en: 'Asset', es: 'Activo' },
  'common.timeframe': { pt: 'Timeframe', en: 'Timeframe', es: 'Temporalidad' },
  'common.capital': { pt: 'Capital', en: 'Capital', es: 'Capital' },
  'common.drawdown': { pt: 'Drawdown', en: 'Drawdown', es: 'Drawdown' },
  'common.profit': { pt: 'Lucro', en: 'Profit', es: 'Beneficio' },
  'common.roi': { pt: 'Retorno %', en: 'Return %', es: 'Retorno %' },
  'common.weight': { pt: 'Peso', en: 'Weight', es: 'Peso' },
  'common.all': { pt: 'Todos', en: 'All', es: 'Todos' },
  'common.details': { pt: 'Detalhes', en: 'Details', es: 'Detalles' },
  'common.back': { pt: 'Voltar', en: 'Back', es: 'Volver' },
  'common.search': { pt: 'Buscar...', en: 'Search...', es: 'Buscar...' },
  'common.clear': { pt: 'Limpar', en: 'Clear', es: 'Limpiar' },
  'common.success': { pt: 'Sucesso', en: 'Success', es: 'Éxito' },
  'common.error': { pt: 'Erro', en: 'Error', es: 'Error' },

  // Sidebar
  'sidebar.overview': { pt: 'Visão Geral', en: 'Overview', es: 'Visión General' },
  'sidebar.diagnostico': { pt: 'Diagnóstico', en: 'Diagnostics', es: 'Diagnóstico' },
  'sidebar.studio': { pt: 'AI Studio', en: 'AI Studio', es: 'AI Studio' },
  'sidebar.repositorio': { pt: 'Repositório', en: 'Repository', es: 'Repositorio' },
  'sidebar.portfolio': { pt: 'Portfólio', en: 'Portfolio', es: 'Portafolio' },
  'sidebar.manage': { pt: '+ Gerenciar', en: '+ Manage', es: '+ Gestionar' },
  'sidebar.transmitir': { pt: 'Transmitir', en: 'Broadcast VPS', es: 'Transmitir VPS' },
  'sidebar.ia': { pt: 'AI Analytics', en: 'AI Analytics', es: 'AI Analytics' },
  'sidebar.loggedInAs': { pt: 'Logado como', en: 'Logged in as', es: 'Conectado como' },
  'sidebar.logout': { pt: 'Sair', en: 'Logout', es: 'Cerrar sesión' },
  'sidebar.detecting': { pt: 'Detectando...', en: 'Detecting...', es: 'Detectando...' },
  'sidebar.language': { pt: 'Idioma', en: 'Language', es: 'Idioma' },

  // Login
  'login.title': { pt: 'Acesso Restrito', en: 'Restricted Access', es: 'Acceso Restringido' },
  'login.subtitle': { pt: 'Terminal Quantitativo de Alta Frequência', en: 'High-Frequency Quantitative Terminal', es: 'Terminal Cuantitativo de Alta Frecuencia' },
  'login.welcomeBack': { pt: 'Bem-vindo de volta', en: 'Welcome back', es: 'Bienvenido de nuevo' },
  'login.accessMsg': { pt: 'Acesse a plataforma com sua credencial.', en: 'Access the platform with your credentials.', es: 'Acceda a la plataforma con su credencial.' },
  'login.keyPlaceholder': { pt: 'Chave de Acesso / Identificador', en: 'Access Key / Identifier', es: 'Clave de Acceso / Identificador' },
  'login.enterBtn': { pt: 'Entrar no Sistema', en: 'Enter System', es: 'Entrar al Sistema' },
  'login.authenticating': { pt: 'Autenticando...', en: 'Authenticating...', es: 'Autenticando...' },
  'login.exclusive': { pt: 'Acesso exclusivo a Nautilus Investing.', en: 'Exclusive access to Nautilus Investing.', es: 'Acceso exclusivo a Nautilus Investing.' },
  'login.monitoringActive': { pt: 'SISTEMA DE MONITORAMENTO ATIVO', en: 'ACTIVE MONITORING SYSTEM', es: 'SISTEMA DE MONITOREO ACTIVO' },
  'login.warningNotice': { 
    pt: 'ATENÇÃO: Tentativas de acesso não autorizado, força bruta ou varredura de portas serão registradas e reportadas imediatamente às autoridades competentes de segurança cibernética. Seus metadados de conexão estão sendo gravados em tempo real.', 
    en: 'WARNING: Unauthorized access attempts, brute force, or port scanning will be immediately logged and reported to competent cybersecurity authorities. Your connection metadata is being recorded in real-time.', 
    es: 'ATENCIÓN: Los intentos de acceso no autorizado, fuerza bruta o escaneo de puertos se registrarán y reportarán de inmediato a las autoridades de ciberseguridad. Sus metadatos de conexión se están grabando en tiempo real.' 
  },
  'login.ipAddress': { pt: 'Endereço IP:', en: 'IP Address:', es: 'Dirección IP:' },
  'login.geolocation': { pt: 'Geolocalização:', en: 'Geolocation:', es: 'Geolocalización:' },
  'login.isp': { pt: 'Provedor (ISP):', en: 'Provider (ISP):', es: 'Proveedor (ISP):' },
  'login.systemHardware': { pt: 'Sistema / Hardware:', en: 'System / Hardware:', es: 'Sistema / Hardware:' },
  'login.browserResolution': { pt: 'Navegador / Resolução:', en: 'Browser / Resolution:', es: 'Navegador / Resolución:' },
  'login.gpuVideo': { pt: 'GPU / Vídeo:', en: 'GPU / Video:', es: 'GPU / Vídeo:' },
  'login.tlsSignature': { pt: 'Assinatura Digital TLS_AES_256_GCM ativada para este terminal.', en: 'TLS_AES_256_GCM Digital Signature active for this terminal.', es: 'Firma Digital TLS_AES_256_GCM activada para este terminal.' },
  'login.invalidKey': { pt: 'Credencial inválida. Verifique seus dados de acesso.', en: 'Invalid credentials. Check your access details.', es: 'Credencial no válida. Verifique sus datos de acceso.' },
  'login.enterUser': { pt: 'Informe seu usuário.', en: 'Please enter your user.', es: 'Ingrese su usuario.' },

  // Home / Overview
  'home.title': { pt: 'Visão Geral', en: 'Overview', es: 'Visión General' },
  'home.welcome': { 
    pt: 'Bem-vindo ao centro de comando DataLab. Monitore os melhores ativos, analise eficiência de risco x retorno e gerencie portfólios.', 
    en: 'Welcome to the DataLab command center. Monitor top strategies, evaluate risk-return efficiency, and manage portfolios.', 
    es: 'Bienvenido al centro de mando de DataLab. Supervise los mejores activos, analice la eficiencia riesgo-retorno y gestione carteras.' 
  },
  'home.top5Title': { pt: 'Top 5 Robôs por', en: 'Top 5 Robots by', es: 'Top 5 Robots por' },
  'home.top5Desc': { 
    pt: 'Selecione a métrica desejada para visualizar o gráfico dos robôs de maior performance no repositório.', 
    en: 'Select the desired metric to view the performance chart of top strategies in repository.', 
    es: 'Seleccione la métrica deseada para visualizar el gráfico de los robots con mayor rendimiento.' 
  },
  'home.metricProfit': { pt: 'Lucratividade', en: 'Profitability', es: 'Rentabilidad' },
  'home.metricDD': { pt: 'Drawdown', en: 'Drawdown', es: 'Drawdown' },
  'home.metricLLDD': { pt: 'LL/DD %', en: 'Profit/DD %', es: 'Beneficio/DD %' },
  'home.noDataRobots': { pt: 'Nenhum dado de robô aprovado disponível.', en: 'No approved robot data available.', es: 'No hay datos de robots aprobados disponibles.' },
  'home.top5CardsTitle': { pt: 'Top 5 Robôs — Detalhado Risco × Retorno', en: 'Top 5 Robots — Detailed Risk × Return', es: 'Top 5 Robots — Detallado Riesgo × Retorno' },
  'home.top5CardsDesc': { 
    pt: 'Detalhamento individual de cada robô no repositório com dados de performance e alocação de multiplicadores.', 
    en: 'Individual breakdown of repository robots with performance statistics and weight allocations.', 
    es: 'Desglose individual de cada robot con estadísticas de rendimiento y asignación de pesos.' 
  },
  'home.weightLabel': { pt: 'Peso:', en: 'Weight:', es: 'Peso:' },
  'home.estProfit': { pt: 'Lucro Est. Mês:', en: 'Est. Monthly Profit:', es: 'Beneficio Est. Mes:' },
  'home.estDD': { pt: 'DD Estimado:', en: 'Est. Drawdown:', es: 'DD Estimado:' },
  'home.combinedCurveTitle': { pt: 'Simulação da Curva Combinada (Top 5 Robôs)', en: 'Combined Curve Simulation (Top 5 Robots)', es: 'Simulación de Curva Combinada (Top 5 Robots)' },
  'home.combinedCurveDesc': { 
    pt: 'Projeção combinada ponderada dos 5 robôs líderes atuando simultaneamente sobre um capital de $100,000.', 
    en: 'Weighted combined projection of the top 5 leading robots running simultaneously over $100,000 capital.', 
    es: 'Proyección combinada ponderada de los 5 robots líderes operando simultáneamente sobre un capital de $100,000.' 
  },
  'home.topPortfoliosTitle': { pt: 'Top 5 Portfólios — Melhor Eficiência (Risco × Retorno)', en: 'Top 5 Portfolios — Best Efficiency (Risk × Return)', es: 'Top 5 Portafolios — Mejor Eficiencia (Riesgo × Retorno)' },
  'home.topPortfoliosDesc': { 
    pt: 'Classificação dos portfólios existentes ordenados pelo maior Fator LL/DD (Relação Lucro Mensal vs Drawdown Máximo).', 
    en: 'Ranking of existing portfolios ordered by highest Profit/DD Factor (Monthly Profit vs Maximum Drawdown).', 
    es: 'Clasificación de carteras existentes ordenadas por el mayor Factor Beneficio/DD (Beneficio Mensual vs Drawdown Máximo).' 
  },
  'home.robotsCount': { pt: 'robôs alocados', en: 'allocated robots', es: 'robots asignados' },
  'home.viewPortfolio': { pt: 'Ver Portfólio', en: 'View Portfolio', es: 'Ver Portafolio' },
  'home.noPortfolios': { pt: 'Nenhum portfólio cadastrado ainda.', en: 'No portfolios registered yet.', es: 'Aún no hay portafolios registrados.' },
  'home.createPortfolio': { pt: 'Criar Portfólio', en: 'Create Portfolio', es: 'Crear Portafolio' },

  // Diagnostico
  'diag.title': { pt: 'Diagnóstico de Estratégias', en: 'Strategy Diagnostics', es: 'Diagnóstico de Estrategias' },
  'diag.uploadTitle': { pt: 'Upload de Backtests (HTML / CSV / Merge)', en: 'Upload Backtests (HTML / CSV / Merge)', es: 'Subida de Backtests (HTML / CSV / Merge)' },
  'diag.dropzoneText': { pt: 'Arraste relatórios HTML / CSV ou clique para selecionar', en: 'Drag HTML / CSV reports or click to select', es: 'Arrastre informes HTML / CSV o haga clic para seleccionar' },
  'diag.singleUpload': { pt: 'Upload Individual', en: 'Single Upload', es: 'Subida Individual' },
  'diag.mergeUpload': { pt: 'Mesclar Períodos (Merge)', en: 'Merge Periods', es: 'Fusionar Períodos' },
  'diag.clearComparative': { pt: 'Limpar Comparativo', en: 'Clear Comparison', es: 'Limpiar Comparativa' },
  'diag.comparativeTable': { pt: 'Tabela Comparativa de Estratégias', en: 'Strategy Comparison Table', es: 'Tabla Comparativa de Estrategias' },
  'diag.approve': { pt: 'Aprovar', en: 'Approve', es: 'Aprobar' },
  'diag.approved': { pt: 'Aprovado', en: 'Approved', es: 'Aprobado' },
  'diag.pending': { pt: 'Pendente', en: 'Pending', es: 'Pendiente' },
  'diag.seeDD': { pt: 'Ver DD', en: 'View DD', es: 'Ver DD' },
  'diag.info': { pt: 'Info', en: 'Info', es: 'Info' },

  // Repositorio
  'repo.title': { pt: 'Repositório de Estratégias', en: 'Strategy Repository', es: 'Repositorio de Estrategias' },
  'repo.subtitle': { pt: 'Banco central de robôs aprovados e ativos prontos para composição de carteiras.', en: 'Central library of approved robots and active strategies ready for portfolio construction.', es: 'Banco central de robots aprobados y estrategias activas listas para carteras.' },
  'repo.approvedRobots': { pt: 'Robôs Aprovados', en: 'Approved Robots', es: 'Robots Aprobados' },
  'repo.pendingRobots': { pt: 'Robôs Pendentes de Revisão', en: 'Robots Pending Review', es: 'Robots Pendientes de Revisión' },
  'repo.noRobots': { pt: 'Nenhum robô encontrado no repositório.', en: 'No robots found in repository.', es: 'No se encontraron robots en el repositorio.' },
  'repo.confirmDeleteTitle': { pt: 'Excluir Estratégia', en: 'Delete Strategy', es: 'Eliminar Estrategia' },
  'repo.confirmDeleteMsg': { pt: 'Tem certeza que deseja remover esta estratégia do repositório? Esta ação é irreversível.', en: 'Are you sure you want to remove this strategy from the repository? This action cannot be undone.', es: '¿Está seguro de que desea eliminar esta estrategia del repositorio? Esta acción es irreversible.' },

  // Portfolio
  'portfolio.title': { pt: 'Gestão de Portfólios', en: 'Portfolio Management', es: 'Gestión de Portafolios' },
  'portfolio.newPortfolio': { pt: 'Novo Portfólio', en: 'New Portfolio', es: 'Nuevo Portafolio' },
  'portfolio.fundCapital': { pt: 'Capital do Fundo', en: 'Fund Capital', es: 'Capital del Fondo' },
  'portfolio.targetDD': { pt: 'DD Alvo do Fundo', en: 'Target DD', es: 'DD Objetivo' },
  'portfolio.lock': { pt: 'Travar', en: 'Lock', es: 'Bloquear' },
  'portfolio.unlock': { pt: 'Destravar', en: 'Unlock', es: 'Desbloquear' },
  'portfolio.exportReport': { pt: 'Relatório', en: 'Report', es: 'Informe' },
  'portfolio.optimizeWeights': { pt: 'Otimizar Pesos', en: 'Optimize Weights', es: 'Optimizar Pesos' },
  'portfolio.availableRobots': { pt: 'Robôs Disponíveis', en: 'Available Robots', es: 'Robots Disponibles' },
  'portfolio.allocatedRobots': { pt: 'Robôs no Portfólio', en: 'Portfolio Robots', es: 'Robots en el Portafolio' },
  'portfolio.addRobot': { pt: '+ Adicionar Robô', en: '+ Add Robot', es: '+ Añadir Robot' },
  'portfolio.removeRobot': { pt: 'Remover', en: 'Remove', es: 'Quitar' },
  'portfolio.metricsOverview': { pt: 'Métricas Consolidadas', en: 'Consolidated Metrics', es: 'Métricas Consolidadas' },
  'portfolio.monthlyProfit': { pt: 'Lucro Méd. Mês', en: 'Avg Monthly Profit', es: 'Beneficio Med. Mes' },
  'portfolio.maxDD': { pt: 'DD Máx Portfólio', en: 'Portfolio Max DD', es: 'DD Máx Portafolio' },
  'portfolio.var95': { pt: 'VaR 95% (Prob.)', en: 'VaR 95% (Prob.)', es: 'VaR 95% (Prob.)' },
  'portfolio.correlationMatrix': { pt: 'Matriz de Correlação e Risco', en: 'Correlation & Risk Matrix', es: 'Matriz de Correlación y Riesgo' },
  'portfolio.equityCurve': { pt: 'Curva de Patrimônio Consolidada', en: 'Consolidated Equity Curve', es: 'Curva de Patrimonio Consolidada' },
  'portfolio.confirmDelete': { pt: 'Excluir Portfólio', en: 'Delete Portfolio', es: 'Eliminar Portafolio' },
  'portfolio.copy': { pt: 'Duplicar', en: 'Duplicate', es: 'Duplicar' },

  // Detailed Portfolio Quadrants & Metrics
  'portfolio.calculatingMetrics': { pt: 'Calculando métricas do portfólio...', en: 'Calculating portfolio metrics...', es: 'Calculando métricas del portafolio...' },
  'portfolio.emptyDropText': { pt: 'Portfólio vazio. Arraste robôs da barra lateral para cá.', en: 'Empty portfolio. Drag robots from the sidebar here.', es: 'Portafolio vacío. Arrastre robots de la barra lateral aquí.' },
  'portfolio.roiMonth': { pt: 'ROI MÊS', en: 'MONTHLY ROI', es: 'ROI MENSUAL' },
  'portfolio.ddMaxConsolidated': { pt: 'DD MAX PORTF.', en: 'PORTFOLIO MAX DD', es: 'DD MÁX PORTAF.' },
  'portfolio.consolidated': { pt: 'Consolidado', en: 'Consolidated', es: 'Consolidado' },
  'portfolio.ddMaxPct': { pt: 'DD MAX %', en: 'MAX DD %', es: 'DD MÁX %' },
  'portfolio.ddMaxSumDollar': { pt: 'DD MAX SOMA $', en: 'SUM MAX DD $', es: 'SUMA DD MÁX $' },
  'portfolio.ddMaxSumPct': { pt: 'DD MAX SOMA %', en: 'SUM MAX DD %', es: 'SUMA DD MÁX %' },
  'portfolio.individualSum': { pt: 'Soma Individual', en: 'Individual Sum', es: 'Suma Individual' },
  'portfolio.riskBudget': { pt: 'Risk Budget', en: 'Risk Budget', es: 'Presupuesto de Riesgo' },
  'portfolio.probDD': { pt: '95% Prob. DD', en: '95% Prob. DD', es: '95% Prob. DD' },
  'portfolio.llddFactor': { pt: 'LL/DD FATOR', en: 'PROFIT/DD FACTOR', es: 'FACTOR B/DD' },
  'portfolio.totalTrades': { pt: 'TOTAL TRADES', en: 'TOTAL TRADES', es: 'TOTAL TRADES' },
  'portfolio.sumLots': { pt: 'SOMA LOTES', en: 'SUM LOTS', es: 'SUMA LOTES' },
  'portfolio.lotsMonth': { pt: 'LOTES MÊS', en: 'LOTS/MONTH', es: 'LOTES/MES' },

  // Portfolio Table Headers
  'portfolio.thRobot': { pt: 'ROBÔ', en: 'ROBOT', es: 'ROBOT' },
  'portfolio.thAsset': { pt: 'ATIVO', en: 'ASSET', es: 'ACTIVO' },
  'portfolio.thWeightLot': { pt: 'PESO LOTE', en: 'LOT WEIGHT', es: 'PESO LOTE' },
  'portfolio.thDDWeight': { pt: 'DD × PESO', en: 'DD × WEIGHT', es: 'DD × PESO' },
  'portfolio.thProfitWeight': { pt: 'LUCRO × PESO', en: 'PROFIT × WEIGHT', es: 'BENEFICIO × PESO' },
  'portfolio.thVarRB': { pt: 'VaR RB', en: 'VaR RB', es: 'VaR RB' },
  'portfolio.thFCorrel': { pt: 'F. CORREL.', en: 'CORREL. F.', es: 'F. CORREL.' },
  'portfolio.thLLDD': { pt: 'LL/DD %', en: 'PROFIT/DD %', es: 'B/DD %' },
  'portfolio.thReturnPct': { pt: 'RETORNO %', en: 'RETURN %', es: 'RETORNO %' },
  'portfolio.thActions': { pt: 'AÇÕES', en: 'ACTIONS', es: 'ACCIONES' },

  // Portfolio Charts Titles
  'portfolio.chartClosedBalance': { pt: 'Curva de Saldo Fechado (Consolidado) ($)', en: 'Closed Balance Curve (Consolidated) ($)', es: 'Curva de Saldo Cerrado (Consolidado) ($)' },
  'portfolio.chartIndividualRobots': { pt: 'Curva Individual por Robô (Saldo Fechado) ($)', en: 'Individual Robot Curve (Closed Balance) ($)', es: 'Curva Individual por Robot (Saldo Cerrado) ($)' },
  'portfolio.chartTop10Profit': { pt: 'Top 10 Robôs por Lucro Total ($)', en: 'Top 10 Robots by Total Profit ($)', es: 'Top 10 Robots por Beneficio Total ($)' },
  'portfolio.chartProfitDist': { pt: 'Distribuição de Lucro (%)', en: 'Profit Distribution (%)', es: 'Distribución de Beneficio (%)' },
  'portfolio.chartRealTimeDD': { pt: 'Exposição (Drawdown) em Tempo Real ($)', en: 'Real-Time Drawdown Exposure ($)', es: 'Exposición (Drawdown) en Tiempo Real ($)' },
  'portfolio.chartIndividualDD': { pt: 'Drawdown Individual por Robô (%)', en: 'Individual Robot Drawdown (%)', es: 'Drawdown Individual por Robot (%)' },
  'portfolio.chartTop10DDDay': { pt: 'Top 10 Maiores Drawdowns (Dia)', en: 'Top 10 Greatest Drawdowns (Day)', es: 'Top 10 Mayores Drawdowns (Día)' },

  // Monthly Table
  'portfolio.histProfitability': { pt: 'Rentabilidade Histórica', en: 'Historical Returns', es: 'Rentabilidad Histórica' },
  'portfolio.year': { pt: 'ANO', en: 'YEAR', es: 'AÑO' },
  'portfolio.yearTotal': { pt: 'No ano', en: 'Year Total', es: 'En el año' },
  'portfolio.monthlySubtitle': { pt: '% Capital ({cap}) | Lucro líquido | Risk Budget', en: '% Capital ({cap}) | Net Profit | Risk Budget', es: '% Capital ({cap}) | Beneficio neto | Risk Budget' },
  'portfolio.riskBudgetNote': { pt: 'Risk Budget (Drawdown Máximo de Exposição): Representa o maior rebaixamento financeiro acumulado no mês (orçamento de risco consumido).', en: 'Risk Budget (Maximum Exposure Drawdown): Represents the largest accumulated drawdown in the month (consumed risk budget).', es: 'Risk Budget (Drawdown Máximo de Exposición): Representa la mayor pérdida acumulada en el mes (presupuesto de riesgo consumido).' },
  'portfolio.calcNote': { pt: 'Nota de Cálculo: Os percentuais não consideram juros compostos; o cálculo é realizado assumindo o saque total do lucro mês a mês sobre o capital inicial.', en: 'Calculation Note: Percentages do not compound; calculations assume full withdrawal of monthly profits over initial capital.', es: 'Nota de Cálculo: Los porcentajes no consideran interés compuesto; el cálculo asume el retiro total del beneficio mensual sobre el capital inicial.' },
  'portfolio.partialHistoryNote': { pt: 'Aviso de Histórico Parcial: Robôs sinalizados com (*) possuem dados que não cobrem todo o período. Meses sem operação são tratados como zero ou estimados via média.', en: 'Partial History Notice: Robots marked with (*) have data that does not cover the full period. Unoperated months are treated as zero or estimated.', es: 'Aviso de Historial Parcial: Los robots con (*) tienen datos que no cubren todo el período. Los meses sin operación se tratan como cero o se estiman.' },

  // Quadrants: Decision & TTM
  'portfolio.decisionTTM': { pt: 'Tomada de Decisão (Últimos 12 Meses)', en: 'Decision Making (Last 12 Months)', es: 'Toma de Decisiones (Últimos 12 Meses)' },
  'portfolio.recentWindow': { pt: 'JANELA RECENTE', en: 'RECENT WINDOW', es: 'VENTANA RECIENTE' },
  'portfolio.strategy': { pt: 'ESTRATÉGIA', en: 'STRATEGY', es: 'ESTRATEGIA' },
  'portfolio.profit': { pt: 'LUCRO', en: 'PROFIT', es: 'BENEFICIO' },
  'portfolio.maxDDShort': { pt: 'MAX DD', en: 'MAX DD', es: 'MAX DD' },
  'portfolio.lots': { pt: 'LOTES', en: 'LOTS', es: 'LOTES' },
  'portfolio.compareRecentPast': { pt: 'Comparativo: Recente vs Histórico', en: 'Comparison: Recent vs Historical', es: 'Comparativo: Reciente vs Histórico' },
  'portfolio.metric': { pt: 'MÉTRICA', en: 'METRIC', es: 'MÉTRICA' },
  'portfolio.last12M': { pt: 'ÚLT. 12M', en: 'LAST 12M', es: 'ÚLT. 12M' },
  'portfolio.weightedRemaining': { pt: 'RESTANTE PONDERADO', en: 'WEIGHTED REMAINING', es: 'RESTANTE PONDERADO' },
  'portfolio.sumRemaining': { pt: 'RESTANTE SOMA', en: 'SUM REMAINING', es: 'RESTANTE SUMA' },
  'portfolio.totalProfit': { pt: 'Lucro Total', en: 'Total Profit', es: 'Beneficio Total' },
  'portfolio.numTrades': { pt: 'Número de Trades', en: 'Number of Trades', es: 'Número de Trades' },
  'portfolio.maxDDPeriod': { pt: 'Max Drawdown (Período)', en: 'Max Drawdown (Period)', es: 'Max Drawdown (Período)' },
  'portfolio.var95Risk': { pt: 'VaR 95% (Risco Prob.)', en: 'VaR 95% (Prob. Risk)', es: 'VaR 95% (Riesgo Prob.)' },
  'portfolio.efficiencyLLDD': { pt: 'Eficiência (L/DD)', en: 'Efficiency (Profit/DD)', es: 'Eficiencia (B/DD)' },
  'portfolio.analysisTip': { pt: 'Análise: O "Restante Ponderado" normaliza o passado para uma janela de 12 meses, permitindo uma comparação justa de performance entre as épocas.', en: 'Analysis: "Weighted Remaining" normalizes past history to a 12-month window, enabling fair performance comparison across eras.', es: 'Análisis: El "Restante Ponderado" normaliza el pasado a una ventana de 12 meses, permitiendo una comparación justa del rendimiento entre épocas.' },
  'portfolio.dateWarning': { pt: 'Nota: Cuidado ao analisar essas métricas, pois se algum robô tiver o backtest em datas diferentes no portfólio, pode haver dados imprecisos ou calculados como média.', en: 'Note: Use caution when analyzing these metrics; if robots have differing backtest date ranges, figures may include interpolated estimates.', es: 'Nota: Tenga precaución al analizar estas métricas; si algún robot tiene backtest en fechas distintas, puede haber datos aproximados por media.' },

  // Correlation & Risk Matrices
  'portfolio.dailyCorrMatrix': { pt: 'Matriz de Correlação Diária', en: 'Daily Correlation Matrix', es: 'Matriz de Correlación Diaria' },
  'portfolio.ddRiskMatrix': { pt: 'Matriz de Impacto de Risco de Drawdown ($)', en: 'Drawdown Risk Impact Matrix ($)', es: 'Matriz de Impacto de Riesgo de Drawdown ($)' },
  'portfolio.howToRead': { pt: 'Como ler?', en: 'How to read?', es: '¿Cómo leer?' },
  'portfolio.howCalculated': { pt: 'Como é calculado?', en: 'How is it calculated?', es: '¿Cómo se calcula?' },
  'portfolio.diffRealtimeMonthly': { pt: 'Diferença entre Real-time e Mensal', en: 'Difference between Real-time and Monthly', es: 'Diferencia entre Real-time y Mensual' },
  'portfolio.matrixDiagonalNote': { pt: 'Diagonal (Cinza): Risco próprio de Drawdown de cada estratégia escalado pelo seu peso.', en: 'Diagonal (Gray): Strategy individual Drawdown risk scaled by its weight.', es: 'Diagonal (Gris): Riesgo propio de Drawdown de cada estrategia ajustado por su peso.' },
  'portfolio.matrixOffDiagNote': { pt: 'Fora da Diagonal: Impacto financeiro no portfólio decorrente da correlação.', en: 'Off-Diagonal: Financial impact on the portfolio resulting from correlation.', es: 'Fuera de la Diagonal: Impacto financiero en el portafolio debido a la correlación.' },
  'portfolio.matrixGreenNote': { pt: 'Valores Negativos (-): Benefício real da diversificação (reduz o risco consolidado).', en: 'Negative Values (-): Real diversification benefit (reduces consolidated risk).', es: 'Valores Negativos (-): Beneficio real de la diversificación (reduce el riesgo consolidado).' },
  'portfolio.matrixRedNote': { pt: 'Valores Positivos (+): Risco adicionado (aumenta o risco consolidado).', en: 'Positive Values (+): Added risk (increases consolidated risk).', es: 'Valores Positivos (+): Riesgo añadido (aumenta el riesgo consolidado).' },

  // 6 Portfolio Methods Section
  'portfolio.methodsTitle': { pt: 'Cálculo Comparativo dos 6 Métodos no Portfólio Atual', en: 'Comparative Calculation of 6 Portfolio Methods', es: 'Cálculo Comparativo de los 6 Métodos en la Cartera Actual' },
  'portfolio.methodsSubtitle': { pt: 'Resultados quantitativos calculados em tempo real para o portfólio', en: 'Real-time quantitative calculations for portfolio', es: 'Resultados cuantitativos calculados en tiempo real para el portafolio' },
  'portfolio.strategiesAnalyzed': { pt: 'Estratégias Analisadas', en: 'Strategies Analyzed', es: 'Estrategias Analizadas' },
  'portfolio.method1Title': { pt: '1. Nautilus Quant (Configuração Atual)', en: '1. Nautilus Quant (Current Setup)', es: '1. Nautilus Quant (Configuración Actual)' },
  'portfolio.running': { pt: 'Em Execução', en: 'In Use', es: 'En Ejecución' },
  'portfolio.method2Title': { pt: '2. Hierarchical Risk Parity (HRP)', en: '2. Hierarchical Risk Parity (HRP)', es: '2. Hierarchical Risk Parity (HRP)' },
  'portfolio.topEfficiency': { pt: 'Top Eficiência', en: 'Top Efficiency', es: 'Top Eficiencia' },
  'portfolio.method3Title': { pt: '3. Risk Parity (Paridade de Risco)', en: '3. Risk Parity (Equal Risk)', es: '3. Paridad de Riesgo (Risk Parity)' },
  'portfolio.equalization': { pt: 'Equalização', en: 'Equalization', es: 'Ecualización' },
  'portfolio.method4Title': { pt: '4. CVaR (Expected Shortfall 95%)', en: '4. CVaR (Expected Shortfall 95%)', es: '4. CVaR (Expected Shortfall 95%)' },
  'portfolio.tailRisk': { pt: 'Risco de Cauda', en: 'Tail Risk', es: 'Riesgo de Cola' },
  'portfolio.method5Title': { pt: '5. Kelly Criterion (Half-Kelly)', en: '5. Kelly Criterion (Half-Kelly)', es: '5. Criterio de Kelly (Half-Kelly)' },
  'portfolio.optimalGrowth': { pt: 'Crescimento Ótimo', en: 'Optimal Growth', es: 'Crecimiento Óptimo' },
  'portfolio.method6Title': { pt: '6. Markowitz MVO (Max Sharpe)', en: '6. Markowitz MVO (Max Sharpe)', es: '6. Markowitz MVO (Max Sharpe)' },
  'portfolio.classic': { pt: 'Clássico', en: 'Classic', es: 'Clásico' },

  // Report Specific
  'report.perfAnalysis': { pt: 'Performance Analysis', en: 'Performance Analysis', es: 'Análisis de Rendimiento' },
  'report.quantInvestments': { pt: 'Investimentos Quantitativos', en: 'Quantitative Investments', es: 'Inversiones Cuantitativas' },
  'report.issuedAt': { pt: 'Relatório emitido em:', en: 'Report generated on:', es: 'Informe emitido el:' },
  'report.detailedComposition': { pt: 'Composição Detalhada do Portfólio', en: 'Detailed Portfolio Composition', es: 'Composición Detallada de la Cartera' },
  'report.consolidatedEquity': { pt: 'Curva de Patrimônio Consolidado (Closing Balance)', en: 'Consolidated Equity Curve (Closing Balance)', es: 'Curva de Patrimonio Consolidado (Closing Balance)' },
  'report.monthlyTableTitle': { pt: 'Rentabilidade Histórica Mês a Mês', en: 'Month-by-Month Historical Returns', es: 'Rentabilidad Histórica Mes a Mes' },
  'report.benchmarkEvolution': { pt: 'Evolução de Rentabilidade Mensal vs Benchmarks', en: 'Monthly Return Evolution vs Benchmarks', es: 'Evolución de Rentabilidad Mensual vs Benchmarks' },
  'report.top10ProfitTitle': { pt: 'Lucro Acumulado por Robô (Top 10)', en: 'Cumulative Profit by Robot (Top 10)', es: 'Beneficio Acumulado por Robot (Top 10)' },
  'report.profitDistTitle': { pt: 'Distribuição de Lucro Portfólio', en: 'Portfolio Profit Distribution', es: 'Distribución de Beneficio de la Cartera' },
  'report.realTimeExposure': { pt: 'Exposição ao Risco Consolidada (Drawdown Intra-day)', en: 'Consolidated Risk Exposure (Intra-day Drawdown)', es: 'Exposición al Riesgo Consolidada (Drawdown Intra-day)' },
  'report.recent12MTitle': { pt: 'Performance Recente (Últimos 12 Meses)', en: 'Recent Performance (Last 12 Months)', es: 'Rendimiento Reciente (Últimos 12 Meses)' },
  'report.periodComparison': { pt: 'Comparativo de Período', en: 'Period Comparison', es: 'Comparativo de Período' },
  'report.decisionNote': { pt: 'Nota de Tomada de Decisão', en: 'Decision-Making Note', es: 'Nota de Toma de Decisiones' },
  'report.decisionNoteText': { pt: 'A performance dos últimos 12 meses reflete melhor a dinâmica atual do mercado. Considere robôs com Lucro/DD > 2 no período recente para maior estabilidade.', en: 'Performance over the last 12 months best captures current market dynamics. Consider strategies with Profit/DD > 2 in the recent period for greater stability.', es: 'El rendimiento de los últimos 12 meses refleja mejor la dinámica actual del mercado. Considere robots con Beneficio/DD > 2 en el período reciente para mayor estabilidad.' },
  'report.methodsGuideTitle': { pt: 'Guia Metodológico & Análise Comparativa dos 6 Métodos de Portfólio', en: 'Methodological Guide & Comparative Analysis of 6 Portfolio Methods', es: 'Guía Metodológica y Análisis Comparativo de los 6 Métodos de Cartera' },
  'report.footerNote': { pt: 'DATA_LAB Nautilus Invest · Relatório de Gestão Consolidada · © {year} All Rights Reserved', en: 'DATA_LAB Nautilus Invest · Consolidated Portfolio Management Report · © {year} All Rights Reserved', es: 'DATA_LAB Nautilus Invest · Informe de Gestión Consolidada · © {year} Todos los Derechos Reservados' },

  // Table Tooltips and Headers in Diagnostico
  'diag.thRobot': { pt: 'ROBÔ', en: 'ROBOT', es: 'ROBOT' },
  'diag.thNetProfit': { pt: 'LUCRO LÍQ', en: 'NET PROFIT', es: 'BENEFICIO NETO' },
  'diag.thMaxDD': { pt: 'MAX DD', en: 'MAX DD', es: 'MAX DD' },
  'diag.thProfitFactor': { pt: 'FATOR', en: 'FACTOR', es: 'FACTOR' },
  'diag.thTrades': { pt: 'TRADES', en: 'TRADES', es: 'TRADES' },
  'diag.thTotalLots': { pt: 'LOTES', en: 'LOTS', es: 'LOTES' },
  'diag.thLotsMonth': { pt: 'L.MÊS', en: 'L.MONTH', es: 'L.MES' },
  'diag.thMaxLot': { pt: 'MAX L.', en: 'MAX L.', es: 'MAX L.' },
  'diag.thEntries': { pt: 'ENT.', en: 'ENT.', es: 'ENT.' },
  'diag.thLLDD': { pt: 'LL/DD', en: 'P/DD', es: 'B/DD' },
  'diag.thAvgProfitMonth': { pt: 'LL MÊS', en: 'NET/MO', es: 'BN MES' },
  'diag.thVaRRB': { pt: 'VaR RB', en: 'VaR RB', es: 'VaR RB' },
  'diag.thLongTrades': { pt: 'COMPRAS', en: 'LONGS', es: 'COMPRAS' },
  'diag.thShortTrades': { pt: 'VENDAS', en: 'SHORTS', es: 'VENTAS' },
  'diag.thPayoff': { pt: 'PAYOFF', en: 'PAYOFF', es: 'PAYOFF' },
  'diag.thSharpe': { pt: 'SHARPE', en: 'SHARPE', es: 'SHARPE' },
  'diag.thDeposit': { pt: 'DEP.', en: 'DEP.', es: 'DEP.' },
  'diag.approvedSection': { pt: 'Diagnósticos Aprovados', en: 'Approved Diagnostics', es: 'Diagnósticos Aprobados' },

  // Transmitir
  'transmit.title': { pt: 'Transmissão VPS', en: 'VPS Broadcast', es: 'Transmisión VPS' },
  'transmit.subtitle': { pt: 'Parâmetros e lotes consolidados para execução em servidores remotos (VPS).', en: 'Consolidated parameters and lot sizes for remote execution on VPS.', es: 'Parámetros y lotes consolidados para ejecución en servidores VPS.' },
  'transmit.print': { pt: 'Imprimir', en: 'Print', es: 'Imprimir' },
  'transmit.onlyLocked': { pt: 'Apenas portfólios travados estão aptos para transmissão em produção.', en: 'Only locked portfolios are eligible for live production broadcast.', es: 'Solo las carteras bloqueadas son aptas para transmisión en producción.' },
  'transmit.noLocked': { pt: 'Nenhum portfólio travado para transmissão.', en: 'No locked portfolios available for broadcast.', es: 'No hay portafolios bloqueados para transmitir.' },

  // AI & Studio
  'ai.title': { pt: 'AI Analytics & Consultor Quant', en: 'AI Analytics & Quant Consultant', es: 'AI Analytics & Consultor Cuantitativo' },
  'ai.selectEntity': { pt: 'Selecione um robô ou portfólio para iniciar a análise quantitativa com IA:', en: 'Select a robot or portfolio to begin quantitative AI analysis:', es: 'Seleccione un robot o portafolio para iniciar el análisis con IA:' },
  'ai.askPlaceholder': { pt: 'Faça uma pergunta sobre o desempenho, drawdowns, meses críticos...', en: 'Ask a question about performance, drawdowns, critical periods...', es: 'Haga una pregunta sobre rendimiento, drawdowns, meses críticos...' },
  'ai.send': { pt: 'Enviar', en: 'Send', es: 'Enviar' },
  'studio.title': { pt: 'AI Strategy Studio & Engenharia Reversa', en: 'AI Strategy Studio & Reverse Engineering', es: 'AI Strategy Studio & Ingeniería Inversa' },
  'studio.uploadSet': { pt: 'Upload de Arquivos (.set, .htm, .mq5)', en: 'Upload Files (.set, .htm, .mq5)', es: 'Subir Archivos (.set, .htm, .mq5)' },
  'studio.analyze': { pt: 'Analisar Estratégia com IA', en: 'Analyze Strategy with AI', es: 'Analizar Estrategia con IA' }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'pt',
  setLanguage: () => {},
  t: (key: string, defaultText?: string) => defaultText || key
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('datalab_language');
    if (saved === 'en' || saved === 'es' || saved === 'pt') {
      return saved;
    }
    // Auto-detect browser language if available
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('es')) return 'es';
    if (browserLang.startsWith('en')) return 'en';
    return 'pt';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('datalab_language', lang);
  };

  const t = (key: string, defaultText?: string): string => {
    const item = (translations as any)[key];
    if (item && item[language]) {
      return item[language];
    }
    if (item && item.pt) {
      return item.pt;
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
