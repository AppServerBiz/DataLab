# Base de Trajetória: Supervision & Painel Nautilus

Este documento serve como um mapa fundamental do projeto "Supervision Nautilus" e "Painel Nautilus" construídos em **MQL5**. Ele condensa nossa trajetória, arquitetura e principais lógicas implementadas até o momento para ser usado como referência técnica nos próximos meses de desenvolvimento.

---

## 📌 Contexto e Histórico

Desenvolvemos duas soluções gráficas focadas em leitura de dados e acompanhamento de EAs (Expert Advisors):
1. **Painel Nautilus v1.5:** Um painel focado no monitoramento detalhado de **um único robô** (por Magic Number) no gráfico em que é anexado. Ele traz cálculos isolados de Volume, Preço Médio, Distância em Pontos e Eficiência.
2. **Supervision Nautilus v1.9:** Um verdadeiro *Dashboard* global. Em vez de rastrear apenas um EA, ele oculta o gráfico padrão (`ChartSetInteger(0, CHART_SHOW, false)`) e cria uma Grade (Grid) de "Cards", rastreando automaticamente todos os Magic Numbers operantes na conta, gerando métricas globais e um painel para cada robô.

---

## 🛠 Padrões de Código Desenvolvidos e Reutilizáveis

Ao inspecionar os arquivos `Painel Nautilus v1.5.mq5` e `Supervision Nautilus.mq5`, destilamos várias funções e estruturas que podem ser usadas como *snippets* para projetos futuros.

### 1. Sistema de UI e Escalonamento Dinâmico
- **Construção de Objetos:** Padronizamos o uso de `CreateLabel()`, `CreateRect()` e `CreateLine()` para injetar textos e formas gráficas rapidamente sem sujar o `OnTick`.
- **Ancoragem Variável:** No *Painel v1.5*, foi estruturado o `ENUM_CANTO` e `GetBaseCorner()` que invertem as coordenadas (Y) automaticamente dependendo de qual canto do gráfico o painel for anexado.
- **Responsividade (Supervision):** No *Supervision v1.9*, aplicamos a variável `InpScale` (ex: 1.5). Com isso, variáveis de layout e fontes (`font_s`, `font_xl`) são recalculadas baseadas na proporção. O sistema de *Grid* dos robôs divide dinamicamente os Cards por linha com a fórmula: `cards_per_row = (chart_w - 40) / (card_w + 20)`.

### 2. Auto-Detecção de Magic Number Inteligente
Na `v1.5`, a função `GetAutoMagicNumber()` tornou-se essencial. Em vez do usuário digitar o Magic Number que deseja monitorar, a função verifica:
1. Operações em andamento correntes e busca o tipo `POSITION_MAGIC`;
2. Lê o histórico dos últimos 30 dias buscando `DEAL_MAGIC` em transações concluídas.

### 3. Estruturação Global de Dados (`SMagicData`)
O *Supervision v1.9* resolveu o problema de iterar múltiplas vezes criando um `struct` de cache consolidado.
```mql5
struct SMagicData {
   long     magic;
   string   comment;
   int      d_won, d_tot; double d_prof; // Diário
   int      w_won, w_tot; double w_prof; // Semanal
   // Mensal e Total
   double   buy_lots, sell_lots;
   double   floating;
};
```
Isso permite um único "Scan" do histórico via `HistorySelect(0, TimeCurrent())`, onde cada transação é agrupada no Array `SMagicData magics[]`, tornando o dashboard extremamente leve em processamento, mesmo com milhares de *Deals*.

### 4. Extração do Nome / Comentário do Robô
Descobrimos e tratamos a lógica para extrair o `DEAL_COMMENT` diretamente do evento de entrada (`DEAL_ENTRY_IN`). Caso ele não conste, faremos fallback buscando o `POSITION_COMMENT` das operações em abertas. Assim o Supervision exibe nomes de EAs como "#1234 - Nautilus Grid".
### 5. Lógica de Mercado e Sistema de Alertas (Atualizações Recentes)
- **Correção da Lógica de Abertura de Mercado:** Ajustes nas rotinas de validação de horário e reinicialização para garantir a correta sincronização das métricas diárias no início das sessões.
- **Sistema de Alertas Tri-color (Anomalias de Lote - Eixo 2):** O Supervision Nautilus conta com lógicas avançadas de alerta para desvios de lote (Eixo 2). O painel refinou seus indicadores adotando um sistema de 3 cores. Foram suavisadas as cores de notificação usando o amarelo do "DME alert" para avisos médios, e a mesma cor do *floating loss* (Vermelho / `InpClrLoss`) em divergências acentuadas. Além disso, as mensagens de exceção foram encurtadas para máxima clareza e concisão.

