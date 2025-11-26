import React, { useEffect, useRef } from "react";
import api from "./api";
export default function ExportPage() {
  const csvStreamRef = useRef(null);

  useEffect(() => {
    const fetchCsv = async () => {
      try {
        const response = await api.get("/api/export/csv", {
          responseType: "blob",
        });

        const blob = new Blob([response.data], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "export.csv";
        link.click();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error fetching CSV:", error);
      }
    };

    fetchCsv();
  }, []);

  const handleDownload = async () => {
    const response = await api.get("/api/export/csv");
    const blob = await response.blob();

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "graph.csv";
    link.click();
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
        <h2 className="text-2xl font-semibold text-emerald-400 mb-6 text-center">
          Export Graph Data
        </h2>
        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={handleDownload}
            className="block px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg text-center font-medium hover:from-amber-600 hover:to-amber-700"
          >
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}
