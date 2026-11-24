<?php
// Other trips: upcoming, past, archived, shared-with-me and public.
// Row format for acts(): [day|null, 'HH:MM', minutes, title, location, lat, lng, description, opts]

function acts(TripBuilder $t, array $rows, ?string $macro = null): array
{
    $ids = [];
    foreach ($rows as $r) {
        [$day, $hm, $mins, $title, $loc] = $r;
        $o = $r[8] ?? [];
        if (isset($r[5])) { $o['lat'] = $r[5]; $o['lng'] = $r[6]; }
        if ($macro && ! isset($o['macro'])) { $o['macro'] = $macro; }
        $ids[] = $t->act($day === null ? null : [$day, $hm, $mins], $title, $loc, $r[7] ?? '', $o);
    }
    return $ids;
}
function exps(TripBuilder $t, string $cur, ?float $rate, array $rows): void
{
    foreach ($rows as $r) {
        $t->expense($r[0], $r[1], $r[2], $r[3], $r[5] ?? $cur, array_key_exists(4, $r) ? $r[4] : $rate, $r[6] ?? '');
    }
}

// ---- Seoul: upcoming, mid-planning ---------------------------------------
$kr = new TripBuilder([
    'title' => 'Seoul Year-End Countdown', 'region' => 'KR', 'currency' => 'KRW', 'tz' => 'Asia/Seoul',
    'start' => '2026-12-26', 'end' => '2027-01-02', 'created' => $d('2026-09-02'), 'updated' => $now - 26 * 3600000,
], [[$priya, $OWNER], [$dev, $EDITOR], [$aaron, $EDITOR]]);
$KR = 1068.0;
$mk1 = $kr->macro(0, 3, 'Seoul — Myeongdong base');
$mk2 = $kr->macro(4, 5, 'Gangwon ski + Nami Island', 'Vivaldi Park or Elysian Gangchon? Dev to decide');
$mk3 = $kr->macro(6, 7, 'Seoul — New Year\'s Eve at Bosingak');
$kr->act([0, '01:05', 0], 'KE 642 Singapore → Seoul Incheon', 'Singapore Changi Airport (SIN) T4', "Red-eye. Booking ref: K8PLMX\nDev & Aaron on SQ 608 instead, landing 08:30", ['tzStart' => 'Asia/Singapore', 'tzEnd' => 'Asia/Seoul', 'endDay' => 0, 'endHm' => '08:40', 'flags' => FLAG_FLIGHT, 'status' => 'confirmed', 'lat' => 1.3644, 'lng' => 103.9915, 'dest' => 'Incheon International Airport (ICN)', 'dlat' => 37.4602, 'dlng' => 126.4407]);
acts($kr, [
    [0, '10:00', 60, 'AREX to Seoul Station', 'Incheon Airport Station', 37.4473, 126.4525, 'T-money card from GS25 at arrivals', ['flags' => FLAG_TRAIN, 'dest' => 'Seoul Station', 'dlat' => 37.5547, 'dlng' => 126.9707]],
    [0, '14:00', 150, 'Gyeongbokgung + hanbok rental', 'Gyeongbokgung Palace', 37.5796, 126.9770, 'Free entry in hanbok. Changing of guard 10:00 & 14:00.', ['status' => 'planned']],
    [0, '18:00', 120, 'Gwangjang Market dinner', 'Gwangjang Market', 37.5700, 126.9996, 'Bindaetteok + yukhoe. Mayak gimbap.'],
    [1, '10:00', 180, 'Bukchon Hanok Village', 'Bukchon Hanok Village', 37.5826, 126.9830, 'Quiet hours — residents live here, keep it down'],
    [1, '15:00', 150, 'Ikseon-dong cafes', 'Ikseon-dong', 37.5743, 126.9897, ''],
    [1, '19:00', 120, 'Korean BBQ: Mapo Jeong Daepo', 'Mapo Jeong Daepo', 37.5397, 126.9461, 'Ask Aaron for the exact branch, he went in 2024'],
    [2, '11:00', 240, 'Hongdae + Yeonnam-dong', 'Hongik University Station', 37.5572, 126.9245, 'Busking on weekends'],
    [2, '19:30', 120, 'N Seoul Tower', 'N Seoul Tower', 37.5512, 126.9882, '', ['status' => 'tentative']],
    [3, '10:00', 300, 'DMZ tour (JSA closed?)', 'Imjingak', 37.8894, 126.7404, "Need passport. Booked via Klook — waiting for confirmation.\nJSA is closed till further notice, 3rd tunnel only.", ['status' => 'tentative']],
    [4, '08:00', 600, 'Ski day — Vivaldi Park', 'Vivaldi Park Ski World', 37.6455, 127.6829, 'Shuttle bus from Hongdae 7:00. Rental package incl. jacket', ['status' => 'tentative']],
    [5, '10:00', 240, 'Nami Island', 'Nami Island', 37.7911, 127.5254, 'Zipline in?'],
    [6, '20:00', 240, 'NYE bell-ringing at Bosingak', 'Bosingak Pavilion', 37.5700, 126.9832, "Gets packed from 21:00. Subway runs late on NYE.\nGloves + hand warmers!!"],
    [7, '11:00', 120, 'New Year tteokguk brunch', 'Myeongdong Kyoja', 37.5627, 126.9856, ''],
], $mk1);
acts($kr, [
    [null, '', 0, 'Lotte World Tower Seoul Sky', 'Lotte World Tower', 37.5126, 127.1026, ''],
    [null, '', 0, 'Jjimjilbang at Dragon Hill Spa', 'Dragon Hill Spa, Yongsan', 37.5296, 126.9649, 'Overnight option to save a hotel night? no.'],
    [null, '', 0, 'Olive Young haul', 'Olive Young Myeongdong Flagship', 37.5635, 126.9839, 'Dev\'s sister list in WhatsApp'],
    [null, '', 0, 'Starfield Library', 'Starfield COEX Mall', 37.5100, 127.0600, ''],
    [null, '', 0, 'Han river ramyeon at GS25', 'Yeouido Hangang Park', 37.5284, 126.9346, 'Probably too cold lol'],
    [null, '', 0, 'Seongsu-dong pop-ups', 'Seongsu-dong', 37.5446, 127.0557, ''],
]);
$kr->stay(0, 4, 'L7 Myeongdong by Lotte', '137 Toegye-ro, Jung-gu, Seoul', '+82 2-6310-1000', 'Early check-in requested (red-eye). 3 pax family room.', 37.5602, 126.9850, '15:00', '11:00');
$kr->stay(4, 5, 'Sono Felice Vivaldi Park', '262 Hanchigol-gil, Hongcheon-gun, Gangwon-do', '+82 1588-4888', 'Not confirmed — waitlisted', 37.6464, 127.6850);
$kr->stay(5, 7, 'Nine Tree Premier Rokaus Hotel Seoul Yongsan', '120 Hangang-daero, Yongsan-gu, Seoul', '+82 2-6003-0001', '', 37.5310, 126.9700);
exps($kr, 'KRW', $KR, [
    [0, '00:00', 'Flights KE (Priya only)', 612.30, 1, 'SGD'],
    [0, '00:00', 'L7 Myeongdong — deposit', 386000],
    [3, '00:00', 'DMZ tour (Klook)', 186000, null, 'KRW', '3 × ₩62,000, pending'],
]);
$kr->tasks('Bookings', 1, [
    ['Flights', 2], ['Hotel Seoul (first half)', 2], ['Hotel Seoul (after NYE)', 2],
    ['Ski resort night', 1, 'Waitlisted Sono Felice, backup: Elysian Gangchon', -20],
    ['DMZ tour', 1, null, -14], ['K-ETA', 0, 'Singaporeans exempt till end-2026? DOUBLE CHECK', -10],
], 0);
$kr->tasks('Packing', 0, [['Heattech ×3', 0], ['Thermal gloves', 0], ['Power adapter (type C/F)', 0], ['Lip balm!!!', 0], ['Ski socks', 0]], 1);
$kr->thread(0, null, [
    [$dev, 'Weather says -8°C on NYE 🥶 are we sure about Bosingak'],
    [$aaron, 'We are absolutely sure. It\'s once in a lifetime'],
    [$priya, 'Hand warmers from Daiso, we\'ll survive'],
]);

