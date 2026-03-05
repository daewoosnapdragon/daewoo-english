'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Icon from './Icon';
import type {
  SemesterPlanData, SemesterPlan, StoryPlan, StoryLesson,
  ProcedureStep, SkeletonWeek, SkeletonDay, GrammarWeek,
  PhonicsPhase, PAWeek
} from '@/types/semester-plan';

type ViewLevel = 'semester' | 'week' | 'day' | 'lesson';
type ScopeTab = 'overview' | 'phonics' | 'grammar' | 'pa';

interface SemesterPlanViewerProps {
  bookNum: number;
  moduleNum: number;
  onClose: () => void;
}

const TRACK_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  PA:      { bg: 'rgba(160,200,240,0.06)', border: 'rgba(160,200,240,0.25)', text: '#a0c8f0' },
  IR:      { bg: 'rgba(224,160,176,0.06)', border: 'rgba(224,160,176,0.25)', text: '#e0a0b0' },
  SoR:     { bg: 'rgba(180,220,160,0.06)', border: 'rgba(180,220,160,0.25)', text: '#b4dca0' },
  Grammar: { bg: 'rgba(212,180,120,0.06)', border: 'rgba(212,180,120,0.25)', text: '#d4b478' },
};

function tc(short: string) { return TRACK_COLORS[short] || TRACK_COLORS.IR; }

