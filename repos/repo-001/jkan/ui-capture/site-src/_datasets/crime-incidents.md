---
schema: westbrook
title: Crime Incidents
organization: Westbrook Police Department
notes: |-
  Part I and Part II crime incidents reported to the Westbrook Police Department, classified using **NIBRS** offense codes since January 1, 2021 (UCR summary codes before that). Locations are generalized to the hundred block; incidents involving sexual offenses or juveniles have their location removed entirely.

  Note that these are *reported* incidents and are subject to change as investigations proceed — an incident may be reclassified or unfounded weeks later. Data is published with a 7-day delay.

  - Records before 2021 use `ucr_general`; after, use `nibrs_code`
  - `dispatch_date_time` is in local time (America/New_York)
  - About 2% of records cannot be geocoded and have empty coordinates
resources:
- name: Incidents 2026
  url: https://data.westbrook.gov/files/police/incidents_2026.csv
  format: csv
- name: Incidents 2025
  url: https://data.westbrook.gov/files/police/incidents_2025.csv
  format: csv
- name: Incidents 2024
  url: https://data.westbrook.gov/files/police/incidents_2024.csv
  format: csv
- name: Incidents 2023
  url: https://data.westbrook.gov/files/police/incidents_2023.csv
  format: csv
- name: Incidents 2022
  url: https://data.westbrook.gov/files/police/incidents_2022.csv
  format: csv
- name: Incidents 2021
  url: https://data.westbrook.gov/files/police/incidents_2021.csv
  format: csv
- name: Incidents 2020
  url: https://data.westbrook.gov/files/police/incidents_2020.csv
  format: csv
- name: Incidents 2019
  url: https://data.westbrook.gov/files/police/incidents_2019.csv
  format: csv
- name: Incidents 2018
  url: https://data.westbrook.gov/files/police/incidents_2018.csv
  format: csv
- name: Incidents API
  url: https://api.westbrook.gov/v2/police/incidents
  format: api
- name: NIBRS code list
  url: https://data.westbrook.gov/files/police/nibrs_codes.csv
  format: csv
license: http://www.opendefinition.org/licenses/odc-pddl
category:
- Public Safety
maintainer: WPD Crime Analysis Unit
maintainer_email: wpd.crimeanalysis@westbrook.gov
update_frequency: Daily
temporal: 2018-01-01 to present
modified: '2026-11-09'
---