// ---- Taipei: upcoming, early ---------------------------------------------
$tw = new TripBuilder([
    'title' => 'Taipei CNY with the family', 'region' => 'TW', 'currency' => 'TWD', 'tz' => 'Asia/Taipei',
    'start' => '2027-02-05', 'end' => '2027-02-11', 'created' => $d('2026-10-28'),
], [[$priya, $OWNER]]);
$mt1 = $tw->macro(0, 2, 'Taipei city');
$mt2 = $tw->macro(3, 3, 'Jiufen + Shifen (lanterns)');
$mt3 = $tw->macro(4, 6, 'Taichung? or Hualien', 'Mum wants Sun Moon Lake. Check if trains are sold out over CNY.');
acts($tw, [
    [0, '19:00', 120, 'Raohe Night Market', 'Raohe Street Night Market', 25.0509, 121.5774, 'Pepper buns at the entrance', ['macro' => $mt1]],
    [1, '10:00', 120, 'Din Tai Fung Xinyi', 'Din Tai Fung, Taipei 101', 25.0337, 121.5645, 'Get ticket online, queue 1h+ on CNY', ['macro' => $mt1]],
    [3, '09:00', 480, 'Jiufen & Shifen day tour', 'Jiufen Old Street', 25.1092, 121.8445, 'Private driver for 5 — quoted NT$6,500', ['macro' => $mt2, 'status' => 'tentative']],
    [null, '', 0, 'Beitou hot springs', 'Beitou', 25.1368, 121.5068, ''],
    [null, '', 0, 'Elephant Mountain hike', 'Xiangshan Trail', 25.0274, 121.5764, 'Sunset'],
    [null, '', 0, 'Sun Moon Lake', 'Sun Moon Lake', 23.8572, 120.9150, 'Mum\'s #1 ask'],
    [null, '', 0, 'Fuhang Soy Milk breakfast', 'Fuhang Soy Milk, Huashan Market', 25.0441, 121.5248, ''],
]);
$tw->tasks('To sort out', 0, [
    ['Book flights for 5 (Scoot vs EVA)', 1, 'Scoot cheaper but Dad hates no meal', -80],
    ['Check if restaurants open on CNY eve', 0], ['Hotel near MRT, accessible for Dad', 0], ['THSR tickets (open 28 days before)', 0, null, -28],
], 0);

