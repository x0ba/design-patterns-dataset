<?php
// Current, in-progress trip (today is day 6 = 16 Nov 2026).

$jp = new TripBuilder([
    'title' => 'Japan Autumn Leaves 🍁 Tokyo → Kyoto → Osaka',
    'region' => 'JP', 'currency' => 'JPY', 'tz' => 'Asia/Tokyo',
    'start' => '2026-11-10', 'end' => '2026-11-22',
    'created' => $d('2026-06-14'), 'updated' => $now - 2 * 3600000,
    'sharing' => 2,
], [[$priya, $OWNER], [$marcus, $EDITOR], [$jiayi, $EDITOR], [$hana, $VIEWER]]);
$R = 114.2; // JPY per SGD
$SG = ['tzStart' => 'Asia/Singapore', 'tzEnd' => 'Asia/Tokyo'];

$mTokyo = $jp->macro(0, 3, 'Tokyo', "Base: Shinjuku. Suica on phone for everyone.\nTry to keep mornings free for jet lag.");
$mHakone = $jp->macro(4, 4, 'Hakone day + onsen night', 'Hakone Free Pass (2-day) — buy at Shinjuku Odakyu counter.');
$mKyoto = $jp->macro(5, 8, 'Kyoto', 'Momiji peak forecast: 15–25 Nov. Early starts for Tofuku-ji & Eikando!');
$mNara = $jp->macro(7, 7, 'Nara side trip', '');
$mOsaka = $jp->macro(9, 12, 'Osaka', 'Food food food. USJ day TBD depending on weather.');

