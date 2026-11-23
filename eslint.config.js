import { config as uglyAppConfig } from 'ugly-app/eslint';

export default [
  {
    files: ['**/*.{ts,tsx}'],
  },
  {
    ignores: [
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
      'dist/**',
      'node_modules/**',
      'vite.config.ts',
      'vitest.config.ts',
      'playwright.config.ts',
      'tests/**',
      'scripts/**',
      // Opt-in scaffold features live under `_features/` and are excluded from
      // tsconfig `include` until a user enables one. Typed linting (project:true)
      // errors on files outside the TS project, so ignore them here to match.
      '_features/**',
    ],
  },
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },
    },
  },
  ...uglyAppConfig,
];