// ---- Iceland: draft, far future ------------------------------------------
$is = new TripBuilder([
    'title' => 'Iceland Ring Road (draft)', 'region' => 'IS', 'currency' => 'ISK', 'tz' => 'Atlantic/Reykjavik',
    'start' => '2027-06-12', 'end' => '2027-06-24', 'created' => $d('2026-08-21'),
], [[$priya, $OWNER], [$marcus, $EDITOR]]);
$is->macro(0, 1, 'Reykjavík + Golden Circle');
$is->macro(2, 4, 'South coast: Vík, Skaftafell');
$is->macro(5, 5, 'Jökulsárlón glacier lagoon');
$is->macro(6, 8, 'East fjords → Mývatn');
$is->macro(9, 10, 'Akureyri + whale watching Húsavík');
$is->macro(11, 12, 'Snæfellsnes → back to KEF');
acts($is, [
    [null, '', 0, 'Blue Lagoon (or Sky Lagoon?)', 'Blue Lagoon', 63.8804, -22.4495, 'Sky Lagoon is cheaper & closer to Reykjavík'],
    [null, '', 0, 'Seljalandsfoss', 'Seljalandsfoss', 63.6156, -19.9886, 'Walk behind the waterfall, rain jacket'],
    [null, '', 0, 'Reynisfjara black sand beach', 'Reynisfjara', 63.4044, -19.0447, 'SNEAKER WAVES — don\'t turn your back on the sea'],
    [null, '', 0, 'Glacier hike Skaftafell', 'Skaftafell', 64.0161, -16.9667, 'Guided only. Troll Expeditions ~ISK 15,990'],
    [null, '', 0, 'Mývatn Nature Baths', 'Mývatn Nature Baths', 65.6308, -16.8481, ''],
    [null, '', 0, 'Kirkjufell photo stop', 'Kirkjufell', 64.9419, -23.3053, ''],
    [null, '', 0, 'Puffins at Borgarfjörður eystri', 'Hafnarhólmi', 65.5367, -13.7419, 'June = peak puffin season 🐧'],
    [null, '', 0, 'Bæjarins Beztu hot dog', 'Bæjarins Beztu Pylsur', 64.1484, -21.9396, 'eina með öllu'],
]);
$is->tasks('Research', 0, [
    ['Campervan vs car + guesthouses', 1, 'Campervan ~€180/day in June. Guesthouses book out early!'],
    ['Midnight sun — eye masks', 0], ['Is 4x4 needed? (F-roads not planned)', 0], ['Annual leave approval', 2],
], 0);
$is->thread(0, null, [[$marcus, 'I can do 10 days max, not 13. Can we cut Snæfellsnes?'], [$priya, 'Let\'s see flights first, Icelandair via LHR has better timings']]);

