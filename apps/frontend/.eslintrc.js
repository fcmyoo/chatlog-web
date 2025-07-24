module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2020: true
  },
  extends: [
    'plugin:vue/vue3-essential',
    '@vue/standard'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    requireConfigFile: false
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-unused-vars': 'warn',
    'vue/multi-word-component-names': 'off'
  },
  overrides: [
    {
      files: ['**/*.vue'],
      parser: 'vue-eslint-parser',
      parserOptions: {
        parser: {
          js: '@babel/eslint-parser',
          ts: '@typescript-eslint/parser'
        },
        ecmaVersion: 2020,
        sourceType: 'module'
      },
      rules: {
        // 允许在Vue文件中使用TypeScript语法
        'no-undef': 'off'
      }
    }
  ]
}
