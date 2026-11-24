export interface SwapSide {
  truckId: string;
  zoneId: string;
  day: number;
}

export type RequestStatus = 'pending' | 'approved' | 'declined';

export interface SwapRequest {
  id: string;
  submitted: string;
  requestedBy: string; // truck id
  a: SwapSide;
  b: SwapSide;
  message: string;
  counterpartyConfirmed: string;
}

export const SWAP_REQUESTS: SwapRequest[] = [
  {
    id: 'SR-1182',
    submitted: 'Sat, Nov 14 · 8:31 AM',
    requestedBy: 'tacos-guero',
    a: { truckId: 'tacos-guero', zoneId: 'old-market', day: 19 },
    b: { truckId: 'birria-boss', zoneId: 'depot', day: 19 },
    message:
      'We’re catering a quinceañera at the Depot Street lofts that afternoon, so staying on Depot that night saves us a move. Hector said he’s happy to take Old Market.',
    counterpartyConfirmed: 'Hector Salazar confirmed by email Sat, Nov 14 · 10:05 AM',
  },
  {
    id: 'SR-1185',
    submitted: 'Sun, Nov 15 · 6:47 PM',
    requestedBy: 'lumpia-lane',
    a: { truckId: 'lumpia-lane', zoneId: 'courthouse', day: 12 },
    b: { truckId: 'masala-wheels', zoneId: 'harbor', day: 12 },
    message:
      'Pier 2 has the tree lighting that Saturday and our lumpia sells out at waterfront events. Priya is fine taking our Courthouse spot.',
    counterpartyConfirmed: 'Priya Raman confirmed by phone, logged Sun, Nov 15',
  },
];
