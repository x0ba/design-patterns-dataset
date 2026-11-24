// Approved regulatory text for Crunchwell Paprika potato crisps, per language.
// Recipe values are the 2026 recipe (salt 1.3 g / 100 g).

export interface RegText {
  denomination: string;
  ingredientsLabel: string;
  ingredients: string;
  allergen: string;
  nutritionTitle: string;
  nutrition: [string, string][];
  storage: string;
  addressLabel: string;
}

const N = (labels: string[], dec: ',' | '.'): [string, string][] => {
  const vals = ['2195 kJ / 525 kcal', '32 g', '2.9 g', '51 g', '2.6 g', '4.3 g', '6.1 g', '1.3 g'];
  return labels.map((l, i) => [l, dec === ',' ? vals[i].replace(/(\d)\.(\d)/g, '$1,$2') : vals[i]]);
};

export const PAPRIKA_TEXT: Record<string, RegText> = {
  pl: {
    denomination: 'Chipsy ziemniaczane o smaku paprykowym',
    ingredientsLabel: 'Składniki',
    ingredients:
      'ziemniaki, olej słonecznikowy (32%), przyprawa o smaku paprykowym (6%) [cukier, sól, papryka w proszku, cebula w proszku, dekstroza, czosnek w proszku, ekstrakt papryki, aromaty], sól.',
    allergen: 'Produkt może zawierać mleko, gluten i gorczycę.',
    nutritionTitle: 'Wartość odżywcza w 100 g',
    nutrition: N(['Wartość energetyczna', 'Tłuszcz', 'w tym kwasy tłuszczowe nasycone', 'Węglowodany', 'w tym cukry', 'Błonnik', 'Białko', 'Sól'], ','),
    storage: 'Przechowywać w suchym i chłodnym miejscu. Chronić przed światłem słonecznym.',
    addressLabel: 'Wyprodukowano dla:',
  },
  cs: {
    denomination: 'Bramborové lupínky s paprikovou příchutí',
    ingredientsLabel: 'Složení',
    ingredients:
      'brambory, slunečnicový olej (32 %), paprikové koření (6 %) [cukr, sůl, paprika v prášku, cibule v prášku, dextróza, česnek v prášku, paprikový extrakt, aromata], sůl.',
    allergen: 'Může obsahovat mléko, lepek a hořčici.',
    nutritionTitle: 'Výživové údaje ve 100 g',
    nutrition: N(['Energetická hodnota', 'Tuky', 'z toho nasycené mastné kyseliny', 'Sacharidy', 'z toho cukry', 'Vláknina', 'Bílkoviny', 'Sůl'], ','),
    storage: 'Skladujte v suchu a chladu, chraňte před přímým slunečním světlem.',
    addressLabel: 'Vyrobeno pro:',
  },
  sk: {
    denomination: 'Zemiakové lupienky s paprikovou príchuťou',
    ingredientsLabel: 'Zloženie',
    ingredients:
      'zemiaky, slnečnicový olej (32 %), paprikové korenie (6 %) [cukor, soľ, paprika v prášku, cibuľa v prášku, dextróza, cesnak v prášku, paprikový extrakt, arómy], soľ.',
    allergen: 'Môže obsahovať mlieko, lepok a horčicu.',
    nutritionTitle: 'Výživové hodnoty v 100 g',
    nutrition: N(['Energetická hodnota', 'Tuky', 'z toho nasýtené mastné kyseliny', 'Sacharidy', 'z toho cukry', 'Vláknina', 'Bielkoviny', 'Soľ'], ','),
    storage: 'Skladujte v suchu a chlade, chráňte pred priamym slnečným svetlom.',
    addressLabel: 'Vyrobené pre:',
  },
  hu: {
    denomination: 'Paprikás ízesítésű burgonyachips',
    ingredientsLabel: 'Összetevők',
    ingredients:
      'burgonya, napraforgóolaj (32%), paprikás fűszerkeverék (6%) [cukor, só, paprikapor, hagymapor, dextróz, fokhagymapor, paprikakivonat, aromák], só.',
    allergen: 'Tejet, glutént és mustárt tartalmazhat.',
    nutritionTitle: 'Tápérték 100 g termékben',
    nutrition: N(['Energia', 'Zsír', 'amelyből telített zsírsavak', 'Szénhidrát', 'amelyből cukrok', 'Rost', 'Fehérje', 'Só'], ','),
    storage: 'Száraz, hűvös helyen, napfénytől védve tárolandó.',
    addressLabel: 'Forgalmazza:',
  },
  de: {
    denomination: 'Kartoffelchips mit Paprikageschmack',
    ingredientsLabel: 'Zutaten',
    ingredients:
      'Kartoffeln, Sonnenblumenöl (32 %), Paprikagewürzzubereitung (6 %) [Zucker, Salz, Paprikapulver, Zwiebelpulver, Dextrose, Knoblauchpulver, Paprikaextrakt, Aromen], Salz.',
    allergen: 'Kann Milch, Gluten und Senf enthalten.',
    nutritionTitle: 'Nährwerte pro 100 g',
    nutrition: N(['Brennwert', 'Fett', 'davon gesättigte Fettsäuren', 'Kohlenhydrate', 'davon Zucker', 'Ballaststoffe', 'Eiweiß', 'Salz'], ','),
    storage: 'Trocken und kühl lagern. Vor Sonnenlicht schützen.',
    addressLabel: 'Hergestellt für:',
  },
  fr: {
    denomination: 'Chips de pommes de terre saveur paprika',
    ingredientsLabel: 'Ingrédients',
    ingredients:
      'pommes de terre, huile de tournesol (32 %), assaisonnement saveur paprika (6 %) [sucre, sel, paprika en poudre, oignon en poudre, dextrose, ail en poudre, extrait de paprika, arômes], sel.',
    allergen: 'Peut contenir du lait, du gluten et de la moutarde.',
    nutritionTitle: 'Valeurs nutritionnelles pour 100 g',
    nutrition: N(['Énergie', 'Matières grasses', 'dont acides gras saturés', 'Glucides', 'dont sucres', 'Fibres alimentaires', 'Protéines', 'Sel'], ','),
    storage: 'À conserver dans un endroit sec et frais, à l’abri de la lumière.',
    addressLabel: 'Fabriqué pour :',
  },
  it: {
    denomination: 'Patatine al gusto paprika',
    ingredientsLabel: 'Ingredienti',
    ingredients:
      'patate, olio di girasole (32%), condimento al gusto paprika (6%) [zucchero, sale, paprika in polvere, cipolla in polvere, destrosio, aglio in polvere, estratto di paprika, aromi], sale.',
    allergen: 'Può contenere latte, glutine e senape.',
    nutritionTitle: 'Dichiarazione nutrizionale per 100 g',
    nutrition: N(['Energia', 'Grassi', 'di cui acidi grassi saturi', 'Carboidrati', 'di cui zuccheri', 'Fibre', 'Proteine', 'Sale'], ','),
    storage: 'Conservare in luogo fresco e asciutto, al riparo dalla luce.',
    addressLabel: 'Prodotto per:',
  },
  nl: {
    denomination: 'Aardappelchips met paprikasmaak',
    ingredientsLabel: 'Ingrediënten',
    ingredients:
      'aardappelen, zonnebloemolie (32%), paprikakruiden (6%) [suiker, zout, paprikapoeder, uienpoeder, dextrose, knoflookpoeder, paprika-extract, aroma’s], zout.',
    allergen: 'Kan melk, gluten en mosterd bevatten.',
    nutritionTitle: 'Voedingswaarde per 100 g',
    nutrition: N(['Energie', 'Vetten', 'waarvan verzadigde vetzuren', 'Koolhydraten', 'waarvan suikers', 'Voedingsvezel', 'Eiwitten', 'Zout'], ','),
    storage: 'Droog en koel bewaren, buiten direct zonlicht.',
    addressLabel: 'Geproduceerd voor:',
  },
  sv: {
    denomination: 'Potatischips med paprikasmak',
    ingredientsLabel: 'Ingredienser',
    ingredients:
      'potatis, solrosolja (32 %), paprikakryddning (6 %) [socker, salt, paprikapulver, lökpulver, dextros, vitlökspulver, paprikaextrakt, aromer], salt.',
    allergen: 'Kan innehålla mjölk, gluten och senap.',
    nutritionTitle: 'Näringsvärde per 100 g',
    nutrition: N(['Energi', 'Fett', 'varav mättat fett', 'Kolhydrat', 'varav sockerarter', 'Fiber', 'Protein', 'Salt'], ','),
    storage: 'Förvaras torrt och svalt.',
    addressLabel: 'Tillverkad för:',
  },
  fi: {
    denomination: 'Paprikanmakuiset perunalastut',
    ingredientsLabel: 'Ainesosat',
    ingredients:
      'peruna, auringonkukkaöljy (32 %), paprikamausteseos (6 %) [sokeri, suola, paprikajauhe, sipulijauhe, dekstroosi, valkosipulijauhe, paprikauute, aromit], suola.',
    allergen: 'Saattaa sisältää maitoa, gluteenia ja sinappia.',
    nutritionTitle: 'Ravintosisältö / 100 g',
    nutrition: N(['Energia', 'Rasva', 'josta tyydyttynyttä', 'Hiilihydraatit', 'joista sokereita', 'Ravintokuitu', 'Proteiini', 'Suola'], ','),
    storage: 'Säilytä kuivassa ja viileässä.',
    addressLabel: 'Valmistuttaja:',
  },
  da: {
    denomination: 'Kartoffelchips med paprikasmag',
    ingredientsLabel: 'Ingredienser',
    ingredients:
      'kartofler, solsikkeolie (32 %), paprikakrydderi (6 %) [sukker, salt, paprikapulver, løgpulver, dextrose, hvidløgspulver, paprikaekstrakt, aromaer], salt.',
    allergen: 'Kan indeholde mælk, gluten og sennep.',
    nutritionTitle: 'Næringsindhold pr. 100 g',
    nutrition: N(['Energi', 'Fedt', 'heraf mættede fedtsyrer', 'Kulhydrat', 'heraf sukkerarter', 'Kostfibre', 'Protein', 'Salt'], ','),
    storage: 'Opbevares tørt og køligt.',
    addressLabel: 'Produceret for:',
  },
  en: {
    denomination: 'Paprika flavour potato crisps',
    ingredientsLabel: 'Ingredients',
    ingredients:
      'Potatoes, Sunflower Oil (32%), Paprika Flavour Seasoning (6%) [Sugar, Salt, Paprika Powder, Onion Powder, Dextrose, Garlic Powder, Paprika Extract, Flavourings], Salt.',
    allergen: 'May contain milk, gluten and mustard.',
    nutritionTitle: 'Nutrition per 100 g',
    nutrition: N(['Energy', 'Fat', 'of which saturates', 'Carbohydrate', 'of which sugars', 'Fibre', 'Protein', 'Salt'], '.'),
    storage: 'Store in a cool, dry place away from direct sunlight.',
    addressLabel: 'Made for:',
  },
};

