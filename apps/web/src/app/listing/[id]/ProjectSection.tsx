import {
  Building2, CalendarDays, Car, Layers, Train,
  MapPin, ExternalLink, Waves, Dumbbell, ShieldCheck,
  Trees, Flame, Monitor, Users, Baby, UtensilsCrossed,
  ShoppingBag, Sparkles, Wifi, ParkingCircle,
  BookOpen, Cctv, KeyRound, Sailboat, Droplets,
  School, Heart, Landmark, Store, Star,
} from 'lucide-react'
import { stationColorClass, stationDotClass } from '@/lib/transitColors'

interface ProjectData {
  name_th: string
  name_en?: string | null
  developer?: string | null
  built_year?: number | null
  total_floors?: number | null
  total_units?: number | null
  parking_pct?: number | null
  facilities: string[]
  bts_mrt: string[]
  transit_distances?: { station: string; line: string; distance_m: number }[] | null
  nearby_amenities?: { name: string; category: string; distance_m: number }[] | null
  address_no?: string | null
  address_road?: string | null
  province?: string | null
  district?: string | null
  subdistrict?: string | null
  zip?: string | null
  map_url?: string | null
}

const FACILITY_MAP: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  'สระว่ายน้ำ':              { icon: Waves,            color: 'text-cyan-700',    bg: 'bg-cyan-50 border-cyan-100' },
  'ฟิตเนส':                   { icon: Dumbbell,         color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-100' },
  'รักษาความปลอดภัย 24 ชม.': { icon: ShieldCheck,      color: 'text-slate-700',   bg: 'bg-slate-50 border-slate-200' },
  'ที่จอดรถ':                  { icon: ParkingCircle,    color: 'text-gray-700',    bg: 'bg-gray-50 border-gray-200' },
  'ล็อบบี้':                   { icon: Building2,        color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-100' },
  'ร้านสะดวกซื้อ':             { icon: ShoppingBag,      color: 'text-green-700',   bg: 'bg-green-50 border-green-100' },
  'สวน':                      { icon: Trees,             color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
  'ห้องซาวนา':                 { icon: Flame,            color: 'text-red-700',     bg: 'bg-red-50 border-red-100' },
  'Co-working space':         { icon: Monitor,          color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-100' },
  'ห้องประชุม':                 { icon: Users,            color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-100' },
  'สนามเด็กเล่น':               { icon: Baby,             color: 'text-pink-700',    bg: 'bg-pink-50 border-pink-100' },
  'ร้านอาหาร':                  { icon: UtensilsCrossed, color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-100' },
  'Wi-Fi':                    { icon: Wifi,             color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-100' },
  'WiFi':                     { icon: Wifi,             color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-100' },
  'ห้องสมุด':                   { icon: BookOpen,         color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-100' },
  'Library':                  { icon: BookOpen,         color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-100' },
  'กล้องวงจรปิด':               { icon: Cctv,             color: 'text-slate-700',   bg: 'bg-slate-50 border-slate-200' },
  'CCTV':                     { icon: Cctv,             color: 'text-slate-700',   bg: 'bg-slate-50 border-slate-200' },
  'คีย์การ์ด':                   { icon: KeyRound,         color: 'text-gray-700',    bg: 'bg-gray-50 border-gray-200' },
  'Key Card Access':          { icon: KeyRound,         color: 'text-gray-700',    bg: 'bg-gray-50 border-gray-200' },
  'สวนหย่อม':                   { icon: Trees,             color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
  'Garden':                   { icon: Trees,             color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
  'Swimming Pool':            { icon: Waves,            color: 'text-cyan-700',    bg: 'bg-cyan-50 border-cyan-100' },
  'Fitness':                  { icon: Dumbbell,         color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-100' },
  '24-hour Security':         { icon: ShieldCheck,      color: 'text-slate-700',   bg: 'bg-slate-50 border-slate-200' },
  'ระบบรักษาความปลอดภัย 24 ชม.': { icon: ShieldCheck,   color: 'text-slate-700',   bg: 'bg-slate-50 border-slate-200' },
  'Lobby':                    { icon: Building2,        color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-100' },
  'Parking':                  { icon: ParkingCircle,    color: 'text-gray-700',    bg: 'bg-gray-50 border-gray-200' },
  'Co-working Space':         { icon: Monitor,          color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-100' },
  'ร้านซักรีด':                  { icon: Droplets,         color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-100' },
  'Shuttle Service':          { icon: Sailboat,         color: 'text-sky-700',     bg: 'bg-sky-50 border-sky-100' },
}

const AMENITY_CATEGORY_META: Record<string, { label: string; Icon: React.ElementType }> = {
  education:   { label: 'สถานศึกษา',     Icon: School },
  shopping:    { label: 'ห้าง/ช้อปปิ้ง', Icon: ShoppingBag },
  healthcare:  { label: 'โรงพยาบาล',    Icon: Heart },
  cultural:    { label: 'วัด/ศาสนสถาน', Icon: Landmark },
  convenience: { label: 'ร้านสะดวกซื้อ', Icon: Store },
  restaurant:  { label: 'ร้านอาหาร',    Icon: UtensilsCrossed },
  landmark:    { label: 'สถานที่ดัง',    Icon: Star },
}

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} กม.` : `${m} ม.`
}

function FacilityChip({ name }: { name: string }) {
  const config = FACILITY_MAP[name]
  const Icon = config?.icon ?? Sparkles
  const color = config?.color ?? 'text-blue-700'
  const bg = config?.bg ?? 'bg-blue-50 border-blue-100'
  return (
    <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border ${bg} flex-shrink-0`}>
      <Icon className={`w-3.5 h-3.5 ${color} flex-shrink-0`} />
      <span className={`text-xs font-medium ${color} whitespace-nowrap`}>{name}</span>
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 flex flex-col items-center text-center gap-1">
      <div className="text-gray-400">{icon}</div>
      <p className="text-base font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

export default function ProjectSection({ project }: { project: ProjectData }) {
  const hasStats = project.total_floors || project.total_units || project.built_year || project.parking_pct
  const address = [project.address_no, project.address_road, project.subdistrict, project.district, project.province, project.zip]
    .filter(Boolean).join(' ')
  const hasLocation = address.length > 0 || project.map_url
  const hasTransport = project.bts_mrt && project.bts_mrt.length > 0
  const hasFacilities = project.facilities && project.facilities.length > 0

  const transitDistances = project.transit_distances ?? []
  const nearbyAmenities = project.nearby_amenities ?? []

  // Group nearby amenities by category
  const grouped = new Map<string, { name: string; distance_m: number }[]>()
  for (const a of nearbyAmenities) {
    const arr = grouped.get(a.category) ?? []
    arr.push({ name: a.name, distance_m: a.distance_m })
    grouped.set(a.category, arr)
  }

  // Build distMap for bts_mrt chips
  const distMap = new Map<string, number>(transitDistances.map(d => [d.station, d.distance_m]))

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <h2 className="text-sm font-bold text-gray-800">เกี่ยวกับโครงการ</h2>
        </div>
        <p className="text-base font-bold text-gray-900 leading-snug">{project.name_th}</p>
        {project.name_en && (
          <p className="text-xs text-gray-400 mt-0.5">{project.name_en}</p>
        )}
        {project.developer && (
          <p className="text-xs text-gray-500 mt-1.5">
            พัฒนาโดย <span className="font-semibold text-gray-700">{project.developer}</span>
          </p>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Stats */}
        {hasStats && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">ข้อมูลโครงการ</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {project.total_floors && (
                <StatCard icon={<Layers className="w-4 h-4" />} value={`${project.total_floors}`} label="จำนวนชั้น" />
              )}
              {project.total_units && (
                <StatCard icon={<Building2 className="w-4 h-4" />} value={`${project.total_units}`} label="จำนวนยูนิต" />
              )}
              {project.built_year && (
                <StatCard icon={<CalendarDays className="w-4 h-4" />} value={`${project.built_year}`} label="ปีที่สร้างเสร็จ" />
              )}
              {project.parking_pct && (
                <StatCard icon={<Car className="w-4 h-4" />} value={`${project.parking_pct}%`} label="ที่จอดรถ" />
              )}
            </div>
          </div>
        )}

        {/* BTS/MRT Chips + distances */}
        {hasTransport && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">รถไฟฟ้าใกล้เคียง</p>
            <div className="flex flex-wrap gap-2">
              {project.bts_mrt.map(station => {
                const dm = distMap.get(station)
                return (
                  <span
                    key={station}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full font-medium border ${stationColorClass(station)}`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stationDotClass(station)}`} />
                    <Train className="w-3 h-3 flex-shrink-0" />
                    {station}
                    {dm != null && (
                      <span className="opacity-70 font-normal">{fmtDist(dm)}</span>
                    )}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Transit distances full table */}
        {transitDistances.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">ระยะทางสถานีรถไฟฟ้า (ทุกสาย)</p>
            <div className="space-y-1.5">
              {transitDistances.map((t, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                  <Train className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-800 flex-1">{t.station}</span>
                  <span className="text-xs text-gray-400 hidden sm:block">{t.line}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stationColorClass(t.station)}`}>
                    {fmtDist(t.distance_m)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        {hasLocation && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">ที่ตั้ง</p>
            {address && (
              <div className="flex items-start gap-2 mb-3">
                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600 leading-relaxed">{address}</p>
              </div>
            )}
            {project.map_url && (
              <a
                href={project.map_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                ดูแผนที่ Google Maps
              </a>
            )}
          </div>
        )}

        {/* Nearby Amenities */}
        {grouped.size > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">สถานที่ใกล้เคียง (รัศมี 5 กม.)</p>
            <div className="space-y-3">
              {[...grouped.entries()].map(([cat, items]) => {
                const meta = AMENITY_CATEGORY_META[cat] ?? { label: cat, Icon: MapPin }
                const CatIcon = meta.Icon
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CatIcon className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{meta.label}</span>
                    </div>
                    <div className="space-y-1">
                      {items.map((a, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1 pl-5 border-b border-gray-50 last:border-0">
                          <span className="text-gray-700 text-xs">{a.name}</span>
                          <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">{fmtDist(a.distance_m)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Facilities */}
        {hasFacilities && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">สิ่งอำนวยความสะดวกโครงการ</p>
            <div className="flex flex-wrap gap-2">
              {project.facilities.map(f => (
                <FacilityChip key={f} name={f} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
