// Generates .ui-capture/stub/db.json — realistic podkrepi.bg-style data for the local stub API.
// Deterministic (seeded PRNG) so re-running yields the same records.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

let seed = 20261117
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const pick = (a) => a[Math.floor(rnd() * a.length)]
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1))
const chance = (p) => rnd() < p
const uuid = () => {
  const h = [...Array(32)].map(() => Math.floor(rnd() * 16).toString(16)).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}
const NOW = new Date('2026-11-17T10:30:00Z').getTime()
const DAY = 86400000
const iso = (t) => new Date(t).toISOString()
const daysAgo = (d, jitterH = 0) => NOW - d * DAY - Math.floor(rnd() * jitterH * 3600000)
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[абвгдежзийклмнопрстуфхцчшщъьюя]/g, (c) =>
      ({ а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya' })[c],
    )
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// ---------------------------------------------------------------- people
const maleFirst = ['Георги', 'Иван', 'Димитър', 'Николай', 'Петър', 'Христо', 'Стоян', 'Тодор', 'Александър', 'Калоян', 'Мартин', 'Васил', 'Йордан', 'Стефан', 'Кирил', 'Пламен', 'Борислав', 'Емил', 'Радослав', 'Виктор', 'Любомир', 'Атанас', 'Владимир', 'Красимир', 'Симеон']
const femaleFirst = ['Мария', 'Елена', 'Иванка', 'Десислава', 'Гергана', 'Надежда', 'Цветелина', 'Радостина', 'Петя', 'Виктория', 'Яна', 'Теодора', 'Силвия', 'Даниела', 'Милена', 'Росица', 'Божидара', 'Анелия', 'Кристина', 'Валентина', 'Нели', 'Светла', 'Катерина', 'Ралица', 'Зорница']
const lastStems = ['Иванов', 'Петров', 'Георгиев', 'Димитров', 'Николов', 'Стоянов', 'Тодоров', 'Христов', 'Костов', 'Попов', 'Маринов', 'Ангелов', 'Колев', 'Илиев', 'Атанасов', 'Василев', 'Йорданов', 'Минчев', 'Цветков', 'Райков', 'Захариев', 'Пенчев', 'Делчев', 'Балабанов', 'Кацаров', 'Шопов', 'Енчев', 'Трифонов']
const translit = (s) => slugify(s).replace(/-/g, '')
const persons = []
function makePerson(first, last, opts = {}) {
  const email =
    opts.email ||
    `${translit(first)}.${translit(last)}${chance(0.3) ? int(1, 99) : ''}@${pick(['abv.bg', 'gmail.com', 'gmail.com', 'mail.bg', 'yahoo.com', 'dir.bg'])}`
  const p = {
    id: uuid(),
    firstName: first,
    lastName: last,
    email,
    phone: `+359 8${pick(['7', '8', '9'])} ${int(100, 999)} ${int(1000, 9999)}`,
    address: opts.address || `${pick(['София', 'Пловдив', 'Варна', 'Бургас', 'Русе', 'Стара Загора', 'Велико Търново', 'Шумен', 'Благоевград'])}, ${pick(['ул.', 'бул.', 'ж.к.'])} ${pick(['Витоша', 'Цар Борис III', 'Г. С. Раковски', 'Младост 2', 'Люлин 5', 'Христо Ботев', 'Шипка', 'Славянска', 'Освобождение'])} ${int(1, 140)}`,
    createdAt: iso(opts.createdAt || daysAgo(int(30, 1400), 24)),
    updatedAt: null,
    newsletter: chance(0.55),
    emailConfirmed: chance(0.85),
    profileEnabled: true,
    keycloakId: uuid(),
    birthday: chance(0.4) ? iso(Date.UTC(int(1955, 2002), int(0, 11), int(1, 28))) : null,
    personalNumber: null,
    stripeCustomerId: chance(0.5) ? `cus_${crypto.createHash('md5').update(first + last + rnd()).digest('hex').slice(0, 14)}` : null,
    picture: null,
    helpUsImproveGdpr: chance(0.4),
    companyId: null,
    company: null,
    ...opts.extra,
  }
  persons.push(p)
  return p
}
function randomPerson() {
  const male = chance(0.48)
  const first = male ? pick(maleFirst) : pick(femaleFirst)
  const stem = pick(lastStems)
  return makePerson(first, male ? stem : stem + 'а')
}

// The signed-in, established user
const me = makePerson('Десислава', 'Маринова', {
  email: 'desislava.marinova@abv.bg',
  createdAt: Date.UTC(2023, 2, 14, 9, 12),
  address: 'София, ж.к. Лозенец, ул. Златовръх 34',
  extra: { newsletter: true, emailConfirmed: true, phone: '+359 88 742 1956', birthday: '1987-06-21T00:00:00.000Z', helpUsImproveGdpr: true },
})
for (let i = 0; i < 160; i++) randomPerson()

const companyNames = [
  ['Телерик Академия ЕООД', '200567321'],
  ['Сирма Груп Холдинг АД', '040529004'],
  ['Пекарна „Добруджанско зърно“ ООД', '204812773'],
  ['Аптеки Ремедиум ЕООД', '175244938'],
  ['Еконт Експрес ООД', '202775432'],
  ['Строителна компания „Мизия 2010“ ЕООД', '201457893'],
  ['Фондация „Бъдеще за децата“', '177302455'],
  ['Сдружение „Зелени Родопи“', '120654733'],
  ['Озеленяване Дриада ООД', '206331984'],
  ['ИТ Солюшънс Бургас ЕООД', '102994617'],
]
const companies = companyNames.map(([companyName, companyNumber], i) => ({
  id: uuid(),
  companyName,
  companyNumber,
  legalPersonName: `${pick(maleFirst.concat(femaleFirst))} ${pick(lastStems)}`,
  countryCode: 'BG',
  cityId: null,
  createdAt: iso(daysAgo(int(200, 1300))),
  updatedAt: null,
}))

// ---------------------------------------------------------------- reference data
const countries = [
  { id: uuid(), name: 'България', countryCode: 'BG' },
  { id: uuid(), name: 'Гърция', countryCode: 'GR' },
  { id: uuid(), name: 'Германия', countryCode: 'DE' },
  { id: uuid(), name: 'Великобритания', countryCode: 'GB' },
  { id: uuid(), name: 'Румъния', countryCode: 'RO' },
]
const cityNames = [
  ['София', '1000'], ['Пловдив', '4000'], ['Варна', '9000'], ['Бургас', '8000'], ['Русе', '7000'], ['Стара Загора', '6000'], ['Плевен', '5800'], ['Велико Търново', '5000'], ['Благоевград', '2700'], ['Шумен', '9700'], ['Габрово', '5300'], ['Смолян', '4700'], ['Кърджали', '6600'], ['Видин', '3700'], ['Монтана', '3400'], ['Хасково', '6300'], ['Ямбол', '8600'], ['Сливен', '8800'], ['Добрич', '9300'], ['Пазарджик', '4400'], ['Перник', '2300'], ['Ловеч', '5500'], ['Враца', '3000'], ['Самоков', '2000'], ['Банско', '2770'],
]
const cities = cityNames.map(([name, postalCode]) => ({ id: uuid(), name, postalCode, countryId: countries[0].id }))
const cityByName = Object.fromEntries(cities.map((c) => [c.name, c]))

const typeDefs = [
  ['Лечение и рехабилитация', 'medical', 'Събиране на средства за операции, терапии, медикаменти и рехабилитация.'],
  ['Редки заболявания', 'medical', 'Подкрепа за деца и възрастни с редки и генетични заболявания.'],
  ['Медицинска апаратура', 'medical', 'Закупуване на апаратура за болници и здравни заведения.'],
  ['Социална подкрепа', 'charity', 'Помощ за самотни възрастни, семейства в нужда и хора в риск.'],
  ['Деца в риск', 'charity', 'Подкрепа за деца, отглеждани в институции или приемни семейства.'],
  ['Бедствия и аварии', 'disasters', 'Спешна помощ при наводнения, пожари и земетресения.'],
  ['Образование и наука', 'education', 'Стипендии, учебни материали и образователни програми.'],
  ['Културни събития', 'events', 'Фестивали, концерти и обществени инициативи.'],
  ['Опазване на околната среда', 'environment', 'Почистване, залесяване и защита на природата.'],
  ['Спорт', 'sport', 'Подкрепа за спортисти, клубове и спортни бази.'],
  ['Изкуство и култура', 'art', 'Реставрация, изложби и подкрепа за творци.'],
  ['Защита на животните', 'animals', 'Приюти, кастрации и лечение на бездомни животни.'],
  ['Природни паркове', 'nature', 'Поддръжка на екопътеки и защитени територии.'],
  ['Граждански инициативи', 'others', 'Местни каузи, родени от общността.'],
]
const campaignTypes = typeDefs.map(([name, category, description]) => ({ id: uuid(), name, slug: slugify(name), category, description, parentId: null }))
const typeByName = Object.fromEntries(campaignTypes.map((t) => [t.name, t]))

// ---------------------------------------------------------------- campaigns
// [title, type, city, target EUR, state, ageDays, fillRatio, essence, story]
const C = [
  ['Операция на сърцето за 4-годишния Мартин', 'Лечение и рехабилитация', 'Плевен', 38000, 'active', 46, 0.71, 'Мартин е роден със сложен вроден сърдечен порок и се нуждае от операция в клиника в Истанбул.', 'Мартин е на 4 години и обожава динозаври. Още при раждането му лекарите откриват тетралогия на Фало. Първата корекция е направена в София, но сега кардиохирурзите препоръчват повторна интервенция, която у нас не се извършва. Клиниката в Истанбул е изпратила оферта за 38 000 евро, включваща операцията, престоя в интензивно отделение и контролните прегледи.'],
  ['Слухови апарати за Ния', 'Редки заболявания', 'София', 6400, 'active', 21, 0.44, 'Ния е на 7 години и има двустранна невросензорна загуба на слуха.', 'Касата покрива само базов модел слухови апарати, който не позволява на Ния да следи урока в шумна класна стая. Родителите ѝ събират средства за цифрови апарати с FM система, препоръчани от аудиолога в Александровска болница.'],
  ['Рехабилитация за Иван след инсулт', 'Лечение и рехабилитация', 'Бургас', 12500, 'active', 74, 0.88, 'Иван е на 52 години, баща на три деца, и учи отново да ходи след тежък инсулт.', 'След инсулта през пролетта Иван е с дясностранна парализа. Специализираният рехабилитационен център в Банкя е предложил 4-месечна интензивна програма. Семейството вече е изразходвало спестяванията си за болничното лечение.'],
  ['Нов неонатален кувьоз за МБАЛ – Видин', 'Медицинска апаратура', 'Видин', 24000, 'active', 98, 0.62, 'Отделението по неонатология във Видин работи с апаратура на повече от 20 години.', 'Всяка година в болницата се раждат около 450 бебета. Двата кувьоза в отделението са от 2003 г. и често дават грешки. С нов транспортен кувьоз с дихателна поддръжка недоносените бебета ще могат безопасно да бъдат прехвърляни до Плевен или София.'],
  ['Топъл обяд за самотни възрастни в Родопите', 'Социална подкрепа', 'Смолян', 9000, 'active', 160, 0.93, 'Доставяме топъл обяд всеки делничен ден на 60 възрастни хора в 11 родопски села.', 'В малките села около Смолян няма магазини, а най-близкият лекар е на 30 км. Доброволците ни разнасят храна, лекарства и дърва за огрев. Със средствата ще покрием горивото и продуктите за следващата зима.'],
  ['Лятно училище за деца от приемни семейства', 'Деца в риск', 'Велико Търново', 7200, 'active', 33, 0.28, 'Двуседмичен лагер с уроци по програмиране, изкуство и приключения в Балкана.', 'Приемните родители от област Велико Търново ни разказаха, че децата рядко имат шанс да прекарат лятото извън града. Тази година искаме да поканим 40 деца на лагер край Трявна с ментори доброволци.'],
  ['Възстановяване след наводнението в Царево', 'Бедствия и аварии', 'Бургас', 50000, 'complete', 410, 1.07, 'Помощ за семействата, чиито домове бяха наводнени през септември.', 'Пороите отнесоха мостове, коли и покъщнина. Със събраните средства закупихме сушилни, перални, мебели и строителни материали за 63 домакинства и платихме ремонта на детската градина в квартал Василико.'],
  ['Пожарът в Свиленград – помощ за пострадалите', 'Бедствия и аварии', 'Хасково', 30000, 'complete', 520, 1.12, 'Горските пожари унищожиха 14 къщи в селата около Свиленград.', 'Кампанията събра средства за временни жилища, храна и възстановяване на покривите на засегнатите къщи. Отчетите за всеки разход са публикувани в раздел Новини.'],
  ['Стипендии за талантливи ученици от Северозапада', 'Образование и наука', 'Монтана', 15000, 'active', 120, 0.51, '20 годишни стипендии за ученици с отличен успех от семейства с ниски доходи.', 'Северозападна България е най-бедният регион в ЕС. Нашите стипендианти печелят олимпиади по математика и информатика, но често напускат училище, за да работят. Стипендията от 750 евро годишно им позволява да останат в класната стая.'],
  ['Лаптопи за училището в с. Ябълково', 'Образование и наука', 'Хасково', 4800, 'active', 12, 0.19, 'Компютърният кабинет в селото има 6 компютъра за 140 ученици.', 'Учителите в ОУ „Христо Ботев“ искат да въведат часове по програмиране от пети клас. С 16 рециклирани лаптопа от фирми партньори и малко средства за ремонт ще оборудваме цял кабинет.'],
  ['Фестивал „Сцена на село“ 2026', 'Културни събития', 'Габрово', 8500, 'complete', 230, 1.0, 'Театрални представления в 12 села на Габровския Балкан през лятото.', 'Вече трета година млади актьори обикалят селата с пиеси за деца и възрастни. Тази година фестивалът събра над 2 000 зрители.'],
  ['Залесяване на Витоша след корояда', 'Опазване на околната среда', 'София', 18000, 'active', 190, 0.67, 'Засаждаме 25 000 фиданки бял и черен бор на опожарените и изсъхнали склонове.', 'Короядът унищожи хиляди декари смърчови гори над Бояна и Княжево. Заедно с Природен парк „Витоша“ организираме доброволчески акции всяка пролет и есен. Една фиданка с посадка и отглеждане струва 0,72 евро.'],
  ['Почистване на плажовете около Шабла', 'Опазване на околната среда', 'Добрич', 3500, 'active', 58, 0.82, 'Месечни акции по почистване на 14 км плаж и закупуване на контейнери за разделно събиране.', 'Средствата ще покрият чували, ръкавици, транспорт за отпадъците и 10 контейнера за разделно събиране на ключови места.'],
  ['Нова изкуствена настилка за ФК „Балкан“ Ботевград', 'Спорт', 'София', 26000, 'partially_financed', 300, 0.58, 'Детско-юношеската школа тренира на кален терен без осветление.', 'В школата тренират 180 деца от Ботевград и околните села. Общината осигурява 40% от средствата, а останалите събираме тук.'],
  ['Инвалидна количка за баскетболистката Анелия', 'Спорт', 'Пловдив', 5600, 'complete', 340, 1.03, 'Анелия е член на националния отбор по баскетбол на колички и се нуждае от спортна количка.', 'Анелия губи краката си при катастрофа на 19 години. Днес тя е капитан на отбора на Пловдив. Новата количка е изработена по мярка в Германия.'],
  ['Реставрация на стенописите в църквата „Св. Никола“ – Арбанаси', 'Изкуство и култура', 'Велико Търново', 42000, 'active', 410, 0.34, 'Стенописите от XVII век са застрашени от влага и пукнатини.', 'Екип реставратори от Националната художествена академия ще работи два сезона по укрепването на мазилката и почистването на изображенията.'],
  ['Кастрация на 300 бездомни котки в Пловдив', 'Защита на животните', 'Пловдив', 9600, 'active', 88, 0.75, 'Програма за хуманно овладяване на популацията на бездомните котки в кварталите Тракия и Кючук Париж.', 'Работим с три ветеринарни клиники, които ни дават преференциална цена от 32 евро за кастрация. Всяко животно е обезпаразитено, ваксинирано и маркирано.'],
  ['Нов заслон за приюта „Шанс за живот“', 'Защита на животните', 'Шумен', 14000, 'active', 140, 0.47, 'Приютът се грижи за 120 кучета, но заграждението не издържа на зимата.', 'Миналата зима покривът на най-голямото заграждение пропадна под снега. Новият заслон е с изолирани боксове и отоплена карантинна зона.'],
  ['Екопътека „Белоградчишките скали“', 'Природни паркове', 'Видин', 11000, 'paused', 260, 0.39, 'Обновяване на маркировката, мостчетата и информационните табели.', 'Кампанията е на пауза до получаване на разрешение от РИОСВ – Монтана. Всички дарени средства са запазени във фонда на кампанията.'],
  ['Детска площадка в кв. Възраждане, Варна', 'Граждански инициативи', 'Варна', 16500, 'active', 70, 0.56, 'Съседите от квартала обединиха усилия за безопасна площадка за 400 деца.', 'Старата площадка беше демонтирана преди 3 години и никога не беше възстановена. Проектът е одобрен от района, а фирма партньор ще монтира съоръженията без надценка.'],
  ['Лечение на Калина с левкемия', 'Лечение и рехабилитация', 'Русе', 65000, 'active', 37, 0.52, 'Калина е на 11 години и има нужда от трансплантация на костен мозък.', 'Донор е намерен в регистъра в Германия. Трансплантацията ще бъде извършена в университетската болница в Тюбинген. Здравната каса покрива част от разходите, но остават 65 000 евро за престоя и следтрансплантационното лечение.'],
  ['Протези за Стефан', 'Лечение и рехабилитация', 'Стара Загора', 22000, 'complete', 600, 1.01, 'Стефан загуби двата си крака при трудова злополука.', 'С общите ни усилия Стефан получи бионични протези и днес отново работи като механик.'],
  ['Психологическа подкрепа за деца, загубили родител', 'Деца в риск', 'София', 12000, 'active', 205, 0.61, 'Безплатни терапевтични групи и индивидуални консултации за деца и тийнейджъри.', 'Работим с екип от детски психолози и арт терапевти. Една сесия струва 40 евро, а една група от 10 срещи – 1 200 евро.'],
  ['Дърва за огрев за 100 семейства в Северозапада', 'Социална подкрепа', 'Враца', 8000, 'complete', 380, 1.0, 'Доставихме по 5 кубика дърва на семейства с малки деца и самотни възрастни.', 'Кампанията беше реализирана с помощта на кметствата и местните читалища.'],
  ['Подвижна стоматологична клиника', 'Медицинска апаратура', 'Кърджали', 46000, 'active', 280, 0.29, 'Оборудван бус, който ще обслужва деца в 40 села без зъболекар.', 'В планинските села на Кърджалийско над 60% от децата никога не са били на зъболекар. Мобилната клиника ще бъде управлявана от Българския зъболекарски съюз.'],
  ['Музикални инструменти за читалище „Светлина“', 'Изкуство и култура', 'Ямбол', 3200, 'complete', 450, 1.08, 'Нови тъпани, гайди и кавали за детския фолклорен ансамбъл.', 'Ансамбълът спечели първа награда на фестивала в Копривщица с новите инструменти.'],
  ['Помощ за семейството на загиналия пожарникар Атанас', 'Социална подкрепа', 'Пазарджик', 20000, 'complete', 150, 1.21, 'Атанас загина при гасенето на пожар в склад. Остави съпруга и две деца.', 'Благодарим на всички 1 400 дарители. Средствата са преведени по сметка на семейството, а отчетът е публикуван.'],
  ['Лечение на Борис в Барселона', 'Редки заболявания', 'Сливен', 80000, 'suspended', 190, 0.12, 'Кампанията е временно спряна по искане на семейството.', 'Семейството получи финансиране от Фонда за лечение на деца и кампанията е спряна. Ще уведомим всички дарители за следващите стъпки.'],
  ['Ремонт на покрива на детската градина в Банско', 'Граждански инициативи', 'Банско', 9500, 'active', 25, 0.15, 'Покривът тече над две от групите и децата са преместени в коридора.', 'Родителите поеха инициативата и вече имат три оферти. Ремонтът трябва да приключи преди първия сняг.'],
  ['Инсулинови помпи за деца с диабет тип 1', 'Медицинска апаратура', 'София', 30000, 'active', 110, 0.68, 'Помпите със сензор подобряват значително живота на децата и техните родители.', 'Заедно с Асоциацията на родителите на деца с диабет ще осигурим 10 помпи за деца, чиито семейства не могат да покрият доплащането.'],
  ['Подслон за жертви на домашно насилие', 'Социална подкрепа', 'Перник', 25000, 'active', 52, 0.38, 'Кризисен център с 8 места за майки с деца.', 'Центърът ще предлага настаняване до 6 месеца, правна помощ и психологическа подкрепа.'],
  ['Робототехника за всички – кръжоци в 10 града', 'Образование и наука', 'Ловеч', 13000, 'active', 15, 0.09, 'Комплекти LEGO Spike и обучени ментори за безплатни кръжоци.', 'Целим да достигнем до 300 деца от малки населени места, в които няма частни школи.'],
  ['Възстановяване на мозайката в Пловдивския Епископски комплекс', 'Изкуство и култура', 'Пловдив', 35000, 'draft', 6, 0, 'Кампания в процес на одобрение.', 'Документите са подадени за проверка от екипа на Подкрепи.бг.'],
  ['Ортопедични обувки за деца с ДЦП', 'Редки заболявания', 'Благоевград', 4200, 'draft', 3, 0, 'Кампания в процес на одобрение.', 'Очакваме медицинската документация от лекуващия ортопед.'],
  ['Мотивационен лагер за младежи от домове', 'Деца в риск', 'Самоков', 6000, 'blocked', 95, 0.21, 'Кампанията е блокирана до изясняване на документите на организатора.', 'Подадени са сигнали за нередност. Екипът на Подкрепи.бг проверява документите.'],
  ['Ремонт на спортната зала в Гоце Делчев', 'Спорт', 'Благоевград', 19000, 'active', 180, 0.74, 'Залата е затворена от 2 години заради опасен покрив.', 'В залата тренират 6 клуба. Общината е осигурила проекта, а ние събираме за покрива и подовата настилка.'],
  ['Хранителни пакети за украински бежанци във Варна', 'Социална подкрепа', 'Варна', 12000, 'complete', 900, 1.04, 'Месечни пакети с храна и хигиенни продукти за 200 семейства.', 'Кампанията приключи успешно. Благодарим на всички, които подкрепиха семействата през първата зима.'],
  ['Подкрепи.бг – поддръжка на платформата', 'Граждански инициативи', 'София', 60000, 'active', 700, 0.55, 'Подкрепете работата на доброволците, които поддържат платформата без комисиона.', 'Подкрепи.бг не взема комисиона от даренията. Средствата покриват хостинг, правна помощ, счетоводство и сигурност на платформата.'],
]

const coordPeople = persons.slice(1, 9)
const coordinators = coordPeople.map((p) => ({ id: uuid(), personId: p.id, person: p, createdAt: p.createdAt }))
const organizerPeople = [me, ...persons.slice(9, 18)]
const organizers = organizerPeople.map((p) => ({ id: uuid(), personId: p.id, person: p, createdAt: p.createdAt }))
const beneficiaries = []
const vaults = []
const campaignFiles = []
const campaigns = []

C.forEach(([title, typeName, cityName, targetEur, state, ageDays, fill, essence, story], idx) => {
  const type = typeByName[typeName]
  const city = cityByName[cityName] || cities[0]
  const useCompany = ['Медицинска апаратура', 'Опазване на околната среда', 'Изкуство и култура', 'Природни паркове', 'Спорт'].includes(typeName) && chance(0.7)
  const benPerson = useCompany ? null : persons[20 + idx]
  const benCompany = useCompany ? companies[idx % companies.length] : null
  const beneficiary = {
    id: uuid(),
    type: useCompany ? 'company' : 'individual',
    personId: benPerson?.id ?? null,
    companyId: benCompany?.id ?? null,
    coordinatorId: null,
    countryCode: 'BG',
    cityId: city.id,
    city,
    description: essence,
    organizerRelation: pick(['parent', 'family', 'friend', 'none', 'partner', 'relative']),
    publicData: null,
    privateData: null,
    person: benPerson ? { id: benPerson.id, firstName: benPerson.firstName, lastName: benPerson.lastName, company: null } : null,
    company: benCompany ? { id: benCompany.id, companyName: benCompany.companyName } : null,
  }
  beneficiaries.push(beneficiary)
  const coordinator = coordinators[idx % coordinators.length]
  // the signed-in user organizes 4 campaigns
  const organizer = [2, 12, 19, 32].includes(idx) ? organizers[0] : organizers[1 + (idx % (organizers.length - 1))]
  const createdAt = daysAgo(ageDays + int(3, 15), 12)
  const startDate = daysAgo(ageDays, 0)
  const durationDays = pick([60, 90, 120, 180, 365])
  const endDate = state === 'complete' ? startDate + Math.min(durationDays, ageDays - 5) * DAY : chance(0.25) ? null : startDate + durationDays * DAY
  const id = uuid()
  const slug = slugify(title).slice(0, 60)
  const target = targetEur * 100
  const vault = { id: uuid(), name: `${title.slice(0, 40)} – основен фонд`, currency: 'EUR', amount: 0, blockedAmount: 0, withdrawnAmount: 0, campaignId: id, createdAt: iso(createdAt), updatedAt: iso(NOW - int(1, 30) * DAY) }
  vaults.push(vault)
  const paras = [
    `<p>${essence}</p>`,
    `<p>${story}</p>`,
    `<h3>За какво ще бъдат използвани средствата</h3><ul><li>${pick(['Основен разход по кампанията', 'Закупуване на оборудване', 'Лечение и медикаменти', 'Материали и труд'])} – ${Math.round(targetEur * 0.7).toLocaleString('bg-BG')} евро</li><li>Транспорт и логистика – ${Math.round(targetEur * 0.18).toLocaleString('bg-BG')} евро</li><li>Непредвидени разходи – ${Math.round(targetEur * 0.12).toLocaleString('bg-BG')} евро</li></ul>`,
    `<p>Всички разходи ще бъдат отчетени с фактури в секцията „Отчет“ на кампанията. Ако съберем повече от необходимото, средствата ще бъдат пренасочени към сходна кауза след съгласуване с дарителите.</p>`,
    `<p><strong>Благодарим ви, че сте част от тази история!</strong> Всяко споделяне също помага.</p>`,
  ]
  const files = []
  const addFile = (role, name) => {
    const f = { id: uuid(), filename: name, mimetype: 'image/jpeg', campaignId: id, personId: organizer.person.id, role, image: { kind: type.category, seedIdx: idx, role } }
    files.push(f)
    campaignFiles.push(f)
  }
  if (state !== 'draft' || idx % 2 === 0) {
    addFile('campaignListPhoto', `${slug}-list.jpg`)
    addFile('campaignPhoto', `${slug}-main.jpg`)
    addFile('background', `${slug}-cover.jpg`)
    for (let g = 0; g < int(1, 3); g++) addFile('gallery', `${slug}-gallery-${g + 1}.jpg`)
    addFile('coordinator', `coordinator-${idx}.jpg`)
  }
  campaigns.push({
    id,
    state,
    slug,
    title,
    essence,
    paymentReference: `${(1000 + idx * 7919) % 9000 + 1000}-${String.fromCharCode(65 + (idx % 26))}${int(10, 99)}-${int(1000, 9999)}`.slice(0, 14),
    coordinatorId: coordinator.id,
    beneficiaryId: beneficiary.id,
    organizerId: organizer.id,
    companyId: null,
    approvedByPersonId: coordPeople[0].id,
    campaignTypeId: type.id,
    description: paras.join(''),
    targetAmount: target,
    allowDonationOnComplete: state === 'complete' && chance(0.5),
    currency: 'EUR',
    startDate: iso(startDate),
    endDate: endDate ? iso(endDate) : null,
    createdAt: iso(createdAt),
    updatedAt: iso(NOW - int(0, Math.min(ageDays, 60)) * DAY),
    deletedAt: null,
    _fill: fill,
    _vaultId: vault.id,
    _cityName: city.name,
  })
  beneficiary._campaignId = id
})

// ---------------------------------------------------------------- payments & donations
const payments = []
const donations = []
const wishes = []
const wishTexts = [
  'Бързо оздравяване, Мартине! Ти си герой!',
  'Успех! Нека всичко мине добре.',
  'Дарявам от името на целия ни офис в Пловдив ❤️',
  'За мама, която винаги помагаше на другите.',
  'Сила и кураж на цялото семейство!',
  'Малко, но от сърце.',
  'В памет на баба Цвета.',
  'Браво на организаторите за прозрачността!',
  'Здраве! Следя кампанията от самото начало и вярвам, че ще успеем.',
  'Надявам се скоро да видим снимки от новата площадка :)',
  'От учениците на 7б клас, 119 СУ',
  'Thank you for doing this. Greetings from Munich!',
  'Всяко лято ходим на този плаж. Благодарим ви!',
  'Дано повече хора се включат.',
  'Котките в нашия блок вече са кастрирани благодарение на вас. Продължавайте!',
  'Gute Besserung! Von der bulgarischen Gemeinde in Wien.',
  'Като родител на дете с диабет знам колко е важно това. Благодаря!',
  'Успех на Анелия на Европейското!',
  'Нека бъде светло.',
  'За доброто, което се връща.',
]
const amountsEur = [5, 5, 10, 10, 10, 15, 20, 20, 20, 25, 30, 50, 50, 50, 100, 100, 150, 200, 250, 500, 1000]
const providers = ['stripe', 'stripe', 'stripe', 'stripe', 'bank', 'bank', 'paypal', 'stripe']
function addDonation(campaign, t, amount, opts = {}) {
  const person = opts.person !== undefined ? opts.person : chance(0.62) ? persons[int(1, persons.length - 1)] : null
  const provider = opts.provider || pick(providers)
  const status = opts.status || 'succeeded'
  const anonymous = person ? chance(0.15) : true
  const pay = {
    id: uuid(),
    type: chance(0.03) ? 'benevity' : 'single',
    status,
    provider,
    extCustomerId: provider === 'stripe' ? `cus_${uuid().replace(/-/g, '').slice(0, 14)}` : '',
    amount,
    currency: 'EUR',
    chargedAmount: provider === 'stripe' ? Math.round(amount * 1.015 + 25) : amount,
    extPaymentIntentId: provider === 'stripe' ? `pi_3${uuid().replace(/-/g, '').slice(0, 23)}` : provider === 'bank' ? `${campaign.paymentReference}` : `PAYID-${uuid().replace(/-/g, '').slice(0, 20).toUpperCase()}`,
    extPaymentMethodId: provider === 'stripe' ? pick(['card', 'card', 'card', 'google_pay', 'apple_pay']) : provider === 'bank' ? 'bank' : 'paypal',
    billingName: person ? `${person.firstName} ${person.lastName}` : opts.billingName || `${pick(maleFirst.concat(femaleFirst))} ${pick(lastStems)}`,
    billingEmail: person ? person.email : `${pick(['donor', 'info', 'contact', 'help'])}${int(1, 999)}@${pick(['gmail.com', 'abv.bg'])}`,
    createdAt: iso(t),
    updatedAt: iso(t + int(5, 600) * 1000),
  }
  if (provider === 'bank' && person === null && chance(0.3)) pay.billingName = pick(companies).companyName
  const d = {
    id: uuid(),
    type: opts.type || (pay.billingName.match(/ООД|ЕООД|АД|Сдружение|Фондация/) ? 'corporate' : 'donation'),
    paymentId: pay.id,
    targetVaultId: campaign._vaultId,
    amount,
    currency: 'EUR',
    personId: anonymous ? null : person?.id ?? null,
    billingEmail: pay.billingEmail,
    createdAt: pay.createdAt,
    updatedAt: pay.updatedAt,
    _campaignId: campaign.id,
    _anon: anonymous,
    _realPersonId: person?.id ?? null,
  }
  payments.push(pay)
  donations.push(d)
  if (status === 'succeeded' && chance(0.12)) {
    wishes.push({ id: uuid(), message: pick(wishTexts), campaignId: campaign.id, personId: d.personId, donationId: d.id, createdAt: pay.createdAt, updatedAt: pay.createdAt, _anon: anonymous })
  }
  return d
}
for (const c of campaigns) {
  if (c.state === 'draft') continue
  const goal = c.targetAmount * c._fill
  let sum = 0
  const start = new Date(c.startDate).getTime()
  const endT = c.endDate ? Math.min(new Date(c.endDate).getTime(), NOW) : NOW
  const span = Math.max(endT - start, DAY)
  let guard = 0
  while (sum < goal && guard++ < 3000) {
    // front-loaded: many donations in the first days
    const r = Math.pow(rnd(), 1.8)
    const t = start + r * span
    let amt = pick(amountsEur) * 100
    if (chance(0.02)) amt = int(2, 10) * 1000 * 100 // occasional big corporate gift
    if (chance(0.1)) amt = int(7, 80) * 100 + pick([0, 50]) // odd amounts
    if (sum + amt > goal && goal - sum > 500) amt = Math.round(goal - sum)
    addDonation(c, t, amt)
    sum += amt
  }
  // a few unsuccessful payment attempts
  for (let i = 0; i < int(1, 6); i++) addDonation(c, start + rnd() * span, pick(amountsEur) * 100, { status: pick(['declined', 'cancelled', 'waiting', 'incomplete', 'refund']) })
}
// the signed-in user's own giving history: ~34 donations over 2.5 years
const myCampaignPicks = campaigns.filter((c) => c.state !== 'draft' && c.state !== 'blocked')
for (let i = 0; i < 34; i++) {
  const c = myCampaignPicks[(i * 11 + 3) % myCampaignPicks.length]
  const start = new Date(c.startDate).getTime()
  const t = Math.min(start + rnd() * 50 * DAY, NOW - DAY * int(0, 3))
  addDonation(c, t, pick([10, 20, 20, 25, 30, 50, 50, 100]) * 100, { person: me, provider: pick(['stripe', 'stripe', 'bank']), status: i === 5 ? 'refund' : i === 17 ? 'declined' : 'succeeded' })
}
// monthly recurring donations from the user to the platform campaign
const platform = campaigns.find((c) => c.slug.startsWith('podkrepi-bg'))
for (let m = 0; m < 19; m++) addDonation(platform, NOW - m * 30.4 * DAY - 2 * DAY, 1500, { person: me, provider: 'stripe' })

// vault totals and summaries
const vaultById = Object.fromEntries(vaults.map((v) => [v.id, v]))
const payById = Object.fromEntries(payments.map((p) => [p.id, p]))
for (const d of donations) {
  const p = payById[d.paymentId]
  const v = vaultById[d.targetVaultId]
  if (p.status === 'succeeded') v.amount += d.amount
  if (p.status === 'waiting') v.blockedAmount += 0
}

// ---------------------------------------------------------------- recurring donations
const recurringDonations = []
const rdCampaigns = campaigns.filter((c) => ['active', 'complete', 'partially_financed'].includes(c.state))
for (let i = 0; i < 38; i++) {
  const isMe = i < 3
  const c = isMe ? [platform, campaigns[4], campaigns[16]][i] : pick(rdCampaigns)
  const p = isMe ? me : persons[int(1, persons.length - 1)]
  recurringDonations.push({
    id: uuid(),
    status: isMe ? (i === 2 ? 'canceled' : 'active') : pick(['active', 'active', 'active', 'canceled', 'past_due', 'incomplete', 'trialing']),
    personId: p.id,
    person: { id: p.id, firstName: p.firstName, lastName: p.lastName, email: p.email },
    extSubscriptionId: `sub_1${uuid().replace(/-/g, '').slice(0, 23)}`,
    extCustomerId: `cus_${uuid().replace(/-/g, '').slice(0, 14)}`,
    amount: isMe ? [1500, 1000, 2000][i] : pick([500, 1000, 1000, 1500, 2000, 2500, 5000]),
    currency: 'EUR',
    sourceVault: vaultById[c._vaultId].id,
    vaultId: c._vaultId,
    campaignId: c.id,
    createdAt: iso(daysAgo(isMe ? [575, 210, 400][i] : int(20, 600), 24)),
    updatedAt: iso(daysAgo(int(0, 20), 24)),
  })
}

// ---------------------------------------------------------------- news
const newsTemplates = [
  ['Благодарим ви! Събрахме първите {p}% от сумата', 'Само за {d} дни събрахме {p}% от необходимите средства. Благодарим на всеки от вас! Семейството ще публикува подробен отчет в края на месеца.'],
  ['Отчет за изразходваните средства – {m}', 'Публикуваме фактурите за изразходваните до момента средства. Всички документи са прикачени към кампанията и могат да бъдат проверени от всеки дарител.'],
  ['Новини от болницата', 'Лекарите са доволни от възстановяването. Следващият контролен преглед е след три седмици. Благодарим за всички съобщения и пожелания!'],
  ['Доброволческа акция тази събота', 'Каним всички желаещи да се включат в акцията. Сбор в 9:30 ч. Носете ръкавици и удобни обувки, а ние ще осигурим вода, сандвичи и инструменти.'],
  ['Кампанията приключи успешно', 'Кампанията приключи и целта е постигната. Благодарим на над {n} дарители, които направиха това възможно. Окончателният финансов отчет е публикуван.'],
  ['Първите резултати', 'Ето какво постигнахме през последните седмици. Снимките говорят повече от думите – вижте галерията към новината.'],
  ['Промяна в бюджета на кампанията', 'След получаване на нова оферта от доставчика, общата сума е актуализирана. Разликата ще бъде отчетена прозрачно в следващия отчет.'],
]
const campaignNews = []
const newsFiles = []
for (const c of campaigns) {
  if (['draft', 'blocked'].includes(c.state)) continue
  const n = c.state === 'complete' ? int(2, 4) : int(0, 3)
  const start = new Date(c.startDate).getTime()
  for (let i = 0; i < n; i++) {
    const tpl = i === n - 1 && c.state === 'complete' ? newsTemplates[4] : newsTemplates[(i + campaigns.indexOf(c)) % 4 === 0 ? 0 : int(1, 6)]
    const t = Math.min(start + (i + 1) * (NOW - start) / (n + 1) + rnd() * 3 * DAY, NOW - DAY)
    const fill = (str) => str.replace('{p}', String(int(25, 60))).replace('{d}', String(int(3, 14))).replace('{m}', new Date(t).toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' })).replace('{n}', String(int(180, 1400)))
    const title = fill(tpl[0])
    const id = uuid()
    const art = {
      id,
      campaignId: c.id,
      publisherId: me.id,
      title,
      slug: slugify(title + '-' + c.slug).slice(0, 80) + '-' + id.slice(0, 4),
      author: pick([`${coordPeople[0].firstName} ${coordPeople[0].lastName}`, 'Екипът на Подкрепи.бг', 'Организаторът на кампанията']),
      state: chance(0.9) ? 'published' : 'draft',
      sourceLink: chance(0.2) ? 'https://www.facebook.com/podkrepi.bg' : null,
      createdAt: iso(t - 3600000),
      publishedAt: iso(t),
      editedAt: chance(0.3) ? iso(t + DAY) : null,
      description: `<p>${fill(tpl[1])}</p>${chance(0.5) ? `<p>${c.essence}</p>` : ''}${chance(0.4) ? '<p>Ако имате въпроси, пишете ни на <a href="mailto:campaigns@podkrepi.bg">campaigns@podkrepi.bg</a>.</p>' : ''}`,
      newsFiles: [],
    }
    if (chance(0.5)) {
      const f = { id: uuid(), filename: `${art.slug}-photo.jpg`, mimetype: 'image/jpeg', articleId: id, personId: me.id, role: 'gallery', image: { kind: campaignTypes.find((ty) => ty.id === c.campaignTypeId).category, seedIdx: campaigns.indexOf(c) + 100 + i, role: 'gallery' } }
      art.newsFiles.push(f)
      newsFiles.push(f)
    }
    campaignNews.push(art)
  }
}

// ---------------------------------------------------------------- expenses, withdrawals, transfers, bank
const expenseTypes = ['medical', 'services', 'groceries', 'transport', 'accommodation', 'shipping', 'utility', 'administrative', 'operating']
const expenseDescs = {
  medical: ['Фактура от клиника за хоспитализация', 'Медикаменти по рецепта – аптека Ремедиум', 'Консултация и изследвания'],
  services: ['Монтаж на съоръжения', 'Строително-ремонтни работи – етап 1', 'Ветеринарни услуги (кастрации, 42 бр.)'],
  groceries: ['Хранителни продукти за м. октомври', 'Продукти за хранителни пакети'],
  transport: ['Транспорт на пациента до летище София', 'Гориво за доставките – м. септември', 'Самолетни билети Истанбул'],
  accommodation: ['Нощувки за придружител', 'Наем на квартира близо до клиниката'],
  shipping: ['Доставка на оборудване – Еконт', 'Митнически такси'],
  utility: ['Ток и вода за приюта'],
  administrative: ['Банкови такси', 'Нотариална заверка на договор'],
  operating: ['Чували, ръкавици и инструменти', 'Хостинг и инфраструктура'],
}
const expenses = []
for (const c of campaigns) {
  if (['draft'].includes(c.state)) continue
  const v = vaultById[c._vaultId]
  const n = c.state === 'complete' ? int(3, 6) : int(0, 3)
  for (let i = 0; i < n; i++) {
    const type = pick(expenseTypes)
    expenses.push({
      id: uuid(),
      type,
      status: c.state === 'complete' ? 'approved' : pick(['approved', 'approved', 'pending', 'canceled']),
      currency: 'EUR',
      amount: Math.round((v.amount / (n + 1)) * (0.5 + rnd() * 0.5)),
      vaultId: v.id,
      deleted: false,
      description: pick(expenseDescs[type]),
      documentId: null,
      approvedById: coordPeople[0].id,
      spentAt: iso(Math.min(new Date(c.startDate).getTime() + (i + 1) * 20 * DAY, NOW - DAY)),
      createdAt: iso(Math.min(new Date(c.startDate).getTime() + (i + 1) * 20 * DAY, NOW - DAY)),
      expenseFiles: [],
      _campaignId: c.id,
    })
  }
}
const bankAccounts = [
  ['Фондация Подкрепи.бг', 'BG66UNCR70001524349032', 'UNCRBGSF', 'УниКредит Булбанк', 'verified'],
  ['Мартин Георгиев Петров', 'BG18RZBB91550123456789', 'RZBBBGSF', 'Райфайзенбанк', 'verified'],
  ['МБАЛ Видин АД', 'BG80BNBG96611020345678', 'BNBGBGSD', 'БНБ', 'verified'],
  ['Сдружение „Шанс за живот“', 'BG27STSA93000023456781', 'STSABGSF', 'ДСК', 'verification_required'],
  ['ФК Балкан Ботевград', 'BG45FINV91501004523781', 'FINVBGSF', 'Първа инвестиционна банка', 'verified'],
  ['Калина Ангелова (родител)', 'BG31UBBS80021087654321', 'UBBSBGSF', 'ОББ', 'verification_failed'],
  ['Читалище „Светлина 1872“', 'BG55CECB97901012345678', 'CECBBGSF', 'ЦКБ', 'new'],
].map(([accountHolderName, ibanNumber, bankIdCode, bankName, status]) => ({ id: uuid(), status, ibanNumber, accountHolderName, accountHolderType: accountHolderName.match(/Фондация|МБАЛ|Сдружение|ФК|Читалище/) ? 'company' : 'individual', bankName, bankIdCode, fingerprint: null, withdrawals: [], createdAt: iso(daysAgo(int(100, 900))) }))
const withdrawals = []
for (const c of campaigns.filter((c) => ['complete', 'active'].includes(c.state)).slice(0, 18)) {
  const v = vaultById[c._vaultId]
  const amt = Math.round(v.amount * (c.state === 'complete' ? 0.95 : 0.3 + rnd() * 0.3))
  const status = c.state === 'complete' ? 'succeeded' : pick(['initial', 'initial', 'approved', 'succeeded', 'declined'])
  if (status === 'succeeded') v.withdrawnAmount += amt
  else if (['initial', 'approved'].includes(status)) v.blockedAmount += amt
  const ba = bankAccounts[int(1, bankAccounts.length - 1)]
  withdrawals.push({ id: uuid(), status, currency: 'EUR', amount: amt, reason: `Превод към бенефициента по кампания „${c.title}“`, documentId: null, targetDate: iso(daysAgo(int(1, 120))), approvedBy: coordPeople[0], approvedById: coordPeople[0].id, bankAccount: ba, bankAccountId: ba.id, sourceCampaign: { id: c.id, title: c.title }, sourceCampaignId: c.id, sourceVault: { id: v.id, name: v.name }, sourceVaultId: v.id, createdAt: iso(daysAgo(int(5, 200))) })
}
const transfers = []
for (let i = 0; i < 8; i++) {
  const a = campaigns[int(0, 20)], b = campaigns[int(21, campaigns.length - 1)]
  transfers.push({ id: uuid(), status: pick(['succeeded', 'succeeded', 'initial', 'approved', 'declined']), currency: 'EUR', amount: int(5, 80) * 10000, reason: 'Пренасочване на надвишени средства след съгласуване с дарителите', documentId: null, targetDate: iso(daysAgo(int(5, 300))), approvedById: coordPeople[0].id, approvedBy: coordPeople[0], sourceCampaignId: a.id, sourceCampaign: { id: a.id, title: a.title }, sourceVaultId: a._vaultId, sourceVault: { id: a._vaultId, name: vaultById[a._vaultId].name }, targetCampaignId: b.id, targetCampaign: { id: b.id, title: b.title }, targetVaultId: b._vaultId, targetVault: { id: b._vaultId, name: vaultById[b._vaultId].name } })
}
const bankTransactions = donations
  .filter((d) => payById[d.paymentId].provider === 'bank')
  .slice(0, 160)
  .map((d) => {
    const p = payById[d.paymentId]
    const c = campaigns.find((x) => x.id === d._campaignId)
    const ok = p.status === 'succeeded'
    return {
      id: `${new Date(p.createdAt).toISOString().slice(0, 10).replace(/-/g, '')}${int(100000, 999999)}`,
      ibanNumber: 'BG66UNCR70001524349032',
      bankName: 'УниКредит Булбанк',
      bankIdCode: 'UNCRBGSF',
      transactionDate: p.createdAt,
      senderName: p.billingName.toUpperCase(),
      senderIban: `BG${int(10, 99)}${pick(['UNCR', 'RZBB', 'STSA', 'UBBS', 'FINV'])}${int(10000000, 99999999)}${int(100000, 999999)}`,
      recipientName: 'ФОНДАЦИЯ ПОДКРЕПИ БГ',
      recipientIban: 'BG66UNCR70001524349032',
      type: 'credit',
      amount: d.amount,
      currency: 'EUR',
      description: chance(0.85) ? `${c.paymentReference} ДАРЕНИЕ` : pick(['дарение', 'за Мартин', 'ДАРЕНИЕ ЗА КАУЗА', 'помощ']),
      matchedRef: chance(0.85) ? c.paymentReference : null,
      bankDonationStatus: ok ? (chance(0.9) ? 'imported' : 'reImported') : pick(['unrecognized', 'importFailed']),
      notified: chance(0.7),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }
  })

// ---------------------------------------------------------------- support, contact, applications, documents, irregularities
const supportRequests = []
const supportRoles = ['benefactor', 'partner', 'volunteer', 'associationMember', 'promoter']
for (let i = 0; i < 26; i++) {
  const p = persons[int(30, 160)]
  supportRequests.push({ id: uuid(), personId: p.id, person: p, supportData: { roles: Object.fromEntries(supportRoles.map((r) => [r, chance(0.35)])), benefactor: { campaignBenefactor: chance(0.5), platformBenefactor: chance(0.5) }, volunteer: { areas: [pick(['projectManager', 'designer', 'backend', 'frontend', 'marketing', 'lawyer', 'qa', 'devOps'])] }, comment: pick(['', 'Мога да помагам вечер и през уикенда.', 'Работя като юрист и мога да преглеждам договори.', 'Имам опит с React и Node.js.', 'Фотограф съм, мога да снимам за кампаниите в Пловдив.']) }, createdAt: iso(daysAgo(int(5, 800), 24)), updatedAt: null, deletedAt: null })
}
const contactMessages = ['Здравейте, как мога да получа сертификат за дарение за данъчни цели?', 'Искам да организирам кампания за съседката ни, която има нужда от операция. Какви документи са необходими?', 'Направих банков превод преди 5 дни, но не виждам дарението си в списъка.', 'Ние сме фирма и искаме да дарим ИТ оборудване. Възможно ли е?', 'Може ли да дарявам месечно с карта?', 'Hello, I live in Germany – can I donate via PayPal?', 'Как се проверяват кампаниите преди да бъдат публикувани?']
const infoRequests = []
for (let i = 0; i < 22; i++) {
  const p = persons[int(1, 160)]
  infoRequests.push({ id: uuid(), personId: p.id, person: p, message: pick(contactMessages), firstName: p.firstName, lastName: p.lastName, email: p.email, phone: p.phone, company: chance(0.2) ? pick(companies).companyName : '', createdAt: iso(daysAgo(int(1, 600), 24)), updatedAt: null, deletedAt: null })
}
const campaignApplications = [
  ['Помогнете на Ели да проходи', 'Елица Колева', 'Елица Колева (майка)', 'Дъщеря ми Ели', 'Роботизирана рехабилитация в Полша', '18 000 евро', 'review'],
  ['Нов покрив за читалището в с. Голямо Белово', 'Петър Шопов', 'Читалище „Пробуда 1905“', 'Председател на настоятелството', 'Ремонт на покрива преди зимата', '11 500 евро', 'requestInfo'],
  ['Кастрирай Бургас', 'Нели Трифонова', 'Сдружение „Лапички“', 'Доброволец', '500 кастрации на улични котки', '16 000 евро', 'approved'],
  ['Лечение за дядо Стоян', 'Мария Минчева', 'Стоян Минчев', 'Внучка', 'Операция на тазобедрена става', '7 200 евро', 'forCommitteeReview'],
  ['Библиотека в болницата в Ловеч', 'Ралица Делчева', 'МБАЛ Ловеч – детско отделение', 'Медицинска сестра', 'Книги и рафтове за детското отделение', '1 800 евро', 'approved'],
  ['Музикално училище за ромски деца в Сливен', 'Кирил Енчев', 'Фондация „Нов път“', 'Учител', 'Инструменти и преподаватели за 1 година', '24 000 евро', 'denied'],
  ['Спешен ремонт на моста в с. Бели Осъм', 'Владимир Цветков', 'Кметство Бели Осъм', 'Кмет', 'Възстановяване след порой', '35 000 евро', 'review'],
  ['Слухов имплант за Даниел', 'Кристина Райкова', 'Даниел Райков', 'Майка', 'Кохлеарен имплант – втори апарат', '22 000 евро', 'requestInfo'],
  ['Колело за всяко дете в Самоков', 'Любомир Пенчев', 'Велоклуб Самоков', 'Треньор', '40 детски велосипеда и каски', '6 000 евро', 'abandoned'],
  ['Залесяване на Сакар', 'Зорница Захариева', 'Сдружение „Зелени Родопи“', 'Координатор', '10 000 фиданки дъб', '9 000 евро', 'forCommitteeReview'],
  ['Подкрепа за ателие за хора с увреждания', 'Анелия Балабанова', 'Защитено жилище Габрово', 'Социален работник', 'Материали за керамично ателие', '3 400 евро', 'review'],
  ['Спешно лечение за Валентин', 'Десислава Маринова', 'Валентин Маринов', 'Сестра', 'Лъчетерапия в Солун', '14 000 евро', 'review'],
].map(([campaignName, organizerName, beneficiary, rel, goal, amount, state], i) => ({
  id: uuid(), campaignName, organizerName, organizerEmail: `${translit(organizerName.split(' ')[0])}@${pick(['abv.bg', 'gmail.com'])}`, organizerPhone: `+359 8${int(7, 9)} ${int(100, 999)} ${int(1000, 9999)}`, beneficiary, organizerBeneficiaryRel: rel, goal, history: pick(['Досега сме събрали част от сумата от приятели и колеги.', 'Не сме правили други кампании.', 'Имаме подкрепа от общината, но тя не е достатъчна.']), amount, description: `${goal}. ${pick(['Прилагаме медицинска документация и оферта.', 'Прилагаме три оферти от изпълнители.', 'Документите ще бъдат изпратени допълнително.'])}`, campaignGuarantee: pick(['', 'Кампанията се подкрепя от кмета на общината.', 'Лекуващият лекар ще потвърди нуждата публично.']), otherFinanceSources: pick(['', 'Фонд за лечение на деца', 'Местен бизнес']), otherNotes: '', campaignEnd: pick(['funds', 'continuous', 'date']), campaignEndDate: iso(NOW + int(30, 200) * DAY), campaignTypeId: pick(campaignTypes).id, state, ticketURL: chance(0.5) ? `https://podkrepi.atlassian.net/browse/CAMP-${int(200, 480)}` : '', archived: state === 'abandoned', acceptTermsAndConditions: true, transparencyTermsAccepted: true, personalInformationProcessingAccepted: true, createdAt: iso(daysAgo(int(1, 120), 24)), updatedAt: iso(daysAgo(int(0, 10), 24)), personId: i === 11 ? me.id : persons[int(20, 150)].id, documents: [],
}))
const documents = [
  ['Устав на Фондация Подкрепи.бг', 'Устав', 'bylaws'], ['Годишен финансов отчет 2025', 'Финансов отчет', 'financial_report'], ['Годишен финансов отчет 2024', 'Финансов отчет', 'financial_report'], ['Договор с УниКредит Булбанк', 'Договор', 'contract'], ['Декларация за поверителност', 'Политика', 'policy'], ['Протокол от Общо събрание – март 2026', 'Протокол', 'protocol'], ['Фактура 0000004521 – Хостинг', 'Фактура', 'invoice'],
].map(([name, description, type]) => ({ id: uuid(), type, name, filename: slugify(name) + '.pdf', filetype: 'application/pdf', description, sourceUrl: '', ownerId: me.id, createdAt: iso(daysAgo(int(10, 700))) }))
const irregularities = campaigns.filter((c) => ['blocked', 'suspended'].includes(c.state)).concat([campaigns[9], campaigns[22]]).map((c, i) => {
  const p = persons[int(40, 150)]
  return { id: uuid(), campaignId: c.id, campaign: { id: c.id, title: c.title }, personId: p.id, person: p, notifierType: pick(['benefactor', 'other']), reason: pick(['duplicated', 'misrepresentation', 'none', 'inappropriate_fundraising_purpose', 'prohibited_content']), status: pick(['initial', 'confirmed', 'declined', 'canceled']), description: pick(['Същата кауза се събира и в друга платформа с различна сума.', 'Снимките в кампанията са от друг случай, публикуван в медиите през 2022 г.', 'Организаторът не отговаря на въпросите на дарителите.', 'Сумата изглежда завишена спрямо офертите, които открих.']), createdAt: iso(daysAgo(int(5, 200), 24)), updatedAt: null }
})
const affiliates = [
  { id: uuid(), status: 'active', affiliateType: 'corporate', affiliateCode: 'af_Ht7Qp2Lm', companyId: companies[0].id, company: { companyName: companies[0].companyName, companyNumber: companies[0].companyNumber, person: { firstName: companies[0].legalPersonName.split(' ')[0], lastName: companies[0].legalPersonName.split(' ')[1], email: 'hr@telerikacademy.bg', phone: '+359 2 809 9850' } }, createdAt: iso(daysAgo(400)) },
  { id: uuid(), status: 'pending', affiliateType: 'corporate', affiliateCode: null, companyId: companies[4].id, company: { companyName: companies[4].companyName, companyNumber: companies[4].companyNumber, person: { firstName: 'Красимир', lastName: 'Колев', email: 'csr@econt.com', phone: '+359 700 17 300' } }, createdAt: iso(daysAgo(14)) },
  { id: uuid(), status: 'cancelled', affiliateType: 'corporate', affiliateCode: 'af_9KcV1sQe', companyId: companies[9].id, company: { companyName: companies[9].companyName, companyNumber: companies[9].companyNumber, person: { firstName: 'Ивайло', lastName: 'Маринов', email: 'office@itsolutions-bs.bg', phone: '+359 56 820 114' } }, createdAt: iso(daysAgo(300)) },
]
const benefactors = persons.slice(30, 52).map((p) => ({ id: uuid(), extCustomerId: `cus_${uuid().replace(/-/g, '').slice(0, 14)}`, personId: p.id, person: p, createdAt: p.createdAt }))
const notificationSubscriptions = [campaigns[0], campaigns[4], campaigns[11], campaigns[16], campaigns[20], platform].map((c) => ({ id: uuid(), campaignId: c.id, campaign: { title: c.title } }))

// ---------------------------------------------------------------- blog (Ghost content API)
const blogPosts = [
  ['Годишен отчет на Подкрепи.бг за 2025 г.', 'Подкрепи.бг', 'Над 4,2 млн. евро дарения, 312 кампании и нито един лев комисиона – ето как изглеждаше 2025 г.'],
  ['Как проверяваме кампаниите преди публикуване', 'Екипът', 'Всеки организатор минава през видео интервю, проверка на документи и одобрение от комисия от доброволци.'],
  ['Еврото дойде: какво се промени за дарителите', 'Финанси', 'От 1 януари 2026 г. всички кампании събират в евро. Обясняваме как преизчислихме старите суми.'],
  ['Доброволците зад платформата: интервю с екипа по сигурност', 'Хора', 'Разговаряме с хората, които пазят даренията и личните данни на хиляди дарители.'],
  ['Подкрепи.бг на DEV.BG All in One 2026', 'Събития', 'Представихме новия модул за корпоративни дарения и търсим нови доброволци.'],
  ['5 съвета за успешна кампания', 'Съвети', 'Добри снимки, чести новини и прозрачни отчети – това е тайната на кампаниите, които успяват.'],
  ['Наводненията в Царево: една година по-късно', 'Истории', 'Върнахме се в Царево, за да видим какво е постигнато със средствата от кампанията.'],
  ['Нов начин да дарявате: Google Pay и Apple Pay', 'Продукт', 'Отсега нататък можете да дарите с едно докосване от телефона си.'],
  ['Кои са най-подкрепяните каузи през лятото', 'Статистика', 'Медицинските кампании продължават да водят, но екологичните каузи растат с най-бърз темп.'],
  ['Благодарим на нашите партньори', 'Партньори', 'Без подкрепата на фирмите партньори Подкрепи.бг нямаше да може да работи без комисиона.'],
  ['Отворени данни: всички дарения вече са достъпни за анализ', 'Прозрачност', 'Публикуваме анонимизирани данни за всички дарения в машинно четим формат.'],
  ['Пролетна акция по залесяване на Витоша', 'Събития', 'Над 300 доброволци засадиха 8 000 фиданки за един ден.'],
].map(([title, tag, excerpt], i) => {
  const id = crypto.createHash('md5').update(title).digest('hex').slice(0, 24)
  const slug = slugify(title)
  const t = iso(daysAgo(10 + i * 27, 24))
  return { id, uuid: uuid(), title, slug, html: `<p>${excerpt}</p><p>Подкрепи.бг е платформа за дарения, създадена и поддържана изцяло от доброволци. Вярваме, че прозрачността е в основата на доверието между дарители и организатори.</p><h2>Какво следва</h2><p>През следващите месеци ще продължим да подобряваме платформата и да разказваме историите на хората, на които помагате.</p>`, excerpt, custom_excerpt: excerpt, feature_image: `/api/v1/blog-image/${i}`, featured: i < 2, visibility: 'public', created_at: t, updated_at: t, published_at: t, reading_time: int(2, 9), url: `https://blog.podkrepi.bg/${slug}/`, primary_author: { id: 'a1', name: pick(['Илко Качаров', 'Мариана Каролева', 'Георги Иванов', 'Нели Радкова']), slug: 'author', profile_image: null }, authors: [], primary_tag: { id: 't' + i, name: tag, slug: slugify(tag) }, tags: [{ id: 't' + i, name: tag, slug: slugify(tag) }], meta_title: null, meta_description: excerpt, og_image: null, twitter_image: null, _imgIdx: i }
})

const db = {
  generatedAt: iso(NOW),
  me: { personId: me.id, password: 'Podkrepi2026!' },
  persons, companies, countries, cities, campaignTypes, coordinators, organizers, beneficiaries, campaigns, vaults, campaignFiles,
  payments, donations, wishes, recurringDonations, campaignNews, newsFiles, expenses, bankAccounts, withdrawals, transfers,
  bankTransactions, supportRequests, infoRequests, campaignApplications, documents, irregularities, affiliates, benefactors,
  notificationSubscriptions, blogPosts,
}
fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(db))
console.log(Object.entries(db).filter(([, v]) => Array.isArray(v)).map(([k, v]) => `${k}:${v.length}`).join(' '))
