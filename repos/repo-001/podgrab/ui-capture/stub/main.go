// Local stand-in for the outside world Podgrab talks to: podcast RSS feeds,
// cover art, episode audio, and the iTunes / PodcastIndex / gpodder search APIs.
package main

import (
	"encoding/json"
	"fmt"
	"hash/fnv"
	"log"
	"math/rand"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
)

var base string

// Anchor: the "latest" moment in the feeds. Episodes later than now are hidden.
var anchor = time.Date(2026, 11, 17, 5, 0, 0, 0, time.UTC)

type Episode struct {
	Num      int
	GUID     string
	Title    string
	Summary  string
	Pub      time.Time
	Duration int
	Type     string
	Size     int64
	Image    string
}

func seedFor(s string) int64 {
	h := fnv.New64a()
	h.Write([]byte(s))
	return int64(h.Sum64() & 0x7fffffffffffffff)
}

func fill(p string, r *rand.Rand, sh *Show) string {
	for _, k := range []struct {
		key  string
		list []string
	}{{"{A}", sh.A}, {"{B}", sh.B}, {"{C}", sh.C}} {
		for strings.Contains(p, k.key) && len(k.list) > 0 {
			p = strings.Replace(p, k.key, k.list[r.Intn(len(k.list))], 1)
		}
	}
	return p
}

var episodeCache = map[string][]Episode{}

func episodes(sh *Show) []Episode {
	if e, ok := episodeCache[sh.Slug]; ok {
		return e
	}
	r := rand.New(rand.NewSource(seedFor(sh.Slug)))
	used := map[string]bool{}
	var eps []Episode
	t := anchor.Add(-time.Duration(sh.LatestHoursAgo) * time.Hour)
	num := sh.StartNum
	hand := 0
	for i := 0; i < sh.Count; i++ {
		var title string
		etype := "full"
		if hand < len(sh.Titles) {
			title = sh.Titles[hand]
			hand++
		} else {
			for tries := 0; tries < 50; tries++ {
				title = fill(sh.Patterns[r.Intn(len(sh.Patterns))], r, sh)
				if !used[title] {
					break
				}
			}
		}
		used[title] = true
		display := title
		if strings.HasPrefix(title, "BONUS") || strings.HasPrefix(title, "Bonus") {
			etype = "bonus"
		} else if strings.HasPrefix(title, "Trailer") || strings.HasPrefix(title, "Introducing") {
			etype = "trailer"
		} else if sh.NumFmt != "" {
			display = fmt.Sprintf(sh.NumFmt, num, title)
		}
		dur := (sh.DurMin*60 + r.Intn((sh.DurMax-sh.DurMin+1)*60))
		if etype != "full" {
			dur = dur / 3
		}
		summ := summary(sh, title, r, dur)
		guid := fmt.Sprintf("%s-%04d", sh.Slug, num)
		if etype != "full" {
			guid = fmt.Sprintf("%s-%s-%d", sh.Slug, etype, i)
		}
		img := base + "/art/" + sh.Slug + ".svg"
		if sh.EpArt && etype == "full" {
			img = fmt.Sprintf("%s/art/%s/ep%d.svg", base, sh.Slug, num)
		}
		// typical 96-128 kbps mp3
		kbps := []int{96, 128, 128, 64}[r.Intn(4)]
		eps = append(eps, Episode{Num: num, GUID: guid, Title: display, Summary: summ, Pub: t,
			Duration: dur, Type: etype, Size: int64(dur*kbps*1000/8) + int64(r.Intn(400000)), Image: img})
		if etype == "full" {
			num--
		}
		gap := sh.Cadence + (r.Float64()*2-1)*sh.Jitter
		if gap < 0.5 {
			gap = 0.5
		}
		if sh.Hiatus > 0 && i == sh.Hiatus {
			gap += 70 // a summer break in the archive
		}
		t = t.Add(-time.Duration(gap*24*float64(time.Hour)) + time.Duration(r.Intn(90)-45)*time.Minute)
		if num <= 0 {
			break
		}
	}
	episodeCache[sh.Slug] = eps
	return eps
}

func summary(sh *Show, title string, r *rand.Rand, dur int) string {
	b := sh.Blurbs[r.Intn(len(sh.Blurbs))]
	subject := title
	if i := strings.Index(subject, ": "); i > 0 && i < 12 {
		subject = subject[i+2:]
	}
	s := strings.ReplaceAll(b, "{t}", subject)
	s = fill(s, r, sh)
	var sb strings.Builder
	sb.WriteString("<p>" + s + "</p>")
	switch r.Intn(4) {
	case 0: // long show notes with chapter markers
		sb.WriteString("<p>In this episode:</p><ul>")
		m := 0
		for _, ch := range []string{"Intro and housekeeping", "Listener mail", "Main topic: " + subject, "Follow-ups from last week", "Recommendations", "Wrap-up"} {
			if r.Intn(3) == 0 && m > 0 {
				continue
			}
			sb.WriteString(fmt.Sprintf("<li>(%02d:%02d) %s</li>", m/60, m%60, ch))
			m += 2 + r.Intn(dur/60/4+1)
		}
		sb.WriteString("</ul>")
		if sh.Sponsor != "" {
			sb.WriteString("<p>" + sh.Sponsor + "</p>")
		}
	case 1:
		if sh.Outro != "" {
			sb.WriteString("<p>" + sh.Outro + "</p>")
		}
	}
	return sb.String()
}

