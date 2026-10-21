/**
 * 本地账号 / 存档（演示用，非云端）
 */
(function (global) {
  const ROOT_KEY = "fatebound_gambit_v2_accounts";

  function loadRoot() {
    try {
      return JSON.parse(localStorage.getItem(ROOT_KEY) || "{}");
    } catch {
      return {};
    }
  }
  function saveRoot(root) {
    localStorage.setItem(ROOT_KEY, JSON.stringify(root));
  }

  function defaultProfile(account, password, daoName) {
    return {
      account,
      password, // 演示明文
      daoName: daoName || "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tutorialStep: 0,
      tutorialDone: false,
      currencies: { mingChen: 0, mingJing: 0, xianJing: 0 },
      warehouse: {}, // itemId -> count
      unlockedFate: ["FATE_001", "FATE_002", "FATE_003", "FATE_004", "FATE_005", "FATE_006", "FATE_009", "FATE_010"],
      unlockedHeritage: ["HERITAGE_001"],
      unlockedCompanions: ["COMP_HERO", "COMP_QINGTANG"],
      loadoutFate: [],
      equippedHeritage: ["HERITAGE_001"],
      loadout: { heritage: "HERITAGE_001", tian: "TIAN_001", dili: "DI_001", ren: "REN_001", relics: ["RELIC_115"] },
      worldProgress: { WORLD_QINGMU: { depthCleared: 0, unlockedDepth: 1 } },
      firstPayDone: {},
      chenYuanPity: 0,
      shopDaily: null,
      flags: {},
      runCount: 0,
      savedWorldRun: null,
      savedTraining: null,
    };
  }

  const SaveSystem = {
    listAccounts() {
      return Object.keys(loadRoot());
    },
    register(account, password, daoName) {
      account = String(account || "").trim();
      password = String(password || "");
      if (!account || !password) return { ok: false, msg: "请输入账号和密码" };
      const root = loadRoot();
      if (root[account]) return { ok: false, msg: "账号已存在" };
      // 道号可空：在开局剧情里再取名
      root[account] = defaultProfile(account, password, daoName || "");
      root[account].tutorialDone = false;
      root[account].daoName = daoName || "";
      saveRoot(root);
      return { ok: true, profile: root[account] };
    },
    nextTestAccount() {
      const root = loadRoot();
      let n = 1;
      while (root["test" + n]) n += 1;
      return "test" + n;
    },
    quickStart() {
      const account = this.nextTestAccount();
      const reg = this.register(account, "1", "鸿明");
      if (!reg.ok) return reg;
      return this.login(account, "1");
    },
    login(account, password) {
      account = String(account || "").trim();
      const root = loadRoot();
      const p = root[account];
      if (!p) return { ok: false, msg: "账号不存在" };
      if (String(p.password) !== String(password)) return { ok: false, msg: "密码错误" };
      p.updatedAt = Date.now();
      saveRoot(root);
      sessionStorage.setItem("fatebound_current", account);
      return { ok: true, profile: p };
    },
    currentAccount() {
      return sessionStorage.getItem("fatebound_current") || "";
    },
    logout() {
      sessionStorage.removeItem("fatebound_current");
    },
    getProfile(account) {
      account = account || this.currentAccount();
      return loadRoot()[account] || null;
    },
    writeProfile(profile) {
      if (!profile || !profile.account) return;
      const root = loadRoot();
      profile.updatedAt = Date.now();
      root[profile.account] = profile;
      saveRoot(root);
    },
    addCurrency(profile, key, amount) {
      profile.currencies[key] = Math.max(0, (profile.currencies[key] || 0) + amount);
    },
    spendCurrency(profile, key, amount) {
      if ((profile.currencies[key] || 0) < amount) return false;
      profile.currencies[key] -= amount;
      return true;
    },
    addWarehouse(profile, itemId, count = 1) {
      profile.warehouse[itemId] = (profile.warehouse[itemId] || 0) + count;
    },
    /** 仙晶 1:1 换命晶 */
    exchangeXianToMingJing(profile, amount) {
      amount = Math.floor(Number(amount) || 0);
      if (amount <= 0) return { ok: false, msg: "数量无效" };
      if (!this.spendCurrency(profile, "xianJing", amount)) return { ok: false, msg: "仙晶不足" };
      this.addCurrency(profile, "mingJing", amount);
      this.writeProfile(profile);
      return { ok: true };
    },
  };

  global.FateSave = SaveSystem;
})(window);
