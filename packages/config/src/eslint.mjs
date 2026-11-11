// Gemeinsame ESLint-Basis (flat config) für alle Apps und Pakete.
import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    name: 'psyber/ignores',
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-pages/**',
      '**/.astro/**',
      '**/.wrangler/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'reports/**',
      'shots/**',
      '**/worker-configuration.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  ...astro.configs['flat/recommended'],
  {
    name: 'psyber/base',
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2023 },
    },
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-var': 'error',
      'prefer-const': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    name: 'psyber/astro',
    files: ['**/*.astro'],
    rules: {
      // Inline-Styles und Inline-Skripte widersprechen der strikten CSP.
      'astro/no-set-html-directive': 'off',
      'astro/no-unused-css-selector': 'off',
    },
  },
  {
    name: 'psyber/node',
    files: [
      '**/*.config.{js,mjs,ts}',
      '**/scripts/**/*.{js,mjs,ts}',
      'e2e/**/*.ts',
      'packages/config/**/*.mjs',
    ],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'off' },
  },
  {
    name: 'psyber/worker',
    files: ['apps/api/**/*.ts'],
    languageOptions: { globals: { ...globals.serviceworker } },
    // Logs sind die Betriebsanzeige des Workers. Inhalte von Anfragen werden nie geloggt.
    rules: { 'no-console': 'off' },
  },
  {
    name: 'psyber/types',
    files: ['**/*.d.ts'],
    rules: { '@typescript-eslint/triple-slash-reference': 'off' },
  },
];

export default config;
