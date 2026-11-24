// Entry used by the capture build: seed the browser store first, then start the app.
// fonts.css replaces the Google Fonts <link> (Inter) with locally bundled files.
import './seed.js'
import './fonts.css'
import '../../src/main.jsx'
