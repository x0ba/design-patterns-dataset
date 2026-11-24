import { et } from './time.js';

export const PEOPLE = {
  N: { id: 'N', name: 'Nadia Haddad', first: 'Nadia', color: '#0E5A52', tint: '#DCEEEA', city: 'Columbus, OH' },
  S: { id: 'S', name: 'Samira Haddad', first: 'Samira', color: '#8A3B6E', tint: '#F5E6EF', city: 'Dearborn, MI', largeText: true, voiceReplies: true },
  K: { id: 'K', name: 'Karim Haddad', first: 'Karim', color: '#2D5FA3', tint: '#E3ECF8', city: 'Phoenix, AZ' },
};
export const ME = 'N';

export const SPACES = {
  haddads: { id: 'haddads', name: 'Haddads', members: ['N', 'S', 'K'], private: false },
  dm: { id: 'dm', name: 'Nadia & Karim', members: ['N', 'K'], private: true },
};

// ---------- helpers ----------
const t = (who, mins, text, extra = {}) => ({ who, mins, text, ...extra });

// ---------- featured: Warren Ave rezoning (Nov 14) ----------
const WARREN_BODY = [
  'DEARBORN — City Council will hold a public hearing Dec. 1 on a request to rezone about 11 acres along Warren Avenue, a change that would allow apartment buildings up to four stories where only one- and two-family homes and small shops are permitted today.',
  'The Planning Commission voted 5-2 on Nov. 9 to recommend the change. It is tied to a mixed-use project that Riverside Row Partners pitched in October, with about 160 apartments above ground-floor shops on the former Kessler’s Bakery lot and neighboring parcels.',
  '“Nothing about this is final,” Planning Director Maureen Okafor said. “The hearing is the first time residents can speak to the council directly.”',
  'The rezoning area covers both sides of Warren between Mason and Ostrander streets and the first block of the side streets north of it. Property owners within 300 feet were mailed notices last week. Homes elsewhere in the neighborhood would keep their current zoning.',
  'Council will take public comment in person at City Hall starting at 7 p.m. Dec. 1, with each speaker limited to three minutes. Written comments can be emailed to the city clerk until 4 p.m. Nov. 30. A final vote is not expected before Dec. 15.',
  'Supporters, including several business owners along the corridor, say new housing would bring customers back. “We’ve lost three storefronts on this stretch in five years,” said Nabil Saad, who owns a hardware store two blocks away. Opponents worry about traffic, parking and what taller buildings would do to the character of the neighborhood.',
];

const COLUMN = {
  outlet: 'Dearborn Press & Guide',
  section: 'Opinion',
  at: et('2026-11-13 06:00'),
  byline: 'By Leila Barakat',
  title: 'Four stories isn’t the real question on Warren Ave. Who gets protected is.',
  dek: 'A rezoning could let longtime homeowners stay in the neighborhood, or help price them out. The council should ask for protections before it votes.',
  body: [
    'Longtime homeowners on the east side are hearing two things at once: that new apartments will bring life back to Warren Avenue, and that their neighbors will start selling. Both can be true.',
    'What should worry us is not the height of a building. It is how little residents have been told. A rezoning does not force anyone to sell. But it changes what a lot is worth to a buyer, and some owners have already started receiving offers in the mail.',
    'Before it votes, the council should require a traffic and parking plan, set aside some of the new apartments at below-market rent, and publish plain answers about what the change would and would not mean for a homeowner’s own property taxes.',
    'And residents should go on Dec. 1, even if they never plan to speak. A full room is the only thing a council reliably notices.',
  ],
  played: { S: true },
  opened: { K: true },
};

const OCT9_BODY = [
  'DEARBORN — A Troy-based developer has pitched a mixed-use project near Warren Avenue that would replace the vacant Kessler’s Bakery building and two neighboring lots with shops on the ground floor and about 160 apartments above.',
  'Riverside Row Partners presented the concept to Planning Commission members Wednesday. The plan is an early proposal and would require rezoning, which the City Council has not considered.',
  '“This is a concept, not an approval,” a company spokesperson said. “We want to hear from neighbors before we ask the city for anything.”',
  'Kessler’s closed in 2019 after 61 years in business. The building has been vacant since. The company said it will hold a community meeting before seeking approvals; no date has been set.',
];