func xmlEsc(s string) string {
	r := strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", `"`, "&quot;")
	return r.Replace(s)
}

func feed(w http.ResponseWriter, sh *Show) {
	w.Header().Set("Content-Type", "application/rss+xml; charset=utf-8")
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
`)
	img := base + "/art/" + sh.Slug + ".svg"
	fmt.Fprintf(&b, "<title>%s</title>\n<link>https://%s.example.fm</link>\n<language>en-us</language>\n", xmlEsc(sh.Title), sh.Slug)
	fmt.Fprintf(&b, "<description>%s</description>\n<itunes:summary>%s</itunes:summary>\n<itunes:author>%s</itunes:author>\n", xmlEsc(sh.Summary), xmlEsc(sh.Summary), xmlEsc(sh.Author))
	fmt.Fprintf(&b, "<itunes:category text=\"%s\"/>\n<image><url>%s</url><title>%s</title></image>\n<itunes:image href=\"%s\"/>\n", xmlEsc(sh.Category), img, xmlEsc(sh.Title), img)
	now := time.Now()
	for _, e := range episodes(sh) {
		if e.Pub.After(now) {
			continue
		}
		fmt.Fprintf(&b, "<item>\n<title>%s</title>\n<guid isPermaLink=\"false\">%s</guid>\n<pubDate>%s</pubDate>\n", xmlEsc(e.Title), e.GUID, e.Pub.Format(time.RFC1123Z))
		fmt.Fprintf(&b, "<description>%s</description>\n<itunes:episodeType>%s</itunes:episodeType>\n<itunes:duration>%d</itunes:duration>\n", xmlEsc(e.Summary), e.Type, e.Duration)
		fmt.Fprintf(&b, "<itunes:image href=\"%s\"/>\n<enclosure url=\"%s/audio/%s/%s.mp3\" length=\"%d\" type=\"audio/mpeg\"/>\n</item>\n", e.Image, base, sh.Slug, e.GUID, e.Size)
	}
	b.WriteString("</channel>\n</rss>\n")
	w.Write([]byte(b.String()))
}

// A few seconds of valid, silent MPEG-1 Layer III (128 kbps, 44.1 kHz, mono).
var silentMP3 = func() []byte {
	frame := make([]byte, 417)
	frame[0], frame[1], frame[2], frame[3] = 0xFF, 0xFB, 0x90, 0xC0
	var out []byte
	for i := 0; i < 230; i++ { // ~6 seconds
		out = append(out, frame...)
	}
	return out
}()

func findShow(slug string) *Show {
	for i := range shows {
		if shows[i].Slug == slug {
			return &shows[i]
		}
	}
	return nil
}

func matches(sh *Show, q string) bool {
	q = strings.ToLower(strings.Trim(q, `"`))
	if q == "" {
		return false
	}
	hay := strings.ToLower(sh.Title + " " + sh.Author + " " + sh.Category + " " + sh.Summary)
	for _, w := range strings.Fields(q) {
		if !strings.Contains(hay, w) {
			return false
		}
	}
	return true
}

func searchResults(q string) []*Show {
	var res []*Show
	for i := range shows {
		if matches(&shows[i], q) {
			res = append(res, &shows[i])
		}
	}
	sort.SliceStable(res, func(i, j int) bool { return strings.Contains(strings.ToLower(res[i].Title), strings.ToLower(q)) && !strings.Contains(strings.ToLower(res[j].Title), strings.ToLower(q)) })
	return res
}

