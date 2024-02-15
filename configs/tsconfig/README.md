# TypeScript Config

This package provides some shared TypeScript configurations for all workspaces in the monorepo.

## Install

```bash
yarn add @yarn-workspaces-example/tsconfig --dev && yarn constraints --fix && yarn
```

Then, add the following to your `tsconfig.json`:

```json5
{
  "extends": "@yarn-workspaces-example/tsconfig",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"] // Optional path mappings
    }
  },
  "include": [
    "**/*.ts"
  ]
}
```
