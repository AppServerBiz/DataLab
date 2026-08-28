import axios from 'axios';

const API_URL = '/api';
const api = axios.create({ baseURL: API_URL, timeout: 60000 });

export const uploadFiles = async (files: File[]) => {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  const res = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const uploadMergeFiles = async (files: File[], customName?: string) => {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  if (customName && customName.trim()) {
    formData.append('customName', customName.trim());
  }
  const res = await api.post('/upload-merge', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const fetchComparativo = async () => {
  const res = await api.get('/comparativo');
  return res.data;
};

export const fetchRobots = async () => {
  const res = await api.get('/robots');
  return res.data;
};

export const fetchEquityCurve = async (id: string) => {
  const res = await api.get(`/robot/${id}/equity`);
  return res.data;
};

export const fetchRobotInfo = async (id: string) => {
  const res = await api.get(`/robot/${id}/info`);
  return res.data;
};

export const approveRobot = async (id: string) => {
  const res = await api.post(`/robot/${id}/approve`);
  return res.data;
};

export const deleteRobot = async (id: string) => {
  const res = await api.delete(`/robot/${id}`);
  return res.data;
};

export const clearComparativo = async () => {
  const res = await api.delete('/comparativo/clear');
  return res.data;
};

// ── Portfolio API ──────────────────────────────────────────
export const fetchPortfolios = async () => (await api.get('/portfolios')).data;
export const createPortfolio = async (data: { name: string; capital: number; target_dd: number }) =>
  (await api.post('/portfolios', data)).data;
export const updatePortfolio = async (id: string, data: { name: string; capital: number; target_dd: number, locked?: boolean }) =>
  (await api.put(`/portfolios/${id}`, data)).data;
export const deletePortfolio = async (id: string) => (await api.delete(`/portfolios/${id}`)).data;
export const copyPortfolio = async (id: string) => (await api.post(`/portfolios/${id}/copy`)).data;

export const fetchPortfolioRobots = async (id: string) => (await api.get(`/portfolios/${id}/robots`)).data;
export const addRobotToPortfolio = async (portfolioId: string, robotId: string, weight: number) =>
  (await api.post(`/portfolios/${portfolioId}/robots`, { robot_id: robotId, weight })).data;
export const updateRobotWeight = async (portfolioId: string, robotId: string, weight: number) =>
  (await api.put(`/portfolios/${portfolioId}/robots/${robotId}`, { weight })).data;
export const removeRobotFromPortfolio = async (portfolioId: string, robotId: string) =>
  (await api.delete(`/portfolios/${portfolioId}/robots/${robotId}`)).data;

export const fetchPortfolioStats = async (id: string) => (await api.get(`/portfolios/${id}/stats`)).data;
export const getExportPortfolioUrl = (id: string) => `${API_URL}/portfolios/${id}/export-nautilus`;

// ── Portfolio Optimization API ─────────────────────────────
export const optimizePortfolioWeights = async (portfolioId: string) =>
  (await api.post(`/portfolios/${portfolioId}/optimize-weights`)).data;
export const applyOptimizedWeights = async (portfolioId: string, weights: { robot_id: string, weight: number }[]) => {
  for (const w of weights) {
    await api.put(`/portfolios/${portfolioId}/robots/${w.robot_id}`, { weight: w.weight });
  }
  return { success: true };
};

// ── IA API ────────────────────────────────────────────────
export const fetchIAInfo = async (type: 'robot' | 'portfolio', id: string) =>
  (await api.get(`/ia/info/${type}/${id}`)).data;

export const chatWithIA = async (messages: any[], context: string) =>
  (await api.post('/ia/chat', { messages, context })).data;

// ── Strategy AI Studio API ────────────────────────────────
export const analyzeStrategyFiles = async (payload: {
  robotName?: string;
  setContent?: string;
  htmlContent?: string;
  mqlCode?: string;
  docText?: string;
  userRational?: string;
}) => (await api.post('/ia/strategy-analyze', payload)).data;

export const chatStrategyLab = async (messages: any[], context: string) =>
  (await api.post('/ia/strategy-chat', { messages, context })).data;

