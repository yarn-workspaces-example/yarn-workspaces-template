/** @type {import('@yarnpkg/types')} */
const { defineConfig } = require('@yarnpkg/types');

/** @type {import('semver')} */
const semver = require('semver');

/**
 * Enforce workspaces that depend on configuration workspaces have the same version of the "peerDependencies" of every configuration workspaces it depends on.
 *
 * @param {import('@yarnpkg/types').Yarn.Constraints.Context} context
 */
function enforceMatchedPeerDependenciesForConfigs({ Yarn }) {
  /** All the workspaces that contain configuration files. */
  const configurationWorkspaces = Yarn.workspaces().filter((workspace) =>
    workspace.cwd.startsWith('configs'),
  );

  // Iterate over every workspaces.
  for (const workspace of Yarn.workspaces()) {
    for (const dependenciesKey of ['dependencies', 'devDependencies']) {
      /** The "dependencies" or "devDependencies" of the current workspace. */
      const workspaceDependencies = workspace.manifest[dependenciesKey];
      if (!workspaceDependencies) continue;

      /** A set of the packages identities that are used by the current workspace. */
      const workspaceDependencyIdentities = new Set(
        Object.keys(workspaceDependencies),
      );

      // Iterate over every configuration workspaces.
      for (const configurationWorkspace of configurationWorkspaces) {
        // Skip if the current workspace does not depend on such configuration workspace.
        if (!workspaceDependencyIdentities.has(configurationWorkspace.ident)) {
          continue;
        }

        /** All the "peerDependencies" of the configuration workspace. */
        const configurationWorkspacePeerDependencies =
          configurationWorkspace.pkg.peerDependencies;
        // For each "peerDependencies" of the configuration workspace, enforce that the current workspace depends on the same version.
        for (const [
          peerDependencyIdent,
          peerDependencyVersion,
        ] of configurationWorkspacePeerDependencies) {
          workspace.set(
            [dependenciesKey, peerDependencyIdent],
            peerDependencyVersion,
          );
        }
      }
    }
  }
}

/**
 * Enforce non-private packages ("private" not set to true in package.json) to have a "pack-package" script.
 * The "pack-package" script is used by the CI to build the package.
 *
 * @param {import('@yarnpkg/types').Yarn.Constraints.Context} context
 */
function enforceNonPrivatePackagesHavePackPackageScript({ Yarn }) {
  for (const workspace of Yarn.workspaces()) {
    if (workspace.manifest.private) continue;

    if (!workspace.manifest.scripts?.['pack-package']) {
      workspace.set(
        ['scripts', 'pack-package'],
        `echo "TODO: add pack-package script for the ${workspace.ident} package" && exit 1`,
      );
    }

    if (!workspace.manifest.scripts?.['publish-packed-package']) {
      workspace.set(
        ['scripts', 'publish-packed-package'],
        `echo "TODO: add publish-packed-package script for the ${workspace.ident} package" && exit 1`,
      );
    }
  }
}

/**
 * Enforce workspaces to list all the peer dependencies of their dependencies either in their "dependencies" or "peerDependencies".
 *
 * @param {import('@yarnpkg/types').Yarn.Constraints.Context} context
 */
