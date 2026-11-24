// Seeds Podgrab the way an established user's instance would look: it subscribes
// to shows through the app's HTTP API (which fetches feeds from the local stub
// and auto-downloads episodes), replays months of listening history via the API
// (downloads, played, bookmarks, deletes, tags, pausing), then back-dates
// timestamps in the SQLite database so the history is spread over ~14 months.
package main

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"database/sql"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

type Show struct {
	Slug, Title       string
	Subscribe         bool
	SubscribedDaysAgo int
	Tags              []string
	Paused            bool
	ListenRate        float64
	Bookmarks         int
	ExtraDownloads    int
	Cadence           float64
}

type Item struct {
	ID             string
	Title          string
	GUID           string
	PubDate        time.Time
	DownloadStatus int
	IsPlayed       bool
	EpisodeType    string
}

var app, stub string
var now = time.Now()

func must(err error) {
	if err != nil {
		log.Fatal(err)
	}
}

func getJSON(u string, v interface{}) {
	resp, err := http.Get(u)
	must(err)
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	if v != nil {
		if err := json.Unmarshal(b, v); err != nil {
			log.Fatalf("%s: %v: %s", u, err, b)
		}
	}
}

func postJSON(u string, body interface{}, v interface{}) int {
	b, _ := json.Marshal(body)
	resp, err := http.Post(u, "application/json", bytes.NewReader(b))
	must(err)
	defer resp.Body.Close()
	rb, _ := io.ReadAll(resp.Body)
	if v != nil {
		json.Unmarshal(rb, v)
	}
	return resp.StatusCode
}

func items(podID string) []Item {
	var its []Item
	getJSON(app+"/podcasts/"+podID+"/items", &its)
	return its
}

func item(id string) Item {
	var it Item
	getJSON(app+"/podcastitems/"+id, &it)
	return it
}

func waitStatus(id string, want int) {
	for i := 0; i < 100; i++ {
		if item(id).DownloadStatus == want {
			return
		}
		time.Sleep(30 * time.Millisecond)
	}
	log.Printf("timeout waiting for %s -> %d", id, want)
}

type rss struct {
	Items []struct {
		GUID      string `xml:"guid"`
		Enclosure struct {
			Length int64 `xml:"length,attr"`
		} `xml:"enclosure"`
	} `xml:"channel>item"`
}

