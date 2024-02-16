# Yarn Workspaces Template

This is a template for a monorepo using yarn workspaces, TypeScript, ESLint, and Jest.

> [!WARNING]
> Before you start working, make sure to find and replace all occurrences of `@yarn-workspaces-example` with your project or NPM/GitHub organization name, and `rm yarn.lock` for a fresh start.

## Project Structure

- `config/`: Shared configuration files for tools like TypeScript, ESLint, and Jest.
- `packages/`: Libraries under this monorepo, can be private or publishable.
- `apps/`: Applications, such as web apps, mobile apps, or server-side apps.

### Shared Configurations

To eliminate the need to maintain multiple copies of the same configurations, define the same dependencies across different packages, and still allow for package-specific overrides, we package the shared configurations into extendable packages to be installed and used by the packages needing them.

Note that for executables such as `tsc`, `eslint`, and `jest` to be accessible from each workspace that uses the shared TypeScript, ESLint, and Jest configurations, those workspaces should explicitly install such tools rather than relying on the shared configurations' dependencies. Therefore, the shared configurations will only list such dependencies as `"peerDependencies"`. The consistencies of those config-packages-defined `"peerDependencies"` can be automatically updated by running [`yarn constraints --fix`](https://yarnpkg.com/cli/constraints).

The `@yarn-workspaces-example/eslint-config` package is installed at the root of the monorepo to lint top-level configuration files (such as `yarn.config.cjs`) and to force hoisting of the ESLint configs and plugins used in `@yarn-workspaces-example/eslint-config`, ensuring their accessibility and not to be installed nested in the `eslint-config` package - where ESLint would not be able to find them.

### Using Uncompiled Source Code of Packages During Development

Normally, when we install and import a package from another package in the monorepo, due to the entry point defined in the `package.json` of the imported package, what we are importing is the compiled code (e.g., `dist/`), but not the source code (e.g., `src/`). This means that we need to recompile the imported package every time we make a change to it, which is not very convenient for development. Also, the "Go to Definition" feature of IDEs might not be as convenient as will be taking us to the compiled definitions instead of the definitions in the source code.

As a workaround, we can leverage TypeScript's `paths` compiler option in the `tsconfig.json` of the importing package to map the import path to the source code of the imported package. This way, we can switch to importing the source code instead of the compiled code during development without changing the import paths in the source code of the importing package. This is especially useful when we are working on both the importing and imported packages at the same time.

See the `tsconfig.json` files of `packages/plus-two` and `apps/sample-app` for examples.

> [!NOTE]
> Defining the `paths` compiler option will not change how import paths are emitted, while this is the desired behavior for building the package for distribution, but you will need to make sure you have also handled the mappings while using other tools such as Jest, `ts-node` or Babel.
>
> For Jest, it will be done automatically by using the `jestBaseConfig` function provided by `@yarn-workspaces-example/jest-config`.
>
> As for `ts-node`, it can be done by using the `tsconfig-paths` package, see the `tsconfig.json` file in `apps/sample-app` for an example.

## Auto Publishing NPM Packages

GitHub Actions can be used to automatically publish packages to NPM when a new release on GitHub is published.

See [the "Auto Publishing NPM Packages" page on the Wiki](https://github.com/yarn-workspaces-example/yarn-workspaces-template/wiki/Auto-Publishing-NPM-Packages) for more information.

If you do not want to use this, remove the `.github/workflows/pack-and-publish-packages.yml` file.
