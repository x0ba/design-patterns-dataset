# Datasets for the City of Westbrook portal. Written in a small DSL so the
# generator (generate.rb) can turn each entry into a _datasets/*.md file.
DATA = "https://data.westbrook.gov/files"
GIS  = "https://gis.westbrook.gov/arcgis/rest/services"
API  = "https://api.westbrook.gov"

LIC = {
  pddl: "http://www.opendefinition.org/licenses/odc-pddl",
  cc0:  "https://creativecommons.org/publicdomain/zero/1.0/",
  ccby: "https://creativecommons.org/licenses/by/4.0/",
  ccbysa: "https://creativecommons.org/licenses/by-sa/4.0/",
  odbl: "http://www.opendefinition.org/licenses/odc-odbl",
  na:   "",
}

DATASETS = []
def ds(slug, title, org, cats, notes, res, lic: :pddl, maint: nil, freq: nil, period: nil, modified: nil)
  DATASETS << {slug:, title:, org:, cats:, notes:, res:, lic:, maint:, freq:, period:, modified:}
end
def r(name, url, fmt = nil, desc = nil) = {name:, url:, fmt:, desc:}
def yearly(label, path, years, fmt = "csv") = years.map { |y| r("#{label} #{y}", "#{DATA}/#{path}_#{y}.#{fmt}", fmt) }
def gis(name, svc) = [r("#{name} (Shapefile)", "#{DATA}/gis/#{svc}.zip", "shp"),
                      r("#{name} (GeoJSON)", "#{DATA}/gis/#{svc}.geojson", "geojson"),
                      r("#{name} (Map Service)", "#{GIS}/#{svc}/FeatureServer/0", "api")]

OIT = "Office of Innovation & Technology"; FIN = "Department of Finance"; WPD = "Westbrook Police Department"
WFD = "Westbrook Fire Department"; DOS = "Department of Streets"; WWD = "Westbrook Water Department"
PR = "Parks & Recreation"; DPD = "Department of Planning & Development"; LI = "Licenses & Inspections"
DPH = "Department of Public Health"; CLK = "Office of the City Clerk"; WPL = "Westbrook Public Library"
WRT = "Westbrook Regional Transit"; SUS = "Office of Sustainability"; OPA = "Office of Property Assessment"
ART = "Office of Arts & Culture"; DHS = "Department of Human Services"

# ---------------------------------------------------------------- OIT
ds "311-service-requests", "311 Service Requests", OIT, ["Health / Human Services", "Transportation"],
   "Every service request made to Westbrook 311 by phone, the **Westbrook311** mobile app, or the web portal since the system launched in December 2014. Each record includes the request type, the responsible agency, the date opened and closed, status, and the location (generalized to the nearest intersection for requests about people, such as welfare checks).\n\nRequest types were consolidated from 212 to 148 in July 2021; see the data dictionary for the crosswalk. Records are refreshed nightly at 2:00 AM.",
   [r("311 Requests — all years", "#{DATA}/oit/311_requests_all.csv", "csv", "≈1.9 million rows, 410 MB uncompressed"),
    r("311 Requests — last 90 days", "#{DATA}/oit/311_requests_90d.csv", "csv"),
    r("311 Open Data API", "#{API}/v2/311/requests", "api", "Paged JSON API, 1,000 records per page. No key required."),
    r("Data dictionary", "#{DATA}/oit/311_data_dictionary.pdf", "pdf")],
   lic: :pddl, maint: "Priya Raman", freq: "Daily", period: "2014-12-01 to present", modified: "2026-11-15"
ds "city-employee-salaries", "City Employee Salaries", OIT, ["Budget / Finance"],
   "Base salary, overtime and other pay for every person on the City payroll, by calendar year. Names are included for all employees except sworn police officers in investigative units, as permitted by the Right-to-Know Law.",
   yearly("Employee earnings", "oit/employee_earnings", (2019..2025).to_a.reverse),
   lic: :pddl, maint: "Priya Raman", freq: "Annually", period: "2019 – 2025", modified: "2026-02-27"
ds "city-facilities", "City Facilities", OIT, ["Planning / Zoning"],
   "Locations of buildings owned or leased by the City: offices, recreation centers, libraries, fire stations, police districts and health centers.",
   gis("City facilities", "City_Facilities"),
   lic: :cc0, maint: "GIS Services Group", freq: "Quarterly", period: "Current", modified: "2026-09-30"
ds "public-wifi-hotspots", "Public Wi-Fi Hotspots", OIT, ["Uncategorized"],
   "Free *WestbrookConnect* Wi-Fi access points in libraries, rec centers and outdoor plazas.",
   [r("Hotspots CSV", "#{DATA}/oit/wifi_hotspots.csv", "csv"), r("Hotspots GeoJSON", "#{DATA}/oit/wifi_hotspots.geojson", "geojson")],
   lic: :cc0, freq: "As needed", modified: "2025-08-04"
ds "website-analytics", "City Website Analytics", OIT, [],
   "Daily page views and visitors for westbrook.gov, aggregated from the US Digital Analytics Program tag. Individual visitor data is never collected.",
   [r("Daily traffic by page", "#{DATA}/oit/web_analytics_daily.csv", "csv"), r("Top searches", "#{DATA}/oit/web_top_searches.csv", "csv")],
   lic: :cc0, maint: "Digital Services Team", freq: "Weekly", period: "2020-01-01 to present", modified: "2026-11-10"
ds "open-data-inventory", "Open Data Inventory", OIT, ["Uncategorized"],
   "The City's inventory of data assets, published and unpublished, as required by Executive Order 4-19. Includes the target release date for datasets not yet on this portal.",
   [r("Inventory (Excel)", "#{DATA}/oit/data_inventory_2026Q3.xlsx", "xlsx"), r("data.json catalog", "https://data.westbrook.gov/data.json", "json")],
   lic: :cc0, maint: "Priya Raman", freq: "Quarterly", modified: "2026-10-02"
ds "it-service-desk-tickets", "IT Service Desk Tickets", OIT, [],
   "Monthly counts of internal IT help desk tickets by category and department.",
   [r("Tickets by month", "#{DATA}/oit/servicedesk_monthly.csv", "csv")],
   lic: :pddl, freq: "Monthly", period: "2022-07 to present", modified: "2026-11-03"

# ---------------------------------------------------------------- Finance
ds "operating-budget", "Operating Budget", FIN, ["Budget / Finance"],
   "Adopted operating budget by fund, department, and expense class (personal services, purchase of services, materials & supplies, etc.). Figures for FY2027 are the **Adopted** budget as passed by Council on June 12, 2026; prior years show both adopted and actual amounts.\n\nLooking for something easier to read? Try the [Budget in Brief](https://www.westbrook.gov/finance/budget) PDF.",
   yearly("Operating budget FY", "finance/operating_budget_fy", (2021..2027).to_a.reverse) + [r("Budget in Brief FY2027", "#{DATA}/finance/budget_in_brief_fy2027.pdf", "pdf")],
   lic: :pddl, maint: "Marcus Delgado", freq: "Annually", period: "FY2021 – FY2027", modified: "2026-07-01"
ds "capital-budget", "Capital Program & Budget", FIN, ["Budget / Finance", "Planning / Zoning"],
   "Six-year Capital Program and current-year Capital Budget by project, with funding source (GO bonds, state, federal, other).",
   [r("Capital Program FY2027-2032", "#{DATA}/finance/capital_program_fy2027_2032.csv", "csv"),
    r("Capital Program FY2026-2031", "#{DATA}/finance/capital_program_fy2026_2031.csv", "csv"),
    r("Capital projects map", "#{GIS}/Capital_Projects/FeatureServer/0", "api")],
   lic: :pddl, maint: "Marcus Delgado", freq: "Annually", period: "FY2026 – FY2032", modified: "2026-06-30"