---

## 🎯 Elementos da Interface Gráfica (UX/UI)

# Base de Trajetória: Supervision & Painel Nautilus

Este documento serve como um mapa fundamental do projeto "Supervision Nautilus" e "Painel Nautilus" construídos em **MQL5**. Ele condensa nossa trajetória, arquitetura e principais lógicas implementadas até o momento para ser usado como referência técnica nos próximos meses de desenvolvimento.

---

## 📌 Contexto e Histórico

Desenvolvemos duas soluções gráficas focadas em leitura de dados e acompanhamento de EAs (Expert Advisors):
1. **Painel Nautilus v1.5:** Um painel focado no monitoramento detalhado de **um único robô** (por Magic Number) no gráfico em que é anexado. Ele traz cálculos isolados de Volume, Preço Médio, Distância em Pontos e Eficiência.
2. **Supervision Nautilus v1.9:** Um verdadeiro *Dashboard* global. Em vez de rastrear apenas um EA, ele oculta o gráfico padrão (`ChartSetInteger(0, CHART_SHOW, false)`) e cria uma Grade (Grid) de "Cards", rastreando automaticamente todos os Magic Numbers operantes na conta, gerando métricas globais e um painel para cada robô.

---

## 🛠 Padrões de Código Desenvolvidos e Reutilizáveis

Ao inspecionar os arquivos `Painel Nautilus v1.5.mq5` e `Supervision Nautilus.mq5`, destilamos várias funções e estruturas que podem ser usadas como *snippets* para projetos futuros.

### 1. Sistema de UI e Escalonamento Dinâmico
- **Construção de Objetos:** Padronizamos o uso de `CreateLabel()`, `CreateRect()` e `CreateLine()` para injetar textos e formas gráficas rapidamente sem sujar o `OnTick`.
- **Ancoragem Variável:** No *Painel v1.5*, foi estruturado o `ENUM_CANTO` e `GetBaseCorner()` que invertem as coordenadas (Y) automaticamente dependendo de qual canto do gráfico o painel for anexado.
- **Responsividade (Supervision):** No *Supervision v1.9*, aplicamos a variável `InpScale` (ex: 1.5). Com isso, variáveis de layout e fontes (`font_s`, `font_xl`) são recalculadas baseadas na proporção. O sistema de *Grid* dos robôs divide dinamicamente os Cards por linha com a fórmula: `cards_per_row = (chart_w - 40) / (card_w + 20)`.

### 2. Auto-Detecção de Magic Number Inteligente
Na `v1.5`, a função `GetAutoMagicNumber()` tornou-se essencial. Em vez do usuário digitar o Magic Number que deseja monitorar, a função verifica:
1. Operações em andamento correntes e busca o tipo `POSITION_MAGIC`;
2. Lê o histórico dos últimos 30 dias buscando `DEAL_MAGIC` em transações concluídas.

### 3. Estruturação Global de Dados (`SMagicData`)
O *Supervision v1.9* resolveu o problema de iterar múltiplas vezes criando um `struct` de cache consolidado.
```mql5
struct SMagicData {
   long     magic;
   string   comment;
   int      d_won, d_tot; double d_prof; // Diário
   int      w_won, w_tot; double w_prof; // Semanal
   // Mensal e Total
   double   buy_lots, sell_lots;
   double   floating;
};
```
Isso permite um único "Scan" do histórico via `HistorySelect(0, TimeCurrent())`, onde cada transação é agrupada no Array `SMagicData magics[]`, tornando o dashboard extremamente leve em processamento, mesmo com milhares de *Deals*.

