// ui-capture only (not part of gbdraw): reopen the user's saved Session when the
// page opens, through the app's own Load Session file input — the same path as
// clicking "Load Session" and picking the file. Add ?blank to the URL to skip.
(() => {
  if (new URLSearchParams(window.location.search).has('blank')) return;
  const SESSION_URL = './ui-capture-data/current.gbdraw-session.json.gz';
  const SESSION_NAME = 'Streptomyces_AG-cluster-comparison.gbdraw-session.json.gz';
  const started = Date.now();
  const tryLoad = async () => {
    const input = document.querySelector('input[type="file"][accept^=".json,.gz"]');
    const loadButton = document.querySelector('button[aria-label="Load Session"], button[title="Load Session"]')
      || (input && input.parentElement && input.parentElement.querySelector('button[aria-busy]'));
    const sessionReady = input && loadButton && !loadButton.disabled
      && document.querySelector('[data-session-busy-reason]') === null;
    if (!sessionReady) {
      if (Date.now() - started < 60000) setTimeout(tryLoad, 250);
      return;
    }
    try {
      const response = await fetch(SESSION_URL);
      if (!response.ok) return;
      const blob = await response.blob();
      const file = new File([blob], SESSION_NAME, { type: 'application/gzip', lastModified: Date.parse('2026-11-14T16:42:00Z') });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      // Like the app's "Load example": open the loaded diagram fitted to the preview.
      const fitStarted = Date.now();
      const fit = () => {
        const button = document.querySelector('button[aria-label="Fit to preview"]');
        const loading = input.closest('body').querySelector('[aria-busy="true"]');
        if (button && !loading) { setTimeout(() => button.click(), 400); return; }
        if (Date.now() - fitStarted < 60000) setTimeout(fit, 300);
      };
      setTimeout(fit, 500);
    } catch (error) {
      console.warn('ui-capture autoload failed', error);
    }
  };
  window.addEventListener('load', () => setTimeout(tryLoad, 300));
})();
