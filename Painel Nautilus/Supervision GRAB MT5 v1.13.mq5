//+------------------------------------------------------------------+
//|                                         Supervision Grab v1.10   |
//|                               Copyright 2026, Nautilus Investing |
//|                                https://www.nautilusinvesting.com |
//+------------------------------------------------------------------+
#property copyright "Nautilus Investing"
#property link      "https://www.nautilusinvesting.com"
#property version   "1.12"
#property description "Headless EA for Data Collection (Nautilus Ultimate Bridge based on v2.12)"

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
      if(err == 4060) Print("WebRequest Error 4060: Add ", InpDashURL, " to allowed list in MT5 settings.");
      else Print("WebRequest Error: ", err);
   }
}

struct SMagicData {
   long     magic;
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
   ArrayFree(magics);
   g_prof_d=0; g_prof_w=0; g_prof_m=0; g_prof_t=0;
   g_gross_profit=0; g_gross_loss=0; g_trades_today=0;
   HistorySelect(0, TimeCurrent());
   int totalDeals = HistoryDealsTotal();
   if(totalDeals > 0) first_order_date = (datetime)HistoryDealGetInteger(HistoryDealGetTicket(0), DEAL_TIME);
   
   datetime startDay = iTime(_Symbol, PERIOD_D1, 0);
   datetime startWeek = iTime(_Symbol, PERIOD_W1, 0);
   
   // Dia 1º do Mês atual
   MqlDateTime dt;
   TimeCurrent(dt);
   dt.day = 1; dt.hour = 0; dt.min = 0; dt.sec = 0;
   datetime startMonth = StructToTime(dt);
   
   // Varredura Inicial
   for(int i=totalDeals-1; i>=0; i--) {
      ulong t = HistoryDealGetTicket(i);
      long m = HistoryDealGetInteger(t, DEAL_MAGIC);
      long entry = HistoryDealGetInteger(t, DEAL_ENTRY);
      if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY) {
         double p = HistoryDealGetDouble(t, DEAL_PROFIT) + HistoryDealGetDouble(t, DEAL_COMMISSION) + HistoryDealGetDouble(t, DEAL_SWAP);
         datetime tm = (datetime)HistoryDealGetInteger(t, DEAL_TIME);
         g_prof_t += p;
         if(p > 0) g_gross_profit += p; else g_gross_loss += MathAbs(p);
         
         if(tm >= startMonth) g_prof_m += p;
         if(tm >= startWeek)  g_prof_w += p;
         if(tm >= startDay) { g_prof_d += p; g_trades_today++; }
      }
      
