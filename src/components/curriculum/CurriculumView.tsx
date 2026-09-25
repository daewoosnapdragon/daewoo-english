'use client'

import StandardsHeatMap from './StandardsHeatMap'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { useStudents } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { BookOpen, Users2, Loader2, Info, Save, Globe2, Trash2, Grid3x3 } from 'lucide-react'
import { CCSS_STANDARDS, CCSS_DOMAINS, type CCSSDomain } from './ccss-standards'
import { CCSSOverview } from './WIDAGuide'

function getAdjustedGrade(studentGrade: Grade, englishClass: EnglishClass): number {
  if (['Lily', 'Camellia'].includes(englishClass)) return Math.max(0, studentGrade - 2)
  if (['Daisy', 'Sunflower'].includes(englishClass)) return Math.max(0, studentGrade - 1)
  return studentGrade
}
function gradeLabel(g: number): string { return g === 0 ? 'Kindergarten' : `Grade ${g}` }

// WIDA level definitions live in @/lib/wida so non-Standards screens (badges,
// hover cards, lesson scaffolds) can use them without importing this view.
// Re-exported here for anything still importing them from this module.
export { WIDA_LEVELS, WIDA_DOMAINS, type WIDADomainKey } from '@/lib/wida'
import { WIDA_LEVELS, WIDA_DOMAINS } from '@/lib/wida'

type StdStatus = 'below' | 'approaching' | 'on' | 'above'
type InterventionStatus = 'none' | 'not_yet_taught' | 'taught_needs_reteach' | 'reteaching' | 'reassessing'
const INTERVENTION_OPTIONS: { value: InterventionStatus; label: string; color: string }[] = [
  { value: 'none', label: '--', color: '' },
  { value: 'not_yet_taught', label: 'Not yet taught', color: 'text-gray-500 bg-gray-100' },
  { value: 'taught_needs_reteach', label: 'Needs reteach', color: 'text-red-700 bg-red-100' },
  { value: 'reteaching', label: 'Reteaching', color: 'text-amber-700 bg-amber-100' },
  { value: 'reassessing', label: 'Reassessing', color: 'text-blue-700 bg-blue-100' },
]

