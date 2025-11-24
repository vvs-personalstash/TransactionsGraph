from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import time
import json
import csv
import io
from database import Neo4jDriver, seed_data
from models import (
    User, Transaction, UserRelationships, TransactionRelationships,
    ShortestPathResponse, TransactionClustersResponse
)

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Neo4j driver
neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
neo4j_user = os.getenv("NEO4J_USER", "neo4j")
neo4j_pass = os.getenv("NEO4J_PASS", "password")
seed_data_flag = os.getenv("SEED_DATA", "false").lower() == "true"
port = int(os.getenv("PORT", "8080"))

# Connect to database
try:
    db = Neo4jDriver(neo4j_uri, neo4j_user, neo4j_pass)
    print("Connected to Neo4j successfully")
    
    # Seed data if requested
    if seed_data_flag:
        seed_data(db)
        print("Sample data seeded")
        time.sleep(0.5)
except Exception as e:
    print(f"Database connection failed: {e}")
    exit(1)


# Helper function to convert dataclass to dict
def to_dict(obj):
    from neo4j.time import DateTime

    # Handle Neo4j DateTime objects
    if isinstance(obj, DateTime):
        return obj.isoformat()

    if hasattr(obj, '__dict__'):
        result = {}
        for key, value in obj.__dict__.items():
            if isinstance(value, list):
                result[key] = [to_dict(item) for item in value]
            elif isinstance(value, dict):
                # Handle dict values (like properties)
                result[key] = {k: to_dict(v) for k, v in value.items()}
            elif hasattr(value, '__dict__'):
                result[key] = to_dict(value)
            else:
                result[key] = to_dict(value)
        return result
    return obj


# ===== USER ROUTES =====

@app.route('/api/users', methods=['POST'])
def create_user():
    try:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        phone = data.get('phone')
        
        if not all([name, email, phone]):
            return jsonify({"error": "missing required fields"}), 400
        
        user_id = db.create_user(name, email, phone)
        return jsonify({"id": user_id}), 201
    except Exception as e:
        return jsonify({"error": "create user failed"}), 500


@app.route('/api/users', methods=['GET'])
def get_all_users():
    try:
        users = db.get_all_users()
        return jsonify([to_dict(u) for u in users]), 200
    except Exception as e:
        return jsonify({"error": "fetch users failed"}), 500


# ===== TRANSACTION ROUTES =====

@app.route('/api/transactions', methods=['POST'])
def create_transaction():
    try:
        data = request.get_json()
        from_user_id = data.get('fromUserId')
        to_user_id = data.get('toUserId')
        amount = data.get('amount')
        currency = data.get('currency', 'USD')
        timestamp = data.get('timestamp')
        description = data.get('description', '')
        device_id = data.get('deviceId', '')
        
        if not all([from_user_id, to_user_id, amount, timestamp]):
            return jsonify({"error": "missing required fields"}), 400
        
        tx_id = db.create_transaction(
            from_user_id, to_user_id, amount,
            currency, timestamp, description, device_id
        )
        return jsonify({"id": tx_id}), 201
    except Exception as e:
        return jsonify({"error": "create transaction failed"}), 500


@app.route('/api/transactions', methods=['GET'])
def get_all_transactions():
    try:
        transactions = db.get_all_transactions()
        return jsonify([to_dict(t) for t in transactions]), 200
    except Exception as e:
        return jsonify({"error": "fetch transactions failed"}), 500


# ===== RELATIONSHIP ROUTES =====

@app.route('/api/relationships/user/<int:user_id>', methods=['GET'])
def get_user_relationships(user_id):
    try:
        user, connections = db.get_user_relationships(user_id)
        response = UserRelationships(user=user, connections=connections)
        return jsonify(to_dict(response)), 200
    except Exception as e:
        return jsonify({"error": "fetch user relationships failed"}), 500


@app.route('/api/relationships/transaction/<int:tx_id>', methods=['GET'])
def get_transaction_relationships(tx_id):
    try:
        transaction, connections = db.get_transaction_relationships(tx_id)
        response = TransactionRelationships(transaction=transaction, connections=connections)
        return jsonify(to_dict(response)), 200
    except Exception as e:
        return jsonify({"error": "fetch transaction relationships failed"}), 500


# ===== ANALYTICS ROUTES =====

@app.route('/api/analytics/shortest-path/users/<int:from_id>/<int:to_id>', methods=['GET'])
def get_user_shortest_path(from_id, to_id):
    try:
        segments = db.shortest_path_segments(from_id, to_id)
        response = ShortestPathResponse(segments=segments)
        return jsonify(to_dict(response)), 200
    except Exception as e:
        if str(e) == "no path found":
            return jsonify({"error": str(e)}), 404
        return jsonify({"error": str(e)}), 500


@app.route('/api/analytics/transaction-clusters', methods=['GET'])
def get_transaction_clusters():
    try:
        clusters = db.cluster_transactions()
        response = TransactionClustersResponse(clusters=clusters)
        return jsonify(to_dict(response)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===== EXPORT ROUTES =====

@app.route('/api/export/json', methods=['GET'])
def export_graph_json():
    try:
        data = db.export_graph()
        return jsonify(to_dict(data)), 200
    except Exception as e:
        return jsonify({"error": f"export failed: {str(e)}"}), 500


@app.route('/api/export/csv', methods=['GET'])
def export_graph_csv():
    try:
        data = db.export_graph()

        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)

        # Nodes section
        writer.writerow(["# Nodes"])
        writer.writerow(["id", "type", "properties"])
        for node in data.nodes:
            props = json.dumps(node.properties)
            writer.writerow([node.id, node.type, props])
        writer.writerow([])

        # Relationships section
        writer.writerow(["# Relationships"])
        writer.writerow(["source_id", "source_type", "relationship", "target_id", "target_type"])
        for rel in data.relationships:
            writer.writerow([
                rel.sourceId,
                rel.sourceType,
                rel.relationship,
                rel.targetId,
                rel.targetType
            ])

        # Get CSV content
        csv_content = output.getvalue()
        output.close()

        # Return as downloadable file
        from flask import Response
        return Response(
            csv_content,
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=graph.csv"}
        )
    except Exception as e:
        return jsonify({"error": f"export failed: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=port, debug=False)

