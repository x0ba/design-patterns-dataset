// Timetable model for the local DB stub: real corridors, real EVA ids,
// minute offsets from the first station of the corridor.
export const S = {
	"Berlin Gesundbrunnen": "8011102", "Berlin Hbf": "8011160", "Berlin Südkreuz": "8011113",
	"Berlin-Spandau": "8010404", "Hamburg Hbf": "8002549", "Hamburg-Harburg": "8000147",
	"Hamburg Dammtor": "8002548", "München Hbf": "8000261", "München-Pasing": "8004158",
	"Frankfurt(Main)Hbf": "8000105", "Frankfurt(M) Flughafen Fernbf": "8070003", "Köln Hbf": "8000207",
	"Hannover Hbf": "8000152", "Leipzig Hbf": "8010205", "Nürnberg Hbf": "8000284",
	"Stuttgart Hbf": "8000096", "Magdeburg Hbf": "8010224", "Oldenburg(Oldb)Hbf": "8000291",
	"Bremen Hbf": "8000050", "Erfurt Hbf": "8010101", "Fulda": "8000115",
	"Kassel-Wilhelmshöhe": "8003200", "Göttingen": "8000128", "Würzburg Hbf": "8000260",
	"Mannheim Hbf": "8000244", "Düsseldorf Hbf": "8000085", "Dortmund Hbf": "8000080",
	"Essen Hbf": "8000098", "Duisburg Hbf": "8000086", "Bielefeld Hbf": "8000036",
	"Hamm(Westf)Hbf": "8000149", "Wolfsburg Hbf": "8006552", "Halle(Saale)Hbf": "8010159",
	"Bamberg": "8000025", "Ingolstadt Hbf": "8000183", "Augsburg Hbf": "8000013",
	"Ulm Hbf": "8000170", "Karlsruhe Hbf": "8000191", "Freiburg(Breisgau) Hbf": "8000107",
	"Dresden Hbf": "8010085", "Bonn Hbf": "8000044", "Koblenz Hbf": "8000206", "Mainz Hbf": "8000240",
	"Siegburg/Bonn": "8005556", "Montabaur": "8000667", "Münster(Westf)Hbf": "8000263",
	"Osnabrück Hbf": "8000294", "Lüneburg": "8000238", "Uelzen": "8000168", "Kiel Hbf": "8000199",
	"Neumünster": "8000271", "Rostock Hbf": "8010304", "Schwerin Hbf": "8010324",
	"Ludwigslust": "8010216", "Braunschweig Hbf": "8000049", "Hildesheim Hbf": "8000169",
	"Stendal Hbf": "8010334", "Brandenburg Hbf": "8010060", "Heidelberg Hbf": "8000156",
	"Darmstadt Hbf": "8000068", "Aachen Hbf": "8000001", "Wuppertal Hbf": "8000266",
	"Hagen Hbf": "8000142", "Erlangen": "8001844", "Regensburg Hbf": "8000309",
	"Passau Hbf": "8000298", "Plattling": "8000301", "Jena Paradies": "8011956", "Gotha": "8010136",
	"Bad Hersfeld": "8000020", "Hanau Hbf": "8000150", "Offenburg": "8000290",
	"Baden-Baden": "8000774", "Leer(Ostfriesl)": "8000225", "Emden Hbf": "8001768",
	"Norddeich Mole": "8007768", "Delmenhorst": "8000070", "Celle": "8000064",
	"Lübeck Hbf": "8000237", "Oberhausen Hbf": "8000286", "Gelsenkirchen Hbf": "8000118",
	"Bochum Hbf": "8000041", "Lutherstadt Wittenberg Hbf": "8010222", "Bitterfeld": "8010050",
	"Riesa": "8010297", "Treuchtlingen": "8000122", "Wiesbaden Hbf": "8000250", "Gießen": "8000124",
	"Herford": "8000162", "Minden(Westf)": "8000252", "Rheine": "8000316",
	"Bremerhaven Hbf": "8000051", "Flensburg": "8000103", "Stralsund Hbf": "8010338",
	"Greifswald": "8010139", "Chemnitz Hbf": "8010184", "Rosenheim": "8000320",
	"Heilbronn Hbf": "8000157", "Coburg": "8001338", "Bad Oldesloe": "8000023",
	"Wittenberge": "8010382", "Elmshorn": "8000092", "Itzehoe": "8003102", "Husum": "8000181",
	"Westerland(Sylt)": "8006369", "Siegen Hbf": "8000046", "Paderborn Hbf": "8000297",
	"Lippstadt": "8000571", "Soest": "8000076", "Saarbrücken Hbf": "8000323",
	"Kaiserslautern Hbf": "8000189",
};

