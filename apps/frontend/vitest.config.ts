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
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,ts,vue}'],
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