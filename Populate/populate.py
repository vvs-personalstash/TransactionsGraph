from neo4j import GraphDatabase
import json
import os
from generate_rows import generate_transactions


URI      = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
USER     = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASS", "password")

driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

def bulk_users(session, user_rows):
    session.run("""
        UNWIND $rows AS row
        CREATE (:User {
            name: row.name,
            email: row.email,
            phone: row.phone
        })
    """, rows=user_rows)

def fetch_user_ids(session):
    recs = session.run("MATCH (u:User) RETURN id(u) AS id")
    return [r["id"] for r in recs]

def bulk_transactions(session, tx_rows):
    session.run("""
        UNWIND $rows AS tx
        MATCH (u1:User) WHERE id(u1) = tx.fromId
        MATCH (u2:User) WHERE id(u2) = tx.toId
        CREATE (t:Transaction {
            amount: tx.amount,
            currency: tx.currency,
            timestamp: datetime(tx.timestamp),
            description: tx.description,
            deviceId: tx.deviceId
        })
        CREATE (u1)-[:SENT]->(t)
        CREATE (t)-[:RECEIVED_BY]->(u2)
    """, rows=tx_rows)

def build_shared(session):
    session.run("""
        MATCH (u1:User),(u2:User)
        WHERE u1.email = u2.email AND id(u1) < id(u2)
        MERGE (u1)-[:SHARED_EMAIL]-(u2)
    """)

    session.run("""
        MATCH (u1:User),(u2:User)
        WHERE u1.phone = u2.phone AND id(u1) < id(u2)
        MERGE (u1)-[:SHARED_PHONE]-(u2)
    """)

    session.run("""
        MATCH (t:Transaction)
        WITH t.deviceId AS did, collect(t) AS txs
        UNWIND range(0, size(txs)-2) AS i
        WITH txs[i] AS a, txs[i+1] AS b
        MERGE (a)-[:SHARED_DEVICE]->(b)
    """)

def main():
    with driver.session() as session:
        # 1. Pre-create users (small dataset)
        users = [
            {"name": f"User{i}", "email": f"user{i}@x.com", "phone": f"{1000000000+i}"}
            for i in range(500)                                  # choose any number
        ]
        bulk_users(session, users)

        # 2. Fetch real ids
        user_ids = fetch_user_ids(session)

        # 3. Generate 100k transactions
        tx_data = generate_transactions(100000, user_ids)

        # 4. Insert in batches
        BATCH = 5000
        for i in range(0, len(tx_data), BATCH):
            chunk = tx_data[i:i+BATCH]
            bulk_transactions(session, chunk)
            print("Insert", i + len(chunk))

        # 5. Build shared-* edges once
        #build_shared(session).  // Ommitted now causing memory issues on 100000 transactions

if __name__ == "__main__":
    main()
