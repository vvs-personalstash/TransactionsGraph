import random
from datetime import datetime, timedelta

def generate_transactions(n, user_ids):
    out = []
    now = datetime.now()
    for i in range(n):
        out.append({
            "fromId": random.choice(user_ids),
            "toId": random.choice(user_ids),
            "amount": round(random.uniform(5, 5000), 2),
            "currency": "USD",
            "timestamp": (now - timedelta(minutes=i)).isoformat(),
            "description": f"Auto tx {i}",
            "deviceId": f"dev-{random.randint(1,3000)}"
        })
    return out