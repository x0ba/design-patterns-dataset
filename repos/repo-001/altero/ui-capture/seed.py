"""Seed library content through altero's Zotero Web API v3 (the path the desktop client syncs through).

Usage: seed.py BASE_URL   (reads .ui-capture/data/keys.json written by bootstrap.py)
"""

import hashlib
import json
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import seed_data as D  # noqa: E402

BASE = sys.argv[1].rstrip("/")
HERE = Path(__file__).resolve().parent
CFG = json.loads((HERE / "data" / "keys.json").read_text())
KEYS = CFG["keys"]
GROUPS = CFG["groups"]
rnd = random.Random(20261116)
NOW = datetime(2026, 11, 14, 16, 40, tzinfo=UTC)
KEYCHARS = "23456789ABCDEFGHIJKLMNPQRSTUVWXYZ"


def zkey() -> str:
    return "".join(rnd.choice(KEYCHARS) for _ in range(8))


def ts(d: datetime) -> str:
    return d.strftime("%Y-%m-%dT%H:%M:%SZ")


def rand_date(days_back_max: int, days_back_min: int = 0) -> datetime:
    d = NOW - timedelta(days=rnd.uniform(days_back_min, days_back_max))
    # working hours, mostly
    return d.replace(hour=rnd.choice([8, 9, 10, 11, 13, 14, 15, 16, 17, 21, 22]), minute=rnd.randrange(60),
                     second=rnd.randrange(60))


def req(method: str, path: str, user: str, body=None, headers=None, raw: bytes | None = None,
        ctype: str | None = None):
    h = {"Zotero-API-Key": KEYS[user], "Zotero-API-Version": "3"}
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        h["Content-Type"] = "application/json"
    if raw is not None:
        data = raw
        h["Content-Type"] = ctype
    h.update(headers or {})
    r = urllib.request.Request(BASE + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(r) as resp:
            txt = resp.read()
            return resp.status, (json.loads(txt) if txt and txt[:1] in b"{[" else txt)
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path} -> {e.code}: {e.read()[:500]!r}") from None


def post_many(lib: str, kind: str, objs: list[dict], user: str) -> None:
    for i in range(0, len(objs), 50):
        _, res = req("POST", f"{lib}/{kind}", user, objs[i:i + 50])
        if res.get("failed"):
            raise SystemExit(f"failed {kind}: {json.dumps(res['failed'])[:800]}")


def creators(s: str, ctype: str = "author") -> list[dict]:
    out = []
    for part in [p.strip() for p in s.split(";") if p.strip()]:
        if "," in part:
            last, first = [x.strip() for x in part.split(",", 1)]
            out.append({"creatorType": ctype, "lastName": last, "firstName": first})
        else:
            out.append({"creatorType": ctype, "name": part})
    return out


VENUE_FIELD = {"journalArticle": "publicationTitle", "book": "publisher", "bookSection": "bookTitle",
               "report": "institution", "computerProgram": "company", "thesis": "university",
               "webpage": "websiteTitle", "conferencePaper": "proceedingsTitle", "dataset": "repository",
               "preprint": "repository"}


def make_item(t, authors, date, title, venue, extra, tags, colls, added) -> dict:
    it = {"key": zkey(), "itemType": t, "title": title, "date": date,
          "creators": creators(authors, "programmer" if t == "computerProgram" else "author") if authors else [],
          "tags": [{"tag": x} for x in tags], "collections": colls,
          "dateAdded": ts(added), "dateModified": ts(added + timedelta(days=rnd.choice([0, 0, 0, 1, 3, 20, 90])))}
    if venue:
        it[VENUE_FIELD[t]] = venue
    for k, v in extra.items():
        if k == "bookEditors":
            it["creators"] += creators(v, "editor")
        else:
            it[k] = v
    if t in ("journalArticle", "conferencePaper", "preprint") and "abstractNote" not in it:
        it["abstractNote"] = abstract()
    if t == "webpage":
        it["accessDate"] = ts(added)
    if "DOI" in it and t not in ("journalArticle", "conferencePaper", "preprint", "dataset", "report"):
        it["extra"] = f"DOI: {it.pop('DOI')}"
    if "DOI" in it and "url" not in it:
        it["url"] = f"https://doi.org/{it['DOI']}"
    if it.get("url") and t != "webpage":
        it["accessDate"] = ts(added)
    if t == "journalArticle":
        it.setdefault("language", "en")
    return it