ds "vendor-payments", "Vendor Payments", FIN, ["Budget / Finance"],
   "Every payment made from the City's general ledger to an outside vendor, by check or ACH. Payments to individuals for refunds, settlements and benefit claims are excluded.",
   yearly("Payments FY", "finance/vendor_payments_fy", (2022..2026).to_a.reverse) + [r("Vendor payments API", "#{API}/v2/finance/payments", "api")],
   lic: :pddl, maint: "Accounts Payable Unit", freq: "Monthly", period: "FY2022 to present", modified: "2026-11-05"
ds "city-contracts", "Professional Services Contracts", FIN, ["Budget / Finance", "Economy"],
   "Professional services contracts over $10,000 conformed since 2017, including amendments.",
   [r("Contracts", "#{DATA}/finance/contracts.csv", "csv"), r("Contract amendments", "#{DATA}/finance/contract_amendments.csv", "csv")],
   lic: :pddl, maint: "Procurement Department", freq: "Monthly", period: "2017 to present", modified: "2026-10-28"
ds "acfr", "Annual Comprehensive Financial Report", FIN, ["Budget / Finance"],
   "Audited financial statements (formerly the CAFR).",
   yearly("ACFR FY", "finance/acfr_fy", (2020..2025).to_a.reverse, "pdf"),
   lic: :na, maint: "Office of the Director of Finance", freq: "Annually", modified: "2026-03-18"
ds "tax-revenue-collections", "Tax Revenue Collections", FIN, ["Budget / Finance", "Economy"],
   "Monthly collections for the City's major taxes: real estate, wage & earnings, business income & receipts, sales, parking, amusement, and the beverage tax.",
   [r("Collections by month", "#{DATA}/finance/tax_collections_monthly.csv", "csv"), r("Collections dashboard", "https://www.westbrook.gov/finance/revenue-dashboard", "html")],
   lic: :pddl, maint: "Marcus Delgado", freq: "Monthly", period: "FY2015 to present", modified: "2026-11-12"
ds "pension-fund-performance", "Pension Fund Performance", FIN, ["Budget / Finance"],
   "Quarterly investment returns and asset allocation for the Municipal Pension Fund. Net of fees.",
   [r("Quarterly returns", "#{DATA}/finance/pension_returns.csv", "csv")],
   lic: :pddl, freq: "Quarterly", period: "2010 Q1 to 2026 Q2", modified: "2026-08-21"

# ---------------------------------------------------------------- Police
ds "crime-incidents", "Crime Incidents", WPD, ["Public Safety"],
   "Part I and Part II crime incidents reported to the Westbrook Police Department, classified using **NIBRS** offense codes since January 1, 2021 (UCR summary codes before that). Locations are generalized to the hundred block; incidents involving sexual offenses or juveniles have their location removed entirely.\n\nNote that these are *reported* incidents and are subject to change as investigations proceed — an incident may be reclassified or unfounded weeks later. Data is published with a 7-day delay.\n\n- Records before 2021 use `ucr_general`; after, use `nibrs_code`\n- `dispatch_date_time` is in local time (America/New_York)\n- About 2% of records cannot be geocoded and have empty coordinates",
   yearly("Incidents", "police/incidents", (2018..2026).to_a.reverse) + [r("Incidents API", "#{API}/v2/police/incidents", "api"), r("NIBRS code list", "#{DATA}/police/nibrs_codes.csv", "csv")],
   lic: :pddl, maint: "WPD Crime Analysis Unit", freq: "Daily", period: "2018-01-01 to present", modified: "2026-11-09"
ds "shooting-victims", "Shooting Victims", WPD, ["Public Safety", "Health / Human Services"],
   "Every person struck by gunfire in Westbrook since 2015, whether fatal or non-fatal, with age group, sex, race and police district. Self-inflicted wounds are excluded.",
   [r("Shooting victims", "#{DATA}/police/shooting_victims.csv", "csv"), r("Shooting victims (GeoJSON)", "#{DATA}/police/shooting_victims.geojson", "geojson")],
   lic: :pddl, maint: "WPD Crime Analysis Unit", freq: "Weekly", period: "2015 to present", modified: "2026-11-11"
ds "police-districts", "Police Districts", WPD, ["Public Safety"],
   "Boundaries of the four police districts and 22 police service areas (PSAs), effective after the 2023 redistricting.",
   gis("Police districts", "Police_Districts") + [r("Police service areas (Shapefile)", "#{DATA}/gis/Police_PSA.zip", "shp")],
   lic: :cc0, freq: "As needed", period: "Effective 2023-03-01", modified: "2023-03-01"
ds "traffic-stops", "Vehicle and Pedestrian Stops", WPD, ["Public Safety", "Transportation"],
   "Investigative vehicle and pedestrian stops, with demographics of the person stopped, reason for stop, and whether a frisk, search, or arrest followed. Published under the 2019 settlement agreement.",
   yearly("Stops", "police/stops", (2020..2026).to_a.reverse),
   lic: :pddl, maint: "WPD Office of Professional Responsibility", freq: "Quarterly", period: "2020 to present", modified: "2026-10-15"
ds "complaints-against-police", "Civilian Complaints Against Police", WPD, ["Public Safety"],
   "Complaints filed with the Police Advisory Commission or Internal Affairs, the allegation(s), and the investigation outcome. Officer names are withheld until a finding is sustained.",
   [r("Complaints", "#{DATA}/police/complaints.csv", "csv"), r("Allegations & findings", "#{DATA}/police/complaint_findings.csv", "csv")],
   lic: :pddl, maint: "Police Advisory Commission", freq: "Monthly", period: "2016 to present", modified: "2026-10-31"
ds "use-of-force", "Use of Force Incidents", WPD, ["Public Safety"],
   "Reportable use of force incidents.",
   [r("Use of force", "#{DATA}/police/use_of_force.csv")],
   lic: :pddl, freq: "Quarterly", period: "2019 to 2026 Q2", modified: "2026-07-22"

# ---------------------------------------------------------------- Fire
ds "fire-ems-incidents", "Fire & EMS Incidents", WFD, ["Public Safety", "Health / Human Services"],
   "Incidents dispatched to Westbrook Fire Department units, including medical calls, structure fires, vehicle fires, alarms and hazmat. Response time is measured from dispatch to first unit on scene.",
   [r("Incidents 2024–present", "#{DATA}/fire/incidents_2024_present.csv", "csv"), r("Incidents 2016–2023", "#{DATA}/fire/incidents_2016_2023.csv", "csv"), r("Incident type codes (NFIRS)", "#{DATA}/fire/nfirs_codes.csv", "csv")],
   lic: :pddl, maint: "Capt. Dana Whitfield", freq: "Weekly", period: "2016 to present", modified: "2026-11-08"
ds "fire-stations", "Fire Stations", WFD, ["Public Safety"],
   "Engine, ladder, and medic companies by station.",
   gis("Fire stations", "Fire_Stations"),
   lic: :cc0, freq: "As needed", modified: "2024-05-17"
ds "fire-hydrants", "Fire Hydrants", WFD, ["Public Safety"],
   "Hydrant locations, flow-test color class (NFPA 291) and last inspection date. Maintained jointly with the Water Department.",
   gis("Hydrants", "Fire_Hydrants"),
   lic: :cc0, maint: "Westbrook Water Department GIS", freq: "Monthly", modified: "2026-10-01"
