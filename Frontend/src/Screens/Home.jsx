import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Home() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios
      .get('/api/analytics/statistics')
      .then(res => {
        setStats(res.data)
        setLoading(false)
      })
      .catch(() => {
        setError('Unable to load statistics. Please try again later.')
        setLoading(false)
      })
  }, [])

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-emerald-400 mb-4">
          Transaction Graph Explorer
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Manage users, track transactions, and explore relationships visually—all in one place.
        </p>
      </div>

      {loading && (
        <div className="text-center text-slate-400 py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          <p className="mt-4">Loading analytics...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg p-6 text-center">
          {error}
        </div>
      )}

      {!loading && !error && stats && (
        <section className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-12">
          <div className="p-8 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/30 rounded-lg hover:border-emerald-500 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-300">Total Users</h3>
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-5xl font-bold text-emerald-400">{stats.userCount}</p>
            <p className="text-sm text-slate-400 mt-2">Registered users in the system</p>
          </div>

          <div className="p-8 bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border border-cyan-500/30 rounded-lg hover:border-cyan-500 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-300">Total Transactions</h3>
              <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <p className="text-5xl font-bold text-cyan-400">{stats.transactionCount}</p>
            <p className="text-sm text-slate-400 mt-2">Total transactions recorded</p>
          </div>

          <div className="p-8 bg-gradient-to-br from-violet-500/10 to-violet-600/10 border border-violet-500/30 rounded-lg hover:border-violet-500 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-300">Total Relationships</h3>
              <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <p className="text-5xl font-bold text-violet-400">{stats.relationshipCount}</p>
            <p className="text-sm text-slate-400 mt-2">Connections in the graph</p>
          </div>
        </section>
      )}
    </div>
  )
}
