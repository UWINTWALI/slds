import { useState, useEffect, useCallback } from 'react'

export function useApi(fn, deps = []) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn()
      setData(result)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { run() }, [run])

  return { data, loading, error, refetch: run }
}

export function useApiLazy() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const execute = useCallback(async (fn) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn()
      setData(result)
      return result
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || 'Request failed'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, execute }
}
