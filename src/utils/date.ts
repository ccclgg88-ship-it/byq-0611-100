export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function today(): string {
  return formatDate(new Date())
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

export function subtractDays(dateStr: string, days: number): string {
  return addDays(dateStr, -days)
}

export function getDateRange(startDate: string, endDate: string): string[] {
  const result: string[] = []
  let current = startDate
  while (current <= endDate) {
    result.push(current)
    current = addDays(current, 1)
  }
  return result
}

export function getRecentNDays(n: number, endDate: string = today()): string[] {
  const start = subtractDays(endDate, n - 1)
  return getDateRange(start, endDate)
}

export function getWeekDates(refDate: string = today()): string[] {
  return getRecentNDays(7, refDate)
}

export function diffDays(date1: string, date2: string): number {
  const d1 = parseDate(date1).getTime()
  const d2 = parseDate(date2).getTime()
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24))
}

export function sortDatesDesc(dates: string[]): string[] {
  return [...dates].sort((a, b) => b.localeCompare(a))
}
