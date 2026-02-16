// CSV export utility for all data views
export function exportToCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (v: any) => {
    if (v == null) return ''
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }) // BOM for Excel Korean support
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
