/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['@yarn-workspaces-example'],
  ignorePatterns: ['!.yarn'],
  env: { node: true },
  rules: {
    '@typescript-eslint/no-var-requires': 'off',
  },
};

module.exports = config;
