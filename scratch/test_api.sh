#!/bin/bash
docker exec data-api wget -q -O- "http://localhost:3001/api/portfolios/pf_1775621732255_tb0287/stats" 2>&1 | python3 -c "
import sys,json
d=json.load(sys.stdin)
t=d['totals']
print('=== Portfolio:', d['portfolio']['name'], '===')
print('Capital:', d['portfolio']['capital'])
print()
print('DD Max Portfolio:', round(t.get('ddMaxPortfolio',0),2))
print('DD Max Pct:', round(t.get('ddMaxPct',0),2), '%')
print('VaR95:', round(t.get('var95',0),4), '%')
print('DME:', round(t.get('dme',0),2))
r=t.get('recent')
p=t.get('past')
if r:
    print()
    print('--- Recent (12m) ---')
    print('  Profit:', round(r.get('profit',0),2))
    print('  DD:', round(r.get('maxDD',0),2))
    print('  VaR:', round(r.get('var95',0),4), '%')
if p:
    print()
    print('--- Past ---')
    print('  Profit:', round(p.get('profit',0),2))
    print('  DD:', round(p.get('maxDD',0),2))
    print('  wProfit:', round(p.get('weightedProfit',0),2))
print()
cc = d.get('combined_curve',[])
print('Curve points:', len(cc))
# Check balance smoothness
if len(cc) > 10:
    jumps = 0
    for i in range(1, min(len(cc), 50)):
        bp_delta = abs(cc[i].get('balanceProfit',0) - cc[i-1].get('balanceProfit',0))
        p_delta = abs(cc[i].get('profit',0) - cc[i-1].get('profit',0))
        if bp_delta > 0:
            jumps += 1
    print(f'Balance changes in first 50 pts: {jumps}')
    
# Sample curve
print()
for pt in cc[:3]:
    print(f\"  {pt['day']}: profit={round(pt['profit'],2)} balance={round(pt.get('balanceProfit',0),2)} dd={round(pt['dd'],2)}\")
print('  ...')
mid = len(cc)//2
for pt in cc[mid:mid+3]:
    print(f\"  {pt['day']}: profit={round(pt['profit'],2)} balance={round(pt.get('balanceProfit',0),2)} dd={round(pt['dd'],2)}\")
print('  ...')
for pt in cc[-3:]:
    print(f\"  {pt['day']}: profit={round(pt['profit'],2)} balance={round(pt.get('balanceProfit',0),2)} dd={round(pt['dd'],2)}\")
"