// ---- Bali: past, complete ------------------------------------------------
$bali = new TripBuilder([
    'title' => 'Bali girls\' trip 🌴', 'region' => 'ID', 'currency' => 'IDR', 'tz' => 'Asia/Makassar',
    'start' => '2026-08-14', 'end' => '2026-08-19', 'created' => $d('2026-05-02'), 'updated' => $d('2026-08-24'),
], [[$priya, $OWNER], [$jiayi, $EDITOR], [$nadia, $EDITOR], [$sofia, $VIEWER]]);
$IDR = 12150.0;
$mb1 = $bali->macro(0, 2, 'Ubud');
$mb2 = $bali->macro(3, 5, 'Uluwatu');
$bali->act([0, '08:35', 0], 'TR 282 Singapore → Denpasar', 'Singapore Changi Airport (SIN) T1', 'Scoot. 20kg bag each.', ['tzStart' => 'Asia/Singapore', 'tzEnd' => 'Asia/Makassar', 'endDay' => 0, 'endHm' => '11:10', 'flags' => FLAG_FLIGHT, 'status' => 'confirmed', 'lat' => 1.3644, 'lng' => 103.9915, 'dest' => 'Ngurah Rai International Airport (DPS)', 'dlat' => -8.7482, 'dlng' => 115.1671]);
$baliActs = acts($bali, [
    [0, '12:30', 90, 'Driver to Ubud', 'Ngurah Rai Airport', -8.7482, 115.1671, 'Wayan (+62 812-3456-7781), recommended by Nadia\'s cousin', ['dest' => 'Ubud', 'dlat' => -8.5069, 'dlng' => 115.2625]],
    [0, '17:00', 120, 'Campuhan Ridge Walk', 'Campuhan Ridge Walk', -8.5018, 115.2550, ''],
    [1, '06:00', 180, 'Tegallalang rice terraces at sunrise', 'Tegallalang Rice Terrace', -8.4339, 115.2789, 'Swing was a tourist trap, skip next time', ['status' => 'confirmed']],
    [1, '11:00', 90, 'Sacred Monkey Forest', 'Sacred Monkey Forest Sanctuary', -8.5187, 115.2585, 'Sunglasses got stolen by a monkey. Lesson learned.'],
    [1, '16:00', 120, 'Balinese cooking class', 'Paon Bali Cooking Class', -8.4920, 115.2525, ''],
    [2, '09:00', 180, 'Tirta Empul water temple', 'Tirta Empul', -8.4153, 115.3153, 'Sarong provided'],
    [2, '19:00', 120, 'Dinner at Locavore NXT', 'Locavore NXT', -8.5180, 115.2690, 'Best meal of the trip, hands down'],
    [3, '10:00', 120, 'Transfer Ubud → Uluwatu', 'Ubud', -8.5069, 115.2625, '', ['dest' => 'Uluwatu', 'dlat' => -8.8291, 'dlng' => 115.0849]],
    [3, '17:30', 120, 'Uluwatu Temple + Kecak dance', 'Uluwatu Temple', -8.8291, 115.0849, 'Kecak at 18:00, IDR 150k'],
    [4, '10:00', 300, 'Beach day: Padang Padang', 'Padang Padang Beach', -8.8113, 115.1003, ''],
    [4, '16:00', 180, 'Sunset at Single Fin', 'Single Fin Bali', -8.8155, 115.0880, ''],
    [5, '09:00', 120, 'Spa morning', 'Svarga Spa', -8.7980, 115.1150, ''],
], null);
$bali->act([5, '16:05', 0], 'TR 283 Denpasar → Singapore', 'Ngurah Rai International Airport (DPS)', '', ['tzStart' => 'Asia/Makassar', 'tzEnd' => 'Asia/Singapore', 'endDay' => 5, 'endHm' => '18:45', 'flags' => FLAG_FLIGHT, 'status' => 'confirmed', 'lat' => -8.7482, 'lng' => 115.1671, 'dest' => 'Singapore Changi Airport (SIN)', 'dlat' => 1.3644, 'dlng' => 103.9915]);
$bali->stay(0, 3, 'Bisma Eight', 'Jl. Bisma, Ubud, Gianyar, Bali 80571', '+62 361 4792888', 'Infinity pool over the jungle!', -8.5085, 115.2580, '14:00', '12:00');
$bali->stay(3, 5, 'Alila Villas Uluwatu', 'Jl. Belimbing Sari, Pecatu, Bali 80364', '+62 361 8482166', 'Splurge. 2 villas shared.', -8.8443, 115.0855);
exps($bali, 'IDR', $IDR, [
    [0, '06:00', 'Scoot flights ×4', 1140.80, 1, 'SGD'],
    [0, '12:30', 'Driver to Ubud', 450000], [0, '19:30', 'Dinner Warung Biah Biah', 386000],
    [1, '06:30', 'Tegallalang entry + swing', 600000], [1, '11:00', 'Monkey forest', 320000],
    [1, '16:00', 'Cooking class ×4', 1800000], [2, '09:00', 'Tirta Empul + donation', 250000],
    [2, '21:00', 'Locavore NXT', 9680000, $IDR, 'IDR', 'Tasting menu + wine pairing for 2 of us'],
    [3, '10:00', 'Transfer to Uluwatu', 650000], [3, '18:00', 'Kecak tickets', 600000],
    [4, '16:30', 'Single Fin drinks', 1120000], [5, '09:00', 'Spa ×4', 3200000],
    [0, '14:00', 'Bisma Eight (3 nights)', 978.00, 1, 'SGD'], [3, '15:00', 'Alila Villas (2 nights)', 2860.00, 1, 'SGD'],
    [5, '13:00', 'Grab rides misc', 284000], [2, '13:30', 'Smoothie bowls lol', 215000],
]);
$bali->tasks('Settle up', 2, [['Split Alila with Nadia', 2], ['Jiayi owes $86.20', 2], ['Upload photos to shared album', 2]], 0);
$bali->thread(1, $baliActs[6], [[$nadia, 'Still dreaming about the fermented banana dessert'], [$jiayi, 'Same. Coming back just for that']], true);

