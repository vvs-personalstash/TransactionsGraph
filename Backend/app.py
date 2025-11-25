from flask import Flask, Response, request, jsonify,stream_with_context
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
    ShortestPathResponse, TransactionClustersResponse, Statistics
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
        # Check if pagination parameters are provided
        page = request.args.get('page', type=int)
        page_size = request.args.get('pageSize', type=int)
        search_query = request.args.get('search', default='', type=str)

        if page and page_size:
            # Return paginated response
            result = db.get_users_paginated(page, page_size, search_query)
            return jsonify({
                "data": [to_dict(u) for u in result["data"]],
                "total": result["total"],
                "page": result["page"],
                "pageSize": result["pageSize"],
                "totalPages": result["totalPages"]
            }), 200
        else:
            # Return all users (backward compatibility)
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
        # Check if pagination parameters are provided
        page = request.args.get('page', type=int)
        page_size = request.args.get('pageSize', type=int)

        if page and page_size:
            # Get filter parameters
            min_amount = request.args.get('minAmount', type=float)
            max_amount = request.args.get('maxAmount', type=float)
            currency = request.args.get('currency', type=str)
            start_date = request.args.get('startDate', type=str)
            end_date = request.args.get('endDate', type=str)
            description_query = request.args.get('description', type=str)
            device_query = request.args.get('deviceId', type=str)

            # Return paginated and filtered response
            result = db.get_transactions_paginated(
                page, page_size,
                min_amount, max_amount, currency,
                start_date, end_date, description_query, device_query
            )
            return jsonify({
                "data": [to_dict(t) for t in result["data"]],
                "total": result["total"],
                "page": result["page"],
                "pageSize": result["pageSize"],
                "totalPages": result["totalPages"]
            }), 200
        else:
            # Return all transactions (backward compatibility)
            transactions = db.get_all_transactions()
            return jsonify([to_dict(t) for t in transactions]), 200
    except Exception as e:
        return jsonify({"error": "fetch transactions failed"}), 500


@app.route('/api/transactions/currencies', methods=['GET'])
def get_currencies():
    try:
        currencies = db.get_all_currencies()
        return jsonify(currencies), 200
    except Exception as e:
        return jsonify({"error": "fetch currencies failed"}), 500


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