func main() {
	app = os.Args[1]
	stub = os.Args[2]
	dbPath := os.Args[3]
	r := rand.New(rand.NewSource(20261117))

	var shows []Show
	getJSON(stub+"/catalog.json", &shows)
	var subs []Show
	for _, s := range shows {
		if s.Subscribe {
			subs = append(subs, s)
		}
	}
	sort.Slice(subs, func(i, j int) bool { return subs[i].SubscribedDaysAgo > subs[j].SubscribedDaysAgo })

	// Settings as this user has them configured.
	form := url.Values{
		"downloadOnAdd": {"true"}, "initialDownloadCount": {"5"}, "autoDownload": {"true"},
		"appendDateToFileName": {"false"}, "appendEpisodeNumberToFileName": {"false"}, "darkMode": {"false"},
		"downloadEpisodeImages": {"false"}, "generateNFOFile": {"false"}, "dontDownloadDeletedFromDisk": {"true"},
		"baseUrl": {""}, "maxDownloadConcurrency": {"3"}, "userAgent": {""},
	}
	resp, err := http.PostForm(app+"/settings", form)
	must(err)
	resp.Body.Close()

	// Tags
	tagDesc := map[string]string{
		"Tech": "Homelab, software and tech news", "News": "Current events", "Daily": "Short shows that drop (almost) every day",
		"History": "", "Storytelling": "Narrative / serialized shows", "Weekly Listen": "Don't miss these — listen the week they come out",
		"Money": "Personal finance and economics", "Science": "Space, physics, nature", "Interviews": "",
		"Hobbies": "Garden, games, fermenting", "Relaxing": "Good for falling asleep to", "Games": "",
		"Health": "Running & fitness", "Books": "", "Comedy": "", "Family": "Parenting stuff for me and Sam", "Learning": "Spanish practice on the commute",
	}
	tagIDs := map[string]string{}
	tagOrder := []string{"Weekly Listen", "Tech", "News", "History", "Science", "Money", "Storytelling", "Daily", "Interviews", "Hobbies", "Relaxing", "Games", "Health", "Books", "Comedy", "Learning", "Family"}
	for _, t := range tagOrder {
		var tag struct{ ID string }
		postJSON(app+"/tags", map[string]string{"label": t, "description": tagDesc[t]}, &tag)
		tagIDs[t] = tag.ID
	}

	type podInfo struct {
		ID    string
		Show  Show
		SubAt time.Time
	}
	var pods []podInfo
	for _, s := range subs {
		var pod struct{ ID string }
		code := postJSON(app+"/podcasts", map[string]string{"url": stub + "/feed/" + s.Slug + ".xml"}, &pod)
		if code != 200 {
			log.Fatalf("add %s: %d", s.Slug, code)
		}
		// wait for episodes and initial downloads
		for i := 0; i < 100; i++ {
			its := items(pod.ID)
			queued := 0
			for _, it := range its {
				if it.DownloadStatus == 0 {
					queued++
				}
			}
			if len(its) > 0 && queued == 0 {
				break
			}
			time.Sleep(100 * time.Millisecond)
		}
		for _, t := range s.Tags {
			postJSON(app+"/podcasts/"+pod.ID+"/tags/"+tagIDs[t], nil, nil)
		}
		subAt := now.Add(-time.Duration(s.SubscribedDaysAgo)*24*time.Hour - time.Duration(r.Intn(600))*time.Minute)
		pods = append(pods, podInfo{pod.ID, s, subAt})
		log.Printf("subscribed %s", s.Title)
	}

	// Replay listening history.
	queuedLeft := 0
	for _, p := range pods {
		s := p.Show
		its := items(p.ID)
		sort.Slice(its, func(i, j int) bool { return its[i].PubDate.After(its[j].PubDate) })
		pausedAt := now.Add(time.Hour)
		if s.Paused {
			pausedAt = p.SubAt.Add(now.Sub(p.SubAt) * 6 / 10)
		}
		want := map[string]bool{}
		played := map[string]bool{}
		backCount := 0
		var back []Item
		for idx, it := range its {
			if it.PubDate.After(p.SubAt) {
				if it.PubDate.Before(pausedAt) {
					want[it.ID] = true
				}
				// newest episodes are less likely to have been listened to yet
				rate := s.ListenRate
				if idx < 2 {
					rate *= 0.35
				}
				if it.PubDate.Before(pausedAt) && r.Float64() < rate {
					played[it.ID] = true
				}
			} else {
				if backCount < 5 {
					want[it.ID] = true // downloaded when first subscribed
					if r.Float64() < s.ListenRate {
						played[it.ID] = true
					}
				} else {
					back = append(back, it)
					if r.Float64() < s.ListenRate*0.15 {
						played[it.ID] = true
					}
				}
				backCount++
			}
		}
		for i := 0; i < s.ExtraDownloads && len(back) > 0; i++ {
			k := r.Intn(len(back))
			want[back[k].ID] = true
			if r.Float64() < 0.7 {
				played[back[k].ID] = true
			}
			back = append(back[:k], back[k+1:]...)
		}
		// cleanup habit: played episodes get deleted after a while
		retention := 9999.0
		switch s.Slug {
		case "the-morning-wire", "mind-the-gap":
			retention = 7
		case "signal-and-noise", "late-shift", "ship-it-weekly":
			retention = 60
		case "self-hosted-weekly", "kitchen-table-economics":
			retention = 150
		}
		var deletes []string
		for _, it := range its {
			age := now.Sub(it.PubDate).Hours() / 24
			// daily news gets cleared out after two weeks whether or not it was heard
			stale := s.Slug == "the-morning-wire" && age > 14
			if want[it.ID] && (played[it.ID] && age > retention || stale) {
				deletes = append(deletes, it.ID)
			}
		}
		// a couple of fresh episodes still waiting in the download queue
		leaveQueued := ""
		if (s.Slug == "the-morning-wire" || s.Slug == "late-shift") && queuedLeft < 2 {
			leaveQueued = its[0].ID
			queuedLeft++
		}
		for _, it := range its {
			if it.ID == leaveQueued {
				continue
			}
			if want[it.ID] && it.DownloadStatus != 2 {
				getJSON(app+"/podcastitems/"+it.ID+"/download", nil)
				waitStatus(it.ID, 2)
			} else if !want[it.ID] && it.DownloadStatus == 2 {
				getJSON(app+"/podcastitems/"+it.ID+"/delete", nil)
				waitStatus(it.ID, 3)
			}
			if played[it.ID] {
				getJSON(app+"/podcastitems/"+it.ID+"/markPlayed", nil)
			}
		}
		for _, id := range deletes {
			getJSON(app+"/podcastitems/"+id+"/delete", nil)
			waitStatus(id, 3)
		}
		// bookmarks: favourites among played episodes
		var pl []string
		for _, it := range its {
			if played[it.ID] {
				pl = append(pl, it.ID)
			}
		}
		r.Shuffle(len(pl), func(i, j int) { pl[i], pl[j] = pl[j], pl[i] })
		for i := 0; i < s.Bookmarks && i < len(pl); i++ {
			getJSON(app+"/podcastitems/"+pl[i]+"/bookmark", nil)
		}
		if s.Paused {
			getJSON(app+"/podcasts/"+p.ID+"/pause", nil)
		}
		if leaveQueued != "" {
			// put it back in the queue as auto-download would have
			db0, _ := sql.Open("sqlite3", dbPath)
			db0.Exec(`UPDATE podcast_items SET download_status=0 WHERE id=?`, leaveQueued)
			db0.Close()
		}
		log.Printf("history for %s: %d episodes, %d downloaded-ever, %d played, %d cleaned up", s.Title, len(its), len(want), len(played), len(deletes))
	}
	time.Sleep(time.Second)

	// Back-date timestamps directly in the app's SQLite schema.
	db, err := sql.Open("sqlite3", dbPath+"?_busy_timeout=10000")
	must(err)
	defer db.Close()
	for _, p := range pods {
		must2(db.Exec(`UPDATE podcasts SET created_at=?, updated_at=? WHERE id=?`, p.SubAt, p.SubAt.Add(time.Minute), p.ID))
		// file sizes from the feed's enclosure lengths
		sizes := map[string]int64{}
		resp, err := http.Get(stub + "/feed/" + p.Show.Slug + ".xml")
		must(err)
		var feed rss
		xml.NewDecoder(resp.Body).Decode(&feed)
		resp.Body.Close()
		for _, it := range feed.Items {
			sizes[it.GUID] = it.Enclosure.Length
		}
		rows, err := db.Query(`SELECT id, guid, pub_date, download_status, bookmark_date FROM podcast_items WHERE podcast_id=?`, p.ID)
		must(err)
		type row struct {
			id, guid string
			pub      time.Time
			status   int
			bm       time.Time
		}
		var rs []row
		for rows.Next() {
			var x row
			must(rows.Scan(&x.id, &x.guid, &x.pub, &x.status, &x.bm))
			rs = append(rs, x)
		}
		rows.Close()
		for _, x := range rs {
			created := p.SubAt.Add(time.Duration(r.Intn(40)) * time.Second)
			if x.pub.After(p.SubAt) {
				created = x.pub.Add(time.Duration(3+r.Intn(55)) * time.Minute)
				if created.After(now) {
					created = now.Add(-time.Minute)
				}
			}
			updated := created.Add(time.Duration(2+r.Intn(30)) * time.Minute)
			var dl interface{} = nil
			if x.status == 2 {
				d := created.Add(time.Duration(30+r.Intn(400)) * time.Second)
				if d.After(now) {
					d = now
				}
				dl = d
			}
			var bm interface{} = nil
			if !x.bm.IsZero() && x.bm.Year() > 1 {
				b := x.pub.Add(time.Duration(6+r.Intn(24*20)) * time.Hour)
				if b.Before(created) {
					b = created.Add(time.Duration(2+r.Intn(48)) * time.Hour)
				}
				if b.After(now) {
					b = now.Add(-time.Duration(r.Intn(120)) * time.Minute)
				}
				bm = b
			}
			if dl != nil {
				must2(db.Exec(`UPDATE podcast_items SET download_date=? WHERE id=?`, dl, x.id))
			}
			if bm != nil {
				must2(db.Exec(`UPDATE podcast_items SET bookmark_date=? WHERE id=?`, bm, x.id))
			}
			must2(db.Exec(`UPDATE podcast_items SET created_at=?, updated_at=?, file_size=? WHERE id=?`, created, updated, sizes[x.guid], x.id))
		}
	}
	first := pods[0].SubAt
	must2(db.Exec(`UPDATE tags SET created_at=?, updated_at=?`, first.Add(26*time.Hour), first.Add(26*time.Hour)))
	must2(db.Exec(`UPDATE settings SET created_at=?, updated_at=?`, first.Add(-20*time.Minute), now.Add(-9*24*time.Hour)))
	must2(db.Exec(`DELETE FROM job_locks`))
	must2(db.Exec(`UPDATE podcast_items SET download_date=?, download_path='' WHERE download_status=0`, time.Time{}))
	db.Close()

	// The app's cron writes a DB backup every two days and keeps a handful.
	backupDir := filepath.Join(filepath.Dir(dbPath), "backups")
	os.MkdirAll(backupDir, 0755)
	dbBytes, _ := os.ReadFile(dbPath)
	for i := 0; i < 5; i++ {
		t := now.Add(-time.Duration(i*48+r.Intn(3)) * time.Hour).Add(-time.Duration(r.Intn(3600)) * time.Second)
		name := filepath.Join(backupDir, "podgrab_backup_"+t.Format("2006.01.02_150405")+".tar.gz")
		var buf bytes.Buffer
		gz := gzip.NewWriter(&buf)
		tw := tar.NewWriter(gz)
		tw.WriteHeader(&tar.Header{Name: "podgrab.db", Mode: 0644, Size: int64(len(dbBytes)), ModTime: t})
		tw.Write(dbBytes)
		tw.Close()
		gz.Close()
		os.WriteFile(name, buf.Bytes(), 0644)
		os.Chtimes(name, t, t)
	}
	fmt.Println(strings.Repeat("-", 20), "seed complete")
}

func must2(_ sql.Result, err error) {
	if err != nil {
		log.Fatal(err)
	}
}
