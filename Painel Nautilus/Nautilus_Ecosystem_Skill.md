# Skill: Nautilus Ecosystem Development (MT4/MT5/Web)

## 📋 Contexto Geral
Esta Skill descreve os padrões arquiteturais, de design e técnicos para o ecossistema **Nautilus**, composto por Expert Advisors (EAs) de captura de dados (Supervision GRAB), backends Node.js e dashboards Web profissionais em React.

---

## 🛠️ Componentes do Ecossistema

### 1. Supervision GRAB (MT4 & MT5)
*   **Função**: Captura de dados em tempo real (Tick-by-Tick) de Metatrader.
*   **Comunicação**: Híbrido (Arquivo `.json` local + WebRequest `POST` remoto para o Dashboard).
*   **Métricas Coletadas**:
    *   `Balance`, `Equity`, `Drawdown %`, `Floating Loss`.
    *   Performance: Diário, Semanal, Mensal e Todo Tempo (Profit/Loss).
    *   Operacional: Lotes Buy/Sell, Magic Numbers ativos, Profit Factor.
*   **Versão Atual**: `v1.13` (Remoção total de lógica de DME nativa, delegando para Planilha/Web).

### 2. Backend (Node.js/Express)
*   **Função**: Hub central (Online) que recebe e consolida dados de múltiplos terminais globais.
*   **Lógica**:
    *   `GET /api/data`: Retorna a união de arquivos locais + contas remotas (POST).
    *   `POST /api/update`: Recebe JSON de qualquer PC/VPS via WebRequest.
    *   Pruning automático: Remove contas remotas inativas há mais de 60 segundos.

### 3. Dashboard Web (React + Vite)
*   **Design Language**: **Nautilus Ultimate / Oakmont Style**.
    *   Fundo Ultra Dark (`#0B0E14`).
    *   Tipografia Inter com paridade de fontes para indicadores primários/secundários (Equity/Balance).
    *   Cores Institucionais: Blue Sky (`#38BDF8`), Emerald Green (`#22C55E`), Crimson Red (`#EF4444`).
*   **Componentes Chave**:
    *   **Sidebar Retro-Iluminada**: Ícones SVG minimalistas com suporte a colapso total (apenas ícones).
    *   **Gestão Global Consolidada**: Visão macro com navegação drill-down por linha.
    *   **Account Performance Stack**: Valores financeiros empilhados com ROI percentual dinâmico logo abaixo.
    *   **DME Max Alert**: Barra de Drawdown integrada à lógica de limites Oracle (Google Sheets).

---

## 📐 Padrões de Implementação (Best Practices)

### Design de Tipografia em Quadrantes
Sempre utilizar a estrutura de "valor empilhado":
1. **Título**: Uppercase, cinza opaco, sutil.
2. **Valor Principal**: Fonte grande, branca ou destacada.
3. **Sub-valor/Porcentagem**: Logo abaixo do valor principal, menor, com a cor da operação (Profit/Loss).

### Ciclo de Versão (Governança de Código)
Para qualquer alteração nos EAs Supervision GRAB:
1. Atualizar o comentário inicial do arquivo.
2. Atualizar a variável de versão interna (ex: `#define VERSION 1.13`).
3. Renomear o arquivo físico (Ex: `Supervision GRAB MT5 v1.12.mq5` -> `v1.13.mq5`).

---

## 🔮 Roadmap de Projetos Futuros
*   **Nautilus Sentinel**: Sistema de alertas via Telegram/Push baseado em anomalias de grade.
*   **Google Sheets Oracle**: Integração bidirecional entre Dashboard e Planilhas para controle de Limites Globais.
*   **Nautilus Mobile**: Versão PWA (Progressive Web App) do painel atual para iOS/Android.
*   **Nexus Price Martingale**: Implementação de sistemas de recuperação de preço assistidos por IA.
