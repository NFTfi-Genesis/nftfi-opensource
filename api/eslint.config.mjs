import path from 'path';
import { defineConfig } from 'eslint/config';
import { includeIgnoreFile } from '@eslint/compat';
import nxPlugin from '@nx/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import stylistic from '@stylistic/eslint-plugin';

export const plugins = {
  '@stylistic': stylistic,
  import: importPlugin,
  '@nx': nxPlugin,
  '@typescript-eslint': tsPlugin
};
const gitignorePath = path.resolve(process.cwd(), '.gitignore');

export default defineConfig([
  includeIgnoreFile(gitignorePath, 'Imported .gitignore patterns'),
  {
    files: ['*.js', '**/*.js'],
    plugins,
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-duplicate-imports': 'warn',
      'import/order': 'warn',
      'object-shorthand': ['warn', 'always']
    }
  },

  {
    files: ['*.ts', '**/*.ts'],
    plugins,
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/prefer-function-type': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'index', 'parent', 'sibling', 'object', 'type'],
          pathGroups: [
            {
              pattern: '@nftfi.api/**',
              group: 'internal'
            }
          ],
          pathGroupsExcludedImportTypes: ['internal']
        }
      ],
      'import/newline-after-import': 'warn',
      'import/no-self-import': 'error',
      'import/no-cycle': 'error',
      'no-unused-private-class-members': 'warn',
      'no-duplicate-imports': 'warn',
      'no-console': 'warn',
      'object-shorthand': ['warn', 'always'],
      '@stylistic/eol-last': ['warn', 'always']
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.base.json',
        tsconfigRootDir: process.cwd()
      }
    }
  }
]);
