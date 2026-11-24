import { getDatabase } from "../database/init.ts";
export const getSettings = ()=>{
  const db = getDatabase();
  const results = db.query("SELECT * FROM settings");
  return results.map((row)=>({
      key: row[0],
      value: row[1]
    }));
};
export const updateSettings = (data)=>{
  const db = getDatabase();
  const results = [];
  for (const [key, raw] of Object.entries(data)){
    // Treat explicit empty strings for certain keys as clearing the setting
    const shouldClear = [
      "companyTaxId",
      "taxId",
      "companyPhone",
      "phone",
      "companyEmail",
      "email",
      "companyCountryCode",
      "countryCode",
      "companyCity",
      "companyPostalCode",
      "locale",
      "invoiceFallbackLocale"
    ].includes(key) && String(raw).trim() === "";
    if (shouldClear) {
      // delete the setting row if present
      db.query("DELETE FROM settings WHERE key = ?", [
        key === "taxId" ? "companyTaxId" : key
      ]);
      results.push({
        key: key === "taxId" ? "companyTaxId" : key,
        value: ""
      });
      continue;
    }
    const value = String(raw);
    // Upsert the setting
    const existing = db.query("SELECT * FROM settings WHERE key = ?", [
      key
    ]);
    if (existing.length > 0) {
      db.query("UPDATE settings SET value = ? WHERE key = ?", [
        value,
        key
      ]);
    } else {
      db.query("INSERT INTO settings (key, value) VALUES (?, ?)", [
        key,
        value
      ]);
    }
    results.push({
      key,
      value
    });
  }
  return results;
};
export const getSetting = (key)=>{
  const db = getDatabase();
  const result = db.query("SELECT value FROM settings WHERE key = ?", [
    key
  ]);
  return result.length > 0 ? result[0][0] : null;
};
export const setSetting = (key, value)=>{
  const db = getDatabase();
  const existing = db.query("SELECT * FROM settings WHERE key = ?", [
    key
  ]);
  if (existing.length > 0) {
    db.query("UPDATE settings SET value = ? WHERE key = ?", [
      value,
      key
    ]);
  } else {
    db.query("INSERT INTO settings (key, value) VALUES (?, ?)", [
      key,
      value
    ]);
  }
  return {
    key,
    value
  };
};
export const deleteSetting = (key)=>{
  const db = getDatabase();
  db.query("DELETE FROM settings WHERE key = ?", [
    key
  ]);
  return {
    key
  };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvL2JhY2tlbmQvc3JjL2NvbnRyb2xsZXJzL3NldHRpbmdzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGdldERhdGFiYXNlIH0gZnJvbSBcIi4uL2RhdGFiYXNlL2luaXQudHNcIjtcbmltcG9ydCB7IFNldHRpbmcgfSBmcm9tIFwiLi4vdHlwZXMvaW5kZXgudHNcIjtcblxuZXhwb3J0IGNvbnN0IGdldFNldHRpbmdzID0gKCkgPT4ge1xuICBjb25zdCBkYiA9IGdldERhdGFiYXNlKCk7XG4gIGNvbnN0IHJlc3VsdHMgPSBkYi5xdWVyeShcIlNFTEVDVCAqIEZST00gc2V0dGluZ3NcIik7XG4gIHJldHVybiByZXN1bHRzLm1hcCgocm93OiB1bmtub3duW10pID0+ICh7XG4gICAga2V5OiByb3dbMF0gYXMgc3RyaW5nLFxuICAgIHZhbHVlOiByb3dbMV0gYXMgc3RyaW5nLFxuICB9KSk7XG59O1xuXG5leHBvcnQgY29uc3QgdXBkYXRlU2V0dGluZ3MgPSAoZGF0YTogUmVjb3JkPHN0cmluZywgc3RyaW5nPikgPT4ge1xuICBjb25zdCBkYiA9IGdldERhdGFiYXNlKCk7XG4gIGNvbnN0IHJlc3VsdHM6IFNldHRpbmdbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgW2tleSwgcmF3XSBvZiBPYmplY3QuZW50cmllcyhkYXRhKSkge1xuICAgIC8vIFRyZWF0IGV4cGxpY2l0IGVtcHR5IHN0cmluZ3MgZm9yIGNlcnRhaW4ga2V5cyBhcyBjbGVhcmluZyB0aGUgc2V0dGluZ1xuICAgIGNvbnN0IHNob3VsZENsZWFyID0gW1xuICAgICAgXCJjb21wYW55VGF4SWRcIixcbiAgICAgIFwidGF4SWRcIiwgLy8gYWxpYXMgdGhhdCBtYXkgc2xpcCB0aHJvdWdoXG4gICAgICBcImNvbXBhbnlQaG9uZVwiLFxuICAgICAgXCJwaG9uZVwiLCAvLyBhbGlhc1xuICAgICAgXCJjb21wYW55RW1haWxcIixcbiAgICAgIFwiZW1haWxcIiwgLy8gYWxpYXNcbiAgICAgIFwiY29tcGFueUNvdW50cnlDb2RlXCIsXG4gICAgICBcImNvdW50cnlDb2RlXCIsIC8vIGFsaWFzXG4gICAgICBcImNvbXBhbnlDaXR5XCIsXG4gICAgICBcImNvbXBhbnlQb3N0YWxDb2RlXCIsXG4gICAgICBcImxvY2FsZVwiLFxuICAgICAgXCJpbnZvaWNlRmFsbGJhY2tMb2NhbGVcIixcbiAgICBdLmluY2x1ZGVzKGtleSkgJiYgU3RyaW5nKHJhdykudHJpbSgpID09PSBcIlwiO1xuXG4gICAgaWYgKHNob3VsZENsZWFyKSB7XG4gICAgICAvLyBkZWxldGUgdGhlIHNldHRpbmcgcm93IGlmIHByZXNlbnRcbiAgICAgIGRiLnF1ZXJ5KFwiREVMRVRFIEZST00gc2V0dGluZ3MgV0hFUkUga2V5ID0gP1wiLCBbXG4gICAgICAgIGtleSA9PT0gXCJ0YXhJZFwiID8gXCJjb21wYW55VGF4SWRcIiA6IGtleSxcbiAgICAgIF0pO1xuICAgICAgcmVzdWx0cy5wdXNoKHsga2V5OiBrZXkgPT09IFwidGF4SWRcIiA/IFwiY29tcGFueVRheElkXCIgOiBrZXksIHZhbHVlOiBcIlwiIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSBTdHJpbmcocmF3KTtcbiAgICAvLyBVcHNlcnQgdGhlIHNldHRpbmdcbiAgICBjb25zdCBleGlzdGluZyA9IGRiLnF1ZXJ5KFwiU0VMRUNUICogRlJPTSBzZXR0aW5ncyBXSEVSRSBrZXkgPSA/XCIsIFtrZXldKTtcbiAgICBpZiAoZXhpc3RpbmcubGVuZ3RoID4gMCkge1xuICAgICAgZGIucXVlcnkoXCJVUERBVEUgc2V0dGluZ3MgU0VUIHZhbHVlID0gPyBXSEVSRSBrZXkgPSA/XCIsIFt2YWx1ZSwga2V5XSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRiLnF1ZXJ5KFwiSU5TRVJUIElOVE8gc2V0dGluZ3MgKGtleSwgdmFsdWUpIFZBTFVFUyAoPywgPylcIiwgW2tleSwgdmFsdWVdKTtcbiAgICB9XG4gICAgcmVzdWx0cy5wdXNoKHsga2V5LCB2YWx1ZSB9KTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHRzO1xufTtcblxuZXhwb3J0IGNvbnN0IGdldFNldHRpbmcgPSAoa2V5OiBzdHJpbmcpID0+IHtcbiAgY29uc3QgZGIgPSBnZXREYXRhYmFzZSgpO1xuICBjb25zdCByZXN1bHQgPSBkYi5xdWVyeShcIlNFTEVDVCB2YWx1ZSBGUk9NIHNldHRpbmdzIFdIRVJFIGtleSA9ID9cIiwgW2tleV0pO1xuICByZXR1cm4gcmVzdWx0Lmxlbmd0aCA+IDAgPyByZXN1bHRbMF1bMF0gOiBudWxsO1xufTtcblxuZXhwb3J0IGNvbnN0IHNldFNldHRpbmcgPSAoa2V5OiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgZGIgPSBnZXREYXRhYmFzZSgpO1xuICBjb25zdCBleGlzdGluZyA9IGRiLnF1ZXJ5KFwiU0VMRUNUICogRlJPTSBzZXR0aW5ncyBXSEVSRSBrZXkgPSA/XCIsIFtrZXldKTtcblxuICBpZiAoZXhpc3RpbmcubGVuZ3RoID4gMCkge1xuICAgIGRiLnF1ZXJ5KFwiVVBEQVRFIHNldHRpbmdzIFNFVCB2YWx1ZSA9ID8gV0hFUkUga2V5ID0gP1wiLCBbdmFsdWUsIGtleV0pO1xuICB9IGVsc2Uge1xuICAgIGRiLnF1ZXJ5KFwiSU5TRVJUIElOVE8gc2V0dGluZ3MgKGtleSwgdmFsdWUpIFZBTFVFUyAoPywgPylcIiwgW2tleSwgdmFsdWVdKTtcbiAgfVxuXG4gIHJldHVybiB7IGtleSwgdmFsdWUgfTtcbn07XG5cbmV4cG9ydCBjb25zdCBkZWxldGVTZXR0aW5nID0gKGtleTogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IGRiID0gZ2V0RGF0YWJhc2UoKTtcbiAgZGIucXVlcnkoXCJERUxFVEUgRlJPTSBzZXR0aW5ncyBXSEVSRSBrZXkgPSA/XCIsIFtrZXldKTtcbiAgcmV0dXJuIHsga2V5IH0gYXMgUGljazxTZXR0aW5nLCBcImtleVwiPjtcbn07XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxXQUFXLFFBQVEsc0JBQXNCO0FBR2xELE9BQU8sTUFBTSxjQUFjO0VBQ3pCLE1BQU0sS0FBSztFQUNYLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQztFQUN6QixPQUFPLFFBQVEsR0FBRyxDQUFDLENBQUMsTUFBbUIsQ0FBQztNQUN0QyxLQUFLLEdBQUcsQ0FBQyxFQUFFO01BQ1gsT0FBTyxHQUFHLENBQUMsRUFBRTtJQUNmLENBQUM7QUFDSCxFQUFFO0FBRUYsT0FBTyxNQUFNLGlCQUFpQixDQUFDO0VBQzdCLE1BQU0sS0FBSztFQUNYLE1BQU0sVUFBcUIsRUFBRTtFQUU3QixLQUFLLE1BQU0sQ0FBQyxLQUFLLElBQUksSUFBSSxPQUFPLE9BQU8sQ0FBQyxNQUFPO0lBQzdDLHdFQUF3RTtJQUN4RSxNQUFNLGNBQWM7TUFDbEI7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO0tBQ0QsQ0FBQyxRQUFRLENBQUMsUUFBUSxPQUFPLEtBQUssSUFBSSxPQUFPO0lBRTFDLElBQUksYUFBYTtNQUNmLG9DQUFvQztNQUNwQyxHQUFHLEtBQUssQ0FBQyxzQ0FBc0M7UUFDN0MsUUFBUSxVQUFVLGlCQUFpQjtPQUNwQztNQUNELFFBQVEsSUFBSSxDQUFDO1FBQUUsS0FBSyxRQUFRLFVBQVUsaUJBQWlCO1FBQUssT0FBTztNQUFHO01BQ3RFO0lBQ0Y7SUFFQSxNQUFNLFFBQVEsT0FBTztJQUNyQixxQkFBcUI7SUFDckIsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLHdDQUF3QztNQUFDO0tBQUk7SUFDdkUsSUFBSSxTQUFTLE1BQU0sR0FBRyxHQUFHO01BQ3ZCLEdBQUcsS0FBSyxDQUFDLCtDQUErQztRQUFDO1FBQU87T0FBSTtJQUN0RSxPQUFPO01BQ0wsR0FBRyxLQUFLLENBQUMsbURBQW1EO1FBQUM7UUFBSztPQUFNO0lBQzFFO0lBQ0EsUUFBUSxJQUFJLENBQUM7TUFBRTtNQUFLO0lBQU07RUFDNUI7RUFFQSxPQUFPO0FBQ1QsRUFBRTtBQUVGLE9BQU8sTUFBTSxhQUFhLENBQUM7RUFDekIsTUFBTSxLQUFLO0VBQ1gsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLDRDQUE0QztJQUFDO0dBQUk7RUFDekUsT0FBTyxPQUFPLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHO0FBQzVDLEVBQUU7QUFFRixPQUFPLE1BQU0sYUFBYSxDQUFDLEtBQWE7RUFDdEMsTUFBTSxLQUFLO0VBQ1gsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLHdDQUF3QztJQUFDO0dBQUk7RUFFdkUsSUFBSSxTQUFTLE1BQU0sR0FBRyxHQUFHO0lBQ3ZCLEdBQUcsS0FBSyxDQUFDLCtDQUErQztNQUFDO01BQU87S0FBSTtFQUN0RSxPQUFPO0lBQ0wsR0FBRyxLQUFLLENBQUMsbURBQW1EO01BQUM7TUFBSztLQUFNO0VBQzFFO0VBRUEsT0FBTztJQUFFO0lBQUs7RUFBTTtBQUN0QixFQUFFO0FBRUYsT0FBTyxNQUFNLGdCQUFnQixDQUFDO0VBQzVCLE1BQU0sS0FBSztFQUNYLEdBQUcsS0FBSyxDQUFDLHNDQUFzQztJQUFDO0dBQUk7RUFDcEQsT0FBTztJQUFFO0VBQUk7QUFDZixFQUFFIn0=
// denoCacheMetadata=4141233129411368574,18238315424879556399