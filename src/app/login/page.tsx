'use client';

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
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setMessage('Check your email for a confirmation link!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.href = '/';
    }
    setLoading(false);
  }

  async function handleViewerEnter() {
    setViewerLoading(true); setError('');

    try {
      // Get viewer credentials from server (no password needed)
      const res = await fetch('/api/viewer-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Viewer access not available');
        setViewerLoading(false);
        return;
      }

      const { email: viewerEmail, password: vp } = await res.json();

      // Sign in with the viewer credentials
      const { error } = await supabase.auth.signInWithPassword({
        email: viewerEmail,
        password: vp,
      });

      if (error) setError(error.message);
      else window.location.href = '/';
    } catch (e: any) {
      setError(e.message);
    }
    setViewerLoading(false);
  }

  if (mode === 'choose') {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-vault-500 rounded-3xl mb-4 shadow-lg">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 40 }}>library_books</span>
            </div>
            <h1 className="text-4xl font-black text-gray-900">TeacherVault</h1>
            <p className="text-sand-600 mt-2 text-lg">AI-Powered Resource Library</p>
          </div>

          {/* Role cards */}
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setMode('teacher')}
              className="bg-white rounded-2xl border-2 border-sand-200 hover:border-vault-400 p-6 text-center transition-all hover:shadow-lg group">
              <div className="w-16 h-16 bg-vault-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-vault-200 transition-colors">
                <span className="material-symbols-outlined text-vault-600" style={{ fontSize: 32 }}>school</span>
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">Teacher</h3>
              <p className="text-sm text-gray-500">Full access — upload, edit, AI tools</p>
            </button>

            <button onClick={handleViewerEnter} disabled={viewerLoading}
              className="bg-white rounded-2xl border-2 border-sand-200 hover:border-indigo-400 p-6 text-center transition-all hover:shadow-lg group disabled:opacity-60">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-200 transition-colors">
                {viewerLoading ? (
                  <span className="block w-8 h-8 border-[3px] border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-indigo-600" style={{ fontSize: 32 }}>visibility</span>
                )}
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">Viewer</h3>
              <p className="text-sm text-gray-500">
                {viewerLoading ? 'Signing in...' : 'Browse & download — tap to enter'}
              </p>
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">{error}</div>
          )}
        </div>
      </div>
    );
  }

  // Teacher login
  return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <button onClick={() => { setMode('choose'); setError(''); setMessage(''); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span> Back
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-vault-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-vault-600" style={{ fontSize: 28 }}>school</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{isSignUp ? 'Create Account' : 'Teacher Sign In'}</h2>
          <p className="text-sm text-gray-500 mt-1">Full access to all features</p>
        </div>

        <form onSubmit={handleTeacherSubmit} className="bg-white rounded-2xl shadow-sm border border-sand-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-sand-200 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-vault-500 outline-none"
              placeholder="you@school.edu" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-sand-200 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-vault-500 outline-none"
              placeholder="••••••••" required minLength={6} />
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          {message && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{message}</div>}

          <button type="submit" disabled={loading}
            className="w-full bg-vault-500 hover:bg-vault-600 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-gray-500">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
              className="text-vault-600 font-medium hover:underline">
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
