module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true
  },
  extends: [
    'plugin:vue/vue3-essential',
    '@vue/eslint-config-standard',
    '@vue/eslint-config-typescript/recommended',
    'plugin:prettier/recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-unused-vars': 'off', // 由TypeScript处理
    '@typescript-eslint/no-unused-vars': 'warn',
    'vue/multi-word-component-names': 'off',
    // Vite特定规则
    'import/no-absolute-path': 'off', // Vite支持绝对路径导入
    // TypeScript特定规则
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn'
  },
  overrides: [
    {
      files: ['**/*.vue'],
      parser: 'vue-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      rules: {
        // Vue特定规则
        'no-undef': 'off' // 在Vue文件中关闭，由TypeScript处理
      }
    },
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      rules: {
        // TypeScript文件特定规则
        '@typescript-eslint/explicit-function-return-type': 'warn'
      }
    },
    {
      files: ['**/*.spec.ts', '**/*.test.ts'],
      env: {
        vitest: true
      },
      rules: {
        // 测试文件特定规则
        '@typescript-eslint/no-explicit-any': 'off'
      }
    }
  ],
  // Vite全局变量
  globals: {
    __VUE_OPTIONS_API__: 'readonly',
    __VUE_PROD_DEVTOOLS__: 'readonly'
  }
} 