//+------------------------------------------------------------------+
//|                                         Supervision Grab v1.03   |
//|                               Copyright 2026, Nautilus Investing |
//|                                https://www.nautilusinvesting.com |
//+------------------------------------------------------------------+
#property copyright "Nautilus Investing"
#property link      "https://www.nautilusinvesting.com"
#property version   "1.03"
#property description "Headless EA for Data Collection (Nautilus Ultimate Bridge based on v2.12)"

input int InpRefreshRate = 1;     // Update Rate (seconds)
input double InpMaxDME = 20.0;    // Maximum DME (%)
input string InpLimitsFile = "Nautilus_Limites.csv"; // Arquivo MQL5\Files\

// Estrutura para ler o CSV (Eixo 2)
struct SRobotLimit
  {
   long     magic;
   double   max_lots;
   int      max_entries;
  };
SRobotLimit robot_limits[];

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
   
   // Eixo 2 Controles
   int      status_eixo2; // 0=OK, 1=Cuidado 70%, 2=Estourado 100%
   int      buy_status;   // 0=OK, 1=Cuidado 70%, 2=Estourado 100%
   int      sell_status;  // 0=OK, 1=Cuidado 70%, 2=Estourado 100%
   double   limit_max_lots;
   int      limit_max_entries;
   bool     lotes_anomalos;
};

SMagicData magics[];
double g_prof_d, g_prof_w, g_prof_m, g_prof_t;
datetime first_order_date = 0;
double runtime_peak_equity = 0;

//+------------------------------------------------------------------+
//| Leitura CSV                                                      |
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
      Print("Grab v1.03: ", ArraySize(robot_limits), " Limites carregados do arquivo: ", InpLimitsFile);
     }
   else
     {
      Print("Grab v1.03 Aviso: Arquivo '", InpLimitsFile, "' não encontrado.");
     }
  }

