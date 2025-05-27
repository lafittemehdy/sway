import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  { ignores: ['dist', 'node_modules', '.turbo', 'build'] },
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
        project: './tsconfig.eslint.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs['eslint-recommended'].rules,
      ...tseslint.configs.recommended.rules,
      // ...tseslint.configs['recommended-requiring-type-checking'].rules, // Consider adding for stricter rules
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': 'off', // Disable base rule as @typescript-eslint/no-unused-vars is used
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  // Specific overrides for JS files if needed, e.g. if not using TS parser for them
  // {
  //   files: ['**/*.{js,jsx,mjs,cjs}'],
  //   languageOptions: {
  //     parserOptions: {
  //       project: null, // Don't use tsconfig for JS files
  //     },
  //   },
  //   rules: {
  //     '@typescript-eslint/explicit-function-return-type': 'off',
  //   }
  // }
];
