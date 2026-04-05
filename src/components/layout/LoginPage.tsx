'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { Teacher } from '@/types'
import { Lock, GraduationCap, Globe, ArrowRight } from 'lucide-react'

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
    <div className="min-h-screen bg-navy-deep flex flex-col items-center justify-center relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-deep via-navy-dark to-navy-deep" />
        {/* Dot grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, #FFB915 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        {/* Subtle top glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-gold/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-[380px] mx-auto px-6">
        {/* Logo and branding */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-5 border border-gold/15">
            <GraduationCap size={28} className="text-gold" />
          </div>
          <h1 className="text-white font-display text-[28px] font-bold tracking-tight">Daewoo English</h1>
          <p className="text-blue-300/30 text-[12px] mt-1.5 tracking-wide">School Management System</p>
        </div>

        {/* Login card */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-7 shadow-2xl">
          <p className="text-blue-200/40 text-[11px] font-medium mb-5 tracking-wide uppercase text-center">Sign in to continue</p>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-blue-300/30 font-semibold block mb-2 px-0.5">Teacher</label>
              <select
                value={selectedTeacherId}
                onChange={e => { setSelectedTeacherId(e.target.value); setLoginError('') }}
                className="w-full px-4 py-3 bg-white/[0.04] rounded-xl text-[13px] text-white border border-white/[0.08] outline-none focus:border-gold/40 focus:bg-white/[0.06] transition-all appearance-none cursor-pointer"
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
              <label className="text-[10px] uppercase tracking-widest text-blue-300/30 font-semibold block mb-2 px-0.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/20" />
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setLoginError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
                  placeholder="Enter password"
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.04] rounded-xl text-[13px] text-white border border-white/[0.08] outline-none focus:border-gold/40 focus:bg-white/[0.06] transition-all placeholder-blue-300/15"
                />
              </div>
            </div>
            {loginError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                <p className="text-red-400 text-[11px] font-medium">{loginError}</p>
              </div>
            )}
            <button
              onClick={handleLogin}
              className="w-full py-3 rounded-xl text-[13px] font-semibold bg-gold text-navy-dark hover:bg-gold-light transition-all mt-2 shadow-lg shadow-gold/15 flex items-center justify-center gap-2 group"
            >
              Sign In
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Language toggle */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] text-blue-300/30 hover:text-blue-200/60 transition-all"
          >
            <Globe size={13} />
            {language === 'en' ? '한국어로 전환' : 'Switch to English'}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-300/15 text-[10px] mt-10 tracking-wide">
          Daewoo Elementary School English Program
        </p>
      </div>
    </div>
  )
}
