/**
 * Storage wrapper: Telegram CloudStorage in production, localStorage in dev.
 * Telegram CloudStorage limits: 1024 keys, 4096 bytes per value.
 */

function getTelegramCloudStorage() {
  try {
    const tg = window.Telegram?.WebApp;
    if (tg?.CloudStorage) return tg.CloudStorage;
  } catch {}
  return null;
}

function promisify(method, ...args) {
  return new Promise((resolve, reject) => {
    method(...args, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

const cloud = {
  async get(key) {
    const cs = getTelegramCloudStorage();
    if (cs) {
      const val = await promisify(cs.getItem.bind(cs), key);
      return val || null;
    }
    return localStorage.getItem(key);
  },

  async set(key, value) {
    const cs = getTelegramCloudStorage();
    if (cs) {
      await promisify(cs.setItem.bind(cs), key, value);
      return;
    }
    localStorage.setItem(key, value);
  },

  async remove(key) {
    const cs = getTelegramCloudStorage();
    if (cs) {
      await promisify(cs.removeItem.bind(cs), key);
      return;
    }
    localStorage.removeItem(key);
  },

  async getKeys() {
    const cs = getTelegramCloudStorage();
    if (cs) {
      return await promisify(cs.getKeys.bind(cs));
    }
    return Object.keys(localStorage);
  },
};

export default cloud;
