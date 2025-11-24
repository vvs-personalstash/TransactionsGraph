import { useEffect, useState, useMemo, useRef, memo, useCallback } from 'react'
import axios from 'axios'

const USERS_PER_PAGE = 5

const UsersList = memo(function UsersList() {
  const [userQuery, setUserQuery] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [userTotal, setUserTotal] = useState(0)
  const [userPageCount, setUserPageCount] = useState(0)
  const [dataVersion, setDataVersion] = useState(0)

  const userCache = useRef({})

  const userCacheKey = useMemo(() => {
    return `${userPage}_${userQuery}`
  }, [userPage, userQuery])

  // Fetch users with pagination and search
  useEffect(() => {
    if (userCache.current[userCacheKey]) {
      const cached = userCache.current[userCacheKey]
      setUserTotal(cached.total)
      setUserPageCount(cached.totalPages)
      setDataVersion(v => v + 1) // Force re-render to show cached data
      return
    }

    const params = {
      page: userPage,
      pageSize: USERS_PER_PAGE,
      search: userQuery
    }

    axios.get('/api/users', { params })
      .then(res => {
        userCache.current[userCacheKey] = {
          data: res.data.data,
          total: res.data.total,
          totalPages: res.data.totalPages
        }
        setUserTotal(res.data.total)
        setUserPageCount(res.data.totalPages)
        setDataVersion(v => v + 1) // Force re-render to show new data
      })
      .catch(err => console.error('Failed to fetch users:', err))
  }, [userPage, userQuery, userCacheKey])

  // Clear cache when search changes
  useEffect(() => {
    userCache.current = {}
    setUserPage(1)
  }, [userQuery])

  const users = useMemo(() => {
    return userCache.current[userCacheKey]?.data || []
  }, [userCacheKey, dataVersion])

  const handleSearchChange = useCallback((e) => {
    setUserQuery(e.target.value)
    setUserPage(1)
  }, [])

  const handlePrevPage = useCallback(() => {
    setUserPage(p => Math.max(p - 1, 1))
  }, [])

  const handleNextPage = useCallback(() => {
    setUserPage(p => Math.min(p + 1, userPageCount))
  }, [userPageCount])

  const handlePageClick = useCallback((pageNum) => {
    setUserPage(pageNum)
  }, [])

  const pageButtons = useMemo(() => {
    return Array.from({ length: userPageCount }, (_, i) => i + 1)
  }, [userPageCount])

  // Show skeleton when we don't have data for current page
  const showSkeleton = users.length === 0

  return (
    <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-emerald-400 mb-4">
        Users {userTotal > 0 && <span className="text-sm text-slate-400">({userTotal} total)</span>}
      </h2>
      <input
        type="text"
        placeholder="Search users by name, email or phone..."
        value={userQuery}
        onChange={handleSearchChange}
        className="w-full mb-4 bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      />
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '25%' }} />
            <col style={{ width: '35%' }} />
            <col style={{ width: '30%' }} />
          </colgroup>
          <thead className="bg-slate-900">
            <tr>
              {['ID','Name','Email','Phone'].map(h => (
                <th key={h} className="px-4 py-2 text-left text-sm font-medium text-slate-300">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {showSkeleton ? (
              // Show skeleton rows to maintain height (no animation)
              Array.from({ length: USERS_PER_PAGE }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-t border-slate-700" style={{ height: '40px' }}>
                  <td className="px-4 py-2"><div className="h-5 bg-slate-700 rounded w-12"></div></td>
                  <td className="px-4 py-2"><div className="h-5 bg-slate-700 rounded w-32"></div></td>
                  <td className="px-4 py-2"><div className="h-5 bg-slate-700 rounded w-40"></div></td>
                  <td className="px-4 py-2"><div className="h-5 bg-slate-700 rounded w-28"></div></td>
                </tr>
              ))
            ) : (
              users.map(u => (
                <tr key={u.id} className="border-t border-slate-700 hover:bg-slate-700/50" style={{ height: '40px' }}>
                  <td className="px-4 py-2 text-sm text-slate-200 truncate">{u.id}</td>
                  <td className="px-4 py-2 text-sm text-slate-200 truncate">{u.name}</td>
                  <td className="px-4 py-2 text-sm text-slate-200 truncate" title={u.email}>{u.email}</td>
                  <td className="px-4 py-2 text-sm text-slate-200 truncate" title={u.phone}>{u.phone}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center items-center mt-4 space-x-2" style={{ minHeight: '36px' }}>
        {userPageCount > 1 && (
          <>
            <button
              onClick={handlePrevPage}
              disabled={userPage === 1}
              className="px-3 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            {pageButtons.map(pageNum => (
              <button
                key={pageNum}
                onClick={() => handlePageClick(pageNum)}
                className={pageNum === userPage
                  ? 'px-3 py-1 rounded bg-emerald-500 text-white'
                  : 'px-3 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600'
                }
              >
                {pageNum}
              </button>
            ))}
            <button
              onClick={handleNextPage}
              disabled={userPage === userPageCount}
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

export default UsersList

