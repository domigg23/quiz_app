export async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type':'application/json', ...options.headers }
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
  return data
}
