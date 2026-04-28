import sys, json

data = json.load(sys.stdin)
cc = data.get('combined_curve', [])
robots = data.get('robots', [])

max_dd = 0
max_day = ""
for pt in cc:
    if pt['dd'] > max_dd:
        max_dd = pt['dd']
        max_day = pt['day']

print(f"Max DD in curve: {max_dd} on {max_day}")

# Check robots at that day
# We'd need robot_curves for that, but let's see if we can find it in the totals
t = data.get('totals', {})
print(f"Totals: ddMaxPortfolio={t.get('ddMaxPortfolio')} somaIndividualDD={t.get('somaIndividualDD')}")

print("\nCombined Curve Start (first 5 days):")
for pt in cc[:5]:
    print(f"  {pt['day']}: profit={pt['profit']} dd={pt['dd']} balance={pt['balanceProfit']}")

print("\nRobot Curves Start:")
rc = data.get('robot_curves', {})
for name, pts in rc.items():
    if pts:
        print(f"  {name}: {pts[0]}")