### 4. Extração do Nome / Comentário do Robô
Descobrimos e tratamos a lógica para extrair o `DEAL_COMMENT` diretamente do evento de entrada (`DEAL_ENTRY_IN`). Caso ele não conste, faremos fallback buscando o `POSITION_COMMENT` das operações em abertas. Assim o Supervision exibe nomes de EAs como "#1234 - Nautilus Grid".
### 5. Lógica de Mercado e Sistema de Alertas (Atualizações Recentes)
- **Correção da Lógica de Abertura de Mercado:** Ajustes nas rotinas de validação de horário e reinicialização para garantir a correta sincronização das métricas diárias no início das sessões.
- **Sistema de Alertas Tri-color (Anomalias de Lote - Eixo 2):** O Supervision Nautilus conta com lógicas avançadas de alerta para desvios de lote (Eixo 2). O painel refinou seus indicadores adotando um sistema de 3 cores. Foram suavisadas as cores de notificação usando o amarelo do "DME alert" para avisos médios, e a mesma cor do *floating loss* (Vermelho / `InpClrLoss`) em divergências acentuadas. Além disso, as mensagens de exceção foram encurtadas para máxima clareza e concisão.

---

## 🎯 Elementos da Interface Gráfica (UX/UI)

- **Identidade Visual Premium:** Adotada a paleta de fundo voltada ao Dark (`C'5,5,10'`), cabeçalhos `C'20,30,45'` e botões com textos claros usando a fonte "Segoe UI" que dá a aparência de um software fora do ecossistema terminal MetaTrader puro.
- **Indicadores Focais:** Todos os lucros positivos se valem do padrão `InpClrProfit` (LimeGreen) contra `InpClrLoss` (Tomato) com realces no texto (`InpClrTextHl = clrWhite`).
- **Footer Interativo:** Adicionado um `CHARTEVENT_OBJECT_CLICK` que permite ao usuário clicar no rodapé "Nautilus Investing" (colorido de Azul Claro) para invocar o `ShellExecuteW` chamando a aba do navegador nativo (`www.nautilusinvesting.com`).

---

- **Interconectividade Global (POST/WebRequest):** O sistema agora permite que instâncias do Supervision GRAB rodando em qualquer VPS ou PC no mundo enviem dados para a Dashboard via WebRequest (HTTPS POST), eliminando a necessidade de arquivos locais compartilhados.
- **Oracle Centralizado (Google Sheets):** Plplugamos o Google Sheets (abas Estrutura e Limites) como a fonte de verdade para as métricas de Backtest e limites de risco operacionais.

---

## 🛰️ Arquitetura de Rede Nautilus
Para que tudo funcione online:
1. **Dashboard Server:** Deve rodar em um IP fixo ou VPS (ex: CloudHost).
2. **Endpoint de Entrada:** Robo envia para `http://IP_DO_SERVIDOR:3001/api/update`.
3. **Allowed URLs:** O endereço do servidor deve ser adicionado nas configurações do MetaTrader (Options > Expert Advisors > Allow WebRequest).

---

### 6. Integração Web e Ecossistema Nautilus (Nautilus Dashboard)
- **Dashboard React Profissional:** Transpusemos o conceito do Supervision MQL5 para uma aplicação Web completa (`nautilus-web`). 
- **Estética Oakmont Research:** Implementamos um design de alto nível (Institutional Dark) com paleta Navy/Black, tipografia limpa e espaçamento generoso. As métricas são exibidas em "pilhas" (Valor Financeiro + Porcentagem abaixo).
- **Backend Consolidado:** Um servidor Node.js que atua como hub, lendo os arquivos JSON de múltiplas instâncias de Metatrader e entregando uma visão consolidada de todas as contas em uma única interface.
- **Supervision GRAB v1.13:** Evoluído para ser um coletor purista. Removemos as travas de DME internas para que o controle de risco seja centralizado na Dashboard Web e em Planilhas Cloud (Google Sheets).

---

## 🚀 Próximos Passos Recomendados

1. **Monitoramento de Risco (Drawdown) & Cloud Integration:**
   - Plugar o **Google Sheets** como fonte da verdade para limites de Drawdown e configurações de cada robô, permitindo atualizações dinâmicas sem reanexar EAs.
2. **Trade Station Web:**
   - Evoluir para execução remota de ordens básicas ("Zerar Conta", "Travar Operações") via Dashboard.
3. **Persistência de Layout & Multi-User:**
   - Adicionar autenticação e perfis de visualização para diferentes níveis de acesso (Gestor vs Investidor).
4. **Nautilus Mobile (PWA):**
   - Refinar a responsividade para que o Dashboard Oakmont seja uma ferramenta de bolso impecável no iPhone/Android.
