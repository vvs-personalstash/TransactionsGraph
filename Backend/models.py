from dataclasses import dataclass
from typing import List, Any, Dict, Optional


@dataclass
class User:
    id: int
    name: str
    email: str
    phone: str


@dataclass
class Transaction:
    id: int
    fromUserId: int
    toUserId: int
    amount: float
    currency: str
    timestamp: str
    description: str
    deviceId: str


@dataclass
class RelConnection:
    node: Any
    relationship: str


@dataclass
class UserConnections:
    users: List[RelConnection]
    transactions: List[RelConnection]


@dataclass
class TxConnections:
    users: List[RelConnection]


@dataclass
class UserRelationships:
    user: User
    connections: UserConnections


@dataclass
class TransactionRelationships:
    transaction: Transaction
    connections: TxConnections


@dataclass
class PathNode:
    id: int
    type: str
    name: Optional[str] = None
    deviceId: Optional[str] = None


@dataclass
class PathSegment:
    from_node: PathNode
    to_node: PathNode
    relationship: str


@dataclass
class ShortestPathResponse:
    segments: List[PathSegment]


@dataclass
class TransactionCluster:
    transactionId: int
    clusterId: int


@dataclass
class TransactionClustersResponse:
    clusters: List[TransactionCluster]


@dataclass
class GraphNode:
    id: int
    type: str
    properties: Dict[str, Any]


@dataclass
class GraphRelationship:
    sourceId: int
    sourceType: str
    relationship: str
    targetId: int
    targetType: str


@dataclass
class GraphExportResponse:
    nodes: List[GraphNode]
    relationships: List[GraphRelationship]

