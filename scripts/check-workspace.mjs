/**
 * Verifies the root-owned npm workspace and lockfile before dependency installation.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const manifestGraphFields = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
  "peerDependenciesMeta",
];
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const failUnless = (condition, message) => {
  if (!condition) {
    failures.push(message);
  }
};

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    const displayPath = relative(repositoryRoot, path) || ".";
    throw new Error(`Cannot parse ${displayPath}: ${error.message}`, {
      cause: error,
    });
  }
};

const normalizeRecord = (record) =>
  Object.fromEntries(
    Object.entries(record ?? {}).sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    ),
  );

const recordsAreEqual = (left, right) =>
  JSON.stringify(normalizeRecord(left)) === JSON.stringify(normalizeRecord(right));

const rootManifestPath = join(repositoryRoot, "package.json");
const rootLockfilePath = join(repositoryRoot, "package-lock.json");

failUnless(existsSync(rootLockfilePath), "The repository root must own package-lock.json.");
failUnless(
  !existsSync(join(repositoryRoot, "npm-shrinkwrap.json")),
  "Do not combine package-lock.json with a root npm-shrinkwrap.json.",
);

if (failures.length > 0) {
  throw new Error(failures.join("\n"));
}

const rootManifest = readJson(rootManifestPath);
const rootLockfile = readJson(rootLockfilePath);
const workspacePaths = rootManifest.workspaces;
const lockedRoot = rootLockfile.packages?.[""];

failUnless(rootManifest.private === true, "The workspace root must remain private.");
failUnless(
  /^npm@\d+\.\d+\.\d+$/.test(rootManifest.packageManager ?? ""),
  "packageManager must pin one exact npm version.",
);
failUnless(Array.isArray(workspacePaths) && workspacePaths.length > 0, "Declare at least one npm workspace.");
failUnless(rootLockfile.lockfileVersion === 3, "package-lock.json must use lockfileVersion 3.");
failUnless(rootLockfile.requires === true, "package-lock.json must retain requires: true.");
failUnless(lockedRoot !== undefined, "package-lock.json must contain its root package entry.");

if (lockedRoot !== undefined) {
  failUnless(lockedRoot.name === rootManifest.name, "Root name differs between package.json and package-lock.json.");
  failUnless(
    lockedRoot.version === rootManifest.version,
    "Root version differs between package.json and package-lock.json.",
  );
  failUnless(
    JSON.stringify(lockedRoot.workspaces) === JSON.stringify(workspacePaths),
    "Workspace paths differ between package.json and package-lock.json.",
  );

  for (const field of manifestGraphFields) {
    failUnless(
      recordsAreEqual(lockedRoot[field], rootManifest[field]),
      `Root ${field} differ between package.json and package-lock.json.`,
    );
  }
}

const workspaceNames = new Set();

for (const workspacePath of Array.isArray(workspacePaths) ? workspacePaths : []) {
  const normalizedPath = workspacePath.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
  const manifestPath = join(repositoryRoot, normalizedPath, "package.json");
  const nestedLockfilePath = join(repositoryRoot, normalizedPath, "package-lock.json");
  const nestedShrinkwrapPath = join(repositoryRoot, normalizedPath, "npm-shrinkwrap.json");

  failUnless(
    normalizedPath === workspacePath,
    `Workspace path ${workspacePath} must use canonical forward-slash notation without wrappers.`,
  );
  failUnless(existsSync(manifestPath), `Workspace ${workspacePath} must contain package.json.`);
  failUnless(!existsSync(nestedLockfilePath), `Workspace ${workspacePath} must not own package-lock.json.`);
  failUnless(!existsSync(nestedShrinkwrapPath), `Workspace ${workspacePath} must not own npm-shrinkwrap.json.`);

  if (!existsSync(manifestPath)) {
    continue;
  }

  const workspaceManifest = readJson(manifestPath);
  const lockedWorkspace = rootLockfile.packages?.[normalizedPath];
  const lockedLink = rootLockfile.packages?.[`node_modules/${workspaceManifest.name}`];

  failUnless(
    typeof workspaceManifest.name === "string" && workspaceManifest.name.length > 0,
    `Workspace ${workspacePath} must have a package name.`,
  );
  failUnless(
    !workspaceNames.has(workspaceManifest.name),
    `Workspace package name ${workspaceManifest.name} must be unique.`,
  );
  workspaceNames.add(workspaceManifest.name);
  failUnless(
    rootManifest.dependencies?.[workspaceManifest.name] === undefined,
    `The private root must not redeclare workspace ${workspaceManifest.name} as a registry dependency.`,
  );
  failUnless(lockedWorkspace !== undefined, `package-lock.json is missing workspace ${workspacePath}.`);
  failUnless(
    lockedLink?.link === true && lockedLink.resolved === normalizedPath,
    `package-lock.json must link node_modules/${workspaceManifest.name} to ${workspacePath}.`,
  );

  if (lockedWorkspace !== undefined) {
    failUnless(
      lockedWorkspace.version === workspaceManifest.version,
      `Workspace ${workspacePath} version differs between its manifest and package-lock.json.`,
    );

    for (const field of manifestGraphFields) {
      failUnless(
        recordsAreEqual(lockedWorkspace[field], workspaceManifest[field]),
        `Workspace ${workspacePath} ${field} differ between its manifest and package-lock.json.`,
      );
    }
  }
}

if (failures.length > 0) {
  throw new Error(`Workspace integrity check failed:\n- ${failures.join("\n- ")}`);
}

console.log(
  `Workspace integrity verified: ${workspacePaths.length} workspace, one lockfile (lockfileVersion 3).`,
);
