/** @type {import('@yarnpkg/types')} */
const { defineConfig } = require('@yarnpkg/types');

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
  },
});
