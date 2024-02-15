/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  plugins: ['jest', 'simple-import-sort'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    requireConfigFile: false,
  },
  ignorePatterns: ['**/dist/*'],
  rules: {
    'prettier/prettier': [
      'warn',
      {
        singleQuote: true,
      },
    ],
    curly: 'off',
    'no-spaced-func': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    'simple-import-sort/imports': [
      'warn',
      {
        groups: [
          // Node.js builtins. You could also generate this regex if you use a `.js` config.
          // For example: `^(${require("module").builtinModules.join("|")})(/|$)`
          // Note that if you use the `node:` prefix for Node.js builtins,
          // you can avoid this complexity: You can simply use "^node:".
          [
            '^(assert|buffer|child_process|cluster|console|constants|crypto|dgram|dns|domain|events|fs|http|https|module|net|os|path|punycode|querystring|readline|repl|stream|string_decoder|sys|timers|tls|tty|url|util|vm|zlib|freelist|v8|process|async_hooks|http2|perf_hooks)(/.*|$)',
          ],
          // Packages. `react` related packages come first.
          ['^react$', '^react/', '^react-dom', '^react', '^@?\\w'],
          // Internal packages.
          [
            '^(@|@yarn-workspaces-example|components|utils|config|vendored-lib)(/.*|$)',
          ],
          // Side effect imports.
          ['^\\u0000'],
          // Parent imports. Put `..` last.
          ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
          // Other relative imports. Put same-folder imports and `.` last.
          ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
          // Style imports.
          ['^.+\\.s?css$'],
        ],
      },
    ],
    'simple-import-sort/exports': 'warn',
  },
  overrides: [
    {
      files: [
        './**/.eslintrc.js',
        './**/yarn.config.cjs',
        './**/babel.config.js',
        './**/metro.config.js',
      ],
      env: { node: true },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};

module.exports = config;
