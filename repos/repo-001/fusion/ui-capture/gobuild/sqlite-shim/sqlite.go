// Package sqlite is a build-time stand-in for modernc.org/sqlite, used only because
// modernc.org (GitLab-hosted) modules are unreachable from the capture sandbox.
// It exposes the tiny API surface Fusion uses (driver name "sqlite" and
// RegisterConnectionHook) backed by github.com/mattn/go-sqlite3 (cgo).
package sqlite

import (
	"database/sql"
	"database/sql/driver"
	"sync"

	sqlite3 "github.com/mattn/go-sqlite3"
)

type ExecQuerierContext interface {
	driver.ExecerContext
	driver.QueryerContext
}

var (
	mu    sync.Mutex
	hooks []func(ExecQuerierContext, string) error
)

func RegisterConnectionHook(fn func(ExecQuerierContext, string) error) {
	mu.Lock()
	defer mu.Unlock()
	hooks = append(hooks, fn)
}

func init() {
	sql.Register("sqlite", &sqlite3.SQLiteDriver{
		ConnectHook: func(c *sqlite3.SQLiteConn) error {
			mu.Lock()
			hs := append([]func(ExecQuerierContext, string) error(nil), hooks...)
			mu.Unlock()
			for _, h := range hs {
				if err := h(c, ""); err != nil {
					return err
				}
			}
			return nil
		},
	})
}
