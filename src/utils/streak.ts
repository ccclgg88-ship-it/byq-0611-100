import { addDays, diffDays, formatDate, sortDatesDesc } from './date'
import type { StreakInfo, DailyRecord } from '@/types'
import { MIN_SAVE_DIMENSIONS, DIMENSION_ORDER } from '@/constants'

export function isValidRecordDay(record: DailyRecord): boolean {
  let count = 0
  for (const k of DIMENSION_ORDER) {
    if (record[k]?.score && record[k].score > 0) count++
    if (count >= MIN_SAVE_DIMENSIONS) return true
  }
  return false
}

export function getValidDates(
  records: Record<string, DailyRecord>,
  archive: Record<string, DailyRecord> = {}
): string[] {
  const merged: Record<string, DailyRecord> = { ...archive, ...records }
  const validDates: string[] = []
  Object.values(merged).forEach(r => {
    if (isValidRecordDay(r)) validDates.push(r.date)
  })
  return validDates.sort((a, b) => a.localeCompare(b))
}

export function calcStreak(
  records: Record<string, DailyRecord>,
  archive: Record<string, DailyRecord> = {},
  endDate: string = formatDate(new Date())
): StreakInfo {
  const validDates = getValidDates(records, archive)
  if (validDates.length === 0) {
    return { current: 0, best: 0, lastDate: null }
  }

  let currentStreak = 0
  let bestStreak = 0
  let tempStreak = 0
  let lastDate: string | null = null

  let checkDate = endDate
  for (let i = 0; i < 365 * 2; i++) {
    if (validDates.includes(checkDate)) {
      currentStreak++
      if (currentStreak > bestStreak) bestStreak = currentStreak
      if (lastDate === null) lastDate = checkDate
    } else if (currentStreak > 0 && i === 0) {
      // 今天没打卡，从昨天倒着算
      break
    } else if (currentStreak === 0) {
      // 还没找到开始的日期，继续往前
    } else {
      break
    }
    checkDate = addDays(checkDate, -1)
  }

  tempStreak = 0
  for (let i = 0; i < validDates.length; i++) {
    if (i === 0) {
      tempStreak = 1
    } else {
      const diff = diffDays(validDates[i - 1], validDates[i])
      if (diff === 1) {
        tempStreak++
      } else {
        if (tempStreak > bestStreak) bestStreak = tempStreak
        tempStreak = 1
      }
    }
  }
  if (tempStreak > bestStreak) bestStreak = tempStreak

  if (currentStreak > bestStreak) bestStreak = currentStreak

  return { current: currentStreak, best: bestStreak, lastDate }
}

export function getStreakForPeriod(
  validDates: string[],
  startDate: string,
  endDate: string
): { currentEnd: number; bestInPeriod: number } {
  const inRange = validDates.filter(d => d >= startDate && d <= endDate).sort()
  if (inRange.length === 0) return { currentEnd: 0, bestInPeriod: 0 }

  let currentEnd = 0
  let check = endDate
  while (inRange.includes(check)) {
    currentEnd++
    check = addDays(check, -1)
  }

  let best = 0
  let temp = 0
  for (let i = 0; i < inRange.length; i++) {
    if (i === 0) {
      temp = 1
    } else {
      const diff = diffDays(inRange[i - 1], inRange[i])
      if (diff === 1) {
        temp++
      } else {
        if (temp > best) best = temp
        temp = 1
      }
    }
  }
  if (temp > best) best = temp

  return { currentEnd, bestInPeriod: best }
}
