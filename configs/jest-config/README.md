# Jest Config

This package provides some shared Jest configurations for all workspaces in the monorepo.

## Install

```bash
yarn add @yarn-workspaces-example/jest-config --dev && yarn constraints --fix && yarn
```

Then, add the following to your `jest.config.ts`:

```ts
import type { Config } from 'jest';

import { jestBaseConfig } from '@yarn-workspaces-example/jest-config';

const baseConfig = jestBaseConfig({ dirname: __dirname });

const config: Config = {
  ...baseConfig,
};

export default config;
```
