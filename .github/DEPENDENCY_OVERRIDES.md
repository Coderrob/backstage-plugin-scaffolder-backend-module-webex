# Dependency security overrides

The full recursive audit continues to fail on every high or critical advisory.
There are no advisory exceptions. The following pinned replacements remove the
two remaining vulnerable packages from this repository's installed dependency
graph.

## Braces

`braces` is resolved to `npm:@zklogic/braces@3.0.7`, an unofficial API-compatible
fork of `braces` 3.x. Its parser limits brace and parenthesis nesting to prevent
stack exhaustion ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)).

The published runtime source was compared with `braces` 3.0.3 and matched the
fork's tagged source commit `77ed7dda9f3f6c9aa22798a36acfc5b544506717`. Changes are
limited to parser depth handling and quote/comma parsing fixes; the dependency
remains `fill-range`, and there are no install lifecycle scripts. The exact
version and tarball checksum are pinned in the manifest and lockfile. This is
a recently published package from a different maintainer, so compatibility and
depth-limit regression tests run in CI and both release workflows.

The replacement also passed 764 tests from the upstream `braces` 3.0.3 suite
on Windows. The Bash-specific cases do not run on that platform.

Tests exercise the actual dependency chain from Backstage's scaffolder package
through globby, fast-glob, and micromatch, including nested alternatives, numeric
ranges, and deeply nested braces and parentheses. Reassess this override when an
upstream fix is released. Do not treat a clean registry audit alone as validation
of a replacement fork.

## Rspack certificate generation

Backstage's Rspack 1 dev server depends on `selfsigned` 2, which pulls in
`node-forge` and [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv).
The exact `selfsigned@npm:^2.4.1` descriptor is resolved to `selfsigned` 5.5.0,
which uses native crypto and `@peculiar/x509`/`pkijs` instead of `node-forge`.

The committed Yarn patch for `@rspack/dev-server` 1.2.1 makes two compatibility
changes: await asynchronous certificate generation, and replace the removed
`days` option with `notAfterDate` to retain the existing 30-day lifetime. This
keeps the Rspack 1 API used by Backstage. Tests verify certificate generation,
private-key matching, localhost/IP names, self-signature, validity duration,
TLS configuration, and certificate-cache reuse.

Remove the patch and override together when Backstage adopts a compatible
dev-server release with native support for `selfsigned` 5. Keep the patch under
`.yarn/patches` in source control so immutable CI/release installs can apply it.

## Scope

These Yarn resolutions apply to this repository's checkout. Package managers do
not inherit a dependency's resolutions when installing the published Webex
module; consuming Backstage applications must manage their own transitive
dependency overrides until upstream releases include the fixes.
