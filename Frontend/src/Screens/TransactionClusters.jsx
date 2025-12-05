import React, { useState, useEffect, useMemo } from "react";
import api from "./api";

export default function TransactionClusters() {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterTxId, setFilterTxId] = useState("");
  const [filterClusterId, setFilterClusterId] = useState("");

  useEffect(() => {
    api
      .get("/api/analytics/transaction-clusters")
      .then((res) => {
        const arr = Array.isArray(res.data?.clusters) ? res.data.clusters : [];
        setClusters(arr);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load clusters. Please try again later.");
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return clusters.filter((c) => {
      let ok = true;
      if (filterTxId) ok = ok && String(c.transactionId).includes(filterTxId);
      if (filterClusterId)
        ok = ok && String(c.clusterId).includes(filterClusterId);
      return ok;
    });
  }, [clusters, filterTxId, filterClusterId]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((c) => {
      if (!map[c.clusterId]) map[c.clusterId] = [];
      map[c.clusterId].push(c);
    });
    return map;
  }, [filtered]);
  console.log("CLUSTERS:", clusters);

  return (
    <div className="container mx-auto px-6 py-12 max-w-3xl">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold text-emerald-400 text-center">
          Transaction Clustering
        </h1>
        <p className="text-slate-400 text-center">
          Transactions grouped by cluster.
        </p>
      </header>

      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        {loading && (
          <div className="p-6 text-center text-slate-400">Loading…</div>
        )}

        {error && (
          <div className="p-6 bg-red-900/20 border border-red-800 text-red-400 text-center">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="p-4 border-b border-slate-700 flex gap-2">
            <input
              type="text"
              placeholder="Filter Txn ID…"
              value={filterTxId}
              onChange={(e) => setFilterTxId(e.target.value)}
              className="bg-slate-900 border border-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="Filter Cluster ID…"
              value={filterClusterId}
              onChange={(e) => setFilterClusterId(e.target.value)}
              className="bg-slate-900 border border-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm"
            />
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-6 p-4">
            {Object.keys(grouped).map((clusterId) => (
              <div
                key={clusterId}
                className="border border-slate-700 rounded-lg overflow-hidden"
              >
                <div className="bg-slate-900 p-3 border-b border-slate-700">
                  <h2 className="text-xl font-semibold text-emerald-400">
                    Cluster {clusterId}
                  </h2>
                  <p className="text-slate-400 text-sm">
                    {grouped[clusterId].length} transactions
                  </p>
                </div>

                <table className="w-full">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="p-3 text-left text-sm font-medium text-slate-300">
                        Transaction ID
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[clusterId].map((c, idx) => (
                      <tr
                        key={`${c.transactionId}-${idx}`}
                        className="border-t border-slate-700 hover:bg-slate-700/50"
                      >
                        <td className="p-3 text-sm text-slate-200">
                          {c.transactionId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {!Object.keys(grouped).length && (
              <div className="p-6 text-center text-slate-500">
                No data for these filters.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
