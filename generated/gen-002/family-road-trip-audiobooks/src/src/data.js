/*
 * Carrytale mock household data (Torres family, Thanksgiving drive).
 * Everything here is static fixture data; the app keeps all changes in memory.
 * Times are in seconds unless a field name says otherwise.
 */
(function () {
  // The Mystery of the Midnight Lighthouse: 14 chapters, 6h 12m total.
  const lighthouseChapters = [
    ["The Light That Shouldn't Be On", 24],
    ["Salt, Rope, and a Missing Key", 28],
    ["The Keeper's Logbook", 25],
    ["Footprints in the Tide", 27],
    ["The Locked Gallery", 26],
    ["Three Lanterns at Midnight", 29],
    ["What the Gull Carried", 24],
    ["The Second Staircase", 26],
    ["Mrs. Penhallow's Secret", 27],
    ["The Storm Bell", 25],
    ["Inside the Lamp Room", 28],
    ["A Name Written Twice", 26],
    ["The Last Signal", 23],
    ["Light Over Harbor Bay", 34],
  ].map(([title, minutes], i) => ({ number: i + 1, title, seconds: minutes * 60 }));

  // Wings of Ash: 22 chapters, 11h 05m total (Ines's solo book).
  const wingsChapterTitles = [
    "Ash on the Wind", "The Glassmaker's Daughter", "Iron Roads", "A Debt in Embers",
    "The Silent Ferry", "Salt Under the Bridge", "Feathers in the Furnace", "The Hollow Crown",
    "Nightingale Watch", "Smoke Over Vellin", "The Oathbreaker's Letter", "Blue Fire",
    "Quarry of Bones", "The Second Wing", "Tallow and Thorn", "Where the Rivers Forget",
    "A Bargain with the Ferryman", "Stormglass", "The Ashen Gate", "Wings Unbound",
    "The Last Ember", "Dawn Over Cindermoor",
  ];

  // Dino Dig Kids: 48 episodes, 12 to 18 minutes each. Episodes 1 to 31 are played.
  const dinoTitles = [
    "Triceratops Gets Stuck in the Mud", "The Great Fossil Fern Mystery", "Why Pterosaurs Had Hollow Bones",
    "Ankylosaur Armor, Explained", "Baby Dinosaur Nests and Eggs", "Digging for Dinosaur Teeth",
    "Could a T. rex Run Fast?", "The Tiny Dinosaurs Under the Sofa", "Footprints That Tell a Story",
    "Sauropods and Their Very Long Necks", "Dino Dig Kids Visit the Museum Vault",
    "What Dinosaurs Ate for Breakfast", "Velociraptor Was Smaller Than You Think",
    "Mud, Bones, and Bug Stuff", "The Ammonite Spiral Puzzle", "Fossil Hunters' Secret Tools",
    "Finale: The Big Dig Day",
  ];
  const dinoEpisodes = dinoTitles.map((title, i) => {
    const number = 32 + i;
    // Deterministic 12:00 to 17:59 spread for episodes after the current one.
    const seconds = number === 32 ? 14 * 60 + 20 : 12 * 60 + ((number * 53) % 360);
    return { number, title, seconds, played: number < 32 };
  });

  const episodeFor = (n) => dinoEpisodes.find((e) => e.number === n);

  window.CARRYTALE = {
    trip: {
      destination: "Grandma and Grandpa's house",
      parent: "Hannah Torres",
      remainingSec: 4 * 3600 + 20 * 60,
      gasStopInSec: 15 * 60,
      quietLengthSec: 12 * 60,
      // Live trip context; the clock runs in real time while the app is open.
      routeNote: "Mountain stretch ahead: cell signal drops, offline downloads take over",
    },

    listeners: {
      mateo: {
        id: "mateo",
        name: "Mateo",
        age: 9,
        contentSetting: "Ages 7 to 10",
        device: "Car speakers",
        speed: 1.0,
        sleepMin: null,
        // Shared-book bookmark, absolute seconds into the Lighthouse (ch 5, 2:10).
        bookPosSec: 0, // filled in from the Lighthouse chapter table below
        bookPosChapter: 5,
        bookPosOffsetSec: 130,
      },
      lucy: {
        id: "lucy",
        name: "Lucy",
        age: 5,
        contentSetting: "Ages 4 to 6",
        device: "Car speakers",
        speed: 1.0,
        sleepMin: null,
        podcast: "dino",
        episodeNumber: 32,
        episodePosSec: 220, // 3:40 into episode 32
        episodesPlayed: 31,
        episodesTotal: 48,
      },
      ines: {
        id: "ines",
        name: "Ines",
        age: 12,
        contentSetting: "Ages 11 to 12",
        device: "Headphones",
        speed: 1.25,
        sleepMin: null,
        playing: true,
        book: "wings",
        chapterNumber: 19,
        progressPct: 61,
      },
    },

    // Family position on the shared book: Chapter 7 at 18:40.
    familyBookChapter: 7,
    familyBookOffsetSec: 18 * 60 + 40,

    titles: {
      lighthouse: {
        id: "lighthouse",
        kind: "book",
        title: "The Mystery of the Midnight Lighthouse",
        author: "Marisol Quint",
        narrator: "Dev Halloran",
        chapters: lighthouseChapters,
        totalSec: lighthouseChapters.reduce((sum, c) => sum + c.seconds, 0),
        offlineMB: 412,
      },
      wings: {
        id: "wings",
        kind: "book",
        title: "Wings of Ash",
        author: "Teodora Vance",
        narrator: "Amara Lindqvist",
        chapters: wingsChapterTitles.map((title, i) => ({ number: i + 1, title, seconds: 0 })),
        totalSec: 11 * 3600 + 5 * 60,
        offlineMB: 521,
      },
      dino: {
        id: "dino",
        kind: "podcast",
        title: "Dino Dig Kids",
        author: "Field Notes Studio",
        episodes: dinoEpisodes,
        episodesTotal: 48,
        offlineMB: 118,
        offlineLabel: "Episodes 28 to 48",
      },
    },

    // Downloads for offline playback. Total is 2,100 MB, shown as 2.1 GB.
    offline: [
      { titleId: "lighthouse", label: "The Mystery of the Midnight Lighthouse", sizeMB: 412, detail: "All 14 chapters" },
      { titleId: "wings", label: "Wings of Ash", sizeMB: 521, detail: "All 22 chapters" },
      { titleId: "dino", label: "Dino Dig Kids", sizeMB: 118, detail: "Episodes 28 to 48" },
      { titleId: null, label: "Hollow Creek Hedgehogs", sizeMB: 143, detail: "Kids' podcast, 22 episodes" },
      { titleId: null, label: "Sam and the Sky Pirates", sizeMB: 201, detail: "Audiobook, 9 chapters" },
      { titleId: null, label: "Ferris Brook Ghost Club", sizeMB: 188, detail: "Audiobook, 12 chapters" },
      { titleId: null, label: "Starlight Math Club", sizeMB: 96, detail: "Kids' podcast, 15 episodes" },
      { titleId: null, label: "Pocket Tide Stories", sizeMB: 122, detail: "Bedtime stories, 30 episodes" },
      { titleId: null, label: "Rivermoss Bedtime Radio", sizeMB: 299, detail: "Bedtime stories, 60 episodes" },
    ],

    // Helpers exposed for the app layer.
    helpers: { episodeFor },
  };

  // Absolute book position of the Lighthouse's chapter starts, in seconds.
  const starts = [];
  let acc = 0;
  lighthouseChapters.forEach((c) => { starts.push(acc); acc += c.seconds; });
  const L = window.CARRYTALE.listeners;
  const T = window.CARRYTALE;
  L.mateo.bookPosSec = starts[L.mateo.bookPosChapter - 1] + L.mateo.bookPosOffsetSec;
  T.familyBookPosSec = starts[T.familyBookChapter - 1] + T.familyBookOffsetSec;
  T.lighthouseStarts = starts;
})();