$flt = $jp->act([0, '07:45', 0], 'SQ 638 Singapore → Tokyo Haneda', 'Singapore Changi Airport (SIN) T3', "Booking ref: 6XKQ2M\nSeats 42A / 42C / 42D\nCheck-in opens 48h before.", $SG + [
    'endDay' => 0, 'endHm' => '15:45', 'flags' => FLAG_FLIGHT, 'status' => 'confirmed',
    'lat' => 1.3644, 'lng' => 103.9915, 'dest' => 'Tokyo Haneda Airport (HND) T3', 'dlat' => 35.5494, 'dlng' => 139.7798,
]);
$jp->act([0, '16:45', 75], 'Keikyu + JR to Shinjuku', 'Haneda Airport Terminal 3 Station', 'Keikyu to Shinagawa, JR Yamanote to Shinjuku. Taxi if too tired with luggage (~¥9,000).', [
    'flags' => FLAG_TRAIN, 'lat' => 35.5446, 'lng' => 139.7686, 'dest' => 'Shinjuku Station', 'dlat' => 35.6896, 'dlng' => 139.7006, 'macro' => $mTokyo,
]);
$jp->act([0, '19:30', 90], 'Dinner at Omoide Yokocho', 'Omoide Yokocho, Shinjuku', 'Yakitori alleys, cash only at most stalls.', ['lat' => 35.6931, 'lng' => 139.6995, 'macro' => $mTokyo, 'status' => 'planned']);
$tsukiji = $jp->act([1, '07:30', 120], 'Tsukiji Outer Market breakfast', 'Tsukiji Outer Market', "Tamagoyaki at Yamacho, tuna at Kitsuneya.\nGo before 9 — gets crowded.", ['lat' => 35.6654, 'lng' => 139.7707, 'macro' => $mTokyo, 'status' => 'confirmed']);
$jp->act([1, '10:30', 150], 'teamLab Planets', 'teamLab Planets TOKYO, Toyosu', "Tickets booked for 10:30 slot (3 pax).\nWear shorts — you wade through water!", ['lat' => 35.6491, 'lng' => 139.7898, 'macro' => $mTokyo, 'status' => 'confirmed']);
$jp->act([1, '14:30', 180], 'Ginza wander + Itoya', 'Ginza Itoya', 'Stationery for Jiayi. Uniqlo Ginza flagship for heattech.', ['lat' => 35.6727, 'lng' => 139.7671, 'macro' => $mTokyo]);
$jp->act([1, '19:00', 120], 'Sushi Kanesaka (lunch slot gone, dinner)', 'Sushi Kanesaka, Ginza', 'Omakase ¥33,000 pp. Reservation via Omakase.in — confirmation email in Priya\'s inbox.', ['lat' => 35.6711, 'lng' => 139.7618, 'macro' => $mTokyo, 'status' => 'confirmed']);
$jp->act([2, '09:00', 120], 'Meiji Jingu', 'Meiji Jingu, Shibuya', '', ['lat' => 35.6764, 'lng' => 139.6993, 'macro' => $mTokyo]);
$jp->act([2, '11:30', 150], 'Harajuku → Omotesando', 'Takeshita Street', 'Crepes at Marion. Omotesando Hills, Nezu Museum if time.', ['lat' => 35.6716, 'lng' => 139.7031, 'macro' => $mTokyo]);
$shibuya = $jp->act([2, '16:30', 120], 'Shibuya Sky at sunset', 'SHIBUYA SKY', "Sunset ~16:35 in Nov — booked 16:00 slot.\nNo bags allowed on the rooftop, lockers available.", ['lat' => 35.6585, 'lng' => 139.7022, 'macro' => $mTokyo, 'status' => 'confirmed']);
$jp->act([2, '19:30', 90], 'Ichiran Shibuya', 'Ichiran Shibuya', 'Backup: Afuri Ebisu (yuzu shio).', ['lat' => 35.6604, 'lng' => 139.7006, 'macro' => $mTokyo]);
$jp->act([3, '08:30', 240], 'Day trip: Kamakura', 'Kamakura Station', "Daibutsu → Hasedera → Komachi-dori.\nEnoden line to Enoshima if energy left.", ['lat' => 35.3192, 'lng' => 139.5467, 'macro' => $mTokyo, 'status' => 'tentative', 'zoom' => 12]);
$jp->act([3, '18:30', 150], 'Golden Gai drinks w/ Hana', 'Shinjuku Golden Gai', "Hana's friend runs a tiny bar here (Bar Albatross area). Cover charge ~¥1,000.", ['lat' => 35.6938, 'lng' => 139.7046, 'macro' => $mTokyo]);
$jp->act([4, '08:00', 85], 'Romancecar to Hakone-Yumoto', 'Shinjuku Station (Odakyu)', 'Seats 7-9 in car 3. Ekiben from the station!', ['flags' => FLAG_TRAIN, 'status' => 'confirmed', 'lat' => 35.6913, 'lng' => 139.6995, 'dest' => 'Hakone-Yumoto Station', 'dlat' => 35.2329, 'dlng' => 139.1069, 'macro' => $mHakone]);
$jp->act([4, '10:00', 360], 'Hakone loop: Tozan train → ropeway → Lake Ashi cruise', 'Owakudani', "Black eggs at Owakudani (+7 years of life apparently 🥚).\nPirate ship across Lake Ashi to Moto-Hakone, walk to Hakone Shrine torii.", ['lat' => 35.2440, 'lng' => 139.0198, 'macro' => $mHakone, 'zoom' => 12]);
$jp->act([4, '18:30', 120], 'Kaiseki dinner at ryokan', 'Hakone Ginyu', 'Private onsen on balcony. Dinner served in room.', ['lat' => 35.2365, 'lng' => 139.0977, 'macro' => $mHakone, 'status' => 'confirmed']);
$jp->act([5, '10:12', 75], 'Shinkansen Odawara → Kyoto (Hikari 637)', 'Odawara Station', "Reserved seats car 9, row 11 D/E + 12E.\nSit on the right (E side) for Mt Fuji views!", ['flags' => FLAG_TRAIN, 'status' => 'confirmed', 'lat' => 35.2564, 'lng' => 139.1551, 'dest' => 'Kyoto Station', 'dlat' => 34.9858, 'dlng' => 135.7588, 'macro' => $mKyoto]);
$jp->act([5, '14:00', 180], 'Kiyomizu-dera + Sannenzaka', 'Kiyomizu-dera', '', ['lat' => 34.9949, 'lng' => 135.7850, 'macro' => $mKyoto]);
$jp->act([5, '17:30', 120], 'Kiyomizu-dera night illumination', 'Kiyomizu-dera', 'Autumn special night viewing 17:30–21:00. ¥500.', ['lat' => 34.9949, 'lng' => 135.7850, 'macro' => $mKyoto, 'status' => 'planned']);
$tofuku = $jp->act([6, '08:30', 120], 'Tofuku-ji (Tsutenkyo bridge)', 'Tofuku-ji', 'Opens 8:30 during peak. Queue starts at 8! Momiji at peak per this morning\'s report.', ['lat' => 34.9767, 'lng' => 135.7738, 'macro' => $mKyoto, 'status' => 'confirmed']);
$jp->act([6, '11:00', 120], 'Fushimi Inari — up to Yotsutsuji', 'Fushimi Inari Taisha', 'Halfway point is enough for the view.', ['lat' => 34.9671, 'lng' => 135.7727, 'macro' => $mKyoto]);
$jp->act([6, '14:00', 90], 'Nishiki Market late lunch', 'Nishiki Market', 'Tako tamago, soy milk donuts, Aritsugu knives (Marcus).', ['lat' => 35.0050, 'lng' => 135.7649, 'macro' => $mKyoto]);
$jp->act([6, '17:00', 90], 'Eikando autumn light-up', 'Eikando Zenrin-ji', "Tickets at the gate from 17:30, ¥1,000.\nCan be insane on weekends — weekday so hopefully ok.", ['lat' => 35.0147, 'lng' => 135.7944, 'macro' => $mKyoto, 'status' => 'tentative']);
$jp->act([6, '19:30', 90], 'Dinner: Gion Duck Noodles', 'Gion Duck Noodles', 'No reservations. Put names down early, they text you.', ['lat' => 35.0040, 'lng' => 135.7735, 'macro' => $mKyoto]);
$jp->act([7, '08:30', 45], 'Kintetsu to Nara', 'Kyoto Station (Kintetsu)', '', ['flags' => FLAG_TRAIN, 'lat' => 34.9858, 'lng' => 135.7588, 'dest' => 'Kintetsu-Nara Station', 'dlat' => 34.6844, 'dlng' => 135.8274, 'macro' => $mNara]);
$jp->act([7, '09:30', 240], 'Nara Park, Todai-ji, Kasuga Taisha', 'Todai-ji', 'Deer crackers ¥200. Hold them high, they bow then headbutt.', ['lat' => 34.6890, 'lng' => 135.8398, 'macro' => $mNara]);
$jp->act([7, '15:30', 120], 'Arashiyama bamboo grove (late afternoon)', 'Arashiyama Bamboo Grove', 'Back from Nara via Kyoto stn → JR Sagano line. Okochi Sanso if open.', ['lat' => 35.0170, 'lng' => 135.6713, 'macro' => $mKyoto, 'status' => 'tentative']);
$jp->act([8, '07:00', 120], 'Tea ceremony at Camellia', 'Camellia Flower, Ninenzaka', 'Booked the 7am one, only slot left. Kimono rental next door at 6:30?? we\'ll see.', ['lat' => 34.9979, 'lng' => 135.7810, 'macro' => $mKyoto, 'status' => 'confirmed']);
$jp->act([8, '10:00', 120], 'Kinkaku-ji', 'Kinkaku-ji', '', ['lat' => 35.0394, 'lng' => 135.7292, 'macro' => $mKyoto]);
$jp->act([8, '13:00', 120], 'Philosopher\'s Path walk', 'Philosopher\'s Path', 'Ginkaku-ji end → Nanzen-ji end. Stop at % Arabica? (there is one at Higashiyama).', ['lat' => 35.0230, 'lng' => 135.7944, 'macro' => $mKyoto]);
$jp->act([8, '19:00', 120], 'Kaiseki at Gion Karyo', 'Gion Karyo', 'Anniversary dinner for M & J 🎉 — don\'t tell them it\'s paid', ['lat' => 35.0018, 'lng' => 135.7752, 'macro' => $mKyoto, 'status' => 'confirmed']);
$jp->act([9, '10:30', 30], 'JR Special Rapid to Osaka', 'Kyoto Station', '', ['flags' => FLAG_TRAIN, 'lat' => 34.9858, 'lng' => 135.7588, 'dest' => 'Osaka Station', 'dlat' => 34.7025, 'dlng' => 135.4959, 'macro' => $mOsaka]);
$jp->act([9, '13:00', 150], 'Osaka Castle', 'Osaka Castle Park', '', ['lat' => 34.6873, 'lng' => 135.5262, 'macro' => $mOsaka]);
$jp->act([9, '18:00', 180], 'Dotonbori food crawl', 'Dotonbori', "Kukuru takoyaki, Kani Doraku (just for photo), Daruma kushikatsu.\nNO double dipping the sauce!", ['lat' => 34.6687, 'lng' => 135.5013, 'macro' => $mOsaka]);
$jp->act([10, '08:30', 600], 'Universal Studios Japan', 'Universal Studios Japan', "Express Pass 4 bought for Nintendo World.\nArea timed-entry at 9:20.", ['lat' => 34.6654, 'lng' => 135.4323, 'macro' => $mOsaka, 'status' => 'tentative']);
$jp->act([11, '10:00', 120], 'Kuromon Market', 'Kuromon Ichiba Market', '', ['lat' => 34.6654, 'lng' => 135.5066, 'macro' => $mOsaka]);
$jp->act([11, '13:00', 180], 'Shinsekai + Tsutenkaku', 'Tsutenkaku', '', ['lat' => 34.6525, 'lng' => 135.5063, 'macro' => $mOsaka]);
$jp->act([11, '17:00', 120], 'Umeda Sky Building', 'Umeda Sky Building', 'Floating garden observatory. Then Hankyu dept store depachika for omiyage.', ['lat' => 34.7053, 'lng' => 135.4905, 'macro' => $mOsaka]);
$jp->act([12, '09:30', 70], 'Haruka to Kansai Airport', 'Shin-Osaka Station', 'ICOCA & Haruka discount ticket.', ['flags' => FLAG_TRAIN, 'lat' => 34.7335, 'lng' => 135.5003, 'dest' => 'Kansai International Airport', 'dlat' => 34.4320, 'dlng' => 135.2304, 'macro' => $mOsaka]);
$jp->act([12, '13:25', 0], 'SQ 619 Osaka Kansai → Singapore', 'Kansai International Airport (KIX) T1', 'Booking ref: 6XKQ2M (same PNR).', [
    'tzStart' => 'Asia/Tokyo', 'tzEnd' => 'Asia/Singapore', 'endDay' => 12, 'endHm' => '19:15',
    'flags' => FLAG_FLIGHT, 'status' => 'confirmed', 'lat' => 34.4320, 'lng' => 135.2304, 'dest' => 'Singapore Changi Airport (SIN)', 'dlat' => 1.3644, 'dlng' => 103.9915,
]);
// Ideas pool
$jp->act(null, 'Ghibli Museum', 'Ghibli Museum, Mitaka', 'Tickets release on the 10th of the prior month at 10am JST — sold out in 20 mins 😭 try resale?', ['lat' => 35.6962, 'lng' => 139.5704]);
$jp->act(null, 'Kurama → Kibune hike', 'Kurama-dera', 'Half day. Kibune shrine lantern steps. Maybe if rain-free.', ['lat' => 35.1179, 'lng' => 135.7706]);
$jp->act(null, 'Pokémon Center Osaka DX', 'Pokémon Center Osaka DX, Shinsaibashi PARCO', '', ['lat' => 34.6729, 'lng' => 135.5011]);
$jp->act(null, 'Onsen at Funaoka', 'Funaoka Onsen', 'Old-school sento, tattoos ok', ['lat' => 35.0416, 'lng' => 135.7421]);
$jp->act(null, 'Himeji Castle day trip', 'Himeji Castle', '1h by shinkansen from Shin-Osaka, JR pass not worth it for 1 trip', ['lat' => 34.8394, 'lng' => 134.6939]);
$jp->act(null, 'Kobe beef lunch', 'Kobe', '');

