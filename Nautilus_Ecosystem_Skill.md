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
*   **Versão Atual**: `v1.15` (Sincronização refinada com Dashboard Web, suporte a nomes personalizados).

### 2. Backend (Node.js/Express)
*   **Função**: Hub central (Online) que recebe e consolida dados de múltiplos terminais globais.
*   **Lógica**:
    *   `GET /api/data`: Retorna a união de arquivos locais + contas remotas (POST).
    *   `POST /api/update`: Recebe JSON de qualquer PC/VPS via WebRequest.
    *   Pruning automático: Remove contas remotas inativas há mais de 60 segundos.

### 3. Dashboard Web (React + Vite)
*   **Design Language**: **Industrial Utility + Minimalist Severe** (v1.15).
    *   Fundo Ultra Dark (`#0B0E14`).
    *   Tipografia Inter com pesos variados para hierarquia visual técnica.
    *   Foco em precisão forense e grid rígido.
    *   Cores Institucionais: Blue Sky (`#38BDF8`), Emerald Green (`#22C55E`), Crimson Red (`#EF4444`).
*   **Componentes Chave**:
    *   **Sidebar Avançada**: Logo alinhado à esquerda com botão de recolher dinâmico. Exibição de Nome + #Número de conta em duas linhas. Suporte a colapso total (apenas ícones).
    *   **Gestão Global Consolidada**: Visão macro com navegação drill-down por linha e cards de performance igualados.
    *   **Account Performance Stack**: Saldo Bruto e Líquido com fontes equalizadas (1.6rem) para consistência visual.
    *   **DME Max Alert**: Barra de Drawdown integrada à lógica de limites Oracle (Google Sheets).

## 💎 UI/UX Design System (Industrial Utility + Minimalist Severe)

Para replicar este design em outros projetos, utilize os seguintes padrões e tokens:

### 🎨 Paleta de Cores (CSS Variables)
```css
:root {
  --bg-main: #0B0E14;        /* Fundo principal profundo */
  --bg-card: #181C25;        /* Fundo de cards e sidebar */
  --bg-card-hover: #1E232F;  /* Estado de hover técnico */
  --text-main: #E2E8F0;      /* Branco acinzentado leitura */
  --text-muted: #64748B;     /* Texto de suporte/labels */
  --accent-blue: #38BDF8;    /* Destaques e links */
  --accent-green: #22C55E;   /* Profit / Positivo */
  --accent-red: #EF4444;     /* Loss / Drawdown */
  --border-color: rgba(255, 255, 255, 0.05);
  --border-radius: 8px;
}
```

### 📐 Estrutura de Layout (Grid & Typography)
*   **Font-Family**: `'Inter', sans-serif` (Google Fonts).
*   **Section Titles**: `font-size: 1.25rem; font-weight: 700; color: #fff; margin-bottom: 1.5rem;`
*   **Value Highlight**: `font-size: 1.6rem; font-weight: 800;` (Utilizado para Saldo Bruto/Líquido).

### 🖥️ Componente: Sidebar v1.15
O segredo do layout industrial é a **Sidebar Multifuncional**:
*   **Header**: Logo alinhado à esquerda (`text-align: left`).
*   **Toggle**: Botão Burger (3 traços SVG) posicionado à direita da linha do Logo.
*   **Account Logic**:
    *   **Expandida**: Nome (Topo) + #Número (Abaixo, Muted).
    *   **Recolhida**: Apenas o ícone visível (`display: none` para textos).
    *   **Anti-Redundância**: Se o nome contém o número, a segunda linha é ocultada.

### 📊 Componente: Oakmont Table (Data Grid)
```html
<!-- Estrutura de Linha (Row) -->
<tr class="oakmont-row">
  <td>
    <div class="val-stack">
      <span class="ticker-name">NOME - NÚMERO</span>
      <span class="company-name">CORRETORA (Muted)</span>
    </div>
  </td>
  <td class="profit-text">+1,250.00</td>
  <td class="loss-text">-2.40%</td>
</tr>
```

### 🧱 Regra de Ouro (Aesthetics)
1.  **Sem Placeholders**: Use dados reais ou mockups de alta precisão.
2.  **Glossmorphism Sutil**: `backdrop-filter: blur(10px)` apenas em overlays de login ou modais críticos.
3.  **Animações**: Transições suaves (`transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`) para interações de menu e hover em tabelas.

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
2. Atualizar a variável de versão interna (ex: `#define VERSION 1.15`).
3. Renomear o arquivo físico (Ex: `Supervision GRAB MT5 v1.14.mq5` -> `v1.15.mq5`).

---

## 🔮 Roadmap de Projetos Futuros
*   **Nautilus Sentinel**: Sistema de alertas via Telegram/Push baseado em anomalias de grade.
*   **Google Sheets Oracle**: Integração bidirecional entre Dashboard e Planilhas para controle de Limites Globais.
*   **Nautilus Mobile**: Versão PWA (Progressive Web App) do painel atual para iOS/Android.
*   **Nexus Price Martingale**: Implementação de sistemas de recuperação de preço assistidos por IA.
