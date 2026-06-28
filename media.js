/* ============================================================
   CENSA — stockage média local (IndexedDB)
   Images et vidéos sont conservées comme Blobs dans IndexedDB
   (bien plus de place que localStorage). On ne garde que la clé
   média dans les comptes / posts / stories.
   API : window.Media = { put, getURL, del, imageBlob, isVideo }
   ============================================================ */
(function () {
  const DB = 'censa_media', STORE = 'blobs';
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  const urlCache = new Map();

  async function put(blob) {
    const db = await open();
    const key = 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    await new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
    return key;
  }
  async function getBlob(key) {
    if (!key) return null;
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readonly');
      const rq = tx.objectStore(STORE).get(key);
      rq.onsuccess = () => res(rq.result || null);
      rq.onerror = () => rej(rq.error);
    });
  }
  async function getURL(key) {
    if (!key) return null;
    // clé déjà distante (Supabase Storage) ou data/blob URL : renvoyée telle quelle
    if (/^(https?:|blob:|data:)/.test(key)) return key;
    if (urlCache.has(key)) return urlCache.get(key);
    const blob = await getBlob(key);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urlCache.set(key, url);
    return url;
  }
  async function del(key) {
    if (!key) return;
    const db = await open();
    db.transaction(STORE, 'readwrite').objectStore(STORE).delete(key);
    if (urlCache.has(key)) { try { URL.revokeObjectURL(urlCache.get(key)); } catch (e) {} urlCache.delete(key); }
  }
  /* redimensionne une image (fichier) → Blob JPEG compact */
  async function imageBlob(file, maxDim, quality) {
    maxDim = maxDim || 1280; quality = quality || 0.85;
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      let w = img.naturalWidth, h = img.naturalHeight;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      w = Math.max(1, Math.round(w * scale)); h = Math.max(1, Math.round(h * scale));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      return await new Promise(r => c.toBlob(r, 'image/jpeg', quality));
    } finally { URL.revokeObjectURL(url); }
  }
  function isVideo(file) { return file && file.type && file.type.indexOf('video') === 0; }

  /* Durée d'un fichier vidéo (en secondes), via les métadonnées. */
  function duration(file) {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file);
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = () => { const d = v.duration; URL.revokeObjectURL(url); resolve(isFinite(d) ? d : 0); };
        v.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
        v.src = url;
      } catch (e) { resolve(0); }
    });
  }

  window.Media = { put, getBlob, getURL, del, imageBlob, isVideo, duration };
})();
