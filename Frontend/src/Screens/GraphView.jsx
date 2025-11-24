import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import cytoscape from "cytoscape";

export default function GraphView() {
  const cyRef = useRef(null);
  const [cy, setCy] = useState(null);
  const [users, setUsers] = useState([]);
  const [txns, setTxns] = useState([]);

  useEffect(() => {
    if (cyRef.current && !cy) {
      const instance = cytoscape({
        container: cyRef.current,
        elements: [],
        style: [
          {
            selector: 'node[type="user"]',
            style: {
              shape: "ellipse",
              "background-color": "#6FB1FC",
              label: "data(label)",
              "text-valign": "center",
              "text-halign": "center",
              "font-size": "12px",
              color: "#ffffff",
            },
          },
          {
            selector: 'node[type="transaction"]',
            style: {
              shape: "round-rectangle",
              "background-color": "#EDA1ED",
              label: "data(label)",
              "text-valign": "center",
              "text-halign": "center",
              "font-size": "12px",
              color: "#ffffff",
            },
          },
          {
            selector:
              'edge[relationship="SHARED_EMAIL"], edge[relationship="SHARED_PHONE"]',
            style: {
              "line-style": "dashed",
              "line-color": "#94a3b8",
              width: 2,
              "target-arrow-shape": "triangle",
              "target-arrow-color": "#94a3b8",
              "arrow-scale": 0.8,
            },
          },
          {
            selector: 'edge[relationship="SENT"]',
            style: {
              "line-color": "#10b981",
              width: 3,
              "target-arrow-shape": "triangle",
              "target-arrow-color": "#10b981",
              "arrow-scale": 1,
            },
          },
          {
            selector: 'edge[relationship="RECEIVED_BY"]',
            style: {
              "line-color": "#f97316",
              width: 3,
              "target-arrow-shape": "triangle",
              "target-arrow-color": "#f97316",
              "arrow-scale": 1,
            },
          },
          {
            selector: "edge",
            style: {
              label: "data(label)",
              "font-size": "10px",
              "text-rotation": "autorotate",
              "text-margin-y": "-6px",
              "text-background-color": "#1e293b",
              "text-background-opacity": 0.9,
              "text-background-padding": "3px",
              color: "#e2e8f0",
            },
          },
        ],
        layout: { name: "cose", animate: true, animationDuration: 500 },
      });
      setCy(instance);
    }
  }, [cy]);

  useEffect(() => {
    axios.get("/api/users").then((res) => setUsers(res.data));
    axios.get("/api/transactions").then((res) => setTxns(res.data));
  }, []);

  const loadUserGraph = async (id) => {
    try {
      const { data } = await axios.get(`/api/relationships/user/${id}`);
      const { user, connections } = data;

      const elements = [
        { data: { id: `u${user.id}`, label: user.name, type: "user" } },
      ];

      connections.users.forEach((rc) => {
        const u = rc.node;
        elements.push({
          data: { id: `u${u.id}`, label: u.name, type: "user" },
        });
        elements.push({
          data: {
            id: `e_user_${user.id}_${u.id}`,
            source: `u${user.id}`,
            target: `u${u.id}`,
            relationship: rc.relationship,
            label: rc.relationship,
          },
        });
      });

      connections.transactions.forEach((rc) => {
        const t = rc.node;
        const txnLabel = t.deviceId
          ? `Txn #${t.id} (${t.deviceId})`
          : `Txn #${t.id}`;

        elements.push({
          data: { id: `t${t.id}`, label: txnLabel, type: "transaction" },
        });

        const edgeData =
          rc.relationship === "SENT"
            ? { source: `u${user.id}`, target: `t${t.id}` }
            : { source: `t${t.id}`, target: `u${user.id}` };

        elements.push({
          data: {
            id: `e_user_tx_${user.id}_${t.id}`,
            relationship: rc.relationship,
            label: rc.relationship,
            ...edgeData,
          },
        });
      });

      cy.elements().remove();
      cy.add(elements);
      cy.layout({ name: "cose", animate: true }).run();
      cy.fit();
    } catch (err) {
      console.error("Failed to load user graph:", err);
      alert("Error loading user graph; see console.");
    }
  };

  const loadTxnGraph = async (id) => {
    try {
      const { data } = await axios.get(`/api/relationships/transaction/${id}`);
      const { transaction, connections } = data;

      const txnLabel = transaction.deviceId
        ? `Txn #${transaction.id} (${transaction.deviceId})`
        : `Txn #${transaction.id}`;

      const elements = [
        {
          data: {
            id: `t${transaction.id}`,
            label: txnLabel,
            type: "transaction",
          },
        },
      ];

      connections.users.forEach((rc) => {
        const u = rc.node;
        elements.push({
          data: { id: `u${u.id}`, label: u.name, type: "user" },
        });

        const edgeData =
          rc.relationship === "SENT"
            ? { source: `u${u.id}`, target: `t${transaction.id}` }
            : { source: `t${transaction.id}`, target: `u${u.id}` };

        elements.push({
          data: {
            id: `e_tx_user_${transaction.id}_${u.id}`,
            relationship: rc.relationship,
            label: rc.relationship,
            ...edgeData,
          },
        });
      });

      cy.elements().remove();
      cy.add(elements);
      cy.layout({ name: "cose", animate: true }).run();
      cy.fit();
    } catch (err) {
      console.error("Failed to load transaction graph:", err);
      alert("Error loading transaction graph; see console.");
    }
  };

  const loadFullGraph = async () => {
    try {
      const { data } = await axios.get("/api/export/json");
      const elements = [];

      data.nodes.forEach((n) => {
        const prefix = n.type[0].toLowerCase();
        const id = `${prefix}${n.id}`;
        const label =
          n.type === "User"
            ? n.properties.name
            : n.properties.deviceId
            ? `Txn #${n.id} (${n.properties.deviceId})`
            : `Txn #${n.id}`;

        elements.push({ data: { id, label, type: n.type.toLowerCase() } });
      });

      data.relationships.forEach((r) => {
        const sId = `${r.sourceType[0].toLowerCase()}${r.sourceId}`;
        const tId = `${r.targetType[0].toLowerCase()}${r.targetId}`;

        elements.push({
          data: {
            id: `e_${sId}_${tId}`,
            source: sId,
            target: tId,
            relationship: r.relationship,
            label: r.relationship,
          },
        });
      });

      cy.elements().remove();
      cy.add(elements);
      cy.layout({ name: "cose", animate: true }).run();
      cy.fit();
    } catch (err) {
      console.error("Failed to load full graph:", err);
      alert("Error loading full graph; see console.");
    }
  };

  return (
    <div className="container mx-auto px-6 py-12 flex flex-col lg:flex-row gap-6">
      <aside className="w-full lg:w-1/4 bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-6">
        <button
          onClick={loadFullGraph}
          className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium"
        >
          Load Full Graph
        </button>

        <div>
          <h3 className="text-lg font-semibold text-slate-100 mb-2">Users</h3>
          <ul className="max-h-40 overflow-auto list-disc list-inside space-y-1">
            {users.map((u) => (
              <li
                key={u.id}
                onClick={() => loadUserGraph(u.id)}
                className="cursor-pointer text-slate-300 hover:text-emerald-400"
              >
                {u.name} <span className="text-sm text-slate-500">#{u.id}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-100 mb-2">Transactions</h3>
          <ul className="max-h-40 overflow-auto list-disc list-inside space-y-1">
            {txns.map((t) => (
              <li
                key={t.id}
                onClick={() => loadTxnGraph(t.id)}
                className="cursor-pointer text-slate-300 hover:text-emerald-400"
              >
                Txn #{t.id}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <h4 className="text-lg font-semibold text-slate-100 mb-2">Legend</h4>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-center">
              <span className="w-3 h-3 bg-[#6FB1FC] rounded-full mr-2" /> User
              node
            </li>
            <li className="flex items-center">
              <span className="w-4 h-3 bg-[#EDA1ED] rounded mr-2" /> Transaction
              node
            </li>
            <li className="flex items-center">
              <span className="w-3 h-0.5 bg-green-600 mr-2" /> Sent (
              <span className="text-green-600">→</span>)
            </li>
            <li className="flex items-center">
              <span className="w-3 h-0.5 bg-orange-600 mr-2" /> Received (
              <span className="text-orange-600">→</span>)
            </li>
            <li className="flex items-center">
              <span className="w-3 h-0.5 border border-slate-400 border-dashed mr-2" />{" "}
              Shared (<span className="text-slate-300">→</span>)
            </li>
          </ul>
        </div>
      </aside>

      <section className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div
          ref={cyRef}
          className="w-full h-[600px] bg-slate-900 border border-slate-600 rounded"
        />
      </section>
    </div>
  );
}
