import React from 'react'

export default function ExportPage() {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
        <h2 className="text-2xl font-semibold text-emerald-400 mb-6 text-center">Export Graph Data</h2>
        <div className="space-y-4">
          <a
            href="/api/export/json"
            className="block px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg text-center font-medium hover:from-amber-600 hover:to-amber-700"
            download="graph.json"
          >
            Download JSON
          </a>
          <a
            href="/api/export/csv"
            className="block px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg text-center font-medium hover:from-cyan-600 hover:to-cyan-700"
            download="graph.csv"
          >
            Download CSV
          </a>
        </div>
      </div>
    </div>
  )
}
