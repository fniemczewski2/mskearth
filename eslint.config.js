import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'public/donate-*.html', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    plugins: { react, 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...react.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react/react-in-jsx-scope': 'off',
      // Docelowo TypeScript z typami generowanymi ze schematu Supabase.
      // Do tego czasu PropTypes sa w projekcie uzywane niekonsekwentnie,
      // wiec regula nie blokuje CI.
      'react/prop-types': 'off',
      'no-console': ['error', { allow: ['error'] }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-globals': [
        'error',
        { name: 'process', message: 'W kodzie klienckim uzyj import.meta.env (src/shared/config/env.js).' },
      ],
    },
  },
  {
    files: ['api/**/*.js', 'scripts/**/*.mjs', '*.config.js'],
    languageOptions: { globals: { ...globals.node }, sourceType: 'module' },
    rules: { 'no-console': 'off', 'no-restricted-globals': 'off' },
  },
];