const MEDICARE_BODY = [
  'The yearly window to change Medicare Advantage and Part D drug plans closes Dec. 7. Plans can change their prices, covered drugs and pharmacy networks every January, so a plan that worked this year may not next year.',
  'Three things to check: the monthly premium and the deductible, whether every medication you take is still on the plan’s drug list, and whether your pharmacy is still in the plan’s preferred network.',
  'If you do nothing, your current plan renews automatically with whatever changes it has announced. Free counseling is available through Michigan’s state Medicare assistance program.',
];

const FEATURED = {
  w14: {
    id: 'w14', space: 'haddads', sender: 'S', at: '2026-11-14 09:12', outlet: 'Dearborn Press & Guide',
    title: 'Council to weigh Warren Ave rezoning', story: 'warren',
    dek: 'A hearing Dec. 1 will take public comment on rezoning 11 acres along Warren Avenue to allow apartment buildings up to four stories.',
    body: WARREN_BODY,
    keyDates: [
      { at: et('2026-11-30 16:00'), label: 'Written comments due', detail: 'email the city clerk' },
      { at: et('2026-12-01 19:00'), label: 'Public hearing', detail: 'City Hall, 3 min each', ics: true },
      { at: et('2026-12-15 19:00'), label: 'Earliest final vote', detail: 'vote not before this', approx: true },
    ],
    opened: { S: et('2026-11-14 09:10'), K: et('2026-11-14 10:30') },
    msgs: [
      { who: 'S', at: '2026-11-14 09:14', text: 'Look. Our street.', seen: { K: 'seen' } },
      {
        who: 'S', type: 'voice', at: '2026-11-14 09:16', dur: 48, auto: true,
        transcript: 'Nadia, Karim. I am reading about the hearing on December first. Should I go? I don’t know what I would say. And Nadia, does this mean I should sell the house? Mrs. Khoury says everyone will sell. Call me when you have a minute, habibti.',
        asks: [{ q: 'Go to the Dec. 1 hearing?' }, { q: 'Sell the house?' }],
        heard: { N: true, K: true }, seen: { K: 'heard' },
      },
      {
        who: 'K', at: '2026-11-14 10:41', unread: true, reactions: { '❤️': ['S'] }, seen: { S: 'seen' },
        text: 'Mama, please don’t decide anything about the house yet. Going to the hearing costs nothing, you can just listen.',
      },
      {
        who: 'K', type: 'link', at: '2026-11-14 10:43', unread: true, seen: { S: 'link' },
        text: 'This column explains what the city could ask the developer for. Worth reading before Dec. 1.',
        link: COLUMN,
      },
      {
        who: 'S', type: 'voice', at: '2026-11-15 18:02', dur: 72, auto: true, unread: true, seen: { K: 'heard' },
        transcript: 'Karim, thank you, I heard what you said. I will read the column tomorrow, my eyes are tired today. Nadia, Mrs. Khoury got a letter in the mail from a company. They want to buy her house, and she says it is a lot of money. Now I don’t know what to do. Tell me what to do. And Wednesday is good for me after one o’clock. In the morning I have my physical therapy and I don’t like to rush. Can we all talk then? I would rather talk than type.',
        asks: [{ q: 'What to do about Mrs. Khoury’s letter?' }, { q: 'All talk Wednesday after 1 PM?', call: true }],
      },
      {
        who: 'K', at: '2026-11-16 13:50', unread: true, seen: { S: 'delivered' }, mention: 'N',
        text: '@Nadia Wednesday works for me if it’s after noon Arizona time. I have a 3:00 standup, so I’d have to be off by then. Can you set it up?',
      },
    ],
  },

  w9: {
    id: 'w9', space: 'haddads', sender: 'S', at: '2026-10-09 08:50', outlet: 'Dearborn Press & Guide',
    title: 'Developer pitches mixed-use plan near Warren Ave', story: 'warren',
    dek: 'Riverside Row Partners says its proposal would replace the vacant Kessler’s Bakery lot with shops and about 160 apartments.',
    body: OCT9_BODY,
    msgs: [
      { who: 'S', at: '2026-10-09 08:55', text: 'This is where Kessler’s Bakery was. Remember the sprinkle cookies?' },
      {
        who: 'S', type: 'voice', at: '2026-10-09 08:57', dur: 35, auto: true,
        transcript: 'Nadia, they wrote mixed-use. I don’t know what this means. Is it shops, or is it apartments? Call me when you can. It is not an emergency.',
        heard: { N: true, K: true },
      },
      { who: 'N', at: '2026-10-09 19:20', text: 'Mama, mixed-use means shops on the bottom and apartments on top. It’s only a pitch right now. Nothing has been decided. I’ll keep an eye out for updates.', reactions: { '❤️': ['S'] } },
      { who: 'K', at: '2026-10-10 10:05', text: 'Kessler’s has been empty since I was in college. Honestly better than a fence and weeds.', reactions: { '👍': ['N'] } },
    ],
  },

  med: {
    id: 'med', space: 'haddads', sender: 'K', at: '2026-11-10 19:30', outlet: 'Detroit Free Press',
    title: 'Medicare open enrollment ends Dec. 7: what to check before you switch',
    dek: 'The yearly window to change Medicare Advantage and Part D drug plans closes Dec. 7. Plans can change prices and covered drugs every year.',
    body: MEDICARE_BODY,
    msgs: [
      { who: 'K', at: '2026-11-10 19:32', text: 'Mama, Dec. 7 is the last day to change your Medicare plan for next year. Worth a look before then.' },
      { who: 'N', at: '2026-11-10 21:12', text: 'I’ll go through her plan with her this weekend.' },
      { who: 'K', at: '2026-11-16 16:05', unread: true, mention: 'N', seen: { S: 'delivered' }, text: '@Nadia did you get to Mama’s drug list? She mentioned the pharmacy cost went up.' },
    ],
  },
};

