---
schema: westbrook
title: Restaurant Inspections
organization: Department of Public Health
notes: |-
  Results of routine and complaint inspections of restaurants, food trucks, grocery stores and other food establishments. Each violation is a separate row; join on `inspection_id`.

  A **Pass** with violations is normal — most inspections find at least one minor issue.
resources:
- name: Inspections
  url: https://data.westbrook.gov/files/health/food_inspections.csv
  format: csv
- name: Violations
  url: https://data.westbrook.gov/files/health/food_violations.csv
  format: csv
- name: Violation code reference
  url: https://data.westbrook.gov/files/health/food_code_reference.pdf
  format: pdf
license: http://www.opendefinition.org/licenses/odc-pddl
category:
- Food
- Health / Human Services
maintainer: Environmental Health Services
maintainer_email: ehs@westbrook.gov
update_frequency: Daily
temporal: 2016 to present
modified: '2026-11-14'
---