// Build cluster groups from standards
function getClusters(domain: CCSSDomain, grade: number) {
  const stds = CCSS_STANDARDS.filter(s => s.domain === domain && s.grade === grade)
  const map = new Map<string, typeof stds>()
  stds.forEach(s => {
    if (!map.has(s.cluster)) map.set(s.cluster, [])
    map.get(s.cluster)!.push(s)
  })
  return Array.from(map.entries()).map(([name, standards]) => ({ name, standards, codes: standards.map(s => s.code) }))
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
export default function CurriculumView() {
  const { language } = useApp()
  const [view, setView] = useState<'mastery' | 'standards' | 'guide' | 'quickcheck'>('mastery')

  return (
    <div className="animate-fade-in">
      <div className="bg-surface border-b border-border px-8 py-5">
        <h2 className="font-display text-2xl font-bold text-navy">{language === 'ko' ? '표준' : 'Standards'}</h2>
        <p className="text-[13px] text-text-secondary mt-1">CCSS mastery, the standards checklist, and a reference to the standards themselves. WIDA has its own page.</p>
        <div className="flex gap-1 mt-4">
          {([['mastery', 'Mastery', Grid3x3], ['standards', 'Standards Checklist', BookOpen], ['guide', 'About CCSS', Globe2]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setView(id as any)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all ${view === id ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-8 py-6">
        {view === 'mastery' && <StandardsHeatMap />}
        {view === 'standards' && <ClusterTracker />}
        {view === 'guide' && <CCSSOverview />}
      </div>
    </div>
  )
}

// ─── CLUSTER-LEVEL STANDARDS TRACKER ────────────────────────────────

// #28: Teaching tips for common CCSS standards
// #28: Teaching tips — evidence-based, ELL-specific, grade-aware
function getTeachingTip(code: string): string | null {
  const tips: Record<string, string> = {
    'RL.K.1': 'Read aloud daily, pause to ask who/what questions with picture support. Accept pointing or single-word answers. Model: I do, We do, You do.',
    'RL.1.1': 'Teach students to put their finger on the answer before responding. Use the frame: "The text says ___." Practice with predictable books where answers are explicit.',
    'RL.1.2': 'Three-box story maps (beginning/middle/end) with pictures. Students draw first, retell orally, then write. Keep retellings to 3 sentences max.',
    'RL.1.3': 'Create a feelings chart with faces. After reading, ask: "How does [character] feel? Why?" Frame: "[Character] feels ___ because ___."',
    'RL.2.1': 'Teach "right there" (answer in one sentence) vs. "think about it" questions. Model underlining evidence with a document camera. For ELLs: pre-teach key vocabulary before reading.',
    'RL.2.2': 'After fables, students identify the lesson: "This story teaches us ___." Keep a class chart of morals from different stories to compare across texts.',
    'RL.2.3': 'Problem-solution graphic organizer. Ask: "What is the problem? What does [character] do? Does it work?" For lower levels, give events on cards to sequence.',
    'RL.3.1': 'Two-column notes: Evidence (text says) and Inference (I think). Model with think-alouds. For ELLs: "The text says ___, so I think ___ because ___."',
    'RL.3.2': 'Topic vs. theme: topic is one word (friendship), theme is a sentence (true friends help even when it is hard). Practice distinguishing the two with familiar stories.',
    'RL.3.3': 'Character change map: beginning, middle, end. Track what the character wants, what happens, how they respond. Compare characters across two texts.',
    'RL.4.1': 'Require page citations: "On page ___, it says ___." For inference: "The text says ___, so I think ___." Build evidence-based argument skills.',
    'RL.4.2': 'Theme identification across multiple texts. Students compare: "Both stories teach us that ___." Use theme vocabulary: courage, perseverance, kindness.',
    'RL.5.1': 'Quote sandwich: introduce the quote, provide it with page number, explain its significance. Students practice with short passages before applying to longer texts.',
    'RF.K.1': 'Shared reading with big books. Point to each word (concept of word). Teach left-to-right tracking through daily morning messages on chart paper.',
    'RF.K.2': 'Heggerty phonemic awareness routine (5 min/day). Clap syllables in student names. For Korean speakers: focus on final consonant sounds not present in Korean.',
    'RF.K.3': 'One letter-sound per week, multisensory: see, say, trace, write in sand. Use Orton-Gillingham keyword cards. For Korean speakers: /f/, /v/, /th/ need explicit teaching.',
    'RF.1.2': 'Daily Elkonin box work (3 min). Push one counter per sound. Korean speakers need extra practice with /r/ vs /l/, /f/ vs /p/, and /v/ vs /b/ contrasts.',
    'RF.1.3': 'Decodable readers matched to taught patterns. Sequence: CVC, blends, digraphs, CVCe. For Korean speakers: teach th, sh, ch as single sounds explicitly.',
    'RF.2.3': 'Vowel team sorting (ai/ay, ee/ea, oa/ow). Self-check: "Does it look right AND sound right?" For Korean speakers: short vs. long vowel distinction needs explicit work.',
    'RF.3.3': 'Prefix/suffix instruction (un-, re-, pre-, -ful, -less, -tion). Word-building with root + affix cards. Students predict meaning, then verify in context.',
    'RF.3.4': 'Repeated reading of same passage 3x builds fluency. Partner reading: "Read it like you are talking to a friend." Track CWPM weekly with 1-minute reads.',
    'RF.4.3': 'Greek/Latin roots (tele-, micro-, -graph, -port). Class roots wall where students add new words as they encounter them. This unlocks hundreds of academic words.',
    'W.K.3': 'Draw, tell a friend, write the words. Accept invented spelling at this stage. The goal is getting ideas on paper, not correct spelling.',
    'W.1.3': 'Temporal words wall (first, then, next, finally). 4-box storyboards. For ELLs: draw + label before writing full sentences. Bilingual planning allowed.',
    'W.2.1': 'Simplified OREO: I think ___. One reason is ___. Another reason is ___. That is why ___. Provide opinion word banks (believe, feel, prefer, best).',
    'W.2.3': 'Five senses descriptive writing. Create sensory detail chart for a shared class experience. For ELLs: adjective word banks organized by sense.',
    'W.3.1': 'OREO with mentor texts. Identify opinion structures in read-alouds before students write. Model: "The author thinks ___ because ___."',
    'W.3.2': 'Informative: topic sentence + 3 facts + closing. "Expert Books" where students write about something they know. For ELLs: allow bilingual research notes.',
    'W.4.1': 'Address counter-arguments: "Some people think ___, but I disagree because ___." Hold a class debate before writing so students hear opposing views.',
    'SL.K.1': 'Talking sticks or turn-taking tokens. Practice in groups of 3 before whole class. Teach: eyes on the speaker, wait for your turn, respond to what was said.',
    'SL.1.1': 'Discussion frames: "I agree because ___." "I have a different idea: ___." Pairs first, then share with class. Allow 10 seconds of think time for ELLs.',
    'SL.2.1': 'After read-alouds, partner retelling with "First... Then... Finally..." frames. Picture cards for sequencing support. Accept shortened retellings from lower-level ELLs.',
    'SL.3.1': 'Accountable Talk moves posted on class chart: "Can you say more?" "I agree/disagree because ___." "Can you give an example?" Practice one move per week.',
    'SL.3.4': 'Expert Presentation: 3 facts on index cards, present to a small group. For ELLs: note cards allowed, practice with partner first. Focus on volume and eye contact.',
    'SL.4.1': 'Structured protocols: Think-Pair-Share, Numbered Heads, Inside-Outside Circle. Assign discussion roles (questioner, summarizer, connector).',
    'L.K.1': 'Morning message to model capitals and punctuation. Students "fix" daily sentences on whiteboards. One grammar skill per week maximum at this level.',
    'L.1.1': 'Mentor sentences from read-alouds: Notice, Label, Practice, Apply. For Korean speakers: explicitly teach SVO word order (Korean uses SOV).',
    'L.2.1': 'High-frequency irregular past tense (went, said, came, got) first since students use these daily. "Tricky verbs" wall. Practice through daily oral sentences.',
    'L.2.2': 'Apostrophe sorting: contractions (it is = it\'s) vs. possessives (the dog\'s bone). Korean has no apostrophes, so explicit instruction with many examples is essential.',
    'L.3.1': 'Sentence combining: two simple sentences + conjunction (and, but, so, because). This builds grammar and writing fluency at the same time.',
    'L.4.1': 'Sentence expansion: start with a kernel sentence, add who, when, where, how. Students physically manipulate sentence strips to build complex sentences.',
  }
  if (tips[code]) return tips[code]
  // Try one grade below for coverage
  const parts = code.match(/^([A-Z]+)\.(\d+)\.(\d+)$/)
  if (parts) {
    const lower = parts[1] + '.' + Math.max(0, Number(parts[2]) - 1) + '.' + parts[3]
    if (tips[lower]) return tips[lower]
  }
  return null
}


function ClusterTracker() {
  const { currentTeacher, showToast } = useApp()
  const [cls, setCls] = useState<EnglishClass>((currentTeacher?.english_class as EnglishClass) || 'Lily')
  const [gr, setGr] = useState<Grade>(3)
  const [statuses, setStatuses] = useState<Record<string, StdStatus>>({})
  const [loading, setLoading] = useState(true)
  const [stdAverages, setStdAverages] = useState<Record<string, number>>({})
  const [interventions, setInterventions] = useState<Record<string, InterventionStatus>>({})
  const [qcPulse, setQcPulse] = useState<Record<string, { got_it: number; almost: number; not_yet: number }>>({})
  const [showThresholdEdit, setShowThresholdEdit] = useState(false)
  const [expandedTip, setExpandedTip] = useState<string | null>(null)
  const [domainFilter, setDomainFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const DEFAULT_THRESHOLDS: Record<string, { above: number; on: number; approaching: number }> = {
    Lily: { above: 86, on: 71, approaching: 61 }, Camellia: { above: 86, on: 71, approaching: 61 },
    Daisy: { above: 86, on: 71, approaching: 61 }, Sunflower: { above: 86, on: 71, approaching: 61 },
    Marigold: { above: 86, on: 71, approaching: 61 }, Snapdragon: { above: 86, on: 71, approaching: 61 },
  }
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'mastery_thresholds').single()
      if (data?.value) {
        try {
          const saved = JSON.parse(data.value)
          const migrated: Record<string, { above: number; on: number; approaching: number }> = {}
          Object.entries(saved).forEach(([cls, val]: [string, any]) => {
            if (val.above != null) { migrated[cls] = val }
            else if (val.mastered != null) { migrated[cls] = { above: Math.min(val.mastered + 15, 100), on: val.mastered, approaching: val.approaching } }
          })
          setThresholds(prev => ({ ...prev, ...migrated }))
        } catch {}
      }
    })()
  }, [])

  const saveThresholds = async () => {
    await supabase.from('app_settings').upsert({ key: 'mastery_thresholds', value: JSON.stringify(thresholds) }, { onConflict: 'key' })
    showToast('Mastery thresholds saved')
    setShowThresholdEdit(false)
  }

  const t = thresholds[cls] || DEFAULT_THRESHOLDS[cls] || { above: 86, on: 71, approaching: 61 }
  const adj = getAdjustedGrade(gr, cls)
  const tier = ['Lily', 'Camellia'].includes(cls) ? '2 below' : ['Daisy', 'Sunflower'].includes(cls) ? '1 below' : 'On level'

  // All standards flat list with domain/cluster info
  const allStandards = useMemo(() => {
    return CCSS_DOMAINS.flatMap(d =>
      getClusters(d.key, adj).flatMap(c =>
        c.standards.map(std => ({ ...std, domain: d.key, domainLabel: d.label, cluster: c.name }))
      )
    )
  }, [adj])

  // Load statuses + interventions
  useEffect(() => {
    setLoading(true)
    ;(async () => {
      const { data } = await supabase.from('class_standard_status').select('*').eq('english_class', cls).eq('student_grade', gr)
      const m: Record<string, StdStatus> = {}
      const iv: Record<string, InterventionStatus> = {}
      if (data) data.forEach((r: any) => { if (['below','approaching','on','above'].includes(r.status)) m[r.standard_code] = r.status; if (r.intervention_status) iv[r.standard_code] = r.intervention_status })
      setStatuses(m); setInterventions(iv); setLoading(false)
    })()
  }, [cls, gr])

  // Load averages + quick check pulse in single effect (parallel fetches)
  useEffect(() => {
    (async () => {
      // Ordered + limit(1) rather than .single(): .single() errors outright if
      // more than one semester is flagged active, and every screen has to pick
      // the same one as the app context does.
      const { data: semArr } = await supabase.from('semesters').select('id')
        .eq('is_active', true).order('start_date', { ascending: false }).limit(1)
      const sem = semArr?.[0]
      if (!sem) { setStdAverages({}); setQcPulse({}); return }

      const [assessRes, qcRes] = await Promise.all([
        supabase.from('assessments').select('id, sections, standards, max_score')
          .eq('english_class', cls).eq('grade', gr).eq('semester_id', sem.id),
        supabase.from('quick_checks').select('standard_code, mark')
          .eq('english_class', cls).eq('student_grade', gr)
      ])

      const assessments = assessRes.data || []
      const qcData = qcRes.data || []

      // Build QC pulse counts
      const pulse: Record<string, { got_it: number; almost: number; not_yet: number }> = {}
      qcData.forEach((qc: any) => {
        if (!pulse[qc.standard_code]) pulse[qc.standard_code] = { got_it: 0, almost: 0, not_yet: 0 }
        const key = qc.mark as 'got_it' | 'almost' | 'not_yet'
        if (key in pulse[qc.standard_code]) pulse[qc.standard_code][key]++
      })
      setQcPulse(pulse)

      // Build assessment averages
      if (assessments.length === 0) { setStdAverages({}); return }
      const aIds = assessments.map(a => a.id)
      const { data: grades } = await supabase.from('grades').select('assessment_id, score, section_scores')
        .in('assessment_id', aIds).not('score', 'is', null)
      if (!grades || grades.length === 0) { setStdAverages({}); return }

      const avgs: Record<string, { total: number; count: number }> = {}
      assessments.forEach(a => {
        if (a.sections) {
          a.sections.forEach((sec: any, si: number) => {
            if (!sec.standard) return
            grades.filter(g => g.assessment_id === a.id && g.section_scores?.[String(si)] != null).forEach(g => {
              const pct = sec.max_points > 0 ? (g.section_scores[String(si)] / sec.max_points) * 100 : 0
              if (!avgs[sec.standard]) avgs[sec.standard] = { total: 0, count: 0 }
              avgs[sec.standard].total += pct; avgs[sec.standard].count++
            })
          })
        }
        if (a.standards?.length) {
          const aGrades = grades.filter(g => g.assessment_id === a.id)
          if (aGrades.length === 0) return
          const avg = aGrades.reduce((s: number, g: any) => s + ((g.score / a.max_score) * 100), 0) / aGrades.length
          a.standards.forEach((st: any) => {
            if (!avgs[st.code]) avgs[st.code] = { total: 0, count: 0 }
            avgs[st.code].total += avg; avgs[st.code].count++
          })
        }
      })
      // Factor in QC at 0.5 weight
      const QC_SCORE: Record<string, number> = { got_it: 95, almost: 60, not_yet: 20 }
      const qcByStd: Record<string, number[]> = {}
      qcData.forEach((qc: any) => {
        if (!qcByStd[qc.standard_code]) qcByStd[qc.standard_code] = []
        qcByStd[qc.standard_code].push(QC_SCORE[qc.mark] || 50)
      })
      Object.entries(qcByStd).forEach(([code, scores]) => {
        const qcAvg = scores.reduce((a, b) => a + b, 0) / scores.length
        if (!avgs[code]) avgs[code] = { total: 0, count: 0 }
        avgs[code].total += qcAvg * 0.5; avgs[code].count += 0.5
      })
      const result: Record<string, number> = {}
      Object.entries(avgs).forEach(([code, { total, count }]) => { result[code] = Math.round(total / count * 10) / 10 })
      setStdAverages(result)
    })()
  }, [cls, gr])

  // Auto-apply mastery from averages (only for standards with data, don't override manual)
  const [autoSuggested, setAutoSuggested] = useState(false)
  useEffect(() => {
    if (loading || autoSuggested || Object.keys(stdAverages).length === 0) return
    const newStatuses = { ...statuses }
    let changed = 0
    Object.entries(stdAverages).forEach(([code, avg]) => {
      const current = statuses[code]
      const suggest: StdStatus = avg >= t.above ? 'above' : avg >= t.on ? 'on' : avg >= t.approaching ? 'approaching' : 'below'
      if (current == null || (current !== suggest && current !== 'above')) {
        newStatuses[code] = suggest; changed++
      }
    })
    if (changed > 0) {
      setStatuses(newStatuses)
      const rows = Object.entries(newStatuses)
        .filter(([c]) => stdAverages[c] != null)
        .map(([code, status]) => ({
          english_class: cls, student_grade: gr, standard_code: code, status,
          updated_by: currentTeacher?.id, updated_at: new Date().toISOString()
        }))
      supabase.from('class_standard_status').upsert(rows, { onConflict: 'english_class,student_grade,standard_code' })
    }
    setAutoSuggested(true)
  }, [loading, stdAverages, autoSuggested])

  useEffect(() => { setAutoSuggested(false) }, [cls, gr])

  // Effective status: use saved status, or compute from average, or "not_started" if no data
  const getEffectiveStatus = useCallback((code: string): StdStatus | 'not_started' => {
    const saved = statuses[code]
    if (saved) return saved
    const avg = stdAverages[code]
    if (avg != null) {
      return avg >= t.above ? 'above' : avg >= t.on ? 'on' : avg >= t.approaching ? 'approaching' : 'below'
    }
    return 'not_started'
  }, [statuses, stdAverages, t])

  const cycleStatus = async (code: string) => {
    const cur = getEffectiveStatus(code)
    const cycle: (StdStatus | 'not_started')[] = ['not_started', 'below', 'approaching', 'on', 'above']
    const idx = cycle.indexOf(cur)
    const nx = cycle[(idx + 1) % cycle.length]
    if (nx === 'not_started') {
      setStatuses(p => { const n = { ...p }; delete n[code]; return n })
      await supabase.from('class_standard_status').delete()
        .eq('english_class', cls).eq('student_grade', gr).eq('standard_code', code)
    } else {
      setStatuses(p => ({ ...p, [code]: nx as StdStatus }))
      await supabase.from('class_standard_status').upsert({
        english_class: cls, student_grade: gr, standard_code: code, status: nx,
        updated_by: currentTeacher?.id, updated_at: new Date().toISOString()
      }, { onConflict: 'english_class,student_grade,standard_code' })
    }
  }

  // Summary counts
  const counts = useMemo(() => {
    const c: Record<string, number> = { not_started: 0, below: 0, approaching: 0, on: 0, above: 0 }
    allStandards.forEach(std => { c[getEffectiveStatus(std.code)]++ })
    return c
  }, [allStandards, getEffectiveStatus])

  // Filter displayed standards
  const displayed = useMemo(() => {
    let list = allStandards
    if (domainFilter !== 'all') list = list.filter(s => s.domain === domainFilter)
    if (statusFilter !== 'all') list = list.filter(s => getEffectiveStatus(s.code) === statusFilter)
    return list
  }, [allStandards, domainFilter, statusFilter, getEffectiveStatus])

  // Group by domain → cluster
  const grouped = useMemo(() => {
    const m = new Map<string, typeof displayed>()
    displayed.forEach(s => {
      if (!m.has(s.domain)) m.set(s.domain, [])
      m.get(s.domain)!.push(s)
    })
    return Array.from(m.entries())
  }, [displayed])

  const STATUS_DISPLAY: Record<string, { dot: string; bg: string; label: string; ring: string }> = {
    not_started: { dot: '', bg: '', label: 'Not Started', ring: '' },
    below: { dot: 'bg-red-500', bg: 'bg-red-50/50', label: 'Below', ring: '' },
    approaching: { dot: 'bg-amber-400', bg: 'bg-amber-50/50', label: 'Approaching', ring: '' },
    on: { dot: 'bg-green-500', bg: 'bg-green-50/50', label: 'On Standard', ring: '' },
    above: { dot: 'bg-blue-500', bg: 'bg-blue-50/50', label: 'Above', ring: '' },
  }

  // QC mini bar
  const QCBar = ({ code }: { code: string }) => {
    const p = qcPulse[code]
    if (!p || (p.got_it + p.almost + p.not_yet === 0)) return null
    const total = p.got_it + p.almost + p.not_yet
    const gPct = (p.got_it / total) * 100
    const aPct = (p.almost / total) * 100
    return (
      <div className="flex items-center gap-1.5" title={`Quick Check: ${p.got_it} got it, ${p.almost} almost, ${p.not_yet} not yet (${total} total)`}>
        <div className="w-14 h-1.5 rounded-full bg-gray-200 overflow-hidden flex">
          {gPct > 0 && <div className="h-full bg-green-500" style={{ width: `${gPct}%` }} />}
          {aPct > 0 && <div className="h-full bg-amber-400" style={{ width: `${aPct}%` }} />}
        </div>
        <span className="text-[8px] text-text-tertiary whitespace-nowrap">{p.got_it}/{total}</span>
      </div>
    )
  }

  return (
    <div>
      {/* Class + Grade selector */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Class</label>
          <div className="flex gap-1">
            {ENGLISH_CLASSES.map(c => (
              <button key={c} onClick={() => setCls(c)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${cls === c ? 'text-white' : 'text-text-secondary hover:bg-surface-alt'}`}
                style={cls === c ? { backgroundColor: classToColor(c), color: classToTextColor(c) } : {}}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Student Grade</label>
          <div className="flex gap-1">{GRADES.map(g => <button key={g} onClick={() => setGr(g)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${gr === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>Gr {g}</button>)}</div>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4">
        <div className="flex items-center gap-2">
          <Info size={15} className="text-blue-500" />
          <p className="text-[12px] text-blue-700"><span className="font-semibold">{cls}</span> Grade {gr} → <span className="font-semibold">{gradeLabel(adj)} CCSS</span> ({tier})</p>
        </div>
        <button onClick={() => setShowThresholdEdit(!showThresholdEdit)} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/70 text-blue-600 hover:bg-white border border-blue-200">
          ⚙ Thresholds
        </button>
      </div>

      {/* Threshold Editor */}
      {showThresholdEdit && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-4">
          <p className="text-[13px] font-bold text-navy mb-1">Standards Mastery Thresholds</p>
          <p className="text-[10px] text-text-tertiary mb-4">Set the percentage cutoffs for each class. These determine how student scores map to mastery levels.</p>
          <div className="space-y-3">
            {ENGLISH_CLASSES.map(c => {
              const th = thresholds[c] || { above: 86, on: 71, approaching: 61 }
              const updateTh = (field: 'above' | 'on' | 'approaching', val: number) =>
                setThresholds(prev => ({ ...prev, [c]: { ...(prev[c] || { above: 86, on: 71, approaching: 61 }), [field]: val } }))
              return (
                <div key={c} className="flex items-center gap-3 bg-surface-alt/50 rounded-lg px-3 py-2.5">
                  <span className="text-[11px] font-bold w-20 shrink-0" style={{ color: classToColor(c) }}>{c}</span>
                  <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />Above:
                      <input type="number" min={0} max={100} value={th.above}
                        onChange={e => updateTh('above', Number(e.target.value))}
                        className="w-10 px-1 py-0.5 border border-border rounded text-[10px] text-center bg-white" />%+
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-green-500" />On:
                      <input type="number" min={0} max={100} value={th.on}
                        onChange={e => updateTh('on', Number(e.target.value))}
                        className="w-10 px-1 py-0.5 border border-border rounded text-[10px] text-center bg-white" />–{th.above - 1}%
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />Approaching:
                      <input type="number" min={0} max={100} value={th.approaching}
                        onChange={e => updateTh('approaching', Number(e.target.value))}
                        className="w-10 px-1 py-0.5 border border-border rounded text-[10px] text-center bg-white" />–{th.on - 1}%
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-text-tertiary">
                      <span className="w-2 h-2 rounded-full bg-red-500" />Below: 0–{th.approaching - 1}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowThresholdEdit(false)} className="px-3 py-1.5 rounded-lg text-[11px] text-text-secondary hover:bg-surface-alt">Cancel</button>
            <button onClick={saveThresholds} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-navy text-white hover:opacity-90">Save Thresholds</button>
          </div>
        </div>
      )}

      {/* Summary strip + filters */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-3 py-2">
          {([['not_started', 'Not Started', 'bg-gray-200'], ['below', 'Below', 'bg-red-500'], ['approaching', 'Approaching', 'bg-amber-400'], ['on', 'On', 'bg-green-500'], ['above', 'Above', 'bg-blue-500']] as const).map(([key, label, dot]) => (
            <button key={key} onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${statusFilter === key ? 'bg-navy/10 text-navy ring-1 ring-navy/20' : 'text-text-secondary hover:bg-surface-alt'}`}>
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              {counts[key]} {label}
            </button>
          ))}
        </div>
        <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)}
          className="px-2.5 py-1.5 border border-border rounded-lg text-[11px] outline-none bg-surface">
          <option value="all">All Domains</option>
          {CCSS_DOMAINS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
        <span className="text-[9px] text-text-tertiary ml-auto">Click dot to cycle: — → Below → Approaching → On → Above → —</span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[9px] text-text-tertiary mb-3">
        <span>Thresholds: Above ≥{t.above}% | On ≥{t.on}% | Approaching ≥{t.approaching}%</span>
        <span className="flex items-center gap-1"><span className="w-8 h-1.5 rounded-full overflow-hidden flex"><span className="h-full bg-green-500 w-3" /><span className="h-full bg-amber-400 w-3" /><span className="h-full bg-gray-200 w-2" /></span> = Quick Check pulse</span>
      </div>

      {/* Main table */}
      {loading ? <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div> :
      <div className="space-y-5">
        {grouped.map(([domKey, standards]) => {
          const domInfo = CCSS_DOMAINS.find(d => d.key === domKey)
          const clusterGroups = new Map<string, typeof standards>()
          standards.forEach(s => {
            if (!clusterGroups.has(s.cluster)) clusterGroups.set(s.cluster, [])
            clusterGroups.get(s.cluster)!.push(s)
          })
          return (
            <div key={domKey} className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-surface-alt border-b border-border">
                <h3 className="text-[12px] font-bold text-navy uppercase tracking-wider">{domInfo?.label || domKey}</h3>
              </div>
              <div className="divide-y divide-border/50">
                {Array.from(clusterGroups.entries()).map(([clusterName, clusterStds]) => (
                  <div key={clusterName}>
                    <div className="px-4 py-1.5 bg-surface-alt/30 border-b border-border/30">
                      <span className="text-[10px] font-semibold text-text-secondary">{clusterName}</span>
                    </div>
                    {clusterStds.map(std => {
                      const es = getEffectiveStatus(std.code)
                      const d = STATUS_DISPLAY[es] || STATUS_DISPLAY['not_started']
                      const avg = stdAverages[std.code]
                      const iv = interventions[std.code]
                      const tip = getTeachingTip(std.code)
                      return (
                        <div key={std.code} className={`flex items-start gap-3 px-4 py-2 hover:bg-surface-alt/30 transition-colors ${d.bg}`}>
                          {/* Status dot */}
                          <button onClick={() => cycleStatus(std.code)} className="mt-1 flex-shrink-0" title={`${d.label} — click to cycle`}>
                            {es === 'not_started'
                              ? <span className="block w-3.5 h-3.5 rounded-full border-2 border-dashed border-gray-300" />
                              : <span className={`block w-3.5 h-3.5 rounded-full ${d.dot}`} />
                            }
                          </button>

                          {/* Standard info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-bold text-navy">{std.code}</span>
                              {avg != null && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${avg >= t.above ? 'bg-blue-100 text-blue-700' : avg >= t.on ? 'bg-green-100 text-green-700' : avg >= t.approaching ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                  {Math.round(avg)}%
                                </span>
                              )}
                              <QCBar code={std.code} />
                              {(es === 'below' || es === 'approaching') && (
                                <select
                                  value={iv || 'none'}
                                  onChange={async (e) => {
                                    const val = e.target.value as InterventionStatus
                                    setInterventions(p => ({ ...p, [std.code]: val }))
                                    await supabase.from('class_standard_status').upsert({
                                      english_class: cls, student_grade: gr, standard_code: std.code,
                                      status: es as StdStatus, intervention_status: val === 'none' ? null : val,
                                      updated_by: currentTeacher?.id, updated_at: new Date().toISOString()
                                    }, { onConflict: 'english_class,student_grade,standard_code' })
                                  }}
                                  className={`text-[9px] font-medium px-1.5 py-0.5 rounded border-0 outline-none cursor-pointer ${
                                    INTERVENTION_OPTIONS.find(o => o.value === (iv || 'none'))?.color || 'text-gray-400 bg-transparent'
                                  }`}
                                >
                                  {INTERVENTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                              )}
                              {tip && (
                                <button onClick={() => setExpandedTip(expandedTip === std.code ? null : std.code)}
                                  className="text-[9px] text-indigo-600 hover:underline">tip</button>
                              )}
                            </div>
                            <p className="text-[11px] text-text-primary leading-snug mt-0.5">{std.text}</p>
                            {expandedTip === std.code && tip && (
                              <div className="mt-1 text-[10px] text-indigo-800 bg-indigo-50 rounded px-2 py-1.5 leading-relaxed">{tip}</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>}
    </div>
  )
}