//+------------------------------------------------------------------+
//| Coleta de Dados Pura                                             |
//+------------------------------------------------------------------+
void CollectData() {
   ArrayFree(magics);
   g_prof_d=0; g_prof_w=0; g_prof_m=0; g_prof_t=0;
   HistorySelect(0, TimeCurrent());
   int totalDeals = HistoryDealsTotal();
   if(totalDeals > 0) first_order_date = (datetime)HistoryDealGetInteger(HistoryDealGetTicket(0), DEAL_TIME);
   
   datetime startDay = iTime(_Symbol, PERIOD_D1, 0);
   datetime startWeek = iTime(_Symbol, PERIOD_W1, 0);
   datetime startMonth = iTime(_Symbol, PERIOD_MN1, 0);
   
   // Varredura Inicial
   for(int i=totalDeals-1; i>=0; i--) {
      ulong t = HistoryDealGetTicket(i);
      long m = HistoryDealGetInteger(t, DEAL_MAGIC);
      long entry = HistoryDealGetInteger(t, DEAL_ENTRY);
      if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY) {
         double p = HistoryDealGetDouble(t, DEAL_PROFIT) + HistoryDealGetDouble(t, DEAL_COMMISSION) + HistoryDealGetDouble(t, DEAL_SWAP);
         datetime tm = (datetime)HistoryDealGetInteger(t, DEAL_TIME);
         g_prof_t += p;
         if(tm >= startMonth) g_prof_m += p;
         if(tm >= startWeek)  g_prof_w += p;
         if(tm >= startDay)   g_prof_d += p;
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
            
            double b_lots_ratio = (robot_limits[idx].max_lots > 0) ? magics[j].buy_lots / robot_limits[idx].max_lots : 0;
            double b_ent_ratio = (robot_limits[idx].max_entries > 0) ? (double)magics[j].buy_count / robot_limits[idx].max_entries : 0;
            double buy_ratio = MathMax(b_lots_ratio, b_ent_ratio);

            double s_lots_ratio = (robot_limits[idx].max_lots > 0) ? magics[j].sell_lots / robot_limits[idx].max_lots : 0;
            double s_ent_ratio = (robot_limits[idx].max_entries > 0) ? (double)magics[j].sell_count / robot_limits[idx].max_entries : 0;
            double sell_ratio = MathMax(s_lots_ratio, s_ent_ratio);
            
            if(buy_ratio >= 0.999) magics[j].buy_status = 2;
            else if(buy_ratio >= 0.699) magics[j].buy_status = 1;
            
            if(sell_ratio >= 0.999) magics[j].sell_status = 2;
            else if(sell_ratio >= 0.699) magics[j].sell_status = 1;

            double max_ratio = MathMax(buy_ratio, sell_ratio);
            
            if(max_ratio >= 0.999) {
                magics[j].status_eixo2 = 2; 
                magics[j].lotes_anomalos = true;
            } else if(max_ratio >= 0.699) {
                magics[j].status_eixo2 = 1; 
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
//| Exportação para Ponte com Plataforma Ultimate                    |
//+------------------------------------------------------------------+
void ExportToJSON() {
   int handle = FileOpen("supervision_data.json", FILE_WRITE|FILE_TXT|FILE_COMMON|FILE_ANSI);
   if(handle == INVALID_HANDLE) return;
   
   double current_bal = AccountInfoDouble(ACCOUNT_BALANCE);
   double current_eq = AccountInfoDouble(ACCOUNT_EQUITY);
   
   if(current_eq > runtime_peak_equity) runtime_peak_equity = current_eq;
   if(current_bal > runtime_peak_equity) runtime_peak_equity = current_bal;
   
   double peak_ref = runtime_peak_equity;
   if(peak_ref <= 0) peak_ref = 1; 
   
   double current_dd_pct = 0;
   if(current_eq < peak_ref) current_dd_pct = ((peak_ref - current_eq) / peak_ref) * 100.0;
   
   double dme_limit = InpMaxDME;
   if(dme_limit <= 0) dme_limit = 100;
   double dd_ratio = current_dd_pct / dme_limit;
   long acctNumber = AccountInfoInteger(ACCOUNT_LOGIN);
   
   int global_risk = 0; // 0=Green, 1=Yellow, 2=Orange, 3=Red
   if(dd_ratio >= 0.75) global_risk = 3;
   else if(dd_ratio >= 0.50) global_risk = 2;
   else if(dd_ratio >= 0.25) global_risk = 1;

   string dbDate = (first_order_date > 0) ? TimeToString(first_order_date, TIME_DATE) : "Sem Reg.";
   string srvT = TimeToString(TimeCurrent(), TIME_SECONDS);
   string locT = TimeToString(TimeLocal(), TIME_SECONDS);

   double tb = 0, ts = 0;
   int numEAs = ArraySize(magics);
   for(int i=0; i<numEAs; i++) { tb += magics[i].buy_lots; ts += magics[i].sell_lots; }
   
   string js = "{\n";
   js += "  \"account\": \"" + AccountInfoString(ACCOUNT_NAME) + " - " + IntegerToString(acctNumber) + "\",\n";
   js += "  \"broker\": \"" + AccountInfoString(ACCOUNT_COMPANY) + "\",\n";
   js += "  \"balance\": " + DoubleToString(current_bal, 2) + ",\n";
   js += "  \"equity\": " + DoubleToString(current_eq, 2) + ",\n";
   js += "  \"dbDate\": \"" + dbDate + "\",\n";
   js += "  \"serverTime\": \"" + srvT + "\",\n";
   js += "  \"localTime\": \"" + locT + "\",\n";
   js += "  \"globalRiskLevel\": " + IntegerToString(global_risk) + ",\n";
   js += "  \"ddPct\": " + DoubleToString(current_dd_pct, 2) + ",\n";
   js += "  \"dmeMax\": " + DoubleToString(dme_limit, 2) + ",\n";
   js += "  \"totalProfit\": " + DoubleToString(g_prof_t, 2) + ",\n";
   js += "  \"dayProfit\": " + DoubleToString(g_prof_d, 2) + ",\n";
   js += "  \"weekProfit\": " + DoubleToString(g_prof_w, 2) + ",\n";
   js += "  \"monthProfit\": " + DoubleToString(g_prof_m, 2) + ",\n";
   js += "  \"totalFloating\": " + DoubleToString(AccountInfoDouble(ACCOUNT_PROFIT), 2) + ",\n";
   js += "  \"activeBuyLots\": " + DoubleToString(tb, 2) + ",\n";
   js += "  \"activeSellLots\": " + DoubleToString(ts, 2) + ",\n";
   js += "  \"activeEAs\": " + IntegerToString(numEAs) + ",\n";
   js += "  \"robots\": [\n";
   
   for(int i=0; i<numEAs; i++) {
      string a_level = "normal";
      string a_msg = "";
      if(magics[i].status_eixo2 == 2) { a_level = "danger"; a_msg = "DESVIO CRITICO NOS LOTES"; }
      else if(magics[i].status_eixo2 == 1) { a_level = "warning"; a_msg = "LIMITE DE LOTES PROXIMO"; }
      
      double r_dd_pct = (magics[i].floating < 0 && peak_ref > 0) ? (MathAbs(magics[i].floating) / peak_ref) * 100.0 : 0;
      double r_ratio = r_dd_pct / dme_limit;
      int r_risk = 0;
      if(r_ratio >= 0.75) r_risk = 3;
      else if(r_ratio >= 0.50) r_risk = 2;
      else if(r_ratio >= 0.25) r_risk = 1;
      
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
      js += "      \"sell_count\": " + IntegerToString(magics[i].sell_count) + ",\n";
      js += "      \"limit_max_lots\": " + DoubleToString(magics[i].limit_max_lots, 2) + ",\n";
      js += "      \"limit_max_entries\": " + IntegerToString(magics[i].limit_max_entries) + ",\n";
      js += "      \"buy_status\": " + IntegerToString(magics[i].buy_status) + ",\n";
      js += "      \"sell_status\": " + IntegerToString(magics[i].sell_status) + ",\n";
      js += "      \"unit_risk\": " + IntegerToString(r_risk) + ",\n";
      js += "      \"alertLevel\": \"" + a_level + "\",\n";
      js += "      \"alertMsg\": \"" + a_msg + "\"\n";
      js += "    }";
      if(i < numEAs - 1) js += ",";
      js += "\n";
   }
   js += "  ]\n}";
   
   FileWriteString(handle, js);
   FileClose(handle);
}

//+------------------------------------------------------------------+
//| Eventos Principais                                               |
//+------------------------------------------------------------------+
int OnInit() {
   Print("Grab v1.03 Headless Started.");
   LoadLimitsFromCSV();
   EventSetTimer(InpRefreshRate);
   CollectData();
   ExportToJSON();
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) {
   Print("Grab v1.03 Headless Stopped.");
   EventKillTimer();
}

void OnTimer() {
   CollectData();
   ExportToJSON();
}
