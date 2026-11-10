'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/context'
import { DEFAULT_OVERTIME_SETTINGS, fmtWon, policyText, type OvertimeSettings } from '@/lib/overtime'
import { loadOvertimeSettings, saveOvertimeSettings } from '@/lib/overtimeData'
import { Loader2, Save } from 'lucide-react'

// ─── Overtime (Settings, admin) ──────────────────────────────────
// The hourly rate teachers see as they log, the policy paragraph printed
// at the top of every sheet ({rate} becomes the rate), and reasons offered
// to everyone as chips.

const inp = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink'
const area = 'w-full px-2.5 py-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink leading-relaxed'

export default function OvertimeSection() {
  const { language, showToast } = useApp()
  const ko = language === 'ko'
  const [s, setS] = useState<OvertimeSettings | null>(null)
  const [reasons, setReasons] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => { loadOvertimeSettings().then(v => { setS(v); setReasons(v.reasons.join('\n')) }) }, [])
  const upd = (p: Partial<OvertimeSettings>) => { setS(x => x ? { ...x, ...p } : x); setDirty(true) }
  const save = async () => {
    if (!s) return
    if (!(s.rate > 0)) { showToast(ko ? '시간당 금액을 입력하세요' : 'Type the rate in won'); return }
    setSaving(true)
    const clean = { ...s, reasons: reasons.split('\n').map(r => r.trim()).filter(Boolean) }
    const error = await saveOvertimeSettings(clean)
    setSaving(false)
    if (error) showToast(`Error: ${error}`); else { showToast(ko ? '초과근무 설정 저장됨' : 'Overtime settings saved'); setDirty(false); setS(clean) }
  }

  return (
    <div id="set-overtime" className="mb-10 scroll-mt-[140px]">
      <div className="flex items-baseline justify-between border-b border-rule-2 pb-2 mb-4">
        <h3 className="font-display text-[22px] leading-none text-ink">{ko ? '초과근무' : 'Overtime'}</h3>
        <button onClick={save} disabled={!dirty || saving || !s} className="h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover disabled:opacity-40 inline-flex items-center gap-1.5">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}{ko ? '저장' : 'Save'}
        </button>
      </div>
      {!s ? <p className="text-[12.5px] text-ink-3">{ko ? '불러오는 중' : 'Loading'}</p> : (
        <div className="space-y-5 text-[12.5px]">
          <label className="block">
            <span className="block font-semibold text-ink mb-1">{ko ? '시간당 금액 (원)' : 'Rate, won an hour'}</span>
            <input type="number" min={0} step={10} value={s.rate || ''} onChange={e => upd({ rate: Number(e.target.value) })} className={`${inp} w-[140px] tabular-nums`} />
            <span className="ml-2 text-ink-3">{ko ? '교사가 기록할 때 보이고, 모든 금액 계산에 쓰입니다.' : 'Teachers see this as they log; every won figure uses it.'}</span>
          </label>
          <div>
            <span className="block font-semibold text-ink mb-1">{ko ? '안내 문구' : 'Policy paragraph'}</span>
            <p className="text-ink-3 mb-2">{ko ? '모든 양식 위에 인쇄됩니다. {rate}는 위의 금액으로 바뀝니다.' : 'This prints at the top of every sheet. {rate} becomes the number above.'}</p>
            <textarea rows={3} value={s.policyEn} onChange={e => upd({ policyEn: e.target.value })} className={area} aria-label="English" />
            <textarea rows={2} value={s.policyKo} onChange={e => upd({ policyKo: e.target.value })} className={`${area} mt-2`} aria-label="Korean" />
            <p className="mt-1.5 text-ink-3 text-[11.5px]">{ko ? '미리보기' : 'Preview'}: {policyText(s.policyEn, s.rate || 0)}</p>
            <button onClick={() => upd({ policyEn: DEFAULT_OVERTIME_SETTINGS.policyEn, policyKo: DEFAULT_OVERTIME_SETTINGS.policyKo })} className="mt-1 text-[11.5px] text-ink-2 hover:text-ink underline">{ko ? '기본 문구로' : 'Back to the default wording'}</button>
          </div>
          <label className="block">
            <span className="block font-semibold text-ink mb-1">{ko ? '자주 쓰는 사유' : 'Reasons offered to everyone'}</span>
            <span className="block text-ink-3 mb-2">{ko ? '한 줄에 하나. 교사 자신의 최근 사유 다음에 보입니다.' : 'One per line. They show after each teacher’s own recent reasons.'}</span>
            <textarea rows={4} value={reasons} onChange={e => { setReasons(e.target.value); setDirty(true) }} placeholder={'Report cards\nOpen class preparation\nParent meeting'} className={area} />
          </label>
          <p className="text-ink-3">{ko ? `현재: 시간당 ${fmtWon(s.rate || 0, true)}. 주말과 쉬는 날은 기록할 수 없습니다.` : `Now: ${fmtWon(s.rate || 0)} an hour. Weekends and days off on the school calendar cannot be logged.`}</p>
        </div>
      )}
    </div>
  )
}
