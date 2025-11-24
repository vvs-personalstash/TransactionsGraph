# User & Transaction Dashboard

A web application for managing users and transactions with Neo4j graph relationships. Easily register users, record transactions, visualize connections, find shortest paths, cluster related transactions, and export the full graph.

## Features

- **Add a User**: Create new users with name, email, and phone. Shared-email and shared-phone links are auto-generated.
- **Add a Transaction**: Record payments between users, including amount, currency, timestamp, description, and device ID. Auto-link transactions sharing the same device.
- **View Lists**: Browse all users and transactions in searchable, filterable tables.
- **Graph View**: Interactive network visualization of users and their relationships (shared attributes, sent, received).
- **Shortest Path Analytics**: Compute and display the shortest connection chain between any two users, with edge labels showing relationship types.
- **Transaction Clusters**: Automatically cluster transactions that share common users, helping identify related activity.
- **Export JSON/CSV**: Download the entire graph (nodes & relationships) in JSON or CSV formats.

## Architecture

- **Backend**: Python (Flask) + Neo4j driver, REST API endpoints under `/api/*`.

- **Frontend**: React with React Router, Cytoscape.js for graph visualizations, Tailwind CSS for styling.

- **Database**: Neo4j graph database.

## Quick Start with Docker Compose (Recommended)

### Prerequisites

- Docker & Docker Compose

### Steps

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd TxGraph
   ```

2. **Create environment file**

   Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

   Or create a `.env` file in the root directory with:

   ```env
   NEO4J_URI=bolt://neo4j:7687
   NEO4J_USER=neo4j
   NEO4J_PASS=password123
   SEED_DATA=true
   PORT=8080
   ```

3. **Start all services**

   ```bash
   docker compose up --build -d
   ```

4. **Verify services are running**

   ```bash
   docker compose ps
   ```

   All three services (`neo4j`, `backend`, `frontend`) should show as **Up**.

5. **Access the application**

   - **Frontend UI:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:8080/api/users](http://localhost:8080/api/users)
   - **Neo4j Browser:** [http://localhost:7474](http://localhost:7474) (login: `neo4j`/`password123`)

6. **View logs (optional)**

   ```bash
   docker compose logs -f backend
   docker compose logs -f frontend
   docker compose logs -f neo4j
   ```

7. **Stop all services**

   ```bash
   docker compose down
   ```

   To also remove data volumes:

   ```bash
   docker compose down -v
   ```

## Local Development Setup (Without Docker)

### Prerequisites

- Python 3.11+
- Node.js 18+
- Neo4j 5.x+ (running locally or via Docker)

### 1. Start Neo4j Database

Using Docker:

```bash
docker run -d \
  --name neo4j \
  -p 7474:7474 \
  -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password123 \
  -v neo4j-data:/data \
  neo4j:5.7.0
```

### 2. Setup Backend

```bash
cd Backend
pip install -r requirements.txt
```

Create a `.env` file in the `Backend` directory (or use environment variables):

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASS=password123
SEED_DATA=true
PORT=8080
```

Run the backend:

```bash
python app.py
```

The API will be available at [http://localhost:8080](http://localhost:8080)

### 3. Setup Frontend

```bash
cd Frontend
npm install
npm run dev
```

The frontend will be available at [http://localhost:5173](http://localhost:5173) (Vite dev server)

---

## Running with standalone Docker

We’ll create a Docker network so that containers can talk by name:

`docker network create user-tx-net `

### 1. Neo4j

```
docker run -d \
  --name neo4j \
  --network user-tx-net \
  -p7474:7474 \
  -p7687:7687 \
  -e NEO4J_AUTH=neo4j/password123 \
  -v neo4j-data:/data \
  neo4j:5.7.0
```

### 2. Python backend

```
docker build -t user-tx-backend:latest -f ./user-tx-backend/Dockerfile.python ./user-tx-backend
docker run -d \
  --name user-tx-backend \
  --network user-tx-net \
  --env-file .env \
  -p 8080:8080 \
  user-tx-backend:latest
```

### 3. React frontend

```
docker build -t user-tx-frontend:latest ./user-tx-frontend # run docker run -d \
  --name user-tx-frontend \
  --network user-tx-net \
  -p 3000:80 \
  user-tx-frontend:latest
```

### 4. Verify

- **Neo4j Browser:** [http://localhost:7474](http://localhost:7474) (login `neo4j`/`password123`)
- **API:** [http://localhost:8080/api/users](http://localhost:8080/api/users)
- **UI:** [http://localhost:3000](http://localhost:3000)

## Running with Docker Compose

Compose will wire up the network and order of startup.

```
# stop & clean volumes
docker compose down -v
# build images & start all services in background
docker compose up --build -d
```

### 1. Check status

`docker compose ps`

All three services (`neo4j`, `backend`, `frontend`) should be **Up**.

### 2. Tail logs (optional)

```
docker compose logs -f neo4j
docker compose logs -f backend
docker compose logs -f frontend
```

### 3. Verify in browser

- **Neo4j:** [http://localhost:7474](http://localhost:7474)
- **API:** [http://localhost:8080/api/users](http://localhost:8080/api/users)
- **UI:** [http://localhost:3000](http://localhost:3000)

## Stopping

When you’re done, bring everything down and remove the data:

```
docker compose down -v
docker network rm user-tx-net
```

## API Endpoints

```markdown
|---------------|------------------------------------------------|---------------------------------------|
| Method | Endpoint | Description |  
|---------------|------------------------------------------------|---------------------------------------|
| POST | /api/users | Create a new user |  
| GET | /api/users | List all users |  
| POST | /api/transactions | Create a new transaction |  
| GET | /api/transactions | List all transactions |  
| GET | /api/relationships/user/{id} | Get user relationships (graph branch) |  
| GET | /api/relationships/transaction/{id} | Get transaction relationships |  
| GET | /api/analytics/shortest-path/users/{from}/{to} | Shortest path between two users |  
| GET | /api/analytics/transaction-clusters | Cluster transactions by shared users |  
| GET | /api/export/json | Export entire graph as JSON |  
| GET | /api/export/csv | Export entire graph as CSV |
```
