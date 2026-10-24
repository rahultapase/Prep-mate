module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
  overrides: [
    {
      // Express backend runs in Node, not the browser
      files: ['server/**/*.js'],
      env: { node: true, browser: false, es2022: true },
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      },
    },
  ],
}
