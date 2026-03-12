//+------------------------------------------------------------------+
//|                                       Supervision Nautilus v2.10 |
//|                               Copyright 2026, Nautilus Investing |
//|                                https://www.nautilusinvesting.com |
//+------------------------------------------------------------------+

#property copyright "Nautilus Investing"
#property link      "https://www.nautilusinvesting.com"
#property version   "2.10"

#import "shell32.dll"
int ShellExecuteW(int hwnd, string lpOperation, string lpFile, string lpParameters, string lpDirectory, int nShowCmd);
#import

//--- Parâmetros de Entrada
sinput string gui_settings = "=== Configurações de Escala ===";
input double InpScale           = 1.5;           // Escala (Default 1.5)

sinput string risk_sys_settings = "=== Sistema de Alertas ===";
input bool InpEnableAlerts      = true;  // Ativar Alertas no Terminal MT5
input bool InpEnablePush        = true;  // Ativar Push Celular (App MT5 Nativo)
input string InpLimitsFile      = "Nautilus_Limites.csv"; // Arquivo MQL5\Files\

sinput string risk_settings = "=== Gestão de Risco (Semáforo Global) ===";
input double InpMaxDME          = 20.0;          // Drawdown Máximo Estabelecido (DME) em %
input double InpAccountPeak     = 0.0;           // Pico Histórico Override (0 = Auto-Detectar)

sinput string color_settings = "=== Cores do Painel ===";
input color  InpClrBg           = C'5,5,10';     
input color  InpClrCard         = C'15,20,30';   
input color  InpClrHeader       = C'20,30,45';   
input color  InpClrBorder       = C'40,60,90';   
input color  InpClrText         = C'160,170,180';
input color  InpClrTextHl       = clrWhite;      
input color  InpClrProfit       = clrLimeGreen;  
input color  InpClrLoss         = clrTomato;     
input color  InpClrSep          = C'35,45,60';   

// Cores Risco Premium
input color  InpClrRiskGreen    = C'30, 150, 50';
input color  InpClrRiskYellow   = C'220, 180, 0';
input color  InpClrRiskOrange   = C'220, 100, 0';
input color  InpClrRiskRed      = C'220, 40, 40';

// Configurações de Layout
#define FONT_NAME "Segoe UI"
#define CORE_X 20
#define CORE_Y 20

int base_card_w = 280; 
int base_card_h = 340; // Voltamos à altura compacta da versão .09 
int base_head_h = 230; 

int card_w, card_h, head_h;
int font_s, font_m, font_l, font_xl, font_xxl;
datetime first_order_date = 0;
double runtime_peak_equity = 0;
int last_global_risk_level = 0; // 0=Normal, 1=Yellow, 2=Orange, 3=Red

// Estrutura para ler o CSV (Eixo 2)
struct SRobotLimit
  {
   long     magic;
   double   max_lots;
   int      max_entries;
  };
SRobotLimit robot_limits[];

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
   
   // Eixo 2 Controles
   int      status_eixo2; // 0=OK, 1=Cuidado 70%, 2=Estourado 100%
   int      buy_status;   // 0=OK, 1=Cuidado 70%, 2=Estourado 100%
   int      sell_status;  // 0=OK, 1=Cuidado 70%, 2=Estourado 100%
   double   limit_max_lots;
   int      limit_max_entries;
   bool     lotes_anomalos;
   bool     already_alerted; // Para evitar spam de alertas
  };
SMagicData magics[];
double g_prof_d, g_prof_w, g_prof_m, g_prof_t;

//+------------------------------------------------------------------+
//| Funções de Criação de Objetos e Leitura CSV                      |
//+------------------------------------------------------------------+
void LoadLimitsFromCSV()
  {
   ArrayFree(robot_limits);
   int handle = FileOpen(InpLimitsFile, FILE_TXT|FILE_READ|FILE_ANSI);
   if(handle != INVALID_HANDLE)
     {
      // Pula a primeira linha (cabeçalho)
      if(!FileIsEnding(handle)) string header = FileReadString(handle);
      
      while(!FileIsEnding(handle))
        {
         string line = FileReadString(handle);
         StringTrimLeft(line);
         StringTrimRight(line);
         if(StringLen(line) < 3) continue; 
         
         string parts[];
         int k = StringSplit(line, ';', parts);
         if(k >= 3)
           {
            int size = ArraySize(robot_limits);
            ArrayResize(robot_limits, size+1);
            robot_limits[size].magic = StringToInteger(parts[0]);
            StringReplace(parts[1], ",", "."); 
            robot_limits[size].max_lots = StringToDouble(parts[1]);
            robot_limits[size].max_entries = (int)StringToInteger(parts[2]);
           }
        }
      FileClose(handle);
      Print("Nautilus V2.10: ", ArraySize(robot_limits), " Limites de Robôs carregados com sucesso do arquivo: ", InpLimitsFile);
     }
   else
     {
      Print("Nautilus V2.10 Aviso: Arquivo '", InpLimitsFile, "' não encontrado na pasta MQL5\\Files. Nenhuma restrição do Eixo 2 ativa.");
     }
  }

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