export default function SemesterPlanViewer({ bookNum, moduleNum, onClose }: SemesterPlanViewerProps) {
  const [plan, setPlan] = useState<SemesterPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [parseStats, setParseStats] = useState<any>(null);
  const [view, setView] = useState<ViewLevel>('semester');
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedStory, setSelectedStory] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState(0);
  const [scopeTab, setScopeTab] = useState<ScopeTab>('overview');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPlan = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/semester-plan?book=${bookNum}&module=${moduleNum}`);
      if (res.ok) setPlan(await res.json());
    } catch {}
    setLoading(false);
  }, [bookNum, moduleNum]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(''); setParseStats(null);
    const form = new FormData();
    form.append('file', file);
    form.append('book_num', String(bookNum));
    form.append('module_num', String(moduleNum));
    form.append('semester', 'Spring');
    form.append('grade', '1');
    try {
      const res = await fetch('/api/semester-plan', { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok) { setPlan(data); setParseStats(data.parse_stats); setView('semester'); }
      else setError(data.error || 'Upload failed');
    } catch (err: any) { setError(err.message); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function savePlan() {
    if (!plan || !dirty) return;
    setSaving(true);
    try {
      const res = await fetch('/api/semester-plan', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plan.id, plan_data: plan.plan_data }),
      });
      if (res.ok) setDirty(false);
    } catch {}
    setSaving(false);
  }

  function updatePlanData(updater: (d: SemesterPlanData) => void) {
    if (!plan) return;
    const copy = JSON.parse(JSON.stringify(plan.plan_data)) as SemesterPlanData;
    updater(copy);
    setPlan({ ...plan, plan_data: copy });
    setDirty(true);
  }

  const pd = plan?.plan_data;
  const weeks = pd?.weekly_skeleton || [];
  const stories = pd?.stories || [];
  const currentWeek = weeks.find(w => w.week === selectedWeek);

  function nav(level: ViewLevel, week?: number, day?: number) {
    setView(level);
    if (week !== undefined) setSelectedWeek(week);
    if (day !== undefined) setSelectedDay(day);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #1a1a1a', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(8,6,8,0.8)' }}>
        <Icon name="calendar_month" size={16} style={{ color: '#e0a0b0' }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#e0a0b0', flex: 1 }}>
          {plan?.title || 'Semester Plan'}
        </span>
        {dirty && (
          <button onClick={savePlan} disabled={saving} style={{ fontSize: 9, padding: '2px 8px', background: 'rgba(180,220,160,0.1)', border: '1px solid rgba(180,220,160,0.3)', color: '#b4dca0', cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
        <label style={{ fontSize: 9, padding: '2px 8px', background: 'rgba(224,160,176,0.08)', border: '1px solid rgba(224,160,176,0.2)', color: '#e0a0b0', cursor: 'pointer' }}>
          {uploading ? 'Parsing...' : (plan ? 'Replace .docx' : 'Upload .docx')}
          <input ref={fileRef} type="file" accept=".docx" onChange={handleUpload} style={{ display: 'none' }} />
        </label>
      </div>

      {error && <div style={{ padding: '6px 14px', fontSize: 10, color: '#d08080', background: 'rgba(208,128,128,0.06)', borderBottom: '1px solid #1a1a1a' }}>{error}</div>}

      {parseStats && (
        <div style={{ padding: '6px 14px', fontSize: 9, color: '#b4dca0', background: 'rgba(180,220,160,0.04)', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span>Parsed: {parseStats.stories} stories</span>
          <span>{parseStats.total_lessons} lessons</span>
          <span>{parseStats.skeleton_weeks} weeks</span>
          <span>{parseStats.grammar_weeks} grammar topics</span>
          <button onClick={() => setParseStats(null)} style={{ color: '#5a4a52', background: 'none', border: 'none', cursor: 'pointer', fontSize: 9 }}>dismiss</button>
        </div>
      )}

      {/* Breadcrumbs */}
      {plan && (
        <div style={{ padding: '6px 14px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, flexShrink: 0 }}>
          <BreadBtn label="Semester" active={view === 'semester'} onClick={() => nav('semester')} />
          {(view === 'week' || view === 'day' || view === 'lesson') && <>
            <span style={{ color: '#3a2a32' }}>/</span>
            <BreadBtn label={`Week ${selectedWeek}`} active={view === 'week'} onClick={() => nav('week', selectedWeek)} />
          </>}
          {(view === 'day' || view === 'lesson') && <>
            <span style={{ color: '#3a2a32' }}>/</span>
            <BreadBtn label={`Day ${selectedDay}`} active={view === 'day'} onClick={() => nav('day', selectedWeek, selectedDay)} />
          </>}
          {view === 'lesson' && <>
            <span style={{ color: '#3a2a32' }}>/</span>
            <span style={{ color: '#e0a0b0', fontWeight: 600 }}>Lesson</span>
          </>}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
            {(['overview', 'phonics', 'grammar', 'pa'] as ScopeTab[]).map(tab => (
              <button key={tab} onClick={() => setScopeTab(tab)} style={{
                fontSize: 8, padding: '2px 6px', cursor: 'pointer',
                background: scopeTab === tab ? 'rgba(224,160,176,0.1)' : 'none',
                border: scopeTab === tab ? '1px solid rgba(224,160,176,0.2)' : '1px solid transparent',
                color: scopeTab === tab ? '#e0a0b0' : '#4a3a42',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>{tab}</button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4a3a42', fontSize: 10 }}>Loading...</div>
        ) : !plan ? (
          <EmptyState onUpload={() => fileRef.current?.click()} uploading={uploading} />
        ) : scopeTab !== 'overview' ? (
          <ScopeView pd={pd!} tab={scopeTab} />
        ) : view === 'semester' ? (
          <SemesterGrid weeks={weeks} stories={stories} onWeekClick={w => nav('week', w)} />
        ) : view === 'week' ? (
          <WeekView week={currentWeek} weekNum={selectedWeek} onDayClick={d => nav('day', selectedWeek, d)}
            onPrev={selectedWeek > 1 ? () => nav('week', selectedWeek - 1) : undefined}
            onNext={selectedWeek < weeks.length ? () => nav('week', selectedWeek + 1) : undefined} />
        ) : view === 'day' ? (
          <DayView week={currentWeek} dayNum={selectedDay} stories={stories}
            onLessonClick={(si, li) => { setSelectedStory(si); setSelectedLesson(li); setView('lesson'); }}
            onPrev={selectedDay > 1 ? () => nav('day', selectedWeek, selectedDay - 1) : undefined}
            onNext={selectedDay < 5 ? () => nav('day', selectedWeek, selectedDay + 1) : undefined}
            customNote={pd?.custom_notes?.[`week-${selectedWeek}-day-${selectedDay}`] || ''}
            onNoteChange={note => updatePlanData(d => { d.custom_notes[`week-${selectedWeek}-day-${selectedDay}`] = note; })} />
        ) : view === 'lesson' ? (
          <LessonView stories={stories} storyIdx={selectedStory} lessonIdx={selectedLesson} onBack={() => setView('day')} />
        ) : null}
      </div>
    </div>
  );
}

// ── Small helpers ──
function BreadBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: active ? '#e0a0b0' : '#6a5a62', fontWeight: active ? 600 : 400, fontFamily: 'inherit', fontSize: 10 }}>{label}</button>;
}

function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 10 }}>
    <div style={{ fontSize: 8, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
    {children}
  </div>;
}

function EmptyState({ onUpload, uploading }: { onUpload: () => void; uploading: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
      <Icon name="upload_file" size={36} style={{ color: '#3a2a32', marginBottom: 12 }} />
      <div style={{ fontSize: 13, fontWeight: 600, color: '#6a5a62', marginBottom: 6 }}>No semester plan yet</div>
      <div style={{ fontSize: 10, color: '#4a3a42', marginBottom: 16, maxWidth: 280, lineHeight: 1.5 }}>
        Upload a .docx lesson plan file to parse it into the interactive planner view.
      </div>
      <button onClick={onUpload} disabled={uploading} style={{
        fontSize: 10, padding: '6px 16px', background: 'rgba(224,160,176,0.1)',
        border: '1px solid rgba(224,160,176,0.3)', color: '#e0a0b0', cursor: 'pointer', fontFamily: 'inherit',
      }}>{uploading ? 'Parsing...' : 'Upload .docx Lesson Plan'}</button>
    </div>
  );
}

// ── Semester Grid (Level 1) ──
function SemesterGrid({ weeks, stories, onWeekClick }: { weeks: SkeletonWeek[]; stories: StoryPlan[]; onWeekClick: (w: number) => void }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: '#5a4a52', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        {weeks.length} Week Overview
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {weeks.map(week => (
          <button key={week.week} onClick={() => onWeekClick(week.week)} style={{
            textAlign: 'left', padding: '8px 10px', cursor: 'pointer',
            background: 'rgba(224,160,176,0.02)', border: '1px solid #1a1a1a', transition: 'border-color 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(224,160,176,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; }}
          >
            <div style={{ fontSize: 9, fontWeight: 700, color: '#e0a0b0', marginBottom: 3 }}>Week {week.week}</div>
            <div style={{ fontSize: 8, color: '#6a5a62', marginBottom: 6, lineHeight: 1.4, minHeight: 22 }}>
              {week.title.slice(0, 60)}{week.title.length > 60 ? '...' : ''}
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {week.days.map((d, i) => {
                const c = tc(d.subject_short);
                return <span key={i} style={{ fontSize: 7, padding: '1px 4px', background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>{d.subject_short}</span>;
              })}
            </div>
          </button>
        ))}
      </div>
      {stories.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #1a1a1a' }}>
          <div style={{ fontSize: 9, color: '#5a4a52', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Stories</div>
          {stories.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, fontSize: 10 }}>
              <span style={{ color: '#e0a0b0', fontWeight: 600, minWidth: 60 }}>{s.label}</span>
              <span style={{ color: '#8a7a82' }}>{s.title}</span>
              <span style={{ color: '#4a3a42', fontSize: 8, marginLeft: 'auto' }}>{s.total_classes} classes</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Week View (Level 2) ──
function WeekView({ week, weekNum, onDayClick, onPrev, onNext }: {
  week?: SkeletonWeek; weekNum: number; onDayClick: (d: number) => void; onPrev?: () => void; onNext?: () => void;
}) {
  if (!week) return <div style={{ color: '#4a3a42', fontSize: 10 }}>Week {weekNum} not found.</div>;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {onPrev && <button onClick={onPrev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a4a52' }}><Icon name="chevron_left" size={16} /></button>}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e0a0b0' }}>Week {weekNum}</div>
          <div style={{ fontSize: 9, color: '#6a5a62', marginTop: 2 }}>{week.title}</div>
        </div>
        {onNext && <button onClick={onNext} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a4a52' }}><Icon name="chevron_right" size={16} /></button>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {week.days.map(day => {
          const c = tc(day.subject_short);
          return (
            <button key={day.day} onClick={() => onDayClick(day.day)} style={{
              textAlign: 'left', padding: '8px 10px', cursor: 'pointer',
              background: c.bg, border: `1px solid ${c.border}`,
              display: 'flex', gap: 10, alignItems: 'flex-start', transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = c.text; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; }}
            >
              <div style={{ minWidth: 44 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: c.text }}>Day {day.day}</div>
                <div style={{ fontSize: 8, color: c.text, opacity: 0.7, marginTop: 1 }}>{day.subject_short}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: '#9a8a92', marginBottom: 2 }}>{day.subject}</div>
                {day.swbat && <div style={{ fontSize: 9, color: '#7a6a72', lineHeight: 1.4 }}>SWBAT: {day.swbat.slice(0, 120)}{day.swbat.length > 120 ? '...' : ''}</div>}
                {day.standard && <div style={{ fontSize: 8, color: '#4a3a42', marginTop: 3 }}>{day.standard}</div>}
              </div>
              <Icon name="chevron_right" size={14} style={{ color: '#3a2a32', flexShrink: 0, marginTop: 2 }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Day View (Level 3) ──
function DayView({ week, dayNum, stories, onLessonClick, onPrev, onNext, customNote, onNoteChange }: {
  week?: SkeletonWeek; dayNum: number; stories: StoryPlan[];
  onLessonClick: (si: number, li: number) => void;
  onPrev?: () => void; onNext?: () => void;
  customNote: string; onNoteChange: (n: string) => void;
}) {
  const day = week?.days.find(d => d.day === dayNum);
  if (!day) return <div style={{ color: '#4a3a42', fontSize: 10 }}>Day {dayNum} not found.</div>;
  const c = tc(day.subject_short);
  const linked = findLinkedLesson(day, stories);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {onPrev && <button onClick={onPrev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a4a52' }}><Icon name="chevron_left" size={16} /></button>}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>Day {dayNum}</span>
            <span style={{ fontSize: 8, padding: '1px 6px', background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>{day.subject}</span>
          </div>
          {day.standard && <div style={{ fontSize: 9, color: '#5a4a52', marginTop: 3 }}>Standards: {day.standard}</div>}
        </div>
        {onNext && <button onClick={onNext} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a4a52' }}><Icon name="chevron_right" size={16} /></button>}
      </div>

      {day.swbat && (
        <div style={{ padding: '8px 10px', background: 'rgba(224,160,176,0.04)', border: '1px solid #1a1a1a', marginBottom: 8 }}>
          <div style={{ fontSize: 8, color: '#5a4a52', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>SWBAT</div>
          <div style={{ fontSize: 10, color: '#9a8a92', lineHeight: 1.5 }}>{day.swbat}</div>
        </div>
      )}

      {day.activities && (
        <div style={{ padding: '8px 10px', background: 'rgba(196,160,212,0.03)', border: '1px solid #1a1a1a', marginBottom: 8 }}>
          <div style={{ fontSize: 8, color: '#5a4a52', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Activities</div>
          <div style={{ fontSize: 10, color: '#8a7a82', lineHeight: 1.5 }}>{day.activities}</div>
        </div>
      )}

      {linked && (
        <button onClick={() => onLessonClick(linked.si, linked.li)} style={{
          width: '100%', textAlign: 'left', padding: '8px 10px', cursor: 'pointer',
          background: 'rgba(224,160,176,0.06)', border: '1px solid rgba(224,160,176,0.2)',
          marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="menu_book" size={14} style={{ color: '#e0a0b0' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#e0a0b0' }}>{linked.story.title} -- Class {linked.lesson.class_num}</div>
            <div style={{ fontSize: 8, color: '#6a5a62' }}>{linked.lesson.title}</div>
          </div>
          <span style={{ fontSize: 8, color: '#5a4a52' }}>View full lesson</span>
          <Icon name="chevron_right" size={12} style={{ color: '#3a2a32' }} />
        </button>
      )}

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 8, color: '#5a4a52', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>My Notes</div>
        <textarea value={customNote} onChange={e => onNoteChange(e.target.value)} placeholder="Add notes for this day..."
          style={{ width: '100%', minHeight: 48, padding: '6px 8px', fontSize: 10, background: 'rgba(224,160,176,0.02)', border: '1px solid #1a1a1a', color: '#8a7a82', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(224,160,176,0.3)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#1a1a1a'; }}
        />
      </div>
    </div>
  );
}

// ── Lesson View (Level 4) ──
function LessonView({ stories, storyIdx, lessonIdx, onBack }: {
  stories: StoryPlan[]; storyIdx: number; lessonIdx: number; onBack: () => void;
}) {
  const story = stories[storyIdx];
  const lesson = story?.lessons?.[lessonIdx];
  if (!story || !lesson) return <div style={{ color: '#4a3a42', fontSize: 10 }}>Lesson not found.</div>;

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a4a52', fontSize: 9, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10, fontFamily: 'inherit' }}>
        <Icon name="arrow_back" size={12} /> Back to day view
      </button>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 8, color: '#5a4a52', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{story.title}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e0a0b0', marginTop: 2 }}>Class {lesson.class_num}: {lesson.title}</div>
        {lesson.standards.length > 0 && (
          <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
            {lesson.standards.map((s, i) => (
              <span key={i} style={{ fontSize: 7, padding: '1px 4px', background: 'rgba(160,200,240,0.08)', border: '1px solid rgba(160,200,240,0.2)', color: '#a0c8f0' }}>{s}</span>
            ))}
          </div>
        )}
      </div>
      <Section label="SWBAT" color="#e0a0b0"><div style={{ fontSize: 10, color: '#9a8a92', lineHeight: 1.5 }}>{lesson.swbat}</div></Section>
      {lesson.materials && <Section label="Materials" color="#c4a0d4"><div style={{ fontSize: 10, color: '#8a7a82', lineHeight: 1.5 }}>{lesson.materials}</div></Section>}
      {lesson.procedure.length > 0 && (
        <Section label="Procedure" color="#b4dca0">
          {lesson.procedure.map((step, i) => (
            <div key={i} style={{ marginBottom: 8, paddingLeft: 8, borderLeft: `2px solid rgba(180,220,160,${i === 0 ? '0.4' : '0.15'})` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#b4dca0' }}>{step.label}</span>
                {step.duration_min && <span style={{ fontSize: 8, padding: '0 4px', background: 'rgba(180,220,160,0.08)', border: '1px solid rgba(180,220,160,0.2)', color: '#b4dca0' }}>{step.duration_min} min</span>}
              </div>
              <div style={{ fontSize: 10, color: '#8a7a82', lineHeight: 1.5 }}>{step.description}</div>
            </div>
          ))}
        </Section>
      )}
      {lesson.assessment && <Section label={`Assessment${lesson.assessment_type ? ` (${lesson.assessment_type})` : ''}`} color="#d4b478"><div style={{ fontSize: 10, color: '#8a7a82', lineHeight: 1.5 }}>{lesson.assessment}</div></Section>}
      {lesson.ell_supports && <Section label="ELL Supports" color="#a0c8f0"><div style={{ fontSize: 10, color: '#8a7a82', lineHeight: 1.5 }}>{lesson.ell_supports}</div></Section>}
    </div>
  );
}

// ── Scope View (Phonics/Grammar/PA tabs) ──
function ScopeView({ pd, tab }: { pd: SemesterPlanData; tab: ScopeTab }) {
  if (tab === 'phonics') return (
    <div>
      <div style={{ fontSize: 9, color: '#5a4a52', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Phonics Scope & Sequence</div>
      {pd.phonics_scope.length === 0 && <div style={{ color: '#4a3a42', fontSize: 10 }}>No phonics data parsed.</div>}
      {pd.phonics_scope.map(phase => (
        <div key={phase.id} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#b4dca0', marginBottom: 2 }}>{phase.title}</div>
          <div style={{ fontSize: 8, color: '#5a4a52', marginBottom: 6 }}>{phase.weeks_label}</div>
          {phase.items.map(item => (
            <div key={item.id} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid rgba(26,26,26,0.5)', fontSize: 9 }}>
              <span style={{ color: '#6a5a62', minWidth: 40 }}>Wk {item.week}</span>
              <span style={{ color: '#9a8a92', flex: 1 }}>{item.focus}</span>
              <span style={{ color: '#4a3a42' }}>{item.standard}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  if (tab === 'grammar') return (
    <div>
      <div style={{ fontSize: 9, color: '#5a4a52', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Grammar Scope & Sequence</div>
      {pd.grammar_scope.length === 0 && <div style={{ color: '#4a3a42', fontSize: 10 }}>No grammar data parsed.</div>}
      {pd.grammar_scope.map(item => (
        <div key={item.id} style={{ padding: '8px 10px', marginBottom: 4, background: 'rgba(212,180,120,0.03)', border: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 8, color: '#5a4a52' }}>Wk {item.week}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#d4b478' }}>#{item.topic_num} {item.topic}</span>
            <span style={{ fontSize: 8, color: '#4a3a42', marginLeft: 'auto' }}>{item.standard}</span>
          </div>
          {item.swbat && <div style={{ fontSize: 9, color: '#8a7a82', marginBottom: 2 }}>SWBAT: {item.swbat}</div>}
          {item.activities && <div style={{ fontSize: 9, color: '#7a6a72' }}>{item.activities}</div>}
        </div>
      ))}
    </div>
  );

  if (tab === 'pa') return (
    <div>
      <div style={{ fontSize: 9, color: '#5a4a52', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>PA Scope & Sequence</div>
      {pd.pa_scope.length === 0 && <div style={{ color: '#4a3a42', fontSize: 10 }}>No PA data parsed.</div>}
      {pd.pa_scope.map(item => (
        <div key={item.id} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(26,26,26,0.5)', fontSize: 9 }}>
          <span style={{ color: '#6a5a62', minWidth: 40 }}>Wk {item.week}</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#a0c8f0', fontWeight: 600 }}>{item.focus}</div>
            {item.activities && <div style={{ color: '#7a6a72', marginTop: 2 }}>{item.activities}</div>}
          </div>
          <span style={{ color: '#4a3a42' }}>{item.standard}</span>
        </div>
      ))}
    </div>
  );
  return null;
}

// ── Find linked lesson from skeleton day ──
function findLinkedLesson(day: SkeletonDay, stories: StoryPlan[]): { story: StoryPlan; lesson: StoryLesson; si: number; li: number } | null {
  const ref = day.story_reference || day.activities || '';
  for (let si = 0; si < stories.length; si++) {
    const story = stories[si];
    const classMatch = ref.match(/Class\s+(\d+)/i);
    if (classMatch && ref.toLowerCase().includes(story.title.toLowerCase().slice(0, 8))) {
      const cn = parseInt(classMatch[1]);
      const li = story.lessons.findIndex(l => l.class_num === cn);
      if (li >= 0) return { story, lesson: story.lessons[li], si, li };
    }
  }
  return null;
}
