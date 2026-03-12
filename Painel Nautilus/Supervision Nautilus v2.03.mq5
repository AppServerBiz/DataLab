//+------------------------------------------------------------------+
//|                                       Supervision Nautilus v2.03 |
//|                               Copyright 2026, Nautilus Investing |
//|                                https://www.nautilusinvesting.com |
//+------------------------------------------------------------------+

#property copyright "Nautilus Investing"
#property link      "https://www.nautilusinvesting.com"
#property version   "2.03"

#import "shell32.dll"
int ShellExecuteW(int hwnd, string lpOperation, string lpFile, string lpParameters, string lpDirectory, int nShowCmd);
#import

//--- Parâmetros de Entrada
sinput string gui_settings = "=== Configurações de Escala ===";
input double InpScale           = 1.5;           // Escala (Default 1.5)

sinput string risk_settings = "=== Gestão de Risco (Semáforo Global) ===";
input double InpMaxDME          = 20.0;          // Drawdown Máximo Estabelecido (DME) em %
input double InpAccountPeak     = 0.0;           // Pico Histórico Override (0 = Auto-Detectar)

sinput string color_settings = "=== Cores do Painel ===";
input color  InpClrBg           = C'5,5,10';     // Cor de Fundo Geral
input color  InpClrCard         = C'15,20,30';   // Cor dos Cards dos Robôs
input color  InpClrHeader       = C'20,30,45';   // Cor Cabeçalho
input color  InpClrBorder       = C'40,60,90';   // Cor da Borda
input color  InpClrText         = C'160,170,180';// Texto Padrão
input color  InpClrTextHl       = clrWhite;      // Texto Destaque
input color  InpClrProfit       = clrLimeGreen;  // Cor Lucro
input color  InpClrLoss         = clrTomato;     // Cor Prejuízo
input color  InpClrSep          = C'35,45,60';   // Linha Separadora

// Cores Risco (Nautilus Manual) - Ajustadas para visual premium
input color  InpClrRiskGreen    = C'30, 150, 50';
input color  InpClrRiskYellow   = C'220, 180, 0';
input color  InpClrRiskOrange   = C'220, 100, 0';
input color  InpClrRiskRed      = C'220, 40, 40';

// Configurações de Layout (Base 100%)
#define FONT_NAME "Segoe UI"
#define CORE_X 20
#define CORE_Y 20

// Aumentada altura ligeiramente para comportar mais uma linha (% flutuante) e descolar o semáforo
int base_card_w = 280; 
int base_card_h = 325;
int base_head_h = 230; 

int card_w, card_h, head_h;
int font_s, font_m, font_l, font_xl, font_xxl;
datetime first_order_date = 0;
double runtime_peak_equity = 0;

struct SMagicData
  {
   long     magic;
   string   comment;
   int      d_won, d_tot; double d_prof;
   int      w_won, w_tot; double w_prof;
   int      m_won, m_tot; double m_prof;
   int      t_won, t_tot; double t_prof;
   double   buy_lots, sell_lots;
   int      buy_count, sell_count;
   double   floating;
   bool     lotes_anomalos;
  };

SMagicData magics[];
double g_prof_d, g_prof_w, g_prof_m, g_prof_t;

//+------------------------------------------------------------------+
//| Funções de Criação de Objetos                                    |
//+------------------------------------------------------------------+
void CreateLabel(string name, int x, int y, string text, color clr, int size, ENUM_ANCHOR_POINT anchor = ANCHOR_LEFT_UPPER)
  {
   if(ObjectFind(0, name) < 0) ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetString(0, name, OBJPROP_TEXT, text);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
   ObjectSetString(0, name, OBJPROP_FONT, FONT_NAME);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, size);
   ObjectSetInteger(0, name, OBJPROP_ANCHOR, anchor);
   ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
  }

