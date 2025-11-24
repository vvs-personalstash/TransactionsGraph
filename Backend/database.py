from neo4j import GraphDatabase
from typing import List, Tuple, Optional
import time
from datetime import datetime
from models import (
    User, Transaction, UserConnections, TxConnections,
    RelConnection, PathSegment, PathNode, TransactionCluster,
    GraphNode, GraphRelationship, GraphExportResponse, Statistics
)


class Neo4jDriver:
    def __init__(self, uri: str, username: str, password: str):
        self.driver = GraphDatabase.driver(uri, auth=(username, password))
        self.driver.verify_connectivity()
    
    def close(self):
        self.driver.close()
    
    def create_user(self, name: str, email: str, phone: str) -> int:
        with self.driver.session() as session:
            # Create a user
            result = session.execute_write(
                self._create_user_tx, name, email, phone
            )
            new_id = result          
            # Link shared email
            session.execute_write(self._link_shared_email, new_id)           
            # Link shared phone
            session.execute_write(self._link_shared_phone, new_id)            
            return new_id
    
    @staticmethod
    def _create_user_tx(tx, name: str, email: str, phone: str):
        query = """
        CREATE (u:User { name: $name, email: $email, phone: $phone })
        RETURN id(u)
        """
        result = tx.run(query, name=name, email=email, phone=phone)
        record = result.single()
        if record:
            return record[0]
        raise Exception("CreateUser: no record returned")
    
    @staticmethod
    def _link_shared_email(tx, user_id: int):
        query = """
        MATCH (u:User), (o:User)
        WHERE id(u) = $id AND o.email = u.email AND id(o) <> $id
        MERGE (u)-[:SHARED_EMAIL]-(o)
        """
        tx.run(query, id=user_id)
    
    @staticmethod
    def _link_shared_phone(tx, user_id: int):
        query = """
        MATCH (u:User), (o:User)
        WHERE id(u) = $id AND o.phone = u.phone AND id(o) <> $id
        MERGE (u)-[:SHARED_PHONE]-(o)
        """
        tx.run(query, id=user_id)
    
    def get_all_users(self) -> List[User]:
        with self.driver.session() as session:
            result = session.execute_read(self._get_all_users_tx)
            return result
    
    @staticmethod
    def _get_all_users_tx(tx):
        query = """
        MATCH (u:User)
        RETURN id(u) AS id, u.name AS name, u.email AS email, u.phone AS phone
        """
        result = tx.run(query)
        users = []
        for record in result:
            users.append(User(
                id=record["id"],
                name=record["name"],
                email=record["email"],
                phone=record["phone"]
            ))
        return users
    
    def create_transaction(
        self, from_id: int, to_id: int, amount: float,
        currency: str, timestamp: str, description: str, device_id: str
    ) -> int:
        with self.driver.session() as session:
            # Create transaction
            new_id = session.execute_write(
                self._create_transaction_tx,
                from_id, to_id, amount, currency, timestamp, description, device_id
            )
            
            # Link shared device
            session.execute_write(self._link_shared_device, new_id)
            
            return new_id
    
    @staticmethod
    def _create_transaction_tx(
        tx, from_id: int, to_id: int, amount: float,
        currency: str, timestamp: str, description: str, device_id: str
    ):
        query = """
        MATCH (u1:User),(u2:User)
        WHERE id(u1) = $fromId AND id(u2) = $toId
        CREATE (t:Transaction {
          amount:      $amt,
          currency:    $currency,
          timestamp:   datetime($ts),
          description: $desc,
          deviceId:    $deviceId
        })
        CREATE (u1)-[:SENT]->(t)
        CREATE (t)-[:RECEIVED_BY]->(u2)
        RETURN id(t)
        """
        result = tx.run(
            query,
            fromId=from_id, toId=to_id, amt=amount,
            currency=currency, ts=timestamp, desc=description, deviceId=device_id
        )
        record = result.single()
        if record:
            return record[0]
        raise Exception("CreateTransaction: no record returned")
    
    @staticmethod
    def _link_shared_device(tx, tx_id: int):
        query = """
        MATCH (t:Transaction),(o:Transaction)
        WHERE id(t) = $id
          AND o.deviceId = t.deviceId
          AND id(o) <> $id
        MERGE (t)-[:SHARED_DEVICE]-(o)
        """
        tx.run(query, id=tx_id)

    def get_all_transactions(self) -> List[Transaction]:
        with self.driver.session() as session:
            return session.execute_read(self._get_all_transactions_tx)

    @staticmethod
    def _get_all_transactions_tx(tx):
        query = """
        MATCH (u1:User)-[:SENT]->(t:Transaction)-[:RECEIVED_BY]->(u2:User)
        RETURN id(t)           AS id,
               id(u1)         AS fromId,
               id(u2)         AS toId,
               t.amount       AS amt,
               t.currency     AS currency,
               toString(t.timestamp) AS ts,
               t.description  AS desc,
               t.deviceId     AS deviceId
        """
        result = tx.run(query)
        transactions = []
        for record in result:
            transactions.append(Transaction(
                id=record["id"],
                fromUserId=record["fromId"],
                toUserId=record["toId"],
                amount=record["amt"],
                currency=record["currency"],
                timestamp=record["ts"],
                description=record["desc"],
                deviceId=record["deviceId"]
            ))
        return transactions

    def get_user_relationships(self, user_id: int) -> Tuple[User, UserConnections]:
        with self.driver.session() as session:
            # Get user
            user = session.execute_read(self._get_user_by_id, user_id)
            if not user:
                raise Exception("user not found")

            # Get connections
            shared_users = session.execute_read(self._get_shared_users, user_id)
            sent_txs = session.execute_read(self._get_sent_transactions, user_id)
            received_txs = session.execute_read(self._get_received_transactions, user_id)

            connections = UserConnections(
                users=shared_users,
                transactions=sent_txs + received_txs
            )

            return user, connections

    @staticmethod
    def _get_user_by_id(tx, user_id: int) -> Optional[User]:
        query = """
        MATCH (u:User) WHERE id(u) = $uid
        RETURN id(u), u.name, u.email, u.phone
        """
        result = tx.run(query, uid=user_id)
        record = result.single()
        if record:
            return User(
                id=record[0],
                name=record[1],
                email=record[2],
                phone=record[3]
            )
        return None

    @staticmethod
    def _get_shared_users(tx, user_id: int) -> List[RelConnection]:
        query = """
        MATCH (u:User)-[r:SHARED_EMAIL|SHARED_PHONE]-(o:User)
        WHERE id(u) = $uid
        RETURN type(r), id(o), o.name, o.email, o.phone
        """
        result = tx.run(query, uid=user_id)
        connections = []
        for record in result:
            connections.append(RelConnection(
                node=User(
                    id=record[1],
                    name=record[2],
                    email=record[3],
                    phone=record[4]
                ),
                relationship=record[0]
            ))
        return connections

    @staticmethod
    def _get_sent_transactions(tx, user_id: int) -> List[RelConnection]:
        query = """
        MATCH (u:User)-[r:SENT]->(t:Transaction)-[:RECEIVED_BY]->(v:User)
        WHERE id(u) = $uid
        RETURN type(r), id(t), id(u), id(v),
               t.amount, t.currency, toString(t.timestamp), t.description, t.deviceId
        """
        result = tx.run(query, uid=user_id)
        connections = []
        for record in result:
            connections.append(RelConnection(
                node=Transaction(
                    id=record[1],
                    fromUserId=record[2],
                    toUserId=record[3],
                    amount=record[4],
                    currency=record[5],
                    timestamp=record[6],
                    description=record[7],
                    deviceId=record[8]
                ),
                relationship=record[0]
            ))
        return connections

    @staticmethod
    def _get_received_transactions(tx, user_id: int) -> List[RelConnection]:
        query = """
        MATCH (x:User)-[:SENT]->(t:Transaction)-[r:RECEIVED_BY]->(u:User)
        WHERE id(u) = $uid
        RETURN type(r), id(t), id(x), id(u),
               t.amount, t.currency, toString(t.timestamp), t.description, t.deviceId
        """
        result = tx.run(query, uid=user_id)
        connections = []
        for record in result:
            connections.append(RelConnection(
                node=Transaction(
                    id=record[1],
                    fromUserId=record[2],
                    toUserId=record[3],
                    amount=record[4],
                    currency=record[5],
                    timestamp=record[6],
                    description=record[7],
                    deviceId=record[8]
                ),
                relationship=record[0]
            ))
        return connections

    def get_transaction_relationships(self, tx_id: int) -> Tuple[Transaction, TxConnections]:
        with self.driver.session() as session:
            # Get transaction
            tx_node = session.execute_read(self._get_transaction_by_id, tx_id)
            if not tx_node:
                raise Exception("transaction not found")

            # Get sender and receiver
            users = session.execute_read(self._get_transaction_users, tx_id)

            connections = TxConnections(users=users)

            return tx_node, connections

    @staticmethod
    def _get_transaction_by_id(tx, tx_id: int) -> Optional[Transaction]:
        query = """
        MATCH (t:Transaction)
        WHERE id(t) = $txid
        RETURN id(t), t.amount, t.currency,
               toString(t.timestamp), t.description, t.deviceId
        """
        result = tx.run(query, txid=tx_id)
        record = result.single()
        if record:
            return Transaction(
                id=record[0],
                fromUserId=0,  # Will be filled by relationships
                toUserId=0,    # Will be filled by relationships
                amount=record[1],
                currency=record[2],
                timestamp=record[3],
                description=record[4],
                deviceId=record[5]
            )
        return None

    @staticmethod
    def _get_transaction_users(tx, tx_id: int) -> List[RelConnection]:
        # Get sender
        query_sender = """
        MATCH (u:User)-[r:SENT]->(t:Transaction)
        WHERE id(t) = $txid
        RETURN type(r), id(u), u.name, u.email, u.phone
        """
        result = tx.run(query_sender, txid=tx_id)
        users = []
        record = result.single()
        if record:
            users.append(RelConnection(
                node=User(
                    id=record[1],
                    name=record[2],
                    email=record[3],
                    phone=record[4]
                ),
                relationship=record[0]
            ))

        # Get receiver
        query_receiver = """
        MATCH (t:Transaction)-[r:RECEIVED_BY]->(u:User)
        WHERE id(t) = $txid
        RETURN type(r), id(u), u.name, u.email, u.phone
        """
        result = tx.run(query_receiver, txid=tx_id)
        record = result.single()
        if record:
            users.append(RelConnection(
                node=User(
                    id=record[1],
                    name=record[2],
                    email=record[3],
                    phone=record[4]
                ),
                relationship=record[0]
            ))

        return users

    def shortest_path_segments(self, from_id: int, to_id: int) -> List[PathSegment]:
        with self.driver.session() as session:
            return session.execute_read(self._shortest_path_tx, from_id, to_id)

    @staticmethod
    def _shortest_path_tx(tx, from_id: int, to_id: int) -> List[PathSegment]:
        query = """
        MATCH (a:User),(b:User), p = shortestPath((a)-[*]-(b))
        WHERE id(a) = $from AND id(b) = $to
        UNWIND relationships(p) AS r
        WITH r, startNode(r) AS fn, endNode(r) AS tn
        RETURN
          labels(fn)[0]                                        AS fromLabel,
          id(fn)                                               AS fromId,
          CASE WHEN fn:User THEN fn.name ELSE '' END           AS fromName,
          CASE WHEN fn:Transaction THEN fn.deviceId ELSE '' END AS fromDeviceId,

          labels(tn)[0]                                        AS toLabel,
          id(tn)                                               AS toId,
          CASE WHEN tn:User THEN tn.name ELSE '' END           AS toName,
          CASE WHEN tn:Transaction THEN tn.deviceId ELSE '' END AS toDeviceId,

          type(r)                                              AS relationship
        """
        result = tx.run(query, **{"from": from_id, "to": to_id})
        segments = []
        for record in result:
            from_node = PathNode(
                type=record["fromLabel"],
                id=record["fromId"],
                name=record["fromName"] if record["fromName"] else None,
                deviceId=record["fromDeviceId"] if record["fromDeviceId"] else None
            )
            to_node = PathNode(
                type=record["toLabel"],
                id=record["toId"],
                name=record["toName"] if record["toName"] else None,
                deviceId=record["toDeviceId"] if record["toDeviceId"] else None
            )
            segments.append(PathSegment(
                from_node=from_node,
                to_node=to_node,
                relationship=record["relationship"]
            ))

        if not segments:
            raise Exception("no path found")

        return segments

    def cluster_transactions(self) -> List[TransactionCluster]:
        with self.driver.session() as session:
            # Get all transaction IDs
            tx_ids = session.execute_read(self._get_all_transaction_ids)

            # Get transaction pairs (edges)
            pairs = session.execute_read(self._get_transaction_pairs)

            # Build adjacency list
            adj = {tx_id: [] for tx_id in tx_ids}
            for t1, t2 in pairs:
                adj[t1].append(t2)
                adj[t2].append(t1)

            # BFS to find connected components
            visited = set()
            clusters = []

            for start in tx_ids:
                if start in visited:
                    continue

                # BFS
                queue = [start]
                visited.add(start)
                component = [start]

                while queue:
                    curr = queue.pop(0)
                    for neighbor in adj[curr]:
                        if neighbor not in visited:
                            visited.add(neighbor)
                            queue.append(neighbor)
                            component.append(neighbor)

                # Cluster ID is the minimum transaction ID in the component
                cluster_id = min(component)

                # Add all transactions in this component
                for tx_id in component:
                    clusters.append(TransactionCluster(
                        transactionId=tx_id,
                        clusterId=cluster_id
                    ))

            return clusters

    @staticmethod
    def _get_all_transaction_ids(tx) -> List[int]:
        query = "MATCH (t:Transaction) RETURN id(t)"
        result = tx.run(query)
        return [record[0] for record in result]

    @staticmethod
    def _get_transaction_pairs(tx) -> List[Tuple[int, int]]:
        query = """
        MATCH (t1:Transaction)-[:SENT|RECEIVED_BY]-(u:User)-[:SENT|RECEIVED_BY]-(t2:Transaction)
        WHERE id(t1)<id(t2)
        RETURN id(t1), id(t2)
        """
        result = tx.run(query)
        return [(record[0], record[1]) for record in result]

    def get_statistics(self) -> Statistics:
        with self.driver.session() as session:
            stats = session.execute_read(self._get_statistics_tx)
            return stats

    @staticmethod
    def _get_statistics_tx(tx) -> Statistics:
        query = """
        MATCH (u:User)
        WITH count(u) AS userCount
        MATCH (t:Transaction)
        WITH userCount, count(t) AS transactionCount
        MATCH ()-[r]->()
        RETURN userCount, transactionCount, count(r) AS relationshipCount
        """
        result = tx.run(query)
        record = result.single()
        if record:
            return Statistics(
                userCount=record["userCount"],
                transactionCount=record["transactionCount"],
                relationshipCount=record["relationshipCount"]
            )
        return Statistics(userCount=0, transactionCount=0, relationshipCount=0)

    def export_graph(self) -> GraphExportResponse:
        with self.driver.session() as session:
            # Get all nodes
            nodes = session.execute_read(self._get_all_nodes)

            # Get all relationships
            relationships = session.execute_read(self._get_all_relationships)

            # Get transaction-transaction edges (shared device/IP)
            tt_rels = session.execute_read(self._get_transaction_transaction_rels)

            return GraphExportResponse(
                nodes=nodes,
                relationships=relationships + tt_rels
            )

    @staticmethod
    def _get_all_nodes(tx) -> List[GraphNode]:
        query = """
        MATCH (n)
        RETURN id(n) AS id,
               labels(n)[0] AS type,
               properties(n)    AS props
        """
        result = tx.run(query)
        nodes = []
        for record in result:
            nodes.append(GraphNode(
                id=record["id"],
                type=record["type"],
                properties=dict(record["props"])
            ))
        return nodes

    @staticmethod
    def _get_all_relationships(tx) -> List[GraphRelationship]:
        query = """
        MATCH (a)-[r]->(b)
        RETURN id(a)             AS sourceId,
               labels(a)[0]       AS sourceType,
               type(r)            AS relationship,
               id(b)             AS targetId,
               labels(b)[0]      AS targetType
        """
        result = tx.run(query)
        rels = []
        for record in result:
            rels.append(GraphRelationship(
                sourceId=record["sourceId"],
                sourceType=record["sourceType"],
                relationship=record["relationship"],
                targetId=record["targetId"],
                targetType=record["targetType"]
            ))
        return rels

    @staticmethod
    def _get_transaction_transaction_rels(tx) -> List[GraphRelationship]:
        query = """
        MATCH (t1:Transaction),(t2:Transaction)
        WHERE id(t1) < id(t2)
          AND (
            (t1.ip IS NOT NULL AND t1.ip = t2.ip)
             OR
            (t1.deviceId IS NOT NULL AND t1.deviceId = t2.deviceId)
          )
        RETURN id(t1)                                   AS sourceId,
               labels(t1)[0]                             AS sourceType,
               CASE
                 WHEN t1.ip = t2.ip THEN 'SHARED_IP'
                 ELSE 'SHARED_DEVICE'
               END                                         AS relationship,
               id(t2)                                   AS targetId,
               labels(t2)[0]                             AS targetType
        """
        result = tx.run(query)
        rels = []
        for record in result:
            rels.append(GraphRelationship(
                sourceId=record["sourceId"],
                sourceType=record["sourceType"],
                relationship=record["relationship"],
                targetId=record["targetId"],
                targetType=record["targetType"]
            ))
        return rels