export const COUNTRY_ADDRESS: Record<string, string> = {
  pl: 'Northvale Foods Polska Sp. z o.o., ul. Postępu 18, 02-676 Warszawa',
  cz: 'Northvale Foods Czech s.r.o., Na Pankráci 129, 140 00 Praha 4',
  sk: 'Northvale Foods Slovakia s.r.o., Mlynské nivy 49, 821 09 Bratislava',
  hu: 'Northvale Foods Hungary Kft., Váci út 76, 1133 Budapest',
  de: 'Northvale Foods Deutschland GmbH, Am Sandtorkai 50, 20457 Hamburg',
  at: 'Northvale Foods Austria GmbH, Wienerbergstraße 11, 1100 Wien',
  ch: 'Northvale Foods Schweiz AG, Hardturmstrasse 161, 8005 Zürich',
  nl: 'Northvale Foods Nederland B.V., Wilhelminakade 91, 3072 AP Rotterdam',
  be: 'Northvale Foods Belgium NV, Bourgetlaan 42, 1130 Brussel',
  se: 'Northvale Foods Sverige AB, Hammarby allé 47, 120 30 Stockholm',
  fi: 'Northvale Foods Finland Oy, Keilaranta 9, 02150 Espoo',
  dk: 'Northvale Foods Danmark A/S, Havneholmen 25, 1561 København V',
  no: 'Northvale Foods Norge AS, Lysaker torg 35, 1366 Lysaker',
  gb: 'Northvale Foods UK Ltd, 3 Wellington Place, Leeds LS1 4AP',
  ie: 'Northvale Foods Ireland Ltd, 2 Grand Canal Square, Dublin 2',
  fr: 'Northvale Foods France SAS, 12 rue de la Haye, 95700 Roissy-en-France',
  es: 'Northvale Foods Iberia S.L., Calle de Ribera del Loira 28, 28042 Madrid',
  it: 'Northvale Foods Italia S.r.l., Viale Monza 265, 20126 Milano',
  pt: 'Northvale Foods Iberia S.L. – Sucursal em Portugal, Av. D. João II 44, 1990-095 Lisboa',
  gr: 'Northvale Foods Hellas M.A.E., Leof. Kifisias 280, 152 32 Chalandri',
  ro: 'Northvale Foods România S.R.L., Bd. Dimitrie Pompeiu 9-9A, 020335 București',
  bg: 'Northvale Foods Bulgaria EOOD, bul. Tsarigradsko shose 115, 1784 Sofia',
  hr: 'Northvale Foods Hrvatska d.o.o., Radnička cesta 80, 10000 Zagreb',
  lt: 'Northvale Foods Baltics UAB, Konstitucijos pr. 21, LT-08130 Vilnius',
  lv: 'Northvale Foods Baltics UAB filiāle, Skanstes iela 50, LV-1013 Rīga',
  ee: 'Northvale Foods Baltics UAB Eesti filiaal, Lõõtsa 8, 11415 Tallinn',
};