ds "smoke-alarm-installs", "Smoke Alarm Installations", WFD, ["Public Safety"],
   "Free smoke alarms installed in homes through the *Sound the Alarm* program, aggregated by census tract.",
   [r("Installs by tract", "#{DATA}/fire/smoke_alarms_by_tract.csv", "csv")],
   lic: :ccby, freq: "Annually", period: "2017 – 2025", modified: "2026-01-20"

# ---------------------------------------------------------------- Streets
ds "street-centerlines", "Street Centerlines", DOS, ["Transportation"],
   "Street centerline network with street names, address ranges, functional classification and one-way direction. The authoritative source for geocoding in City systems.",
   gis("Street centerlines", "Street_Centerline"),
   lic: :cc0, maint: "GIS Services Group", freq: "Monthly", modified: "2026-11-01"
ds "paving-program", "Street Paving Program", DOS, ["Transportation"],
   "Streets resurfaced each paving season, plus streets scheduled for the upcoming season. Schedules are tentative and weather-dependent.",
   [r("Paved segments 2019–2026", "#{DATA}/streets/paving_history.csv", "csv"), r("2027 paving plan (draft)", "#{DATA}/streets/paving_plan_2027.geojson", "geojson"), r("Paving map", "https://www.westbrook.gov/streets/paving-map", "html")],
   lic: :pddl, maint: "Elena Kowalczyk", freq: "Weekly (Apr–Nov)", period: "2019 to present", modified: "2026-11-06"
ds "potholes", "Pothole Repairs", DOS, ["Transportation"],
   "Pothole reports from 311 and the date each was closed by a Streets crew. Our goal is 3 business days.",
   [r("Potholes", "#{DATA}/streets/potholes.csv", "csv")],
   lic: :pddl, freq: "Daily", period: "2017 to present", modified: "2026-11-15"
ds "snow-emergency-routes", "Snow Emergency Routes", DOS, ["Transportation", "Public Safety"],
   "Streets where parking is prohibited when a Snow Emergency is declared.",
   gis("Snow emergency routes", "Snow_Emergency_Routes"),
   lic: :cc0, freq: "As needed", modified: "2025-11-19"
ds "trash-collection-days", "Trash & Recycling Collection Days", DOS, ["Environment"],
   "Collection day for every address-range in the City. Holiday weeks shift collection by one day.",
   [r("Collection areas (GeoJSON)", "#{DATA}/streets/collection_areas.geojson", "geojson"), r("Holiday schedule 2026", "#{DATA}/streets/holiday_schedule_2026.csv", "csv"), r("Holiday schedule 2027", "#{DATA}/streets/holiday_schedule_2027.csv", "csv")],
   lic: :cc0, freq: "Annually", modified: "2026-10-20"
ds "traffic-signals", "Traffic Signals", DOS, ["Transportation"],
   "Signalized intersections, signal type, and whether the intersection has accessible pedestrian signals (APS) and a leading pedestrian interval (LPI).",
   gis("Traffic signals", "Traffic_Signals"),
   lic: :cc0, maint: "Traffic Engineering", freq: "Quarterly", modified: "2026-07-14"
ds "street-lights", "Street Light Outages", DOS, ["Transportation", "Public Safety"],
   "Street light outage reports and repair dates. Since the 2024 LED conversion, outages are also detected automatically by networked photocells.",
   [r("Outages", "#{DATA}/streets/streetlight_outages.csv", "csv")],
   lic: :pddl, freq: "Daily", period: "2018 to present", modified: "2026-11-15"
ds "traffic-crashes", "Traffic Crashes", DOS, ["Transportation", "Public Safety"],
   "Reportable crashes on City streets from PennDOT-style crash reports, including the number of people killed or seriously injured (KSI). Used to track progress on *Vision Zero Westbrook*.\n\nCrash data for the most recent year is preliminary until the state finalizes it, usually in June of the following year.",
   yearly("Crashes", "streets/crashes", (2015..2025).to_a.reverse) + [r("High Injury Network", "#{DATA}/streets/high_injury_network.geojson", "geojson")],
   lic: :pddl, maint: "Vision Zero Program", freq: "Annually", period: "2015 – 2025", modified: "2026-06-11"
ds "bike-network", "Bike Network", DOS, ["Transportation", "Parks / Recreation"],
   "Bike lanes, protected bike lanes, sharrows and off-street trails.",
   gis("Bike network", "Bike_Network"),
   lic: :odbl, freq: "Quarterly", modified: "2026-09-12"
ds "parking-violations", "Parking Violations", DOS, ["Transportation"],
   "Parking tickets issued by the Parking Authority and Police, with violation type, fine and location. Plate numbers are hashed.",
   [r("Parking violations 2025", "#{DATA}/streets/parking_violations_2025.csv", "csv"), r("Parking violations 2024", "#{DATA}/streets/parking_violations_2024.csv", "csv"), r("Parking violations 2023", "#{DATA}/streets/parking_violations_2023.csv", "csv")],
   lic: :pddl, maint: "Westbrook Parking Authority", freq: "Monthly", period: "2023 to present", modified: "2026-11-02"

# ---------------------------------------------------------------- Water
ds "water-main-breaks", "Water Main Breaks", WWD, ["Environment", "Transportation"],
   "Location and date of water main breaks and the pipe material/diameter where known.",
   [r("Main breaks", "#{DATA}/water/main_breaks.csv", "csv"), r("Main breaks (GeoJSON)", "#{DATA}/water/main_breaks.geojson", "geojson")],
   lic: :pddl, maint: "Water Operations", freq: "Monthly", period: "2005 to present", modified: "2026-10-30"
ds "lead-service-lines", "Lead Service Line Inventory", WWD, ["Health / Human Services", "Environment"],
   "Service line material for every water account, as required by the EPA Lead and Copper Rule Revisions. Material is classified as **Lead**, **Galvanized Requiring Replacement**, **Non-Lead**, or **Unknown**. About 31% of lines are still Unknown; customers can help by [submitting a photo of their service line](https://www.westbrook.gov/water/check-your-pipe).",
   [r("Service line inventory", "#{DATA}/water/service_line_inventory.csv", "csv"), r("Inventory map", "https://www.westbrook.gov/water/lead-map", "html"), r("Replacements completed", "#{DATA}/water/lsl_replacements.csv", "csv")],
   lic: :pddl, maint: "Jamal Okafor", freq: "Monthly", period: "Current", modified: "2026-11-01"
ds "water-quality-report", "Annual Drinking Water Quality Report", WWD, ["Health / Human Services", "Environment"],
   "Consumer Confidence Report with detected contaminant levels compared against EPA limits.",
   yearly("Water quality report", "water/ccr", (2019..2025).to_a.reverse, "pdf"),
   lic: :na, freq: "Annually", modified: "2026-06-28"
ds "stormwater-green-infrastructure", "Green Stormwater Infrastructure", WWD, ["Environment", "Parks / Recreation"],
   "Rain gardens, tree trenches, porous pavement and other green stormwater tools built under *Green Streets, Clean Rivers*, with the impervious acres each one manages.",
   gis("GSI projects", "GSI_Projects"),
   lic: :ccby, maint: "Jamal Okafor", freq: "Quarterly", modified: "2026-08-15"
ds "combined-sewer-overflows", "Combined Sewer Overflow Events", WWD, ["Environment"],
   "Overflow events at each of the 41 permitted CSO outfalls, with estimated volume.",
   [r("CSO events", "#{DATA}/water/cso_events.csv", "csv"), r("Outfall locations", "#{DATA}/water/cso_outfalls.geojson", "geojson")],
   lic: :pddl, freq: "Monthly", period: "2012 to present", modified: "2026-10-09"