void CreateRect(string name, int x, int y, int w, int h, color bg, color border)
  {
   if(ObjectFind(0, name) < 0) ObjectCreate(0, name, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, name, OBJPROP_XSIZE, w);
   ObjectSetInteger(0, name, OBJPROP_YSIZE, h);
   ObjectSetInteger(0, name, OBJPROP_BGCOLOR, bg);
   ObjectSetInteger(0, name, OBJPROP_COLOR, border);
   ObjectSetInteger(0, name, OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
  }

string FormatEff(int won, int tot)
  {
   if(tot == 0) return "0/0 (0%)";
   double pct = ((double)won / tot) * 100.0;
   return IntegerToString(won) + "/" + IntegerToString(tot) + " (" + DoubleToString(pct, 0) + "%)";
  }

//+------------------------------------------------------------------+
//| Coleta de Dados                                                  |
//+------------------------------------------------------------------+
void CollectData()
  {
   ArrayFree(magics);
   g_prof_d=0; g_prof_w=0; g_prof_m=0; g_prof_t=0;
   HistorySelect(0, TimeCurrent());
   int totalDeals = HistoryDealsTotal();
   if(totalDeals > 0) first_order_date = (datetime)HistoryDealGetInteger(HistoryDealGetTicket(0), DEAL_TIME);
   datetime startDay = iTime(_Symbol, PERIOD_D1, 0);
   datetime startWeek = iTime(_Symbol, PERIOD_W1, 0);
   datetime startMonth = iTime(_Symbol, PERIOD_MN1, 0);
   for(int i=totalDeals-1; i>=0; i--)
     {
      ulong t = HistoryDealGetTicket(i);
      long m = HistoryDealGetInteger(t, DEAL_MAGIC);
      long entry = HistoryDealGetInteger(t, DEAL_ENTRY);
      if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
        {
         double p = HistoryDealGetDouble(t, DEAL_PROFIT) + HistoryDealGetDouble(t, DEAL_COMMISSION) + HistoryDealGetDouble(t, DEAL_SWAP);
         datetime tm = (datetime)HistoryDealGetInteger(t, DEAL_TIME);
         g_prof_t += p;
         if(tm >= startMonth) g_prof_m += p;
         if(tm >= startWeek)  g_prof_w += p;
         if(tm >= startDay)   g_prof_d += p;
        }
      if(m > 0)
        {
         bool found = false;
         for(int j=0; j<ArraySize(magics); j++) if(magics[j].magic == m) { found = true; break; }
         if(!found)
           {
            int size = ArraySize(magics); ArrayResize(magics, size+1); magics[size].magic = m;
            string cmt = "";
            for(int k=0; k<totalDeals; k++) {
               ulong tk = HistoryDealGetTicket(k);
               if(HistoryDealGetInteger(tk, DEAL_MAGIC) == m && HistoryDealGetInteger(tk, DEAL_ENTRY) == DEAL_ENTRY_IN) {
                  cmt = HistoryDealGetString(tk, DEAL_COMMENT); if(cmt != "") break;
               }
            }
            if(cmt == "") for(int p=0; p<PositionsTotal(); p++) if(PositionGetInteger(POSITION_MAGIC) == m) { cmt = PositionGetString(POSITION_COMMENT); break; }
            magics[size].comment = cmt;
           }
        }
     }
   for(int j=0; j<ArraySize(magics); j++)
     {
      magics[j].buy_lots = 0; magics[j].sell_lots = 0; magics[j].floating = 0;
      magics[j].buy_count = 0; magics[j].sell_count = 0;
      
      for(int i=0; i<PositionsTotal(); i++) if(PositionGetTicket(i) > 0 && PositionGetInteger(POSITION_MAGIC) == magics[j].magic)
        {
         double vol = PositionGetDouble(POSITION_VOLUME);
         double prof = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP) + PositionGetDouble(POSITION_COMMISSION);
         magics[j].floating += prof;
         if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) {
             magics[j].buy_lots += vol;
             magics[j].buy_count++;
         } else {
             magics[j].sell_lots += vol;
             magics[j].sell_count++;
         }
        }
      
      magics[j].lotes_anomalos = ((magics[j].buy_lots + magics[j].sell_lots) > 5.0);

      magics[j].d_tot=0; magics[j].d_won=0; magics[j].d_prof=0;
      magics[j].w_tot=0; magics[j].w_won=0; magics[j].w_prof=0;
      magics[j].m_tot=0; magics[j].m_won=0; magics[j].m_prof=0;
      magics[j].t_tot=0; magics[j].t_won=0; magics[j].t_prof=0;
      for(int i=0; i<totalDeals; i++) {
         ulong t = HistoryDealGetTicket(i);
         if(HistoryDealGetInteger(t, DEAL_MAGIC) == magics[j].magic) {
            long entry = HistoryDealGetInteger(t, DEAL_ENTRY);
            if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY) {
               double p = HistoryDealGetDouble(t, DEAL_PROFIT) + HistoryDealGetDouble(t, DEAL_COMMISSION) + HistoryDealGetDouble(t, DEAL_SWAP);
               datetime tm = (datetime)HistoryDealGetInteger(t, DEAL_TIME);
               magics[j].t_tot++; magics[j].t_prof += p; if(p > 0) magics[j].t_won++;
               if(tm >= startMonth) { magics[j].m_tot++; magics[j].m_prof += p; if(p > 0) magics[j].m_won++; }
               if(tm >= startWeek) { magics[j].w_tot++; magics[j].w_prof += p; if(p > 0) magics[j].w_won++; }
               if(tm >= startDay) { magics[j].d_tot++; magics[j].d_prof += p; if(p > 0) magics[j].d_won++; }
            }
         }
      }
     }
  }

