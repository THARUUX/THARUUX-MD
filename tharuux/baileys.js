let mod;

async function load() {
  if (!mod) mod = await import("@whiskeysockets/baileys");
  return mod;
}

module.exports = new Proxy({}, {
  get(_, prop) {
    return async (...args) => {
      const m = await load();
      const val = m[prop];

      if (typeof val === "function") {
        return val(...args);
      }

      return val;
    };
  }
});
