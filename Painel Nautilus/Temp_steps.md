4. **Filtros Temporais por Data:**
   - Possibilitar escolher no Calendário as "Deals" selecionáveis, substituindo os fixos StartDay, StartWeek.
5. **Expansão Multiplataforma (Web e Apps Mobile):**
   - Transpor o conceito do Dashboard *Supervision* para fora do ecossistema do terminal.
   - Desenvolver uma aplicação Web dedicada e aplicativos Mobile Nativos (iPhone/iOS e Android) que se comuniquem com a conta para permitir o monitoramento das posições globais, alertas de desvio na grade e o consolidado de todos os robôs em tempo real de qualquer lugar.
6. **Desacoplamento de Arquitetura (Grab + Ultimate Web):**
   - O projeto *Supervision* foi dividido! O MQL5 agora é o **Supervision Grab** (motor headless) responsável apenas por iterar operações, e exportar as matrizes via JSON internamente de forma robusta e otimizada.
   - O painel é a plataforma **Supervision Nautilus Ultimate** (React/Vite) que provê todos os cálculos de interface (Eixo 1 e 2) através de requisições de baixa latência em uma ponte Node.js (Bridge).
