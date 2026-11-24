// Album catalog for the seeded library. Format per album:
// artist | album | year | genre(s, comma) | label | format | tracks (semicolon separated)
// "~" before a title marks a long track (8+ minutes), "^" a short one (< 2 min).
export const CATALOG = `
Radiohead|OK Computer|1997|Alternative Rock|Parlophone|flac|Airbag;Paranoid Android;Subterranean Homesick Alien;Exit Music (For a Film);Let Down;Karma Police;^Fitter Happier;Electioneering;Climbing Up the Walls;No Surprises;Lucky;The Tourist
Radiohead|Kid A|2000|Alternative Rock,Electronic|Parlophone|flac|Everything in Its Right Place;Kid A;The National Anthem;How to Disappear Completely;Treefingers;Optimistic;In Limbo;Idioteque;Morning Bell;Motion Picture Soundtrack
Radiohead|In Rainbows|2007|Alternative Rock|XL Recordings|flac|15 Step;Bodysnatchers;Nude;Weird Fishes/Arpeggi;All I Need;Faust Arp;Reckoner;House of Cards;Jigsaw Falling into Place;Videotape
Boards of Canada|Music Has the Right to Children|1998|Electronic,IDM|Warp Records|flac|^Wildlife Analysis;An Eagle in Your Mind;The Color of the Fire;Telephasic Workshop;^Triangles & Rhombuses;Sixtyten;Turquoise Hexagon Sun;^Kaini Industries;Bocuma;Roygbiv;Rue the Whirl;Aquarius;^Olson;Pete Standing Alone;Smokes Quantity;Open the Light;^One Very Important Thought
Daft Punk|Discovery|2001|Electronic,House|Virgin|mp3|One More Time;Aerodynamic;Digital Love;Harder, Better, Faster, Stronger;Crescendolls;^Nightvision;Superheroes;High Life;Something About Us;Voyager;Veridis Quo;Short Circuit;Face to Face;~Too Long
Miles Davis|Kind of Blue|1959|Jazz|Columbia|flac|~So What;Freddie Freeloader;Blue in Green;~All Blues;Flamenco Sketches
John Coltrane|A Love Supreme|1965|Jazz|Impulse!|flac|Part I – Acknowledgement;Part II – Resolution;Part III – Pursuance;Part IV – Psalm
Bill Evans Trio|Waltz for Debby|1962|Jazz|Riverside|flac|My Foolish Heart;Waltz for Debby;Detour Ahead;My Romance;Some Other Time;Milestones
Stan Getz & João Gilberto|Getz/Gilberto|1964|Bossa Nova,Jazz|Verve|flac|The Girl from Ipanema;Doralice;Para Machucar Meu Coração;Desafinado;Corcovado (Quiet Nights of Quiet Stars);Só Danço Samba;O Grande Amor;Vivo Sonhando
Fleetwood Mac|Rumours|1977|Rock|Warner Bros.|flac|Second Hand News;Dreams;Never Going Back Again;Don't Stop;Go Your Own Way;Songbird;The Chain;You Make Loving Fun;I Don't Want to Know;Oh Daddy;Gold Dust Woman
Kendrick Lamar|To Pimp a Butterfly|2015|Hip-Hop|Top Dawg Entertainment|flac|Wesley's Theory;For Free? (Interlude);King Kunta;Institutionalized;These Walls;u;Alright;For Sale? (Interlude);Momma;Hood Politics;How Much a Dollar Cost;Complexion (A Zulu Love);The Blacker the Berry;You Ain't Gotta Lie (Momma Said);i;~Mortal Man
Frank Ocean|Blonde|2016|R&B|Boys Don't Cry|m4a|Nikes;Ivy;Pink + White;^Be Yourself;Solo;Skyline To;Self Control;^Good Guy;Nights;^Solo (Reprise);Pretty Sweet;^Facebook Story;^Close to You;White Ferrari;Seigfried;Godspeed;~Futura Free
Bon Iver|For Emma, Forever Ago|2007|Indie Folk|Jagjaguwar|flac|Flume;Lump Sum;Skinny Love;The Wolves (Act I and II);Blindsided;Creature Fear;^Team;For Emma;re: Stacks
Sufjan Stevens|Carrie & Lowell|2015|Indie Folk|Asthmatic Kitty|flac|Death with Dignity;Should Have Known Better;All of Me Wants All of You;Drawn to the Blood;Eugene;Fourth of July;The Only Thing;Carrie & Lowell;John My Beloved;No Shade in the Shadow of the Cross;Blue Bucket of Gold
Fleet Foxes|Fleet Foxes|2008|Indie Folk|Sub Pop|flac|Sun It Rises;White Winter Hymnal;Ragged Wood;Tiger Mountain Peasant Song;Quiet Houses;He Doesn't Know Why;^Heard Them Stirring;Your Protector;Meadowlarks;Blue Ridge Mountains;Oliver James
Arcade Fire|Funeral|2004|Indie Rock|Merge Records|mp3|Neighborhood #1 (Tunnels);Neighborhood #2 (Laïka);Une année sans lumière;Neighborhood #3 (Power Out);Neighborhood #4 (7 Kettles);Crown of Love;Wake Up;Haïti;Rebellion (Lies);In the Backseat
The National|Boxer|2007|Indie Rock|Beggars Banquet|flac|Fake Empire;Mistaken for Strangers;Brainy;Squalor Victoria;Green Gloves;Slow Show;Apartment Story;Start a War;Guest Room;Racing Like a Pro;Ada;Gospel
LCD Soundsystem|Sound of Silver|2007|Electronic,Dance-Punk|DFA Records|flac|Get Innocuous!;Time to Get Away;North American Scum;~Someone Great;~All My Friends;Us v Them;Watch the Tapes;Sound of Silver;New York, I Love You but You're Bringing Me Down
Massive Attack|Mezzanine|1998|Trip Hop|Virgin|flac|Angel;Risingson;Teardrop;Inertia Creeps;Exchange;Dissolved Girl;Man Next Door;Black Milk;Mezzanine;Group Four;(Exchange)
Portishead|Dummy|1994|Trip Hop|Go! Beat|flac|Mysterons;Sour Times;Strangers;It Could Be Sweet;Wandering Star;It's a Fire;Numb;Roads;Pedestal;Biscuit;Glory Box
Aphex Twin|Selected Ambient Works 85-92|1992|Electronic,Ambient|Apollo|flac|Xtal;Tha;Pulsewidth;Ageispolis;i;Green Calx;Heliosphan;We Are the Music Makers;Schottkey 7th Path;Ptolemy;Hedphelym;Delphium;Actium
Brian Eno|Ambient 1: Music for Airports|1978|Ambient|Polydor|flac|~1/1;2/1;1/2;~2/2
Glenn Gould|Bach: The Goldberg Variations, BWV 988 (1981)|1982|Classical|CBS Masterworks|flac|Aria;Variatio 1;Variatio 2;Variatio 3. Canone all'Unisuono;Variatio 4;Variatio 5;Variatio 6. Canone alla Seconda;Variatio 7;Variatio 8;Variatio 9. Canone alla Terza;Variatio 10. Fughetta;Variatio 11;Variatio 12. Canone alla Quarta;Variatio 13;Variatio 14;Variatio 15. Canone alla Quinta;Variatio 16. Ouverture;Variatio 17;Variatio 18. Canone alla Sesta;Variatio 19;Variatio 20;Variatio 21. Canone alla Settima;Variatio 22;Variatio 23;Variatio 24. Canone all'Ottava;Variatio 25;Variatio 26;Variatio 27. Canone alla Nona;Variatio 28;Variatio 29;Variatio 30. Quodlibet;Aria da capo
Berliner Philharmoniker & Herbert von Karajan|Beethoven: Symphony No. 9 in D minor, Op. 125|1963|Classical|Deutsche Grammophon|flac|~I. Allegro ma non troppo, un poco maestoso;~II. Molto vivace;~III. Adagio molto e cantabile;~IV. Presto – Allegro assai
Joni Mitchell|Blue|1971|Folk,Singer-Songwriter|Reprise|flac|All I Want;My Old Man;Little Green;Carey;Blue;California;This Flight Tonight;River;A Case of You;The Last Time I Saw Richard
Nick Drake|Pink Moon|1972|Folk|Island|flac|Pink Moon;Place to Be;Road;Which Will;^Horn;Things Behind the Sun;^Know;Parasite;Free Ride;Harvest Breed;From the Morning
Stevie Wonder|Innervisions|1973|Soul,Funk|Tamla|flac|Too High;Visions;Living for the City;Golden Lady;Higher Ground;Jesus Children of America;All in Love Is Fair;Don't You Worry 'bout a Thing;He's Misstra Know-It-All
Marvin Gaye|What's Going On|1971|Soul|Tamla|flac|What's Going On;What's Happening Brother;Flyin' High (In the Friendly Sky);Save the Children;^God Is Love;Mercy Mercy Me (The Ecology);Right On;Wholy Holy;Inner City Blues (Make Me Wanna Holler)
Tame Impala|Currents|2015|Psychedelic Pop|Modular|flac|Let It Happen;^Nangs;The Moment;Yes I'm Changing;Eventually;^Gossip;The Less I Know the Better;Past Life;^Disciples;'Cause I'm a Man;Reality in Motion;Love/Paranoia;New Person, Same Old Mistakes
Tame Impala|Lonerism|2012|Psychedelic Rock|Modular|mp3|Be Above It;Endors Toi;Apocalypse Dreams;Mind Mischief;Music to Walk Home By;Why Won't They Talk to Me?;Feels Like We Only Go Backwards;Keep On Lying;Elephant;She Just Won't Believe Me;Nothing That Has Happened So Far Has Been Anything We Could Control;Sun's Coming Up
Beach House|Teen Dream|2010|Dream Pop|Sub Pop|flac|Zebra;Silver Soul;Norway;Walk in the Park;Used to Be;Lover of Mine;Better Times;10 Mile Stereo;Real Love;Take Care
Mitski|Be the Cowboy|2018|Indie Rock|Dead Oceans|flac|Geyser;Why Didn't You Stop Me?;Old Friend;A Pearl;Lonesome Love;Remember My Name;Me and My Husband;Come into the Water;Nobody;Pink in the Night;A Horse Named Cold Air;Washing Machine Heart;Blue Light;Two Slow Dancers
Phoebe Bridgers|Punisher|2020|Indie Rock|Dead Oceans|flac|^DVD Menu;Garden Song;Kyoto;Punisher;Halloween;Chinese Satellite;Moon Song;Savior Complex;ICU;Graceland Too;I Know the End
Japanese Breakfast|Jubilee|2021|Indie Pop|Dead Oceans|flac|Paprika;Be Sweet;Kokomo, IN;Slide Tackle;Posing in Bondage;Savage Good Boy;In Hell;Tactics;Sit;Posing for Cars
Metallica|Master of Puppets|1986|Metal|Elektra|mp3|Battery;~Master of Puppets;The Thing That Should Not Be;Welcome Home (Sanitarium);Disposable Heroes;Leper Messiah;~Orion;Damage, Inc.
Nirvana|Nevermind|1991|Grunge,Rock|DGC|mp3|Smells Like Teen Spirit;In Bloom;Come as You Are;Breed;Lithium;Polly;Territorial Pissings;Drain You;Lounge Act;Stay Away;On a Plain;Something in the Way
The Beatles|Abbey Road|1969|Rock|Apple|flac|Come Together;Something;Maxwell's Silver Hammer;Oh! Darling;Octopus's Garden;~I Want You (She's So Heavy);Here Comes the Sun;Because;You Never Give Me Your Money;Sun King;^Mean Mr. Mustard;^Polythene Pam;She Came In Through the Bathroom Window;^Golden Slumbers;^Carry That Weight;The End;^Her Majesty
Pink Floyd|The Dark Side of the Moon|1973|Progressive Rock|Harvest|flac|^Speak to Me;Breathe (In the Air);On the Run;Time;The Great Gig in the Sky;Money;Us and Them;Any Colour You Like;Brain Damage;Eclipse
Talking Heads|Remain in Light|1980|New Wave,Post-Punk|Sire|flac|Born Under Punches (The Heat Goes On);Crosseyed and Painless;The Great Curve;Once in a Lifetime;Houses in Motion;Seen and Not Seen;Listening Wind;The Overload
Björk|Homogenic|1997|Electronic,Art Pop|One Little Indian|flac|Hunter;Jóga;Unravel;Bachelorette;All Neon Like;5 Years;Immature;Alarm Call;Pluto;All Is Full of Love
Sade|Diamond Life|1984|Soul,Smooth Jazz|Epic|m4a|Smooth Operator;Your Love Is King;Hang On to Your Love;Frankie's First Affair;When Am I Going to Make a Living;Cherry Pie;Sally;I Will Be Your Friend;Why Can't We Be Together
Burial|Untrue|2007|Electronic,UK Garage|Hyperdub|flac|^Untitled;Archangel;Near Dark;Ghost Hardware;Endorphin;Etched Headplate;^In McDonalds;Untrue;Shell of Light;Dog Shelter;Homeless;^UK;Raver
Fiona Apple|Fetch the Bolt Cutters|2020|Art Pop,Singer-Songwriter|Epic|flac|I Want You to Love Me;Shameika;Fetch the Bolt Cutters;Under the Table;Relay;Rack of His;Newspaper;Ladies;Heavy Balloon;Cosmonauts;For Her;Drumset;On I Go
Lauryn Hill|The Miseducation of Lauryn Hill|1998|Hip-Hop,Neo Soul|Ruffhouse|flac|^Intro;Lost Ones;Ex-Factor;To Zion;Doo Wop (That Thing);Superstar;Final Hour;When It Hurts So Bad;I Used to Love Him;Forgive Them Father;Every Ghetto, Every City;Nothing Even Matters;Everything Is Everything;The Miseducation of Lauryn Hill
A Tribe Called Quest|The Low End Theory|1991|Hip-Hop,Jazz Rap|Jive|mp3|Excursions;Buggin' Out;Rap Promoter;Butter;Verses from the Abstract;Show Business;Vibes and Stuff;The Infamous Date Rape;Check the Rhime;Everything Is Fair;Jazz (We've Got);^Skypager;What?;Scenario
Vampire Weekend|Vampire Weekend|2008|Indie Rock|XL Recordings|mp3|Mansard Roof;Oxford Comma;A-Punk;Cape Cod Kwassa Kwassa;M79;Campus;Bryn;One (Blake's Got a New Face);I Stand Corrected;Walcott;The Kids Don't Stand a Chance
Kraftwerk|Trans-Europe Express|1977|Electronic,Krautrock|Kling Klang|flac|~Europe Endless;The Hall of Mirrors;Showroom Dummies;Trans-Europe Express;Metal on Metal;Franz Schubert;^Endless Endless
`;

