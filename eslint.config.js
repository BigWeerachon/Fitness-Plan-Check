// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-plugin-prettier/recommended');
const i18next = require('eslint-plugin-i18next');

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    // ข้อความที่ผู้ใช้เห็นต้องมาจาก i18n เท่านั้น (SPEC ฌ) — ตรวจเฉพาะข้อความใน JSX
    files: ['src/app/**/*.tsx', 'src/components/**/*.tsx', 'src/features/**/*.tsx'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          'jsx-attributes': {
            include: [
              'accessibilityLabel',
              'accessibilityHint',
              'placeholder',
              'title',
              'label',
              'subtitle',
              'message',
              'hint',
              'caption',
            ],
          },
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.js', 'jest.setup.js', '*.config.js'],
    languageOptions: {
      globals: { __dirname: 'readonly', require: 'readonly', module: 'writable', process: 'readonly' },
    },
  },
  {
    files: ['__tests__/**', 'jest.setup.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    ignores: ['dist/*', 'ios/*', 'android/*', 'coverage/*', 'supabase/functions/**', 'drizzle/*', '.expo/*'],
  },
]);
