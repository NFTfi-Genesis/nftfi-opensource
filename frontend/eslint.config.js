import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import importPlugin from 'eslint-plugin-import'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'

export default tseslint.config([
  {
    ignores: ['dist'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // --------------------------------- Main codebase rules ---------------------------------
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['*.config.js', '*.config.ts', '*.config.d.ts', 'src/untyped-modules.d.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'import': importPlugin,
      '@typescript-eslint': tseslint.plugin,
      '@stylistic': stylistic,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // TODO: Enable and fix issues eventually
      // 'react-refresh/only-export-components': [
      //   'warn',
      //   { allowConstantExport: true },
      // ],
      'eol-last': ['error', 'always'],

      // ----------------------------- Import rules -----------------------------
      'import/no-default-export': 'error',
      'no-duplicate-imports': 'error',
      'import/newline-after-import': 'error',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            {
              pattern: 'src/**',
              group: 'internal',
            },
          ],
          pathGroupsExcludedImportTypes: ['internal'],
        },
      ],
      // ----------------------------------------------------------------------------

      // ----------------------------- Semi-colon rules -----------------------------
      semi: 'off',
      '@stylistic/semi': ['error', 'never'],
      'no-extra-semi': 'error',

      '@stylistic/member-delimiter-style': [
        'error',
        {
          multiline: { delimiter: 'none', requireLast: true },
          singleline: { delimiter: 'comma', requireLast: false },
        },
      ],

      // ----------------------------------------------------------------------------

      // ----------------------------- Unused vars rules -----------------------------
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // ----------------------------------------------------------------------------

      // ----------------------------- Type-checking rules -----------------------------
      // Catches comparisons that are always true/false due to type narrowing
      // TODO: Disable for now, too many issues to fix
      // '@typescript-eslint/no-unnecessary-condition': 'error',
      'no-restricted-syntax': [
        'error',
        {
          'selector': "TSAsExpression[typeAnnotation.typeName.name='TKey']",
          'message': "Casting to 'TKey' is forbidden"
        }
      ],
      // ----------------------------------------------------------------------------

      // ----------------------------- Style rules -----------------------------
      'object-curly-spacing': 'off',
      '@stylistic/object-curly-spacing': ['error', 'always'],

      'arrow-parens': ['error', 'as-needed'],

      indent: 'off',
      '@stylistic/indent': ['error', 2],

      'no-tabs': 'error',

      quotes: [
        'error',
        'single',
        {
          avoidEscape: true,
          allowTemplateLiterals: true,
        },
      ],

      'jsx-quotes': ['error', 'prefer-single'],

      'linebreak-style': ['error', 'unix'],

      'no-multi-spaces': ['error', { ignoreEOLComments: false }],
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/space-before-blocks': 'error',

      // Ternary formatting - enforce multi-line for readability
      '@stylistic/multiline-ternary': ['error', 'always-multiline'],
      '@stylistic/operator-linebreak': ['error', 'before', { overrides: { '?': 'before', ':': 'before' } }],
      // ----------------------------------------------------------------------------
    },
  },
  // --------------------------------- End of main codebase rules ---------------------------------

  // --------------------------------- Config files rules ---------------------------------
  {
    files: ['*.config.js', '*.config.ts', '*.config.d.ts'],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: null,
      },
    },
    rules: {
      'import/no-default-export': 'off',
    },

  },
  // --------------------------------- End of config files rules ---------------------------------

  // --------------------------------- Untyped modules rules ---------------------------------
  {
    files: ['src/untyped-modules.d.ts'],
    rules: {
      'no-duplicate-imports': 'off',
      'import/no-default-export': 'off',
    },
  },
  // --------------------------------- End of untyped modules rules ---------------------------------
])
