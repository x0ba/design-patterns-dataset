const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export function summarize({ errors, warnings, notices }) {
  return `${plural(errors, 'error')} · ${plural(warnings, 'warning')} · ${plural(notices, 'notice')}`;
}

export function timeLabel(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${hh}:${mm}`;
}
