/**
 * ESLint flat config (ESLint 9).
 *
 * Formatting is Prettier's job; eslint-config-prettier switches off any rule that
 * would conflict with it. Rules downgraded to "warn" in LEGACY_WARNINGS were already
 * broken in the code when linting was introduced (FN-06): they're reported but don't
 * fail CI. Fix them as the affected code is touched, then promote them to "error".
 */
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

const LEGACY_WARNINGS = {
  'no-unused-vars': 'warn',
};

export default [
  { ignores: ['dist/', 'node_modules/', '.wrangler/', 'coverage/'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      // The app doesn't use PropTypes; component contracts are covered by tests instead.
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['worker/**/*.js', 'shared/**/*.js'],
    languageOptions: { globals: globals.serviceworker },
  },
  {
    files: ['scripts/**/*.{js,mjs}', 'test/**/*.js', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
  { rules: LEGACY_WARNINGS },
  prettier,
];
