/*
 * UI-capture seed loader (not part of Huey itself; injected only into the .ui-capture/out build).
 *
 * Huey keeps datasources in memory only (they are local files the user picks each session),
 * so this script replays what an established user does when they open Huey: it registers
 * their usual data files through the app's own upload path (uploadUi.uploadFiles, the same
 * code the "Upload..." button runs), and - if no report is in the URL - opens their usual
 * report by navigating to its route (the same #<base64 state> links Huey writes to the URL).
 */
(function () {
  const SEED_BASE = new URL('seed/', document.baseURI).href;

  // If the page is (re)loaded with a report route in the URL, hold it back until the data files
  // are registered; otherwise Huey would prompt "Datasource not found" before they are loaded.
  // (This script runs synchronously, before the deferred module that boots Huey.)
  let initialRoute;
  if (location.hash.length > 1) {
    initialRoute = location.hash.substring(1);
    history.replaceState(null, '', location.pathname + location.search);
  }

  function appReady() {
    try {
      return Boolean(window.hueyDb && window.hueyDb.connection)
        && typeof uploadUi !== 'undefined' && uploadUi
        && typeof datasourcesUi !== 'undefined' && datasourcesUi
        && typeof pageStateManager !== 'undefined' && pageStateManager
        && typeof secretsDialog !== 'undefined' && secretsDialog
        && typeof catalogsDialog !== 'undefined' && catalogsDialog;
    } catch (e) {
      return false;
    }
  }

  function waitFor(predicate, timeoutMs) {
    return new Promise((resolve, reject) => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        if (predicate()) { clearInterval(iv); resolve(); }
        else if (Date.now() - t0 > timeoutMs) { clearInterval(iv); reject(new Error('huey-seed: timeout')); }
      }, 50);
    });
  }

  async function fetchJson(name) {
    const r = await fetch(SEED_BASE + name, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`huey-seed: ${name}: ${r.status}`);
    return r.json();
  }

  // Saved Secrets / Remote Catalogs, stored through Huey's own IndexedDB document store
  // (AppDocumentStore). None autoload, so nothing tries to connect to the remote services.
  async function seedDocumentStore() {
    const docs = await fetchJson('documents.json');
    const store = AppDocumentStore.store;
    if (!await store.isInitialized()) {
      await store.init(docs.secretsPassword);
    }
    for (const doc of docs.catalogs) {
      if (!await store.exists(AppDocumentStore.STORE_CATALOGS, doc.name)) {
        await store.store(AppDocumentStore.STORE_CATALOGS, doc);
      }
    }
    for (const doc of docs.secrets) {
      if (!await store.exists(AppDocumentStore.STORE_SECRETS, doc.name)) {
        await store.store(AppDocumentStore.STORE_SECRETS, doc, docs.secretsPassword);
      }
    }
    // refresh the managers' lists, as the dialogs do themselves after the user saves a document
    await secretsDialog.updateDocumentsList();
    await catalogsDialog.updateDocumentsList();
  }

  async function seed() {
    await waitFor(appReady, 120000);
    try {
      await seedDocumentStore();
    } catch (error) {
      console.warn('huey-seed: document store seeding skipped', error);
    }
    const manifest = await fetchJson('data/manifest.json');

    const files = await Promise.all(manifest.files.map(async name => {
      const r = await fetch(SEED_BASE + 'data/' + encodeURIComponent(name), { cache: 'no-cache' });
      const blob = await r.blob();
      return new File([blob], name, { type: name.endsWith('.csv') ? 'text/csv' : '', lastModified: Date.parse('2025-11-14T09:12:00Z') });
    }));

    await uploadUi.uploadFiles(files);
    uploadUi.getDialog().close();

    let route = initialRoute;
    if (!route) {
      let reports = null;
      try { reports = await fetchJson('reports.json'); } catch (e) { /* no reports */ }
      if (reports && reports.defaultReport) {
        route = Routing.getRouteForQueryModel(reports.defaultReport);
      }
    }
    if (route) {
      // same as following a saved Huey report link; mark done once the pivot table has rendered
      const rendered = new Promise(resolve => {
        pivotTableUi.addEventListener('updated', event => {
          if (event.eventData && event.eventData.status === 'success') resolve();
        });
        setTimeout(resolve, 20000);
      });
      await pageStateManager.setPageState(route);
      await rendered;
      // let the busy overlay close and the table paint
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    document.documentElement.setAttribute('data-huey-seeded', 'true');
  }

  seed().catch(error => console.error('huey-seed failed', error));
})();