$st1 = $jp->stay(0, 4, 'Hotel Gracery Shinjuku', '1-19-1 Kabukicho, Shinjuku-ku, Tokyo 160-8466', '+81 3-6833-2489', "Godzilla head hotel lol. 2 rooms: twin (P) + double (M&J).\nConfirmation: Agoda 1188274563\nLuggage forwarding to Kyoto hotel via Yamato — ask front desk on day 4.", 35.6948, 139.7020);
$st2 = $jp->stay(4, 5, 'Hakone Ginyu', '100-1 Miyanoshita, Hakone, Ashigarashimo District, Kanagawa 250-0404', '+81 460-82-3355', "Dinner 18:30, breakfast 8:00. Check-in from 14:00.\nRoom with private open-air bath, valley view.", 35.2365, 139.0977, '14:00', '10:00');
$st3 = $jp->stay(5, 9, 'The Thousand Kyoto', '570 Higashishiokoji-cho, Shimogyo-ku, Kyoto 600-8216', '+81 75-351-0700', 'Right next to Kyoto Station. Luggage arriving from Tokyo on 15th.', 34.9862, 135.7603);
$st4 = $jp->stay(9, 12, 'Cross Hotel Osaka', '2-5-15 Shinsaibashisuji, Chuo-ku, Osaka 542-0085', '+81 6-6213-8281', '', 34.6705, 135.5016, '15:00', '09:00');

