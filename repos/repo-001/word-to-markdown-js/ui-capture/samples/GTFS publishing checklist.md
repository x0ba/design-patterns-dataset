# Publishing a schedule change: checklist

Use this every time, even for "small" changes. (See the Sept 8 postmortem.)

1. Export from the scheduling tool with the **current** template (northgate-export-v3).
2. Run the validator locally:
   1. java -jar gtfs-validator.jar -i feed.zip -o report/
   2. Open report/report.html and confirm **zero errors**.
3. Check calendar.txt: every service_id has an end_date at least 60 days out.
4. Get a second person to look at the validator report.
5. Upload to the vendor portal before 4 p.m. so the cache refreshes overnight.
6. The next morning, book a test trip in each zone before 6 a.m.