'use client'

import { useState, useMemo, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import {
  Search, ChevronDown, ChevronUp, BookOpen, PenTool, MessageSquare,
  Lightbulb, Loader2, BookMarked, FileText, Layers, Type, Languages,
  Volume2, Puzzle, Gauge, Brain, Sparkles, PencilLine, Mic, Headphones
} from 'lucide-react'
import { PhonicsSequence, PhonicsStrategies, AssessmentLiteracy, ReadingFluencyGuide } from '@/components/curriculum/TeacherReferences'
import ResourceGuideRenderer from './ResourceGuideRenderer'
import { PHONOLOGICAL_AWARENESS, PHONICS, READING_FLUENCY, READING_SKILLS, VOCABULARY, GRAMMAR, WRITING, SPEAKING, LISTENING, CLASSROOM_MANAGEMENT } from './resource-guide-data'

type ResourceSection = 'home' | 'phonological-awareness' | 'phonics-guide' | 'reading-fluency' | 'reading-skills' | 'vocabulary' | 'grammar' | 'writing' | 'speaking' | 'listening' | 'classroom-management' | 'sor-progression' | 'phonics-strategies' | 'assessment-literacy' | 'fluency-guide' | 'subplans'

export default function TeacherGuidesView() {
  const { lang } = useApp()
  const ko = lang === 'ko'
  const [section, setSection] = useState<ResourceSection>('home')

  const NAV: { id: ResourceSection; icon: any; label: string; desc: string; category?: string }[] = [
    // Comprehensive resource guides
    { id: 'phonological-awareness', icon: Volume2, label: 'Phonological Awareness', desc: 'Hearing and manipulating the sounds of spoken language', category: 'ELA/ESL Resource Guides' },
    { id: 'phonics-guide', icon: Puzzle, label: 'Phonics', desc: 'Letter-sound relationships and decoding skills', category: 'ELA/ESL Resource Guides' },
    { id: 'reading-fluency', icon: Gauge, label: 'Reading Fluency', desc: 'Accuracy, rate, prosody, and fluency development', category: 'ELA/ESL Resource Guides' },
    { id: 'reading-skills', icon: BookOpen, label: 'Reading Skills', desc: 'Comprehension strategies and critical reading', category: 'ELA/ESL Resource Guides' },
    { id: 'vocabulary', icon: Sparkles, label: 'Vocabulary', desc: 'Word knowledge, tiers, and teaching strategies', category: 'ELA/ESL Resource Guides' },
    { id: 'grammar', icon: Type, label: 'Grammar', desc: 'Parts of speech, tenses, and ELL-specific challenges', category: 'ELA/ESL Resource Guides' },
    { id: 'writing', icon: PencilLine, label: 'Writing', desc: 'Process writing, genres, and sentence development', category: 'ELA/ESL Resource Guides' },
    { id: 'speaking', icon: Mic, label: 'Speaking', desc: 'Oral language, academic discussion, and pronunciation', category: 'ELA/ESL Resource Guides' },
    { id: 'listening', icon: Headphones, label: 'Listening', desc: 'Comprehension, academic listening, and note-taking', category: 'ELA/ESL Resource Guides' },
    { id: 'classroom-management', icon: Layers, label: 'Classroom Management', desc: 'Routines, behavior systems, and ELL-specific strategies', category: 'ELA/ESL Resource Guides' },
    // Existing tools
    { id: 'sor-progression', icon: Lightbulb, label: 'Science of Reading Progression', desc: 'Scope & sequence and teaching strategies', category: 'Reference Tools' },
    { id: 'phonics-strategies', icon: Puzzle, label: 'Phonics Instructional Strategies', desc: '8 research-backed strategies for structured literacy', category: 'Reference Tools' },
    { id: 'assessment-literacy', icon: Brain, label: 'Assessment Literacy', desc: 'Types, purposes, and best practices for classroom assessment', category: 'Reference Tools' },
    { id: 'fluency-guide', icon: Gauge, label: 'Fluency Teaching Guide', desc: 'Prosody, repeated reading, and fluency interventions', category: 'Reference Tools' },
    { id: 'subplans', icon: FileText, label: 'Sub Plans', desc: 'Substitute teacher lesson plans', category: 'Reference Tools' },
  ]

  if (section === 'home') {
    const categories = [...new Set(NAV.map(n => n.category))]
    return (
      <div className="px-8 py-6 max-w-[1100px] mx-auto">
        <h2 className="font-display text-2xl font-bold text-navy mb-1">{ko ? '교사 자료실' : 'Teacher Resources'}</h2>
        <p className="text-[12px] text-text-tertiary mb-6">Deep, evidence-based reference guides for daily instruction. Research-backed strategies you can use today.</p>
        {categories.map(cat => (
          <div key={cat} className="mb-6">
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-3">{cat}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {NAV.filter(n => n.category === cat).map(n => {
                const isComingSoon = false
                return (
                  <button key={n.id} onClick={() => !isComingSoon && setSection(n.id)} className={`text-left bg-surface border border-border rounded-xl p-4 transition-all group ${isComingSoon ? 'opacity-50 cursor-default' : 'hover:shadow-md hover:border-navy/20'}`}>
                    <div className="flex items-start gap-3">
                      <n.icon size={20} className="text-navy shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[13px] font-bold text-navy">{n.label}</h3>
                          {isComingSoon && <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-surface-alt text-text-tertiary">COMING SOON</span>}
                        </div>
                        <p className="text-[10px] text-text-tertiary leading-relaxed mt-0.5">{n.desc}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Back button + section header
  const navItem = NAV.find(n => n.id === section)
  return (
    <div className="px-8 py-6 max-w-[1000px] mx-auto">
      <button onClick={() => setSection('home')} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-tertiary hover:text-navy mb-4">
        ← Back to Resources
      </button>
      <h2 className="font-display text-xl font-bold text-navy mb-1">{navItem?.label}</h2>
      <p className="text-[12px] text-text-tertiary mb-6">{navItem?.desc}</p>

      {section === 'phonological-awareness' && <ResourceGuideRenderer guide={PHONOLOGICAL_AWARENESS} />}
      {section === 'phonics-guide' && <ResourceGuideRenderer guide={PHONICS} />}
      {section === 'reading-fluency' && <ResourceGuideRenderer guide={READING_FLUENCY} />}
      {section === 'reading-skills' && <ResourceGuideRenderer guide={READING_SKILLS} />}
      {section === 'vocabulary' && <ResourceGuideRenderer guide={VOCABULARY} />}
      {section === 'grammar' && <ResourceGuideRenderer guide={GRAMMAR} />}
      {section === 'writing' && <ResourceGuideRenderer guide={WRITING} />}
      {section === 'speaking' && <ResourceGuideRenderer guide={SPEAKING} />}
      {section === 'listening' && <ResourceGuideRenderer guide={LISTENING} />}
      {section === 'classroom-management' && <ResourceGuideRenderer guide={CLASSROOM_MANAGEMENT} />}
      {/* Coming soon sections will render here as data is added */}
      {section === 'sor-progression' && <PhonicsSequence />}
      {section === 'phonics-strategies' && <PhonicsStrategies />}
      {section === 'assessment-literacy' && <AssessmentLiteracy />}
      {section === 'fluency-guide' && <ReadingFluencyGuide />}
      {section === 'subplans' && <SubPlansContent />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SUB PLANS (preserved from original)
// ═══════════════════════════════════════════════════════════════════

function SubPlansContent() {
  const { currentTeacher, showToast } = useApp()
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterClass, setFilterClass] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', english_class: currentTeacher?.english_class || 'Lily', grade: 3, description: '', how_to: '', drive_link: '' })

  const CLASSES = ['Lily', 'Camellia', 'Daisy', 'Sunflower', 'Marigold', 'Snapdragon']

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('sub_plans').select('*, teachers(english_name)').order('english_class').order('created_at', { ascending: false })
      setPlans(data || [])
      setLoading(false)
    })()
  }, [])

  const handleAdd = async () => {
    if (!form.title.trim() || !currentTeacher) return
    const { data, error } = await supabase.from('sub_plans').insert({
      title: form.title.trim(), english_class: form.english_class, grade: form.grade,
      description: form.description.trim() || null, how_to: form.how_to.trim() || null,
      drive_link: form.drive_link.trim() || null, created_by: currentTeacher.id,
    }).select('*, teachers(english_name)').single()
    if (error) { showToast('Error: ' + error.message); return }
    if (data) setPlans(prev => [data, ...prev])
    setForm({ title: '', english_class: currentTeacher?.english_class || 'Lily', grade: 3, description: '', how_to: '', drive_link: '' })
    setShowForm(false)
    showToast('Sub plan added')
  }

  const handleDelete = async (id: string) => {
    await supabase.from('sub_plans').delete().eq('id', id)
    setPlans(prev => prev.filter(p => p.id !== id))
    showToast('Deleted')
  }

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  const filtered = filterClass === 'all' ? plans : plans.filter(p => p.english_class === filterClass)
  const grouped: Record<string, any[]> = {}
  filtered.forEach(p => {
    const key = p.english_class + ' (Grade ' + p.grade + ')'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(p)
  })

  return (
    <div>
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-[11px] text-red-800">
        Each teacher uploads sub plans for their class. Include lesson descriptions, how to administer, and optionally link to Google Drive materials.
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          <button onClick={() => setFilterClass('all')}
            className={'px-3 py-1.5 rounded-lg text-[11px] font-medium ' + (filterClass === 'all' ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary border border-border')}>All</button>
          {CLASSES.map(c => (
            <button key={c} onClick={() => setFilterClass(c)}
              className={'px-3 py-1.5 rounded-lg text-[11px] font-medium ' + (filterClass === c ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary border border-border')}>{c}</button>
          ))}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white">{showForm ? 'Cancel' : '+ Add Sub Plan'}</button>
      </div>

      {showForm && (
        <div className="bg-surface border border-border rounded-xl p-5 mb-5 space-y-3">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Lesson title"
            className="w-full px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface" />
          <div className="flex gap-3">
            <select value={form.english_class} onChange={e => setForm(f => ({ ...f, english_class: e.target.value }))}
              className="px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none">
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: +e.target.value }))}
              className="px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none">
              {[1,2,3,4,5].map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description of the lesson (what students will do)"
            className="w-full px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none resize-none h-16" />
          <textarea value={form.how_to} onChange={e => setForm(f => ({ ...f, how_to: e.target.value }))} placeholder="How to administer (step-by-step for the substitute)"
            className="w-full px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none resize-none h-16" />
          <input value={form.drive_link} onChange={e => setForm(f => ({ ...f, drive_link: e.target.value }))} placeholder="Google Drive link (optional)"
            className="w-full px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none" />
          <button onClick={handleAdd} disabled={!form.title.trim()} className="px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white disabled:opacity-40">Save Sub Plan</button>
        </div>
      )}

      {Object.keys(grouped).length === 0 && <p className="text-center text-text-tertiary py-8 text-[12px]">No sub plans yet. Add one for your class.</p>}

      {Object.entries(grouped).map(([key, items]) => (
        <div key={key} className="mb-5">
          <h3 className="text-[13px] font-bold text-navy mb-2">{key}</h3>
          <div className="space-y-2">
            {items.map((p: any) => (
              <div key={p.id} className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <h4 className="text-[13px] font-semibold text-navy">{p.title}</h4>
                  <div className="flex items-center gap-2">
                    {p.drive_link && <a href={p.drive_link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline font-medium">Google Drive</a>}
                    {currentTeacher?.id === p.created_by && <button onClick={() => handleDelete(p.id)} className="text-[10px] text-red-400 hover:text-red-600">Delete</button>}
                  </div>
                </div>
                {p.description && <p className="text-[11px] text-text-primary leading-relaxed mt-1">{p.description}</p>}
                {p.how_to && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-[9px] font-bold text-amber-700 uppercase mb-0.5">How to Administer:</p>
                    <p className="text-[10px] text-amber-800 leading-relaxed whitespace-pre-line">{p.how_to}</p>
                  </div>
                )}
                <p className="text-[9px] text-text-tertiary mt-2">Added by {p.teachers?.english_name || 'Unknown'} on {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
