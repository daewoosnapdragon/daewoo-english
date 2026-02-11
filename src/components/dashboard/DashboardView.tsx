'use client'

import { useApp } from '@/lib/context'
import { useClassCounts } from '@/hooks/useData'
import { ENGLISH_CLASSES, EnglishClass } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import {
  Users, TrendingUp, CalendarClock, AlertTriangle,
  ArrowRight, Clock, Flag, BookOpen
} from 'lucide-react'

export default function DashboardView() {
  const { t, language, currentTeacher } = useApp()
  const { counts, loading } = useClassCounts()

  // Calculate real totals from database
  const totalStudents = counts.reduce((a, c) => a + c.count, 0)
  const gradeBreakdown = [2, 3, 4, 5].map(g => ({
    grade: g,
    count: counts.filter(c => c.grade === g).reduce((a, c) => a + c.count, 0),
  }))
  const classBreakdown = ENGLISH_CLASSES.map(cls => ({
    class: cls,
    count: counts.filter(c => c.english_class === cls).reduce((a, c) => a + c.count, 0),
  }))

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="px-10 pt-8 pb-6 bg-surface border-b border-border">
        <h2 className="font-display text-[26px] font-semibold tracking-tight text-navy">
          {t.dashboard.title}
        </h2>
        <p className="text-text-secondary text-sm mt-1">
          {language === 'ko' ? '프로그램 전체 현황' : 'Program overview — Spring 2026'}
        </p>
      </div>

      <div className="px-10 py-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          <StatCard
            label={t.dashboard.totalStudents}
            value={loading ? '...' : String(totalStudents)}
            icon={Users}
            color="text-navy"
            bgColor="bg-accent-light"
          />
          <StatCard
            label={language === 'ko' ? '학년' : 'Grade Levels'}
            value={gradeBreakdown.filter(g => g.count > 0).length > 0 ? `${gradeBreakdown.filter(g => g.count > 0).length} active` : '...'}
            icon={BookOpen}
            color="text-navy"
            bgColor="bg-accent-light"
          />
          <StatCard
            label={language === 'ko' ? '다음 마감' : 'Next Deadline'}
            value="Mar 14"
            subtitle={language === 'ko' ? '중간 성적표' : 'Midterm Reports'}
            icon={CalendarClock}
            color="text-gold"
            bgColor="bg-warm-light"
          />
          <StatCard
            label={t.dashboard.belowThreshold}
            value="—"
            subtitle={language === 'ko' ? '데이터 입력 후' : 'After grades entered'}
            icon={AlertTriangle}
            color="text-danger"
            bgColor="bg-danger-light"
          />
        </div>

        <div className="grid grid-cols-3 gap-5 mb-7">
          {/* Student Counts by Class */}
          <div className="col-span-2 bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-display text-base font-semibold text-navy">
                {language === 'ko' ? '반별 학생 수' : 'Students by Class'}
              </h3>
            </div>
            <div className="p-5">
              {/* Grade row headers + class columns */}
              <table className="w-full text-[13px]">
                <thead>
                  <tr>
                    <th className="text-left px-2 py-2 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-20">
                      {language === 'ko' ? '학년' : 'Grade'}
                    </th>
                    {ENGLISH_CLASSES.map(cls => (
                      <th key={cls} className="text-center px-2 py-2">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10.5px] font-bold"
                          style={{ backgroundColor: classToColor(cls), color: classToTextColor(cls) }}>
                          {cls}
                        </span>
                      </th>
                    ))}
                    <th className="text-center px-2 py-2 text-[11px] uppercase tracking-wider text-text-secondary font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[2, 3, 4, 5].map(grade => {
                    const gradeTotal = counts.filter(c => c.grade === grade).reduce((a, c) => a + c.count, 0)
                    return (
                      <tr key={grade} className="border-t border-border">
                        <td className="px-2 py-2.5 font-semibold text-navy">Grade {grade}</td>
                        {ENGLISH_CLASSES.map(cls => {
                          const c = counts.find(c => c.grade === grade && c.english_class === cls)
                          return (
                            <td key={cls} className="text-center px-2 py-2.5 font-medium">
                              {c?.count || <span className="text-text-tertiary">—</span>}
                            </td>
                          )
                        })}
                        <td className="text-center px-2 py-2.5 font-bold text-navy">{gradeTotal || '—'}</td>
                      </tr>
                    )
                  })}
                  <tr className="border-t-2 border-navy/20">
                    <td className="px-2 py-2.5 font-bold text-navy">Total</td>
                    {ENGLISH_CLASSES.map(cls => {
                      const total = counts.filter(c => c.english_class === cls).reduce((a, c) => a + c.count, 0)
                      return <td key={cls} className="text-center px-2 py-2.5 font-bold">{total || '—'}</td>
                    })}
                    <td className="text-center px-2 py-2.5 font-bold text-gold text-lg">{totalStudents || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-display text-base font-semibold text-navy">
                {language === 'ko' ? '빠른 이동' : 'Quick Links'}
              </h3>
            </div>
            <div className="p-3">
              {[
                { label: language === 'ko' ? '성적 입력' : 'Enter Grades', desc: language === 'ko' ? '평가 점수 입력' : 'Input assessment scores', view: 'grades', icon: '📝' },
                { label: language === 'ko' ? '학생 명단' : 'View Roster', desc: language === 'ko' ? '전체 학생 목록' : 'Full student list', view: 'students', icon: '👥' },
                { label: language === 'ko' ? '보고서' : 'Reports', desc: language === 'ko' ? '성적표 생성' : 'Generate report cards', view: 'reports', icon: '📊' },
                { label: language === 'ko' ? '레벨 테스트' : 'Level Testing', desc: language === 'ko' ? '배치 점수 관리' : 'Manage placement scores', view: 'leveling', icon: '📐' },
                { label: language === 'ko' ? '설정' : 'Settings', desc: language === 'ko' ? '교사, 학교 정보' : 'Teachers, school info', view: 'settings', icon: '⚙️' },
              ].map((link, i) => (
                <button key={i} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent-light transition-all text-left mb-0.5 group">
                  <span className="text-lg">{link.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-text-primary group-hover:text-navy">{link.label}</p>
                    <p className="text-[11px] text-text-tertiary">{link.desc}</p>
                  </div>
                  <ArrowRight size={14} className="text-text-tertiary group-hover:text-navy" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Recent Activity */}
          <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-display text-base font-semibold text-navy">
                {language === 'ko' ? '최근 활동' : 'Recent Activity'}
              </h3>
            </div>
            <div className="p-4">
              {[
                { text: 'Full roster uploaded — 311 students across grades 2-5', time: 'Just now', icon: Users },
                { text: 'Database initialized with teacher assignments', time: '10 min ago', icon: Settings },
                { text: 'Spring 2026 Midterm semester set as active', time: '15 min ago', icon: CalendarClock },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                  <div className="w-7 h-7 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0 mt-0.5">
                    <item.icon size={13} className="text-navy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-primary leading-snug">{item.text}</p>
                    <p className="text-[11px] text-text-tertiary mt-0.5 flex items-center gap-1">
                      <Clock size={10} /> {item.time}
                    </p>
                  </div>
                </div>
              ))}
              <p className="text-[12px] text-text-tertiary text-center py-3 italic">
                {language === 'ko' ? '성적 입력이 시작되면 활동이 여기에 표시됩니다' : 'Activity will populate as grades are entered'}
              </p>
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-display text-base font-semibold text-navy">
                {language === 'ko' ? '다가오는 일정' : 'Upcoming Deadlines'}
              </h3>
            </div>
            <div className="p-4">
              {[
                { date: 'Mar 14', label: language === 'ko' ? '중간 성적 입력 마감' : 'Midterm grades due', urgent: true },
                { date: 'Mar 18', label: language === 'ko' ? '중간 코멘트 마감' : 'Midterm comments due', urgent: true },
                { date: 'Mar 21', label: language === 'ko' ? '중간 성적표 발송' : 'Midterm reports sent home', urgent: false },
                { date: 'Jun 20', label: language === 'ko' ? '기말 성적 입력 마감' : 'Final grades due', urgent: false },
                { date: 'Jun 27', label: language === 'ko' ? '기말 성적표 발송' : 'Final report cards sent home', urgent: false },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                  <div className={`w-14 text-center flex-shrink-0 py-1.5 rounded-lg text-[12px] font-bold ${
                    item.urgent ? 'bg-gold/15 text-amber-700' : 'bg-surface-alt text-text-secondary'
                  }`}>
                    {item.date}
                  </div>
                  <p className="text-[13px] text-text-primary">{item.label}</p>
                  {item.urgent && (
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-gold/10 px-2 py-0.5 rounded-full">
                      {language === 'ko' ? '곧' : 'Soon'}
                    </span>
                  )}
                </div>
              ))}
              <p className="text-[11px] text-text-tertiary mt-3 italic">
                {language === 'ko' ? '설정에서 날짜를 변경할 수 있습니다' : 'Dates are editable in Settings'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, subtitle, icon: Icon, color, bgColor }: {
  label: string; value: string; subtitle?: string; icon: any; color: string; bgColor: string
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-text-secondary uppercase tracking-wider font-semibold">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon size={16} className={color} />
        </div>
      </div>
      <div className={`font-display text-[28px] font-semibold ${color}`}>{value}</div>
      {subtitle && <p className="text-[11px] text-text-tertiary mt-0.5">{subtitle}</p>}
    </div>
  )
}
