import {
  Building2, CalendarDays, Car, Layers, Train,
  MapPin, ExternalLink, Waves, Dumbbell, ShieldCheck,
  Trees, Flame, Monitor, Users, Baby, UtensilsCrossed,
  ShoppingBag, Sparkles, Wifi, ParkingCircle,
} from 'lucide-react'

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
                <StatCard
                  icon={<Layers className="w-4 h-4" />}
                  value={`${project.total_floors}`}
                  label="จำนวนชั้น"
                />
              )}
              {project.total_units && (
                <StatCard
                  icon={<Building2 className="w-4 h-4" />}
                  value={`${project.total_units}`}
                  label="จำนวนยูนิต"
                />
              )}
              {project.built_year && (
                <StatCard
                  icon={<CalendarDays className="w-4 h-4" />}
                  value={`${project.built_year}`}
                  label="ปีที่สร้างเสร็จ"
                />
              )}
              {project.parking_pct && (
                <StatCard
                  icon={<Car className="w-4 h-4" />}
                  value={`${project.parking_pct}%`}
                  label="ที่จอดรถ"
                />
              )}
            </div>
          </div>
        )}

        {/* Transport */}
        {hasTransport && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">การเดินทาง</p>
            <div className="flex flex-wrap gap-2">
              {project.bts_mrt.map(station => (
                <div
                  key={station}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full border border-green-100"
                >
                  <Train className="w-3 h-3 text-green-600 flex-shrink-0" />
                  <span className="text-xs font-medium text-green-700 whitespace-nowrap">{station}</span>
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