      if(m > 0) {
         bool found = false;
         for(int j=0; j<ArraySize(magics); j++) {
            if(magics[j].magic == m) { found = true; break; }
         }
         
         if(!found) {
            int size = ArraySize(magics); 
            ArrayResize(magics, size+1); 
            magics[size].magic = m;
            string cmt = "";
            for(int k=0; k<totalDeals; k++) {
               ulong tk = HistoryDealGetTicket(k);
               if(HistoryDealGetInteger(tk, DEAL_MAGIC) == m && HistoryDealGetInteger(tk, DEAL_ENTRY) == DEAL_ENTRY_IN) {
                  cmt = HistoryDealGetString(tk, DEAL_COMMENT); 
                  if(cmt != "") break;
               }
            }
            if(cmt == "") for(int p=0; p<PositionsTotal(); p++) if(PositionGetInteger(POSITION_MAGIC) == m) { cmt = PositionGetString(POSITION_COMMENT); break; }
            magics[size].comment = cmt;
         }
      }
   }
   
   // Preenchimento dos dados em Tempo Real para cada Robô
   for(int j=0; j<ArraySize(magics); j++) {
      magics[j].buy_lots = 0; magics[j].sell_lots = 0; magics[j].floating = 0;
      magics[j].buy_count = 0; magics[j].sell_count = 0;
      
      for(int i=0; i<PositionsTotal(); i++) {
         if(PositionGetTicket(i) > 0 && PositionGetInteger(POSITION_MAGIC) == magics[j].magic) {
            double vol = PositionGetDouble(POSITION_VOLUME);
            double prof = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
            magics[j].floating += prof;
            if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) {
               magics[j].buy_lots += vol;
               magics[j].buy_count++;
            } else {
               magics[j].sell_lots += vol;
               magics[j].sell_count++;
            }
         }
      }
      
      magics[j].gross_profit=0; magics[j].gross_loss=0;
      
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
               
               magics[j].t_tot++; magics[j].t_prof += p; 
               if(p > 0) { magics[j].t_won++; magics[j].gross_profit += p; } else { magics[j].gross_loss += MathAbs(p); }
               if(tm >= startMonth) { magics[j].m_tot++; magics[j].m_prof += p; if(p > 0) magics[j].m_won++; }
               if(tm >= startWeek) { magics[j].w_tot++; magics[j].w_prof += p; if(p > 0) magics[j].w_won++; }
               if(tm >= startDay) { magics[j].d_tot++; magics[j].d_prof += p; if(p > 0) magics[j].d_won++; }
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Exportação para Ponte com Plataforma Ultimate                    |
//+------------------------------------------------------------------+
string ExportToJSON() {
   long acctNumber = AccountInfoInteger(ACCOUNT_LOGIN);
   string filename = "supervision_data_" + IntegerToString(acctNumber) + ".json";
   int handle = FileOpen(filename, FILE_WRITE|FILE_TXT|FILE_COMMON|FILE_ANSI);
   if(handle == INVALID_HANDLE) return "";
   
   double current_bal = AccountInfoDouble(ACCOUNT_BALANCE);
   double current_eq = AccountInfoDouble(ACCOUNT_EQUITY);
   
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
   for(int i=0; i<numEAs; i++) { tb += magics[i].buy_lots; ts += magics[i].sell_lots; }
   
   double pf_global = (g_gross_loss > 0) ? (g_gross_profit / g_gross_loss) : (g_gross_profit > 0 ? 99.99 : 0);

   string js = "{\n";
   js += "  \"account\": \"" + AccountInfoString(ACCOUNT_NAME) + " - " + IntegerToString(acctNumber) + "\",\n";
   js += "  \"broker\": \"" + AccountInfoString(ACCOUNT_COMPANY) + "\",\n";
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
   js += "  \"totalFloating\": " + DoubleToString(AccountInfoDouble(ACCOUNT_PROFIT), 2) + ",\n";
   js += "  \"activeBuyLots\": " + DoubleToString(tb, 2) + ",\n";
   js += "  \"activeSellLots\": " + DoubleToString(ts, 2) + ",\n";
   js += "  \"activeEAs\": " + IntegerToString(numEAs) + ",\n";
   js += "  \"robots\": [\n";
   
   for(int i=0; i<numEAs; i++) {
      js += "    {\n";
      js += "      \"magic\": " + IntegerToString(magics[i].magic) + ",\n";
      js += "      \"comment\": \"" + magics[i].comment + "\",\n";
      js += "      \"d_won\": " + IntegerToString(magics[i].d_won) + ",\n";
      js += "      \"d_tot\": " + IntegerToString(magics[i].d_tot) + ",\n";
      js += "      \"d_prof\": " + DoubleToString(magics[i].d_prof, 2) + ",\n";
      js += "      \"w_won\": " + IntegerToString(magics[i].w_won) + ",\n";
      js += "      \"w_tot\": " + IntegerToString(magics[i].w_tot) + ",\n";
      js += "      \"w_prof\": " + DoubleToString(magics[i].w_prof, 2) + ",\n";
      js += "      \"m_won\": " + IntegerToString(magics[i].m_won) + ",\n";
      js += "      \"m_tot\": " + IntegerToString(magics[i].m_tot) + ",\n";
      js += "      \"m_prof\": " + DoubleToString(magics[i].m_prof, 2) + ",\n";
      js += "      \"t_won\": " + IntegerToString(magics[i].t_won) + ",\n";
      js += "      \"t_tot\": " + IntegerToString(magics[i].t_tot) + ",\n";
      js += "      \"t_prof\": " + DoubleToString(magics[i].t_prof, 2) + ",\n";
      js += "      \"floating\": " + DoubleToString(magics[i].floating, 2) + ",\n";
      js += "      \"float_pct\": " + DoubleToString((current_bal > 0 ? (magics[i].floating/current_bal)*100.0 : 0), 2) + ",\n";
      js += "      \"buy_lots\": " + DoubleToString(magics[i].buy_lots, 2) + ",\n";
      js += "      \"buy_count\": " + IntegerToString(magics[i].buy_count) + ",\n";
      js += "      \"sell_lots\": " + DoubleToString(magics[i].sell_lots, 2) + ",\n";
      js += "      \"sell_count\": " + IntegerToString(magics[i].sell_count) + "\n";
      js += "    }";
      if(i < numEAs - 1) js += ",";
      js += "\n";
   }
   js += "  ]\n}";
   
   FileWriteString(handle, js);
   FileClose(handle);
   return js;
}

//+------------------------------------------------------------------+
//| Eventos Principais                                               |
//+------------------------------------------------------------------+
int OnInit() {
   Print("Grab v1.13 Headless Started.");
   EventSetTimer(InpRefreshRate);
   CollectData();
   string js = ExportToJSON();
   SendToWeb(js);
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) {
   Print("Grab v1.13 Headless Stopped.");
   EventKillTimer();
}

void OnTimer() {
   CollectData();
   string js = ExportToJSON();
   SendToWeb(js);
}
