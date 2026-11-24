const dtf = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const df = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const tf = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })

export const fmtDateTime = (ms: number) => dtf.format(ms).replace(' AM', ' am').replace(' PM', ' pm')
export const fmtTimeSec = (ms: number) => tf.format(ms).replace(' AM', ' am').replace(' PM', ' pm')
export const fmtPostDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return df.format(new Date(y, m - 1, d))
}
export const fmtUSD = (n: number) => '$' + n.toFixed(2)
export const fmtInt = (n: number) => n.toLocaleString('en-US')
export const pct = (n: number, d = 0) => (n * 100).toFixed(d) + '%'