// ---------- everyday stories in the Haddads group (compact spec) ----------
const G = [
  ['phx', 'K', '2026-11-15 15:40', 'Arizona Republic', 'Phoenix finally dips into the 60s as first real cold front arrives', 'Highs near 63 on Sunday, the coolest day since April.',
    [t('K', 0, '63 degrees. I wore a jacket and felt ridiculous.'), t('S', 200, 'Karim you will catch cold. Wear a scarf.'), t('K', 210, 'It’s 63, Mama 😄')]],
  ['snow', 'S', '2026-11-13 10:20', 'Dearborn Press & Guide', 'Snow removal rules: when Dearborn homeowners have to shovel', 'Sidewalks must be cleared within 24 hours after a snowfall ends.',
    [t('S', 0, 'Who will shovel for me this winter?'), t('N', 90, 'Let’s ask Mr. Dabaja’s grandson again, Mama. I’ll text his mother.'), t('K', 200, 'I’ll pay him.')]],
  ['flu', 'N', '2026-11-12 12:15', 'Ohio Capital Journal', 'Flu and RSV cases are rising in Ohio. Who should get which shot', 'Health officials urge adults 65 and older to get the high-dose flu vaccine.',
    [t('N', 0, 'Mama, you’re due for the high-dose flu shot if you haven’t had it.'), t('S', 95, 'Yes. I got it at Walgreens in October.'), t('K', 140, 'Good. I got mine at work.', { reactions: { '👍': ['N'] } })]],
  ['thanks', 'K', '2026-11-09 17:10', 'Associated Press', 'Thanksgiving travel expected to be busy. Best and worst days to drive', 'AAA expects the Wednesday before the holiday to be the heaviest day on roads.',
    [t('K', 0, 'I fly the 25th so I’m safe. Nadia, you drive that day?'), t('N', 60, 'I’m driving up Tuesday night after shift. Leaving early.')]],
  ['staff', 'N', '2026-11-08 16:00', 'Ohio Capital Journal', 'Hospital staffing bill clears Ohio House committee', 'The measure would set limits on patient loads for floor nurses.',
    [t('N', 0, 'This is the bill we talked about at work.'), t('K', 90, 'Would this mean fewer double shifts for you?'), t('N', 110, 'That’s the hope.')]],
  ['bat', 'K', '2026-11-07 11:30', 'NPR', 'Why your phone battery drains faster in the cold', 'Lithium-ion batteries lose capacity as temperatures fall. A few habits help.',
    [t('K', 0, 'Mama, this is why your phone keeps dying.'), t('S', 80, 'Yes it dies by lunch.'), t('N', 120, 'We’ll replace the battery when I’m home for Thanksgiving.')]],
  ['lib', 'S', '2026-11-06 10:05', 'Dearborn Press & Guide', 'Henry Ford Centennial Library adds evening hours starting in December', 'The library will stay open until 8 p.m. Monday through Thursday.',
    [t('S', 0, 'I will go on Thursdays.'), t('N', 180, 'Nice Mama. Take Mrs. Khoury with you.')]],
  ['w5', 'S', '2026-11-05 14:20', 'Dearborn Press & Guide', 'Residents press developer on traffic and parking at Warren Ave community meeting', 'About 120 neighbors attended Wednesday night’s meeting on the Riverside Row proposal.',
    [t('S', 0, 'I was there last night. Many people spoke.'), t('N', 45, 'Wish I could have come. Thank you for telling us.'), t('K', 300, 'Did you say anything, Mama?'), t('S', 420, 'No. I only listened.')], { story: 'warren' }],
  ['concert', 'S', '2026-11-02 18:10', 'Dearborn Press & Guide', 'Fordson choir to perform winter concert Dec. 10', 'The free concert starts at 7 p.m. in the high school auditorium.',
    [t('S', 0, 'Maybe we go?'), t('N', 120, 'I’m on shift that night. Take Mrs. Khoury.'), t('S', 140, 'Ok.')]],
  ['dst', 'N', '2026-11-01 08:40', 'NPR', 'Daylight saving time ends: how to help older relatives adjust their sleep', 'Gradual bedtime shifts and morning light can ease the transition.',
    [t('N', 0, 'Mama, the clocks went back last night. Don’t forget the kitchen clock.'), t('S', 45, 'The stove clock is always wrong. I never change it.'), t('K', 300, 'Same.')]],
  ['senior', 'S', '2026-10-30 12:00', 'Dearborn Press & Guide', 'Senior center adds Wednesday lunch program', 'Lunches are $4 and include a main dish, salad and dessert.',
    [t('S', 0, 'Mrs. Khoury and I will try it.'), t('K', 400, 'Tell me how the food is.')]],
  ['w29', 'K', '2026-10-29 08:50', 'Dearborn Press & Guide', 'Planning commission delays Warren Ave vote, asks for traffic study', 'Commissioners asked the developer for a traffic and parking study before they vote.',
    [t('K', 0, 'Looks like the traffic study could slow it down.'), t('S', 120, 'I hope. It is too big.'), t('N', 300, 'Let’s watch for the next meeting date.')], { story: 'warren' }],
  ['hall', 'S', '2026-10-27 13:00', 'Dearborn Press & Guide', 'Trick-or-treat hours set for Oct. 31, 5 to 8 p.m.', 'Police remind drivers to slow down on residential streets.',
    [t('S', 0, 'I bought the candy. Too much.'), t('K', 300, 'Save me the Snickers.')]],
  ['walk', 'N', '2026-10-24 21:10', 'STAT', 'Walking 20 minutes a day linked to fewer falls in adults over 70', 'A large study found a modest but steady drop in fall injuries.',
    [t('N', 0, 'Mama, this is you and your walks to the market.'), t('S', 65, 'I walk every day. 30 minutes!'), t('K', 120, 'Proud of you, Mama.', { reactions: { '❤️': ['S', 'N'] } })]],
  ['offers', 'N', '2026-10-22 17:45', 'Detroit Free Press', 'Unsolicited cash offers for your home? What Michigan homeowners should know', 'Mailers promising quick cash offers are rising. Experts say compare before replying.',
    [t('N', 0, 'Saw a few of these mailers around Dearborn. If you get a letter like this, don’t sign anything and call me first.'), t('S', 70, 'Ok. I put them in the trash.', { reactions: { '👍': ['N'] } }), t('K', 130, 'Good rule: never sign anything the same day.')]],
  ['vote', 'N', '2026-10-20 07:55', 'Michigan Public', 'Early voting begins in Michigan: what to bring and where to go', 'Voters can cast ballots in person at their city clerk’s office.',
    [t('N', 0, 'Mama, do you want to vote early?'), t('S', 200, 'I vote on the day at the school.'), t('K', 260, 'Mine is all mail now.')]],
  ['bakery', 'S', '2026-10-18 11:20', 'The Arab American News', 'Dearborn bakeries make Michigan’s best-of list', 'Three east Dearborn shops were named among the state’s top bakeries.',
    [t('S', 0, 'Look Karim, for when you come.'), t('K', 120, 'Thanksgiving. Maamoul run first thing.'), t('N', 180, 'Bring me some to Columbus.')]],
  ['scam', 'N', '2026-10-16 18:30', 'Associated Press', 'How to spot a scam call that sounds like a family member', 'Scammers use cloned voices. Hang up and call the person back on a known number.',
    [t('N', 0, 'Mama, if anyone calls saying they’re me or Karim and needs money, hang up and call me.'), t('S', 40, 'Yes. I will.'), t('K', 90, 'We should pick a family code word.'), t('N', 100, 'Good idea. Let’s decide at Thanksgiving.')]],
  ['flights', 'K', '2026-10-14 10:10', 'Arizona Republic', 'Sky Harbor adds nonstop Detroit flights for the holidays', 'Service runs daily from Nov. 20 through Jan. 4.',
    [t('K', 0, 'Booked. I land Nov. 25.'), t('S', 50, 'Wonderful!! I will make kibbeh.'), t('N', 160, 'I get in Tuesday night.')]],
  ['museum', 'S', '2026-10-12 09:30', 'The Arab American News', 'New exhibit opens at the Arab American National Museum this weekend', 'The exhibit features family photographs from three generations of Dearborn residents.',
    [t('S', 0, 'I go Sunday with Mrs. Khoury.')]],
  ['w9'],
  ['bp', 'N', '2026-10-07 20:05', 'NPR', 'How to check your blood pressure at home and get an accurate reading', 'Sit quietly for five minutes, feet flat, arm supported at heart level.',
    [t('N', 0, 'Mama, I’ll mail you a cuff. Use it every morning before coffee.'), t('S', 55, 'Ok habibti.'), t('K', 90, 'Write the numbers down so Nadia can see them.')]],
  ['bags', 'K', '2026-10-05 13:00', 'Associated Press', 'Airlines raise checked-bag fees again ahead of the holidays', 'Most major carriers now charge $40 or more for a first checked bag.',
    [t('K', 0, 'Pack light, everyone.'), t('N', 60, 'Says the man who brings three bags.')]],
  ['farm', 'S', '2026-10-02 09:00', 'Dearborn Press & Guide', 'Dearborn Farmers Market final weekend is Oct. 24', 'The market will reopen in May at the Henry Ford Centennial Library lot.',
    [t('S', 0, 'I will buy the last tomatoes.')]],
  ['leaf', 'N', '2026-09-30 08:30', 'Columbus Dispatch', 'Columbus to begin curbside leaf collection Oct. 5', 'Residents should rake leaves to the curb, not into the street.',
    [t('N', 0, 'Mama, do you need someone for the leaves this year?'), t('S', 240, 'Mr. Dabaja’s grandson did it last year.'), t('K', 300, 'I’ll pay him again.')]],
  ['monsoon', 'K', '2026-09-26 19:00', 'Arizona Republic', 'Monsoon season ends with the wettest month in a decade', 'Phoenix recorded more than four inches of rain in September.',
    [t('K', 0, 'The street flooded outside my building.'), t('S', 160, 'Be careful Karim.')]],
  ['school', 'S', '2026-09-24 10:40', 'Dearborn Press & Guide', 'Dearborn schools open family resource center on Michigan Ave', 'The center offers free tutoring, translation help and school supplies.',
    [t('S', 0, 'Good for the new families.')]],
  ['meds', 'N', '2026-09-21 20:15', 'STAT', 'Generic drug shortages ease, but some blood pressure pills still hard to find', 'Pharmacists say shortages are shorter than last year but not gone.',
    [t('N', 0, 'Mama, if the pharmacy says your pill is out of stock, call me right away.'), t('S', 120, 'They said wait one week once.'), t('N', 130, 'Don’t wait. Call me.')]],
  ['calls', 'K', '2026-09-18 09:45', 'NPR', 'Weekly family calls tied to better mood in older adults, study finds', 'Regular, scheduled calls mattered more than their length.',
    [t('K', 0, 'We should do Sunday calls.'), t('N', 50, 'I work half of them.'), t('S', 200, 'Sunday after church is good for me.')]],
  ['frost', 'S', '2026-09-16 08:05', 'Detroit Free Press', 'First frost possible in parts of Metro Detroit next week', 'Gardeners are advised to cover or harvest tender plants.',
    [t('S', 0, 'I must cover the tomatoes.')]],
  ['road', 'S', '2026-09-15 11:00', 'Dearborn Press & Guide', 'Michigan Avenue road work to finish by November', 'Lane closures continue weekdays between Schaefer and Greenfield.',
    [t('S', 0, 'Finally.')]],
  ['ohaide', 'N', '2026-09-14 19:20', 'Ohio Capital Journal', 'Ohio expands home health aide training', 'A new state program aims to add 3,000 aides by 2028.',
    [t('N', 0, 'Could matter for families like ours someday.')]],
  ['cbus', 'N', '2026-09-12 14:00', 'Columbus Dispatch', 'Columbus ranks among best U.S. cities for nurses, report says', 'Pay relative to housing costs was the deciding factor.',
    [t('N', 0, 'My coworkers are laughing at this one.'), t('K', 90, 'Told you to move to Phoenix.')]],
  ['wifi', 'K', '2026-09-10 12:00', 'NPR', 'Why your Wi-Fi keeps dropping and how to fix it', 'Restarting the router and moving it off the floor solves most problems.',
    [t('K', 0, 'I can reset Mama’s router remotely.'), t('S', 140, 'Please.')]],
  ['color', 'S', '2026-09-08 09:30', 'Detroit Free Press', 'Michigan’s fall color forecast: peak weeks by region', 'Northern Michigan peaks the first two weeks of October.',
    [t('S', 0, 'Let’s drive up north.'), t('N', 200, 'October is hard for me, Mama. Maybe a day trip.')]],
  ['hydr', 'N', '2026-09-05 15:00', 'STAT', 'Signs of dehydration in older adults are easy to miss', 'Thirst fades with age. Confusion and fatigue can be early signs.',
    [t('N', 0, 'Mama, drink water even if you’re not thirsty.'), t('S', 60, 'I drink tea.'), t('K', 90, 'Tea counts. Mostly.')]],
  ['phx100', 'K', '2026-09-02 17:30', 'Arizona Republic', 'Phoenix logs 100th day of triple-digit heat this year', 'The streak is the second longest on record.',
    [t('K', 0, 'Please send help.')]],
  ['repave', 'S', '2026-08-31 10:15', 'Dearborn Press & Guide', 'Warren Ave repaving begins next week', 'Crews will repave from Schaefer to Greenfield. Expect lane closures through October.',
    [t('S', 0, 'They are digging in front of the house.'), t('K', 300, 'Send pictures.')]],
  ['ohresp', 'N', '2026-08-28 07:45', 'Ohio Capital Journal', 'Ohio hospitals brace for fall respiratory season', 'Systems are adding staff and beds ahead of flu, RSV and COVID.',
    [t('N', 0, 'Gearing up at work.')]],
  ['rail', 'K', '2026-08-26 18:20', 'Arizona Republic', 'Valley Metro extends late-night light-rail hours', 'Trains will run until 1 a.m. on weekends.',
    [t('K', 0, 'Finally I can get home from the game.')]],
  ['book', 'S', '2026-08-23 09:00', 'Dearborn Press & Guide', 'Library book sale returns Sept. 12', 'Paperbacks are 50 cents. Hardcovers are $1.',
    [t('S', 0, 'They have Arabic books too.')]],
  ['night', 'N', '2026-08-20 22:30', 'NPR', 'Sleep tips for night-shift workers', 'Blackout curtains and a fixed wake time help most.',
    [t('N', 0, 'This is my life now.'), t('S', 120, 'Sleep habibti.')]],
  ['video', 'K', '2026-08-14 11:00', 'NPR', 'Video-calling tips for grandparents and other first-timers', 'Large buttons and a stable connection make the biggest difference.',
    [t('K', 0, 'Mama, tap the big green button.'), t('S', 60, 'I know the green button.')]],
  ['proptax', 'K', '2026-08-18 13:30', 'Bridge Michigan', 'Michigan lawmakers weigh property tax relief for seniors', 'Two bills would expand the homestead credit for homeowners 65 and older.',
    [t('K', 0, 'Related to Mama’s taxes?'), t('N', 90, 'Let’s look at it when it passes.')]],
  ['heat', 'S', '2026-08-15 08:30', 'Detroit Free Press', 'Heat advisory in Metro Detroit: check on older neighbors', 'Cooling centers open across the region through Friday.',
    [t('S', 0, 'I checked on Mrs. Khoury.'), t('N', 80, 'That’s kind of you, Mama.')]],
  ['shingles', 'N', '2026-08-12 18:00', 'STAT', 'Shingles vaccine guidance for adults 50 and older', 'Two doses are recommended, two to six months apart.',
    [t('N', 0, 'Mama, ask your doctor about this one.'), t('S', 140, 'I did, last year.')]],
  ['emerg', 'K', '2026-08-10 12:40', 'NPR', 'How to set up emergency contacts on your phone', 'The feature works even when the phone is locked.',
    [t('K', 0, 'I’ll set this up on Mama’s phone next time.')]],
  ['cars', 'S', '2026-08-08 09:00', 'Dearborn Press & Guide', 'Police remind residents to lock cars after weekend thefts', 'Most thefts involved unlocked vehicles.',
    [t('S', 0, 'Lock your cars!')]],
  ['primary', 'N', '2026-08-05 09:10', 'Michigan Public', 'Michigan primary turnout higher than expected, clerks say', 'Absentee ballots accounted for about a third of votes.',
    [t('S', 20, 'I voted!'), t('K', 90, 'Proud of you, Mama.')]],
  ['sumcon', 'S', '2026-08-03 17:00', 'Dearborn Press & Guide', 'Summer concert series wraps up Aug. 14', 'The final show features a local oud and violin ensemble.',
    [t('S', 0, 'Last one this Friday.'), t('N', 120, 'Enjoy it, Mama.')]],
];

