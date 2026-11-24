# Postmortem: Eastside booking outage, September 8

**Status:** Complete · **Severity:** SEV-2 · **Author:** Priya Raman · **Reviewers:** Marcus Ode, Lena Kowalczyk

## What happened

From 6:10 to 8:47 a.m. on Tuesday, September 8, riders in the Eastside zone could not book trips through the app or the phone line. 63 booking attempts failed; dispatch manually scheduled 41 of those riders after they called back.

## Timeline

- **06:10** First failed booking. The dispatch dashboard shows "No vehicles available" for every Eastside stop.
- **06:32** Driver Andre T. reports an empty manifest at the depot.
- **07:05** Marcus confirms the new GTFS feed published Sept 7 has the Eastside service calendar ending on 20260907.
- **08:20** Corrected feed uploaded; vendor cache takes ~25 minutes to refresh.
- **08:47** Bookings succeed again.

## Root cause

The schedule export template still had the summer end_date hard-coded in calendar.txt. Nobody reviewed the generated feed before publishing because the change was "just a time shift."

## What went well

- Drivers and dispatch improvised a call-back list within 30 minutes.
- The vendor support line answered in under five minutes.

## Action items

| Action                                                    | Owner  | Due    | Status      |
| --------------------------------------------------------- | ------ | ------ | ----------- |
| Remove hard-coded dates from the export template          | Marcus | Sep 26 | Done        |
| Add a feed validator step (gtfs-validator) before publish | Marcus | Oct 10 | Done        |
| Write a 1-page "publishing a schedule change" checklist   | Priya  | Oct 3  | Done        |
| Text-message riders automatically when booking is down    | Lena   | Nov 30 | In progress |
| Quarterly tabletop exercise for dispatch outages          | Priya  | Dec 15 | Not started |