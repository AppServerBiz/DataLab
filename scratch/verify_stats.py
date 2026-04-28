import requests
import json

url = "http://167.126.20.5:3001/api/portfolios/pf_1775621732255_tb0287/stats"
try:
    resp = requests.get(url)
    data = resp.json()
    t = data.get('totals', {})
    r = t.get('recent', {})
    p = t.get('past', {})
    
    print(f"RECENT (12m):")
    print(f"  MaxDD: {r.get('maxDD'):.2f}")
    print(f"  VaR95: {r.get('var95'):.2f}")
    
    print(f"PAST:")
    print(f"  MaxDD: {p.get('maxDD'):.2f}")
    print(f"  VaR95: {p.get('var95'):.2f}")
    
    print("\nROBOTS RECENT (Sample):")
    rr = t.get('robotRecent', {})
    for name, stats in list(rr.items())[:3]:
        print(f"  {name}: VaR={stats.get('var95'):.2f} MaxDD={stats.get('maxDD'):.2f}")
except Exception as e:
    print(f"Error: {e}")