// Expenses (some converted, some not yet)
$jp->expense(0, '07:00', 'Flights SIN⇄HND/KIX (3 pax)', 3486.60, 'SGD', 1, 'Paid by Priya. Marcus & Jiayi to transfer 2/3.');
$jp->expense(0, '16:30', 'Suica top-up', 15000, 'JPY', $R);
$jp->expense(0, '20:45', 'Omoide Yokocho yakitori + beers', 11400, 'JPY', $R);
$jp->expense(1, '08:10', 'Tsukiji snacks', 4680, 'JPY', $R);
$jp->expense(1, '10:20', 'teamLab Planets tickets', 11400, 'JPY', $R, '3 × ¥3,800');
$jp->expense(1, '15:40', 'Itoya stationery', 6820, 'JPY', $R, 'Jiayi\'s — she owes me');
$jp->expense(1, '21:10', 'Sushi Kanesaka', 99000, 'JPY', $R, 'Omakase × 3 incl. sake');
$jp->expense(2, '13:15', 'Crepes + lunch Harajuku', 5250, 'JPY', $R);
$jp->expense(2, '16:00', 'Shibuya Sky', 7500, 'JPY', $R);
$jp->expense(2, '20:30', 'Ichiran', 3960, 'JPY', $R);
$jp->expense(3, '09:00', 'JR to Kamakura', 2820, 'JPY', $R);
$jp->expense(3, '22:30', 'Golden Gai bar', 8400, 'JPY', $R);
$jp->expense(4, '07:45', 'Hakone Free Pass ×3', 18300, 'JPY', $R);
$jp->expense(4, '07:50', 'Ekiben', 4320, 'JPY', $R);
$jp->expense(4, '12:30', 'Owakudani black eggs + lunch', 6200, 'JPY', $R);
$jp->expense(4, '15:00', 'Hakone Ginyu (1 night, 2 rooms)', 186000, 'JPY', $R, 'Incl. kaiseki dinner & breakfast');
$jp->expense(5, '09:55', 'Shinkansen Odawara–Kyoto', 32970, 'JPY', $R);
$jp->expense(5, '13:20', 'Lunch near Kyoto stn', 4100, 'JPY', $R);
$jp->expense(5, '18:00', 'Kiyomizu-dera night entry', 1500, 'JPY', $R);
$jp->expense(6, '08:30', 'Tofuku-ji entry', 3000, 'JPY', $R);
$jp->expense(6, '14:40', 'Nishiki Market', 5870, 'JPY', null, 'mostly Marcus\'s knife deposit lol — check receipt');
$jp->expense(6, '20:50', 'Gion Duck Noodles', 6300, 'JPY', null);
$jp->expense(0, '00:00', 'Hotel Gracery Shinjuku (4 nights)', 1612.40, 'SGD', 1, 'Prepaid Agoda');
$jp->expense(5, '00:00', 'The Thousand Kyoto (4 nights)', 2245.00, 'SGD', 1);
$jp->expense(8, '07:00', 'Tea ceremony (deposit)', 6000, 'JPY', null);
$jp->expense(10, '08:00', 'USJ tickets + Express Pass 4', 89700, 'JPY', $R, 'Refundable until 18 Nov');

