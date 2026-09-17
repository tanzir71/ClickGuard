module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended'],
  env: { browser: true, es2022: true, node: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-restricted-imports': ['error', { patterns: ['**/packages/ui/src/**'] }],
    'no-restricted-syntax': ['error', {
      selector: "JSXAttribute[name.name='style'] ObjectExpression > JSXExpressionContainer Literal",
      message: 'Use @clickguard/ui token classes rather than literal inline styles.'
    }]
  }
};