//+------------------------------------------------------------------+
//| Atualização da Interface                                         |
//+------------------------------------------------------------------+
void UpdateUI()
  {
   CollectData();
   string pref = "Sup_";
   string curr = AccountInfoString(ACCOUNT_CURRENCY);
   double current_bal = AccountInfoDouble(ACCOUNT_BALANCE);
   double current_eq = AccountInfoDouble(ACCOUNT_EQUITY);
   
   // --- CÁLCULO DO EIXO 1: SEMÁFORO GLOBAL DE RISCO ---
   if(current_eq > runtime_peak_equity) runtime_peak_equity = current_eq;
   if(current_bal > runtime_peak_equity) runtime_peak_equity = current_bal;
   
   double peak_ref = (InpAccountPeak > 0) ? InpAccountPeak : runtime_peak_equity;
   if(peak_ref <= 0) peak_ref = 1; 
   
   double current_dd_pct = 0;
   if(current_eq < peak_ref) current_dd_pct = ((peak_ref - current_eq) / peak_ref) * 100.0;
   
   double dme_limit = InpMaxDME;
   if(dme_limit <= 0) dme_limit = 100;
   
   double dd_ratio = current_dd_pct / dme_limit;
   
   color risk_color = InpClrRiskGreen;
   string risk_label = "NORMAL";
   
   // Cores do Semáforo Global
   color g_c_verde   = InpClrRiskGreen;
   color g_c_amarela = C'40,40,40';
   color g_c_laranja = C'40,40,40';
   color g_c_verm    = C'40,40,40';
   
   if(dd_ratio >= 0.75) { risk_color = InpClrRiskRed; risk_label = "CRÍTICO"; g_c_verm = InpClrRiskRed; g_c_laranja = InpClrRiskOrange; g_c_amarela = InpClrRiskYellow; }
   else if(dd_ratio >= 0.50) { risk_color = InpClrRiskOrange; risk_label = "CONTENÇÃO"; g_c_laranja = InpClrRiskOrange; g_c_amarela = InpClrRiskYellow; }
   else if(dd_ratio >= 0.25) { risk_color = InpClrRiskYellow; risk_label = "INVESTIGAÇÃO";  g_c_amarela = InpClrRiskYellow; }

   // --- GEOMETRIA ---
   card_w = (int)(base_card_w * InpScale);
   card_h = (int)(base_card_h * InpScale);
   head_h = (int)(base_head_h * InpScale);
   
   font_s = (int)(8 * InpScale);
   font_m = (int)(9 * InpScale);
   font_l = (int)(11 * InpScale);
   font_xl = (int)(14 * InpScale); 
   font_xxl = (int)(17 * InpScale); 
   
   int chart_w = (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS);
   int cards_per_row = (chart_w - 40) / (card_w + 20);
   if(cards_per_row < 1) cards_per_row = 1;
   
   CreateRect(pref+"MainBg", 0, 0, chart_w, (int)ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS), InpClrBg, InpClrBg);
   
   // --- CABEÇALHO GERAL ---
   int head_x = CORE_X;
   int head_w_calc = chart_w - 40;
   CreateRect(pref+"Head", head_x, CORE_Y, head_w_calc, head_h, InpClrHeader, risk_color);
   
   int y0 = CORE_Y + 15;
   int gap_tit_acc = (int)(45 * InpScale); 
   int gap_normal = (int)(34 * InpScale);
   int right_col_x = head_x + head_w_calc - 25;

   // Linha 1: Título Principal e Status Global com Semáforo Redondo Global
   CreateLabel(pref+"Tit", head_x+25, y0, "Supervision Nautilus v2.03", InpClrProfit, font_xxl);
   
   string risk_text = "STATUS CONTA: " + risk_label + " | DD: " + DoubleToString(current_dd_pct, 2) + "% / DME " + DoubleToString(InpMaxDME, 0) + "%";
   CreateLabel(pref+"GlobalRisk", right_col_x, y0, risk_text, risk_color, font_xl, ANCHOR_RIGHT_UPPER);
   
   // Desenha as bolinhas do Semáforo Global ANTES do bloco de status da conta (Com offset à esquerda da frase)
   int bx_g = right_col_x - (int)(510 * InpScale); // Espaço calculado para não colidir com a string
   CreateLabel(pref+"GSem1", bx_g, y0-2, "●", g_c_verde, font_xxl);   bx_g += (int)(24*InpScale);
   CreateLabel(pref+"GSem2", bx_g, y0-2, "●", g_c_amarela, font_xxl); bx_g += (int)(24*InpScale);
   CreateLabel(pref+"GSem3", bx_g, y0-2, "●", g_c_laranja, font_xxl); bx_g += (int)(24*InpScale);
   CreateLabel(pref+"GSem4", bx_g, y0-2, "●", g_c_verm, font_xxl);
   
   // Linha 2: Conta | Flutuante
   int y1 = y0 + gap_tit_acc;
   string accName = AccountInfoString(ACCOUNT_NAME);
   CreateLabel(pref+"AccL", head_x+25, y1, "Conta: " + accName + " | Pico Ref: " + DoubleToString(peak_ref, 2), InpClrText, font_m);
   CreateLabel(pref+"FloatT", right_col_x, y1, "Flutuante Global", InpClrText, font_l, ANCHOR_RIGHT_UPPER);
   
   // Linha 3: Horários | Valor Flutuante
   int y2 = y1 + gap_normal;
   string srvT = TimeToString(TimeCurrent(), TIME_SECONDS);
   string locT = TimeToString(TimeLocal(), TIME_SECONDS);
   CreateLabel(pref+"TimeL", head_x+25, y2, "Hora Servidor: "+srvT+"  |  Local (BR): "+locT, InpClrText, font_m);
   
   double floatTot = AccountInfoDouble(ACCOUNT_PROFIT);
   CreateLabel(pref+"FloatV", right_col_x, y2, DoubleToString(floatTot, 2)+" "+curr, floatTot>=0?InpClrProfit:InpClrLoss, font_xl, ANCHOR_RIGHT_UPPER);
   
   // Linha 4: Robôs e BD | Saldo Bruto
   int y3 = y2 + gap_normal;
   string dbDate = (first_order_date > 0) ? TimeToString(first_order_date, TIME_DATE) : "Sem Reg.";
   CreateLabel(pref+"StatsL", head_x+25, y3, "Quantidade de Robôs: "+IntegerToString(ArraySize(magics))+"   |   Data DataBase: "+dbDate, InpClrText, font_m);
   
   CreateLabel(pref+"Bal", right_col_x, y3, "Saldo Bruto: "+DoubleToString(current_bal, 2), InpClrTextHl, font_l, ANCHOR_RIGHT_UPPER);
   
   // Linha 5: Lucros Globais | Saldo Líquido
   int y4 = y3 + gap_normal;
   CreateLabel(pref+"Eq", right_col_x, y4, "Saldo Líquido: "+DoubleToString(current_eq, 2), InpClrProfit, font_l, ANCHOR_RIGHT_UPPER);

   double pct_d = current_bal > 0 ? (g_prof_d / (current_bal - g_prof_d) * 100.0) : 0;
   double pct_w = current_bal > 0 ? (g_prof_w / (current_bal - g_prof_w) * 100.0) : 0;
   double pct_m = current_bal > 0 ? (g_prof_m / (current_bal - g_prof_m) * 100.0) : 0;
   double pct_t = current_bal > 0 ? (g_prof_t / (current_bal - g_prof_t) * 100.0) : 0;

   int x_off = head_x + 25;
   CreateLabel(pref+"G_Dia", x_off, y4, "Lucro Dia: "+DoubleToString(g_prof_d, 2)+" ("+DoubleToString(pct_d, 2)+"%)", g_prof_d>=0?InpClrProfit:InpClrLoss, font_l);
   x_off += (int)(260*InpScale); 
   CreateLabel(pref+"G_Sem", x_off, y4, "Semana: "+DoubleToString(g_prof_w, 2)+" ("+DoubleToString(pct_w, 2)+"%)", g_prof_w>=0?InpClrProfit:InpClrLoss, font_l);
   x_off += (int)(250*InpScale);
   CreateLabel(pref+"G_Mes", x_off, y4, "Mês: "+DoubleToString(g_prof_m, 2)+" ("+DoubleToString(pct_m, 2)+"%)", g_prof_m>=0?InpClrProfit:InpClrLoss, font_l);
   x_off += (int)(250*InpScale);
   CreateLabel(pref+"G_Tot", x_off, y4, "Total: "+DoubleToString(g_prof_t, 2)+" ("+DoubleToString(pct_t, 2)+"%)", g_prof_t>=0?InpClrProfit:InpClrLoss, font_l);

   // --- GRID DE ROBÔS ---
   int start_y = CORE_Y + head_h + 30;
   int cards_found = ArraySize(magics);
   for(int i=0; i<cards_found; i++)
     {
      int row = i / cards_per_row;
      int col = i % cards_per_row;
      int x = CORE_X + col * (card_w + 20);
      int y = start_y + row * (card_h + 20);
      string id = IntegerToString(i);
      
      // Card Color Highlight
      color card_b_color = InpClrBorder;
      if(magics[i].floating < 0 && magics[i].floating < -(peak_ref * (InpMaxDME/100.0) * 0.25)) // > 25% DME
         card_b_color = InpClrRiskYellow; 

      CreateRect(pref+"Card_"+id, x, y, card_w, card_h, InpClrCard, card_b_color);
      string title = "#" + IntegerToString(magics[i].magic) + " - " + magics[i].comment;
      if(StringLen(title) > 35) title = StringSubstr(title, 0, 32) + "...";
      CreateLabel(pref+"C_Tit_"+id, x+15, y+10, title, InpClrTextHl, font_m);
      CreateRect(pref+"C_SepT_"+id, x+10, y+(int)(32*InpScale), card_w-20, 1, InpClrSep, InpClrSep);
      
      int ty = y + (int)(45*InpScale);
      CreateLabel(pref+"C_L_Eff_"+id, x+(int)(95*InpScale), ty, "Eficiência", InpClrText, font_s);
      CreateLabel(pref+"C_L_Prof_"+id, x+card_w-15, ty, "Lucro", InpClrText, font_s, ANCHOR_RIGHT_UPPER);
      string labels[] = {"Dia", "Semana", "Mês", "Total"};
      string effs[] = {FormatEff(magics[i].d_won, magics[i].d_tot), FormatEff(magics[i].w_won, magics[i].w_tot), FormatEff(magics[i].m_won, magics[i].m_tot), FormatEff(magics[i].t_won, magics[i].t_tot)};
      double profs[] = {magics[i].d_prof, magics[i].w_prof, magics[i].m_prof, magics[i].t_prof};
      for(int k=0; k<4; k++) {
         int ky = ty + (int)((18 + k*22)*InpScale);
         CreateLabel(pref+"C_Lab_"+id+"_"+IntegerToString(k), x+15, ky, labels[k], InpClrText, font_m);
         CreateLabel(pref+"C_Eff_"+id+"_"+IntegerToString(k), x+(int)(95*InpScale), ky, effs[k], profs[k]>=0?InpClrProfit:InpClrLoss, font_m);
         CreateLabel(pref+"C_Val_"+id+"_"+IntegerToString(k), x+card_w-15, ky, DoubleToString(profs[k], 2), profs[k]>=0?InpClrProfit:InpClrLoss, font_m, ANCHOR_RIGHT_UPPER);
      }
      CreateRect(pref+"C_SepM_"+id, x+10, ty+(int)(110*InpScale), card_w-20, 1, InpClrSep, InpClrSep);
      
      int oy = ty + (int)(125*InpScale);
      CreateLabel(pref+"C_BuyL_"+id, x+15, oy, "Lotes Compra: "+DoubleToString(magics[i].buy_lots, 2)+" | "+IntegerToString(magics[i].buy_count)+"x", InpClrText, font_m);
      CreateLabel(pref+"C_SelL_"+id, x+15, oy+(int)(20*InpScale), "Lotes Venda: "+DoubleToString(magics[i].sell_lots, 2)+" | "+IntegerToString(magics[i].sell_count)+"x", InpClrText, font_m);
      
      // Alerta do Eixo 2 (Lotes)
      int oy_warn = oy+(int)(40*InpScale);
      if(magics[i].lotes_anomalos)
         CreateLabel(pref+"C_Warn_"+id, x+15, oy_warn, "⚠️ AVISO: DESVIO DE LOTES", InpClrRiskYellow, font_s);
      else
         CreateLabel(pref+"C_Warn_"+id, x+15, oy_warn, "Desvio de Lotes: Normal", InpClrText, font_s);

      CreateLabel(pref+"C_FloatL_"+id, x+15, oy+(int)(60*InpScale), "Flutuante Robô:", InpClrText, font_m);
      CreateLabel(pref+"C_FloatV_"+id, x+card_w-15, oy+(int)(60*InpScale), DoubleToString(magics[i].floating, 2) + " " + curr, magics[i].floating>=0?InpClrProfit:InpClrLoss, font_m, ANCHOR_RIGHT_UPPER);

      // NOVO: Porcentagem do Flutuante (comparado ao Saldo Bruto)
      double f_pct = (current_bal > 0) ? (magics[i].floating / current_bal) * 100.0 : 0;
      CreateLabel(pref+"C_FloatPct_"+id, x+card_w-15, oy+(int)(78*InpScale), "("+DoubleToString(f_pct, 2)+"%)", magics[i].floating>=0?InpClrProfit:InpClrLoss, font_m, ANCHOR_RIGHT_UPPER);

      // SEMÁFORO DE RISCO POR ROBÔ (Bolinhas Visuais descoladas com mais espaço)
      int oy_semaf = oy+(int)(105*InpScale);
      CreateLabel(pref+"C_SensL_"+id, x+15, oy_semaf, "Risco Unitário:", InpClrText, font_s);
      
      // Calculamos o impacto desse robô isolado sobre a conta
      double r_dd_pct = (magics[i].floating < 0 && peak_ref > 0) ? (MathAbs(magics[i].floating) / peak_ref) * 100.0 : 0;
      double r_ratio = r_dd_pct / dme_limit;
      
      color c_verde   = InpClrRiskGreen;
      color c_amarela = C'40,40,40'; // Apagada por padrão
      color c_laranja = C'40,40,40';
      color c_verm    = C'40,40,40';
      
      if(r_ratio >= 0.75) { c_verm = InpClrRiskRed; c_laranja = InpClrRiskOrange; c_amarela = InpClrRiskYellow; }
      else if(r_ratio >= 0.50) { c_laranja = InpClrRiskOrange; c_amarela = InpClrRiskYellow; }
      else if(r_ratio >= 0.25) { c_amarela = InpClrRiskYellow; }
      
      int bx = x + (int)(110*InpScale); // Afastado para a direita para não colidir
      CreateLabel(pref+"C_Sem1_"+id, bx, oy_semaf-3, "●", c_verde, font_l);   bx += (int)(18*InpScale);
      CreateLabel(pref+"C_Sem2_"+id, bx, oy_semaf-3, "●", c_amarela, font_l); bx += (int)(18*InpScale);
      CreateLabel(pref+"C_Sem3_"+id, bx, oy_semaf-3, "●", c_laranja, font_l); bx += (int)(18*InpScale);
      CreateLabel(pref+"C_Sem4_"+id, bx, oy_semaf-3, "●", c_verm, font_l);

     }
   
   int num_rows_calc = (cards_found > 0) ? (cards_found-1)/cards_per_row + 1 : 0;
   int footer_box_h = (int)(45 * InpScale);
   int footer_y = start_y + num_rows_calc * (card_h + 20) + 30;
   int footer_box_w = (int)(300 * InpScale);
   int footer_center_x = chart_w / 2;
   CreateRect(pref+"FootBox", footer_center_x - footer_box_w/2, footer_y, footer_box_w, footer_box_h, InpClrHeader, InpClrBorder);
   CreateLabel(pref+"Footer", footer_center_x, footer_y + (footer_box_h/2), "Nautilus Investing (Risk Managed)", C'50,150,255', font_l, ANCHOR_CENTER);
   ObjectSetString(0, pref+"Footer", OBJPROP_TOOLTIP, "Clique para abrir www.nautilusinvesting.com");
   ObjectSetInteger(0, pref+"Footer", OBJPROP_SELECTABLE, true);
   ChartRedraw();
  }

int OnInit() { ChartSetInteger(0, CHART_SHOW, false); UpdateUI(); EventSetTimer(1); return(INIT_SUCCEEDED); }
void OnDeinit(const int r) { ChartSetInteger(0, CHART_SHOW, true); ObjectsDeleteAll(0, "Sup_"); ChartRedraw(); }
void OnTick() { UpdateUI(); }
void OnTimer() { UpdateUI(); }
void OnChartEvent(const int id, const long &l, const double &d, const string &s) { if(id == CHARTEVENT_OBJECT_CLICK && s == "Sup_Footer") ShellExecuteW(0, "open", "http://www.nautilusinvesting.com", "", "", 1); }