def abstract() -> str:
    y1 = rnd.randint(2008, 2020)
    bits = rnd.sample(D.ABSTRACT_BITS, rnd.randint(3, 5))
    return " ".join(b.format(n=rnd.randint(6, 60), y1=y1, y2=y1 + rnd.randint(1, 5), p=rnd.randint(12, 68),
                             r=rnd.randint(21, 74), c1=rnd.randint(4, 20), c2=rnd.randint(30, 140)) for b in bits)


tmpl_bag: list[str] = []


def generated_articles(n: int, colls_pool: list[str], tag_pool: list[str]) -> list[dict]:
    out = []
    for _ in range(n):
        sp = rnd.choice(D.SPECIES[:2] if rnd.random() < 0.75 else D.SPECIES)
        reg = rnd.choice(D.SPECIES_REGIONS[sp])
        stress = rnd.choice(D.STRESSES)
        if not tmpl_bag:
            tmpl_bag.extend(rnd.sample(D.TEMPLATES, len(D.TEMPLATES)))
        title = tmpl_bag.pop().format(sp=sp, reg=reg, stress=stress, Stress2=stress[0].upper() + stress[1:])
        nauth = rnd.choice([1, 2, 3, 3, 4, 5, 6, 8])
        authors = "; ".join(f"{rnd.choice(D.LAST)}, {rnd.choice(D.FIRST)}" for _ in range(nauth))
        year = rnd.choice(range(2004, 2027))
        j, abbr, doi = rnd.choice(D.JOURNALS)
        date = f"{year}-{rnd.randint(1, 12):02d}" if rnd.random() < 0.7 else str(year)
        extra = {"volume": str(rnd.randint(20, 640)), "pages": f"{(p := rnd.randint(1, 900))}-{p + rnd.randint(8, 24)}",
                 "journalAbbreviation": abbr, "DOI": f"{doi}{year}.{rnd.randint(10000, 99999)}"}
        if rnd.random() < 0.6:
            extra["issue"] = str(rnd.randint(1, 12))
        if rnd.random() < 0.08:  # messy: missing fields
            extra.pop("DOI"); extra.pop("pages")
        tags = rnd.sample(tag_pool, rnd.choice([0, 1, 1, 2, 2, 3]))
        if sp.split()[0] in ("Zostera", "Posidonia") and rnd.random() < 0.5:
            tags.append(sp)
        colls = rnd.sample(colls_pool, rnd.choice([0, 1, 1, 1, 2])) if colls_pool else []
        added = rand_date(1150, 2)
        out.append(make_item("journalArticle", authors, date, title, j, extra, sorted(set(tags)), colls, added))
    return out


def tiny_pdf(title: str, lines: list[str]) -> bytes:
    def esc(s: str) -> str:
        return s.encode("latin-1", "replace").decode("latin-1").replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    text = ["BT /F1 16 Tf 60 760 Td (" + esc(title[:80]) + ") Tj ET"]
    y = 720
    for ln in lines:
        text.append(f"BT /F1 10 Tf 60 {y} Td ({esc(ln[:100])}) Tj ET")
        y -= 16
    stream = "\n".join(text).encode("latin-1", "replace")
    # Pad to a realistic PDF size with incompressible bytes derived from the title,
    # so the same paper in two libraries is the same file (exercises dedup).
    seed = hashlib.sha256(title.encode()).digest()
    prng = random.Random(seed)
    pad_len = prng.randint(180_000, 2_400_000)
    pad = prng.randbytes(pad_len)
    objs = [b"<< /Type /Catalog /Pages 2 0 R >>",
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
            b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            b"<< /Length %d >>\nstream\n" % len(pad) + pad + b"\nendstream"]
    out = bytearray(b"%PDF-1.4\n")
    offs = []
    for i, o in enumerate(objs, 1):
        offs.append(len(out))
        out += b"%d 0 obj\n" % i + o + b"\nendobj\n"
    x = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1)
    for o in offs:
        out += b"%010d 00000 n \n" % o
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, x)
    return bytes(out)


