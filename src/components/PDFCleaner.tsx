'use client';

import { useState } from 'react';
import Icon from './Icon';

interface PDFCleanerProps {
  resourceId: string;
  title: string;
  pageCount: number;
  onComplete: () => void;
  onClose: () => void;
}

interface Section {
  start: number;
  end: number;
  title: string;
  type: string;
  answer_key_for: number | null;
}

export default function PDFCleaner({ resourceId, title, pageCount, onComplete, onClose }: PDFCleanerProps) {
  const [step, setStep] = useState<'extracting' | 'analyzing' | 'review' | 'processing' | 'done'>('extracting');
  const [junkPages, setJunkPages] = useState<number[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [coverPage, setCoverPage] = useState<number | null>(null);
  const [error, setError] = useState('');

  const startAnalysis = async () => {
    setStep('extracting');
    setError('');

    try {
      // Step 1: Extract text
      const textRes = await fetch('/api/extract-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_id: resourceId }),
      });

      if (!textRes.ok) {
        const err = await textRes.json();
        throw new Error(err.error || 'Text extraction failed');
      }

      const { page_texts, page_count } = await textRes.json();

      if (!page_texts?.length || page_count < 2) {
        throw new Error('This PDF only has one page or could not be read');
      }

      // Step 2: AI analysis
      setStep('analyzing');
      const splitRes = await fetch('/api/smart-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_id: resourceId,
          page_texts,
          page_count,
          title,
        }),
      });

      if (!splitRes.ok) {
        const err = await splitRes.json();
        throw new Error(err.error || 'AI analysis failed');
      }

      const analysis = await splitRes.json();
      setJunkPages(analysis.junk_pages || []);
      setSections(analysis.sections || []);
      setCoverPage(analysis.cover_page || null);
      setStep('review');
    } catch (e: any) {
      setError(e.message);
      setStep('review');
    }
  };

  const handleClean = async () => {
    setStep('processing');
    try {
      const res = await fetch('/api/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_id: resourceId,
          junk_pages: junkPages,
          mode: 'clean',
        }),
      });
      if (!res.ok) throw new Error('Clean failed');
      setStep('done');
      onComplete();
    } catch (e: any) {
      setError(e.message);
      setStep('review');
    }
  };

  const handleSplit = async () => {
    setStep('processing');
    try {
      const res = await fetch('/api/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_id: resourceId,
          sections,
          junk_pages: junkPages,
          cover_page: coverPage,
          mode: 'split',
        }),
      });
      if (!res.ok) throw new Error('Split failed');
      setStep('done');
      onComplete();
    } catch (e: any) {
      setError(e.message);
      setStep('review');
    }
  };

  const toggleJunk = (page: number) => {
    setJunkPages(prev =>
      prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]
    );
  };

  // Auto-start analysis on mount
  if (step === 'extracting' && !error) {
    startAnalysis();
  }

  return (
    <div className="bg-cyber-bg rounded-none border border-cyber-border overflow-hidden">
      <div className="bg-cyber-surface border-b border-cyber-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="content_cut" size={20} className="text-cyber-fg" />
          <h3 className="font-semibold text-sm text-cyber-fg">PDF Cleaner & Splitter</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-cyber-surface rounded">
          <Icon name="close" size={18} className="text-cyber-fg" />
        </button>
      </div>

      <div className="p-4">
        {/* Loading states */}
        {(step === 'extracting' || step === 'analyzing') && (
          <div className="text-center py-6">
            <div className="w-8 h-8 border-3 border-cyber-border border-t-vault-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-cyber-dim">
              {step === 'extracting' ? 'Reading PDF pages...' : 'AI is analyzing pages...'}
            </p>
            <p className="text-xs text-cyber-muted mt-1">This may take 15-30 seconds</p>
          </div>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <div className="text-center py-6">
            <div className="w-8 h-8 border-3 border-cyber-border border-t-vault-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-cyber-dim">Processing PDF...</p>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="text-center py-6">
            <Icon name="check_circle" size={40} className="text-cyber-lilac mx-auto mb-2" />
            <p className="text-sm text-cyber-fg font-medium">Done! PDF has been cleaned.</p>
          </div>
        )}

        {/* Error */}
        {error && step === 'review' && !sections.length && (
          <div className="text-center py-4">
            <Icon name="error" size={32} className="text-cyber-dim mx-auto mb-2" />
            <p className="text-sm text-cyber-fg">{error}</p>
            <button onClick={() => { setError(''); startAnalysis(); }}
              className="mt-3 text-sm text-cyber-fg hover:underline">
              Try again
            </button>
          </div>
        )}

        {/* Review results */}
        {step === 'review' && (sections.length > 0 || junkPages.length > 0) && (
          <div className="space-y-4">
            {/* Junk pages */}
            {junkPages.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="delete_sweep" size={18} className="text-cyber-dim" />
                  <p className="text-sm font-medium text-cyber-fg">
                    {junkPages.length} junk page{junkPages.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => toggleJunk(page)}
                      className={`w-8 h-8 text-xs font-medium rounded-none transition-colors ${
                        junkPages.includes(page)
                          ? 'bg-cyber-surface text-cyber-muted border-2 border-cyber-muted line-through'
                          : 'bg-cyber-surface text-cyber-dim border border-cyber-border hover:bg-cyber-surface'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-cyber-muted mt-1">Click page numbers to toggle junk status</p>
              </div>
            )}

            {/* Content sections */}
            {sections.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="description" size={18} className="text-cyber-lilac" />
                  <p className="text-sm font-medium text-cyber-fg">{sections.length} content section{sections.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="space-y-1">
                  {sections.map((sec, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-cyber-surface rounded-none text-xs">
                      <span className="text-cyber-muted w-16 flex-shrink-0">pg {sec.start}{sec.end !== sec.start ? `-${sec.end}` : ''}</span>
                      <span className={`px-1.5 py-0.5 rounded-none font-medium ${
                        sec.type === 'answer_key' ? 'badge-dim' :
                        sec.type === 'passage' ? 'badge-lilac' :
                        sec.type === 'assessment' ? 'badge-lilac' :
                        'badge-rose'
                      }`}>{sec.type}</span>
                      <span className="text-cyber-fg flex-1 truncate">{sec.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-cyber-border">
              {junkPages.length > 0 && (
                <button onClick={handleClean}
                  className="flex-1 btn-sweep px-4 py-2 text-sm font-medium flex items-center justify-center gap-1.5">
                  <Icon name="cleaning_services" size={16} />
                  Remove {junkPages.length} Junk Page{junkPages.length !== 1 ? 's' : ''}
                </button>
              )}
              {sections.length > 1 && (
                <button onClick={handleSplit}
                  className="flex-1 btn-sweep btn-sweep-lilac px-4 py-2 text-sm font-medium flex items-center justify-center gap-1.5">
                  <Icon name="content_cut" size={16} />
                  Split into {sections.length} Files
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
