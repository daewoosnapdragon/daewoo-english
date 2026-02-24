'use client';

import { useState, useEffect } from 'react';
import Icon from './Icon';

interface UnitPlanViewerProps {
  bookNum: number;
  moduleNum: number;
  targetGrade?: string;
  onClose: () => void;
}

export default function UnitPlanViewer({ bookNum, moduleNum, targetGrade, onClose }: UnitPlanViewerProps) {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [section, setSection] = useState('overview');

  useEffect(() => { loadPlan(); }, [bookNum, moduleNum]);

  async function loadPlan() {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/unit-plan?book=${bookNum}&module=${moduleNum}`);
      if (res.ok) { const d = await res.json(); setPlan(d.data || d); }
    } catch {}
    setLoading(false);
  }

  async function generatePlan() {
    setGenerating(true); setError('');
    try {
      const res = await fetch('/api/unit-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_num: bookNum, module_num: moduleNum, target_grade: targetGrade || '2' }),
      });
      if (res.ok) { const d = await res.json(); setPlan(d.data || d); }
      else { const err = await res.json().catch(() => ({})); setError(err.error || 'Failed'); }
    } catch (e: any) { setError(e.message); }
    setGenerating(false);
  }

  const sections = [
    { id: 'overview', icon: 'info', label: 'Overview' },
    { id: 'goals', icon: 'flag', label: 'Stage 1' },
    { id: 'assess', icon: 'quiz', label: 'Stage 2' },
    { id: 'weekly', icon: 'calendar_today', label: 'Weekly' },
    { id: 'diff', icon: 'tune', label: 'Diff.' },
    { id: 'focus', icon: 'abc', label: 'Focus' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-sand-100 flex-shrink-0 bg-vault-50">
          <Icon name="architecture" size={20} className="text-vault-600" />
          <h2 className="text-sm font-bold text-vault-900 flex-1 truncate">
            {plan?.title || `Unit Plan — Book ${bookNum}, Module ${moduleNum}`}
          </h2>
          {plan && (
            <>
              <button onClick={generatePlan} disabled={generating}
                className="px-2 py-1 bg-vault-100 hover:bg-vault-200 text-vault-700 text-[10px] font-bold rounded-lg flex items-center gap-1">
                <Icon name="refresh" size={12} /> Regen
              </button>
              <a href={`/api/unit-plan/pdf?book=${bookNum}&module=${moduleNum}`} target="_blank" rel="noopener noreferrer"
                className="px-2 py-1 bg-vault-500 hover:bg-vault-600 text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                <Icon name="picture_as_pdf" size={12} /> PDF
              </a>
            </>
          )}
          <button onClick={onClose} className="p-1 hover:bg-vault-100 rounded-lg"><Icon name="close" size={20} /></button>
        </div>

        {error && <div className="px-4 py-2 bg-red-50 text-red-700 text-xs border-b border-red-100">{error}</div>}

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-vault-200 border-t-vault-500 rounded-full animate-spin" /></div>
        ) : !plan ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <Icon name="architecture" size={48} className="text-vault-300 mb-4" />
            <p className="text-sm text-gray-600 mb-2 text-center">Generate a UDL backwards design unit plan using your story profiles and student materials.</p>
            <p className="text-xs text-gray-400 mb-4 text-center">Story profiles must be generated first.</p>
            <button onClick={generatePlan} disabled={generating}
              className="bg-vault-500 hover:bg-vault-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50">
              {generating
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Generating (30-60s)...</>
                : <><Icon name="auto_awesome" size={16} /> Generate Unit Plan</>}
            </button>
          </div>
        ) : generating ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-8 h-8 border-2 border-vault-200 border-t-vault-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-600">Regenerating unit plan...</p>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Section nav */}
            <div className="w-32 border-r border-sand-100 py-2 overflow-y-auto flex-shrink-0 bg-sand-50/50">
              {sections.map(s => (
                <button key={s.id} onClick={() => setSection(s.id)}
                  className={`w-full flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium text-left ${
                    section === s.id ? 'bg-vault-100 text-vault-700 border-r-2 border-vault-500' : 'text-gray-500 hover:bg-sand-100'
                  }`}>
                  <Icon name={s.icon} size={14} /> {s.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {section === 'overview' && <OverviewSection p={plan} />}
              {section === 'goals' && <GoalsSection p={plan} />}
              {section === 'assess' && <AssessSection p={plan} />}
              {section === 'weekly' && <WeeklySection p={plan} />}
              {section === 'diff' && <DiffSection p={plan} />}
              {section === 'focus' && <FocusSection p={plan} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SH({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-vault-500 uppercase tracking-wide mb-1">{children}</p>;
}

function Bullet({ items, className }: { items?: string[]; className?: string }) {
  if (!items?.length) return null;
  return <ul className="space-y-0.5">{items.map((item, i) => <li key={i} className={`text-xs ${className || 'text-gray-700'}`}>• {item}</li>)}</ul>;
}

function OverviewSection({ p }: { p: any }) {
  return (
    <>
      {p.module_overview && <p className="text-xs text-gray-700 leading-relaxed">{p.module_overview}</p>}
      {p.essential_questions?.length > 0 && (
        <div><SH>Essential Questions</SH>
          {p.essential_questions.map((q: string, i: number) => (
            <p key={i} className="text-xs text-gray-800 italic mb-1">&ldquo;{q}&rdquo;</p>
          ))}
        </div>
      )}
      {p.enduring_understandings?.length > 0 && <div><SH>Enduring Understandings</SH><Bullet items={p.enduring_understandings} /></div>}
      {p.standards?.length > 0 && (
        <div><SH>Standards</SH>
          <div className="flex flex-wrap gap-1">{p.standards.map((s: string, i: number) => (
            <span key={i} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] rounded font-mono">{s}</span>
          ))}</div>
        </div>
      )}
    </>
  );
}

function GoalsSection({ p }: { p: any }) {
  const g = p.stage1_goals || {};
  return (
    <>
      <SH>Stage 1: Desired Results</SH>
      {g.knowledge?.length > 0 && <div><p className="text-[10px] font-bold text-gray-500 mb-0.5">Knowledge</p><Bullet items={g.knowledge} /></div>}
      {g.skills?.length > 0 && <div><p className="text-[10px] font-bold text-gray-500 mb-0.5">Skills</p><Bullet items={g.skills} /></div>}
      {g.dispositions?.length > 0 && <div><p className="text-[10px] font-bold text-gray-500 mb-0.5">Dispositions</p><Bullet items={g.dispositions} /></div>}
    </>
  );
}

function AssessSection({ p }: { p: any }) {
  const a = p.stage2_assessments || {};
  const pt = a.performance_task;
  const fa = a.formative || a.formative_assessments || [];
  return (
    <>
      <SH>Stage 2: Evidence</SH>
      {pt && (
        <div className="bg-vault-50 rounded-lg p-3">
          <p className="text-xs font-bold text-vault-800 mb-1">{pt.title || 'Performance Task'}</p>
          <p className="text-xs text-gray-700 mb-2">{pt.description}</p>
          {pt.criteria?.length > 0 && <Bullet items={pt.criteria} className="text-gray-600" />}
          {pt.udl_options?.length > 0 && (
            <div className="mt-2"><p className="text-[9px] font-bold text-vault-500">UDL Options</p><Bullet items={pt.udl_options} className="text-vault-600" /></div>
          )}
        </div>
      )}
      {fa.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-500 mb-1 mt-2">Formative Assessments</p>
          {fa.map((f: any, i: number) => (
            <div key={i} className="bg-sand-50 rounded-lg p-2 mb-1">
              <p className="text-xs font-medium text-gray-800">{f.title}</p>
              <p className="text-[10px] text-gray-600">{f.description}</p>
              {f.story && <p className="text-[9px] text-vault-600 mt-0.5">Story: {f.story}</p>}
              {f.standards?.length > 0 && <p className="text-[9px] text-amber-600 font-mono mt-0.5">{f.standards.join(', ')}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function WeeklySection({ p }: { p: any }) {
  const weeks = p.weekly_plan || p.stage3_learning_plan?.week_overview || [];
  if (!weeks.length) return <p className="text-xs text-gray-400">No weekly plan data.</p>;
  return (
    <>
      <SH>Stage 3: Learning Plan</SH>
      {weeks.map((w: any, i: number) => (
        <div key={i} className="border border-sand-200 rounded-xl overflow-hidden mb-2">
          <div className="bg-sand-50 px-3 py-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-vault-500 text-white text-[10px] font-black flex items-center justify-center">{w.week}</span>
            <div className="flex-1">
              <span className="text-xs font-bold text-gray-800">{w.story || w.focus}</span>
              {w.vocabulary?.length > 0 && <p className="text-[9px] text-vault-600 mt-0.5">Vocab: {w.vocabulary.join(', ')}</p>}
              {w.mentor_sentence && <p className="text-[9px] text-indigo-600 italic mt-0.5">&ldquo;{w.mentor_sentence}&rdquo;</p>}
            </div>
          </div>
          <div className="divide-y divide-sand-50">
            {(w.days || w.activities || []).map((day: any, j: number) => (
              <div key={j} className="px-3 py-2">
                <div className="flex items-start gap-2">
                  <span className="text-[9px] font-bold text-vault-500 w-7 flex-shrink-0 pt-0.5">{day.day}</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-800">{day.lesson || day.activity}</p>
                    {day.resources?.length > 0 && <p className="text-[9px] text-blue-600 mt-0.5">Resources: {day.resources.join(', ')}</p>}
                    {day.ell_support && <p className="text-[9px] text-amber-600 mt-0.5">ELL: {day.ell_support}</p>}
                    {day.standard && <p className="text-[9px] text-gray-400 font-mono mt-0.5">{day.standard}</p>}
                    {day.standards?.length > 0 && <p className="text-[9px] text-gray-400 font-mono mt-0.5">{day.standards.join(', ')}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function DiffSection({ p }: { p: any }) {
  const d = p.differentiation || {};
  return (
    <>
      <SH>Differentiation</SH>
      {(d.below?.length > 0 || d.below_level?.length > 0) && <div><p className="text-[10px] font-bold text-orange-600 mb-0.5">Below Level</p><Bullet items={d.below || d.below_level} /></div>}
      {(d.above?.length > 0 || d.above_level?.length > 0) && <div><p className="text-[10px] font-bold text-blue-600 mb-0.5">Above Level</p><Bullet items={d.above || d.above_level} /></div>}
      {d.korean_ell?.length > 0 && <div><p className="text-[10px] font-bold text-amber-600 mb-0.5">Korean ELL</p><Bullet items={d.korean_ell} className="text-amber-700" /></div>}
    </>
  );
}

function FocusSection({ p }: { p: any }) {
  return (
    <>
      {p.grammar_focus?.length > 0 && <div><SH>Grammar Focus</SH><Bullet items={p.grammar_focus} /></div>}
      {p.phonics_focus?.length > 0 && <div><SH>Phonics Focus</SH><Bullet items={p.phonics_focus} /></div>}
      {p.writing_focus?.length > 0 && <div><SH>Writing Focus</SH><Bullet items={p.writing_focus} /></div>}
      {p.vocabulary_strategy && <div><SH>Vocabulary Strategy</SH><p className="text-xs text-gray-700">{p.vocabulary_strategy}</p></div>}
      {p.cross_curricular?.length > 0 && <div><SH>Cross-Curricular</SH><Bullet items={p.cross_curricular} /></div>}
    </>
  );
}
