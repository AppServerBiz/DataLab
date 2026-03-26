# Nautilus DataQuant Expert Skill

This skill encompasses the high-precision financial analytics and UI standards refined for the Nautilus DataLab project. It provides the core logic and architectural principles for portfolio management of trading robots.

## 🧠 Core Analytics Engine

### 1. High-Precision Portfolio Drawdown
Drawdown calculation for multiple assets must account for **peak-to-recovery temporal overposition**.
- Collect daily deltas (profit/loss) from all robots.
- Merge deltas into a single timeline.
- Accumulate deltas to build the **Combined Equity Curve**.
- Identify the **Running Peak** of the combined curve.
- Compute daily drawdown as `Peak - current_equity`.
- **Max DD** is the largest peak-to-valley distance observed across the combined timeline.

### 2. Risk Metrics
- **VAR 95% (Value at Risk)**: Calculated using the daily return volatility. 
  - `VAR = 1.645 * standard_deviation(daily_deltas)`.
- **LL/DD (%)**: A efficiency metric of Monthly Profit vs Maximum Risk.
  - `(Estimated_Monthly_Profit / Max_DD_Portfolio) * 100`.
- **DME (Estimated Daily Return)**:
  - `Estimated_Monthly_Profit / 22`.
- **Pearson correlation**: Normalized daily drawdown series instead of simple monthly averages for higher granularity.

## 🎨 UI/UX Design Standards (Minimalist Severe)

- **Palette**: Dark Mode (deep backgrounds like `#0D1117`, `#13171F`), Accent Blue (`#38BDF8`), Success Green (`#22C55E`), Alert Red (`#EF4444`).
- **Typography**: Industrial look, monospaced or modern sans-serif. Use `font-weight: 700+` for headers and critical metrics.
- **Components**: 
  - **8-Card Metric Grid**: Lucro Mês, ROI Mês, DD Max Portf, DD Max %, DME, VAR 95% (Percentil), ROI Dia ($), Sharpe.
  - **Top 10 DD Bar Chart**: Horizontal bar chart identifying chronological peak-to-recovery events.
  - **Dual Curve Strategy**: 
    - **Main Chart**: Curva de Capital (Balance) - suavizada, focada no saldo fechado.
    - **Risk Chart**: Equity vs Drawdown Overlay - detalhada, mostra flutuações e exposição.
- **VAR Racional**: Definido como o percentil 95 do rebaixamento diário (Value at Risk Histórico). Em 95% do tempo, o DD não excede este valor.

## 🛡️ Stability & Safety
- **Event Propagation**: Use `e.stopPropagation()` and `e.preventDefault()` on all destructive UI elements (Delete, Remove) to prevent bubbling and double-clicks.
- **Manual Overrides**: Critical metrics (like DME) should default to calculated values but persist user-defined manual overrides in the database (`manual_dme`).

## 🛠️ Workflows

### Processing a New Robot
1. Parse HTML report (MT5 Backtest) for base stats.
2. Parse CSV for high-resolution equity curve data.
3. Consolidate and store original files for auditability.
4. Calculate Monthly Drawdown Bar Charts ($ and %).

### Portfolio Construction
1. Use Drag-and-Drop to add robots to a portfolio.
2. Apply weights to metrics (DD x Weight, Profit x Weight).
3. Compute Combined Curve and true temporal Drawdown events.
