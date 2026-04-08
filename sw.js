const CACHE_NAME = "gemma-model-cache-v1";

// 你需要快取的模型 URL 關鍵字 (必須與 index.html 中的 MODEL_URL 匹配)
const MODEL_FILE_EXTENSION = ".task";

self.addEventListener("install", (event) => {
  // 立即激活新的 Service Worker
  self.skipWaiting();
  console.log("[Service Worker] Installed");
});

self.addEventListener("activate", (event) => {
  // 清理舊版本的 Cache
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("[Service Worker] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// 攔截 Fetch 請求
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // 只攔截模型的下載請求
  if (url.includes(MODEL_FILE_EXTENSION)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // 1. 檢查 Cache 中是否已經有這個模型
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          console.log("[Service Worker] 從本地 Cache 提取模型:", url);
          return cachedResponse;
        }

        // 2. 如果沒有，從網絡下載並存入 Cache
        console.log("[Service Worker] 首次下載模型並進行快取:", url);
        try {
          const networkResponse = await fetch(event.request);
          // 確保請求成功才寫入 Cache (狀態碼 200)
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          console.error("[Service Worker] 模型下載失敗:", error);
          throw error;
        }
      }),
    );
  }
});