func main() {
	port := os.Getenv("STUB_PORT")
	if port == "" {
		port = "4431"
	}
	base = "http://localhost:" + port
	mux := http.NewServeMux()
	mux.HandleFunc("/feed/", func(w http.ResponseWriter, r *http.Request) {
		slug := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/feed/"), ".xml")
		if sh := findShow(slug); sh != nil {
			feed(w, sh)
			return
		}
		http.NotFound(w, r)
	})
	mux.HandleFunc("/art/", func(w http.ResponseWriter, r *http.Request) {
		p := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/art/"), ".svg")
		parts := strings.SplitN(p, "/", 2)
		sh := findShow(parts[0])
		if sh == nil {
			http.NotFound(w, r)
			return
		}
		ep := 0
		if len(parts) == 2 {
			ep, _ = strconv.Atoi(strings.TrimPrefix(parts[1], "ep"))
		}
		w.Header().Set("Content-Type", "image/svg+xml")
		w.Header().Set("Cache-Control", "public, max-age=86400")
		w.Write([]byte(coverSVG(sh, ep)))
	})
	mux.HandleFunc("/audio/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "audio/mpeg")
		w.Header().Set("Accept-Ranges", "bytes")
		if r.Method == http.MethodHead {
			// report the real-world size from the feed enclosure
			parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/audio/"), "/")
			if sh := findShow(parts[0]); sh != nil && len(parts) == 2 {
				for _, e := range episodes(sh) {
					if e.GUID+".mp3" == parts[1] {
						w.Header().Set("Content-Length", strconv.FormatInt(e.Size, 10))
						return
					}
				}
			}
		}
		http.ServeContent(w, r, "a.mp3", anchor, strings.NewReader(string(silentMP3)))
	})
	// iTunes Search API
	mux.HandleFunc("/itunes/search", func(w http.ResponseWriter, r *http.Request) {
		res := searchResults(r.URL.Query().Get("term"))
		var out []map[string]interface{}
		for _, sh := range res {
			id := 1400000000 + seedFor(sh.Slug)%90000000
			art := base + "/art/" + sh.Slug + ".svg"
			out = append(out, map[string]interface{}{
				"wrapperType": "track", "kind": "podcast", "collectionId": id, "trackId": id,
				"artistName": sh.Author, "collectionName": sh.Title, "trackName": sh.Title,
				"collectionCensoredName": sh.Title, "trackCensoredName": sh.Title,
				"feedUrl": base + "/feed/" + sh.Slug + ".xml", "artworkUrl30": art, "artworkUrl60": art,
				"artworkUrl100": art, "artworkUrl600": art, "releaseDate": episodes(sh)[0].Pub.Format(time.RFC3339),
				"collectionExplicitness": "notExplicit", "trackExplicitness": "cleaned", "trackCount": sh.Count,
				"country": "USA", "currency": "USD", "primaryGenreName": sh.Category,
				"genreIds": []string{"1318", "26"}, "genres": []string{sh.Category, "Podcasts"},
			})
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"resultCount": len(out), "results": out})
	})
	// PodcastIndex API (search/byterm)
	mux.HandleFunc("/podcastindex/search/byterm", func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query().Get("q")
		res := searchResults(q)
		var feeds []map[string]interface{}
		for _, sh := range res {
			art := base + "/art/" + sh.Slug + ".svg"
			feeds = append(feeds, map[string]interface{}{
				"id": seedFor(sh.Slug) % 6000000, "title": sh.Title, "url": base + "/feed/" + sh.Slug + ".xml",
				"originalUrl": base + "/feed/" + sh.Slug + ".xml", "link": "https://" + sh.Slug + ".example.fm",
				"description": sh.Summary, "author": sh.Author, "ownerName": sh.Author, "image": art, "artwork": art,
				"lastUpdateTime": episodes(sh)[0].Pub.Unix(), "lastCrawlTime": anchor.Unix(), "lastParseTime": anchor.Unix(),
				"lastGoodHttpStatusTime": anchor.Unix(), "lastHttpStatus": 200, "contentType": "application/rss+xml",
				"itunesId": 1400000000 + seedFor(sh.Slug)%90000000, "generator": "", "language": "en-us",
				"type": 0, "dead": 0, "crawlErrors": 0, "parseErrors": 0,
				"categories": map[string]string{"55": sh.Category},
			})
		}
		w.Header().Set("Content-Type", "application/json")
		status := "true"
		json.NewEncoder(w).Encode(map[string]interface{}{"status": status, "feeds": feeds, "count": len(feeds), "query": q, "description": "Found matching feeds"})
	})
	mux.HandleFunc("/gpodder/search.json", func(w http.ResponseWriter, r *http.Request) {
		res := searchResults(r.URL.Query().Get("q"))
		var out []map[string]interface{}
		for _, sh := range res {
			art := base + "/art/" + sh.Slug + ".svg"
			out = append(out, map[string]interface{}{"url": base + "/feed/" + sh.Slug + ".xml", "title": sh.Title,
				"author": sh.Author, "description": sh.Summary, "subscribers": 120 + seedFor(sh.Slug)%4000,
				"logo_url": art, "scaled_logo_url": art, "website": "https://" + sh.Slug + ".example.fm"})
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(out)
	})
	mux.HandleFunc("/catalog.json", func(w http.ResponseWriter, r *http.Request) {
		// used by the seeder
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(shows)
	})
	log.Printf("stub listening on %s", base)
	log.Fatal(http.ListenAndServe("127.0.0.1:"+port, mux))
}
