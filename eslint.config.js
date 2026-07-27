import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Single-word view names (App, LineDailyKpi, ...) are fine for this project's flat views/ structure.
      'vue/multi-word-component-names': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // PrimeVue's own docs use camelCase props/events in templates (optionLabel,
      // :maxSelectedLabels, @update:modelValue, ...) throughout - this codebase follows
      // that convention consistently, so enforcing kebab-case here would fight the
      // ecosystem rather than catch real bugs.
      'vue/attribute-hyphenation': 'off',
      'vue/v-on-event-hyphenation': 'off',
    },
  },
  eslintConfigPrettier,
]
