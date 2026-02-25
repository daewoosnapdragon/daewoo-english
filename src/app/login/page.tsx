'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

type Mode = 'choose' | 'teacher';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const supabase = createClient();

  async function handleTeacherSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setMessage('');
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
      if (error) setError(error.message); else setMessage('Check your email for a confirmation link!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message); else window.location.href = '/';
    }
    setLoading(false);
  }

  async function handleViewerEnter() {
    setViewerLoading(true); setError('');
    try {
      const res = await fetch('/api/viewer-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (!res.ok) { const err = await res.json(); setError(err.error || 'Viewer access not available'); setViewerLoading(false); return; }
      const { email: ve, password: vp } = await res.json();
      const { error } = await supabase.auth.signInWithPassword({ email: ve, password: vp });
      if (error) setError(error.message); else window.location.href = '/';
    } catch (e: any) { setError(e.message); }
    setViewerLoading(false);
  }

  if (mode === 'choose') {
    return (
      <div className="min-h-screen bg-cyber-bg flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-cyber-fg rounded-none mb-4">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 40 }}>library_books</span>
            </div>
            <h1 className="text-4xl font-black text-cyber-fg">TeacherVault</h1>
            <p className="text-cyber-dim mt-2 text-lg">AI-Powered Resource Library</p>
            <div style={{ fontSize: 14, color: '#e0a0b0', marginTop: 12, animation: 'billBreathe 3s ease-in-out infinite' }}>{'( ◕‿◕ )ノ hi!'}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setMode('teacher')} className="bg-cyber-bg rounded-none border-2 border-cyber-border hover:border-cyber-fg p-6 text-center transition-all hover:shadow-lg group">
              <div className="w-16 h-16 bg-cyber-surface rounded-none flex items-center justify-center mx-auto mb-4 group-hover:bg-cyber-surface transition-colors">
                <span className="material-symbols-outlined text-cyber-fg" style={{ fontSize: 32 }}>school</span>
              </div>
              <h3 className="font-bold text-cyber-fg text-lg mb-1">Teacher</h3>
              <p className="text-sm text-cyber-dim">Full access — upload, edit, AI tools</p>
            </button>
            <button onClick={handleViewerEnter} disabled={viewerLoading} className="bg-cyber-bg rounded-none border-2 border-cyber-border hover:border-cyber-fg p-6 text-center transition-all hover:shadow-lg group disabled:opacity-60">
              <div className="w-16 h-16 bg-cyber-surface rounded-none flex items-center justify-center mx-auto mb-4 group-hover:bg-cyber-surface transition-colors">
                {viewerLoading
                  ? <span className="block w-8 h-8 border-[3px] border-cyber-border border-t-cyber-fg rounded-full animate-spin" />
                  : <span className="material-symbols-outlined text-cyber-fg" style={{ fontSize: 32 }}>visibility</span>}
              </div>
              <h3 className="font-bold text-cyber-fg text-lg mb-1">Viewer</h3>
              <p className="text-sm text-cyber-dim">{viewerLoading ? 'Signing in…' : 'Browse & download — tap to enter'}</p>
            </button>
          </div>
          {error && <div className="mt-4 p-3 bg-cyber-surface border border-red-800 rounded-none text-red-400 text-sm text-center">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <button onClick={() => { setMode('choose'); setError(''); setMessage(''); }} className="flex items-center gap-1 text-sm text-cyber-dim hover:text-cyber-fg mb-6">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span> Back
        </button>
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-cyber-surface rounded-none flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-cyber-fg" style={{ fontSize: 28 }}>school</span>
          </div>
          <h2 className="text-xl font-bold text-cyber-fg">{isSignUp ? 'Create Account' : 'Teacher Sign In'}</h2>
        </div>
        <form onSubmit={handleTeacherSubmit} className="bg-cyber-bg rounded-none shadow-sm border border-cyber-border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-cyber-fg mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2.5 border border-cyber-border rounded-none focus:ring-2 focus:ring-cyber-fg focus:border-cyber-fg outline-none" placeholder="you@school.edu" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-cyber-fg mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2.5 border border-cyber-border rounded-none focus:ring-2 focus:ring-cyber-fg focus:border-cyber-fg outline-none" placeholder="••••••••" required minLength={6} />
          </div>
          {error && <div className="p-3 bg-cyber-surface border border-red-800 rounded-none text-red-400 text-sm">{error}</div>}
          {message && <div className="p-3 bg-green-50 border border-green-200 rounded-none text-green-700 text-sm">{message}</div>}
          <button type="submit" disabled={loading} className="w-full bg-cyber-fg hover:bg-cyber-dim text-white font-semibold py-2.5 rounded-none transition-colors disabled:opacity-50">
            {loading ? 'Loading…' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
          <p className="text-center text-sm text-cyber-dim">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }} className="text-cyber-fg font-medium hover:underline">
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
