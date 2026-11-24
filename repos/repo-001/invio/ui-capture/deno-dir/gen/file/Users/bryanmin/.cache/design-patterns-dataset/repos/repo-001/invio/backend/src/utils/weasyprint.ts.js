function candidatePaths() {
  const envBin = Deno.env.get("WEASYPRINT_BIN");
  const list = [];
  if (envBin && envBin.trim()) {
    list.push(envBin.trim());
  }
  if (Deno.build.os === "windows") {
    list.push("C:/Program Files/WeasyPrint/weasyprint.exe", "C:/Program Files (x86)/WeasyPrint/weasyprint.exe");
  } else {
    list.push("/usr/bin/weasyprint", "/usr/local/bin/weasyprint", "weasyprint");
  }
  return list;
}
async function commandWorks(command) {
  try {
    const proc = new Deno.Command(command, {
      args: [
        "--version"
      ],
      stdout: "piped",
      stderr: "piped"
    });
    const { success } = await proc.output();
    return success;
  } catch  {
    return false;
  }
}
export async function findWeasyPrint(candidates = candidatePaths()) {
  for (const candidate of candidates){
    if (await commandWorks(candidate)) {
      return candidate;
    }
  }
  return undefined;
}
export async function logWeasyPrintAvailability() {
  const candidates = candidatePaths();
  const found = await findWeasyPrint(candidates);
  if (found) {
    console.log(`weasyprint detected at ${found}`);
    return;
  }
  console.error("⚠️  No weasyprint executable detected. " + "PDF generation requires weasyprint. " + "Set WEASYPRINT_BIN. Checked paths: " + candidates.join(", "));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvL2JhY2tlbmQvc3JjL3V0aWxzL3dlYXN5cHJpbnQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiZnVuY3Rpb24gY2FuZGlkYXRlUGF0aHMoKTogc3RyaW5nW10ge1xuICBjb25zdCBlbnZCaW4gPSBEZW5vLmVudi5nZXQoXCJXRUFTWVBSSU5UX0JJTlwiKTtcbiAgY29uc3QgbGlzdDogc3RyaW5nW10gPSBbXTtcbiAgaWYgKGVudkJpbiAmJiBlbnZCaW4udHJpbSgpKSB7XG4gICAgbGlzdC5wdXNoKGVudkJpbi50cmltKCkpO1xuICB9XG5cbiAgaWYgKERlbm8uYnVpbGQub3MgPT09IFwid2luZG93c1wiKSB7XG4gICAgbGlzdC5wdXNoKFxuICAgICAgXCJDOi9Qcm9ncmFtIEZpbGVzL1dlYXN5UHJpbnQvd2Vhc3lwcmludC5leGVcIixcbiAgICAgIFwiQzovUHJvZ3JhbSBGaWxlcyAoeDg2KS9XZWFzeVByaW50L3dlYXN5cHJpbnQuZXhlXCIsXG4gICAgKTtcbiAgfSBlbHNlIHtcbiAgICBsaXN0LnB1c2goXCIvdXNyL2Jpbi93ZWFzeXByaW50XCIsIFwiL3Vzci9sb2NhbC9iaW4vd2Vhc3lwcmludFwiLCBcIndlYXN5cHJpbnRcIik7XG4gIH1cblxuICByZXR1cm4gbGlzdDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY29tbWFuZFdvcmtzKGNvbW1hbmQ6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGNvbnN0IHByb2MgPSBuZXcgRGVuby5Db21tYW5kKGNvbW1hbmQsIHtcbiAgICAgIGFyZ3M6IFtcIi0tdmVyc2lvblwiXSxcbiAgICAgIHN0ZG91dDogXCJwaXBlZFwiLFxuICAgICAgc3RkZXJyOiBcInBpcGVkXCIsXG4gICAgfSk7XG4gICAgY29uc3QgeyBzdWNjZXNzIH0gPSBhd2FpdCBwcm9jLm91dHB1dCgpO1xuICAgIHJldHVybiBzdWNjZXNzO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbmRXZWFzeVByaW50KGNhbmRpZGF0ZXMgPSBjYW5kaWRhdGVQYXRocygpKTogUHJvbWlzZTxzdHJpbmcgfCB1bmRlZmluZWQ+IHtcbiAgZm9yIChjb25zdCBjYW5kaWRhdGUgb2YgY2FuZGlkYXRlcykge1xuICAgIGlmIChhd2FpdCBjb21tYW5kV29ya3MoY2FuZGlkYXRlKSkge1xuICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvZ1dlYXN5UHJpbnRBdmFpbGFiaWxpdHkoKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGNhbmRpZGF0ZXMgPSBjYW5kaWRhdGVQYXRocygpO1xuICBjb25zdCBmb3VuZCA9IGF3YWl0IGZpbmRXZWFzeVByaW50KGNhbmRpZGF0ZXMpO1xuICBpZiAoZm91bmQpIHtcbiAgICBjb25zb2xlLmxvZyhgd2Vhc3lwcmludCBkZXRlY3RlZCBhdCAke2ZvdW5kfWApO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnNvbGUuZXJyb3IoXG4gICAgXCLimqDvuI8gIE5vIHdlYXN5cHJpbnQgZXhlY3V0YWJsZSBkZXRlY3RlZC4gXCIgK1xuICAgICAgXCJQREYgZ2VuZXJhdGlvbiByZXF1aXJlcyB3ZWFzeXByaW50LiBcIiArXG4gICAgICBcIlNldCBXRUFTWVBSSU5UX0JJTi4gQ2hlY2tlZCBwYXRoczogXCIgK1xuICAgICAgY2FuZGlkYXRlcy5qb2luKFwiLCBcIiksXG4gICk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUztFQUNQLE1BQU0sU0FBUyxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUM7RUFDNUIsTUFBTSxPQUFpQixFQUFFO0VBQ3pCLElBQUksVUFBVSxPQUFPLElBQUksSUFBSTtJQUMzQixLQUFLLElBQUksQ0FBQyxPQUFPLElBQUk7RUFDdkI7RUFFQSxJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUUsS0FBSyxXQUFXO0lBQy9CLEtBQUssSUFBSSxDQUNQLDhDQUNBO0VBRUosT0FBTztJQUNMLEtBQUssSUFBSSxDQUFDLHVCQUF1Qiw2QkFBNkI7RUFDaEU7RUFFQSxPQUFPO0FBQ1Q7QUFFQSxlQUFlLGFBQWEsT0FBZTtFQUN6QyxJQUFJO0lBQ0YsTUFBTSxPQUFPLElBQUksS0FBSyxPQUFPLENBQUMsU0FBUztNQUNyQyxNQUFNO1FBQUM7T0FBWTtNQUNuQixRQUFRO01BQ1IsUUFBUTtJQUNWO0lBQ0EsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sS0FBSyxNQUFNO0lBQ3JDLE9BQU87RUFDVCxFQUFFLE9BQU07SUFDTixPQUFPO0VBQ1Q7QUFDRjtBQUVBLE9BQU8sZUFBZSxlQUFlLGFBQWEsZ0JBQWdCO0VBQ2hFLEtBQUssTUFBTSxhQUFhLFdBQVk7SUFDbEMsSUFBSSxNQUFNLGFBQWEsWUFBWTtNQUNqQyxPQUFPO0lBQ1Q7RUFDRjtFQUNBLE9BQU87QUFDVDtBQUVBLE9BQU8sZUFBZTtFQUNwQixNQUFNLGFBQWE7RUFDbkIsTUFBTSxRQUFRLE1BQU0sZUFBZTtFQUNuQyxJQUFJLE9BQU87SUFDVCxRQUFRLEdBQUcsQ0FBQyxDQUFDLHVCQUF1QixFQUFFLE9BQU87SUFDN0M7RUFDRjtFQUVBLFFBQVEsS0FBSyxDQUNYLDRDQUNFLHlDQUNBLHdDQUNBLFdBQVcsSUFBSSxDQUFDO0FBRXRCIn0=
// denoCacheMetadata=11265693594140062057,4378157664498653825