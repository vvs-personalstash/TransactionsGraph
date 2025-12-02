import React, { useState, useEffect, useMemo } from "react";
import api from "./api";

export default function TransactionClusters() {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterTxId, setFilterTxId] = useState("");
  const [filterClusterId, setFilterClusterId] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const goToPage = (n) => {
    setCurrentPage(Math.max(1, Math.min(pageCount, n)));
  };

  // windowed pagination — prevents 5000 buttons
  const getPageWindow = () => {
    const windowSize = 7;
    let start = Math.max(1, currentPage - 3);
    let end = Math.min(pageCount, start + windowSize - 1);
    if (end - start < windowSize - 1) {
      start = Math.max(1, end - windowSize + 1);
    }

    let arr = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
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
                className="bg-slate-900 border border-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Filter Cluster ID…"
                value={filterClusterId}
                onChange={(e) => {
                  setFilterClusterId(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm"
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
                {pagedData.map((c, idx) => (
                  <tr
                    key={`${c.transactionId}-${idx}`}
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
              className="px-3 py-1 bg-slate-700 text-slate-300 rounded disabled:opacity-50 hover:bg-slate-600"
            >
              Prev
            </button>

            {getPageWindow().map((page) => (
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
            ))}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === pageCount}
              className="px-3 py-1 bg-slate-700 text-slate-300 rounded disabled:opacity-50 hover:bg-slate-600"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
