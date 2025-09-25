export const fmtMoney = (n: number | undefined | null) => {
  if (!n) return '0 ₫'
  try { return n.toLocaleString('vi-VN') + ' ₫' } catch { return `${n} ₫` }
}

export const fmtDate = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const toLocalInputValue = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`}