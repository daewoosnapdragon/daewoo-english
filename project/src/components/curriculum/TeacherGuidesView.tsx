'use client'

import { useState } from 'react'
import { Layers, Music, BarChart3, Volume2 } from 'lucide-react'
import { PhonicsSequence, PhonicsStrategies, AssessmentLiteracy, ReadingFluencyGuide } from '@/components/curriculum/TeacherReferences'

type GuideTab = 'phonics-seq' | 'phonics-strat' | 'assessment' | 'fluency'

export default function TeacherGuidesView() {
  const [tab, setTab] = useState<GuideTab>('phonics-seq')

  const tabs: { id: GuideTab; label: string; icon: typeof Layers }[] = [
    { id: 'phonics-seq', label: 'Phonics Sequence', icon: Layers },
    { id: 'phonics-strat', label: 'Phonics Strategies', icon: Music },
    { id: 'assessment', label: 'Assessment Literacy', icon: BarChart3 },
    { id: 'fluency', label: 'Fluency & Comprehension', icon: Volume2 },
  ]

  return (
    <div className="animate-fade-in">
      <div className="bg-surface border-b border-border px-8 py-5">
        <h2 className="font-display text-2xl font-bold text-navy">Teacher Guides</h2>
        <p className="text-[13px] text-text-secondary mt-1">Research-backed reference materials for structured literacy and assessment</p>
        <div className="flex gap-1 mt-4">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all ${
                tab === t.id ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'
              }`}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-8 py-6">
        {tab === 'phonics-seq' && <PhonicsSequence />}
        {tab === 'phonics-strat' && <PhonicsStrategies />}
        {tab === 'assessment' && <AssessmentLiteracy />}
        {tab === 'fluency' && <ReadingFluencyGuide />}
      </div>
    </div>
  )
}
