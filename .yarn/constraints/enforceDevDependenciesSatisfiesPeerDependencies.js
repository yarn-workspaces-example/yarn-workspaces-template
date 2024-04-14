const semver = require('semver');

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
        !devDependencyVersion.startsWith('patch:') &&
        !semver.subset(devDependencyVersion, version)
      ) {
        workspace.set(['devDependencies', name], version);
      }
    }
  }
}

exports.default = enforceDevDependenciesSatisfiesPeerDependencies;
