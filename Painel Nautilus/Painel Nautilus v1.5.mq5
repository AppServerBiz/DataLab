//+------------------------------------------------------------------+
//|                                         Painel Nautilus v1.5.mq5 |
//|                               Copyright 2026, Nautilus Investing |
//|                                https://www.nautilusinvesting.com |
//+------------------------------------------------------------------+

#property copyright "Nautilus Investing"
#property link      "https://www.nautilusinvesting.com"
#property version   "1.50"
#property indicator_chart_window

#import "shell32.dll"
int ShellExecuteW(int hwnd, string lpOperation, string lpFile, string lpParameters, string lpDirectory, int nShowCmd);
#import

//--- Enumeração customizada em Português
enum ENUM_CANTO
  {
   Canto_Superior_Esquerdo, // Superior Esquerdo
   Canto_Superior_Direito,  // Superior Direito
   Canto_Inferior_Esquerdo, // Inferior Esquerdo
   Canto_Inferior_Direito   // Inferior Direito
  };

//--- Parâmetros de Posição
sinput string gui_settings = "=== Configurações da Janela ===";
input ENUM_CANTO InpCanto       = Canto_Superior_Esquerdo; // Canto de Fixação
input int    InpPanelX          = 20;            // Distância X (Pixels)
input int    InpPanelY          = 20;            // Distância Y (Pixels)

//--- Parâmetros do Painel
sinput string pnl_settings = "=== Conteúdo do Painel ===";
input bool   InpAutoMagic       = true;          // Auto-Detectar Robô no Gráfico?
input long   InpMagicNumber     = 0;             // Magic Number Manual (se Auto=False)

//--- Parâmetros de Cores
sinput string color_settings = "=== Cores do Painel ===";
input color  InpClrBg           = C'15,20,30';   // Cor de Fundo
input color  InpClrBorder       = C'40,80,120';  // Cor da Borda
input color  InpClrText         = C'140,150,160';// Texto Padrão
input color  InpClrTextHl       = clrWhite;      // Texto em Destaque
input color  InpClrBuy          = C'0,150,255';  // Cor Compra
input color  InpClrSell         = clrOrange;     // Cor Venda
input color  InpClrProfit       = clrLimeGreen;  // Cor Lucro
input color  InpClrLoss         = clrTomato;     // Cor Prejuízo
input color  InpClrSep          = C'30,40,50';   // Linha Separadora

// Fontes e Layout
#define FONT_NAME "Segoe UI"
#define FONT_SIZE 9
#define FONT_SIZE_TITLE 10

int panel_w = 480;
int panel_h = 500;
long active_magic = 0;

//+------------------------------------------------------------------+
//| Mapeamento de Canto                                              |
//+------------------------------------------------------------------+
ENUM_BASE_CORNER GetBaseCorner()
  {
   switch(InpCanto)
     {
      case Canto_Superior_Esquerdo: return CORNER_LEFT_UPPER;
      case Canto_Superior_Direito:  return CORNER_RIGHT_UPPER;
      case Canto_Inferior_Esquerdo: return CORNER_LEFT_LOWER;
      case Canto_Inferior_Direito:  return CORNER_RIGHT_LOWER;
     }
   return CORNER_LEFT_UPPER;
  }

//+------------------------------------------------------------------+
//| Cálculo de Y relativo ao topo do painel                          |
//+------------------------------------------------------------------+
int GetY(int offset_from_top)
  {
   if(InpCanto == Canto_Superior_Esquerdo || InpCanto == Canto_Superior_Direito)
      return InpPanelY + offset_from_top;
   // Para cantos inferiores, o Y é medido de baixo para cima.
   // Para manter o visual idêntico, invertemos o offset dentro do painel.
   return InpPanelY + (panel_h - offset_from_top);
  }

