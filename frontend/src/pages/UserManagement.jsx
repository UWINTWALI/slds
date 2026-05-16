import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { getUsers, deactivateUser, deleteUser, activateUser, assignRole, revokeRole, getEmailChangeRequests, approveEmailChangeRequest, denyEmailChangeRequest } from '../api/client'

const ALL_ROLES = ['national_admin', 'district_officer', 'sector_officer', 'analyst']

const ROLE_META = {
  national_admin:   { label: 'Ministry Office',   color: '#09090b', bg: '#f4f4f5', dot: '#09090b' },
  district_officer: { label: 'District Officer', color: '#1e40af', bg: '#eff6ff', dot: '#3b82f6' },
  sector_officer:   { label: 'Sector Officer',   color: '#166534', bg: '#f0fdf4', dot: '#00A550' },
  analyst:          { label: 'Policy Analyst',   color: '#6d28d9', bg: '#f5f3ff', dot: '#7c3aed' },
}

function RoleBadge({ role, onRevoke, busy }) {
  const m = ROLE_META[role] ?? { label: role, dot: '#888' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999,
      background: '#f8fafc', border: '1px solid #d1d5db',
      fontSize: 11, fontWeight: 600, color: '#111',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
      {m.label}
      {onRevoke && (
        <button
          onClick={onRevoke}
          disabled={busy}
          title={`Revoke ${m.label}`}
          style={{
            background: 'none', border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
            color: '#555', opacity: busy ? 0.3 : 0.8,
            padding: '0 0 0 4px', fontSize: 12, lineHeight: 1, fontWeight: 700,
          }}
        >×</button>
      )}
    </span>
  )
}

