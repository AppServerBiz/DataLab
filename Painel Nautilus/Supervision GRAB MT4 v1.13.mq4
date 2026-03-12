//+------------------------------------------------------------------+
//|                                         Supervision Grab MT4     |
//|                               Copyright 2026, Nautilus Investing |
//|                                https://www.nautilusinvesting.com |
//+------------------------------------------------------------------+
#property copyright "Nautilus Investing"
#property link      "https://www.nautilusinvesting.com"
#property version   "1.12"
#property strict
#property description "Headless EA for Data Collection (Nautilus Ultimate Bridge) - MT4 Version"

input int InpRefreshRate = 1;     // Update Rate (seconds)
input string InpDashURL = "http://localhost:3001/api/update"; // Dashboard URL (API)

//+------------------------------------------------------------------+
//| Envio Remoto via WebRequest                                      |
//+------------------------------------------------------------------+
void SendToWeb(string json) {
   if(InpDashURL == "") return;
   
   char data[], result[];
   string headers;
   int res;
   
   StringToCharArray(json, data, 0, WHOLE_ARRAY, CP_UTF8);
   headers = "Content-Type: application/json\r\n";
   
   res = WebRequest("POST", InpDashURL, headers, 1000, data, result, headers);
   
   if(res == -1) {
      int err = GetLastError();
      if(err == 4060) Print("WebRequest Error 4060: Add ", InpDashURL, " to allowed list in MT4 settings.");
      else Print("WebRequest Error: ", err);
   }
}

struct SMagicData {
   int      magic;
   string   comment;
   int      d_won, d_tot; double d_prof;
   int      w_won, w_tot; double w_prof;
   int      m_won, m_tot; double m_prof;
   int      t_won, t_tot; double t_prof;
   
   double   buy_lots, sell_lots;
   int      buy_count, sell_count;
   double   floating;
   double   gross_profit, gross_loss;
};

SMagicData magics[];
double g_prof_d, g_prof_w, g_prof_m, g_prof_t;
double g_gross_profit, g_gross_loss;
int g_trades_today;
datetime first_order_date = 0;
double runtime_peak_equity = 0;

// Limites Removidos do EA - A Dashboard assumirá este papel

