import { TrailBar, useTrailLabel } from '../components/Chrome';

export default function HelpPage({ route }) {
  useTrailLabel(route.hash, 'How to Use This Site');
  return (
    <div className="container page prose">
      <TrailBar route={route} crumbs={[{ label: 'How to use this site' }]} />
      <h1>How to use this site</h1>
      <p>This site holds every issue of the Gazette since March 1988. Here is how to find your way around.</p>

      <h2>Are you reading this month’s paper or an old one?</h2>
      <p>
        Look at the colored bar under the name of the paper. <strong>Green</strong> means you are reading the current issue.
        <strong> Brown</strong> means you are reading an older issue from the archive. The bar always names the issue you are on.
      </p>

      <h2>Finding an old story</h2>
      <ol>
        <li>Type a few words into the search box, such as a street name or a person’s name. Then press <strong>Search</strong>.</li>
        <li>If you know roughly when it ran, set the <strong>From</strong> and <strong>To</strong> years, and tick the seasons you think it was in. Spring is March to May, summer is June to August.</li>
        <li>Or open <a href="#/archive">the archive</a>, pick a year, and then a month.</li>
        <li>Streets have their own pages under <a href="#/places">Places</a>. The page for a street lists every story about it, newest first, and you can show just one year.</li>
      </ol>

      <h2>Getting back to where you were</h2>
      <p>
        Each page has a <strong>← Back to …</strong> link at the top that returns you to the page you came from. The path at the top of the page
        (for example, Archive › 1994 › June 1994) lets you go up one level at a time. The browser’s Back button also works.
      </p>

      <h2>Reading the old stories</h2>
      <p>
        Stories from 1988 to 2009 were scanned from the printed pages, so some words may be garbled. The search still finds them when the
        spelling is close, for example “Tannerv” for “Tannery.” Use the <strong>A+</strong> buttons at the top right to make the text larger.
      </p>

      <h2>Need help?</h2>
      <p>Volunteers are at the Millrace Library on Saturday mornings through December. They can help you search, or print a story for you.</p>
    </div>
  );
}