//+------------------------------------------------------------------+
//| Funções de Criação de GUI                                        |
//+------------------------------------------------------------------+
void CreateLabel(string name, int x, int y_offset, string text, color clr, int size = FONT_SIZE, ENUM_ANCHOR_POINT anchor = ANCHOR_LEFT_UPPER)
  {
   if(ObjectFind(0, name) < 0)
      ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
      
   ObjectSetInteger(0, name, OBJPROP_CORNER, GetBaseCorner());
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, InpPanelX + x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, GetY(y_offset));
   ObjectSetString(0, name, OBJPROP_TEXT, text);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
   ObjectSetString(0, name, OBJPROP_FONT, FONT_NAME);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, size);
   ObjectSetInteger(0, name, OBJPROP_ANCHOR, anchor);
   ObjectSetInteger(0, name, OBJPROP_BACK, false);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
  }

void CreatePanelBg(string name, int x, int y, int w, int h)
  {
   if(ObjectFind(0, name) < 0)
      ObjectCreate(0, name, OBJ_RECTANGLE_LABEL, 0, 0, 0);
      
   ObjectSetInteger(0, name, OBJPROP_CORNER, GetBaseCorner());
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, name, OBJPROP_XSIZE, w);
   ObjectSetInteger(0, name, OBJPROP_YSIZE, h);
   ObjectSetInteger(0, name, OBJPROP_BGCOLOR, InpClrBg);
   ObjectSetInteger(0, name, OBJPROP_COLOR, InpClrBorder);
   ObjectSetInteger(0, name, OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, name, OBJPROP_BACK, false);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
  }

void CreateLine(string name, int x, int y_offset, int w)
  {
   if(ObjectFind(0, name) < 0)
      ObjectCreate(0, name, OBJ_RECTANGLE_LABEL, 0, 0, 0);
      
   ObjectSetInteger(0, name, OBJPROP_CORNER, GetBaseCorner());
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, InpPanelX + x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, GetY(y_offset));
   ObjectSetInteger(0, name, OBJPROP_XSIZE, w);
   ObjectSetInteger(0, name, OBJPROP_YSIZE, 1);
   ObjectSetInteger(0, name, OBJPROP_BGCOLOR, InpClrSep);
   ObjectSetInteger(0, name, OBJPROP_COLOR, InpClrSep);
   ObjectSetInteger(0, name, OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, name, OBJPROP_BACK, false);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
  }

string FormatEff(int won, int tot)
  {
   if(tot == 0) return "0/0 (0.0%)";
   double pct = ((double)won / tot) * 100.0;
   return IntegerToString(won) + "/" + IntegerToString(tot) + " (" + DoubleToString(pct, 1) + "%)";
  }

//+------------------------------------------------------------------+
//| Auto-detecção do Magic Number do EA                             |
//+------------------------------------------------------------------+
long GetAutoMagicNumber()
  {
   // 1. Tenta buscar em posições abertas
   for(int i = 0; i < PositionsTotal(); i++)
     {
      if(PositionGetSymbol(i) == _Symbol)
        {
         long magic = PositionGetInteger(POSITION_MAGIC);
         if(magic != 0) return magic;
        }
     }
   // 2. Busca no histórico
   if(HistorySelect(TimeCurrent()-86400*30, TimeCurrent()))
     {
      for(int i = HistoryDealsTotal()-1; i >= 0; i--)
        {
         ulong ticket = HistoryDealGetTicket(i);
         if(HistoryDealGetString(ticket, DEAL_SYMBOL) == _Symbol)
           {
            long magic = HistoryDealGetInteger(ticket, DEAL_MAGIC);
            if(magic != 0) return magic;
           }
        }
     }
   return 0;
  }

