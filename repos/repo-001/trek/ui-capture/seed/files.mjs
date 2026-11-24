// Uploads a few generated PDF documents (booking confirmations, tickets) into trips' Files.
import { client } from './api.mjs';
const BASE = process.argv[2] || 'http://localhost:5460';

function pdf(lines) {
  const esc = (s) => s.replace(/[\\()]/g, (m) => '\\' + m).replace(/[^\x20-\x7e]/g, '?');
  const text = lines.map((l, i) => `BT /F1 ${i === 0 ? 18 : 11} Tf 56 ${770 - i * (i === 0 ? 30 : 18)} Td (${esc(l)}) Tj ET`).join('\n');
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out = '%PDF-1.4\n'; const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

const DOCS = {
  'Mexico City & Oaxaca — New Year': [
    ['Aeromexico_e-ticket_QZ8M4K.pdf', ['Aeromexico - Electronic Ticket Receipt', 'Booking reference: QZ8M4K', 'Passengers: LINDQVIST/MAYA MS, WEBER/JONAS MR', 'AM 1  FRA 13:25 -> MEX 18:10  27DEC2026  Seat 32A / 32B', 'AM 50 MEX 14:20 -> FRA 08:15+1  06JAN2027', 'Fare: EUR 1,890.00 incl. taxes', 'Baggage: 1PC 23KG per passenger']],
    ['Casa_Goliana_confirmation.pdf', ['Casa Goliana - Reservation Confirmation', 'Confirmation: CG-26-1187', 'Guest: Maya Lindqvist (+1 room: Priya Raman)', 'Check-in: Sun 27 Dec 2026 from 15:00', 'Check-out: Sat 2 Jan 2027 by 12:00', 'Total: MXN 38,400.00 - paid in full', 'Cordoba 145, Roma Norte, CDMX']],
    ['Frida_Kahlo_tickets.pdf', ['Museo Frida Kahlo - Boletos', 'Order MFK-772910', 'Wed 30 Dec 2026, 11:00 entry', '4 x General admission (foreign visitor)', 'Total MXN 1,280.00']],
    ['Travel_insurance_policy_2026.pdf', ['HanseMerkur - Annual Travel Insurance', 'Policy no. 4471-2026-88213', 'Insured: Maya Lindqvist, Jonas Weber', 'Valid: 20 Jul 2026 - 19 Jul 2027, worldwide', 'Emergency hotline: +49 40 4119 3280']],
  ],
  'Copenhagen long weekend': [
    ['LH828_boarding_pass_LINDQVIST.pdf', ['Lufthansa Boarding Pass', 'LINDQVIST/MAYA', 'LH 828  MUC -> CPH  14 NOV 2026', 'Boarding 09:05  Gate G28  Seat 14A  Group 4', 'Booking K7Q2ZP']],
    ['Alchemist_tickets.pdf', ['Alchemist - Holistic Cuisine', 'Reservation ALC-3317', 'Monday 16 November 2026, 18:30', '2 guests - prepaid menu', 'Allergy note: shellfish (guest 2)']],
  ],
  'Kyoto & Tokyo in autumn colours': [
    ['JR_Pass_exchange_orders.pdf', ['Japan Rail Pass - Exchange Order', 'Ordinary, 7 days, 2 adults', 'Order no. JRP-2026-339104 / 339105', 'Exchange at JR East Travel Service Center, Haneda T3']],
    ['Kikunoi_reservation.pdf', ['Kikunoi Honten', 'Saturday 10 October 2026, 19:00', 'Kaiseki course for 2', 'Please arrive 10 minutes early']],
  ],
  'Lisbon & Porto with the girls': [
    ['CP_Alfa_Pendular_tickets.pdf', ['CP - Comboios de Portugal', 'Alfa Pendular 125  Lisboa SA 11:09 -> Porto Campanha 14:01', 'Sun 12 Apr 2026  Carriage 3  Seats 41, 42, 43', 'Total EUR 94.50']],
  ],
};

const c = client(BASE);
await c.login('maya@trek.local', 'Wanderlust2026!');
const trips = [...(await c.get('/api/trips')).trips, ...((await c.get('/api/trips?archived=1')).trips || [])];
for (const [title, docs] of Object.entries(DOCS)) {
  const t = trips.find((x) => x.title === title); if (!t) continue;
  const have = (await c.get(`/api/trips/${t.id}/files`)).files || [];
  for (const [name, lines] of docs) {
    if (have.some((f) => f.original_name === name || f.filename === name)) continue;
    const fd = new FormData();
    fd.append('file', new Blob([pdf(lines)], { type: 'application/pdf' }), name);
    try { await c.post(`/api/trips/${t.id}/files`, fd); console.log('[files] uploaded', title, name); }
    catch (e) { console.warn('[files] WARN', name, e.message.slice(0, 200)); }
  }
}
