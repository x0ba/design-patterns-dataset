---
title: Changelog
---

# Changelog

## 0.9.2 — 2026-10-28

### Fixed

- `:ElementMass` no longer drops the last digit for formulas with hydrates, such as `CuSO4·5H2O`.
- `:Units` accepts `µmol` as well as `umol`.

## 0.9.1 — 2026-09-14

### Changed

- `:Isotopes` shows natural abundance to four significant figures.

### Fixed

- Lookup windows close on `q` in every layout.

## 0.9.0 — 2026-08-02

### Added

- `:ElementCompare` for side-by-side comparison.
- `:ElectronConfig` and `:Units`.

### Changed

- `precision` defaults to `2` (was `3`).

## 0.8.0 — 2026-05-19

### Added

- Initial `:ElementLookup`, `:ElementMass`, and `:Isotopes` commands.
