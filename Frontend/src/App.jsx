import { Outlet, NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'Home',                  to: '/' },
  { label: 'Add Data',              to: '/add-data' },
  { label: 'View Lists',            to: '/lists' },
  { label: 'Graph View',            to: '/graph' },
  { label: 'Shortest Path',         to: '/analytics' },
  { label: 'Transaction Clusters',  to: '/transaction-clusters' },
  { label: 'Export JSON/CSV',       to: '/export' },
]

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-2xl font-bold text-emerald-400">
              Transaction Graph Viewer
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            {NAV_ITEMS.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium border ${
                    isActive
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'text-slate-300 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8">
        <Outlet />
      </main>

      <footer className="bg-slate-800 border-t border-slate-700">
        <div className="container mx-auto px-6 py-4 text-center text-sm text-slate-400">
          Transaction Graph Explorer
        </div>
      </footer>
    </div>
  )
}