def pdf_name(it: dict) -> str:
    c = it["creators"][0] if it["creators"] else {"name": "Anon"}
    last = c.get("lastName") or c.get("name", "Anon")
    yr = (it.get("date") or "")[:4]
    short = " ".join(it["title"].split()[:6]).rstrip(":,.")
    return f"{last} et al. - {yr} - {short}.pdf" if len(it["creators"]) > 2 else f"{last} - {yr} - {short}.pdf"


def upload(lib: str, user: str, key: str, data: bytes, filename: str) -> None:
    md5 = hashlib.md5(data).hexdigest()
    form = urllib.parse.urlencode({"md5": md5, "filename": filename, "filesize": len(data),
                                   "mtime": int(time.time() * 1000), "params": 1}).encode()
    _, auth = req("POST", f"{lib}/items/{key}/file", user, raw=form, ctype="application/x-www-form-urlencoded",
                  headers={"If-None-Match": "*"})
    if isinstance(auth, dict) and auth.get("exists"):
        return
    boundary = uuid.uuid4().hex
    body = bytearray()
    for k, v in auth["params"].items():
        body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
    body += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n"
             f"Content-Type: application/pdf\r\n\r\n").encode() + data + f"\r\n--{boundary}--\r\n".encode()
    url = auth["url"]
    path = urllib.parse.urlparse(url).path
    r = urllib.request.Request(BASE + path, data=bytes(body), method="POST",
                               headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    urllib.request.urlopen(r).read()
    req("POST", f"{lib}/items/{key}/file", user,
        raw=urllib.parse.urlencode({"upload": auth["uploadKey"]}).encode(),
        ctype="application/x-www-form-urlencoded", headers={"If-None-Match": "*"})


ABSTRACTS: dict[str, str] = {}


def children_for(items: list[dict], lib: str, user_of, pdf_share=0.45, note_share=0.25):
    """Child PDFs (with files), notes, a few links and annotations."""
    kids, files, annots = [], [], []
    for it in items:
        if it["itemType"] in ("webpage", "computerProgram"):
            continue
        added = datetime.strptime(it["dateAdded"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=UTC)
        if rnd.random() < pdf_share:
            att = {"key": zkey(), "itemType": "attachment", "parentItem": it["key"], "linkMode": "imported_file",
                   "title": "Full Text PDF" if rnd.random() < 0.7 else "Submitted Version",
                   "contentType": "application/pdf", "filename": pdf_name(it),
                   "dateAdded": ts(added + timedelta(minutes=1)), "dateModified": ts(added + timedelta(minutes=1)),
                   "tags": [], "relations": {}}
            kids.append(att)
            abs_lines = [it.get("publicationTitle", it.get("publisher", "")),
                         ", ".join((c.get("lastName") or c.get("name", "")) for c in it["creators"][:6])]
            abs_txt = ABSTRACTS.setdefault(it["title"], it.get("abstractNote", ""))
            abs_lines += [abs_txt[i:i + 95] for i in range(0, min(len(abs_txt), 950), 95)]
            files.append((lib, user_of(it), att["key"], tiny_pdf(it["title"], abs_lines), att["filename"]))
            if rnd.random() < 0.35:
                for j in range(rnd.randint(1, 4)):
                    hl = rnd.choice(["Carbon stocks in the top 25 cm", "shoot density declined", "site selection",
                                     "allochthonous sources", "stratified random design", "low-accumulation settings",
                                     "restoration success"])
                    annots.append({"key": zkey(), "itemType": "annotation", "parentItem": att["key"],
                                   "annotationType": rnd.choice(["highlight", "highlight", "note", "underline"]),
                                   "annotationText": hl,
                                   "annotationComment": rnd.choice(["", "", "compare with our data", "check units!",
                                                                    "good for intro", "?"]),
                                   "annotationColor": rnd.choice(["#ffd400", "#ff6666", "#5fb236", "#2ea8e5", "#a28ae5"]),
                                   "annotationPageLabel": "1", "annotationSortIndex": f"00000|{j * 400:06d}|00{100 + j * 20:03d}",
                                   "annotationPosition": json.dumps({"pageIndex": 0, "rects": [[60, 700 - j * 16, 400, 712 - j * 16]]}),
                                   "dateAdded": ts(added + timedelta(days=j + 1)), "dateModified": ts(added + timedelta(days=j + 1)),
                                   "tags": []})
        if rnd.random() < note_share:
            kids.append({"key": zkey(), "itemType": "note", "parentItem": it["key"], "note": rnd.choice(D.NOTES),
                         "tags": [], "relations": {},
                         "dateAdded": ts(added + timedelta(days=rnd.randint(0, 40))),
                         "dateModified": ts(added + timedelta(days=rnd.randint(40, 80)))})
        elif rnd.random() < 0.06:
            kids.append({"key": zkey(), "itemType": "attachment", "parentItem": it["key"], "linkMode": "linked_url",
                         "title": "Supplementary material", "url": (it.get("url") or "https://doi.org/") + "#supplementary",
                         "contentType": "", "tags": [], "relations": {},
                         "dateAdded": ts(added), "dateModified": ts(added)})
    return kids, files, annots


def seed_personal() -> None:
    lib, u = "/users/1", "hlindqvist"
    C = {}
    tree = [("Blue Carbon", None), ("Carbon stock methods", "Blue Carbon"), ("Carbon markets & policy", "Blue Carbon"),
            ("Seagrass ecology", None), ("Heatwaves & stress", "Seagrass ecology"), ("Restoration", "Seagrass ecology"),
            ("Baltic Sea", "Seagrass ecology"), ("Statistics & R", None), ("Teaching", None),
            ("MAR-301 Coastal Ecosystems (WS 2026/27)", "Teaching"), ("MAR-301 (WS 2025/26)", "Teaching"),
            ("Grant: DFG Sachbeihilfe 2026", None), ("Own publications", None), ("STS & social science", None),
            ("Student theses", None), ("Meron – PhD", "Student theses"), ("Priya – MSc", "Student theses"),
            ("To read", None), ("Archive: Review paper 2022 (abandoned)", None)]
    colls = []
    for name, parent in tree:
        C[name] = zkey()
        colls.append({"key": C[name], "name": name, "parentCollection": C[parent] if parent else False})
    post_many(lib, "collections", colls, u)

    topic_coll = {"blue carbon": "Blue Carbon", "carbon stocks": "Carbon stock methods", "methods": "Carbon stock methods",
                  "carbon credits": "Carbon markets & policy", "policy": "Carbon markets & policy",
                  "seagrass": "Seagrass ecology", "heatwave": "Heatwaves & stress", "restoration": "Restoration",
                  "Baltic Sea": "Baltic Sea", "statistics": "Statistics & R", "R": "Statistics & R",
                  "teaching": "MAR-301 Coastal Ecosystems (WS 2026/27)", "own work": "Own publications",
                  "STS": "STS & social science", "core": "Grant: DFG Sachbeihilfe 2026"}
    items = []
    for t, a, date, title, venue, extra, tags in D.PERSONAL:
        cs = sorted({C[topic_coll[x]] for x in tags if x in topic_coll})
        if "core" in tags or rnd.random() < 0.2:
            cs.append(C[rnd.choice(["MAR-301 (WS 2025/26)", "MAR-301 Coastal Ecosystems (WS 2026/27)"])])
        items.append(make_item(t, a, date, title, venue, extra, tags, sorted(set(cs)), rand_date(1300, 10)))
    pool = [C[n] for n in ["Blue Carbon", "Carbon stock methods", "Seagrass ecology", "Heatwaves & stress",
                           "Restoration", "Baltic Sea", "To read", "To read", "Meron – PhD", "Priya – MSc",
                           "Archive: Review paper 2022 (abandoned)", "Grant: DFG Sachbeihilfe 2026"]]
    tag_pool = ["to-read", "to-read", "important", "Kiel", "methods", "carbon stocks", "heatwave", "restoration",
                "eutrophication", "sediment", "field protocol", "cite in proposal", "printed", "reviewed-for-journal"]
    items += generated_articles(120, pool, tag_pool)
    # messy real-world duplicates (imported twice from different sources)
    for src in rnd.sample(items[:40], 3):
        dup = dict(src, key=zkey(), tags=[], collections=[], dateAdded=ts(rand_date(200, 5)))
        dup["dateModified"] = dup["dateAdded"]
        dup["title"] = src["title"].replace(":", " -") if ":" in src["title"] else src["title"].upper() if rnd.random() < 0.3 else src["title"]
        items.append(dup)
    # a few unfinished stubs from browser connector
    for title, url in [("Eelgrass meadows mapped for the first time along Schleswig-Holstein coast", "https://www.kieler-nachrichten.example/region/seegraswiesen-kartiert"),
                       ("Blue carbon: The ocean's hidden climate ally? — Ocean Panel blog", "https://oceanpanel.org/blog/blue-carbon"),
                       ("Untitled", "https://www.researchgate.net/publication/361234567")]:
        items.append(make_item("webpage", "", "", title, "", {"url": url}, [], [C["To read"]], rand_date(60, 1)))
    # trash
    for it in rnd.sample(items[60:], 6):
        it["deleted"] = 1
    # related items
    a, b = items[0], items[1]
    a["relations"] = {"dc:relation": [f"http://zotero.org/users/1/items/{b['key']}"]}
    b["relations"] = {"dc:relation": [f"http://zotero.org/users/1/items/{a['key']}"]}
    items.sort(key=lambda x: x["dateAdded"])
    post_many(lib, "items", items, u)

    # standalone notes
    notes = [
        "<h1>DFG proposal – outline</h1><ol><li>State of the art (blue carbon in temperate seagrass)</li><li>Preliminary work: Kiel Bight cores 2021–23, drone maps</li><li>WP1 carbon stocks; WP2 heatwave experiments (mesocosms GEOMAR); WP3 restoration trials Schlei</li><li>Budget: 1 PhD (E13 65%), 1 student assistant, ship time ALKOR 6 days</li></ol><p>Deadline internal: <strong>15 Jan 2027</strong></p>",
        "<h1>Field season 2026 – packing list</h1><ul><li>Push corers (x6), core caps, extruder</li><li>Quadrats 0.25 m², GoPro + housing</li><li>Salinity/temperature loggers (HOBO) – recharge!</li><li>Permits: LKN SH permit valid until 31.12.2026</li></ul>",
        "<h1>Ideas – heatwave mesocosm experiment</h1><p>Combine +3 °C and +5 °C treatments with nutrient pulse? Ask Thorsten about Kiel Outdoor Benthocosms availability for summer 2027.</p><p>Response variables: shoot density, leaf growth (hole punch), rhizome carbohydrates, sediment sulfide.</p>",
        "<h1>MAR-301 – exam questions draft</h1><p>1. Explain why seagrass meadows are considered blue carbon ecosystems, and discuss two sources of uncertainty in carbon stock estimates.</p><p>2. Compare seed-based and shoot-based restoration approaches.</p>",
        "<p>Meeting with Priya 03.11.: thesis chapter 2 draft by end of November; re-run survival analysis with site as random effect.</p>",
        "<p>Reviewer comments for Estuaries &amp; Coasts manuscript ECSS-D-26-00412 — major revision. Main issue: no reference depth standardisation.</p>",
    ]
    standalone = [{"key": zkey(), "itemType": "note", "note": n, "tags": [{"tag": "planning"}] if i < 3 else [],
                   "collections": [C["Grant: DFG Sachbeihilfe 2026"]] if i == 0 else ([C["Teaching"]] if i == 3 else []),
                   "relations": {}, "dateAdded": ts(rand_date(400, 3)), "dateModified": ts(rand_date(2, 0))}
                  for i, n in enumerate(notes)]
    post_many(lib, "items", standalone, u)

    kids, files, annots = children_for([i for i in items if not i.get("deleted")], lib, lambda it: u)
    post_many(lib, "items", kids, u)
    for f in files:
        upload(*f)
    post_many(lib, "items", annots, u)

    post_many(lib, "searches", [
        {"key": zkey(), "name": "Unread blue carbon", "conditions": [
            {"condition": "tag", "operator": "is", "value": "to-read"},
            {"condition": "title", "operator": "contains", "value": "carbon"}]},
        {"key": zkey(), "name": "Added in last 30 days", "conditions": [
            {"condition": "dateAdded", "operator": "isInTheLast", "value": "30 days"}]},
        {"key": zkey(), "name": "Zostera papers since 2020", "conditions": [
            {"condition": "title", "operator": "contains", "value": "Zostera"},
            {"condition": "date", "operator": "isAfter", "value": "2019-12-31"}]},
    ], u)
    req("PUT", f"{lib}/settings/tagColors", u, {"value": [
        {"name": "to-read", "color": "#FF6666"}, {"name": "important", "color": "#FF8C19"},
        {"name": "own work", "color": "#5FB236"}, {"name": "cite in proposal", "color": "#2EA8E5"},
        {"name": "to-discuss", "color": "#A28AE5"}]})
    print(f"personal: {len(items)} items, {len(standalone)} notes, {len(kids)} children, {len(files)} files, {len(annots)} annotations")


def seed_group(gid: int, members: list[str], coll_names: list[str], curated: list[tuple], n_gen: int, tag_pool):
    lib = f"/groups/{gid}"
    owner = members[0]
    C = {n: zkey() for n in coll_names}
    post_many(lib, "collections", [{"key": k, "name": n, "parentCollection": False} for n, k in C.items()], owner)
    items = [make_item(t, a, d, ti, v, ex, tg, [C[rnd.choice(coll_names)]], rand_date(900, 3))
             for t, a, d, ti, v, ex, tg in curated]
    items += generated_articles(n_gen, list(C.values()), tag_pool)
    by_user: dict[str, list] = {}
    for it in items:
        by_user.setdefault(rnd.choice(members), []).append(it)
    owner_of = {}
    for user, its in by_user.items():
        its.sort(key=lambda x: x["dateAdded"])
        post_many(lib, "items", its, user)
        for it in its:
            owner_of[it["key"]] = user
    kids, files, annots = children_for(items, lib, lambda it: owner_of[it["key"]], pdf_share=0.35, note_share=0.3)
    for k in kids:
        post_many(lib, "items", [k], owner_of[k["parentItem"]])
    for f in files:
        upload(*f)
    att_owner = {k["key"]: owner_of[k["parentItem"]] for k in kids}
    for a in annots:
        post_many(lib, "items", [a], att_owner[a["parentItem"]])
    print(f"group {gid}: {len(items)} items, {len(kids)} children")


LAB_CURATED = [
    ("report", "Rybak, Tomasz", "2024-03", "SOP-03: Sediment core collection, slicing and storage (v2.3)", "Coastal Ecology Lab, Kiel University", {"reportType": "Standard Operating Procedure"}, ["field protocol", "SOP"]),
    ("report", "Bekele, Meron", "2025-01", "SOP-07: Loss-on-ignition and elemental analysis of sediment samples", "Coastal Ecology Lab, Kiel University", {"reportType": "Standard Operating Procedure"}, ["lab protocol", "SOP"]),
    ("report", "Natarajan, Priya", "2025-06", "SOP-11: Eelgrass seed collection, storage and buoy-deployed seeding (BuDS)", "Coastal Ecology Lab, Kiel University", {"reportType": "Standard Operating Procedure"}, ["field protocol", "SOP", "restoration"]),
    ("report", "Lindqvist, Hannah; Rybak, Tomasz", "2023-11", "Annual report 2023: Kiel Bight eelgrass monitoring transects", "Coastal Ecology Lab, Kiel University", {"reportType": "Monitoring report"}, ["monitoring", "annual report"]),
    ("report", "Lindqvist, Hannah; Rybak, Tomasz; Bekele, Meron", "2024-12", "Annual report 2024: Kiel Bight eelgrass monitoring transects", "Coastal Ecology Lab, Kiel University", {"reportType": "Monitoring report"}, ["monitoring", "annual report"]),
    ("report", "Lindqvist, Hannah; Rybak, Tomasz; Bekele, Meron; Natarajan, Priya", "2025-12", "Annual report 2025: Kiel Bight eelgrass monitoring transects", "Coastal Ecology Lab, Kiel University", {"reportType": "Monitoring report"}, ["monitoring", "annual report"]),
    ("thesis", "Holm, Jakob", "2022", "Shoot density and epiphyte cover of Zostera marina at Falckenstein Beach", "Christian-Albrechts-Universität zu Kiel", {"thesisType": "BSc thesis"}, ["student thesis"]),
    ("thesis", "Weber, Clara", "2023", "Drone-derived meadow extent versus diver transects in Eckernförde Bay", "Christian-Albrechts-Universität zu Kiel", {"thesisType": "MSc thesis"}, ["student thesis", "remote sensing"]),
    ("thesis", "Natarajan, Priya", "2026", "Seed-based restoration of Zostera marina in the Schlei estuary", "Christian-Albrechts-Universität zu Kiel", {"thesisType": "MSc thesis (draft)"}, ["student thesis", "restoration"]),
    ("dataset", "Rybak, Tomasz", "2023", "UAV orthomosaics of eelgrass meadows, Kiel Bight, summer 2022", "Zenodo", {"DOI": "10.5281/zenodo.8123456"}, ["data", "remote sensing"]),
    ("document", "Lindqvist, Hannah", "2026-02", "Lab onboarding guide: safety, boat use, data management", "", {}, ["admin", "onboarding"]),
    ("document", "Rybak, Tomasz", "2025-10", "Boat log and Bootsführerschein list – RV Polarfuchs", "", {}, ["admin"]),
]
SEAGRASS_CURATED = [x for x in D.PERSONAL if "restoration" in x[6]] + [
    ("report", "Dussault, Julien; Gallagher, Aoife", "2025-11", "Consortium deliverable D2.1: Harmonised monitoring protocol for restored meadows", "Seagrass Restoration Consortium", {"reportType": "Project deliverable"}, ["deliverable", "monitoring"]),
    ("report", "Lindqvist, Hannah", "2026-05", "Consortium deliverable D3.2: Carbon accounting guidance for restoration sites", "Seagrass Restoration Consortium", {"reportType": "Project deliverable"}, ["deliverable", "blue carbon"]),
]
STS_CURATED = [x for x in D.PERSONAL if "STS" in x[6]] + [
    ("book", "Jasanoff, Sheila", "2004", "States of Knowledge: The Co-production of Science and Social Order", "Routledge", {"place": "London"}, ["co-production"]),
    ("book", "Shapin, Steven; Schaffer, Simon", "1985", "Leviathan and the Air-Pump: Hobbes, Boyle, and the Experimental Life", "Princeton University Press", {"place": "Princeton, NJ"}, ["history of science"]),
    ("book", "Tsing, Anna Lowenhaupt", "2015", "The Mushroom at the End of the World: On the Possibility of Life in Capitalist Ruins", "Princeton University Press", {"place": "Princeton, NJ"}, ["multispecies"]),
    ("journalArticle", "MacKenzie, Donald", "2009", "Making things the same: Gases, emission rights and the politics of carbon markets", "Accounting, Organizations and Society", {"volume": "34", "issue": "3", "pages": "440-455", "DOI": "10.1016/j.aos.2008.02.004"}, ["carbon markets"]),
    ("journalArticle", "Lövbrand, Eva; Stripple, Johannes", "2011", "Making climate change governable: accounting for carbon as sinks, credits and personal budgets", "Critical Policy Studies", {"volume": "5", "issue": "2", "pages": "187-200", "DOI": "10.1080/19460171.2011.576531"}, ["carbon markets", "governmentality"]),
    ("journalArticle", "Helmreich, Stefan", "2011", "Nature/Culture/Seawater", "American Anthropologist", {"volume": "113", "issue": "1", "pages": "132-144", "DOI": "10.1111/j.1548-1433.2010.01311.x"}, ["ocean", "anthropology"]),
    ("bookSection", "Callon, Michel", "1986", "Some elements of a sociology of translation: domestication of the scallops and the fishermen of St Brieuc Bay", "Power, Action and Belief: A New Sociology of Knowledge?", {"publisher": "Routledge", "pages": "196-223", "bookEditors": "Law, John"}, ["ANT", "fisheries"]),
]


if __name__ == "__main__":
    seed_personal()
    g = GROUPS
    seed_group(g["Coastal Ecology Lab"], ["hlindqvist", "tomasz.r", "mbekele", "priya.n"],
               ["Protocols & SOPs", "Monitoring reports", "Student theses", "Lab meeting papers", "Datasets", "Admin"],
               LAB_CURATED, 45, ["lab meeting", "Kiel", "methods", "heatwave", "discuss"])
    seed_group(g["Seagrass Restoration Consortium"], ["jdussault", "hlindqvist", "aoife"],
               ["WP1 Site selection", "WP2 Planting methods", "WP3 Monitoring", "WP4 Carbon accounting", "Deliverables"],
               SEAGRASS_CURATED, 30, ["restoration", "monitoring", "WP lead review"])
    seed_group(g["STS Reading Group"], ["aoife", "hlindqvist", "priya.n"],
               ["Session 1: Boundary objects", "Session 2: Carbon accounting", "Session 3: Oceans", "Suggestions"],
               STS_CURATED, 0, [])
    # Colleagues' own personal libraries (smaller, they use altero less)
    uid = 2
    for user, n in [("tomasz.r", 42), ("aoife", 18), ("mbekele", 64), ("jdussault", 27), ("priya.n", 35)]:
        lib = f"/users/{uid}"
        ck = [zkey() for _ in range(3)]
        post_many(lib, "collections", [{"key": k, "name": nm, "parentCollection": False}
                                       for k, nm in zip(ck, ["Thesis", "Methods", "Reading"])], user)
        its = generated_articles(n, ck, ["to-read", "methods", "important"])
        post_many(lib, "items", its, user)
        kids, files, _ = children_for(its[: n // 3], lib, lambda it, u=user: u, pdf_share=0.5, note_share=0.1)
        post_many(lib, "items", kids, user)
        for f in files:
            upload(*f)
        uid += 1
    print("seed done")
