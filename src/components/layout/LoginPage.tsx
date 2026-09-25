'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { Teacher } from '@/types'
import { Lock, Globe, ArrowRight } from 'lucide-react'

export default function LoginPage({ teachers }: { teachers: Teacher[] }) {
  const { setCurrentTeacher, language, setLanguage } = useApp()
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

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
    if (!teacher) { setLoginError(language === 'ko' ? '이름을 선택하세요' : 'Please select your name'); return }
    if (teacher.password && teacher.password !== password) {
      setLoginError(language === 'ko' ? '비밀번호가 틀렸습니다' : 'Incorrect password')
      return
    }
    setCurrentTeacher(teacher)
    sessionStorage.setItem('daewoo_teacher_id', teacher.id)
    setPassword('')
  }

  const label = 'eyebrow block mb-2'
  const field = 'w-full h-11 px-3.5 bg-surface border border-rule-2 rounded text-[14px] text-ink placeholder:text-ink-3'

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-8">
          <p className="eyebrow eyebrow-accent mb-3">Daewoo Elementary · English Program</p>
          <h1 className="font-display text-[44px] leading-none text-ink">Daewoo English</h1>
          <p className="text-ink-3 text-[13px] mt-3">{language === 'ko' ? '기록을 열려면 로그인하세요' : 'Sign in to open the record'}</p>
        </div>

        <div className="border-t border-b border-rule-2 py-7 space-y-5">
          <div>
            <label htmlFor="login-teacher" className={label}>{language === 'ko' ? '교사' : 'Teacher'}</label>
            <select id="login-teacher" value={selectedTeacherId}
              onChange={e => { setSelectedTeacherId(e.target.value); setLoginError('') }} className={field}>
              <option value="">{language === 'ko' ? '이름 선택…' : 'Select your name…'}</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} {t.role === 'admin' ? '(Admin)' : `· ${t.english_class}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="login-password" className={label}>{language === 'ko' ? '비밀번호' : 'Password'}</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
              <input id="login-password" type="password" value={password}
                onChange={e => { setPassword(e.target.value); setLoginError('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
                placeholder={language === 'ko' ? '비밀번호 입력' : 'Enter password'}
                className={`${field} pl-10`} />
            </div>
          </div>
          {loginError && (
            <p className="text-bad text-[13px] font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-bad" />{loginError}
            </p>
          )}
          <button onClick={handleLogin}
            className="w-full h-11 bg-accent hover:bg-accent-hover text-white rounded text-[14px] font-semibold flex items-center justify-center gap-2 group">
            {language === 'ko' ? '로그인' : 'Sign in'}
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="mt-6 text-center">
          <button onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
            className="inline-flex items-center gap-2 text-[12.5px] text-ink-2 hover:text-ink">
            <Globe size={13} />{language === 'en' ? '한국어로 전환' : 'Switch to English'}
          </button>
        </div>
      </div>
    </div>
  )
}