// ---- Lisbon & Porto: past ------------------------------------------------
$pt = new TripBuilder([
    'title' => 'Lisbon & Porto', 'region' => 'PT', 'currency' => 'EUR', 'tz' => 'Europe/Lisbon',
    'start' => '2026-05-22', 'end' => '2026-06-01', 'created' => $d('2026-01-30'), 'updated' => $d('2026-06-05'),
    'sharing' => 3,
], [[$priya, $OWNER], [$sofia, $EDITOR]]);
$EUR = 0.684;
$mp1 = $pt->macro(0, 4, 'Lisbon', 'Sofia\'s home turf — she\'s picking dinners');
$mp2 = $pt->macro(3, 3, 'Sintra day trip');
$mp3 = $pt->macro(5, 6, 'Douro Valley drive');
$mp4 = $pt->macro(7, 10, 'Porto');
$pt->act([0, '23:15', 0], 'SQ 336 + AF 1024 Singapore → Lisbon (via CDG)', 'Singapore Changi Airport (SIN)', 'Arrive 22 May morning (overnight). Air France connection CDG–LIS.', ['tzStart' => 'Asia/Singapore', 'tzEnd' => 'Europe/Lisbon', 'endDay' => 1, 'endHm' => '11:40', 'flags' => FLAG_FLIGHT, 'status' => 'confirmed', 'lat' => 1.3644, 'lng' => 103.9915, 'dest' => 'Lisbon Humberto Delgado Airport (LIS)', 'dlat' => 38.7742, 'dlng' => -9.1342]);
$ptActs = acts($pt, [
    [1, '15:00', 120, 'Alfama wander + Miradouro de Santa Luzia', 'Miradouro de Santa Luzia', 38.7118, -9.1301, ''],
    [1, '20:30', 150, 'Fado at Tasca do Chico', 'Tasca do Chico, Bairro Alto', 38.7122, -9.1453, 'No reservations — be there by 20:00'],
    [2, '09:30', 180, 'Belém: Jerónimos + Pastéis de Belém', 'Pastéis de Belém', 38.6975, -9.2032, 'Eat them warm with canela'],
    [2, '14:00', 120, 'MAAT + riverside walk', 'MAAT', 38.6958, -9.1940, ''],
    [2, '20:00', 120, 'Dinner at Cervejaria Ramiro', 'Cervejaria Ramiro', 38.7208, -9.1357, 'Garlic prawns, then prego to finish (Sofia insists)'],
    [3, '09:00', 480, 'Sintra: Pena Palace + Quinta da Regaleira', 'Pena Palace', 38.7876, -9.3906, 'Train from Rossio 08:11. Tuk-tuk up the hill.', ['macro' => $mp2, 'status' => 'confirmed']],
    [4, '10:00', 120, 'LX Factory', 'LX Factory', 38.7036, -9.1786, ''],
    [4, '17:00', 120, 'Sunset at Miradouro da Senhora do Monte', 'Miradouro da Senhora do Monte', 38.7191, -9.1327, ''],
    [5, '09:00', 600, 'Drive to Douro, quinta tastings', 'Pinhão', 41.1903, -7.5450, 'Quinta do Bomfim + Quinta da Roêda. Sofia drives (no wine for her 😢)', ['macro' => $mp3]],
    [6, '10:00', 120, 'Douro river cruise', 'Pinhão', 41.1903, -7.5450, '', ['macro' => $mp3]],
    [7, '11:00', 120, 'Livraria Lello', 'Livraria Lello', 41.1469, -8.6149, 'Book slot, €10 (refunded with book purchase)', ['macro' => $mp4]],
    [7, '14:00', 120, 'Ribeira + Dom Luís I Bridge', 'Ponte Luís I', 41.1400, -8.6094, '', ['macro' => $mp4]],
    [7, '16:30', 120, 'Port cellar: Graham\'s Lodge', 'Graham\'s Port Lodge', 41.1340, -8.6160, '', ['macro' => $mp4]],
    [8, '13:00', 90, 'Francesinha at Café Santiago', 'Café Santiago', 41.1460, -8.6058, 'Heart attack on a plate. 10/10', ['macro' => $mp4]],
    [8, '17:00', 180, 'Foz do Douro sunset', 'Foz do Douro', 41.1500, -8.6740, '', ['macro' => $mp4]],
    [9, '10:00', 120, 'Serralves Museum', 'Serralves', 41.1597, -8.6597, '', ['macro' => $mp4]],
]);
$pt->stay(1, 5, 'Memmo Alfama', 'Travessa Merceeiras 27, 1100-348 Lisboa', '+351 21 049 5660', 'Rooftop pool with river view', 38.7113, -9.1307);
$pt->stay(5, 7, 'Quinta Nova Winery House', 'Covas do Douro, 5085-222 Sabrosa', '+351 254 730 430', '', 41.1730, -7.5906);
$pt->stay(7, 10, 'Torel Avantgarde', 'Rua da Restauração 336, 4050-501 Porto', '+351 220 110 054', '', 41.1449, -8.6205);
exps($pt, 'EUR', $EUR, [
    [0, '00:00', 'Flights SIN–LIS / OPO–SIN', 1689.00, 1, 'SGD'], [1, '21:00', 'Fado night', 64.50],
    [2, '10:30', 'Jerónimos + pastéis', 32.40], [2, '22:00', 'Cervejaria Ramiro', 118.70],
    [3, '08:00', 'CP train Sintra', 9.80], [3, '10:00', 'Pena + Regaleira tickets', 58.00], [3, '13:30', 'Tuk-tuk', 30.00],
    [5, '09:00', 'Car rental (3 days)', 214.00], [5, '15:00', 'Quinta tastings', 90.00],
    [6, '10:00', 'Douro cruise', 50.00], [7, '11:00', 'Livraria Lello', 20.00], [7, '17:00', 'Graham\'s tasting', 54.00],
    [8, '13:30', 'Francesinhas', 31.00], [1, '15:00', 'Memmo Alfama (4 nights)', 1124.00], [7, '15:00', 'Torel Avantgarde (3 nights)', 862.50],
    [9, '19:00', 'Dinner at Cantinho do Avillez', 96.40], [10, '11:00', 'Tinned fish souvenirs (Comur)', 46.30],
]);
$pt->thread(0, null, [[$sofia, 'Obrigada for coming!! Next time Azores 🌋'], [$priya, 'DEAL']], true);
$pt->thread(1, $ptActs[13], [[$sofia, 'You owe me a francesinha in Singapore now']]);