# ---------------------------------------------------------------- Parks
ds "parks", "Parks & Open Space", PR, ["Parks / Recreation"],
   "Boundaries of City-owned parks, plazas and natural lands, with acreage and amenities.",
   gis("Parks", "PPR_Properties"),
   lic: :cc0, maint: "Parks GIS", freq: "Quarterly", modified: "2026-09-02"
ds "street-trees", "Street Tree Inventory", PR, ["Parks / Recreation", "Environment"],
   "Every street tree inventoried in the 2022 TreeKeeper census, with species, diameter at breast height (DBH) and condition, updated as trees are planted and removed. About 131,000 trees.",
   [r("Street trees", "#{DATA}/parks/street_trees.csv", "csv"), r("Street trees (Shapefile)", "#{DATA}/gis/Street_Trees.zip", "shp"), r("Tree canopy 2023 (raster)", "#{DATA}/parks/canopy_2023.zip")],
   lic: :odbl, maint: "Urban Forestry Unit", freq: "Monthly", period: "2022 census + updates", modified: "2026-10-24"
ds "recreation-centers", "Recreation Centers", PR, ["Parks / Recreation", "Education"],
   "Rec center locations, hours, and facilities (gym, pool, computer lab, kitchen).",
   [r("Rec centers", "#{DATA}/parks/rec_centers.csv", "csv"), r("Rec centers (GeoJSON)", "#{DATA}/parks/rec_centers.geojson", "geojson")],
   lic: :cc0, freq: "As needed", modified: "2026-05-30"
ds "pool-schedules", "Pool Schedules & Attendance", PR, ["Parks / Recreation"],
   "Summer pool hours and daily attendance. Pools open the last Saturday in June.",
   [r("2026 season attendance", "#{DATA}/parks/pool_attendance_2026.csv", "csv"), r("2025 season attendance", "#{DATA}/parks/pool_attendance_2025.csv", "csv"), r("Pool locations", "#{DATA}/parks/pools.geojson", "geojson")],
   lic: :cc0, freq: "Annually", period: "2025 – 2026 seasons", modified: "2026-09-08"
ds "program-registrations", "Recreation Program Registrations", PR, ["Parks / Recreation", "Education"],
   "Enrollment counts for youth and adult programs (camps, leagues, classes) by season and site. No personal information.",
   [r("Registrations", "#{DATA}/parks/registrations.csv", "csv")],
   lic: :pddl, maint: "Kayla Brooks", freq: "Seasonally", period: "Summer 2019 to Fall 2026", modified: "2026-10-14"
ds "riverside-trail-counts", "Riverside Trail Counts", PR, ["Parks / Recreation", "Transportation"],
   "Hourly counts of people walking and biking from automated counters at six points on the Riverside Trail. Counter 4 (Mill St) was offline Mar–Jul 2024 during bridge work.",
   [r("Hourly counts", "#{DATA}/parks/trail_counts_hourly.csv", "csv"), r("Counter locations", "#{DATA}/parks/trail_counters.geojson", "geojson")],
   lic: :ccby, freq: "Monthly", period: "2018-05 to present", modified: "2026-11-04"
ds "playgrounds", "Playgrounds", PR, ["Parks / Recreation"],
   "",
   [r("Playgrounds", "#{DATA}/parks/playgrounds.geojson", "geojson")],
   lic: :cc0, modified: "2024-04-02"

# ---------------------------------------------------------------- Planning
ds "zoning-base-districts", "Zoning Base Districts", DPD, ["Planning / Zoning"],
   "Zoning districts as adopted by City Council under the 2019 Zoning Code. This is the official digital zoning map; in the event of a conflict, the ordinance text governs.",
   gis("Zoning districts", "Zoning_BaseDistricts"),
   lic: :cc0, maint: "Thomas Nguyen", freq: "As needed", modified: "2026-10-17"
ds "zoning-overlays", "Zoning Overlays", DPD, ["Planning / Zoning"],
   "Overlay districts that modify base zoning: Neighborhood Commercial, Airport Hazard, Central Business District height controls, and the Riverfront overlay.",
   gis("Zoning overlays", "Zoning_Overlays"),
   lic: :cc0, maint: "Thomas Nguyen", freq: "As needed", modified: "2026-04-09"
ds "historic-districts", "Historic Districts & Properties", DPD, ["Planning / Zoning", "Arts / Culture / History"],
   "Properties on the Westbrook Register of Historic Places and the boundaries of local historic districts.",
   [r("Historic properties", "#{DATA}/planning/historic_properties.csv", "csv")] + gis("Historic districts", "Historic_Districts"),
   lic: :ccby, maint: "Historical Commission", freq: "As needed", modified: "2025-12-03"
ds "neighborhoods", "Neighborhood Boundaries", DPD, ["Planning / Zoning"],
   "Unofficial neighborhood boundaries, drawn with input from civic associations in 2017. These are *not* legal boundaries and some residents will disagree with them.",
   [r("Neighborhoods (GeoJSON)", "#{DATA}/planning/neighborhoods.geojson", "geojson"), r("Neighborhoods (KML)", "#{DATA}/planning/neighborhoods.kml", "kml")],
   lic: :odbl, freq: "Never", period: "2017", modified: "2021-09-14"
ds "census-tract-demographics", "Census Tract Demographics", DPD, ["Planning / Zoning", "Economy"],
   "Selected population, housing and income indicators from the American Community Survey 5-year estimates, by census tract. Margins of error are included for every estimate — please use them.",
   [r("ACS 2020-2024 by tract", "#{DATA}/planning/acs_2024_tract.csv", "csv"), r("ACS 2019-2023 by tract", "#{DATA}/planning/acs_2023_tract.csv", "csv"), r("Census tracts 2020", "#{DATA}/gis/Census_Tracts_2020.zip", "shp"), r("Source: Census Bureau API", "https://api.census.gov/data/2024/acs/acs5", "api")],
   lic: :pddl, maint: "Planning Research Unit", freq: "Annually", period: "ACS 2019–2023, 2020–2024", modified: "2026-01-15"
ds "comprehensive-plan-land-use", "Future Land Use (Westbrook 2040)", DPD, ["Planning / Zoning"],
   "Future land use designations from the *Westbrook 2040* comprehensive plan, adopted November 2023.",
   gis("Future land use", "Future_Land_Use"),
   lic: :ccby, freq: "Never", period: "Adopted 2023-11-09", modified: "2023-11-20"
ds "cdbg-activities", "Community Development Block Grant Activities", DPD, ["Economy", "Health / Human Services"],
   "Activities funded with CDBG, HOME and ESG funds from HUD, by program year, with amounts budgeted and drawn.",
   [r("Activities PY2020–PY2025", "#{DATA}/planning/cdbg_activities.csv", "csv"), r("CAPER 2025", "#{DATA}/planning/caper_2025.pdf", "pdf")],
   lic: :pddl, maint: "Housing & Community Development", freq: "Annually", period: "PY2020 – PY2025", modified: "2026-09-26"
ds "affordable-housing-units", "Affordable Housing Production", DPD, ["Real Estate / Land Records", "Health / Human Services"],
   "Income-restricted housing units created or preserved with City support, by project and AMI level.",
   [r("Affordable housing projects", "#{DATA}/planning/affordable_housing.csv", "csv")],
   lic: :pddl, maint: "Housing & Community Development", freq: "Quarterly", period: "2016 to present", modified: "2026-10-03"