// ---------- private space: Nadia & Karim ----------
const D = [
  ['d1', 'K', '2026-11-15 20:10', 'Detroit Free Press', 'Michigan seniors may qualify for property tax relief. Here’s how to check', 'Homeowners 65 and older can claim a credit or defer summer taxes.',
    [t('K', 0, 'Not about the hearing. Just good to know if she stays.'), t('K', 5, 'Did you hear Mama’s second voice note? She sounded worried about Mrs. Khoury’s letter.'),
     t('N', 190, 'Just off shift. Haven’t listened yet, I’ll catch up tomorrow.'), t('K', 200, 'I wouldn’t push the sell question on Wednesday. Let’s keep it light.'), t('N', 205, 'Agreed. Listen first.')]],
  ['d2', 'N', '2026-10-30 22:15', 'NPR', 'How to talk with an aging parent about moving: start by listening', 'Experts say open questions work better than lists of reasons.',
    [t('N', 0, 'Reading this before Thanksgiving. Not to push, just to be ready.'), t('K', 80, 'She’s not ready. If we push she digs in.'), t('N', 100, 'Agree. Listening first.')]],
  ['d3', 'N', '2026-10-18 19:00', 'STAT', 'Fall-proofing the home: simple fixes that prevent falls', 'Second handrails, night lights and removing throw rugs top the list.',
    [t('N', 0, 'The basement stairs only have one handrail.'), t('K', 40, 'I’ll pay for it. Can we get it done over Thanksgiving?'), t('N', 60, 'Booking a handyman for the 24th.')]],
  ['d4', 'K', '2026-09-12 21:00', 'Bridge Michigan', 'What assisted living costs in Michigan right now', 'Median monthly costs have climbed 11 percent in two years.',
    [t('K', 0, 'Just curious, for planning.'), t('N', 45, 'Same. Not now though.')]],
  ['d5', 'N', '2026-09-06 23:10', 'Columbus Dispatch', 'Ohio nurses report burnout at five-year high, survey finds', 'Staffing and mandatory overtime were the leading causes.',
    [t('N', 0, 'Tell me about it.'), t('K', 30, 'Are you okay? Seriously.'), t('N', 60, 'Tired. Fine. Thanks for asking.')]],
  ['d6', 'K', '2026-08-09 20:30', 'NPR', 'Siblings who share caregiving: how to split it fairly', 'Clear roles and regular check-ins prevent resentment.',
    [t('K', 0, 'We should talk about how we split things with Mama.'), t('N', 70, 'Yes. Not over text though.')]],
];