void TriggerAlert(string title, string msg)
  {
   if(InpEnableAlerts) Alert(title, "\n", msg);
   if(InpEnablePush) SendNotification("🚨 " + title + "\n" + msg);
  }

//+------------------------------------------------------------------+
//| Coleta de Dados e Verificação de Lotes                           |
//+------------------------------------------------------------------+
void CollectData()
  {
   bool prev_alerts[100]; ArrayInitialize(prev_alerts, false);
   long prev_magics[100];
   int prev_count = ArraySize(magics);
   for(int i=0; i<prev_count && i<100; i++) { prev_magics[i] = magics[i].magic; prev_alerts[i] = magics[i].already_alerted; }

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
            
            magics[size].already_alerted = false;
            for(int prev=0; prev<prev_count && prev<100; prev++) if(prev_magics[prev] == m) magics[size].already_alerted = prev_alerts[prev];

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
      
      magics[j].status_eixo2 = 0; 
      magics[j].buy_status = 0;
      magics[j].sell_status = 0;
      magics[j].limit_max_lots = 0;
      magics[j].limit_max_entries = 0;
      magics[j].lotes_anomalos = false;
      
      for(int idx=0; idx<ArraySize(robot_limits); idx++) {
         if(robot_limits[idx].magic == magics[j].magic) {
            magics[j].limit_max_lots = robot_limits[idx].max_lots;
            magics[j].limit_max_entries = robot_limits[idx].max_entries;
            
            // Calculo Individual da Via de Compras (Buy)
            double b_lots_ratio = (robot_limits[idx].max_lots > 0) ? magics[j].buy_lots / robot_limits[idx].max_lots : 0;
            double b_ent_ratio = (robot_limits[idx].max_entries > 0) ? (double)magics[j].buy_count / robot_limits[idx].max_entries : 0;
            double buy_ratio = MathMax(b_lots_ratio, b_ent_ratio);

            // Calculo Individual da Via de Vendas (Sell)
            double s_lots_ratio = (robot_limits[idx].max_lots > 0) ? magics[j].sell_lots / robot_limits[idx].max_lots : 0;
            double s_ent_ratio = (robot_limits[idx].max_entries > 0) ? (double)magics[j].sell_count / robot_limits[idx].max_entries : 0;
            double sell_ratio = MathMax(s_lots_ratio, s_ent_ratio);
            
            if(buy_ratio >= 1.0) magics[j].buy_status = 2;
            else if(buy_ratio >= 0.70) magics[j].buy_status = 1;
            
            if(sell_ratio >= 1.0) magics[j].sell_status = 2;
            else if(sell_ratio >= 0.70) magics[j].sell_status = 1;

            double max_ratio = MathMax(buy_ratio, sell_ratio);
            
            if(max_ratio >= 1.0) {
                magics[j].status_eixo2 = 2; // Red (100%+)
                magics[j].lotes_anomalos = true;
                
                if(!magics[j].already_alerted) {
                   string roboName = magics[j].comment != "" ? magics[j].comment : "Robo " + IntegerToString(magics[j].magic);
                   double current_lots_max = MathMax(magics[j].buy_lots, magics[j].sell_lots);
                   int current_ent_max = (int)MathMax(magics[j].buy_count, magics[j].sell_count);
                   string l_msg = "Robô: " + roboName + "\nEntrou: " + IntegerToString(current_ent_max) + "x | Lotes: " + DoubleToString(current_lots_max, 2) + "\nLimite Max: " + IntegerToString(robot_limits[idx].max_entries) + "x | " + DoubleToString(robot_limits[idx].max_lots, 2);
                   TriggerAlert("EIXO 2 - DESVIO DETECTADO", l_msg);
                   magics[j].already_alerted = true;
                }
            } else if(max_ratio >= 0.70) {
                magics[j].status_eixo2 = 1; // Yellow (70%)
                magics[j].lotes_anomalos = false;
                magics[j].already_alerted = false; // reseta para tocar novamente quando bater Red
            } else {
                magics[j].status_eixo2 = 0; // Green (Normal)
                magics[j].lotes_anomalos = false;
                magics[j].already_alerted = false; 
            }
            break;
         }
      }

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
//| Atualização da Interface Visual                                  |
//+------------------------------------------------------------------+
void UpdateUI()
  {
   CollectData();
   string pref = "Sup_";
   string curr = AccountInfoString(ACCOUNT_CURRENCY);
   double current_bal = AccountInfoDouble(ACCOUNT_BALANCE);
   double current_eq = AccountInfoDouble(ACCOUNT_EQUITY);
   
   if(current_eq > runtime_peak_equity) runtime_peak_equity = current_eq;
   if(current_bal > runtime_peak_equity) runtime_peak_equity = current_bal;
   
   double peak_ref = (InpAccountPeak > 0) ? InpAccountPeak : runtime_peak_equity;
   if(peak_ref <= 0) peak_ref = 1; 
   
   double current_dd_pct = 0;
   double current_dd_money = 0;
   if(current_eq < peak_ref) {
       current_dd_pct = ((peak_ref - current_eq) / peak_ref) * 100.0;
       current_dd_money = peak_ref - current_eq;
   }
   
   double dme_limit = InpMaxDME;
   if(dme_limit <= 0) dme_limit = 100;
   double dme_limit_money = peak_ref * (dme_limit / 100.0);
   
   double dd_ratio = current_dd_pct / dme_limit;
   long   acctNumber   = AccountInfoInteger(ACCOUNT_LOGIN);
   
   color risk_color = InpClrRiskGreen;
   string risk_label = "NORMAL";
   int current_global_status = 0;
   
   color g_c_verde   = InpClrRiskGreen;
   color g_c_amarela = C'40,40,40';
   color g_c_laranja = C'40,40,40';
   color g_c_verm    = C'40,40,40';
   
   if(dd_ratio >= 0.75) { risk_color = InpClrRiskRed; risk_label = "CRÍTICO"; g_c_verm = InpClrRiskRed; g_c_laranja = InpClrRiskOrange; g_c_amarela = InpClrRiskYellow; current_global_status = 3; }
   else if(dd_ratio >= 0.50) { risk_color = InpClrRiskOrange; risk_label = "CONTENÇÃO"; g_c_laranja = InpClrRiskOrange; g_c_amarela = InpClrRiskYellow; current_global_status = 2;}
   else if(dd_ratio >= 0.25) { risk_color = InpClrRiskYellow; risk_label = "INVESTIGAÇÃO";  g_c_amarela = InpClrRiskYellow; current_global_status = 1;}

   // Lógica Disparo Push Global Eixo 1 (Notifica Rompimento / Risco Subindo com Valores Financeiros)
   if(current_global_status > last_global_risk_level) {
       string msg = "Conta: " + IntegerToString(acctNumber) + "\nDME Rompido atual: -" + DoubleToString(current_dd_money, 2) + " " + curr + "\nLimite DME aceitável: -" + DoubleToString(dme_limit_money, 2) + " " + curr;
       TriggerAlert("EIXO 1 - " + risk_label, msg);
   }
   last_global_risk_level = current_global_status;

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
   
   int head_x = CORE_X;
   int head_w_calc = chart_w - 40;
   CreateRect(pref+"Head", head_x, CORE_Y, head_w_calc, head_h, InpClrHeader, risk_color);
   
   int y0 = CORE_Y + 15;
   int gap_tit_acc = (int)(45 * InpScale); 
   int gap_normal = (int)(34 * InpScale);
   int right_col_x = head_x + head_w_calc - 25;

   CreateLabel(pref+"Tit", head_x+25, y0, "Supervision Nautilus v2.10", InpClrProfit, font_xxl);
   ObjectSetString(0, pref+"Tit", OBJPROP_TOOLTIP, "Clique para abrir www.nautilusinvesting.com");
   ObjectSetInteger(0, pref+"Tit", OBJPROP_SELECTABLE, true);
   
   string risk_text = "STATUS CONTA: " + risk_label + " | DD: " + DoubleToString(current_dd_pct, 2) + "% / DME " + DoubleToString(InpMaxDME, 0) + "%";
   CreateLabel(pref+"GlobalRisk", right_col_x, y0, risk_text, risk_color, font_xl, ANCHOR_RIGHT_UPPER);
   
   int font_huge = (int)(52 * InpScale); 
   int bx_g = right_col_x - (int)(850 * InpScale);
   int offset_semaf_x = (int)(50 * InpScale);
   int offset_semaf_y = y0 - (int)(15 * InpScale); 
   
   CreateLabel(pref+"GSem1", bx_g, offset_semaf_y, "●", g_c_verde, font_huge);   bx_g += offset_semaf_x;
   CreateLabel(pref+"GSem2", bx_g, offset_semaf_y, "●", g_c_amarela, font_huge); bx_g += offset_semaf_x;
   CreateLabel(pref+"GSem3", bx_g, offset_semaf_y, "●", g_c_laranja, font_huge); bx_g += offset_semaf_x;
   CreateLabel(pref+"GSem4", bx_g, offset_semaf_y, "●", g_c_verm, font_huge);
   
   int y1 = y0 + gap_tit_acc;
   string accName = AccountInfoString(ACCOUNT_NAME);
   CreateLabel(pref+"AccL", head_x+25, y1, "Conta: " + accName + " | Pico Ref: " + DoubleToString(peak_ref, 2), InpClrText, font_m);
   CreateLabel(pref+"FloatT", right_col_x, y1, "Flutuante Global", InpClrText, font_l, ANCHOR_RIGHT_UPPER);
   
   int y2 = y1 + gap_normal;
   string srvT = TimeToString(TimeCurrent(), TIME_SECONDS);
   string locT = TimeToString(TimeLocal(), TIME_SECONDS);
   CreateLabel(pref+"TimeL", head_x+25, y2, "Hora Servidor: "+srvT+"  |  Local (BR): "+locT, InpClrText, font_m);
   
   double floatTot = AccountInfoDouble(ACCOUNT_PROFIT);
   CreateLabel(pref+"FloatV", right_col_x, y2, DoubleToString(floatTot, 2)+" "+curr, floatTot>=0?InpClrProfit:InpClrLoss, font_xl, ANCHOR_RIGHT_UPPER);
   
   int y3 = y2 + gap_normal;
   string dbDate = (first_order_date > 0) ? TimeToString(first_order_date, TIME_DATE) : "Sem Reg.";
   CreateLabel(pref+"StatsL", head_x+25, y3, "Quantidade de Robôs: "+IntegerToString(ArraySize(magics))+"   |   Data DataBase: "+dbDate, InpClrText, font_m);
   
   CreateLabel(pref+"Bal", right_col_x, y3, "Saldo Bruto: "+DoubleToString(current_bal, 2), InpClrTextHl, font_l, ANCHOR_RIGHT_UPPER);
   
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
      
      double r_dd_pct = (magics[i].floating < 0 && peak_ref > 0) ? (MathAbs(magics[i].floating) / peak_ref) * 100.0 : 0;
      double r_ratio = r_dd_pct / dme_limit;
      
      color card_b_color = InpClrBorder;
      if(r_ratio >= 0.75) card_b_color = InpClrRiskRed;
      else if(r_ratio >= 0.50) card_b_color = InpClrRiskOrange;
      else if(r_ratio >= 0.25) card_b_color = InpClrRiskYellow;

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
      
      // Cores Independentes por Lado (Compra vs Venda)
      color c_buy_t = InpClrText; 
      if(magics[i].buy_status == 2) c_buy_t = InpClrRiskRed;
      else if(magics[i].buy_status == 1) c_buy_t = InpClrRiskYellow;

      color c_sell_t = InpClrText;
      if(magics[i].sell_status == 2) c_sell_t = InpClrRiskRed;
      else if(magics[i].sell_status == 1) c_sell_t = InpClrRiskYellow;
      
      color c_lote_warn = InpClrText;
      string s_lote_warn = "Lotes OK";
      
      // Avaliação Global da Mensagem de Alerta Inferior
      if(magics[i].status_eixo2 == 2) {
          c_lote_warn = InpClrRiskRed;
          s_lote_warn = "DESVIO CRÍTICO NOS LOTES";
      } else if (magics[i].status_eixo2 == 1) {
          c_lote_warn = InpClrRiskYellow;
          s_lote_warn = "⚠️ ATENÇÃO: LIMITE PRÓXIMO (70%)";
      } else if (magics[i].limit_max_lots > 0 || magics[i].limit_max_entries > 0) {
          c_lote_warn = InpClrRiskGreen;
          s_lote_warn = "Lotes OK";
      } else {
          c_lote_warn = InpClrText;
          s_lote_warn = "Lotes Não Configurado";
      }

      CreateLabel(pref+"C_BuyL_"+id, x+15, oy, "Lotes Compra: "+DoubleToString(magics[i].buy_lots, 2)+" | "+IntegerToString(magics[i].buy_count)+"x", c_buy_t, font_m);
      CreateLabel(pref+"C_SelL_"+id, x+15, oy+(int)(20*InpScale), "Lotes Venda: "+DoubleToString(magics[i].sell_lots, 2)+" | "+IntegerToString(magics[i].sell_count)+"x", c_sell_t, font_m);
      
      int oy_warn = oy+(int)(40*InpScale);
      CreateLabel(pref+"C_Warn_"+id, x+15, oy_warn, s_lote_warn, c_lote_warn, font_s);

      CreateLabel(pref+"C_FloatL_"+id, x+15, oy+(int)(60*InpScale), "Flutuante Robô:", InpClrText, font_m);
      CreateLabel(pref+"C_FloatV_"+id, x+card_w-15, oy+(int)(60*InpScale), DoubleToString(magics[i].floating, 2) + " " + curr, magics[i].floating>=0?InpClrProfit:InpClrLoss, font_m, ANCHOR_RIGHT_UPPER);

      double f_pct = (current_bal > 0) ? (magics[i].floating / current_bal) * 100.0 : 0;
      CreateLabel(pref+"C_FloatPct_"+id, x+card_w-15, oy+(int)(78*InpScale), "("+DoubleToString(f_pct, 2)+"%)", magics[i].floating>=0?InpClrProfit:InpClrLoss, font_m, ANCHOR_RIGHT_UPPER);

      int oy_semaf = oy+(int)(115*InpScale);
      CreateLabel(pref+"C_SensL_"+id, x+15, oy_semaf, "Risco Unitário:", InpClrText, font_s);
      
      color c_verde   = InpClrRiskGreen;
      color c_amarela = C'40,40,40'; 
      color c_laranja = C'40,40,40';
      color c_verm    = C'40,40,40';
      
      if(r_ratio >= 0.75) { c_verm = InpClrRiskRed; c_laranja = InpClrRiskOrange; c_amarela = InpClrRiskYellow; }
      else if(r_ratio >= 0.50) { c_laranja = InpClrRiskOrange; c_amarela = InpClrRiskYellow; }
      else if(r_ratio >= 0.25) { c_amarela = InpClrRiskYellow; }
      
      int bx = x + (int)(120*InpScale); 
      CreateLabel(pref+"C_Sem1_"+id, bx, oy_semaf-3, "●", c_verde, font_l);   bx += (int)(18*InpScale);
      CreateLabel(pref+"C_Sem2_"+id, bx, oy_semaf-3, "●", c_amarela, font_l); bx += (int)(18*InpScale);
      CreateLabel(pref+"C_Sem3_"+id, bx, oy_semaf-3, "●", c_laranja, font_l); bx += (int)(18*InpScale);
      CreateLabel(pref+"C_Sem4_"+id, bx, oy_semaf-3, "●", c_verm, font_l);
     }
   
   ChartRedraw();
  }

int OnInit() { 
    ChartSetInteger(0, CHART_SHOW, false); 
    LoadLimitsFromCSV(); 
    UpdateUI(); 
    EventSetTimer(1); 
    return(INIT_SUCCEEDED); 
}
void OnDeinit(const int r) { ChartSetInteger(0, CHART_SHOW, true); ObjectsDeleteAll(0, "Sup_"); ChartRedraw(); }
void OnTick() { UpdateUI(); }
void OnTimer() { UpdateUI(); }
void OnChartEvent(const int id, const long &l, const double &d, const string &s) {
    if(id == CHARTEVENT_OBJECT_CLICK && s == "Sup_Tit") {
        ShellExecuteW(0, "open", "http://www.nautilusinvesting.com", "", "", 1); 
    }
}