def seed_data(driver: Neo4jDriver):
    """Seed sample data into the database"""
    # Sample users
    sample_users = [
        ("Alice", "alice@example.com", "1111111111"),
        ("Bob", "bob@example.com", "2222222222"),
        ("Carol", "alice@example.com", "3333333333"),  # shares email with Alice
        ("Dave", "dave@example.com", "1111111111"),    # shares phone with Alice
        ("Eve", "eve@example.com", "2222222222"),      # shares phone with Bob
    ]

    user_ids = []
    for name, email, phone in sample_users:
        user_id = driver.create_user(name, email, phone)
        user_ids.append(user_id)

    # Sample transactions
    tx_defs = [
        (0, 1, 100.0, "USD", "Payment A→B", "dev-001"),
        (1, 2, 150.0, "USD", "Payment B→C", "dev-001"),
        (2, 0, 200.0, "USD", "Payment C→A", "dev-002"),
        (3, 4, 250.0, "USD", "Payment D→E", "dev-003"),
        (4, 3, 300.0, "USD", "Payment E→D", "dev-003"),
        (0, 3, 350.0, "USD", "Payment A→D", "dev-004"),
        (2, 4, 400.0, "USD", "Payment C→E", "dev-002"),
    ]

    for i, (from_idx, to_idx, amount, currency, desc, device_id) in enumerate(tx_defs):
        # Create timestamp (going back in time for each transaction)
        from datetime import datetime, timedelta
        ts = (datetime.now() - timedelta(hours=i)).isoformat()

        driver.create_transaction(
            user_ids[from_idx],
            user_ids[to_idx],
            amount,
            currency,
            ts,
            desc,
            device_id
        )