// ---- KL weekend: past, small ---------------------------------------------
$kl = new TripBuilder([
    'title' => 'KL makan weekend', 'region' => 'MY', 'currency' => 'MYR', 'tz' => 'Asia/Kuala_Lumpur',
    'start' => '2026-03-13', 'end' => '2026-03-15', 'created' => $d('2026-02-20'),
], [[$priya, $OWNER], [$marcus, $EDITOR]]);
acts($kl, [
    [0, '18:00', 300, 'Aeroline coach SG → KL', 'HarbourFront Centre', 1.2643, 103.8204, 'Coach with wifi and meals', ['dest' => 'Corus Hotel, KL', 'dlat' => 3.1570, 'dlng' => 101.7123]],
    [1, '08:30', 90, 'Nasi lemak at Village Park', 'Village Park Restaurant, Damansara Uptown', 3.1340, 101.6206, ''],
    [1, '11:00', 120, 'Batu Caves', 'Batu Caves', 3.2379, 101.6840, '272 steps. Monkeys again.'],
    [1, '19:00', 150, 'Jalan Alor night food', 'Jalan Alor', 3.1456, 101.7087, 'Wong Ah Wah chicken wings'],
    [2, '10:00', 90, 'Petronas Towers skybridge', 'Petronas Twin Towers', 3.1579, 101.7116, '', ['status' => 'confirmed']],
    [2, '15:00', 300, 'Coach back', 'Berjaya Times Square', 3.1424, 101.7104, '', ['dest' => 'HarbourFront Centre', 'dlat' => 1.2643, 'dlng' => 103.8204]],
]);
$kl->stay(0, 2, 'Corus Hotel Kuala Lumpur', 'Jalan Ampang, 50450 Kuala Lumpur', '+60 3-2161 8888', '', 3.1570, 101.7123, '14:00', '12:00');
exps($kl, 'MYR', 3.31, [[0, '18:00', 'Coach tickets ×2', 236.00], [1, '09:00', 'Nasi lemak', 38.50], [1, '20:00', 'Jalan Alor', 112.00], [2, '10:00', 'Petronas skybridge', 196.00], [0, '14:00', 'Corus Hotel', 412.00]]);

// ---- Penang wedding: shared with me (viewer) -----------------------------
$pg = new TripBuilder([
    'title' => 'Nadia & Faris Wedding — Penang', 'region' => 'MY', 'currency' => 'MYR', 'tz' => 'Asia/Kuala_Lumpur',
    'start' => '2026-07-03', 'end' => '2026-07-05', 'created' => $d('2026-03-18'), 'origin_currency' => 'MYR', 'origin_region' => 'MY', 'origin_timezone' => 'Asia/Kuala_Lumpur',
    'viewer_show_expenses' => false,
], [[$nadia, $OWNER], [$priya, $VIEWER], [$jiayi, $VIEWER], [$aaron, $VIEWER]]);
acts($pg, [
    [0, '19:30', 180, 'Welcome dinner (casual)', 'Kebaya Dining Room, Seven Terraces', 5.4183, 100.3399, 'Dress code: smart casual'],
    [1, '10:00', 120, 'Akad nikah', 'Masjid Kapitan Keling', 5.4170, 100.3377, 'Family & close friends only. Please be seated by 9:45.'],
    [1, '19:00', 240, 'Reception', 'Eastern & Oriental Hotel, Penang', 5.4235, 100.3355, "Theme: sage & gold\nBus from Hard Rock Hotel at 18:15"],
    [2, '09:00', 180, 'Optional: George Town street art walk', 'Armenian Street', 5.4146, 100.3354, 'Faris\'s brother will lead'],
    [2, '12:30', 90, 'Farewell lunch: char kway teow crawl', 'Siam Road Char Koay Teow', 5.4181, 100.3255, ''],
]);
$pg->stay(0, 2, 'Hard Rock Hotel Penang (room block)', 'Batu Feringgi, 11100 Penang', '+60 4-881 1711', 'Use code NADFAR26 for the room block rate', 5.4743, 100.2510);

