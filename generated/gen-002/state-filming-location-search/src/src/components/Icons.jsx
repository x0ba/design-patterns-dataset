const P = {
  search: 'M10.5 3a7.5 7.5 0 105.2 12.9l4.2 4.2 1.4-1.4-4.2-4.2A7.5 7.5 0 0010.5 3zm0 2a5.5 5.5 0 110 11 5.5 5.5 0 010-11z',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
  check: 'M9.5 16.2L5.3 12l-1.4 1.4 5.6 5.6L20 8.5l-1.4-1.4z',
  x: 'M6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z',
  compare: 'M4 5h7v14H4zm9 0h7v14h-7zM6 7v10h3V7zm9 0v10h3V7z',
  map: 'M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z',
  list: 'M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 2a7 7 0 110 14 7 7 0 010-14zm-1 2v6l4.2 2.5 1-1.7-3.2-1.9V7z',
  mail: 'M3 5h18v14H3zm2 2v.5l7 5 7-5V7zm14 3l-7 5-7-5v7h14z',
  chev: 'M9 5l7 7-7 7-1.4-1.4L13.2 12 7.6 6.4z',
  left: 'M15 5l-7 7 7 7 1.4-1.4L10.8 12l5.6-5.6z',
  warn: 'M12 3l10 18H2zm-1 7v5h2v-5zm0 6.5v2h2v-2z',
  similar: 'M4 4h9v9H4zm7 7h9v9h-9zM6 6v5h5V6zm7 7v5h5v-5z',
  photo: 'M4 5h16v14H4zm2 2v7l3-3 3 4 2-2 4 5V7zm3 1a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
  send: 'M3 11.5L21 3l-6.5 18-3.2-7.3zm5.8.3l2.6 1.3 5.2-7z',
  pin: 'M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7z',
  sliders: 'M4 7h9V5h2v2h5v2h-5v2h-2V9H4zm0 8h5v-2h2v2h9v2h-9v2H9v-2H4z',
  user: 'M12 4a4 4 0 110 8 4 4 0 010-8zm0 10c4.4 0 8 2 8 4.5V20H4v-1.5C4 16 7.6 14 12 14z',
  ext: 'M14 4h6v6h-2V7.4l-7.3 7.3-1.4-1.4L16.6 6H14zM5 6h6v2H7v9h9v-4h2v6H5z',
}
export default function Icon({ n, size = 16, className = '', style }) {
  return (
    <svg className={'ic ' + className} style={style} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={P[n]} />
    </svg>
  )
}
