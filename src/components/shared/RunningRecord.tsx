'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Play, Square, RotateCcw, X, Upload, BookOpen } from 'lucide-react'
import Overlay from '@/components/ui/Overlay'

// Word mark types
export type WordMark = 'error' | 'self_correct' | null

export interface WordData {
  word: string
  index: number
  mark: WordMark
}

export interface RunningRecordResult {
  words: WordData[]
  totalWords: number
  wordsRead: number
  errors: number
  selfCorrections: number
  cwpm: number
  accuracyRate: number
  timeSeconds: number
  scRatio: string // self-correction ratio e.g. "1:3"
}

interface Props {
  passageText: string
  passageTitle?: string
  studentName?: string
  onComplete: (result: RunningRecordResult) => void
  onClose: () => void
  initialMarks?: WordData[] // for editing existing
}

export default function RunningRecord({ passageText, passageTitle, studentName, onComplete, onClose, initialMarks }: Props) {
  const [words, setWords] = useState<WordData[]>([])
  const [timing, setTiming] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const [lastWordIdx, setLastWordIdx] = useState<number | null>(null)
  const startRef = useRef<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Parse passage into words
  useEffect(() => {
    if (initialMarks && initialMarks.length > 0) {
      setWords(initialMarks)
      return
    }
    const parsed = passageText.trim().split(/\s+/).map((w, i) => ({ word: w, index: i, mark: null as WordMark }))
    setWords(parsed)
  }, [passageText, initialMarks])

  // Timer logic
  useEffect(() => {
    if (timing) {
      startRef.current = Date.now() - (elapsed * 1000)
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (startRef.current || Date.now())) / 1000))
      }, 100)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timing])

  const handleStart = () => { setTiming(true); setFinished(false) }
  const handleStop = () => { setTiming(false); setFinished(true) }
  const handleReset = () => {
    setTiming(false); setFinished(false); setElapsed(0)
    setWords(prev => prev.map(w => ({ ...w, mark: null })))
  }

  const handleWordClick = useCallback((index: number) => {
    const w = words[index]
    if (!w) return
    // Don't allow interaction with words past the last-word marker (except to clear it)
    if (lastWordIdx !== null && index > lastWordIdx) return

    // If this word is currently the last-word marker:
    if (lastWordIdx === index) {
      // 4th click: reset — clear last word marker entirely
      setLastWordIdx(null)
      return
    }

    if (w.mark === null) {
      // 1st click: error
      setWords(prev => prev.map(wd => wd.index === index ? { ...wd, mark: 'error' as WordMark } : wd))
    } else if (w.mark === 'error') {
      // 2nd click: self-correct
      setWords(prev => prev.map(wd => wd.index === index ? { ...wd, mark: 'self_correct' as WordMark } : wd))
    } else if (w.mark === 'self_correct') {
      // 3rd click: mark as last word read + clear the mark
      setWords(prev => prev.map(wd => wd.index === index ? { ...wd, mark: null } : wd))
      setLastWordIdx(index)
    }
  }, [words, lastWordIdx])

  // Computed stats
  const totalWords = words.length
  const wordsRead = lastWordIdx !== null ? lastWordIdx + 1 : totalWords
  const readWords = lastWordIdx !== null ? words.slice(0, lastWordIdx + 1) : words
  const errors = readWords.filter(w => w.mark === 'error').length
  const selfCorrections = readWords.filter(w => w.mark === 'self_correct').length
  const timeSeconds = elapsed || 1
  const correctWords = wordsRead - errors
  const cwpm = timeSeconds > 0 ? Math.round((correctWords / timeSeconds) * 60) : 0
  const accuracyRate = wordsRead > 0 ? Math.round((correctWords / wordsRead) * 1000) / 10 : 0
  const scRatio = (errors + selfCorrections) > 0 ? `1:${Math.round((errors + selfCorrections) / Math.max(selfCorrections, 1))}` : '—'

  const handleComplete = () => {
    onComplete({
      words,
      totalWords,
      wordsRead,
      errors,
      selfCorrections,
      cwpm,
      accuracyRate,
      timeSeconds: elapsed,
      scRatio,
    })
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // Split words into lines of ~12 words for readability
  const lines: WordData[][] = []
  for (let i = 0; i < words.length; i += 12) {
    lines.push(words.slice(i, i + 12))
  }

  return (
    <Overlay><div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-[900px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface shrink-0">
          <div>
            <h2 className="font-display text-lg font-semibold text-navy flex items-center gap-2">
              <BookOpen size={20} />
              Running record
            </h2>
            <p className="text-[length:calc(11.5px*var(--ts))] text-text-tertiary mt-0.5">
              {passageTitle && <span className="font-medium text-text-secondary">{passageTitle}</span>}
              {studentName && <span> · {studentName}</span>}
              {` · ${totalWords} words`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-alt text-text-tertiary"><X size={18} /></button>
        </div>

        {/* Timer bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-paper-2 border-b border-rule text-ink shrink-0">
          <div className="flex items-center gap-3">
            {!timing && !finished && (
              <button onClick={handleStart} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-[length:calc(13px*var(--ts))] font-semibold transition-all">
                <Play size={16} /> Start timer
              </button>
            )}
            {timing && (
              <button onClick={handleStop} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bad hover:opacity-90 text-white text-[length:calc(13px*var(--ts))] font-semibold transition-all animate-pulse">
                <Square size={16} /> Stop
              </button>
            )}
            {finished && (
              <button onClick={handleReset} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rule-2 text-ink-2 hover:text-ink text-[length:calc(12px*var(--ts))] font-medium">
                <RotateCcw size={14} /> Reset
              </button>
            )}
            <span className="text-[length:calc(28px*var(--ts))] font-mono font-bold tabular-nums">{formatTime(elapsed)}</span>
          </div>
          <div className="flex items-center gap-6 text-[length:calc(12px*var(--ts))]">
            <div className="text-center">
              <div className="text-[length:calc(20px*var(--ts))] font-bold">{errors}</div>
              <div className="text-ink-3 text-[length:calc(12px*var(--ts))]">Errors</div>
            </div>
            <div className="text-center">
              <div className="text-[length:calc(20px*var(--ts))] font-bold">{selfCorrections}</div>
              <div className="text-ink-3 text-[length:calc(12px*var(--ts))]">Self-corr.</div>
            </div>
            <div className="text-center">
              <div className="text-[length:calc(20px*var(--ts))] font-bold text-gold">{finished ? cwpm : '—'}</div>
              <div className="text-ink-3 text-[length:calc(12px*var(--ts))]">CWPM</div>
            </div>
            <div className="text-center">
              <div className="text-[length:calc(20px*var(--ts))] font-bold">{finished ? `${accuracyRate}%` : '—'}</div>
              <div className="text-ink-3 text-[length:calc(12px*var(--ts))]">Accuracy</div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="px-6 py-2 bg-accent-light border-b border-border text-[length:calc(11.5px*var(--ts))] text-navy shrink-0">
          <strong>Click cycle:</strong> 1× = <span className="text-bad font-bold">error</span> · 2× = <span className="text-warn font-bold">self-correct</span> · 3× = <span className="text-info font-bold">last word read</span> · 4× = reset
        </div>

        {/* Passage words */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {lastWordIdx !== null && (
            <div className="mb-3 flex items-center justify-between bg-info-soft rounded-lg px-4 py-2 border border-info/30">
              <span className="text-[length:calc(11.5px*var(--ts))] text-info font-medium">
                Last word read: "{words[lastWordIdx]?.word}" — <span className="font-bold">{lastWordIdx + 1}/{totalWords} words</span>
                {lastWordIdx + 1 < totalWords && <span className="text-info ml-1">(student didn't finish)</span>}
              </span>
              <button onClick={() => setLastWordIdx(null)} className="text-[length:calc(11.5px*var(--ts))] text-ink-2 hover:text-ink underline underline-offset-2">Clear marker</button>
            </div>
          )}
          <div className="leading-[2.8]">
            {lines.map((line, li) => (
              <div key={li} className="flex flex-wrap gap-x-1 mb-1">
                {/* Line number */}
                <span className="text-[length:calc(11.5px*var(--ts))] text-text-tertiary w-6 text-right mr-2 mt-2 shrink-0">{li * 12 + 1}</span>
                {line.map(w => {
                  const isPastLast = lastWordIdx !== null && w.index > lastWordIdx
                  const isLastWord = lastWordIdx === w.index
                  return (
                    <button
                      key={w.index}
                      onClick={() => handleWordClick(w.index)}
                      className={`
                        px-1.5 py-1 rounded-lg text-[length:calc(16px*var(--ts))] font-medium transition-all select-none
                        ${isPastLast
                          ? 'text-ink-3 border-2 border-transparent cursor-default'
                          : isLastWord
                            ? 'bg-bad text-white border-2 border-bad ring-2 ring-bad/40 font-bold'
                            : w.mark === 'error' 
                              ? 'bg-bad-soft text-bad border-2 border-bad/40 line-through decoration-2' 
                              : w.mark === 'self_correct'
                                ? 'bg-warn-soft text-warn border-2 border-warn/40'
                                : 'hover:bg-surface-alt border-2 border-transparent text-text-primary'
                        }
                      `}
                      style={{ touchAction: 'manipulation' }}
                    >
                      {w.word}
                      {w.mark === 'self_correct' && !isPastLast && <span className="text-[length:calc(11.5px*var(--ts))] align-super ml-0.5">SC</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        {finished && (
          <div className="px-6 py-4 border-t border-border bg-surface-alt/30 flex items-center justify-between shrink-0">
            <div className="text-[length:calc(11.5px*var(--ts))] text-text-secondary space-x-4">
              <span>Words read: <strong>{wordsRead}/{totalWords}</strong></span>
              <span>Errors: <strong className="text-bad">{errors}</strong></span>
              <span>Self-corrections: <strong className="text-warn">{selfCorrections}</strong></span>
              <span>SC Ratio: <strong>{scRatio}</strong></span>
              <span>Time: <strong>{formatTime(elapsed)}</strong></span>
              <span>CWPM: <strong className="text-navy">{cwpm}</strong></span>
              <span>Accuracy: <strong className={accuracyRate >= 96 ? 'text-good' : accuracyRate >= 90 ? 'text-warn' : 'text-bad'}>{accuracyRate}%</strong></span>
            </div>
            <button onClick={handleComplete}
              className="px-5 py-2.5 rounded-xl text-[length:calc(13px*var(--ts))] font-semibold bg-accent text-white hover:bg-accent-hover transition-all">
              Save & close
            </button>
          </div>
        )}
      </div>
    </div></Overlay>
  )
}

// ─── Passage Uploader (for adding passages to the library) ─────────
export function PassageUploader({ onSave, onClose }: { onSave: (passage: { title: string; text: string; level: string; grade_range: string; source: string }) => void; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [level, setLevel] = useState('')
  const [gradeRange, setGradeRange] = useState('')
  const [source, setSource] = useState('')

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <Overlay><div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-[600px] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-lg font-semibold text-navy flex items-center gap-2"><Upload size={18} /> Add reading passage</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-alt text-text-tertiary"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-[length:calc(12px*var(--ts))] text-text-secondary font-semibold block mb-1">Passage title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. The Big Storm" className="w-full px-3 py-2 border border-border rounded-lg text-[length:calc(13px*var(--ts))] outline-none focus:border-navy" />
          </div>
          <div>
            <label className="text-[length:calc(12px*var(--ts))] text-text-secondary font-semibold block mb-1">Passage text</label>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={8} placeholder="Paste or type the full passage text here..."
              className="w-full px-3 py-2 border border-border rounded-lg text-[length:calc(13px*var(--ts))] outline-none focus:border-navy resize-y font-serif leading-relaxed" />
            <p className="text-[length:calc(11.5px*var(--ts))] text-text-tertiary mt-1">{wordCount} words</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[length:calc(12px*var(--ts))] text-ink-2 font-semibold block mb-1">Level</label>
              <input value={level} onChange={e => setLevel(e.target.value)} placeholder="e.g. F, 1.2" className="w-full px-3 py-2 border border-border rounded-lg text-[length:calc(12px*var(--ts))] outline-none focus:border-navy" />
            </div>
            <div>
              <label className="text-[length:calc(12px*var(--ts))] text-ink-2 font-semibold block mb-1">Grade range</label>
              <select value={gradeRange} onChange={e => setGradeRange(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[length:calc(12px*var(--ts))] outline-none focus:border-navy bg-surface">
                <option value="">Any</option>
                <option value="1">Grade 1</option>
                <option value="1-2">Grades 1-2</option>
                <option value="2-3">Grades 2-3</option>
                <option value="3-4">Grades 3-4</option>
                <option value="4-5">Grades 4-5</option>
              </select>
            </div>
            <div>
              <label className="text-[length:calc(12px*var(--ts))] text-ink-2 font-semibold block mb-1">Source</label>
              <input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. NAEP, custom" className="w-full px-3 py-2 border border-border rounded-lg text-[length:calc(12px*var(--ts))] outline-none focus:border-navy" />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[length:calc(13px*var(--ts))] font-medium text-text-secondary hover:bg-surface-alt">Cancel</button>
          <button onClick={() => { if (title && text.trim()) onSave({ title, text: text.trim(), level, grade_range: gradeRange, source }) }}
            disabled={!title || !text.trim()}
            className="px-5 py-2 rounded-lg text-[length:calc(13px*var(--ts))] font-semibold bg-accent text-white hover:bg-accent-hover disabled:opacity-40">
            Save passage ({wordCount} words)
          </button>
        </div>
      </div>
    </div></Overlay>
  )
}