// English masters used for product lines where the local-language block is held as an attached document.
export const CATEGORY_MASTER: Record<string, (flavour: string) => { denomination: string; ingredients: string; allergen: string }> = {
  crisps: (f) => ({
    denomination: `${f} flavour potato crisps`,
    ingredients: `Potatoes, Sunflower Oil (31%), ${f} Flavour Seasoning (6%) [Rice Flour, Salt, Sugar, Natural Flavourings, Yeast Extract, Dextrose], Salt.`,
    allergen: 'May contain milk, gluten and mustard.',
  }),
  chocolate: (f) => ({
    denomination: `Milk chocolate – ${f}`,
    ingredients: `Sugar, Cocoa Butter, Whole Milk Powder, Cocoa Mass, Skimmed Milk Powder, Whey Powder (from Milk), Emulsifier (Sunflower Lecithin), Natural Flavouring. Milk chocolate contains cocoa solids 30% minimum.`,
    allergen: 'May contain nuts, wheat and soya.',
  }),
  sweets: (f) => ({
    denomination: `${f} – boiled sweets`,
    ingredients: `Sugar, Glucose Syrup, Acid (Citric Acid), Flavourings, Colours (Paprika Extract, Spirulina Concentrate, Curcumin).`,
    allergen: 'Excessive consumption may produce laxative effects (sugar-free variants only).',
  }),
  biscuits: (f) => ({
    denomination: `${f}`,
    ingredients: `Wheat Flour (with Calcium, Iron, Niacin, Thiamin), Wholemeal Wheat Flour (22%), Vegetable Oil (Palm, Rapeseed), Sugar, Partially Inverted Sugar Syrup, Raising Agents (Sodium Bicarbonate, Ammonium Bicarbonate), Salt.`,
    allergen: 'May contain milk, soya, sesame and nuts.',
  }),
  popcorn: (f) => ({
    denomination: `${f} popcorn`,
    ingredients: `Popping Corn (78%), Sunflower Oil, Sugar, Sea Salt (0.9%), Natural Flavouring.`,
    allergen: 'Produced in a factory that also handles milk.',
  }),
  wafers: (f) => ({
    denomination: `${f} – filled wafers`,
    ingredients: `Wheat Flour, Sugar, Vegetable Fats (Palm Kernel, Coconut), Hazelnut Paste (8%), Fat-Reduced Cocoa Powder, Whey Powder (Milk), Emulsifier (Soya Lecithin), Raising Agent (Sodium Bicarbonate), Salt, Flavouring.`,
    allergen: 'May contain eggs and other nuts.',
  }),
  pretzels: (f) => ({
    denomination: `Baked pretzels – ${f}`,
    ingredients: `Wheat Flour, Rapeseed Oil, Salt (2.8%), Malted Barley Flour, Yeast, Raising Agent (Sodium Hydroxide).`,
    allergen: 'May contain sesame and milk.',
  }),
  premium: (f) => ({
    denomination: `Fine chocolate – ${f}`,
    ingredients: `Cocoa Mass, Sugar, Cocoa Butter, Emulsifier (Sunflower Lecithin), Natural Vanilla Flavouring. Cocoa solids 72% minimum.`,
    allergen: 'May contain milk, hazelnuts and almonds.',
  }),
  nuts: (f) => ({
    denomination: `${f}`,
    ingredients: `Peanuts (93%), Sunflower Oil, Salt (1.6%).`,
    allergen: 'May contain other nuts and sesame.',
  }),
  gummies: (f) => ({
    denomination: `${f} – fruit gums`,
    ingredients: `Glucose Syrup, Sugar, Gelatine, Dextrose, Fruit Juice from Concentrate (4%), Acid (Citric Acid), Fruit and Plant Concentrates, Flavourings, Glazing Agent (Carnauba Wax).`,
    allergen: 'Free from the 14 major allergens.',
  }),
  corn: (f) => ({
    denomination: `${f} – corn snack`,
    ingredients: `Maize (68%), Sunflower Oil, Seasoning (6%) [Salt, Sugar, Onion Powder, Tomato Powder, Spices, Natural Flavourings].`,
    allergen: 'May contain milk, gluten and celery.',
  }),
  pralines: (f) => ({
    denomination: `${f} – assorted chocolates`,
    ingredients: `Sugar, Cocoa Butter, Whole Milk Powder, Cocoa Mass, Hazelnuts (9%), Glucose Syrup, Butter Oil (Milk), Emulsifier (Soya Lecithin), Natural Vanilla Flavouring.`,
    allergen: 'May contain other nuts, gluten and egg.',
  }),
  shortbread: (f) => ({
    denomination: `${f} – all-butter shortbread`,
    ingredients: `Wheat Flour (with Calcium, Iron, Niacin, Thiamin), Butter (Milk) (32%), Sugar, Rice Flour, Salt.`,
    allergen: 'May contain nuts.',
  }),
  gum: (f) => ({
    denomination: `${f} – sugar-free`,
    ingredients: `Sweeteners (Sorbitol, Maltitol, Xylitol, Aspartame, Acesulfame K), Gum Base, Flavourings, Thickener (Gum Arabic), Glazing Agent (Carnauba Wax), Emulsifier (Soya Lecithin).`,
    allergen: 'Contains a source of phenylalanine. Excessive consumption may produce laxative effects.',
  }),
};
