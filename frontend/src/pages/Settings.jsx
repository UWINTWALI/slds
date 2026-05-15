import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRole } from '../hooks/useRole'
import { useApi } from '../hooks/useApi'
import { getDistricts, getSectorList } from '../api/client'

const MINISTRIES = [
  'MINALOC',
  'MINIFRA',
  'MINISANTE',
  'MINEDUC',
  'MINAGRI',
  'MINICOM',
  'MINEMA',
]

export default function Settings() {
  const { user, updateProfile } = useAuth()
  const { role } = useRole()
  const { data: districtsData, loading: loadingDistricts } = useApi(getDistricts)
  const districts = districtsData ?? []
  const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
  const [form, setForm] = useState({ name: '', title: '', district: '', sector: '', ministry: '', email: '' })
  const [sectorOptions, setSectorOptions] = useState([])
  const [saved, setSaved] = useState(false)
  const [sectorLoading, setSectorLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    setForm({
      name: user.name ?? '',
      title: user.title ?? '',
      district: user.district ?? '',
      sector: user.sector ?? '',
      ministry: user.ministry ?? '',
      email: user.email ?? '',
    })
  }, [user])

  useEffect(() => {
    let canceled = false
    if (!form.district) {
      setSectorOptions([])
      return
    }

    setSectorLoading(true)
    getSectorList(form.district)
      .then((data) => {
        if (canceled) return
        const options = Array.isArray(data)
          ? data.map(s => (typeof s === 'string' ? s : s.adm3_en || s)).filter(Boolean)
          : []
        setSectorOptions(options)
      })
      .catch(() => {
        if (canceled) return
        setSectorOptions([])
      })
      .finally(() => {
        if (!canceled) setSectorLoading(false)
      })

    return () => { canceled = true }
  }, [form.district])

  useEffect(() => {
    if (!form.district || sectorOptions.includes(form.sector)) return
    setForm(prev => ({ ...prev, sector: sectorOptions[0] ?? '' }))
  }, [form.district, sectorOptions])

  function handleChange(event) {
    const { name, value } = event.target
    setForm(prev => ({ ...prev, [name]: value }))
    setSaved(false)
  }

  function handleSubmit(event) {
    event.preventDefault()
    // Submit to API
    const payload = {
      full_name: form.name,
      title: form.title || undefined,
      district: form.district || undefined,
      sector: form.sector || undefined,
      ministry: form.ministry || undefined,
    }
    if (form.email && form.email !== user?.email) payload.email = form.email

    const token = user?.token
    fetch(`${API_BASE}/api/auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.detail || body.message || 'Save failed')
        // If API returned a user object, update session; otherwise show message
        if (body && body.id) {
          updateProfile({
            name: body.full_name,
            title: body.title,
            district: body.district,
            sector: body.sector,
            ministry: body.ministry,
            email: body.email,
          })
          setSaved(true)
        } else if (body && body.message) {
          // Persist local session even when email change is pending
          updateProfile({
            name: form.name,
            title: form.title || null,
            district: form.district || null,
            sector: form.sector || null,
            ministry: form.ministry || null,
            email: form.email,
          })
          setSaved(true)
        }
      })
      .catch((err) => {
        console.error(err)
        // show temporary error (could be improved)
        setSaved(false)
      })
  }

  // Determine which fields to show/edit based on role
  const isOfficer = ['district_officer', 'sector_officer'].includes(role)
  const isAdmin = ['national_admin', 'analyst'].includes(role)
  const showMinistry = role === 'national_admin'
  const showDistrict = role === 'district_officer'
  const showSector = role === 'sector_officer'
  const showTitle = isAdmin

  return (
    <div style={{ maxWidth: '600px' }}>
      <div className="card">
        <div className="card-title">Profile Settings</div>
        <p style={{ marginBottom: '18px', color: 'var(--gray-500)', fontSize: '13px' }}>
          {isOfficer 
            ? 'Update your name and email information for the current session.'
            : 'Update your profile information and save it for the current session.'}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your name"
            />
          </div>

          {showTitle && (
            <div className="form-group">
              <label htmlFor="title">Title / Role label</label>
              <input
                id="title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleChange}
                placeholder="Enter your title"
              />
            </div>
          )}

          {showMinistry && (
            <div className="form-group">
              <label htmlFor="ministry">Ministry</label>
              <select
                id="ministry"
                name="ministry"
                value={form.ministry}
                onChange={handleChange}
              >
                <option value="">Select ministry</option>
                {MINISTRIES.map((ministry) => (
                  <option key={ministry} value={ministry}>{ministry}</option>
                ))}
              </select>
            </div>
          )}

          {showDistrict && (
            <div className="form-group">
              <label htmlFor="district">District</label>
              <select
                id="district"
                name="district"
                value={form.district}
                onChange={handleChange}
                disabled={loadingDistricts}
              >
                <option value="">Select district</option>
                {districts.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>
          )}

          {showSector && (
            <div className="form-group">
              <label htmlFor="sector">Sector</label>
              <select
                id="sector"
                name="sector"
                value={form.sector}
                onChange={handleChange}
                disabled={!form.district || sectorLoading || sectorOptions.length === 0}
              >
                <option value="">Select sector</option>
                {sectorOptions.map((sector) => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              disabled={!isAdmin && !isOfficer}
            />
            {isOfficer && (
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>
                Email changes are submitted for Ministry Office approval; your account will be verified once approved.
              </div>
            )}
          </div>

          <button className="btn btn-primary" type="submit">Save changes</button>
          {saved && (
            <div style={{ marginTop: '12px', color: 'var(--success)', fontSize: '13px' }}>
              Profile saved.
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

