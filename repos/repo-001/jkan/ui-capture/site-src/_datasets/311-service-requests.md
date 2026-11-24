---
schema: westbrook
title: 311 Service Requests
organization: Office of Innovation & Technology
notes: |-
  Every service request made to Westbrook 311 by phone, the **Westbrook311** mobile app, or the web portal since the system launched in December 2014. Each record includes the request type, the responsible agency, the date opened and closed, status, and the location (generalized to the nearest intersection for requests about people, such as welfare checks).

  Request types were consolidated from 212 to 148 in July 2021; see the data dictionary for the crosswalk. Records are refreshed nightly at 2:00 AM.
resources:
- name: 311 Requests — all years
  url: https://data.westbrook.gov/files/oit/311_requests_all.csv
  format: csv
  description: "≈1.9 million rows, 410 MB uncompressed"
- name: 311 Requests — last 90 days
  url: https://data.westbrook.gov/files/oit/311_requests_90d.csv
  format: csv
- name: 311 Open Data API
  url: https://api.westbrook.gov/v2/311/requests
  format: api
  description: Paged JSON API, 1,000 records per page. No key required.
- name: Data dictionary
  url: https://data.westbrook.gov/files/oit/311_data_dictionary.pdf
  format: pdf
license: http://www.opendefinition.org/licenses/odc-pddl
category:
- Health / Human Services
- Transportation
maintainer: Priya Raman
maintainer_email: priya.raman@westbrook.gov
update_frequency: Daily
temporal: 2014-12-01 to present
modified: '2026-11-15'
---
