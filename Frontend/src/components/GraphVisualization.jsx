import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import api from "../Screens/api";

export default function GraphVisualization({ entityId, entityType }) {
  const cyRef = useRef(null);
  const [cy, setCy] = useState(null);

  // Initialize Cytoscape instance
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

  // Load graph data when entityId or entityType changes
  useEffect(() => {
    if (!cy || !entityId || !entityType) return;

    const loadGraph = async () => {
      try {
        const endpoint =
          entityType === "user"
            ? `/api/relationships/user/${entityId}`
            : `/api/relationships/transaction/${entityId}`;

        const response = await api.get(endpoint);
        const data = await response.data;

        const elements = [];

        if (entityType === "user") {
          const { user, connections } = data;
          elements.push({
            data: { id: `u${user.id}`, label: user.name, type: "user" },
          });

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
        } else {
          // transaction type
          const { transaction, connections } = data;
          const txnLabel = transaction.deviceId
            ? `Txn #${transaction.id} (${transaction.deviceId})`
            : `Txn #${transaction.id}`;

          elements.push({
            data: {
              id: `t${transaction.id}`,
              label: txnLabel,
              type: "transaction",
            },
          });

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
        }

        cy.elements().remove();
        cy.add(elements);
        cy.layout({ name: "cose", animate: true }).run();
        cy.fit();
      } catch (err) {
        console.error(`Failed to load ${entityType} graph:`, err);
      }
    };

    loadGraph();
  }, [cy, entityId, entityType]);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-emerald-400">
          Relationship Graph
        </h3>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-[#6FB1FC] rounded-full" />
            <span>User</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-3 bg-[#EDA1ED] rounded" />
            <span>Transaction</span>
          </div>
        </div>
      </div>
      <div
        ref={cyRef}
        className="w-full h-[400px] bg-slate-900 border border-slate-600 rounded"
      />
    </div>
  );
}