// product: ICE | EC_IC | REGIONAL ; kurz = category shown in the line name
// numbers: train numbers used on the corridor (picked per run)
export const CORRIDORS = {
	// IC Line 56-ish: Magdeburg – Braunschweig – Hannover – Bremen – Oldenburg – Norddeich
	ic_md_ol: { product: "EC_IC", kurz: "IC", numbers: [2036, 2034, 2032, 2038, 2030, 2430], dir: "Norddeich Mole",
		stops: [["Magdeburg Hbf", 0], ["Braunschweig Hbf", 50], ["Hildesheim Hbf", 73], ["Hannover Hbf", 92], ["Bremen Hbf", 160], ["Delmenhorst", 173], ["Oldenburg(Oldb)Hbf", 202], ["Leer(Ostfriesl)", 236], ["Emden Hbf", 256], ["Norddeich Mole", 295]] },
	// ICE Line 25: Hamburg – Hannover – Kassel – Fulda – Würzburg – Nürnberg – Ingolstadt – München
	ice_hh_m: { product: "ICE", kurz: "ICE", numbers: [583, 585, 587, 589, 681, 683, 685, 785, 881], dir: "München Hbf",
		stops: [["Hamburg Hbf", 0], ["Hamburg-Harburg", 12], ["Hannover Hbf", 80], ["Göttingen", 114], ["Kassel-Wilhelmshöhe", 134], ["Fulda", 166], ["Würzburg Hbf", 201], ["Nürnberg Hbf", 258], ["Ingolstadt Hbf", 293], ["München Hbf", 338]] },
	// ICE Line 28/29: Berlin – Leipzig – Erfurt – Nürnberg – München
	ice_b_m: { product: "ICE", kurz: "ICE", numbers: [503, 505, 507, 509, 1001, 1003, 1005, 1007, 1009], dir: "München Hbf",
		stops: [["Berlin Gesundbrunnen", -8], ["Berlin Hbf", 0], ["Berlin Südkreuz", 7], ["Lutherstadt Wittenberg Hbf", 42], ["Leipzig Hbf", 72], ["Erfurt Hbf", 113], ["Bamberg", 168], ["Erlangen", 189], ["Nürnberg Hbf", 205], ["Ingolstadt Hbf", 238], ["München Hbf", 280]] },
	// ICE Line 42: Dortmund – Köln – Frankfurt Flughafen – Mannheim – Stuttgart – München
	ice_do_m: { product: "ICE", kurz: "ICE", numbers: [511, 513, 515, 517, 519, 611, 613, 615], dir: "München Hbf",
		stops: [["Dortmund Hbf", 0], ["Bochum Hbf", 10], ["Essen Hbf", 21], ["Duisburg Hbf", 33], ["Düsseldorf Hbf", 47], ["Köln Hbf", 73], ["Siegburg/Bonn", 92], ["Montabaur", 113], ["Frankfurt(M) Flughafen Fernbf", 137], ["Mannheim Hbf", 168], ["Stuttgart Hbf", 208], ["Ulm Hbf", 265], ["Augsburg Hbf", 307], ["München-Pasing", 330], ["München Hbf", 338]] },
	// IC/ICE Line 31: Hamburg – Bremen – Osnabrück – Münster – Ruhr – Köln
	ic_hh_k: { product: "EC_IC", kurz: "IC", numbers: [2013, 2015, 2017, 2311, 2313, 2027, 2029], dir: "Köln Hbf",
		stops: [["Hamburg Hbf", 0], ["Hamburg-Harburg", 12], ["Bremen Hbf", 56], ["Osnabrück Hbf", 106], ["Münster(Westf)Hbf", 131], ["Gelsenkirchen Hbf", 160], ["Essen Hbf", 173], ["Duisburg Hbf", 186], ["Düsseldorf Hbf", 200], ["Köln Hbf", 226]] },
	// ICE Line 10: Berlin – Wolfsburg – Hannover – Bielefeld – Hamm – Hagen – Wuppertal – Köln
	ice_b_k: { product: "ICE", kurz: "ICE", numbers: [541, 543, 545, 547, 549, 641, 643, 645, 947, 949], dir: "Köln Hbf",
		stops: [["Berlin Hbf", 0], ["Berlin-Spandau", 14], ["Stendal Hbf", 47], ["Wolfsburg Hbf", 67], ["Hannover Hbf", 101], ["Minden(Westf)", 132], ["Herford", 146], ["Bielefeld Hbf", 156], ["Hamm(Westf)Hbf", 187], ["Hagen Hbf", 210], ["Wuppertal Hbf", 226], ["Köln Hbf", 257]] },
	// ICE Line 12: Frankfurt – Fulda – Kassel – Göttingen – Braunschweig – Berlin
	ice_f_b: { product: "ICE", kurz: "ICE", numbers: [872, 874, 876, 878, 1090, 1092, 1094], dir: "Berlin Ostbahnhof",
		stops: [["Frankfurt(Main)Hbf", 0], ["Hanau Hbf", 17], ["Fulda", 56], ["Kassel-Wilhelmshöhe", 88], ["Göttingen", 109], ["Hildesheim Hbf", 141], ["Braunschweig Hbf", 167], ["Wolfsburg Hbf", 186], ["Berlin-Spandau", 240], ["Berlin Hbf", 252]] },
	// ICE Hamburg – Berlin
	ice_hh_b: { product: "ICE", kurz: "ICE", numbers: [1511, 1513, 1515, 1517, 803, 805, 807], dir: "Berlin Südkreuz",
		stops: [["Hamburg Hbf", 0], ["Ludwigslust", 59], ["Wittenberge", 76], ["Berlin-Spandau", 100], ["Berlin Hbf", 111], ["Berlin Südkreuz", 119]] },
	// ICE Line 43: Frankfurt – Mannheim – Karlsruhe – Freiburg
	ice_f_fr: { product: "ICE", kurz: "ICE", numbers: [71, 73, 75, 77, 271, 273, 275, 371], dir: "Basel SBB",
		stops: [["Frankfurt(Main)Hbf", 0], ["Darmstadt Hbf", 17], ["Mannheim Hbf", 38], ["Karlsruhe Hbf", 63], ["Baden-Baden", 79], ["Offenburg", 96], ["Freiburg(Breisgau) Hbf", 128]] },
	// ICE Line 50: Dresden – Leipzig – Erfurt – Fulda – Frankfurt – Wiesbaden
	ice_dd_f: { product: "ICE", kurz: "ICE", numbers: [1551, 1553, 1555, 1557, 1653, 1655, 1657], dir: "Wiesbaden Hbf",
		stops: [["Dresden Hbf", 0], ["Riesa", 31], ["Leipzig Hbf", 68], ["Erfurt Hbf", 112], ["Gotha", 129], ["Bad Hersfeld", 183], ["Fulda", 210], ["Hanau Hbf", 246], ["Frankfurt(Main)Hbf", 263], ["Mainz Hbf", 298], ["Wiesbaden Hbf", 310]] },
	// IC Line 26 north: Hamburg – Lübeck? (IC Hamburg – Stralsund)
	ic_hh_st: { product: "EC_IC", kurz: "IC", numbers: [2212, 2214, 2216, 2072, 2074], dir: "Stralsund Hbf",
		stops: [["Hamburg Hbf", 0], ["Schwerin Hbf", 54], ["Rostock Hbf", 117], ["Stralsund Hbf", 172], ["Greifswald", 192]] },
	// IC Köln – Koblenz – Mainz – Mannheim – Stuttgart (Rheintal)
	ic_k_s: { product: "EC_IC", kurz: "IC", numbers: [2011, 2111, 2113, 2115, 119, 115], dir: "Stuttgart Hbf",
		stops: [["Köln Hbf", 0], ["Bonn Hbf", 20], ["Koblenz Hbf", 55], ["Mainz Hbf", 108], ["Mannheim Hbf", 147], ["Heidelberg Hbf", 160], ["Stuttgart Hbf", 205]] },
	// RE 7 / RE 70 Hamburg – Neumünster – Kiel
	re_hh_ki: { product: "REGIONAL", kurz: "RE", line: "RE7", numbers: [21022, 21024, 21026, 21028, 21030], dir: "Kiel Hbf",
		stops: [["Hamburg Hbf", 0], ["Hamburg Dammtor", 4], ["Elmshorn", 27], ["Neumünster", 55], ["Kiel Hbf", 80]] },
	// RE 1 Magdeburg – Brandenburg – Berlin
	re_md_b: { product: "REGIONAL", kurz: "RE", line: "RE1", numbers: [3105, 3107, 3109, 3111, 3113], dir: "Frankfurt(Oder)",
		stops: [["Magdeburg Hbf", 0], ["Brandenburg Hbf", 54], ["Berlin Hbf", 105], ["Berlin Gesundbrunnen", 112]] },
	// RE 3 Hamburg – Lüneburg – Uelzen
	re_hh_ue: { product: "REGIONAL", kurz: "RE", line: "RE3", numbers: [4309, 4311, 4313, 4315], dir: "Uelzen",
		stops: [["Hamburg Hbf", 0], ["Hamburg-Harburg", 11], ["Lüneburg", 31], ["Uelzen", 56]] },
	// metronom/RE Uelzen – Celle – Hannover
	re_ue_h: { product: "REGIONAL", kurz: "RE", line: "RE2", numbers: [82111, 82113, 82115, 82117], dir: "Göttingen",
		stops: [["Uelzen", 0], ["Celle", 38], ["Hannover Hbf", 63]] },
	// IC Hamburg – Westerland
	ic_hh_sy: { product: "EC_IC", kurz: "IC", numbers: [2310, 2314, 2072, 2170], dir: "Westerland(Sylt)",
		stops: [["Hamburg Hbf", 0], ["Elmshorn", 25], ["Itzehoe", 47], ["Husum", 104], ["Westerland(Sylt)", 166]] },
	// ICE Line 41: Essen – Duisburg – Köln – Frankfurt – Würzburg – Nürnberg
	ice_e_n: { product: "ICE", kurz: "ICE", numbers: [521, 523, 525, 527, 529, 621, 623, 625], dir: "München Hbf",
		stops: [["Essen Hbf", 0], ["Duisburg Hbf", 12], ["Düsseldorf Hbf", 26], ["Köln Hbf", 50], ["Siegburg/Bonn", 68], ["Frankfurt(M) Flughafen Fernbf", 111], ["Frankfurt(Main)Hbf", 124], ["Hanau Hbf", 141], ["Aschaffenburg Hbf", 158], ["Würzburg Hbf", 196], ["Nürnberg Hbf", 251]] },
};
// Aschaffenburg isn't in S yet
S["Aschaffenburg Hbf"] = "8000010";