function enforcePeerDependenciesOfDependenciesAreListed({ Yarn }) {
  for (const workspace of Yarn.workspaces()) {
    /**
     * A map of expected peer dependencies of the current workspace.
     * @type {Map<string, { required: boolean; version: string; requestedBy: Record<string, string>; }>}
     */
    const peerDependenciesMap = new Map();

    for (const dependencyPackageName in workspace.manifest.dependencies || {}) {
      const dependencyPackage = workspace.pkg.dependencies.get(
        dependencyPackageName,
      );

      if (!dependencyPackage) {
        throw new Error(
          `Cannot find the dependency package "${dependencyPackageName}" in the workspace "${workspace.ident}". Running "yarn install" might fix this issue.`,
        );
      }

      // For each dependency package, log its "peerDependencies" and "optionalPeerDependencies" into peerDependenciesMap.
      for (const [key, isRequired] of [
        ['peerDependencies', true],
        ['optionalPeerDependencies', false],
      ]) {
        const logPeerDependencyNameAndVersion = (
          peerDependencyName,
          peerDependencyVersion,
        ) => {
          const existing = peerDependenciesMap.get(peerDependencyName);
          let version = peerDependencyVersion;

          if (existing?.version) {
            version =
              version !== '*'
                ? mostStrictVersion(existing.version, version)
                : existing.version;
          }

          // No need to enforce optional peer dependencies if the version is "*".
          if (!isRequired && version === '*') return;

          peerDependenciesMap.set(peerDependencyName, {
            required: existing?.required || isRequired,
            version,
            requestedBy: {
              ...(existing?.requestedBy || {}),
              [dependencyPackageName]: peerDependencyVersion,
            },
          });
        };

        for (const [
          peerDependencyName,
          peerDependencyVersion,
        ] of dependencyPackage[key]) {
          logPeerDependencyNameAndVersion(
            peerDependencyName,
            peerDependencyVersion,
          );
        }

        // As of Yarn 4.1.1, it's possible that peerDependencies of workspaces are not listed under the "peerDependencies" when they are also in the "dependencies" (i.e. they are also a dev-dependency or dependency of the workspace).
        // So if the dependency is a workspace, we also need to check its raw manifest (i.e. contents of it's package.json) for possible peer dependencies.
        if (dependencyPackage.workspace) {
          const rawPeerDependencies =
            dependencyPackage.workspace.manifest[key] || {};

          for (const [
            peerDependencyName,
            peerDependencyVersion,
          ] of Object.entries(rawPeerDependencies)) {
            logPeerDependencyNameAndVersion(
              peerDependencyName,
              peerDependencyVersion,
            );
          }
        }
      }
    }

    if (process.env.DEBUG) {
      console.log(
        `Enforcing peer dependencies for ${workspace.ident}:`,
        JSON.stringify(
          Object.fromEntries(peerDependenciesMap.entries()),
          null,
          2,
        ),
      );
    }

    for (const [
      peerDependencyName,
      { required, version },
    ] of peerDependenciesMap) {
      if (
        // If the package is listed as a dependency...
        peerDependencyName in (workspace.manifest.dependencies || {}) ||
        // Or for private packages, non-optional peer dependencies must be listed in "dependencies".
        (required && workspace.manifest.private)
      ) {
        const listedVersion =
          workspace.manifest.dependencies?.[peerDependencyName];

        // Ignore if the package is currently patched.
        if (listedVersion?.startsWith('patch:')) continue;

        if (!listedVersion || !semver.subset(listedVersion, version)) {
          workspace.set(['dependencies', peerDependencyName], version);
        }

        continue;
      }

      // Private packages do not need to list peerDependencies or optionalPeerDependencies, so we skip them.
      if (workspace.manifest.private) continue;

      if (required) {
        const listedVersion =
          workspace.manifest.peerDependencies?.[peerDependencyName];

        if (!listedVersion || !semver.subset(listedVersion, version)) {
          workspace.set(['peerDependencies', peerDependencyName], version);
        }
      } else {
        if (version === '*') continue;

        const listedVersion =
          workspace.manifest.peerDependencies?.[peerDependencyName] ||
          workspace.manifest.optionalPeerDependencies?.[peerDependencyName];

        if (
          !listedVersion ||
          version.startsWith('workspace:') ||
          !semver.subset(listedVersion, version)
        ) {
          workspace.set(
            ['optionalPeerDependencies', peerDependencyName],
            version,
          );
        }
      }
    }
  }
}

function mostStrictVersion(version1, version2) {
  if (version2.startsWith('workspace:')) return version2;

  if (semver.subset(version1, version2)) {
    return version1;
  } else if (semver.subset(version2, version1)) {
    return version2;
  } else {
    return version1
      .split('||')
      .map((v) => `${v.trim()} ${version2.trim()}`)
      .join(' || ');
  }
}

/**
 * It's common to have peerDependencies add as devDependencies for package development. Here we enforce that all devDependencies satisfy the corresponding peerDependencies.
 *
 * @param {import('@yarnpkg/types').Yarn.Constraints.Context} context
 */
function enforceDevDependenciesSatisfiesPeerDependencies({ Yarn }) {
  for (const workspace of Yarn.workspaces()) {
    for (const [name, version] of Object.entries(
      workspace.manifest.peerDependencies || {},
    )) {
      const devDependencyVersion = workspace.manifest.devDependencies?.[name];

      if (
        devDependencyVersion &&
        !semver.subset(devDependencyVersion, version)
      ) {
        workspace.set(['devDependencies', name], version);
      }
    }
  }
}

/**
 * Sets the version number for all workspaces.
 * This will only make effect if the PACKAGES_VERSION environment variable is set.
 *
 * @param {import('@yarnpkg/types').Yarn.Constraints.Context} context
 * @param {string} version
 */
function setVersions({ Yarn }, version) {
  if (!version) return;

  for (const workspace of Yarn.workspaces()) {
    if (!workspace.manifest.private) {
      workspace.set('version', version);
    }
  }
}

module.exports = defineConfig({
  async constraints(ctx) {
    // Only check/set versions if the PACKAGES_VERSION environment variable is set.
    if (process.env.PACKAGES_VERSION) {
      setVersions(ctx, process.env.PACKAGES_VERSION);
      return;
    }

    // Normal constraints.
    enforceMatchedPeerDependenciesForConfigs(ctx);
    enforceNonPrivatePackagesHavePackPackageScript(ctx);
    enforcePeerDependenciesOfDependenciesAreListed(ctx);
    enforceDevDependenciesSatisfiesPeerDependencies(ctx);
  },
});