# ---------------------------------------------------------------- L&I
ds "building-permits", "Building Permits", LI, ["Planning / Zoning", "Real Estate / Land Records"],
   "Building, electrical, plumbing, mechanical, demolition and zoning permits issued by L&I, including the permit description as written by the applicant (so expect typos), declared construction cost, contractor, and status.\n\n**Heads up:** the eCLIPSE permitting system replaced the legacy Hansen system in October 2020. Permits issued before then use different permit type codes — see the crosswalk resource.",
   [r("Permits (eCLIPSE, 2020–present)", "#{DATA}/li/permits.csv", "csv"), r("Permits (Hansen, 2007–2020)", "#{DATA}/li/permits_legacy.csv", "csv"), r("Permit type crosswalk", "#{DATA}/li/permit_type_crosswalk.csv", "csv"), r("Permits API", "#{API}/v2/li/permits", "api")],
   lic: :pddl, maint: "Sofia Martins", freq: "Daily", period: "2007 to present", modified: "2026-11-15"
ds "code-violations", "Code Violations", LI, ["Real Estate / Land Records", "Public Safety"],
   "Violations of the Property Maintenance Code and Fire Code found during inspections, with status (open, complied, referred to court).",
   [r("Violations", "#{DATA}/li/violations.csv", "csv"), r("Case investigations", "#{DATA}/li/case_investigations.csv", "csv")],
   lic: :pddl, maint: "Sofia Martins", freq: "Daily", period: "2007 to present", modified: "2026-11-15"
ds "business-licenses", "Business Licenses", LI, ["Economy"],
   "Active and expired Commercial Activity Licenses and specialty licenses (food, towing, vacant property, etc.).",
   [r("Business licenses", "#{DATA}/li/business_licenses.csv", "csv")],
   lic: :pddl, freq: "Daily", modified: "2026-11-14"
ds "rental-licenses", "Rental Licenses", LI, ["Real Estate / Land Records", "Health / Human Services"],
   "Every property with a rental license, number of units, and expiration date. A rental license requires a lead-safe certificate for buildings built before 1978.",
   [r("Rental licenses", "#{DATA}/li/rental_licenses.csv", "csv")],
   lic: :pddl, maint: "Sofia Martins", freq: "Daily", modified: "2026-11-14"
ds "unsafe-imminently-dangerous", "Unsafe & Imminently Dangerous Buildings", LI, ["Public Safety", "Real Estate / Land Records"],
   "Structures declared Unsafe or Imminently Dangerous and the date of any demolition.",
   [r("Unsafe buildings", "#{DATA}/li/unsafe_buildings.csv", "csv"), r("Demolitions", "#{DATA}/li/demolitions.csv", "csv")],
   lic: :pddl, freq: "Weekly", period: "2012 to present", modified: "2026-11-07"
ds "li-appeals", "L&I Review Board Appeals", LI, ["Planning / Zoning"],
   "Appeals heard by the Zoning Board of Adjustment, Board of L&I Review, and Board of Building Standards, with decisions.",
   [r("Appeals", "#{DATA}/li/appeals.csv", "csv"), r("Hearing calendar", "https://www.westbrook.gov/li/appeals-calendar", "html")],
   lic: :pddl, freq: "Weekly", period: "2016 to present", modified: "2026-11-13"

# ---------------------------------------------------------------- Health
ds "restaurant-inspections", "Restaurant Inspections", DPH, ["Food", "Health / Human Services"],
   "Results of routine and complaint inspections of restaurants, food trucks, grocery stores and other food establishments. Each violation is a separate row; join on `inspection_id`.\n\nA **Pass** with violations is normal — most inspections find at least one minor issue.",
   [r("Inspections", "#{DATA}/health/food_inspections.csv", "csv"), r("Violations", "#{DATA}/health/food_violations.csv", "csv"), r("Violation code reference", "#{DATA}/health/food_code_reference.pdf", "pdf")],
   lic: :pddl, maint: "Environmental Health Services", freq: "Daily", period: "2016 to present", modified: "2026-11-14"
ds "childhood-blood-lead", "Childhood Blood Lead Levels", DPH, ["Health / Human Services"],
   "Number of children under 6 tested and the number with elevated blood lead levels (≥3.5 µg/dL) by ZIP code and year. Counts under 6 are suppressed.",
   [r("Blood lead by ZIP", "#{DATA}/health/blood_lead_zip.csv", "csv")],
   lic: :ccby, maint: "Lead & Healthy Homes Program", freq: "Annually", period: "2013 – 2025", modified: "2026-04-30"
ds "covid-19-cases", "COVID-19 Cases by ZIP Code (Archived)", DPH, ["Health / Human Services"],
   "**This dataset is no longer updated.** Daily reporting ended on May 11, 2023 with the end of the federal Public Health Emergency. Wastewater surveillance continues — see *Respiratory Virus Wastewater Surveillance*.\n\nConfirmed and probable COVID-19 cases, hospitalizations and deaths among Westbrook residents by ZIP code and date of specimen collection.",
   [r("Cases by ZIP and date", "#{DATA}/health/covid_cases_zip.csv", "csv"), r("Deaths by age group", "#{DATA}/health/covid_deaths_age.csv", "csv")],
   lic: :pddl, freq: "No longer updated", period: "2020-03-10 to 2023-05-11", modified: "2023-05-12"
ds "covid-19-vaccinations", "COVID-19 Vaccinations (Archived)", DPH, ["Health / Human Services"],
   "**Archived.** Doses administered to Westbrook residents by ZIP, age and race/ethnicity.",
   [r("Vaccinations by ZIP", "#{DATA}/health/covid_vax_zip.csv", "csv")],
   lic: :pddl, freq: "No longer updated", period: "2020-12-15 to 2023-05-11", modified: "2023-05-12"
ds "wastewater-surveillance", "Respiratory Virus Wastewater Surveillance", DPH, ["Health / Human Services", "Environment"],
   "SARS-CoV-2, influenza A/B and RSV concentrations in wastewater samples from the City's three treatment plants, normalized by flow. Samples are collected twice weekly.",
   [r("Wastewater results", "#{DATA}/health/wastewater.csv", "csv"), r("Dashboard", "https://www.westbrook.gov/health/wastewater", "html")],
   lic: :ccby, maint: "Epidemiology Program", freq: "Twice weekly", period: "2021-09 to present", modified: "2026-11-13"
ds "health-centers", "City Health Centers", DPH, ["Health / Human Services"],
   "Locations and services of the eight City-run community health centers.",
   [r("Health centers", "#{DATA}/health/health_centers.csv", "csv")],
   lic: :cc0, freq: "As needed", modified: "2025-10-06"
ds "overdose-deaths", "Unintentional Overdose Deaths", DPH, ["Health / Human Services", "Public Safety"],
   "Unintentional drug overdose deaths by year, substance involved, age group, sex and race/ethnicity, from Medical Examiner data. Most recent year is provisional.",
   [r("Overdose deaths", "#{DATA}/health/overdose_deaths.csv", "csv"), r("Annual report 2025", "#{DATA}/health/overdose_report_2025.pdf", "pdf")],
   lic: :ccby, maint: "Substance Use Prevention & Harm Reduction", freq: "Annually", period: "2010 – 2025", modified: "2026-08-29"
ds "farmers-markets", "Farmers Markets", DPH, ["Food"],
   "Farmers markets operating this season, days/hours, and whether they accept SNAP and Philly Food Bucks-style *Westbrook Fresh Bucks*.",
   [r("Farmers markets 2026", "#{DATA}/health/farmers_markets_2026.csv", "csv"), r("Farmers markets 2025", "#{DATA}/health/farmers_markets_2025.csv", "csv")],
   lic: :cc0, maint: "Get Healthy Westbrook", freq: "Annually", period: "2025 – 2026 seasons", modified: "2026-04-22"
