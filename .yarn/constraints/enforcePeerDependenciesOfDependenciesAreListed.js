const semver = require('semver');

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

exports.default = enforcePeerDependenciesOfDependenciesAreListed;