//+------------------------------------------------------------------+
//| Montagem Inicial do Painel                                       |
//+------------------------------------------------------------------+
void DrawPanelUI()
  {
   string prefix = "Pnl_";
   
   CreatePanelBg(prefix + "Bg", InpPanelX, InpPanelY, panel_w, panel_h);
   
   CreateLabel(prefix + "Title", 15, 15, "NAUTILUS Painel v.1.5", InpClrBuy, FONT_SIZE_TITLE);
   CreateLabel(prefix + "AutoTradeLbl", panel_w - 35, 15, "Robô Ativo:", InpClrText, FONT_SIZE, ANCHOR_RIGHT_UPPER);
   CreateLabel(prefix + "AutoTradeStatus", panel_w - 15, 15, "●", clrRed, 12, ANCHOR_RIGHT_UPPER);
   
   int col1 = 15;
   int col2 = 190;
   int col3 = panel_w - 15;
   
   // Seção 1
   CreateLabel(prefix + "L_SrvTime", col1, 50, "Hora do Servidor", InpClrText);
   CreateLabel(prefix + "L_Magic", col2, 50, "Magic Number", InpClrText);
   CreateLabel(prefix + "L_Asset", col3, 50, "Ativo", InpClrText, FONT_SIZE, ANCHOR_RIGHT_UPPER);
   
   CreateLabel(prefix + "V_SrvTime", col1, 70, "--:--:--", InpClrBuy);
   CreateLabel(prefix + "V_Magic", col2, 70, IntegerToString(active_magic), InpClrTextHl);
   CreateLabel(prefix + "V_Asset", col3, 70, _Symbol, InpClrTextHl, FONT_SIZE, ANCHOR_RIGHT_UPPER);
   
   CreateLabel(prefix + "L_LocTime", col1, 100, "Hora Local", InpClrText);
   CreateLabel(prefix + "L_Spread", col2, 100, "Spread", InpClrText);
   CreateLabel(prefix + "L_Price", col3, 100, "Preço", InpClrText, FONT_SIZE, ANCHOR_RIGHT_UPPER);
   
   CreateLabel(prefix + "V_LocTime", col1, 120, "--:--:--", InpClrTextHl);
   CreateLabel(prefix + "V_Spread", col2, 120, "0", InpClrTextHl);
   CreateLabel(prefix + "V_Price", col3, 120, "0.00000", InpClrTextHl, FONT_SIZE, ANCHOR_RIGHT_UPPER);
   
   CreateLine(prefix + "Sep1", 10, 150, panel_w - 20);
   
   // Seção 2
   CreateLabel(prefix + "L_Eff", col2, 165, "Eficiência", InpClrText);
   CreateLabel(prefix + "L_Prof", col3, 165, "Lucro", InpClrText, FONT_SIZE, ANCHOR_RIGHT_UPPER);
   
   CreateLabel(prefix + "L_Day", col1, 185, "Dia", InpClrText);
   CreateLabel(prefix + "V_Eff_Day", col2, 185, "0/0 (0.0%)", InpClrProfit);
   CreateLabel(prefix + "V_Prof_Day", col3, 185, "0.00", InpClrProfit, FONT_SIZE, ANCHOR_RIGHT_UPPER);
   
   CreateLabel(prefix + "L_Week", col1, 205, "Semana", InpClrText);
   CreateLabel(prefix + "V_Eff_Week", col2, 205, "0/0 (0.0%)", InpClrProfit);
   CreateLabel(prefix + "V_Prof_Week", col3, 205, "0.00", InpClrProfit, FONT_SIZE, ANCHOR_RIGHT_UPPER);

   CreateLabel(prefix + "L_Month", col1, 225, "Mês", InpClrText);
   CreateLabel(prefix + "V_Eff_Month", col2, 225, "0/0 (0.0%)", InpClrProfit);
   CreateLabel(prefix + "V_Prof_Month", col3, 225, "0.00", InpClrProfit, FONT_SIZE, ANCHOR_RIGHT_UPPER);

   CreateLabel(prefix + "L_Total", col1, 245, "Total", InpClrText);
   CreateLabel(prefix + "V_Eff_Total", col2, 245, "0/0 (0.0%)", InpClrProfit);
   CreateLabel(prefix + "V_Prof_Total", col3, 245, "0.00", InpClrProfit, FONT_SIZE, ANCHOR_RIGHT_UPPER);

   CreateLine(prefix + "Sep2", 10, 275, panel_w - 20);

   // Seção 3
   CreateLabel(prefix + "L_CurProf", col2, 290, "Lucro Atual", InpClrText);
   CreateLabel(prefix + "L_CurBal", col3, 290, "Saldo Atual", InpClrText, FONT_SIZE, ANCHOR_RIGHT_UPPER);

   CreateLabel(prefix + "V_CurProf", col2, 310, "0.00", InpClrLoss);
   CreateLabel(prefix + "V_CurBal", col3, 310, "0.00", InpClrTextHl, FONT_SIZE, ANCHOR_RIGHT_UPPER);

   CreateLine(prefix + "Sep3", 10, 340, panel_w - 20);

   // Seção 4
   int p_col1 = col1, p_col2 = 85, p_col3 = 175, p_col4 = 275, p_col5 = col3;
   CreateLabel(prefix + "L_Ord", p_col1, 355, "Ordens", InpClrText);
   CreateLabel(prefix + "L_Vol", p_col2, 355, "Volume", InpClrText);
   CreateLabel(prefix + "L_AvgP", p_col3, 355, "Preço Méd", InpClrText);
   CreateLabel(prefix + "L_Pts", p_col4, 355, "Pontos", InpClrText);
   CreateLabel(prefix + "L_Sit", p_col5, 355, "Situação", InpClrText, FONT_SIZE, ANCHOR_RIGHT_UPPER);

   CreateLabel(prefix + "L_Buy", p_col1, 375, "Compra", InpClrBuy);
   CreateLabel(prefix + "V_BuyVol", p_col2, 375, "0.00", InpClrTextHl);
   CreateLabel(prefix + "V_BuyAvgP", p_col3, 375, "0.000", InpClrBuy);
   CreateLabel(prefix + "V_BuyPts", p_col4, 375, "0.0", InpClrBuy);
   CreateLabel(prefix + "V_BuySit", p_col5, 375, "0.00", InpClrBuy, FONT_SIZE, ANCHOR_RIGHT_UPPER);

   CreateLabel(prefix + "L_Sell", p_col1, 395, "Venda", InpClrSell);
   CreateLabel(prefix + "V_SellVol", p_col2, 395, "0.00", InpClrTextHl);
   CreateLabel(prefix + "V_SellAvgP", p_col3, 395, "0.000", InpClrSell);
   CreateLabel(prefix + "V_SellPts", p_col4, 395, "0.0", InpClrSell);
   CreateLabel(prefix + "V_SellSit", p_col5, 395, "0.00", InpClrLoss, FONT_SIZE, ANCHOR_RIGHT_UPPER);
   
   CreateLine(prefix + "Sep4", 10, 425, panel_w - 20);

   // Rodapé
   CreateLabel(prefix + "Footer", panel_w / 2, 445, "Nautilus Investing", C'50,150,255', FONT_SIZE_TITLE, ANCHOR_UPPER);
   ObjectSetString(0, prefix + "Footer", OBJPROP_TOOLTIP, "Clique para abrir www.nautilusinvesting.com");
   ObjectSetInteger(0, prefix + "Footer", OBJPROP_SELECTABLE, true);
   ObjectSetInteger(0, prefix + "Footer", OBJPROP_HIDDEN, false);
   
   ChartRedraw();
  }

