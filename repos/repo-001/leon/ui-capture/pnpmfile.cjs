// The sandbox forbids writing `.gitmodules`, which the `json` CLI package ships.
// That dev-only CLI is not needed to build or run Leon, so skip it at install time.
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === 'leon' && pkg.devDependencies) {
        delete pkg.devDependencies.json
      }
      return pkg
    }
  }
}