// ---------- build ----------
function finish(spec, space) {
  const at0 = et(spec.at);
  const members = SPACES[space].members;
  const msgs = spec.msgs.map((m, i) => ({
    type: 'text',
    ...m,
    id: `${spec.id}.${i + 1}`,
    at: m.at && typeof m.at === 'string' ? et(m.at) : at0 + (m.mins ?? m.at ?? 0) * 60000,
    reactions: m.reactions ?? {},
    heard: m.heard ?? {},
    seen: m.seen ?? {},
    unread: !!m.unread,
  }));
  const opened = spec.opened ?? Object.fromEntries(members.map((p) => [p, at0 + 600000]));
  return {
    id: spec.id, space, sender: spec.sender, at: at0, outlet: spec.outlet, title: spec.title, dek: spec.dek,
    body: spec.body, keyDates: spec.keyDates, story: spec.story, opened, msgs,
  };
}

export function buildArticles() {
  const out = [];
  for (const row of G) {
    if (row.length === 1) { out.push(finish(FEATURED[row[0]], 'haddads')); continue; }
    const [id, sender, at, outlet, title, dek, msgs, extra = {}] = row;
    out.push(finish({ id, sender, at, outlet, title, dek, msgs, ...extra }, 'haddads'));
  }
  out.push(finish(FEATURED.w14, 'haddads'));
  out.push(finish(FEATURED.med, 'haddads'));
  for (const [id, sender, at, outlet, title, dek, msgs] of D) {
    out.push(finish({ id, sender, at, outlet, title, dek, msgs }, 'dm'));
  }
  // Unread items start "pending" for the new-message divider.
  for (const a of out) {
    const firstUnread = a.msgs.find((m) => m.unread);
    a.newFrom = firstUnread ? firstUnread.id : null;
    a.newCount = a.msgs.filter((m) => m.unread).length;
  }
  return out;
}

