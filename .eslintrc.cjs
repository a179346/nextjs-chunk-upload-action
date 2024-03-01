module.exports = {
  parser: '@typescript-eslint/parser',
  env: { browser: true, es2021: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'prettier',
    'plugin:promise/recommended',
    'plugin:import/recommended',
  ],
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  ignorePatterns: ['.eslintrc.cjs'],
  rules: {
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '_', varsIgnorePattern: '_', caughtErrorsIgnorePattern: '_' },
    ],
    eqeqeq: 'error',
    'import/order': ['error', { 'newlines-between': 'always' }],
    'no-console': 'error',
    'prettier/prettier': ['error', { endOfLine: 'auto' }],
  },
  settings: { 'import/resolver': { node: { extensions: ['.js', '.ts'] } } },
};
