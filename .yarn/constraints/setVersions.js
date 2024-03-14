/**
 * Sets the version number for all non-private workspaces.
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

exports.default = setVersions;
