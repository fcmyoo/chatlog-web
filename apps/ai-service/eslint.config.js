module.exports = {
  parser: '@typescript-eslint/parser', // 使用 TypeScript 解析器
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended', // 使用 TypeScript 推荐规则
    'prettier/@typescript-eslint', // 使 ESLint 与 Prettier 兼容
    'plugin:prettier/recommended' // 启用 Prettier 规则
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true // 如果使用 React
    }
  },
  rules: {
    // 自定义规则
    '@typescript-eslint/no-explicit-any': 'warn', // 警告使用 any 类型
    '@typescript-eslint/explicit-module-boundary-types': 'off', // 关闭强制模块边界类型
    'prettier/prettier': 'error' // 强制 Prettier 格式
  },
  env: {
    node: true,
    es6: true,
    jest: true // 如果使用 Jest 进行测试
  }
};