import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // 添加测试覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'text-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,ts,vue}'],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
        'src/main.ts',
        'src/vite-env.d.ts',
        'node_modules/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        perFile: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      },
      watermarks: {
        statements: [70, 80],
        functions: [70, 80],
        branches: [70, 80],
        lines: [70, 80]
      }
    },
    alias: {
      '@': resolve(__dirname, './src'),
      'shared': resolve(__dirname, '../../packages/shared/test')
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'shared': resolve(__dirname, '../../packages/shared/test')
    }
  }
})