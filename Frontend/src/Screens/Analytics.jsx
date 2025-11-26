import { useState, useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import api from "./api";

export default function Analytics() {
  const [users, setUsers] = useState([]);
  const [fromID, setFromID] = useState("");
  const [toID, setToID] = useState("");
  const [error, setError] = useState(null);
  const cyRef = useRef(null);
  const [cy, setCy] = useState(null);

  // 1) initialize Cytoscape
  useEffect(() => {
    if (cyRef.current && !cy) {
      const instance = cytoscape({
        container: cyRef.current,
        elements: [],
        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "background-color": "#6FB1FC",
              shape: "ellipse",
              color: "#ffffff",
              "font-size": "12px",
              "text-valign": "center",
              "text-halign": "center",
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
              "line-color": "#94a3b8",
              width: 2,
              "target-arrow-shape": "triangle",
              "target-arrow-color": "#94a3b8",
            },
          },
          {
            selector: ".highlight",
            style: {
              "line-color": "#ef4444",
              "target-arrow-color": "#ef4444",
              width: 4,
            },
          },
        ],
        layout: { name: "breadthfirst" },
      });
      setCy(instance);
    }
  }, [cy]);

  // 2) load user list for the selectors
  useEffect(() => {
    api
      .get("/api/users")
      .then((res) => setUsers(res.data))
      .catch(() => setError("Error loading user list."));
  }, []);

  // 3) form submit: fetch path‐with‐relations and draw graph
  const handlePath = async (e) => {
    e.preventDefault();
    setError(null);
    if (!fromID || !toID) {
      setError("Please select both users.");
      return;
    }

    try {
      const { data } = await api.get(
        `/api/analytics/shortest-path/users/${fromID}/${toID}`
      );
      const segments = data.segments; // expect [{ from, to, relationship }, ...]

      if (!segments?.length) {
        setError("No path found between those users.");
        cy.elements().remove();
        return;
      }

      // build node elements (deduplicated)
      const nodeMap = {};
      segments.forEach(({ from_node, to_node }) => {
        [from_node, to_node].forEach((n) => {
          const key = `${n.type[0].toLowerCase()}${n.id}`;
          if (!nodeMap[key]) {
            nodeMap[key] = {
              data: {
                id: key,
                label:
                  n.type === "User"
                    ? n.name
                    : `Txn #${n.id}${n.deviceId ? ` (${n.deviceId})` : ""}`,
              },
            };
          }
        });
      });
      const nodeElems = Object.values(nodeMap);

      // build edge elements using the real relationship name
      const edgeElems = segments.map(
        ({ from_node, to_node, relationship }, i) => {
          const src = `${from_node.type[0].toLowerCase()}${from_node.id}`;
          const dst = `${to_node.type[0].toLowerCase()}${to_node.id}`;
          return {
            data: {
              id: `e_${src}_${dst}_${i}`,
              source: src,
              target: dst,
              label: relationship.replace("_", " "),
            },
            classes: "highlight",
          };
        }
      );

      cy.elements().remove();
      cy.add([...nodeElems, ...edgeElems]);
      cy.layout({ name: "breadthfirst" }).run();
      cy.fit();
    } catch {
      setError("Error computing path.");
      cy.elements().remove();
    }
  };

  return (
    <div className="container mx-auto px-6 py-12 max-w-lg space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-emerald-400 mb-4 text-center">
          Shortest Path Analytics
        </h2>
        {error && (
          <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handlePath} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-slate-300">
              From User
            </label>
            <select
              value={fromID}
              onChange={(e) => setFromID(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select user…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} (#{u.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-slate-300">
              To User
            </label>
            <select
              value={toID}
              onChange={(e) => setToID(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select user…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} (#{u.id})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 rounded-lg"
          >
            Compute Path
          </button>
        </form>
      </div>

      <div
        ref={cyRef}
        className="bg-slate-800 border border-slate-700 rounded-lg h-[400px]"
      />
    </div>
  );
}