ds "healthy-corner-stores", "Healthy Corner Stores", DPH, ["Food", "Economy"],
   "Corner stores participating in the Healthy Corner Store Initiative.",
   [r("Stores", "#{DATA}/health/corner_stores.csv", "csv")],
   lic: :cc0, freq: "Annually", modified: "2024-03-11"

# ---------------------------------------------------------------- Clerk / elections
ds "election-results", "Election Results", CLK, ["Elections / Politics"],
   "Precinct-level results for primary and general elections as certified by the County Board of Elections. Write-in votes are aggregated.",
   [r("2025 Municipal General", "#{DATA}/clerk/results_2025_general.csv", "csv"), r("2025 Municipal Primary", "#{DATA}/clerk/results_2025_primary.csv", "csv"),
    r("2024 General", "#{DATA}/clerk/results_2024_general.csv", "csv"), r("2024 Primary", "#{DATA}/clerk/results_2024_primary.csv", "csv"),
    r("2023 Municipal General", "#{DATA}/clerk/results_2023_general.csv", "csv"), r("2022 General", "#{DATA}/clerk/results_2022_general.csv", "csv")],
   lic: :pddl, maint: "Rebecca Lindqvist", freq: "After each election", period: "2022 – 2025", modified: "2025-11-25"
ds "polling-places", "Polling Places", CLK, ["Elections / Politics"],
   "Polling place for each division for the November 3, 2026 General Election, with ADA accessibility rating.",
   [r("Polling places 2026 General", "#{DATA}/clerk/polling_places_2026g.csv", "csv"), r("Polling places (GeoJSON)", "#{DATA}/clerk/polling_places_2026g.geojson", "geojson")],
   lic: :cc0, maint: "Rebecca Lindqvist", freq: "Before each election", modified: "2026-10-06"
ds "voting-divisions", "Wards & Divisions", CLK, ["Elections / Politics"],
   "Boundaries of the 31 wards and 690 voting divisions.",
   gis("Wards", "Political_Wards") + [r("Divisions (Shapefile)", "#{DATA}/gis/Political_Divisions.zip", "shp")],
   lic: :cc0, freq: "As needed", modified: "2022-02-01"
ds "council-districts", "City Council Districts", CLK, ["Elections / Politics"],
   "Boundaries of the 10 Council districts, redistricted in 2022.",
   gis("Council districts", "Council_Districts_2022"),
   lic: :cc0, period: "Effective 2023", modified: "2022-05-18"
ds "campaign-finance", "Campaign Finance Filings", CLK, ["Elections / Politics"],
   "Contributions and expenditures reported by candidates and political committees for City offices. Data is as-filed and has not been audited; amended reports supersede originals.",
   [r("Contributions", "#{DATA}/clerk/cf_contributions.csv", "csv"), r("Expenditures", "#{DATA}/clerk/cf_expenditures.csv", "csv"), r("Filers", "#{DATA}/clerk/cf_filers.csv", "csv")],
   lic: :pddl, maint: "Board of Ethics", freq: "Daily during filing periods", period: "2007 to present", modified: "2026-11-12"
ds "council-legislation", "City Council Legislation", CLK, ["Elections / Politics"],
   "Bills and resolutions introduced in Council, sponsors, committee referral and final action.",
   [r("Legislation", "#{DATA}/clerk/legislation.csv", "csv"), r("Legistar API", "https://webapi.legistar.com/v1/westbrook/matters", "api")],
   lic: :pddl, freq: "Weekly", period: "2008 to present", modified: "2026-11-14"
ds "lobbyist-registrations", "Lobbyist Registrations", CLK, ["Elections / Politics"],
   "Registered lobbyists, principals, and quarterly expense reports.",
   [r("Registrations", "#{DATA}/clerk/lobbyists.csv", "csv"), r("Expense reports", "#{DATA}/clerk/lobbying_expenses.csv", "csv")],
   lic: :pddl, maint: "Board of Ethics", freq: "Quarterly", modified: "2026-10-31"

# ---------------------------------------------------------------- Library
ds "library-branches", "Library Branches", WPL, ["Education", "Arts / Culture / History"],
   "Branch locations and open hours. Several branches are closed Sundays in summer.",
   [r("Branches", "#{DATA}/library/branches.csv", "csv"), r("Branches (GeoJSON)", "#{DATA}/library/branches.geojson", "geojson")],
   lic: :cc0, freq: "As needed", modified: "2026-06-01"
ds "library-circulation", "Library Circulation", WPL, ["Education"],
   "Monthly checkouts and renewals by branch and material type (print, e-book, audiobook, DVD, Library of Things).",
   [r("Circulation by month", "#{DATA}/library/circulation_monthly.csv", "csv")],
   lic: :ccby, maint: "Library Analytics", freq: "Monthly", period: "2015-01 to 2026-10", modified: "2026-11-06"
ds "library-programs", "Library Program Attendance", WPL, ["Education", "Arts / Culture / History"],
   "Attendance at storytimes, ESL classes, job readiness workshops, author talks and teen programs.",
   [r("Program attendance", "#{DATA}/library/programs.csv", "csv")],
   lic: :ccby, freq: "Quarterly", period: "FY2019 to present", modified: "2026-10-10"
ds "library-catalog", "Library Catalog Records", WPL, ["Education"],
   "MARC records for the physical collection. Very large; most people want the CSV extract instead.",
   [r("Catalog extract (CSV)", "#{DATA}/library/catalog_extract.csv", "csv"), r("Full MARC dump", "#{DATA}/library/catalog.mrc"), r("Catalog API (SRU)", "https://catalog.westbrooklibrary.org/sru", "xml")],
   lic: :cc0, maint: "Technical Services", freq: "Monthly", modified: "2026-11-01"

# ---------------------------------------------------------------- Transit
ds "gtfs", "GTFS Schedule Feed", WRT, ["Transportation"],
   "Scheduled service for all bus and light rail routes in the [General Transit Feed Specification](https://gtfs.org) format. The current feed is valid from **September 6, 2026** through February 2027.",
   [r("GTFS (current)", "https://www.wrtransit.org/gtfs/google_transit.zip"), r("GTFS (previous, June 2026)", "https://www.wrtransit.org/gtfs/archive/2026-06.zip"), r("Feed info", "https://www.wrtransit.org/developers", "html")],
   lic: :ccby, maint: "WRT Scheduling", freq: "Each service change", period: "2026-09-06 to 2027-02-20", modified: "2026-09-01"
ds "gtfs-realtime", "GTFS-Realtime Vehicle Positions", WRT, ["Transportation"],
   "Real-time vehicle positions, trip updates and service alerts. Requires a free developer key.",
   [r("Vehicle positions", "https://api.wrtransit.org/gtfsrt/vehicles", "api"), r("Trip updates", "https://api.wrtransit.org/gtfsrt/trips", "api"), r("Service alerts", "https://api.wrtransit.org/gtfsrt/alerts", "api")],
   lic: :ccby, maint: "WRT Developer Relations", freq: "Real-time", modified: "2026-03-12"
ds "transit-ridership", "Ridership by Route", WRT, ["Transportation"],
   "Average weekday, Saturday and Sunday boardings by route and month, from automatic passenger counters.",
   [r("Ridership by route", "#{DATA}/transit/ridership_route_monthly.csv", "csv"), r("Ridership by stop (fall 2025)", "#{DATA}/transit/ridership_stop_fall2025.csv", "csv")],
   lic: :ccby, freq: "Monthly", period: "2017-01 to 2026-09", modified: "2026-10-21"