export default function UserManagement() {
  const { user: currentUser } = useAuth()
  
  // Version state for refreshing data
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion(v => v + 1), [])

  // Search and role filter
  const [searchTerm, setSearchTerm] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchTerm), 250)
    return () => clearTimeout(timeout)
  }, [searchTerm])

  // This will automatically refetch when version, debounced search or roleFilter changes
  const { data: users, loading, error } = useApi(
    () => getUsers({ search: search || undefined, role: roleFilter || undefined }),
    [version, search, roleFilter]
  )
  const { data: requests, loading: loadingRequests, error: requestError, refetch: refreshRequests } = useApi(getEmailChangeRequests, [version])

  const [busy, setBusy] = useState('')   // '<userId>_<action>'
  const [flashSuccess, setFlashSuccess] = useState('')   // user id that just succeeded
  const [globalError, setGlobalError] = useState('')

  function startBusy(key) { 
    setBusy(key);  
    setGlobalError('') 
  }
  
  function clearBusy() { 
    setBusy('') 
  }

  function flash(userId) {
    setFlashSuccess(userId)
    setTimeout(() => setFlashSuccess(u => u === userId ? '' : u), 2000)
  }

  // Handle activate/deactivate user
  async function handleToggleActive(user) {
    const label = user.is_active ? 'Deactivate' : 'Activate'
    
    if (user.is_active && !window.confirm(
      `Deactivate ${user.full_name}? They will not be able to sign in until re-activated.`
    )) return

    startBusy(`${user.id}_status`)
    try {
      if (user.is_active) {
        await deactivateUser(user.id)
      } else {
        await activateUser(user.id)
      }
      flash(user.id)
      refresh() // refresh data without full page reload
    } catch (e) {
      setGlobalError(e?.response?.data?.detail ?? `${label} failed.`)
    } finally {
      clearBusy()
    }
  }

  // Handle delete user
  async function handleDelete(user) {
    if (!window.confirm(
      `Delete ${user.full_name}? This will delete the account permanently.`
    )) return

    startBusy(`${user.id}_delete`)
    try {
      await deleteUser(user.id)
      flash(user.id)
      refresh() // refresh data without full page reload
    } catch (e) {
      setGlobalError(e?.response?.data?.detail ?? 'Delete failed.')
    } finally {
      clearBusy()
    }
  }

  // Handle assign role
  async function handleAssign(userId, role) {
    startBusy(`${userId}_assign`)
    try {
      await assignRole(userId, role)
      flash(userId)
      refresh() // refresh data without full page reload
    } catch (e) {
      setGlobalError(e?.response?.data?.detail ?? 'Role assignment failed.')
    } finally {
      clearBusy()
    }
  }

  // Handle revoke role
  async function handleRevoke(userId, role) {
    startBusy(`${userId}_${role}`)
    try {
      await revokeRole(userId, role)
      flash(userId)
      refresh() // refresh data without full page reload
    } catch (e) {
      setGlobalError(e?.response?.data?.detail ?? 'Role revoke failed.')
    } finally {
      clearBusy()
    }
  }

  async function handleApproveRequest(requestId) {
    startBusy(`req_${requestId}`)
    try {
      await approveEmailChangeRequest(requestId)
      setGlobalError('')
      refresh()
      refreshRequests()
    } catch (e) {
      setGlobalError(e?.response?.data?.detail ?? 'Approve failed.')
    } finally {
      clearBusy()
    }
  }

  async function handleDenyRequest(requestId) {
    startBusy(`req_${requestId}`)
    try {
      await denyEmailChangeRequest(requestId)
      setGlobalError('')
      refresh()
      refreshRequests()
    } catch (e) {
      setGlobalError(e?.response?.data?.detail ?? 'Deny failed.')
    } finally {
      clearBusy()
    }
  }

  // Main action handler for the actions dropdown
  async function handleUserAction(user, action) {
    if (!action || action === '') return

    if (action === 'activate' || action === 'deactivate') {
      return handleToggleActive(user)
    }

    if (action === 'delete') {
      return handleDelete(user)
    }
  }

  // If we haven't loaded any users yet, show a page-level loading state.
  if (!users && loading) {
    return <div className="loading"><div className="spinner" />Loading users…</div>
  }

  // Show a top-level error if we cannot load users at all.
  if (!users && error) {
    const s = error?.response?.status
    const msg = s === 401
      ? 'No valid session token — sign out and sign back in with the backend running.'
      : s === 403
      ? 'Your account does not have the national_admin role. Run seed_users.py.'
      : 'Cannot reach the backend. Make sure uvicorn is running on port 8000.'
    return <div className="alert alert-danger">Error: {msg}</div>
  }

  const active = users?.filter(u => u.is_active) ?? []
  const inactive = users?.filter(u => !u.is_active) ?? []

  const pendingRequests = requests?.filter(r => r.status === 'pending') ?? []

  return (
    <div className="gap-16">

      {/* Summary metrics */}
      <div className="metric-row">
        <div className="metric-card">
          <div className="metric-label">Total Users</div>
          <div className="metric-value">{users?.length ?? 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active</div>
          <div className="metric-value" style={{ color: '#16a34a' }}>{active.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Deactivated</div>
          <div className="metric-value" style={{ color: '#dc2626' }}>{inactive.length}</div>
        </div>
        {ALL_ROLES.map(r => (
          <div className="metric-card" key={r}>
            <div className="metric-label" style={{ fontSize: 10 }}>{ROLE_META[r].label}</div>
            <div className="metric-value">
              {users?.filter(u => u.roles.includes(r)).length ?? 0}
            </div>
          </div>
        ))}
      </div>

      {/* Global error display */}
      {globalError && (
        <div className="alert alert-danger" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>Error: {globalError}</span>
          <button 
            onClick={() => setGlobalError('')}
            style={{ background:'none', border:'none', cursor:'pointer', fontWeight:700, fontSize:16 }}
          >×</button>
        </div>
      )}

      {(pendingRequests.length > 0 || requestError) && (
        <div className="card" style={{ borderColor: '#fde68a' }}>
          <div className="card-title">Pending Email Change Requests</div>
          {requestError ? (
            <div className="alert alert-danger">Failed to load requests: {requestError}</div>
          ) : loadingRequests ? (
            <div className="loading"><div className="spinner" />Loading requests…</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Current email</th>
                    <th>Requested email</th>
                    <th>Requested at</th>
                    <th style={{ width: 150 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map(req => {
                    const isBusy = busy === `req_${req.id}`
                    return (
                      <tr key={req.id} style={{ opacity: isBusy ? 0.6 : 1 }}>
                        <td style={{ fontSize: 12, color: '#374151' }}>
                          {req.user_full_name || req.user_id}
                        </td>
                        <td style={{ fontSize: 12, color: '#6b7280' }}>
                          {req.current_email || '—'}
                        </td>
                        <td style={{ fontSize: 12, color: '#111' }}>{req.new_email}</td>
                        <td style={{ fontSize: 12, color: '#6b7280' }}>{new Date(req.requested_at).toLocaleString()}</td>
                        <td style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleApproveRequest(req.id)}
                            className="btn btn-sm btn-success"
                          >Approve</button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDenyRequest(req.id)}
                            className="btn btn-sm btn-secondary"
                          >Deny</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {pendingRequests.length === 0 && (
                <div style={{ padding: '14px 16px', color: 'var(--gray-500)' }}>
                  No pending email change requests at this time.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search & Role filter */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Search name or email"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', width: 300 }}
        />

        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db' }}
        >
          <option value="">All roles</option>
          {ALL_ROLES.map(r => (
            <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>
          ))}
        </select>

        <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setSearchTerm(''); setSearch(''); setRoleFilter('') }}>
          Clear
        </button>
      </div>

      {/* Users table */}
      <div className="card">
        <div className="card-title">Registered Users</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Assignment</th>
                <th>Roles</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users?.map(user => {
                const isBusy = busy.startsWith(user.id)
                const didSucceed = flashSuccess === user.id
                const available = ALL_ROLES.filter(r => !user.roles.includes(r))

                return (
                  <tr key={user.id} style={{
                    opacity: user.is_active ? 1 : 0.55,
                    background: didSucceed ? '#f0fdf4' : undefined,
                    transition: 'background 0.4s',
                  }}>
                    {/* Name */}
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{user.full_name}</div>
                      {user.title && (
                        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{user.title}</div>
                      )}
                    </td>

                    {/* Email */}
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{user.email}</td>

                    {/* District / Sector */}
                    <td style={{ fontSize: 12 }}>
                      {user.district
                        ? <>{user.district}{user.sector && <span style={{ color: 'var(--gray-400)' }}> / {user.sector}</span>}</>
                        : <span style={{ color: 'var(--gray-300)' }}>—</span>
                      }
                    </td>

                    {/* Roles */}
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                        {user.roles.length > 0
                          ? user.roles.map(r => (
                              <RoleBadge
                                key={r}
                                role={r}
                                busy={busy === `${user.id}_${r}`}
                                onRevoke={() => handleRevoke(user.id, r)}
                              />
                            ))
                          : <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>No role assigned</span>
                        }
                      </div>

                      {/* Add-role dropdown - only for active users */}
                      {available.length > 0 && user.is_active && (
                        <select
                          defaultValue=""
                          onChange={e => {
                            const role = e.target.value
                            e.target.value = ''
                            if (role) handleAssign(user.id, role)
                          }}
                          disabled={busy === `${user.id}_assign`}
                          style={{
                            fontSize: 11, padding: '4px 8px', marginTop: 4,
                            borderRadius: 6, border: '1px solid #d1d5db',
                            background: '#fff', color: '#111',
                            cursor: busy === `${user.id}_assign` ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <option value="">+ Add role</option>
                          {available.map(r => (
                            <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>
                          ))}
                        </select>
                      )}
                    </td>

                    {/* Status */}
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999,
                        background: '#f8fafc', color: '#111', border: '1px solid #d1d5db',
                      }}>
                        {user.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    {/* Actions dropdown */}
                    <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <select
                        defaultValue=""
                        onChange={e => {
                          const action = e.target.value
                          e.target.value = ''
                          handleUserAction(user, action)
                        }}
                        disabled={busy.startsWith(user.id)}
                        style={{
                          width: '100%', fontSize: 12, padding: '8px 10px',
                          borderRadius: 8, border: '1px solid #d1d5db',
                          background: '#fff', color: '#111',
                          cursor: busy.startsWith(user.id) ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <option value="" disabled>Actions</option>
                        {user.is_active
                          ? <option value="deactivate">Deactivate</option>
                          : <option value="activate">Activate</option>
                        }
                        <option value="delete" disabled={currentUser?.id === user.id}>Delete</option>
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}