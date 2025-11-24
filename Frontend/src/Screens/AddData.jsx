import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function AddData() {
  const [activeTab, setActiveTab] = useState('user')
  const navigate = useNavigate()

  // User form state
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [userError, setUserError] = useState(null)
  const [userSuccess, setUserSuccess] = useState(false)

  // Transaction form state
  const [users, setUsers] = useState([])
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [timestamp, setTimestamp] = useState('')
  const [description, setDescription] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [txError, setTxError] = useState(null)
  const [txSuccess, setTxSuccess] = useState(false)

  // Load users for transaction form
  useEffect(() => {
    axios.get('/api/users')
      .then(res => setUsers(res.data))
      .catch(err => {
        console.error('Failed to load users:', err)
        setTxError('Error loading users.')
      })

    setTimestamp(new Date().toISOString().slice(0, 16))
  }, [])

  // Reload users when a new user is created
  const reloadUsers = () => {
    axios.get('/api/users')
      .then(res => setUsers(res.data))
      .catch(err => console.error('Failed to reload users:', err))
  }

  const handleUserSubmit = async (e) => {
    e.preventDefault()
    setUserError(null)

    try {
      await axios.post('/api/users', { 
        name: userName, 
        email: userEmail, 
        phone: userPhone 
      })
      setUserSuccess(true)
      setUserName('')
      setUserEmail('')
      setUserPhone('')
      reloadUsers()

      setTimeout(() => {
        setUserSuccess(false)
      }, 3000)
    } catch (err) {
      console.error(err)
      setUserError(err.response?.data?.message || err.message || 'Failed to create user.')
    }
  }

  const handleTransactionSubmit = async (e) => {
    e.preventDefault()
    setTxError(null)

    try {
      await axios.post('/api/transactions', {
        fromUserId: Number(fromId),
        toUserId: Number(toId),
        amount: Number(amount),
        currency,
        timestamp,
        description,
        deviceId
      })

      setTxSuccess(true)
      setFromId('')
      setToId('')
      setAmount('')
      setCurrency('USD')
      setDescription('')
      setDeviceId('')
      setTimestamp(new Date().toISOString().slice(0, 16))

      setTimeout(() => {
        setTxSuccess(false)
      }, 3000)
    } catch (err) {
      console.error('Transaction creation error:', err)
      setTxError(err.response?.data?.message || 'Failed to create transaction.')
    }
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-emerald-400 mb-6 text-center">
          Add Data
        </h1>

        <div className="flex border-b border-slate-700 mb-6">
          <button
            onClick={() => setActiveTab('user')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'user'
                ? 'border-b-2 border-emerald-500 text-emerald-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Add User
          </button>
          <button
            onClick={() => setActiveTab('transaction')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'transaction'
                ? 'border-b-2 border-emerald-500 text-emerald-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Add Transaction
          </button>
        </div>

        {activeTab === 'user' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-semibold text-slate-100 mb-6">
              Create New User
            </h2>

            {userError && (
              <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-2 rounded mb-4">
                {userError}
              </div>
            )}
            {userSuccess && (
              <div className="bg-emerald-900/20 border border-emerald-800 text-emerald-400 px-4 py-2 rounded mb-4">
                User created successfully!
              </div>
            )}

            <form onSubmit={handleUserSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block mb-1 text-sm font-medium text-slate-300">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block mb-1 text-sm font-medium text-slate-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block mb-1 text-sm font-medium text-slate-300">
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={userPhone}
                  onChange={e => setUserPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 text-white font-medium py-2 rounded-lg hover:bg-emerald-600"
              >
                Create User
              </button>
            </form>
          </div>
        )}

        {activeTab === 'transaction' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-semibold text-slate-100 mb-6">
              Create New Transaction
            </h2>

            {txError && (
              <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-2 rounded mb-4">
                {txError}
              </div>
            )}
            {txSuccess && (
              <div className="bg-emerald-900/20 border border-emerald-800 text-emerald-400 px-4 py-2 rounded mb-4">
                Transaction created successfully!
              </div>
            )}

            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 mb-1">From User</label>
                <select
                  value={fromId}
                  onChange={e => setFromId(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Select a user</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} (#{u.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">To User</label>
                <select
                  value={toId}
                  onChange={e => setToId(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Select a user</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} (#{u.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Currency</label>
                <input
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Timestamp</label>
                <input
                  type="datetime-local"
                  value={timestamp}
                  onChange={e => setTimestamp(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Description</label>
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Device ID</label>
                <input
                  value={deviceId}
                  onChange={e => setDeviceId(e.target.value)}
                  placeholder="e.g., device-123"
                  className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded px-3 py-2"
              >
                Create Transaction
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

