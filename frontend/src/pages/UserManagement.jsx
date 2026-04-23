import { useState, useCallback } from 'react'
import { useApi } from '../hooks/useApi'
import { getUsers, deactivateUser, activateUser, assignRole, revokeRole } from '../api/client'

const ALL_ROLES = ['national_admin', 'district_officer', 'sector_officer', 'analyst']

const ROLE_META = {
  national_admin:   { label: 'National Admin',   color: '#09090b', bg: '#f4f4f5', dot: '#09090b' },
  district_officer: { label: 'District Officer', color: '#1e40af', bg: '#eff6ff', dot: '#3b82f6' },
  sector_officer:   { label: 'Sector Officer',   color: '#166534', bg: '#f0fdf4', dot: '#00A550' },
  analyst:          { label: 'Policy Analyst',   color: '#6d28d9', bg: '#f5f3ff', dot: '#7c3aed' },
}

function RoleBadge({ role, onRevoke, busy }) {
  const m = ROLE_META[role] ?? { label: role, color: '#333', bg: '#f0f0f0', dot: '#888' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 4,
      background: m.bg, border: `1px solid ${m.dot}30`,
      fontSize: 11, fontWeight: 600, color: m.color,
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
            color: m.color, opacity: busy ? 0.3 : 0.6,
            padding: '0 0 0 2px', fontSize: 13, lineHeight: 1, fontWeight: 700,
          }}
        >×</button>
      )}
    </span>
  )
}

export default function UserManagement() {
  const [version, setVersion]       = useState(0)
  const refresh = useCallback(() => setVersion(v => v + 1), [])

  const { data: users, loading, error } = useApi(getUsers, [version])

  const [busy,         setBusy]         = useState('')   // '<userId>_<action>'
  const [flashSuccess, setFlashSuccess] = useState('')   // user id that just succeeded
  const [globalError,  setGlobalError]  = useState('')
  const [assigningFor, setAssigningFor] = useState(null) // user id whose assign panel is open
  const [newRole,      setNewRole]      = useState('district_officer')

  function startBusy(key)  { setBusy(key);  setGlobalError('') }
  function clearBusy()     { setBusy('') }

  function flash(userId) {
    setFlashSuccess(userId)
    setTimeout(() => setFlashSuccess(u => u === userId ? '' : u), 2000)
  }

  async function handleToggleActive(user) {
    const action = user.is_active ? 'deactivate' : 'activate'
    const label  = user.is_active ? 'Deactivate' : 'Activate'
    if (user.is_active && !window.confirm(
      `Deactivate ${user.full_name}? They will not be able to sign in until re-activated.`
    )) return

    startBusy(`${user.id}_status`)
    try {
      if (user.is_active) await deactivateUser(user.id)
      else                await activateUser(user.id)
      flash(user.id)
      refresh()
    } catch (e) {
      setGlobalError(e?.response?.data?.detail ?? `${label} failed.`)
    } finally {
      clearBusy()
    }
  }

  async function handleAssign(userId) {
    startBusy(`${userId}_assign`)
    try {
      await assignRole(userId, newRole)
      setAssigningFor(null)
      flash(userId)
      refresh()
    } catch (e) {
      setGlobalError(e?.response?.data?.detail ?? 'Role assignment failed.')
    } finally {
      clearBusy()
    }
  }

  async function handleRevoke(userId, role) {
    startBusy(`${userId}_${role}`)
    try {
      await revokeRole(userId, role)
      flash(userId)
      refresh()
    } catch (e) {
      setGlobalError(e?.response?.data?.detail ?? 'Role revoke failed.')
    } finally {
      clearBusy()
    }
  }

  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) return <div className="loading"><div className="spinner" />Loading users…</div>

  if (error) {
    const s = error?.response?.status
    const msg = s === 401
      ? 'No valid session token — sign out and sign back in with the backend running.'
      : s === 403
      ? 'Your account does not have the national_admin role. Run seed_users.py.'
      : 'Cannot reach the backend. Make sure uvicorn is running on port 8000.'
    return <div className="alert alert-danger">⚠ {msg}</div>
  }

  const active   = users?.filter(u =>  u.is_active) ?? []
  const inactive = users?.filter(u => !u.is_active) ?? []

  // ── Render ────────────────────────────────────────────────────────────────

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

      {globalError && (
        <div className="alert alert-danger" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>⚠ {globalError}</span>
          <button onClick={() => setGlobalError('')}
            style={{ background:'none', border:'none', cursor:'pointer', fontWeight:700, fontSize:16 }}>×</button>
        </div>
      )}

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
                const isBusy     = busy.startsWith(user.id)
                const didSucceed = flashSuccess === user.id
                const available  = ALL_ROLES.filter(r => !user.roles.includes(r))

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

                      {/* Assign-role panel */}
                      {assigningFor === user.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                          <select
                            value={newRole}
                            onChange={e => setNewRole(e.target.value)}
                            style={{ fontSize: 11, padding: '3px 6px', width: 'auto' }}
                          >
                            {available.map(r => (
                              <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>
                            ))}
                          </select>
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: 11, padding: '3px 10px' }}
                            disabled={busy === `${user.id}_assign`}
                            onClick={() => handleAssign(user.id)}
                          >
                            {busy === `${user.id}_assign` ? '…' : 'Save'}
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: 11, padding: '3px 8px' }}
                            onClick={() => setAssigningFor(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        available.length > 0 && user.is_active && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewRole(available[0])
                              setAssigningFor(user.id)
                            }}
                            style={{
                              background: 'none', border: 'none',
                              color: 'var(--rw-green)', fontSize: 11,
                              cursor: 'pointer', padding: 0, fontWeight: 600,
                            }}
                          >
                            + Add role
                          </button>
                        )
                      )}
                    </td>

                    {/* Status */}
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 4,
                        background: user.is_active ? '#f0fdf4' : '#fef2f2',
                        color:      user.is_active ? '#16a34a' : '#dc2626',
                        border:     user.is_active ? '1px solid #bbf7d0' : '1px solid #fecaca',
                      }}>
                        {user.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{
                          fontSize: 11, padding: '4px 12px',
                          color:       user.is_active ? '#dc2626' : '#16a34a',
                          borderColor: user.is_active ? '#fca5a5' : '#86efac',
                          opacity: isBusy ? 0.5 : 1,
                        }}
                        disabled={busy === `${user.id}_status`}
                        onClick={() => handleToggleActive(user)}
                      >
                        {busy === `${user.id}_status`
                          ? '…'
                          : user.is_active ? 'Deactivate' : 'Activate'
                        }
                      </button>
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
