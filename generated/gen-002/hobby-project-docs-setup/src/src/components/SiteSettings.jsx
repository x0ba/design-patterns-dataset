const EXAMPLE_URL = 'https://hale-chem.github.io/elemental.nvim/';

export default function SiteSettings({ config, onChange, baseUrlSet, latestRelease, onBack, onOpenHelp }) {
  const url = config.baseUrl.trim();
  const lineOf = latestRelease.split('.').slice(0, 2).join('.');
  const urlError = url && !baseUrlSet ? 'A base URL must start with https:// and end with /' : '';
  const publishPath = `${baseUrlSet ? url : EXAMPLE_URL}${config.version}/`;

  return (
    <div className="settings">
      <header className="settings-head">
        <div>
          <h1>Site settings</h1>
          <p className="hint">Applies to every page on the site.</p>
        </div>
        <button className="link" onClick={onBack}>
          Back to pages
        </button>
      </header>

      <section className="card">
        <h2>Site name</h2>
        <input
          className="wide"
          value={config.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
        <p className="hint">Shown in the site header and the browser tab.</p>
      </section>

      <section className="card">
        <h2>Version</h2>
        <div className="version-row">
          <input
            className="narrow"
            value={config.version}
            onChange={(event) => onChange({ version: event.target.value })}
            aria-label="Docs version"
          />
          <span className="chip">Latest release {latestRelease}</span>
        </div>
        <p>
          The version labels this set of docs and names the folder they publish to. It does not read your plugin's
          version, and it does not change the Changelog. Specifically, it:
        </p>
        <ul className="plain">
          <li>
            appears in the header as “{config.title} {config.version} docs”;
          </li>
          <li>
            sets the publish folder, so pages go to <code>…/{config.version}/</code>;
          </li>
          <li>
            keeps older doc sets online under their own folders when you publish a new one.
          </li>
        </ul>
        <p>
          <button className="link" onClick={() => onOpenHelp('versioning')}>
            Read the versioning guide
          </button>
        </p>
        <p className="note-box">
          {config.version === lineOf ? (
            <>
              Your latest release is {latestRelease}. That is a patch on the {lineOf} line, so <code>{config.version}</code>{' '}
              is the right value. Change it when you start documenting the next minor release.
            </>
          ) : (
            <>
              Your latest release is {latestRelease}. This docs set is labelled <code>{config.version}</code>, which
              doesn't match the {lineOf} line. Check that this is what you want.
            </>
          )}
        </p>
      </section>

      <section className="card">
        <h2>Base URL</h2>
        <input
          className="wide"
          value={config.baseUrl}
          placeholder={EXAMPLE_URL}
          aria-invalid={Boolean(urlError)}
          onChange={(event) => onChange({ baseUrl: event.target.value })}
        />
        {urlError && <p className="error-text">{urlError}</p>}
        {!config.baseUrl && (
          <div className="inline-actions">
            <p className="hint">Where the site will live. Publishing needs it.</p>
            <button className="link" onClick={() => onChange({ baseUrl: EXAMPLE_URL })}>
              Use {EXAMPLE_URL}
            </button>
          </div>
        )}
        <p className="hint">
          Pages publish to <code>{publishPath}</code>
        </p>
        <p>
          <button className="link" onClick={() => onOpenHelp('publishing')}>
            What publishing checks
          </button>
        </p>
      </section>
    </div>
  );
}