// Saved bahn.de "Verbindung teilen" links — what an established user has pasted over time.
// legs: [corridor, from, to, departure "HH:MM", minTransfer?]
const T = (vbid, date, legs, opts = {}) => ({ vbid, date, legs, ...opts });
export const TRIPS = [
	T("7847e36d-f342-4f21-9ed3-6b41f0a5d0df", "2026-12-02", [["ic_md_ol", "Magdeburg Hbf", "Oldenburg(Oldb)Hbf", "15:01"]]),
	T("a3c1f0e2-5b7d-4e8a-9c21-1f0b6d2e7a44", "2026-11-28", [["ice_hh_m", "Hamburg Hbf", "München Hbf", "08:01"]]),
	T("0d9e2b71-4c6a-4f3e-8b55-2e7c9a1d3f60", "2026-12-19", [["ice_b_m", "Berlin Hbf", "München Hbf", "06:29"]]),
	T("5f2a8c94-1e3b-47d6-a0f8-93c4e2b1d7a5", "2026-12-05", [["ice_do_m", "Köln Hbf", "Stuttgart Hbf", "10:55"]]),
	T("c81b4e07-9a2d-4b6f-8e13-7d5a0c9f2b36", "2026-11-21", [["ic_hh_k", "Hamburg Hbf", "Köln Hbf", "12:46"]]),
	T("e4d7a1c3-2f9b-4a8e-b6c0-5e1f3d7a9c82", "2026-12-12", [["ice_b_k", "Berlin Hbf", "Köln Hbf", "07:49"]]),
	T("19b6f3d2-8c4e-4e71-a5d9-0b2c7f6e4a13", "2026-12-23", [["ice_f_b", "Frankfurt(Main)Hbf", "Berlin Hbf", "16:13"]]),
	T("6a0e5c8b-3d1f-4c92-b7a4-e8f2d0c6b591", "2026-11-20", [["ice_hh_b", "Hamburg Hbf", "Berlin Hbf", "17:24"]]),
	T("b2f9d4e6-7a3c-4185-9e0b-c6d1a8f3e2b7", "2027-01-09", [["ice_f_fr", "Frankfurt(Main)Hbf", "Freiburg(Breisgau) Hbf", "09:50"]]),
	T("d7c3a9e1-5b2f-4d68-8a1c-f4e0b9d2c6a8", "2026-12-04", [["ice_dd_f", "Dresden Hbf", "Frankfurt(Main)Hbf", "11:08"]]),
	T("3e8b1f5a-c9d7-42a6-b0e4-7f2c5a9d1e63", "2026-12-18", [["ic_hh_st", "Hamburg Hbf", "Rostock Hbf", "13:28"]]),
	T("f0a6c2d9-4e8b-4b17-a3f5-2d9e7c1b8a40", "2026-11-29", [["ic_k_s", "Köln Hbf", "Mannheim Hbf", "08:53"]]),
	T("8c5e2a7f-1b4d-49e3-a6c8-d0f3b7e2a915", "2027-01-16", [["ice_e_n", "Düsseldorf Hbf", "Nürnberg Hbf", "07:34"]]),
	T("2b7d9f1c-6e3a-4c85-b2d0-a9f4e1c7b368", "2026-12-21", [["ice_hh_m", "Hannover Hbf", "Würzburg Hbf", "14:21"]]),
	T("9f4c1e8a-2d6b-47a0-8c35-b1e9f7d2a4c6", "2026-12-06", [["ice_b_m", "Leipzig Hbf", "Nürnberg Hbf", "13:39"], ]),
	// trips with a change of trains
	T("4a1d7e3b-8f2c-4e96-a5b1-c3e8d0f6a279", "2026-12-11", [["ice_hh_m", "Hamburg Hbf", "Fulda", "09:01"], ["ice_dd_f", "Fulda", "Frankfurt(Main)Hbf", null, 9]]),
	T("e6b3c0f8-1a7d-4d25-9b4e-f2a6c8d1e037", "2026-12-14", [["ice_b_k", "Berlin Hbf", "Hannover Hbf", "10:49"], ["ic_md_ol", "Hannover Hbf", "Oldenburg(Oldb)Hbf", null, 11]]),
	T("71c8e4a2-9d3f-4b60-a7e5-0c2b9f4d8e16", "2027-01-03", [["ice_hh_b", "Hamburg Hbf", "Berlin Hbf", "06:24"], ["ice_b_m", "Berlin Hbf", "Leipzig Hbf", null, 12]]),
	T("ad5f0b9c-3e7a-4182-b6d4-9e1c7a3f5b02", "2026-12-08", [["ice_do_m", "Dortmund Hbf", "Mannheim Hbf", "06:37"], ["ice_f_fr", "Mannheim Hbf", "Freiburg(Breisgau) Hbf", null, 8]]),
	T("5c2e8f6d-0b4a-49d7-a1e3-6f9b2d5c8a74", "2026-11-27", [["re_hh_ue", "Hamburg Hbf", "Uelzen", "07:16"], ["re_ue_h", "Uelzen", "Hannover Hbf", null, 7]], { regionalOnly: true }),
	T("0e9a3d7c-5f1b-4c84-a2e6-b8d4f0c3a951", "2026-12-20", [["re_hh_ki", "Hamburg Hbf", "Kiel Hbf", "10:08"]], { regionalOnly: true }),
	T("8b4f2c6e-7d0a-4e39-b5c1-a3e7d9f2b680", "2026-12-27", [["ic_hh_sy", "Hamburg Hbf", "Westerland(Sylt)", "08:42"]]),
	T("c3d0e7b5-2a9f-4f61-8b4d-e5a1c6f9d237", "2026-11-23", [["ice_dd_f", "Leipzig Hbf", "Frankfurt(Main)Hbf", "16:19"]]),
	T("f7a2b8d4-6c1e-4a53-9d0f-b2e6c4a8f195", "2027-01-23", [["ice_e_n", "Köln Hbf", "Würzburg Hbf", "15:20"]]),
	T("1d6c9a3f-4b8e-4f27-a0c5-d7e3b1f9c642", "2026-12-17", [["ice_f_b", "Göttingen", "Berlin Hbf", "19:39"]]),
	T("6e3f0a9b-8c2d-47e5-b1a4-f9c7d3e0b852", "2026-11-18", [["ic_hh_k", "Bremen Hbf", "Düsseldorf Hbf", "06:12"]]),
	T("a9c4e2f7-3b0d-4e18-86a5-c2f0d8b4e731", "2026-12-01", [["ice_do_m", "Frankfurt(M) Flughafen Fernbf", "München Hbf", "18:23"]]),
	T("27e0b5c9-d4a1-4f83-9c6e-a1b7f3d0e5c8", "2026-12-24", [["ice_b_k", "Hannover Hbf", "Köln Hbf", "11:30"]]),
	T("bd18f6a3-0e5c-4b92-a7d1-e6c3f0a9b475", "2027-01-30", [["ice_hh_m", "Hamburg Hbf", "Nürnberg Hbf", "16:01"]]),
	T("4f9b2e0d-7a6c-41d3-b8e5-c0a4f2d9e163", "2026-12-15", [["ic_k_s", "Bonn Hbf", "Stuttgart Hbf", "13:13"]]),
];
