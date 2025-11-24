import { Link } from 'react-router-dom'

const FEATURES = [
  { title: 'Add Data',               to: '/add-data',            color: 'from-emerald-500 to-emerald-600' },
  { title: 'View Lists',             to: '/lists',               color: 'from-cyan-500 to-cyan-600' },
  { title: 'Graph View',             to: '/graph',               color: 'from-violet-500 to-violet-600' },
  { title: 'Shortest Path',          to: '/analytics',           color: 'from-blue-500 to-blue-600' },
  { title: 'Transaction Clusters',   to: '/transaction-clusters',color: 'from-rose-500 to-rose-600' },
  { title: 'Export JSON/CSV',        to: '/export',              color: 'from-amber-500 to-amber-600' },
]

export default function Home() {
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

      <section className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-12">
        {FEATURES.map(({ title, to, color }) => (
          <Link to={to} key={title}>
            <div className="h-full flex flex-col justify-between p-6 bg-slate-800 border border-slate-700 rounded-lg hover:border-emerald-500">
              <div>
                <h3 className="text-xl font-semibold text-slate-100 mb-2">
                  {title}
                </h3>
                <p className="text-slate-400 text-sm">
                  {descriptionFor(title)}
                </p>
              </div>
              <span
                className={`bg-gradient-to-r ${color} inline-block mt-4 px-4 py-2 text-white font-medium rounded-lg text-sm`}
              >
                Go
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  )
}

function descriptionFor(title) {
  switch (title) {
    case 'Add a User':
      return 'Quickly register a new user into the graph.'
    case 'Add a Transaction':
      return 'Record money movement between users.'
    case 'View Lists':
      return 'Browse all users and transactions in a searchable table.'
    case 'Graph View':
      return 'See relationships laid out in an interactive network.'
    case 'Shortest Path':
      return 'Find connection chains between any two users.'
    case 'Transaction Clusters':
      return 'Group transactions by shared users into clusters.'
    case 'Export JSON/CSV':
      return 'Download the full graph for offline analysis.'
    default:
      return ''
  }
}