ds "on-time-performance", "On-Time Performance", WRT, ["Transportation"],
   "Percent of trips arriving between 1 minute early and 5 minutes late, by route and month.",
   [r("OTP by route", "#{DATA}/transit/otp_monthly.csv", "csv")],
   lic: :ccby, freq: "Monthly", period: "2019-01 to 2026-09", modified: "2026-10-21"
ds "bus-stops", "Bus Stops & Shelters", WRT, ["Transportation"],
   "All active stops with amenities (shelter, bench, real-time sign) and ADA boarding pad status.",
   [r("Stops", "#{DATA}/transit/stops.csv", "csv"), r("Stops (GeoJSON)", "#{DATA}/transit/stops.geojson", "geojson")],
   lic: :ccby, freq: "Each service change", modified: "2026-09-01"
ds "bike-share-trips", "Bike Share Trips", WRT, ["Transportation", "Parks / Recreation"],
   "Anonymized trip records from *Westbrook Wheels* bike share: start/end station, start/end time, bike type (classic or electric), and pass type. Trips under 1 minute or over 24 hours are removed.",
   yearly("Trips Q", "transit/bikeshare_trips", ["2026Q3", "2026Q2", "2026Q1", "2025Q4", "2025Q3", "2025Q2", "2025Q1"]) + [r("Station list", "#{DATA}/transit/bikeshare_stations.csv", "csv"), r("GBFS feed", "https://gbfs.westbrookwheels.com/gbfs.json", "json")],
   lic: :odbl, maint: "Westbrook Wheels", freq: "Quarterly", period: "2025 Q1 to 2026 Q3", modified: "2026-10-12"

# ---------------------------------------------------------------- Sustainability
ds "building-energy-benchmarking", "Building Energy Benchmarking", SUS, ["Environment", "Real Estate / Land Records"],
   "Energy and water use reported by commercial and multifamily buildings over 50,000 sq ft, as required by the Energy Benchmarking Ordinance. Includes ENERGY STAR score, site EUI, and GHG emissions. Self-reported and not verified by the City.",
   yearly("Benchmarking (calendar year", "sustainability/benchmarking_cy", (2018..2025).to_a.reverse).each { |x| x[:name] += ")" },
   lic: :ccby, maint: "Ana Ferreira", freq: "Annually", period: "CY2018 – CY2025", modified: "2026-10-01"
ds "municipal-energy-use", "Municipal Energy Use", SUS, ["Environment", "Budget / Finance"],
   "Electricity, natural gas and fuel use and cost for City-owned buildings, street lights, and the fleet.",
   [r("Energy use by facility", "#{DATA}/sustainability/municipal_energy.csv", "csv"), r("Fleet fuel", "#{DATA}/sustainability/fleet_fuel.csv", "csv")],
   lic: :ccby, freq: "Annually", period: "FY2012 – FY2026", modified: "2026-09-19"
ds "greenhouse-gas-inventory", "Community Greenhouse Gas Inventory", SUS, ["Environment"],
   "Citywide GHG emissions by sector (buildings, transportation, waste, industrial processes) using the GPC protocol.",
   [r("GHG inventory", "#{DATA}/sustainability/ghg_inventory.csv", "csv"), r("Climate Action Plan 2035", "https://www.westbrook.gov/sustainability/cap2035", "html")],
   lic: :ccby, maint: "Ana Ferreira", freq: "Every two years", period: "2006 – 2024", modified: "2025-12-15"
ds "ev-charging-stations", "Public EV Charging Stations", SUS, ["Environment", "Transportation"],
   "Level 2 and DC fast chargers available to the public, including privately-owned stations from the NREL AFDC.",
   [r("Charging stations", "#{DATA}/sustainability/ev_chargers.csv", "csv"), r("NREL Alternative Fuel Stations API", "https://developer.nrel.gov/api/alt-fuel-stations/v1.json", "api")],
   lic: :cc0, freq: "Monthly", modified: "2026-11-03"
ds "heat-vulnerability-index", "Heat Vulnerability Index", SUS, ["Environment", "Health / Human Services"],
   "Census tracts ranked by heat exposure (land surface temperature), sensitivity (age, health) and adaptive capacity (tree canopy, AC access).",
   [r("HVI by tract", "#{DATA}/sustainability/hvi_2024.geojson", "geojson"), r("Methodology", "#{DATA}/sustainability/hvi_methodology.pdf", "pdf")],
   lic: :ccby, period: "2024", modified: "2024-07-30"
ds "solar-installations", "Rooftop Solar Installations", SUS, ["Environment"],
   "Solar PV permits by installed capacity (kW), aggregated to the block group.",
   [r("Solar by block group", "#{DATA}/sustainability/solar_bg.csv", "csv")],
   lic: :ccby, freq: "Quarterly", period: "2010 to present", modified: "2026-07-09"

# ---------------------------------------------------------------- OPA
ds "property-assessments", "Property Assessments", OPA, ["Real Estate / Land Records", "Budget / Finance"],
   "Certified market value, taxable land and improvement values, exemptions (homestead, LOOP, 10-year abatement) and property characteristics for all ~580,000 parcels. Owner names are included as they appear on the deed.\n\nTax year 2027 values were certified on **March 31, 2026**. Values for prior tax years are kept for comparison.",
   yearly("Assessments tax year", "opa/assessments_ty", (2022..2027).to_a.reverse) + [r("Property API", "#{API}/v2/opa/properties", "api"), r("Field definitions", "#{DATA}/opa/metadata.pdf", "pdf")],
   lic: :pddl, maint: "Daniel Okonjo", freq: "Annually (weekly corrections)", period: "TY2022 – TY2027", modified: "2026-11-10"
ds "property-sales", "Real Estate Transfers", OPA, ["Real Estate / Land Records", "Economy"],
   "Deeds, mortgages and other documents recorded with the Department of Records, with consideration (sale price) and realty transfer tax paid. Sheriff sales and $1 transfers are flagged.",
   [r("Transfers", "#{DATA}/opa/rtt_summary.csv", "csv"), r("Transfers (last 12 months)", "#{DATA}/opa/rtt_last_12m.csv", "csv")],
   lic: :pddl, freq: "Daily", period: "1999 to present", modified: "2026-11-15"
ds "parcels", "Parcel Boundaries", OPA, ["Real Estate / Land Records"],
   "Parcel polygons from the Department of Records. Join to assessments on `parcel_number`.",
   gis("Parcels", "DOR_Parcel"),
   lic: :cc0, maint: "GIS Services Group", freq: "Weekly", modified: "2026-11-13"
ds "real-estate-tax-delinquencies", "Real Estate Tax Delinquencies", OPA, ["Real Estate / Land Records", "Budget / Finance"],
   "Properties with unpaid real estate taxes, principal and interest owed, years delinquent, and whether the property is on a payment agreement.",
   [r("Delinquencies", "#{DATA}/opa/tax_delinquencies.csv", "csv")],
   lic: :pddl, maint: "Department of Revenue", freq: "Monthly", modified: "2026-11-01"
ds "vacant-land", "Vacant Land Inventory", OPA, ["Real Estate / Land Records", "Planning / Zoning"],
   "Parcels likely to be vacant land based on assessment, L&I and water account data. **This is an estimate**, not a determination of vacancy.",
   [r("Vacant land indicators", "#{DATA}/opa/vacant_land.geojson", "geojson")],
   lic: :ccby, freq: "Quarterly", modified: "2025-06-30"

