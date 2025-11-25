# User & Transaction Dashboard

A Neo4j-powered web application for managing users, transactions, and graph-oriented analytics.

---

## Features

- Add users with automatic shared-email / shared-phone links
- Add transactions with automatic sender/receiver edges and shared-device links
- Paginated + filterable tables for users and transactions --Debounced and Paginated
- Graph visualization using Cytoscape.js
- Shortest-path analysis between users
- Transaction clustering
- Full graph export as JSON or CSV -- In A Streamed CSV for large Datasets

---

## Architecture

- **Backend:** Python (Flask) + Neo4j driver
- **Frontend:** React + React Router + Tailwind + Cytoscape.js
- **Database:** Neo4j 5.x
- **Ingestor (optional):** One-shot bulk-loader for 100k+ synthetic transactions

---

# Deployment With Docker Compose

## 1. Clone the Repository

```bash
git clone <repo-url>
cd TxGraph
```

---

## 2. Create `.env`

```env
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASS=password123
PORT=8080
```

The ingestor uses the same variables.

---

## 3. Start Backend + Frontend + Neo4j

```bash
docker compose up --build -d
```

This starts:

- `neo4j`
- `backend`
- `frontend`

The database remains empty unless the optional ingestor is run.

---

# Optional: Bulk Populate Neo4j (100k+ Transactions)

A dedicated container `ingestor` performs a one-shot bulk insert using batched `UNWIND` queries.

To run it:

```bash
docker compose up -d --build
docker compose --profile ingest run --rm ingestor
```

Behavior:

- Loads synthetic users + transactions
- Writes into the persistent `neo4j-data` volume
- Exits
- **Does not run again unless removed**

To force rerun:

```bash
docker compose rm -f ingestor
docker compose up ingestor
```

---

# Access

- **UI:** [http://localhost:3000](http://localhost:3000)
- **API:** [http://localhost:8080](http://localhost:8080)
- **Neo4j Browser:** [http://localhost:7474](http://localhost:7474)

---

# Local Development Without Docker

## 1. Start Neo4j

```bash
docker run -d \
  --name neo4j \
  -p7474:7474 -p7687:7687 \
  -e NEO4J_AUTH=neo4j/password123 \
  -v neo4j-data:/data \
  neo4j:5.7.0
```

## 2. Run Backend

```bash
cd Backend
pip install -r requirements.txt
python app.py
```

## 3. Run Frontend

```bash
cd Frontend
npm install
npm run dev
```

---

# API Endpoints

```
POST /api/users
GET  /api/users
POST /api/transactions
GET  /api/transactions
GET  /api/relationships/user/{id}
GET  /api/relationships/transaction/{id}
GET  /api/analytics/shortest-path/users/{from}/{to}
GET  /api/analytics/transaction-clusters
GET  /api/export/json
GET  /api/export/csv
```

---

# Stopping Services

```bash
docker compose down
```

Remove database:

```bash
docker compose down -v
```

Remove ingestor:

```bash
docker compose rm -f ingestor
```

---

End.