$tl1 = $jp->tasks('Before we fly', 2, [
    ['Renew passport (Jiayi)', 2, 'Expires Feb 2027 — Japan only needs validity for stay but airline was strict last time'],
    ['Buy travel insurance', 2, 'FWD premium, covers ski not needed'],
    ['Visit Japan Web QR codes', 2, 'Everyone fill in immigration + customs'],
    ['Book teamLab Planets', 2],
    ['Book Shibuya Sky slot', 2],
    ['Get ¥ cash from Arcade money changer', 2, '¥80,000 each'],
    ['Pocket wifi vs eSIM?', 2, 'Went with Ubigi eSIM 10GB'],
], 0);
$tl2 = $jp->tasks('During trip', 1, [
    ['Send luggage Tokyo → Kyoto via Yamato', 2, null, 4],
    ['Confirm Gion Karyo reservation (call)', 1, 'They want a call 2 days before', 6],
    ['Decide on USJ vs Himeji', 0, 'Refund deadline 18 Nov!', 8],
    ['Omiyage for office', 0, 'Tokyo Banana / Yatsuhashi / 551 Horai is not travel-friendly', 11],
    ['Tax-free receipts — keep in passport', 0],
], 1);
$jp->tasks('Food wishlist', 0, [
    ['Wagyu katsu sando', 2],
    ['Matcha parfait in Uji or Gion', 0],
    ['Okonomiyaki in Osaka', 0],
    ['Kitsune udon', 0],
    ['Hokkaido soft serve (yes in Kyoto, it counts)', 0],
], 2);
$jp->tasks('Abandoned ideas', 4, [
    ['Mt Fuji 5th station day trip', 4, 'Too far, weather unreliable in Nov'],
    ['JR Pass', 4, 'Price hike made it not worth it'],
], 3);