@app.route('/api/analytics/statistics', methods=['GET'])
def get_statistics():
    try:
        stats = db.get_statistics()
        return jsonify(to_dict(stats)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===== EXPORT ROUTES =====

# @app.route('/api/export/json', methods=['GET'])
# def export_graph_json():
#     try:
#         data = db.export_graph()
#         return jsonify(to_dict(data)), 200
#     except Exception as e:
#         return jsonify({"error": f"export failed: {str(e)}"}), 500


# @app.route('/api/export/csv', methods=['GET'])
# def export_graph_csv():
#     try:
#         data = db.export_graph()

#         # Create CSV in memory
#         output = io.StringIO()
#         writer = csv.writer(output)

#         # Nodes section
#         writer.writerow(["# Nodes"])
#         writer.writerow(["id", "type", "properties"])
#         for node in data.nodes:
#             props = json.dumps(node.properties)
#             writer.writerow([node.id, node.type, props])
#         writer.writerow([])

#         # Relationships section
#         writer.writerow(["# Relationships"])
#         writer.writerow(["source_id", "source_type", "relationship", "target_id", "target_type"])
#         for rel in data.relationships:
#             writer.writerow([
#                 rel.sourceId,
#                 rel.sourceType,
#                 rel.relationship,
#                 rel.targetId,
#                 rel.targetType
#             ])

#         # Get CSV content
#         csv_content = output.getvalue()
#         output.close()

#         # Return as downloadable file
#         from flask import Response
#         return Response(
#             csv_content,
#             mimetype="text/csv",
#             headers={"Content-Disposition": "attachment; filename=graph.csv"}
#         )
#     except Exception as e:
#         return jsonify({"error": f"export failed: {str(e)}"}), 500


# def row_to_csv(row):
#     s = io.StringIO()
#     csv.writer(s).writerow(row)
#     return s.getvalue()

# @app.route('/api/export/csv', methods=['GET'])
# def export_graph_csv():
#     data = db.export_graph()

#     def generate():
#         yield "# Nodes\n"
#         yield "id,type,properties\n"

#         for node in data.nodes:
#             props = json.dumps(node.properties)
#             yield row_to_csv([node.id, node.type, props])

#         yield "\n# Relationships\n"
#         yield "source_id,source_type,relationship,target_id,target_type\n"

#         for rel in data.relationships:
#             yield row_to_csv([
#                 rel.sourceId,
#                 rel.sourceType,
#                 rel.relationship,
#                 rel.targetId,
#                 rel.targetType
#             ])

#     return Response(
#         generate(),
#         mimetype="text/csv",
#         headers={"Content-Disposition": "attachment; filename=graph.csv"}
#     )
def row_to_csv(row):
    s = io.StringIO()
    csv.writer(s).writerow(row)
    return s.getvalue()
def safe(p):
    out = {}
    for k, v in p.items():
        out[k] = v.isoformat() if hasattr(v, "isoformat") else v
    return json.dumps(out, ensure_ascii=False)
@app.route("/api/export/csv")
def export_graph_csv_batched():
    def generate():
        BATCH_SIZE = 10000
        
        si = io.StringIO()
        writer = csv.writer(si)

        yield "# Nodes\n"
        yield "id,type,properties\n"

        with db.driver.session() as session:
            max_node_id_result = session.run("MATCH (n) RETURN max(id(n)) as m").single()
            max_node_id = max_node_id_result["m"] if max_node_id_result and max_node_id_result["m"] is not None else -1
            
            current_id = 0
            while current_id <= max_node_id:
                q_nodes = """
                MATCH (n)
                WHERE id(n) >= $start AND id(n) < $end
                RETURN id(n) AS id, labels(n)[0] AS type, properties(n) AS props
                """
                result = session.run(q_nodes, start=current_id, end=current_id + BATCH_SIZE)
                
                chunk_exists = False
                for rec in result:
                    chunk_exists = True
                    props_str = json.dumps(rec["props"], default=str, ensure_ascii=False)
                    writer.writerow([rec["id"], rec["type"], props_str])
                
                if chunk_exists:
                    yield si.getvalue()
                    si.seek(0)
                    si.truncate(0)
                
                current_id += BATCH_SIZE

        yield "\n# Relationships\n"
        yield "source_id,source_type,relationship,target_id,target_type\n"

        with db.driver.session() as session:
            max_rel_id_result = session.run("MATCH ()-[r]->() RETURN max(id(r)) as m").single()
            max_rel_id = max_rel_id_result["m"] if max_rel_id_result and max_rel_id_result["m"] is not None else -1
            
            current_id = 0
            while current_id <= max_rel_id:
                q_rels = """
                MATCH (a)-[r]->(b)
                WHERE id(r) >= $start AND id(r) < $end
                RETURN id(a) AS src, labels(a)[0] AS srcType,
                       type(r) AS rel, id(b) AS tgt, labels(b)[0] AS tgtType
                """
                result = session.run(q_rels, start=current_id, end=current_id + BATCH_SIZE)
                
                chunk_exists = False
                for rec in result:
                    chunk_exists = True
                    writer.writerow([
                        rec["src"],
                        rec["srcType"],
                        rec["rel"],
                        rec["tgt"],
                        rec["tgtType"]
                    ])
                
                if chunk_exists:
                    yield si.getvalue()
                    si.seek(0)
                    si.truncate(0)

                current_id += BATCH_SIZE

    return Response(stream_with_context(generate()), mimetype="text/csv",
                    headers={"Content-Disposition": "attachment; filename=graph_optimized.csv"})
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=port, debug=False)

