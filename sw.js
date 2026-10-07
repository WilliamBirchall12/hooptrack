// Service worker — no caching, always fetch fresh, show offline page if no connection
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover"/>
<title>HoopTrack — Offline</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0f1923;color:#e8edf5;font-family:'DM Sans',Arial,sans-serif;height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px 24px}
  .logo{font-size:56px;margin-bottom:20px;filter:drop-shadow(0 0 20px rgba(255,107,53,.4))}
  h1{font-size:28px;font-weight:800;margin-bottom:10px;letter-spacing:.5px}
  h1 em{color:#FF6B35;font-style:normal}
  p{font-size:15px;color:#8fa3b8;line-height:1.7;max-width:280px;margin-bottom:28px}
  .badge{background:rgba(255,107,53,.12);border:1px solid rgba(255,107,53,.3);border-radius:12px;padding:14px 20px;font-size:14px;color:#FF6B35;font-weight:600;margin-bottom:28px;max-width:300px}
  button{background:#FF6B35;color:#fff;border:none;border-radius:12px;padding:14px 32px;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 4px 20px rgba(255,107,53,.3)}
</style>
</head>
<body>
  <div class="logo">🏀</div>
  <h1>Hoop<em>Track</em></h1>
  <div class="badge">⚠ You're offline</div>
  <p>HoopTrack needs an internet connection to load your player data. Please connect to Wi-Fi or mobile data and try again.</p>
  <button onclick="window.location.reload()">Try again</button>
</body>
</html>`;

self.addEventListener('install', function() { self.skipWaiting(); });

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Only handle navigation requests (page loads) with offline fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response(OFFLINE_HTML, {
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
    return;
  }
  // All other requests go straight to network
  e.respondWith(fetch(e.request));
});