$jp->thread(0, null, [
    [$marcus, 'Can we keep one morning totally unplanned? Last trip we were dead by day 5 😅'],
    [$priya, 'Yes — Day 4 morning is free-ish, Hakone train is 8am but we can sleep on it'],
    [$jiayi, '+1. Also I want at least one proper coffee per day, non-negotiable'],
]);
$jp->thread(1, $tofuku, [
    [$jiayi, 'Queue was already ~150m at 8:05 but moved fast. Worth it 🍁🍁'],
    [$marcus, 'Got the shot from Tsutenkyo bridge, will share in the album'],
], true);
$jp->thread(1, $shibuya, [
    [$hana, 'Tip: the slot just before sunset sells out — glad you booked early!'],
    [$priya, 'Thanks Hana!! See you at Golden Gai 🍻'],
], true);
$jp->thread(2, $st3, [
    [$marcus, 'Did Yamato confirm the bags arrived? Hotel email says only 2 of 3 so far'],
    [$priya, 'Third one is scheduled for evening delivery, tracking says "out for delivery"'],
]);
$jp->thread(1, $tsukiji, [[$jiayi, 'The tamagoyaki on a stick was ¥200 and it was the best thing I ate all week']], true);

// ---- Shared by Hana: Tokyo local tips (Priya is viewer) ------------------
$hanaTips = new TripBuilder([
    'title' => 'Hana\'s Tokyo picks for friends',
    'region' => 'JP', 'currency' => 'JPY', 'tz' => 'Asia/Tokyo',
    'start' => '2026-11-11', 'end' => '2026-11-13',
    'created' => $d('2026-09-30'), 'sharing' => 3, 'origin_region' => 'JP', 'origin_currency' => 'JPY', 'origin_timezone' => 'Asia/Tokyo',
    'public_show_expenses' => false,
], [[$hana, $OWNER], [$priya, $VIEWER]]);
$hanaTips->act([0, '08:00', 60], 'Fuglen Tokyo coffee', 'Fuglen Tokyo, Tomigaya', 'Norwegian roaster, the aeropress is great. Opens 7am.', ['lat' => 35.6688, 'lng' => 139.6919]);
$hanaTips->act([0, '10:00', 120], 'Yoyogi Park walk', 'Yoyogi Park', 'Ginkgo trees turn yellow late Nov.', ['lat' => 35.6717, 'lng' => 139.6949]);
$hanaTips->act([0, '12:30', 90], 'Lunch: Tonkatsu Maisen', 'Tonkatsu Maisen Aoyama', 'Ask for the kurobuta set.', ['lat' => 35.6681, 'lng' => 139.7099]);
$hanaTips->act([1, '09:00', 180], 'Yanaka Ginza old town', 'Yanaka Ginza', 'Cats, menchi katsu, old wooden shops. Very un-Tokyo.', ['lat' => 35.7276, 'lng' => 139.7663]);
$hanaTips->act([1, '14:00', 120], 'Shimokitazawa vintage shopping', 'Shimokitazawa', '', ['lat' => 35.6614, 'lng' => 139.6679]);
$hanaTips->act([2, '18:00', 150], 'Izakaya: Tachinomi Takeuchi', 'Tachinomi Takeuchi, Kanda', 'Standing bar, no English menu — point and smile.', ['lat' => 35.6917, 'lng' => 139.7709]);
$hanaTips->act(null, 'Nakameguro canal (if spring)', 'Nakameguro', 'Sakura season only really', ['lat' => 35.6437, 'lng' => 139.6987]);
