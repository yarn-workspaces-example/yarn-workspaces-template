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

module.exports = defineConfig({
  async constraints(ctx) {
    enforceMatchedPeerDependenciesForConfigs(ctx);
  },
});