// Availability Nadia can see for the call, drawn from what people said in the thread.
// Minutes are Eastern wall-clock minutes from midnight.
export const AVAIL = {
  '2026-11-18': {
    label: 'Wed, Nov 18',
    N: { busy: [], note: 'Off shift Wednesday' },
    S: { busy: [{ from: 0, to: 13 * 60, why: 'Physical therapy in the morning, free after 1 PM' }], note: 'Said: free after 1 PM, not in the morning', src: 'w14.5' },
    K: { busy: [{ from: 0, to: 14 * 60, why: 'Not free until noon Arizona time' }, { from: 17 * 60, to: 18 * 60, why: 'Standup at 3:00 PM Arizona time' }], note: 'Said: after noon his time, off before his 3:00 standup', src: 'w14.6' },
  },
  '2026-11-19': {
    label: 'Thu, Nov 19',
    N: { busy: [{ from: 6.5 * 60, to: 19.75 * 60, why: 'On shift until 7:45 PM' }], note: 'You are on shift until 7:45 PM' },
    S: { busy: [], unknown: true, note: 'Hasn’t said' },
    K: { busy: [], unknown: true, note: 'Hasn’t said' },
  },
  '2026-11-20': {
    label: 'Fri, Nov 20',
    N: { busy: [], note: 'Off shift Friday' },
    S: { busy: [], unknown: true, note: 'Hasn’t said' },
    K: { busy: [], unknown: true, note: 'Hasn’t said' },
  },
};

// Questions Samira has asked that Nadia hasn't answered yet. A call invite only answers the "let's talk" question.
export function pendingAsks(article) {
  const lastReply = [...article.msgs].reverse().find((m) => m.who === ME && (m.type === 'text' || m.type === 'voice'))?.at ?? 0;
  const hasCall = article.msgs.some((m) => m.type === 'call' && !m.call.cancelled);
  return article.msgs
    .filter((m) => m.asks && m.at > lastReply)
    .flatMap((m) => m.asks.filter((q) => !(q.call && hasCall)).map((q) => ({ ...q, msgId: m.id, at: m.at })));
}
