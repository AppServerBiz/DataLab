//+------------------------------------------------------------------+
//|                                           Robo_Tiago_Kadash.mq5 |
//|                                      Copyright 2026, Antigravity |
//|                                                                  |
//| Robô baseado no cruzamento da Máxima e Mínima do 1º candle do dia|
//| com sistema de Martingale reverso em grade de 600 pontos.        |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Antigravity"
#property link      ""
#property version   "1.00"

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\SymbolInfo.mqh>

input double   InpLotSize           = 1.0;       // Lote Inicial
input int      InpGridPoints        = 600;       // Distância da Grade (pontos)
input double   InpMartingale        = 2.0;       // Multiplicador do Lote
input int      InpMaxSteps          = 3;         // Máximo de Passos de Martingale (0 a 3)
input ulong    InpMagicNumber       = 777777;    // Magic Number

CTrade         trade;
CPositionInfo  posInfo;
CSymbolInfo    symInfo;

double         dayHigh = 0.0;
double         dayLow = 0.0;
datetime       currentDay = 0;

int            currentBuyStep = 0;
int            currentSellStep = 0;
bool           buyActive = false;
bool           sellActive = false;
bool           buySequenceFinished = false;
bool           sellSequenceFinished = false;
ulong          lastBuyTicket = 0;
ulong          lastSellTicket = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   trade.SetExpertMagicNumber(InpMagicNumber);
   symInfo.Name(_Symbol);
   symInfo.Refresh();
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
  }

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
  {
   if(!symInfo.RefreshRates()) return;
   
   datetime time[];
   if(CopyTime(_Symbol, PERIOD_D1, 0, 1, time) <= 0) return;
   
   if(time[0] != currentDay)
     {
      // Novo dia detectado
      currentDay = time[0];
      
      // Busca a máxima e mínima do candle das 00:00 (H1)
      double h[], l[];
      if(CopyHigh(_Symbol, PERIOD_H1, currentDay, 1, h) > 0 && CopyLow(_Symbol, PERIOD_H1, currentDay, 1, l) > 0)
        {
         dayHigh = h[0];
         dayLow = l[0];
         currentBuyStep = 0;
         currentSellStep = 0;
         buyActive = false;
         sellActive = false;
         buySequenceFinished = false;
         sellSequenceFinished = false;
         lastBuyTicket = 0;
         lastSellTicket = 0;
         Print("Novo dia. Máxima 00:00: ", dayHigh, " | Mínima 00:00: ", dayLow);
        }
      else
        {
         currentDay = 0; // Tenta novamente caso não carregue os dados
         return;
        }
     }
     
   if(dayHigh == 0.0 || dayLow == 0.0) return;

   double ask = symInfo.Ask();
   double bid = symInfo.Bid();
   double point = symInfo.Point();
   
   // Verifica posições atuais
   bool buyPosExists = false;
   bool sellPosExists = false;
   ulong currentBuyTicket = 0;
   ulong currentSellTicket = 0;
   
   for(int i=PositionsTotal()-1; i>=0; i--)
     {
      if(posInfo.SelectByIndex(i))
        {
         if(posInfo.Symbol() == _Symbol && posInfo.Magic() == InpMagicNumber)
           {
            if(posInfo.PositionType() == POSITION_TYPE_BUY)
              {
               buyPosExists = true;
               currentBuyTicket = posInfo.Ticket();
              }
            if(posInfo.PositionType() == POSITION_TYPE_SELL)
              {
               sellPosExists = true;
               currentSellTicket = posInfo.Ticket();
              }
           }
        }
     }
     
   // --- LOGICA DE COMPRA ---
   if(!buySequenceFinished)
     {
      // 1. Gatilho de Entrada Inicial (Atravessou a máxima do candle 00:00)
      if(!buyActive && !buyPosExists && ask >= dayHigh)
        {
         double sl = ask - InpGridPoints * point;
         double tp = ask + InpGridPoints * point;
         double lot = InpLotSize;
         
         if(trade.PositionOpen(_Symbol, ORDER_TYPE_BUY, lot, ask, sl, tp))
           {
            lastBuyTicket = trade.ResultDeal();
            buyActive = true;
            currentBuyStep = 0;
            Print("Sinal de Compra Inicial! Preço: ", ask);
           }
        }
      // 2. Gerenciamento do Martingale se a posição sumiu
      else if(buyActive && !buyPosExists)
        {
         // Posição de compra fechada! Verificamos se foi Loss (SL) ou Gain (TP)
         HistorySelect(0, TimeCurrent());
         double lastProfit = 0;
         bool foundDeal = false; // Busca o resultado da última operacao

         for(int i=HistoryDealsTotal()-1; i>=0; i--)
           {
            ulong dealTicket = HistoryDealGetTicket(i);
            if(HistoryDealGetInteger(dealTicket, DEAL_MAGIC) == InpMagicNumber &&
               HistoryDealGetString(dealTicket, DEAL_SYMBOL) == _Symbol &&
               HistoryDealGetInteger(dealTicket, DEAL_ENTRY) == DEAL_ENTRY_OUT &&
               HistoryDealGetInteger(dealTicket, DEAL_TYPE) == DEAL_TYPE_SELL) // fechou buy
              {
               lastProfit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
               foundDeal = true;
               break;
              }
           }
           
         if(foundDeal)
           {
            if(lastProfit < 0) // Foi Loss, atingiu os 600 pontos contra
              {
               currentBuyStep++;
               if(currentBuyStep <= InpMaxSteps)
                 {
                  double lot = InpLotSize * MathPow(InpMartingale, currentBuyStep);
                  double sl = ask - InpGridPoints * point;
                  double tp = ask + InpGridPoints * point;
                  
                  if(trade.PositionOpen(_Symbol, ORDER_TYPE_BUY, lot, ask, sl, tp))
                    {
                     Print("Buy Martingale Step ", currentBuyStep, " executado. Lote: ", lot);
                    }
                 }
               else
                 {
                  Print("Limite de Martingale de Compra atingido. Finalizando sequencia pro dia.");
                  buySequenceFinished = true;
                  buyActive = false;
                 }
              }
            else // Foi Gain, encerramos por hoje
              {
               Print("Gain na Compra! Sequência finalizada com sucesso.");
               buySequenceFinished = true;
               buyActive = false;
              }
           }
        }
     }
     
     
   // --- LOGICA DE VENDA ---
   if(!sellSequenceFinished)
     {
      // 1. Gatilho de Entrada Inicial (Atravessou a mínima do candle 00:00)
      if(!sellActive && !sellPosExists && bid <= dayLow)
        {
         double sl = bid + InpGridPoints * point;
         double tp = bid - InpGridPoints * point;
         double lot = InpLotSize;
         
         if(trade.PositionOpen(_Symbol, ORDER_TYPE_SELL, lot, bid, sl, tp))
           {
            lastSellTicket = trade.ResultDeal();
            sellActive = true;
            currentSellStep = 0;
            Print("Sinal de Venda Inicial! Preço: ", bid);
           }
        }
      // 2. Gerenciamento do Martingale se a posição sumiu
      else if(sellActive && !sellPosExists)
        {
         // Posição de venda fechada! Verificamos se foi Loss (SL) ou Gain (TP)
         HistorySelect(0, TimeCurrent());
         double lastProfit = 0;
         bool foundDeal = false;

         for(int i=HistoryDealsTotal()-1; i>=0; i--)
           {
            ulong dealTicket = HistoryDealGetTicket(i);
            if(HistoryDealGetInteger(dealTicket, DEAL_MAGIC) == InpMagicNumber &&
               HistoryDealGetString(dealTicket, DEAL_SYMBOL) == _Symbol &&
               HistoryDealGetInteger(dealTicket, DEAL_ENTRY) == DEAL_ENTRY_OUT &&
               HistoryDealGetInteger(dealTicket, DEAL_TYPE) == DEAL_TYPE_BUY) // fechou sell
              {
               lastProfit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
               foundDeal = true;
               break;
              }
           }
           
         if(foundDeal)
           {
            if(lastProfit < 0) // Foi Loss, atingiu os 600 pontos contra
              {
               currentSellStep++;
               if(currentSellStep <= InpMaxSteps)
                 {
                  double lot = InpLotSize * MathPow(InpMartingale, currentSellStep);
                  double sl = bid + InpGridPoints * point;
                  double tp = bid - InpGridPoints * point;
                  
                  if(trade.PositionOpen(_Symbol, ORDER_TYPE_SELL, lot, bid, sl, tp))
                    {
                     Print("Sell Martingale Step ", currentSellStep, " executado. Lote: ", lot);
                    }
                 }
               else
                 {
                  Print("Limite de Martingale de Venda atingido. Finalizando sequencia pro dia.");
                  sellSequenceFinished = true;
                  sellActive = false;
                 }
              }
            else // Foi Gain, encerramos por hoje
              {
               Print("Gain na Venda! Sequência finalizada com sucesso.");
               sellSequenceFinished = true;
               sellActive = false;
              }
           }
        }
     }
  }
//+------------------------------------------------------------------+
