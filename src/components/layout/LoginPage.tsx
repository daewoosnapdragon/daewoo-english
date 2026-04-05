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
    <div className="min-h-screen flex flex-col items-center justify-center relative" style={{ background: '#E8ECF1' }}>
      <div className="relative z-10 w-full max-w-[380px] mx-auto px-6">
        {/* Logo — neumorphic raised circle */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-neu-raised" style={{ background: '#E8ECF1' }}>
            <GraduationCap size={28} className="text-navy" />
          </div>
          <h1 className="text-navy-deep text-[28px] font-bold tracking-tight">Daewoo English</h1>
          <p className="text-text-tertiary text-[12px] mt-1.5 tracking-wide">School Management System</p>
        </div>

        {/* Login card — neumorphic raised panel */}
        <div className="neu-card p-8">
          <p className="text-text-tertiary text-[10px] font-semibold mb-6 tracking-[0.15em] uppercase text-center">Sign in to continue</p>
          <div className="space-y-5">
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary font-semibold block mb-2.5 pl-1">Teacher</label>
              <select
                value={selectedTeacherId}
                onChange={e => { setSelectedTeacherId(e.target.value); setLoginError('') }}
                className="neu-input w-full cursor-pointer appearance-none"
              >
                <option value="">Select your name...</option>
                {loginTeachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.role === 'admin' ? '(Admin)' : `-- ${t.english_class}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary font-semibold block mb-2.5 pl-1">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary/50" />
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setLoginError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
                  placeholder="Enter password"
                  className="neu-input w-full pl-11"
                />
              </div>
            </div>
            {loginError && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{
                boxShadow: 'inset 2px 2px 4px rgba(220,38,38,0.1), inset -2px -2px 4px rgba(255,255,255,0.5)',
                background: '#E8ECF1',
              }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <p className="text-red-600 text-[11px] font-medium">{loginError}</p>
              </div>
            )}
            <button
              onClick={handleLogin}
              className="neu-btn-primary w-full py-3.5 text-[14px] flex items-center justify-center gap-2 group mt-2"
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
            className="neu-btn inline-flex items-center gap-2 px-4 py-2 text-[11px] text-text-secondary"
          >
            <Globe size={13} />
            {language === 'en' ? '한국어로 전환' : 'Switch to English'}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-text-tertiary/50 text-[10px] mt-10 tracking-wide">
          Daewoo Elementary School English Program
        </p>
      </div>
    </div>
  )
}
