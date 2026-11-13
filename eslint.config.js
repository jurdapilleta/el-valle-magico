import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dev-dist',
      'node_modules',
      'playwright-report',
      'test-results',
      'tools/assets/raw',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // GAME_DESIGN §5.2: browser text-to-speech is banned everywhere.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Identifier[name=/speechSynthesis/i]',
          message: 'Browser TTS is banned (GAME_DESIGN §5.2). Use pre-recorded voice lines.',
        },
      ],
    },
  },
  { files: ['tools/**/*.mjs'], languageOptions: { globals: globals.node } },
  prettier,
);
