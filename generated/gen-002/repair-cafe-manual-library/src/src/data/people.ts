export const CAFE = {
  name: 'Ashgrove Repair Café',
  venue: "St Columba's church hall",
  sessionDate: '2026-11-14',
  sessionLabel: 'Saturday 14 November',
  hours: '10:00 – 13:00',
  now: '11:42',
};

export const ME = 'Gerald Pryce';

export interface Volunteer {
  name: string;
  skill: string;
  today?: string; // where they are today, if present
}

// 14 active volunteers
export const VOLUNTEERS: Volunteer[] = [
  { name: 'Gerald Pryce', skill: 'Electrical, appliances', today: 'Table 2' },
  { name: 'Ruth Okonjo', skill: 'Library keeper, small appliances', today: 'Welcome desk' },
  { name: 'Dev Raman', skill: 'Motors, power tools', today: 'Table 3' },
  { name: 'Maureen Talbot', skill: 'Kitchen appliances' },
  { name: 'Lucia Ferreira', skill: 'Sewing machines, textiles', today: 'Table 6' },
  { name: 'Tomasz Nowak', skill: 'Mechanical, gearboxes', today: 'Table 4' },
  { name: 'Priya Venkatesan', skill: 'Electronics, audio', today: 'Table 5' },
  { name: 'Alan Whitcombe', skill: 'Clocks, lamps' },
  { name: 'Hana Sato', skill: 'Electronics, phones', today: 'Table 5' },
  { name: 'Femi Adeyemi', skill: 'Fans, heaters, lamps', today: 'Table 1' },
  { name: 'Bridget Lacey', skill: 'Bicycles' },
  { name: 'Marcus Bell', skill: 'Computers' },
  { name: 'Joan Ellery', skill: 'Sewing machines', today: 'Table 6' },
  { name: 'Sam Kowalczyk', skill: 'Audio, turntables' },
];

export const FORMER = ['Peter Halloran', 'Irene Duffy', 'Colin Marsh', 'Wendy Abara'];

export const volunteerToday = (name: string) => VOLUNTEERS.find((v) => v.name === name)?.today;
