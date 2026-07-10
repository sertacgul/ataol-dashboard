const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Bir hata oluştu')
  return data
}

api.get = (path) => api(path)
api.post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) })
api.put = (path, body) => api(path, { method: 'PUT', body: JSON.stringify(body) })
api.del = (path) => api(path, { method: 'DELETE' })
