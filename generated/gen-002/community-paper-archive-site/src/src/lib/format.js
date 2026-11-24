export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// "Thursday, June 9, 1994"
export function longDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

// "June 9, 1994"
export function shortDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

export function issueYear(issueId) {
  return Number(issueId.slice(0, 4));
}

export function issueMonth(issueId) {
  return Number(issueId.slice(5, 7));
}

export function issueLabelFromId(issueId) {
  return `${MONTH_NAMES[issueMonth(issueId) - 1]} ${issueYear(issueId)}`;
}

// Season names used by the search filter and the archive view.
export const SEASONS = [
  { key: 'spring', label: 'Spring', months: '(March to May)', list: [3, 4, 5] },
  { key: 'summer', label: 'Summer', months: '(June to August)', list: [6, 7, 8] },
  { key: 'fall', label: 'Fall', months: '(September to November)', list: [9, 10, 11] },
  { key: 'winter', label: 'Winter', months: '(December to February)', list: [12, 1, 2] },
];

export function seasonOfMonth(month) {
  return SEASONS.find((s) => s.list.includes(month))?.key ?? null;
}

export const pluralize = (n, word, plural = `${word}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? word : plural}`;
