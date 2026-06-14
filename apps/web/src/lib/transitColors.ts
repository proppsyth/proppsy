/**
 * Returns Tailwind color classes for a BTS/MRT/ARL/SRT/BRT station chip.
 * Keyed by official line color.
 */

// Stations that belong to non-default lines (purple/pink/yellow/gold)
// — needed because station names don't always contain the line color word.

const PURPLE_STATIONS = new Set([
  'MRT คลองบางไผ่','MRT ตลาดบางใหญ่','MRT สามแยกบางใหญ่',
  'MRT บางพูด','MRT บางรักน้อย-ท่าอิฐ','MRT ไทรม้า',
  'MRT สะพานพระนั่งเกล้า','MRT แยกนนทบุรี 1','MRT บางกระสอ',
  'MRT ศูนย์ราชการนนทบุรี','MRT กระทรวงสาธารณสุข',
  'MRT แยกติวานนท์','MRT วงศ์สว่าง','MRT บางซ่อน',
])

const PINK_STATIONS = new Set([
  'MRT แคราย','MRT สนามบินน้ำ','MRT สามแยกปากเกร็ด',
  'MRT ปากเกร็ด','MRT เมืองทองธานี','MRT มีนบุรี',
])

const YELLOW_STATIONS = new Set([
  'MRT ลาดพร้าว 71','MRT ลาดพร้าว 83','MRT มหาดไทย',
  'MRT ลาดพร้าว 101','MRT บางกะปิ','MRT แยกลำสาลี',
  'MRT ศรีนุช','MRT ศรีกรีฑา','MRT หัวหมาก','MRT ทับช้าง',
])

const GOLD_STATIONS = new Set([
  'BTS เจริญนคร','BTS คลองสาน',
])

/** Returns `bg-* text-* border-*` Tailwind classes for the station's line color */
export function stationColorClass(station: string): string {
  if (GOLD_STATIONS.has(station))
    return 'bg-yellow-100 text-yellow-800 border-yellow-300'
  if (station.startsWith('BTS') || station.startsWith('bts'))
    return 'bg-green-100 text-green-800 border-green-300'
  if (PURPLE_STATIONS.has(station))
    return 'bg-purple-100 text-purple-800 border-purple-300'
  if (PINK_STATIONS.has(station))
    return 'bg-pink-100 text-pink-800 border-pink-300'
  if (YELLOW_STATIONS.has(station))
    return 'bg-yellow-100 text-yellow-800 border-yellow-300'
  if (station.startsWith('MRT') || station.startsWith('mrt'))
    return 'bg-blue-100 text-blue-800 border-blue-300'
  if (station.startsWith('ARL') || station.startsWith('arl') || station.toLowerCase().includes('airport'))
    return 'bg-red-100 text-red-700 border-red-300'
  if (station.startsWith('SRT') || station.startsWith('srt'))
    return 'bg-rose-100 text-rose-800 border-rose-300'
  if (station.startsWith('BRT') || station.startsWith('brt'))
    return 'bg-orange-100 text-orange-800 border-orange-300'
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

/** Dot color for inline indicators */
export function stationDotClass(station: string): string {
  if (GOLD_STATIONS.has(station)) return 'bg-yellow-500'
  if (station.startsWith('BTS') || station.startsWith('bts')) return 'bg-green-600'
  if (PURPLE_STATIONS.has(station)) return 'bg-purple-600'
  if (PINK_STATIONS.has(station)) return 'bg-pink-500'
  if (YELLOW_STATIONS.has(station)) return 'bg-yellow-500'
  if (station.startsWith('MRT') || station.startsWith('mrt')) return 'bg-blue-600'
  if (station.startsWith('ARL') || station.startsWith('arl')) return 'bg-red-600'
  if (station.startsWith('SRT') || station.startsWith('srt')) return 'bg-rose-700'
  if (station.startsWith('BRT') || station.startsWith('brt')) return 'bg-orange-500'
  return 'bg-gray-400'
}
