package main

import (
	"fmt"
	"math/rand"
	"strings"
)

func wrap(title string, max int) []string {
	var lines []string
	cur := ""
	for _, w := range strings.Fields(title) {
		if cur == "" {
			cur = w
		} else if len(cur)+1+len(w) <= max {
			cur += " " + w
		} else {
			lines = append(lines, cur)
			cur = w
		}
	}
	if cur != "" {
		lines = append(lines, cur)
	}
	return lines
}

func coverSVG(sh *Show, ep int) string {
	r := rand.New(rand.NewSource(seedFor(sh.Slug + "art")))
	c1, c2, fg := sh.Colors[0], sh.Colors[1], sh.Colors[2]
	var b strings.Builder
	fmt.Fprintf(&b, `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">`)
	fmt.Fprintf(&b, `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient></defs>`, c1, c2)
	b.WriteString(`<rect width="600" height="600" fill="url(#g)"/>`)
	switch sh.Motif {
	case 0: // concentric rings
		cx, cy := 420+r.Intn(120), 120+r.Intn(120)
		for i := 1; i <= 7; i++ {
			fmt.Fprintf(&b, `<circle cx="%d" cy="%d" r="%d" fill="none" stroke="%s" stroke-opacity="%.2f" stroke-width="%d"/>`, cx, cy, i*45, fg, 0.35-float64(i)*0.04, 3+i)
		}
	case 1: // sound wave bars
		for i := 0; i < 30; i++ {
			h := 20 + r.Intn(160)
			fmt.Fprintf(&b, `<rect x="%d" y="%d" width="12" height="%d" rx="6" fill="%s" fill-opacity="0.28"/>`, 30+i*18, 140-h/2, h, fg)
		}
	case 2: // stars/dots
		for i := 0; i < 90; i++ {
			fmt.Fprintf(&b, `<circle cx="%d" cy="%d" r="%.1f" fill="%s" fill-opacity="%.2f"/>`, r.Intn(600), r.Intn(330), 0.8+r.Float64()*3, fg, 0.3+r.Float64()*0.6)
		}
	case 3: // diagonal stripes
		for i := -6; i < 12; i++ {
			fmt.Fprintf(&b, `<rect x="%d" y="-100" width="22" height="520" fill="%s" fill-opacity="0.12" transform="rotate(35 300 300)"/>`, i*60, fg)
		}
	case 4: // big circle + horizon
		fmt.Fprintf(&b, `<circle cx="300" cy="230" r="150" fill="%s" fill-opacity="0.85"/>`, fg)
		for i := 0; i < 6; i++ {
			fmt.Fprintf(&b, `<rect x="0" y="%d" width="600" height="%d" fill="%s"/>`, 250+i*22, 6+i*2, c2)
		}
	case 5: // grid
		for i := 0; i <= 600; i += 40 {
			fmt.Fprintf(&b, `<line x1="%d" y1="0" x2="%d" y2="600" stroke="%s" stroke-opacity="0.15"/><line x1="0" y1="%d" x2="600" y2="%d" stroke="%s" stroke-opacity="0.15"/>`, i, i, fg, i, i, fg)
		}
		fmt.Fprintf(&b, `<rect x="60" y="60" width="160" height="160" fill="none" stroke="%s" stroke-width="10"/>`, fg)
	case 6: // leaves / blobs
		for i := 0; i < 9; i++ {
			fmt.Fprintf(&b, `<ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="%s" fill-opacity="0.22" transform="rotate(%d %d %d)"/>`, 60+r.Intn(480), 40+r.Intn(260), 30+r.Intn(50), 12+r.Intn(18), fg, r.Intn(180), 300, 150)
		}
	}
	lines := wrap(strings.ToUpper(sh.Title), 12)
	size := 72
	if len(lines) > 2 {
		size = 58
	}
	y := 600 - 70 - len(lines)*size
	for _, l := range lines {
		y += size
		fmt.Fprintf(&b, `<text x="40" y="%d" font-family="Helvetica, Arial, sans-serif" font-weight="800" font-size="%d" fill="%s" letter-spacing="1">%s</text>`, y, size, fg, xmlEsc(l))
	}
	fmt.Fprintf(&b, `<text x="42" y="%d" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="%s" fill-opacity="0.85">%s</text>`, y+42, fg, xmlEsc(sh.Author))
	if ep > 0 {
		fmt.Fprintf(&b, `<rect x="410" y="30" width="160" height="70" rx="12" fill="%s"/><text x="490" y="78" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="800" font-size="36" fill="%s">EP %d</text>`, fg, c1, ep)
	}
	b.WriteString(`</svg>`)
	return b.String()
}