//+------------------------------------------------------------------+
//| Atualizações Dinâmicas                                           |
//+------------------------------------------------------------------+
void UpdatePanel()
  {
   string prefix = "Pnl_";
   string curr = AccountInfoString(ACCOUNT_CURRENCY);
   
   if(InpAutoMagic)
     {
      long detected = GetAutoMagicNumber();
      if(detected != 0) active_magic = detected;
      ObjectSetString(0, prefix + "V_Magic", OBJPROP_TEXT, IntegerToString(active_magic));
     }
   else
     {
      active_magic = InpMagicNumber;
      ObjectSetString(0, prefix + "V_Magic", OBJPROP_TEXT, IntegerToString(active_magic));
     }

   if(TerminalInfoInteger(TERMINAL_TRADE_ALLOWED))
      ObjectSetInteger(0, prefix+"AutoTradeStatus", OBJPROP_COLOR, InpClrProfit);
   else
      ObjectSetInteger(0, prefix+"AutoTradeStatus", OBJPROP_COLOR, clrRed);

   ObjectSetString(0, prefix+"V_SrvTime", OBJPROP_TEXT, TimeToString(TimeCurrent(), TIME_SECONDS));
   ObjectSetString(0, prefix+"V_LocTime", OBJPROP_TEXT, TimeToString(TimeLocal(), TIME_SECONDS));
   
   long spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   ObjectSetString(0, prefix+"V_Spread", OBJPROP_TEXT, IntegerToString(spread));
   ObjectSetString(0, prefix+"V_Price", OBJPROP_TEXT, DoubleToString(bid, digits));
   
   double accBal = AccountInfoDouble(ACCOUNT_BALANCE);
   ObjectSetString(0, prefix+"V_CurBal", OBJPROP_TEXT, DoubleToString(accBal, 2) + " " + curr);

   double buyVol = 0, sellVol = 0, buySumPrice = 0, sellSumPrice = 0, buyProfit = 0, sellProfit = 0, currentTotalProfit = 0;
   
   for(int i = 0; i < PositionsTotal(); i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0)
        {
         long posMagic = PositionGetInteger(POSITION_MAGIC);
         if(active_magic != 0 && posMagic != active_magic) continue;
         
         double vol = PositionGetDouble(POSITION_VOLUME);
         double price = PositionGetDouble(POSITION_PRICE_OPEN);
         double prof = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP) + PositionGetDouble(POSITION_COMMISSION);
         
         currentTotalProfit += prof;
         if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) { buyVol += vol; buySumPrice += price * vol; buyProfit += prof; }
         else if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL) { sellVol += vol; sellSumPrice += price * vol; sellProfit += prof; }
        }
     }
     
   ObjectSetString(0, prefix+"V_CurProf", OBJPROP_TEXT, DoubleToString(currentTotalProfit, 2) + " " + curr);
   ObjectSetInteger(0, prefix+"V_CurProf", OBJPROP_COLOR, currentTotalProfit >= 0 ? InpClrProfit : InpClrLoss);
     
   double buyAvgP = buyVol > 0 ? buySumPrice / buyVol : 0;
   double sellAvgP = sellVol > 0 ? sellSumPrice / sellVol : 0;
   
   double ptSize = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   double buyPts = (buyVol > 0 && ptSize > 0) ? (bid - buyAvgP) / ptSize : 0;
   double sellPts = (sellVol > 0 && ptSize > 0) ? (sellAvgP - SymbolInfoDouble(_Symbol, SYMBOL_ASK)) / ptSize : 0;
   
   ObjectSetString(0, prefix+"V_BuyVol", OBJPROP_TEXT, DoubleToString(buyVol, 2));
   ObjectSetString(0, prefix+"V_BuyAvgP", OBJPROP_TEXT, DoubleToString(buyAvgP, digits));
   ObjectSetString(0, prefix+"V_BuyPts", OBJPROP_TEXT, DoubleToString(buyPts, 1));
   ObjectSetString(0, prefix+"V_BuySit", OBJPROP_TEXT, DoubleToString(buyProfit, 2) + " " + curr);
   ObjectSetInteger(0, prefix+"V_BuySit", OBJPROP_COLOR, buyProfit >= 0 ? InpClrBuy : InpClrLoss);
   ObjectSetInteger(0, prefix+"V_BuyPts", OBJPROP_COLOR, buyPts >= 0 ? InpClrBuy : InpClrLoss);
   
   ObjectSetString(0, prefix+"V_SellVol", OBJPROP_TEXT, DoubleToString(sellVol, 2));
   ObjectSetString(0, prefix+"V_SellAvgP", OBJPROP_TEXT, DoubleToString(sellAvgP, digits));
   ObjectSetString(0, prefix+"V_SellPts", OBJPROP_TEXT, DoubleToString(sellPts, 1));
   ObjectSetString(0, prefix+"V_SellSit", OBJPROP_TEXT, DoubleToString(sellProfit, 2) + " " + curr);
   ObjectSetInteger(0, prefix+"V_SellSit", OBJPROP_COLOR, sellProfit >= 0 ? InpClrSell : InpClrLoss);
   ObjectSetInteger(0, prefix+"V_SellPts", OBJPROP_COLOR, sellPts >= 0 ? InpClrSell : InpClrLoss);
   
   // Atualiza histórico Select(0, now)
   HistorySelect(0, TimeCurrent());
   int totalDeals = HistoryDealsTotal();
   int d_won=0, d_tot=0; double d_prof=0;
   int w_won=0, w_tot=0; double w_prof=0;
   int m_won=0, m_tot=0; double m_prof=0;
   int t_won=0, t_tot=0; double t_prof=0;

   datetime startDay = iTime(_Symbol, PERIOD_D1, 0);
   datetime startWeek = iTime(_Symbol, PERIOD_W1, 0);
   datetime startMonth = iTime(_Symbol, PERIOD_MN1, 0);

   for(int i=0; i<totalDeals; i++)
     {
      ulong ticket = HistoryDealGetTicket(i);
      long dealMagic = HistoryDealGetInteger(ticket, DEAL_MAGIC);
      if(active_magic != 0 && dealMagic != active_magic) continue;
      long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
        {
         double prof = HistoryDealGetDouble(ticket, DEAL_PROFIT) + HistoryDealGetDouble(ticket, DEAL_COMMISSION) + HistoryDealGetDouble(ticket, DEAL_SWAP);
         datetime time = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
         t_tot++; t_prof += prof; if(prof > 0) t_won++;
         if(time >= startMonth) { m_tot++; m_prof += prof; if(prof > 0) m_won++; }
         if(time >= startWeek) { w_tot++; w_prof += prof; if(prof > 0) w_won++; }
         if(time >= startDay) { d_tot++; d_prof += prof; if(prof > 0) d_won++; }
        }
     }
   ObjectSetString(0, prefix+"V_Eff_Day", OBJPROP_TEXT, FormatEff(d_won, d_tot));
   ObjectSetString(0, prefix+"V_Prof_Day", OBJPROP_TEXT, DoubleToString(d_prof, 2) + " " + curr);
   ObjectSetInteger(0, prefix+"V_Prof_Day", OBJPROP_COLOR, d_prof >= 0 ? InpClrProfit : InpClrLoss);
   ObjectSetString(0, prefix+"V_Eff_Week", OBJPROP_TEXT, FormatEff(w_won, w_tot));
   ObjectSetString(0, prefix+"V_Prof_Week", OBJPROP_TEXT, DoubleToString(w_prof, 2) + " " + curr);
   ObjectSetInteger(0, prefix+"V_Prof_Week", OBJPROP_COLOR, w_prof >= 0 ? InpClrProfit : InpClrLoss);
   ObjectSetString(0, prefix+"V_Eff_Month", OBJPROP_TEXT, FormatEff(m_won, m_tot));
   ObjectSetString(0, prefix+"V_Prof_Month", OBJPROP_TEXT, DoubleToString(m_prof, 2) + " " + curr);
   ObjectSetInteger(0, prefix+"V_Prof_Month", OBJPROP_COLOR, m_prof >= 0 ? InpClrProfit : InpClrLoss);
   ObjectSetString(0, prefix+"V_Eff_Total", OBJPROP_TEXT, FormatEff(t_won, t_tot));
   ObjectSetString(0, prefix+"V_Prof_Total", OBJPROP_TEXT, DoubleToString(t_prof, 2) + " " + curr);
   ObjectSetInteger(0, prefix+"V_Prof_Total", OBJPROP_COLOR, t_prof >= 0 ? InpClrProfit : InpClrLoss);

   ChartRedraw();
  }

//+------------------------------------------------------------------+
//| Eventos                                                          |
//+------------------------------------------------------------------+
int OnInit() { active_magic = InpMagicNumber; DrawPanelUI(); UpdatePanel(); EventSetTimer(1); return(INIT_SUCCEEDED); }
void OnDeinit(const int reason) { EventKillTimer(); ObjectsDeleteAll(0, "Pnl_"); ChartRedraw(); }
int OnCalculate(const int r, const int p, const datetime &t[], const double &o[], const double &h[], const double &l[], const double &c[], const long &tv[], const long &v[], const int &s[])
{ static datetime lt = 0; if(TimeCurrent() != lt) { UpdatePanel(); lt = TimeCurrent(); } return(r); }
void OnTimer() { UpdatePanel(); }
void OnChartEvent(const int id, const long &l, const double &d, const string &s)
{ if(id == CHARTEVENT_OBJECT_CLICK && s == "Pnl_Footer") ShellExecuteW(0, "open", "http://www.nautilusinvesting.com", "", "", 1); }
//+------------------------------------------------------------------+
