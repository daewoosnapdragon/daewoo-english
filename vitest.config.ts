import { defineConfig } from 'vitest/config'
import path from 'path'

// Unit tests for the maths that must not move during the UI overhaul:
// weighted domain grades, the grading scale, level-test composites and
// placement, answer-key rules. Run with `npm test`.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { include: ['src/**/__tests__/**/*.test.ts'], environment: 'node' },
})
