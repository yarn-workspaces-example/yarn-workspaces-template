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

exports.default = enforceNonPrivatePackagesHavePackPackageScript;