// ---- Bangkok offsite: Aaron owns, Priya edits ----------------------------
$bkk = new TripBuilder([
    'title' => 'Team offsite Bangkok (Q3)', 'region' => 'TH', 'currency' => 'THB', 'tz' => 'Asia/Bangkok',
    'start' => '2026-09-23', 'end' => '2026-09-26', 'created' => $d('2026-07-07'),
], [[$aaron, $OWNER], [$priya, $EDITOR], [$dev, $EDITOR], [$tom, $VIEWER]]);
acts($bkk, [
    [0, '14:00', 120, 'Check-in + welcome drinks', 'Kimpton Maa-Lai Bangkok', 13.7414, 100.5470, ''],
    [1, '09:00', 420, 'Workshop day 1: 2027 roadmap', 'Kimpton Maa-Lai — Meeting Room Lychee', 13.7414, 100.5470, "Agenda in Notion.\nPriya: hiring plan section (20 min)"],
    [1, '19:00', 150, 'Team dinner at Sorn', 'Sorn', 13.7275, 100.5765, 'Southern Thai, booked 6 months ago!!', ['status' => 'confirmed']],
    [2, '09:00', 240, 'Workshop day 2', 'Kimpton Maa-Lai — Meeting Room Lychee', 13.7414, 100.5470, ''],
    [2, '15:00', 180, 'Team activity: longtail boat + Wat Arun', 'Wat Arun', 13.7437, 100.4889, ''],
    [2, '20:00', 120, 'Rooftop: Tichuca', 'Tichuca Rooftop Bar', 13.7240, 100.5826, ''],
    [3, '10:00', 120, 'Free morning / Chatuchak (it\'s Saturday!)', 'Chatuchak Weekend Market', 13.7999, 100.5500, ''],
]);
exps($bkk, 'THB', 24.9, [[1, '22:00', 'Sorn (company card)', 48500], [2, '15:00', 'Longtail boat charter', 3500], [2, '22:30', 'Tichuca tab', 12800]]);
$bkk->tasks('Logistics', 2, [['Collect dietary restrictions', 2], ['Book meeting room AV', 2], ['Expense claims submitted', 1, 'Dev still hasn\'t done his 🙃']], 0);

// ---- Archived ------------------------------------------------------------
$vn = new TripBuilder([
    'title' => 'Hanoi + Ha Long Bay Christmas', 'region' => 'VN', 'currency' => 'VND', 'tz' => 'Asia/Ho_Chi_Minh',
    'start' => '2025-12-19', 'end' => '2025-12-26', 'created' => $d('2025-09-10'), 'archived' => $d('2026-02-01'),
], [[$priya, $OWNER], [$jiayi, $EDITOR], [$marcus, $EDITOR]]);
acts($vn, [
    [0, '15:00', 120, 'Hoan Kiem Lake + Ngoc Son temple', 'Hoan Kiem Lake', 21.0285, 105.8522, ''],
    [0, '19:00', 120, 'Bún chả Hương Liên (the Obama one)', 'Bún chả Hương Liên', 21.0181, 105.8536, ''],
    [1, '08:00', 120, 'Egg coffee at Giảng', 'Cafe Giảng', 21.0335, 105.8529, ''],
    [1, '10:30', 150, 'Temple of Literature', 'Temple of Literature', 21.0285, 105.8355, ''],
    [1, '16:00', 90, 'Train Street', 'Hanoi Train Street', 21.0300, 105.8440, 'Officially closed but cafes still let you in'],
    [2, '08:00', 1440, 'Ha Long Bay overnight cruise', 'Tuan Chau Marina', 20.9300, 107.0350, 'Orchid Cruises, kayaking at Luon cave', ['status' => 'confirmed']],
    [4, '09:00', 480, 'Ninh Binh: Tam Coc boats + Mua Cave', 'Tam Coc', 20.2150, 105.9300, ''],
    [5, '19:00', 150, 'Christmas Eve at St Joseph\'s Cathedral', 'St. Joseph\'s Cathedral, Hanoi', 21.0287, 105.8489, ''],
    [6, '12:00', 90, 'Phở Bát Đàn', 'Phở Gia Truyền Bát Đàn', 21.0336, 105.8466, 'Queue, pay first, carry your own bowl'],
]);
exps($vn, 'VND', 19400, [[2, '08:00', 'Ha Long cruise ×3', 15600000], [4, '09:00', 'Ninh Binh tour', 3300000], [0, '19:30', 'Bún chả', 270000], [1, '08:15', 'Egg coffees', 150000], [0, '14:00', 'Hanoi La Siesta hotel', 6800000]]);

