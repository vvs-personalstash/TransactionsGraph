import { useEffect, useState, useMemo, useRef, memo, useCallback } from 'react'
import axios from 'axios'

const TXNS_PER_PAGE = 5
const DEBOUNCE_DELAY = 300 // ms

const FILTER_FIELDS = [
  { label: 'Amount ≥',    type: 'number', key: 'minAmt',     attrs: { step: '0.01' } },
  { label: 'Amount ≤',    type: 'number', key: 'maxAmt',     attrs: { step: '0.01' } },
  { label: 'Currency',    type: 'select', key: 'currency' },
  { label: 'From Date',   type: 'date',   key: 'startDate' },
  { label: 'To Date',     type: 'date',   key: 'endDate' },
  { label: 'Device ID',   type: 'text',   key: 'deviceQuery' },
  { label: 'Description', type: 'text',   key: 'descQuery' },
]

const TransactionsList = memo(function TransactionsList() {
  const [txnPage, setTxnPage] = useState(1)
  const [txnTotal, setTxnTotal] = useState(0)
  const [txnPageCount, setTxnPageCount] = useState(0)
  const [dataVersion, setDataVersion] = useState(0)

  const [minAmt, setMinAmt] = useState('')
  const [maxAmt, setMaxAmt] = useState('')
  const [currency, setCurrency] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [descQuery, setDescQuery] = useState('')
  const [deviceQuery, setDeviceQuery] = useState('')

  // Debounced versions of filters
  const [debouncedMinAmt, setDebouncedMinAmt] = useState('')
  const [debouncedMaxAmt, setDebouncedMaxAmt] = useState('')
  const [debouncedCurrency, setDebouncedCurrency] = useState('')
  const [debouncedStartDate, setDebouncedStartDate] = useState('')
  const [debouncedEndDate, setDebouncedEndDate] = useState('')
  const [debouncedDescQuery, setDebouncedDescQuery] = useState('')
  const [debouncedDeviceQuery, setDebouncedDeviceQuery] = useState('')

  const [currencies, setCurrencies] = useState([])

  const txnCache = useRef({})
  const debounceTimer = useRef(null)

  // Debounce all filters
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(() => {
      setDebouncedMinAmt(minAmt)
      setDebouncedMaxAmt(maxAmt)
      setDebouncedCurrency(currency)
      setDebouncedStartDate(startDate)
      setDebouncedEndDate(endDate)
      setDebouncedDescQuery(descQuery)
      setDebouncedDeviceQuery(deviceQuery)
    }, DEBOUNCE_DELAY)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [minAmt, maxAmt, currency, startDate, endDate, descQuery, deviceQuery])

  const txnCacheKey = useMemo(() => {
    return `${txnPage}_${debouncedMinAmt}_${debouncedMaxAmt}_${debouncedCurrency}_${debouncedStartDate}_${debouncedEndDate}_${debouncedDescQuery}_${debouncedDeviceQuery}`
  }, [txnPage, debouncedMinAmt, debouncedMaxAmt, debouncedCurrency, debouncedStartDate, debouncedEndDate, debouncedDescQuery, debouncedDeviceQuery])

  // Fetch currencies on mount
  useEffect(() => {
    axios.get('/api/transactions/currencies')
      .then(res => setCurrencies(res.data))
      .catch(err => console.error('Failed to fetch currencies:', err))
  }, [])

  // Fetch transactions with pagination and filters
  useEffect(() => {
    if (txnCache.current[txnCacheKey]) {
      const cached = txnCache.current[txnCacheKey]
      setTxnTotal(cached.total)
      setTxnPageCount(cached.totalPages)
      setDataVersion(v => v + 1) // Force re-render to show cached data
      return
    }

    const params = {
      page: txnPage,
      pageSize: TXNS_PER_PAGE
    }

    if (debouncedMinAmt) params.minAmount = parseFloat(debouncedMinAmt)
    if (debouncedMaxAmt) params.maxAmount = parseFloat(debouncedMaxAmt)
    if (debouncedCurrency) params.currency = debouncedCurrency
    if (debouncedStartDate) params.startDate = new Date(debouncedStartDate).toISOString()
    if (debouncedEndDate) params.endDate = new Date(debouncedEndDate).toISOString()
    if (debouncedDescQuery) params.description = debouncedDescQuery
    if (debouncedDeviceQuery) params.deviceId = debouncedDeviceQuery

    axios.get('/api/transactions', { params })
      .then(res => {
        txnCache.current[txnCacheKey] = {
          data: res.data.data,
          total: res.data.total,
          totalPages: res.data.totalPages
        }
        setTxnTotal(res.data.total)
        setTxnPageCount(res.data.totalPages)
        setDataVersion(v => v + 1) // Force re-render to show new data
      })
      .catch(err => console.error('Failed to fetch transactions:', err))
  }, [txnPage, debouncedMinAmt, debouncedMaxAmt, debouncedCurrency, debouncedStartDate, debouncedEndDate, debouncedDescQuery, debouncedDeviceQuery, txnCacheKey])

  // Clear cache when debounced filters change
  useEffect(() => {
    txnCache.current = {}
    setTxnPage(1)
  }, [debouncedMinAmt, debouncedMaxAmt, debouncedCurrency, debouncedStartDate, debouncedEndDate, debouncedDescQuery, debouncedDeviceQuery])

  const txns = useMemo(() => {
    return txnCache.current[txnCacheKey]?.data || []
  }, [txnCacheKey, dataVersion])

  const handleFilterChange = useCallback((key, value) => {
    const setters = {
      minAmt: setMinAmt,
      maxAmt: setMaxAmt,
      currency: setCurrency,
      startDate: setStartDate,
      endDate: setEndDate,
      deviceQuery: setDeviceQuery,
      descQuery: setDescQuery,
    }
    setters[key](value)
    setTxnPage(1)
  }, [])

  const handlePrevPage = useCallback(() => {
    setTxnPage(p => Math.max(p - 1, 1))
  }, [])

  const handleNextPage = useCallback(() => {
    setTxnPage(p => Math.min(p + 1, txnPageCount))
  }, [txnPageCount])

  const handlePageClick = useCallback((pageNum) => {
    setTxnPage(pageNum)
  }, [])

  const pageButtons = useMemo(() => {
    return Array.from({ length: txnPageCount }, (_, i) => i + 1)
  }, [txnPageCount])

  const filterValues = useMemo(() => ({
    minAmt,
    maxAmt,
    currency,
    startDate,
    endDate,
    deviceQuery,
    descQuery,
  }), [minAmt, maxAmt, currency, startDate, endDate, deviceQuery, descQuery])

  // Show skeleton when we don't have data for current page
  const showSkeleton = txns.length === 0

  return (
    <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-emerald-400 mb-4">
        Transactions {txnTotal > 0 && <span className="text-sm text-slate-400">({txnTotal} total)</span>}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {FILTER_FIELDS.map(({ label, type, key, attrs }) => (
          <div key={label}>
            <label className="block mb-1 text-sm font-medium text-slate-300">
              {label}
            </label>
            {type === 'select' ? (
              <select
                value={filterValues[key]}
                onChange={e => handleFilterChange(key, e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">All</option>
                {currencies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : (
              <input
                type={type}
                value={filterValues[key]}
                onChange={e => handleFilterChange(key, e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                {...attrs}
              />
            )}
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '25%' }} />
          </colgroup>
          <thead className="bg-slate-900">
            <tr>
              {['ID','From','To','Amount','Currency','Timestamp','Device ID','Description']
                .map(h => (
                  <th key={h} className="px-4 py-2 text-left text-sm font-medium text-slate-300">
                    {h}
                  </th>
                ))
              }
            </tr>
          </thead>
          <tbody>
            {showSkeleton ? (
              // Show skeleton rows to maintain height (no animation)
              Array.from({ length: TXNS_PER_PAGE }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-t border-slate-700" style={{ height: '40px' }}>
                  <td className="px-4 py-2"><div className="h-5 bg-slate-700 rounded w-12"></div></td>
                  <td className="px-4 py-2"><div className="h-5 bg-slate-700 rounded w-12"></div></td>
                  <td className="px-4 py-2"><div className="h-5 bg-slate-700 rounded w-12"></div></td>
                  <td className="px-4 py-2"><div className="h-5 bg-slate-700 rounded w-16"></div></td>
                  <td className="px-4 py-2"><div className="h-5 bg-slate-700 rounded w-12"></div></td>
                  <td className="px-4 py-2"><div className="h-5 bg-slate-700 rounded w-32"></div></td>
                  <td className="px-4 py-2"><div className="h-5 bg-slate-700 rounded w-24"></div></td>
                  <td className="px-4 py-2"><div className="h-5 bg-slate-700 rounded w-36"></div></td>
                </tr>
              ))
            ) : (
              txns.map(t => (
                <tr key={t.id} className="border-t border-slate-700 hover:bg-slate-700/50" style={{ height: '40px' }}>
                  <td className="px-4 py-2 text-sm text-slate-200 truncate">{t.id}</td>
                  <td className="px-4 py-2 text-sm text-slate-200 truncate">{t.fromUserId}</td>
                  <td className="px-4 py-2 text-sm text-slate-200 truncate">{t.toUserId}</td>
                  <td className="px-4 py-2 text-sm text-slate-200 truncate">{t.amount}</td>
                  <td className="px-4 py-2 text-sm text-slate-200 truncate">{t.currency}</td>
                  <td className="px-4 py-2 text-sm text-slate-200 truncate" title={new Date(t.timestamp).toLocaleString()}>
                    {new Date(t.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-200 truncate" title={t.deviceId || '—'}>{t.deviceId || '—'}</td>
                  <td className="px-4 py-2 text-sm text-slate-200 truncate" title={t.description}>{t.description}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center items-center mt-4 space-x-2" style={{ minHeight: '36px' }}>
        {txnPageCount > 1 && (
          <>
            <button
              onClick={handlePrevPage}
              disabled={txnPage === 1}
              className="px-3 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            {pageButtons.map(pageNum => (
              <button
                key={pageNum}
                onClick={() => handlePageClick(pageNum)}
                className={pageNum === txnPage
                  ? 'px-3 py-1 rounded bg-emerald-500 text-white'
                  : 'px-3 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600'
                }
              >
                {pageNum}
              </button>
            ))}
            <button
              onClick={handleNextPage}
              disabled={txnPage === txnPageCount}
              className="px-3 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </>
        )}
      </div>
    </section>
  )
})

export default TransactionsList
