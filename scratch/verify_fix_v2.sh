#!/bin/bash
docker exec data-api wget -q -O- "http://localhost:3001/api/portfolios/pf_1775621732255_tb0287/stats" 2>&1 | python3 -c "
import sys,json
d=json.load(sys.stdin)
t=d['totals']
print('=== Global Stats ===')
print('DD Max Portfolio (Card):', round(t.get('ddMaxPortfolio',0),2))
print('DD Max Sum Individual (Chart Peak):', round(t.get('ddMaxSumIndividual',0),2))
print()
r=t.get('recent')
if r:
    print('--- Recent (12m) Quadrant ---')
    print('  Profit:', round(r.get('profit',0),2))
    print('  Max DD (Sum of r.maxDD):', round(r.get('maxDD',0),2))
    print('  VaR95 ($ value):', round(r.get('var95',0),2))
print()
p=t.get('past')
if p:
    print('--- Past Quadrant ---')
    print('  Max DD (Sum of r.maxDD):', round(p.get('maxDD',0),2))
    print('  VaR95 ($ value):', round(p.get('var95',0),2))
print()
print('--- Curve Sample (dd field should be sum of robot DDs now) ---')
cc = d.get('combined_curve',[])
for pt in cc[:3]:
    print(f\"  {pt['day']}: dd_sum={round(pt['dd'],2)} dd_portfolio={round(pt.get('ddPortfolio',0),2)}\")
"
