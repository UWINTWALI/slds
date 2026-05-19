import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
} from '../api/client'

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  const refresh = useCallback(async () => {
    try {
      const [c, list] = await Promise.all([
        getUnreadNotificationCount(),
        getNotifications(false),
      ])
      setCount(c.count ?? 0)
      setItems((list ?? []).slice(0, 8))
    } catch {
      /* API may be offline */
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 45000)
    return () => clearInterval(id)
  }, [refresh])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    refresh().finally(() => setLoading(false))
  }, [open, refresh])

  useEffect(() => {
    if (!open) return
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [open])

  async function handleOpenNotification(n) {
    if (!n.is_read) {
      try {
        await markNotificationRead(n.id)
        setCount(c => Math.max(0, c - 1))
      } catch { /* ignore */ }
    }
    setOpen(false)
  }

  return (
    <div className="notification-bell-wrap" ref={ref}>
      <button
        type="button"
        className="header-theme-btn notification-bell-btn"
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications${count ? `, ${count} unread` : ''}`}
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && <span className="notification-badge">{count > 9 ? '9+' : count}</span>}
      </button>

      {open && (
        <div className="notification-dropdown" role="menu">
          <div className="notification-dropdown-head">
            <strong>Notifications</strong>
            <Link to="/reports" onClick={() => setOpen(false)}>All reports</Link>
          </div>
          {loading && <p className="notification-empty">Loading…</p>}
          {!loading && items.length === 0 && (
            <p className="notification-empty">No notifications yet.</p>
          )}
          {!loading && items.map(n => (
            <Link
              key={n.id}
              to={`/reports/${n.report_id}`}
              className={`notification-item-link${n.is_read ? '' : ' unread'}`}
              onClick={() => handleOpenNotification(n)}
            >
              <div className="notification-item-title">{n.title}</div>
              <p>{n.message}</p>
              <span className="notification-meta">
                {n.sender?.full_name} · {formatWhen(n.created_at)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