# ---------------------------------------------------------------- Arts
ds "public-art", "Public Art Collection", ART, ["Arts / Culture / History"],
   "More than 420 sculptures, murals and installations in the City's collection, with artist, year, medium and location. Photos are © the artists and are not covered by the open license.",
   [r("Public art", "#{DATA}/arts/public_art.csv", "csv"), r("Public art (GeoJSON)", "#{DATA}/arts/public_art.geojson", "geojson")],
   lic: :ccbysa, maint: "Maya Castellanos", freq: "As needed", modified: "2026-08-08"
ds "murals", "Mural Arts Inventory", ART, ["Arts / Culture / History"],
   "Murals painted through the Mural Arts program since 1986. Many murals have since been lost to demolition or new construction; `status` tells you which still exist.",
   [r("Murals", "#{DATA}/arts/murals.csv", "csv")],
   lic: :ccbysa, maint: "Maya Castellanos", freq: "Monthly", period: "1986 to present", modified: "2026-10-27"
ds "special-events", "Special Event Permits", ART, ["Arts / Culture / History", "Transportation"],
   "Permitted festivals, parades, block parties and races, with street closures.",
   [r("Special events 2026", "#{DATA}/arts/special_events_2026.csv", "csv"), r("Special events 2025", "#{DATA}/arts/special_events_2025.csv", "csv"), r("Street closures (GeoJSON)", "#{DATA}/arts/street_closures.geojson", "geojson")],
   lic: :pddl, freq: "Weekly", period: "2025 – 2026", modified: "2026-11-11"
ds "cultural-fund-grants", "Cultural Fund Grants", ART, ["Arts / Culture / History", "Budget / Finance"],
   "Grants awarded to arts & culture nonprofits by the Westbrook Cultural Fund.",
   [r("Grants FY2018–FY2026", "#{DATA}/arts/cultural_fund_grants.csv", "csv")],
   lic: :pddl, freq: "Annually", period: "FY2018 – FY2026", modified: "2026-01-09"
ds "historical-markers", "Historical Markers", ART, ["Arts / Culture / History"],
   "State and local historical markers. Transcriptions contributed by volunteers — corrections welcome!",
   [r("Markers", "#{DATA}/arts/historical_markers.csv", "csv")],
   lic: :ccbysa, maint: "volunteer-maintained", modified: "2022-10-19"

# ---------------------------------------------------------------- Human services
ds "point-in-time-count", "Homeless Point-in-Time Count", DHS, ["Health / Human Services"],
   "Results of the annual January Point-in-Time count of people experiencing homelessness, sheltered and unsheltered, by household type.",
   yearly("PIT count", "dhs/pit", (2016..2026).to_a.reverse),
   lic: :pddl, maint: "Office of Homeless Services", freq: "Annually", period: "2016 – 2026", modified: "2026-05-14"
ds "shelter-capacity", "Emergency Shelter Capacity", DHS, ["Health / Human Services"],
   "Nightly bed capacity and occupancy at City-funded emergency shelters. Shelter addresses are not published.",
   [r("Nightly occupancy", "#{DATA}/dhs/shelter_occupancy.csv", "csv")],
   lic: :pddl, maint: "Office of Homeless Services", freq: "Daily", period: "2019 to present", modified: "2026-11-15"
ds "senior-centers", "Senior Centers", DHS, ["Health / Human Services"],
   "Senior centers and satellite meal sites.",
   [r("Senior centers", "#{DATA}/dhs/senior_centers.csv", "csv")],
   lic: :cc0, modified: "2025-02-18"
ds "cooling-centers", "Cooling Centers", DHS, ["Health / Human Services", "Environment"],
   "Locations opened during Heat Health Emergencies. Check the City's alerts page for which centers are open today.",
   [r("Cooling centers 2026", "#{DATA}/dhs/cooling_centers_2026.csv", "csv")],
   lic: :cc0, freq: "Annually", period: "Summer 2026", modified: "2026-06-15"
ds "summer-meals", "Summer Meal Sites", DHS, ["Food", "Education"],
   "Free summer breakfast and lunch sites for kids and teens 18 and under.",
   [r("Summer meal sites 2026", "#{DATA}/dhs/summer_meals_2026.csv", "csv"), r("Summer meal sites 2025", "#{DATA}/dhs/summer_meals_2025.csv", "csv")],
   lic: :cc0, maint: "Youth Programs", freq: "Annually", modified: "2026-06-10"

# ---------------------------------------------------------------- odd ones: partner orgs without a page, no category, etc.
ds "public-housing-developments", "Public Housing Developments", "Westbrook Housing Authority", ["Real Estate / Land Records", "Health / Human Services"],
   "Developments owned or managed by the Westbrook Housing Authority (WHA). Provided by WHA; contact them directly with questions.",
   [r("WHA developments", "https://www.westbrookha.org/data/developments.csv", "csv")],
   lic: :na, maint: "Westbrook Housing Authority", modified: "2024-11-01"
ds "school-locations", "School Locations", "Westbrook School District", ["Education"],
   "Public, charter and private K-12 schools with grade levels and enrollment. Maintained by the School District; republished here.",
   [r("Schools 2025-26", "https://www.westbrooksd.org/opendata/schools_2025_26.csv", "csv"), r("Schools 2024-25", "https://www.westbrooksd.org/opendata/schools_2024_25.csv", "csv"), r("School catchments", "https://www.westbrooksd.org/opendata/catchments.geojson", "geojson")],
   lic: :ccby, maint: "WSD Office of Research", freq: "Annually", period: "SY2024-25, SY2025-26", modified: "2025-10-15"
ds "air-monitoring-stations", "Air Monitoring Stations", DPH, ["Environment", "Health / Human Services"],
   "Locations of the Air Management Services monitoring network, with the pollutants measured at each site (PM2.5, ozone, NO2, SO2, CO).",
   [r("Air Monitoring Stations CSV", "#{DATA}/health/air_monitoring_stations.csv", "csv"), r("Air Monitoring Stations Shapefile", "#{DATA}/gis/Air_Monitoring_Stations.zip", "shp"), r("Air Monitoring Stations GeoService", "#{GIS}/Air_Monitoring_Stations/FeatureServer/0/query", "api")],
   lic: :pddl, maint: "Air Management Services", freq: "As needed", modified: "2023-08-10"
ds "fleet-vehicles", "City Fleet Vehicles", "Office of Fleet Management", [],
   "Make, model, year and fuel type of every vehicle in the municipal fleet.",
   [r("Fleet inventory", "#{DATA}/fleet/vehicles.xlsx", "xlsx")],
   lic: :pddl, modified: "2022-01-31"
ds "noise-complaints", "Noise Complaints", OIT, [],
   "311 requests of type *Noise — Residential*, *Noise — Commercial* and *Noise — Construction*, broken out from the main 311 dataset by popular request.",
   [r("Noise complaints", "#{DATA}/oit/311_noise.csv", "csv")],
   lic: :pddl, freq: "Daily", modified: "2026-11-15"
ds "aerial-imagery", "Aerial Imagery", "GIS Services Group", ["Planning / Zoning"],
   "Orthoimagery flown every two years at 3-inch resolution (2024) and 6-inch (2016–2022). Served as tiled map services; full-resolution downloads available on request because of their size (~4 TB per year).",
   [r("2024 imagery tile service", "#{GIS}/Imagery_2024/ImageServer", "api"), r("2022 imagery tile service", "#{GIS}/Imagery_2022/ImageServer", "api"), r("2020 imagery tile service", "#{GIS}/Imagery_2020/ImageServer", "api"), r("Request full-resolution tiles", "mailto:gis@westbrook.gov")],
   lic: :ccby, maint: "GIS Services Group", freq: "Every two years", period: "2016 – 2024", modified: "2025-03-04"
