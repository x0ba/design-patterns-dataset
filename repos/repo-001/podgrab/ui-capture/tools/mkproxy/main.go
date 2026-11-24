// mkproxy builds a file:// GOPROXY for modules whose vanity import hosts
// (golang.org, gorm.io, go.uber.org, gopkg.in, honnef.co) are unreachable from
// the sandbox, by fetching the same sources from their GitHub mirrors.
// go.sum still verifies every .mod and .zip hash.
package main

import (
	"archive/tar"
	"archive/zip"
	"bufio"
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

var repos = map[string]string{
	"go.uber.org/atomic": "uber-go/atomic", "go.uber.org/multierr": "uber-go/multierr",
	"go.uber.org/tools": "uber-go/tools", "go.uber.org/zap": "uber-go/zap",
	"golang.org/x/crypto": "golang/crypto", "golang.org/x/lint": "golang/lint", "golang.org/x/mod": "golang/mod",
	"golang.org/x/net": "golang/net", "golang.org/x/sync": "golang/sync", "golang.org/x/sys": "golang/sys",
	"golang.org/x/text": "golang/text", "golang.org/x/tools": "golang/tools", "golang.org/x/xerrors": "golang/xerrors",
	"gopkg.in/check.v1": "go-check/check", "gopkg.in/errgo.v2": "go-errgo/errgo", "gopkg.in/fsnotify.v1": "fsnotify/fsnotify",
	"gopkg.in/tomb.v1": "go-tomb/tomb", "gopkg.in/yaml.v2": "go-yaml/yaml",
	"gorm.io/driver/sqlite": "go-gorm/sqlite", "gorm.io/gorm": "go-gorm/gorm", "honnef.co/go/tools": "dominikh/go-tools",
}

var pseudo = regexp.MustCompile(`-(\d{14})-([0-9a-f]{12})$`)

func ref(v string) string {
	if m := pseudo.FindStringSubmatch(v); m != nil {
		return m[2]
	}
	if v == "v0.0.1-2019.2.3" {
		return "2019.2.3"
	}
	return v
}

func get(url string) ([]byte, int, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	return b, resp.StatusCode, err
}

func main() {
	out := os.Args[1]
	gosum := os.Args[2]
	f, _ := os.Open(gosum)
	sc := bufio.NewScanner(f)
	type mv struct{ mod, ver string; zip bool }
	seen := map[string]*mv{}
	var order []string
	for sc.Scan() {
		parts := strings.Fields(sc.Text())
		if len(parts) < 2 {
			continue
		}
		if _, ok := repos[parts[0]]; !ok {
			continue
		}
		v := strings.TrimSuffix(parts[1], "/go.mod")
		k := parts[0] + "@" + v
		if seen[k] == nil {
			seen[k] = &mv{parts[0], v, false}
			order = append(order, k)
		}
		if !strings.HasSuffix(parts[1], "/go.mod") {
			seen[k].zip = true
		}
	}
	for _, k := range order {
		m := seen[k]
		dir := filepath.Join(out, strings.ToLower(m.mod), "@v") // no uppercase in these paths
		os.MkdirAll(dir, 0755)
		repo := repos[m.mod]
		r := ref(m.ver)
		modFile := filepath.Join(dir, m.ver+".mod")
		if _, err := os.Stat(modFile); err != nil {
			b, code, err := get("https://raw.githubusercontent.com/" + repo + "/" + r + "/go.mod")
			if err != nil {
				panic(err)
			}
			if code == 404 && pseudo.MatchString(m.ver) {
				b, code, err = get("https://github.com/" + repo + "/raw/" + r + "/go.mod")
			}
			if code == 404 {
				b = []byte("module " + m.mod + "\n")
			} else if code != 200 {
				panic(fmt.Sprintf("%s: %d", k, code))
			}
			os.WriteFile(modFile, b, 0644)
			os.WriteFile(filepath.Join(dir, m.ver+".info"), []byte(`{"Version":"`+m.ver+`","Time":"2020-01-01T00:00:00Z"}`), 0644)
		}
		if m.zip {
			zf := filepath.Join(dir, m.ver+".zip")
			if _, err := os.Stat(zf); err == nil {
				continue
			}
			if err := mkzip(zf, repo, r, m.mod, m.ver); err != nil {
				panic(k + ": " + err.Error())
			}
		}
		fmt.Println("ok", k, m.zip)
	}
	// list files
	for _, k := range order {
		m := seen[k]
		lf := filepath.Join(out, m.mod, "@v", "list")
		fh, _ := os.OpenFile(lf, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		fmt.Fprintln(fh, m.ver)
		fh.Close()
	}
}

func mkzip(zf, repo, r, mod, ver string) error {
	resp, err := http.Get("https://codeload.github.com/" + repo + "/tar.gz/" + r)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("codeload %d", resp.StatusCode)
	}
	gz, err := gzip.NewReader(resp.Body)
	if err != nil {
		return err
	}
	tr := tar.NewReader(gz)
	type file struct{ name string; data []byte }
	var files []file
	submods := map[string]bool{}
	for {
		h, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		if h.Typeflag != tar.TypeReg {
			continue
		}
		name := h.Name[strings.Index(h.Name, "/")+1:]
		data, _ := io.ReadAll(tr)
		if filepath.Base(name) == "go.mod" && name != "go.mod" {
			submods[filepath.Dir(name)] = true
		}
		files = append(files, file{name, data})
	}
	out, _ := os.Create(zf)
	defer out.Close()
	zw := zip.NewWriter(out)
	prefix := mod + "@" + ver + "/"
outer:
	for _, f := range files {
		for _, el := range strings.Split(f.name, "/") {
			if el == ".git" || el == ".hg" || el == ".svn" || el == ".bzr" || el == "vendor" {
				continue outer
			}
		}
		for d := range submods {
			if strings.HasPrefix(f.name, d+"/") {
				continue outer
			}
		}
		w, err := zw.Create(prefix + f.name)
		if err != nil {
			return err
		}
		w.Write(f.data)
	}
	return zw.Close()
}
