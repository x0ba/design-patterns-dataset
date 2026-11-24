// Loads a built page in jsdom, runs scripts/dist/index.js and reports what the
// client-side components rendered. usage: node check-js.cjs <path-in-out> [query]
const {JSDOM} = require('jsdom'); const fs = require('fs'); const path = require('path')
const out = path.join(__dirname, '..', 'out'), page = process.argv[2], q = process.argv[3] || ''
const html = fs.readFileSync(path.join(out, page, 'index.html'), 'utf8').replace(/<script[^>]*src="\/scripts[^>]*><\/script>/, '').replace(/<script[^>]*bootstrap[^>]*><\/script>/, '')
const dom = new JSDOM(html, {url: 'http://localhost' + page + q, runScripts: 'dangerously', pretendToBeVisual: true})
const w = dom.window
w.XMLHttpRequest = class { open(m, u){this.u=u} setRequestHeader(){} getAllResponseHeaders(){return 'content-type: application/json'} send(){ this.readyState=4; this.status=200; this.responseText=fs.readFileSync(path.join(out, this.u.replace(/\?.*/,''))); this.response=this.responseText; setTimeout(()=>{this.onload&&this.onload(); this.onreadystatechange&&this.onreadystatechange()},0)} }
const s = w.document.createElement('script'); s.textContent = fs.readFileSync(path.join(out, 'scripts/dist/index.js'), 'utf8'); w.document.body.appendChild(s)
setTimeout(() => {
  const d = w.document
  console.log('count:', d.querySelector('[data-hook=datasets-count]')?.textContent.trim().replace(/\s+/g,' '))
  console.log('items:', d.querySelectorAll('[data-hook=datasets-items] > *').length)
  const cf = d.querySelector('[data-component=categories-filter]'); if (cf) console.log('cat filter:', [...cf.children].slice(0,6).map(a=>a.textContent.trim().replace(/\s+/g,' ')).join(' | '))
  const of = d.querySelector('[data-component=organizations-filter]'); if (of) console.log('org filter:', of.children.length, 'items')
}, 500)
