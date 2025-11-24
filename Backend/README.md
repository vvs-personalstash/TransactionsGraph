# User Transaction Backend (Python/Flask)

This is the Python Flask backend for the User & Transaction Dashboard application.

## Structure

- `app.py` - Main Flask application with all API routes
- `database.py` - Neo4j database driver and operations
- `models.py` - Data models (dataclasses)
- `requirements.txt` - Python dependencies
- `Dockerfile.python` - Docker configuration for Python backend
- `wait-for-neo4j.py` - Script to wait for Neo4j to be ready before starting

## API Endpoints

### Users
- `POST /api/users` - Create a new user
- `GET /api/users` - Get all users

### Transactions
- `POST /api/transactions` - Create a new transaction
- `GET /api/transactions` - Get all transactions

### Relationships
- `GET /api/relationships/user/<id>` - Get user relationships
- `GET /api/relationships/transaction/<id>` - Get transaction relationships

### Analytics
- `GET /api/analytics/shortest-path/users/<from>/<to>` - Find shortest path between users
- `GET /api/analytics/transaction-clusters` - Get transaction clusters

### Export
- `GET /api/export/json` - Export graph as JSON
- `GET /api/export/csv` - Export graph as CSV

## Running Locally

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables (or create a `.env` file):
```bash
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USER=neo4j
export NEO4J_PASS=password123
export SEED_DATA=true
export PORT=8080
```

3. Run the application:
```bash
python app.py
```

## Running with Docker

Build and run:
```bash
docker build -t user-tx-backend -f Dockerfile.python .
docker run -p 8080:8080 --env-file .env user-tx-backend
```

