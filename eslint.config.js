import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import eslintConfigPrettier from 'eslint-config-prettier'
import sonarjsPlugin from 'eslint-plugin-sonarjs'

export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      'eslint.config.js',
    ],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.ts', 'scripts/**/*.ts', 'tests/**/*.ts', '*.config.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      sonarjs: sonarjsPlugin,
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      complexity: ['warn', 10],
      'sonarjs/cognitive-complexity': ['warn', 15],
    },
  },
  eslintConfigPrettier,
]