// Artist bios (original short summaries written for this seed).
export const BIOS = {
    Radiohead:
        'English rock band formed in Abingdon, Oxfordshire in 1985. Over three decades they moved from guitar-driven alternative rock to electronic textures and orchestral arrangements, becoming one of the most influential bands of their era.',
    'Boards of Canada':
        'Scottish electronic duo of brothers Michael Sandison and Marcus Eoin. Known for warm, degraded analogue synths, nostalgic samples of 1970s educational films, and slow hip-hop influenced rhythms.',
    'Daft Punk':
        'French electronic duo Thomas Bangalter and Guy-Manuel de Homem-Christo, formed in Paris in 1993. Pioneers of the French house scene, famous for their robot personas and disco-influenced production.',
    'Miles Davis':
        'American jazz trumpeter, bandleader and composer, among the most influential figures in 20th-century music. He was at the forefront of bebop, cool jazz, hard bop, modal jazz and jazz fusion.',
    'John Coltrane':
        'American jazz saxophonist and composer. Working in bebop and hard bop early in his career, he helped pioneer modal jazz and later the free jazz movement.',
    'Fleetwood Mac':
        'British-American rock band formed in London in 1967. Their 1977 album Rumours is one of the best-selling albums of all time.',
    'Kendrick Lamar':
        'Rapper and songwriter from Compton, California, widely regarded as one of the most skilled lyricists of his generation. First rapper outside classical and jazz to win the Pulitzer Prize for Music.',
    'Frank Ocean':
        'American singer, songwriter and rapper. Known for an idiosyncratic, unconventional approach to R&B and an intensely private public persona.',
    'Bon Iver':
        'American indie folk band founded in 2006 by singer-songwriter Justin Vernon. The debut album was famously recorded in a remote hunting cabin in northwestern Wisconsin.',
    'Sufjan Stevens':
        'American singer-songwriter and multi-instrumentalist from Detroit. His work ranges from sparse acoustic folk to dense orchestral and electronic arrangements.',
    'Massive Attack':
        'English trip hop collective formed in Bristol in 1988. Their dark, cinematic records defined the "Bristol sound" alongside Portishead and Tricky.',
    Portishead:
        'English band formed in Bristol in 1991, named after the nearby coastal town. Combines hip-hop beats, vinyl crackle, film-score samples and Beth Gibbons\' haunting vocals.',
    'Aphex Twin':
        'Richard D. James, Irish-born British electronic musician. Known for idiosyncratic work spanning ambient, acid and drill and bass, and for his influence on IDM.',
    'Brian Eno':
        'English musician, composer and producer, a principal innovator of ambient music. Also known for production work with Talking Heads, U2 and David Bowie.',
    'Joni Mitchell':
        'Canadian-American singer-songwriter and painter. Drawing from folk, pop and jazz, she is regarded as one of the most influential songwriters of the 20th century.',
    'Tame Impala':
        'Psychedelic music project of Australian multi-instrumentalist Kevin Parker, who writes, records, performs and produces the music almost entirely alone.',
    'Beach House':
        'American dream pop duo from Baltimore, Maryland, formed in 2004 by Victoria Legrand and Alex Scally.',
    Mitski:
        'Japanese-American singer-songwriter. Her emotionally raw music moves between indie rock, synth-pop and country-tinged balladry.',
    'Phoebe Bridgers':
        'American singer-songwriter from Pasadena, California. Also a member of boygenius with Julien Baker and Lucy Dacus.',
    'Japanese Breakfast':
        'Indie pop project of Korean-American musician and author Michelle Zauner, author of the memoir Crying in H Mart.',
    'The Beatles':
        'English rock band formed in Liverpool in 1960, comprising John Lennon, Paul McCartney, George Harrison and Ringo Starr. The most influential band in the history of popular music.',
    'Pink Floyd':
        'English rock band formed in London in 1965, known for philosophical lyrics, sonic experimentation and elaborate live shows.',
    'Talking Heads':
        'American new wave band formed in New York City in 1975, fronted by David Byrne. Fused punk, funk, art rock and African polyrhythms.',
    Björk:
        'Icelandic singer, songwriter and producer. Her eclectic catalogue spans electronic, classical, avant-garde and pop.',
    Burial:
        'Anonymous South London producer whose crackling, rain-soaked take on UK garage and 2-step defined a new strand of British electronic music.',
    Kraftwerk:
        'German band formed in Düsseldorf in 1970 by Ralf Hütter and Florian Schneider. Widely considered innovators and pioneers of electronic music.',
};
