# Nautilus Quant Design System (v1.0.0)

Este diretório contém o **Design System completo e desacoplado** do portal Nautilus DataLab. Você pode **copiar e colar** esta pasta inteira (`nautilus-design-system`) diretamente para qualquer outro projeto (React, Next.js, Vue, Svelte ou HTML puro/Node).

---

## 📁 Estrutura da Pasta

```
nautilus-design-system/
├── tokens/
│   ├── tokens.json            # Design tokens em JSON (Figma, Tailwind, scripts)
│   └── index.ts               # Constantes e types TypeScript exportáveis
├── css/
│   └── nautilus.css           # CSS completo autônomo com variáveis, botões, tabelas, inputs e tema escuro
├── icons/
│   ├── index.tsx              # Biblioteca de ícones React SVG (Nautilus, Candlestick, Equity, Drawdown, etc.)
│   └── nautilus-icons.svg     # SVG Sprite para uso nativo em HTML sem frameworks
├── charts/
│   └── chart-presets.ts       # Presets prontos para Chart.js e React-Chartjs-2 (Equity, Drawdown subaquático)
├── reports/
│   └── report-styles.css      # Regras de impressão PDF / A4, tear sheets, quebra de página e tabelas executivas
├── components/
│   └── index.tsx              # Componentes essenciais em React (StatCard, QuantBadge, CorrelationCell)
├── index.html                 # Showcase visual para demonstração e inspeção rápida no navegador
└── README.md                  # Este guia de uso e documentação técnica
```

---

## 🚀 Como Usar em Outros Projetos

### 1. Uso Rápido com HTML / CSS Puro
Basta importar o CSS no `<head>` da sua aplicação:
```html
<link rel="stylesheet" href="./nautilus-design-system/css/nautilus.css">
```
E usar as classes padronizadas:
- **Títulos**: `.nautilus-title`, `.nautilus-card-title`
- **Cards e KPIs**: `.card`, `.card-kpi`, `.value-highlight`
- **Tabelas Quant**: `.oakmont-table`, `.oakmont-row`
- **Botões**: `.btn .btn-primary`, `.btn-success`, `.btn-danger`, `.btn-outline`
- **Badges**: `.badge .badge-profit`, `.badge-loss`, `.badge-blue`

### 2. Uso com React / Vite / Next.js
No seu arquivo principal (`App.tsx` ou `main.tsx`):
```tsx
import './nautilus-design-system/css/nautilus.css';
import { StatCard, QuantBadge, CorrelationCell } from './nautilus-design-system/components';
import { NAUTILUS_ICONS } from './nautilus-design-system/icons';
import { getEquityChartOptions, createEquityDataset } from './nautilus-design-system/charts/chart-presets';
```

Exemplo de uso:
```tsx
<StatCard
  title="LUCRO LÍQUIDO"
  value="+$142,850.00"
  subtitle="Capital inicial: $50,000"
  isPositive={true}
  change="285.7%"
  icon={<NAUTILUS_ICONS.EquityCurve size={20} />}
/>
```

### 3. Uso em Gráficos (Chart.js / React-Chartjs-2)
Para renderizar gráficos com o visual do portal:
```tsx
import { Line } from 'react-chartjs-2';
import { getEquityChartOptions, createEquityDataset } from './nautilus-design-system/charts/chart-presets';

const data = {
  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
  datasets: [
    createEquityDataset('Portfolio Alpha', [10000, 12500, 11800, 15400, 18900])
  ]
};

<Line options={getEquityChartOptions('dark')} data={data} />
```

### 4. Geração de Relatórios e Tear Sheets A4 (PDF)
Para páginas de relatórios executivos para investidores:
1. Importe `./reports/report-styles.css`.
2. Envolva cada página na classe `.report-page`.
3. Adicione a classe `.no-print` em botões e barras que não devem sair no PDF.
4. Chame `window.print()` ou passe para bibliotecas como `html2pdf.js`.

---

## 🎨 Paleta de Cores Oficial

| Token | Hex | Aplicação |
|---|---|---|
| `--bg-main` | `#0B0E14` | Fundo principal da aplicação |
| `--bg-card` | `#181C25` | Superfície de cartões e tabelas |
| `--accent-blue` | `#38BDF8` | Destaques primários, seleções ativas |
| `--accent-green` | `#22C55E` | Lucro acumulado, Sharpe alto |
| `--accent-red` | `#EF4444` | Prejuízo, Drawdown e alertas críticos |
| `--accent-warning` | `#F59E0B` | Volatilidade e alertas secundários |
| `--text-main` | `#E2E8F0` | Texto primário de alto contraste |
| `--text-muted` | `#64748B` | Labels, legendas e metadados |
