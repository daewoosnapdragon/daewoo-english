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
    <div className="bg-white rounded-xl border border-sand-200 overflow-hidden">
      <div className="bg-vault-50 border-b border-vault-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="content_cut" size={20} className="text-vault-600" />
          <h3 className="font-semibold text-sm text-vault-900">PDF Cleaner & Splitter</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-vault-100 rounded">
          <Icon name="close" size={18} className="text-vault-600" />
        </button>
      </div>

      <div className="p-4">
        {/* Loading states */}
        {(step === 'extracting' || step === 'analyzing') && (
          <div className="text-center py-6">
            <div className="w-8 h-8 border-3 border-vault-200 border-t-vault-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600">
              {step === 'extracting' ? 'Reading PDF pages...' : 'AI is analyzing pages...'}
            </p>
            <p className="text-xs text-gray-400 mt-1">This may take 15-30 seconds</p>
          </div>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <div className="text-center py-6">
            <div className="w-8 h-8 border-3 border-vault-200 border-t-vault-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600">Processing PDF...</p>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="text-center py-6">
            <Icon name="check_circle" size={40} className="text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-700 font-medium">Done! PDF has been cleaned.</p>
          </div>
        )}

        {/* Error */}
        {error && step === 'review' && !sections.length && (
          <div className="text-center py-4">
            <Icon name="error" size={32} className="text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={() => { setError(''); startAnalysis(); }}
              className="mt-3 text-sm text-vault-600 hover:underline">
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
                  <Icon name="delete_sweep" size={18} className="text-red-500" />
                  <p className="text-sm font-medium text-gray-800">
                    {junkPages.length} junk page{junkPages.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => toggleJunk(page)}
                      className={`w-8 h-8 text-xs font-medium rounded transition-colors ${
                        junkPages.includes(page)
                          ? 'bg-red-100 text-red-700 border-2 border-red-300 line-through'
                          : 'bg-sand-50 text-gray-600 border border-sand-200 hover:bg-sand-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Click page numbers to toggle junk status</p>
              </div>
            )}

            {/* Content sections */}
            {sections.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="description" size={18} className="text-green-600" />
                  <p className="text-sm font-medium text-gray-800">{sections.length} content section{sections.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="space-y-1">
                  {sections.map((sec, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-sand-50 rounded-lg text-xs">
                      <span className="text-gray-400 w-16 flex-shrink-0">pg {sec.start}{sec.end !== sec.start ? `-${sec.end}` : ''}</span>
                      <span className={`px-1.5 py-0.5 rounded font-medium ${
                        sec.type === 'answer_key' ? 'bg-amber-50 text-amber-700' :
                        sec.type === 'passage' ? 'bg-blue-50 text-blue-700' :
                        sec.type === 'assessment' ? 'bg-purple-50 text-purple-700' :
                        'bg-green-50 text-green-700'
                      }`}>{sec.type}</span>
                      <span className="text-gray-700 flex-1 truncate">{sec.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-sand-200">
              {junkPages.length > 0 && (
                <button onClick={handleClean}
                  className="flex-1 bg-vault-500 hover:bg-vault-600 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                  <Icon name="cleaning_services" size={16} />
                  Remove {junkPages.length} Junk Page{junkPages.length !== 1 ? 's' : ''}
                </button>
              )}
              {sections.length > 1 && (
                <button onClick={handleSplit}
                  className="flex-1 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
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
