'use client'

import { useState, useCallback } from 'react'

interface UseAIOptions {
  onSuccess?: (result: string) => void
  onError?: (error: string) => void
}

export function useAI(options: UseAIOptions = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (task: string, data: any): Promise<string | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, data }),
      })

      const json = await response.json()

      if (!response.ok) {
        const msg = json.error || 'AI generation failed'
        setError(msg)
        options.onError?.(msg)
        return null
      }

      options.onSuccess?.(json.result)
      return json.result
    } catch (err: any) {
      const msg = err.message || 'Network error'
      setError(msg)
      options.onError?.(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [options.onSuccess, options.onError])

  return { generate, loading, error }
}
