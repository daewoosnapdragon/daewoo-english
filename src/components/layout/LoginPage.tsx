'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { Teacher } from '@/types'
import { Lock, GraduationCap, Globe } from 'lucide-react'

export default function LoginPage({ teachers }: { teachers: Teacher[] }) {
  const { setCurrentTeacher, language, setLanguage } = useApp()
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const loginTeachers = teachers

  useEffect(() => {
    const savedId = sessionStorage.getItem('daewoo_teacher_id')
    if (savedId) {
      const teacher = teachers.find(t => t.id === savedId)
      if (teacher) setCurrentTeacher(teacher)
    }
  }, [teachers, setCurrentTeacher])

  const handleLogin = () => {
    setLoginError('')
    const teacher = teachers.find(t => t.id === selectedTeacherId)
    if (!teacher) { setLoginError('Please select your name'); return }
    if (teacher.password && teacher.password !== password) {
      setLoginError('Incorrect password')
      return
    }
    setCurrentTeacher(teacher)
    sessionStorage.setItem('daewoo_teacher_id', teacher.id)
    setPassword('')
  }

  return (
    <div className="min-h-screen bg-navy-dark flex flex-col items-center justify-center relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-navy opacity-50 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gold/5 blur-3xl" />
        <div className="absolute top-1/4 right-0 w-[300px] h-[300px] rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto px-6">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gold/15 flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-gold/20">
            <GraduationCap size={32} className="text-gold" />
          </div>
          <h1 className="text-white font-display text-2xl font-bold tracking-tight">Daewoo English</h1>
          <p className="text-blue-300/40 text-[13px] mt-1">School Management System</p>
        </div>

        {/* Login card */}
        <div className="bg-white/[0.04] backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl">
          <p className="text-blue-200/60 text-[12px] font-medium mb-4 text-center">Sign in to continue</p>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-blue-300/40 font-semibold block mb-1.5 px-1">Teacher</label>
              <select
                value={selectedTeacherId}
                onChange={e => { setSelectedTeacherId(e.target.value); setLoginError('') }}
                className="w-full px-3.5 py-3 bg-white/[0.06] rounded-xl text-[13px] text-white border border-white/10 outline-none focus:border-gold/50 transition-colors appearance-none cursor-pointer"
              >
                <option value="" className="bg-navy-dark">Select your name...</option>
                {loginTeachers.map(t => (
                  <option key={t.id} value={t.id} className="bg-navy-dark">
                    {t.name} {t.role === 'admin' ? '(Admin)' : `-- ${t.english_class}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-blue-300/40 font-semibold block mb-1.5 px-1">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-300/30" />
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setLoginError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-3.5 py-3 bg-white/[0.06] rounded-xl text-[13px] text-white border border-white/10 outline-none focus:border-gold/50 transition-colors placeholder-blue-300/20"
                />
              </div>
            </div>
            {loginError && (
              <p className="text-red-400 text-[11px] font-medium px-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                {loginError}
              </p>
            )}
            <button
              onClick={handleLogin}
              className="w-full py-3 rounded-xl text-[13px] font-semibold bg-gold text-navy-dark hover:bg-gold-light transition-all mt-1 shadow-lg shadow-gold/20"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Language toggle */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] text-blue-200/50 hover:text-white hover:bg-white/5 transition-all"
          >
            <Globe size={14} />
            {language === 'en' ? '한국어로 전환' : 'Switch to English'}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-300/20 text-[10px] mt-8">
          Daewoo Elementary School English Program
        </p>
      </div>
    </div>
  )
}
