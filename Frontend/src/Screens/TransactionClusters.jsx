import React, { useState, useEffect, useMemo } from "react";
import api from "./api";

export default function TransactionClusters() {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // advanced filter state
  const [filterTxId, setFilterTxId] = useState("");
  const [filterClusterId, setFilterClusterId] = useState("");

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    api
      .get("/api/analytics/transaction-clusters")
      .then((res) => {
        setClusters(res.data.clusters);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load clusters. Please try again later.");
        setLoading(false);
      });
  }, []);

  // Apply filters
  const filtered = useMemo(() => {
    return clusters.filter((c) => {
      let ok = true;
      if (filterTxId) {
        ok = ok && String(c.transactionId).includes(filterTxId);
      }
      if (filterClusterId) {
        ok = ok && String(c.clusterId).includes(filterClusterId);
      }
      return ok;
    });
  }, [clusters, filterTxId, filterClusterId]);

  // Pagination calculations
  const pageCount = Math.ceil(filtered.length / pageSize) || 1;
  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const goToPage = (n) => {
    setCurrentPage(Math.max(1, Math.min(pageCount, n)));
  };

  return (
    <div className="container mx-auto px-6 py-12 max-w-3xl">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold text-emerald-400 text-center">
          Transaction Clustering
        </h1>
        <p className="text-slate-400 text-center">
          Group transactions sharing users. Filter and page through results
          below.
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
          <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Filter Txn ID…"
                value={filterTxId}
                onChange={(e) => {
                  setFilterTxId(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <input
                type="text"
                placeholder="Filter Cluster ID…"
                value={filterClusterId}
                onChange={(e) => {
                  setFilterClusterId(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">Page size:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-600 text-slate-200 px-2 py-1 rounded-lg text-sm"
              >
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="p-3 text-left text-sm font-medium text-slate-300">
                    Transaction ID
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-slate-300">
                    Cluster ID
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedData.map((c) => (
                  <tr
                    key={c.transactionId}
                    className="border-t border-slate-700 hover:bg-slate-700/50"
                  >
                    <td className="p-3 text-sm text-slate-200">
                      {c.transactionId}
                    </td>
                    <td className="p-3 text-sm text-slate-200">
                      {c.clusterId}
                    </td>
                  </tr>
                ))}
                {!pagedData.length && (
                  <tr>
                    <td colSpan={2} className="p-6 text-center text-slate-500">
                      No data for these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && pageCount > 1 && (
          <div className="p-4 border-t border-slate-700 flex justify-center items-center space-x-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50"
            >
              Prev
            </button>
            {[...Array(pageCount)].map((_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`px-3 py-1 rounded ${
                    page === currentPage
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === pageCount}
              className="px-3 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