$mel = new TripBuilder([
    'title' => 'Melbourne & Great Ocean Road', 'region' => 'AU', 'currency' => 'AUD', 'tz' => 'Australia/Melbourne',
    'start' => '2025-09-25', 'end' => '2025-10-01', 'created' => $d('2025-06-20'), 'archived' => $d('2025-12-12'),
], [[$priya, $OWNER], [$dev, $EDITOR]]);
acts($mel, [
    [0, '16:00', 120, 'Hosier Lane + Degraves St coffee', 'Hosier Lane', -37.8162, 144.9692, ''],
    [1, '07:30', 600, 'Great Ocean Road: Twelve Apostles', 'Twelve Apostles', -38.6662, 143.1050, 'Self drive, left side of the road!!'],
    [2, '09:00', 180, 'Queen Victoria Market', 'Queen Victoria Market', -37.8076, 144.9568, ''],
    [3, '10:00', 300, 'Yarra Valley wineries', 'Domaine Chandon, Yarra Valley', -37.6880, 145.4380, ''],
    [4, '17:00', 180, 'Phillip Island penguin parade', 'Phillip Island', -38.5100, 145.1500, 'Freezing. Bring a beanie.'],
    [5, '12:00', 120, 'AFL? No, grand final was last week 😭', 'MCG', -37.8200, 144.9834, 'Stadium tour instead'],
]);
exps($mel, 'AUD', 1.17, [[1, '07:00', 'Car hire', 268.00], [3, '11:00', 'Wine tastings', 120.00], [4, '17:00', 'Penguin parade ×2', 98.00], [0, '15:00', 'Airbnb Fitzroy (6 nights)', 1214.00]]);

// ---- Public trips from other users ---------------------------------------
$ch = new TripBuilder([
    'title' => 'Swiss Alps by train — Glacier Express & Bernina', 'region' => 'CH', 'currency' => 'CHF', 'tz' => 'Europe/Zurich',
    'start' => '2026-07-04', 'end' => '2026-07-11', 'created' => $d('2026-03-14'), 'sharing' => 3,
    'origin_region' => 'DE', 'origin_currency' => 'EUR', 'origin_timezone' => 'Europe/Berlin',
], [[$leo, $OWNER]]);
acts($ch, [
    [0, '12:00', 180, 'Zürich old town', 'Zürich Altstadt', 47.3717, 8.5423, ''],
    [1, '09:00', 480, 'Lauterbrunnen + Mürren', 'Lauterbrunnen', 46.5935, 7.9091, '72 waterfalls'],
    [2, '08:00', 480, 'Jungfraujoch', 'Jungfraujoch', 46.5475, 7.9853, 'Top of Europe. Expensive but worth it'],
    [3, '08:52', 480, 'Glacier Express Zermatt → St. Moritz', 'Zermatt Station', 46.0244, 7.7478, 'Excellence class not needed', ['flags' => FLAG_TRAIN, 'dest' => 'St. Moritz', 'dlat' => 46.4983, 'dlng' => 9.8448]],
    [5, '10:00', 270, 'Bernina Express to Tirano', 'St. Moritz', 46.4983, 9.8448, '', ['flags' => FLAG_TRAIN, 'dest' => 'Tirano', 'dlat' => 46.2160, 'dlng' => 10.1680]],
    [6, '10:00', 240, 'Lake Lucerne + Mt Rigi', 'Rigi Kulm', 47.0565, 8.4851, ''],
]);
$nyc = new TripBuilder([
    'title' => 'NYC long weekend', 'region' => 'US', 'currency' => 'USD', 'tz' => 'America/New_York',
    'start' => '2026-10-09', 'end' => '2026-10-12', 'created' => $d('2026-08-30'), 'sharing' => 3,
    'origin_region' => 'GB', 'origin_currency' => 'GBP', 'origin_timezone' => 'Europe/London',
], [[$tom, $OWNER]]);
acts($nyc, [
    [0, '15:00', 180, 'High Line → Chelsea Market', 'The High Line', 40.7480, -74.0048, ''],
    [1, '09:00', 120, 'Bagels at Russ & Daughters', 'Russ & Daughters', 40.7223, -73.9882, ''],
    [1, '11:30', 240, 'The Met', 'The Metropolitan Museum of Art', 40.7794, -73.9632, ''],
    [2, '10:00', 180, 'Brooklyn Bridge walk + DUMBO', 'Brooklyn Bridge', 40.7061, -73.9969, ''],
    [2, '20:00', 180, 'Broadway: Hadestown', 'Walter Kerr Theatre', 40.7598, -73.9860, ''],
]);