//+------------------------------------------------------------------+
//| Coleta de Dados Pura                                             |
//+------------------------------------------------------------------+
void CollectData() {
   ArrayResize(magics, 0);
   g_prof_d=0; g_prof_w=0; g_prof_m=0; g_prof_t=0;
   g_gross_profit=0; g_gross_loss=0; g_trades_today=0;
   
   datetime startDay = iTime(Symbol(), PERIOD_D1, 0);
   datetime startWeek = iTime(Symbol(), PERIOD_W1, 0);
   
   // Dia 1º do Mês atual
   datetime startMonth = StringToTime(IntegerToString(Year())+"."+IntegerToString(Month())+".01 00:00:00");
   
   // Varredura Inicial no Histórico MT4
   int hist_total = OrdersHistoryTotal();
   for(int i=0; i<hist_total; i++) {
      if(OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) {
         int m = OrderMagicNumber();
         if(first_order_date == 0) first_order_date = OrderOpenTime();
         double p = OrderProfit() + OrderCommission() + OrderSwap();
         datetime tm = OrderCloseTime();
         
         if(OrderType() == OP_BUY || OrderType() == OP_SELL) {
             g_prof_t += p;
             if(p > 0) g_gross_profit += p; else g_gross_loss += MathAbs(p);

             if(tm >= startMonth) g_prof_m += p;
             if(tm >= startWeek)  g_prof_w += p;
             if(tm >= startDay) { g_prof_d += p; g_trades_today++; }
             
             if(m > 0) {
                 bool found = false;
                 for(int j=0; j<ArraySize(magics); j++) {
                    if(magics[j].magic == m) { found = true; break; }
                 }
                 if(!found) {
                    int size = ArraySize(magics); 
                    ArrayResize(magics, size+1); 
                    magics[size].magic = m;
                    magics[size].comment = OrderComment();
                 }
             }
         }
      }
   }
   
   // Preencher os magics tb com ordens abertas, caso o robô ainda não fechou nenhuma
   int totalTrades = OrdersTotal();
   for(int k=0; k<totalTrades; k++) {
      if(OrderSelect(k, SELECT_BY_POS, MODE_TRADES)) {
         int m2 = OrderMagicNumber();
         if(m2 > 0) {
            bool found2 = false;
            for(int j2=0; j2<ArraySize(magics); j2++) {
               if(magics[j2].magic == m2) { found2 = true; break; }
            }
            if(!found2) {
               int size2 = ArraySize(magics); 
               ArrayResize(magics, size2+1); 
               magics[size2].magic = m2;
               magics[size2].comment = OrderComment();
            }
         }
      }
   }
   
   // Preenchimento dos dados em Tempo Real para cada Robô
   for(int j3=0; j3<ArraySize(magics); j3++) {
      magics[j3].buy_lots = 0; magics[j3].sell_lots = 0; magics[j3].floating = 0;
      magics[j3].buy_count = 0; magics[j3].sell_count = 0;
      
      for(int a=0; a<totalTrades; a++) {
         if(OrderSelect(a, SELECT_BY_POS, MODE_TRADES)) {
            if(OrderMagicNumber() == magics[j3].magic) {
               int type = OrderType();
               if(type == OP_BUY || type == OP_SELL) {
                  double vol = OrderLots();
                  double float_prof = OrderProfit() + OrderSwap() + OrderCommission();
                  magics[j3].floating += float_prof;
                  if(type == OP_BUY) {
                     magics[j3].buy_lots += vol;
                     magics[j3].buy_count++;
                  } else {
                     magics[j3].sell_lots += vol;
                     magics[j3].sell_count++;
                  }
               }
            }
         }
      }
      
      magics[j3].gross_profit=0; magics[j3].gross_loss=0;
      
      magics[j3].d_tot=0; magics[j3].d_won=0; magics[j3].d_prof=0;
      magics[j3].w_tot=0; magics[j3].w_won=0; magics[j3].w_prof=0;
      magics[j3].m_tot=0; magics[j3].m_won=0; magics[j3].m_prof=0;
      magics[j3].t_tot=0; magics[j3].t_won=0; magics[j3].t_prof=0;
      
      for(int b=0; b<hist_total; b++) {
         if(OrderSelect(b, SELECT_BY_POS, MODE_HISTORY)) {
            if(OrderMagicNumber() == magics[j3].magic && (OrderType()==OP_BUY || OrderType()==OP_SELL)) {
               double hist_p = OrderProfit() + OrderCommission() + OrderSwap();
               datetime hist_tm = OrderCloseTime();
               
               magics[j3].t_tot++; magics[j3].t_prof += hist_p; 
               if(hist_p > 0) { magics[j3].t_won++; magics[j3].gross_profit += hist_p; } else { magics[j3].gross_loss += MathAbs(hist_p); }               
               if(hist_tm >= startMonth) { magics[j3].m_tot++; magics[j3].m_prof += hist_p; if(hist_p > 0) magics[j3].m_won++; }
               if(hist_tm >= startWeek) { magics[j3].w_tot++; magics[j3].w_prof += hist_p; if(hist_p > 0) magics[j3].w_won++; }
               if(hist_tm >= startDay) { magics[j3].d_tot++; magics[j3].d_prof += hist_p; if(hist_p > 0) magics[j3].d_won++; }
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Exportação para Ponte com Plataforma Ultimate                    |
//+------------------------------------------------------------------+
string ExportToJSON() {
   long acctNumber = AccountNumber();
   string filename = "supervision_data_" + IntegerToString(acctNumber) + ".json";
   int handle = FileOpen(filename, FILE_WRITE|FILE_TXT|FILE_COMMON|FILE_ANSI);
   if(handle == INVALID_HANDLE) return "";
   
   double current_bal = AccountBalance();
   double current_eq = AccountEquity();
   
   if(current_eq > runtime_peak_equity) runtime_peak_equity = current_eq;
   if(current_bal > runtime_peak_equity) runtime_peak_equity = current_bal;
   
   double peak_ref = runtime_peak_equity;
   if(peak_ref <= 0) peak_ref = 1; 
   
   double current_dd_pct = 0;
   if(current_eq < peak_ref) current_dd_pct = ((peak_ref - current_eq) / peak_ref) * 100.0;

   string dbDate = (first_order_date > 0) ? TimeToString(first_order_date, TIME_DATE) : "Sem Reg.";
   string srvT = TimeToString(TimeCurrent(), TIME_SECONDS);
   string locT = TimeToString(TimeLocal(), TIME_SECONDS);

   double tb = 0, ts = 0;
   int numEAs = ArraySize(magics);
   for(int z=0; z<numEAs; z++) { tb += magics[z].buy_lots; ts += magics[z].sell_lots; }
   
   double pf_global = (g_gross_loss > 0) ? (g_gross_profit / g_gross_loss) : (g_gross_profit > 0 ? 99.99 : 0);

   string js = "{\n";
   js += "  \"account\": \"" + AccountName() + " - " + IntegerToString(acctNumber) + "\",\n";
   js += "  \"broker\": \"" + AccountCompany() + "\",\n";
   js += "  \"balance\": " + DoubleToString(current_bal, 2) + ",\n";
   js += "  \"equity\": " + DoubleToString(current_eq, 2) + ",\n";
   js += "  \"dbDate\": \"" + dbDate + "\",\n";
   js += "  \"serverTime\": \"" + srvT + "\",\n";
   js += "  \"localTime\": \"" + locT + "\",\n";
   js += "  \"ddPct\": " + DoubleToString(current_dd_pct, 2) + ",\n";
   js += "  \"totalProfit\": " + DoubleToString(g_prof_t, 2) + ",\n";
   js += "  \"dayProfit\": " + DoubleToString(g_prof_d, 2) + ",\n";
   js += "  \"weekProfit\": " + DoubleToString(g_prof_w, 2) + ",\n";
   js += "  \"monthProfit\": " + DoubleToString(g_prof_m, 2) + ",\n";
   js += "  \"profitFactor\": " + DoubleToString(pf_global, 2) + ",\n";
   js += "  \"tradesToday\": " + IntegerToString(g_trades_today) + ",\n";
   js += "  \"totalFloating\": " + DoubleToString(current_eq - current_bal, 2) + ",\n";
   js += "  \"activeBuyLots\": " + DoubleToString(tb, 2) + ",\n";
   js += "  \"activeSellLots\": " + DoubleToString(ts, 2) + ",\n";
   js += "  \"activeEAs\": " + IntegerToString(numEAs) + ",\n";
   js += "  \"robots\": [\n";
   for(int c=0; c<numEAs; c++) {
      js += "    {\n";
      js += "      \"magic\": " + IntegerToString(magics[c].magic) + ",\n";
      js += "      \"comment\": \"" + magics[c].comment + "\",\n";
      js += "      \"d_won\": " + IntegerToString(magics[c].d_won) + ",\n";
      js += "      \"d_tot\": " + IntegerToString(magics[c].d_tot) + ",\n";
      js += "      \"d_prof\": " + DoubleToString(magics[c].d_prof, 2) + ",\n";
      js += "      \"w_won\": " + IntegerToString(magics[c].w_won) + ",\n";
      js += "      \"w_tot\": " + IntegerToString(magics[c].w_tot) + ",\n";
      js += "      \"w_prof\": " + DoubleToString(magics[c].w_prof, 2) + ",\n";
      js += "      \"m_won\": " + IntegerToString(magics[c].m_won) + ",\n";
      js += "      \"m_tot\": " + IntegerToString(magics[c].m_tot) + ",\n";
      js += "      \"m_prof\": " + DoubleToString(magics[c].m_prof, 2) + ",\n";
      js += "      \"t_won\": " + IntegerToString(magics[c].t_won) + ",\n";
      js += "      \"t_tot\": " + IntegerToString(magics[c].t_tot) + ",\n";
      js += "      \"t_prof\": " + DoubleToString(magics[c].t_prof, 2) + ",\n";
      js += "      \"floating\": " + DoubleToString(magics[c].floating, 2) + ",\n";
      js += "      \"float_pct\": " + DoubleToString((current_bal > 0 ? (magics[c].floating/current_bal)*100.0 : 0), 2) + ",\n";
      js += "      \"buy_lots\": " + DoubleToString(magics[c].buy_lots, 2) + ",\n";
      js += "      \"buy_count\": " + IntegerToString(magics[c].buy_count) + ",\n";
      js += "      \"sell_lots\": " + DoubleToString(magics[c].sell_lots, 2) + ",\n";
      js += "      \"sell_count\": " + IntegerToString(magics[c].sell_count) + "\n";
      js += "    }";
      if(c < numEAs - 1) js += ",";
      js += "\n";
   }
   js += "  ]\n}\n";
   
   FileWriteString(handle, js);
   FileClose(handle);
   return js;
}

//+------------------------------------------------------------------+
//| Eventos Principais                                               |
//+------------------------------------------------------------------+
int OnInit() {
   Print("Grab MT4 v1.13 Headless Started.");
   EventSetTimer(InpRefreshRate);
   CollectData();
   string js = ExportToJSON();
   SendToWeb(js);
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) {
   Print("Grab MT4 v1.13 Headless Stopped.");
   EventKillTimer();
}

void OnTimer() {
   CollectData();
   string js = ExportToJSON();
   SendToWeb(js);
}
