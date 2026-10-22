/**
 * 复赛桥接：新手走初赛流程；青崖峰后接基地、深度世界、拼刀训练。
 */
(function (global) {
  const $ = (id) => document.getElementById(id);
  const SUIT_KEY = { SPADE: "S", HEART: "H", CLUB: "C", DIAMOND: "D" };
  const SUIT_SYM = { S: "♠", H: "♥", C: "♣", D: "♦" };
  const RANK_PIP = { A: 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13 };
  const STEM = { 1: "甲", 2: "乙", 3: "丙", 4: "丁", 5: "戊", 6: "己", 7: "庚", 8: "辛", 9: "壬", 10: "癸", 11: "日", 12: "月", 13: "星" };
  const ELEM = { S: "水", H: "火", C: "木", D: "金" };
  const BASE_INTRO =
    (global.FateContentPack && global.FateContentPack.BASE_INTRO) ||
    "师兄，欢迎回到青崖峰。世界之门能再入有深度的世界；命运阁可以查看命运卡组；演武场专门练习拼刀战斗。我会一直在这里等你回来。";

  const Bridge = {
    config: null,
    profile: null,
    mode: "chushi",
    run: null,
    battle: null,
    selected: new Set(),
    battleNode: null,
    training: false,
    loadout: null,
    _handlersBound: false,
  };

  function toast(msg, ms) {
    if (typeof global.showToast === "function") return global.showToast(msg, ms);
    const el = $("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("active");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("active"), ms || 1800);
  }
  function startBgm(kind) {
    if (typeof global.startBgm === "function") global.startBgm(kind);
  }
  function hydrateBg(el) {
    if (typeof global.hydrateBackground === "function") global.hydrateBackground(el);
  }
  function hydratePortraits(el) {
    if (typeof global.hydratePortraits === "function") global.hydratePortraits(el);
  }
  function showModalSafe(title, text) {
    if (typeof global.showModal === "function") showModal(title, text);
    else alert(title + "\n" + text);
  }
  function showModalHtmlSafe(title, html, onClose) {
    if (typeof global.showModalHtml === "function") {
      showModalHtml(title, html, onClose);
      requestAnimationFrame(() => {
        const body = $("modalText");
        if (body) body.scrollTop = 0;
      });
      return;
    }
    showModalSafe(title, String(html).replace(/<[^>]+>/g, " "));
  }
  function closeModalSafe() {
    if (typeof global.closeModal === "function") closeModal();
  }

  function mergePack(raw) {
    const pack = global.FateContentPack || {};
    const cfg = {
      sheets: raw.sheets || {},
      fateCards: Object.assign({}, raw.fateCards || {}),
      monsters: raw.monsters || {},
      relics: Object.assign({}, raw.relics || {}),
      heritages: Object.assign({}, raw.heritages || {}),
      renSkills: Object.assign({}, raw.renSkills || {}),
      companions: raw.companions || {},
      warehouseItems: Object.assign({}, raw.warehouseItems || {}),
      raw,
    };
    Object.assign(cfg.fateCards, pack.fateCards || {});
    Object.values(pack.fateCards || {}).forEach((row) => {
      const arr = cfg.sheets["07_命运卡"] || (cfg.sheets["07_命运卡"] = []);
      const i = arr.findIndex((x) => x.命运卡ID === row.命运卡ID);
      if (i >= 0) arr[i] = Object.assign({}, arr[i], row);
      else arr.push(row);
    });
    Object.assign(cfg.heritages, pack.heritages || {});
    Object.assign(cfg.renSkills, pack.renSkills || {});
    Object.assign(cfg.relics, pack.relics || {});
    (pack.tian || []).forEach((row) => {
      const arr = cfg.sheets["10_天时"] || (cfg.sheets["10_天时"] = []);
      const i = arr.findIndex((x) => x.天时ID === row.天时ID);
      if (i >= 0) arr[i] = Object.assign({}, arr[i], row);
      else arr.push(row);
    });
    (pack.dili || []).forEach((row) => {
      const arr = cfg.sheets["11_地利"] || (cfg.sheets["11_地利"] = []);
      const i = arr.findIndex((x) => x.地利ID === row.地利ID);
      if (i >= 0) arr[i] = Object.assign({}, arr[i], row);
      else arr.push(row);
    });
    Object.values(pack.renSkills || {}).forEach((row) => {
      const arr = cfg.sheets["12_人和"] || (cfg.sheets["12_人和"] = []);
      const i = arr.findIndex((x) => x.人和ID === row.人和ID);
      if (i >= 0) arr[i] = Object.assign({}, arr[i], row);
      else arr.push(row);
    });
    (pack.worlds || []).forEach((row) => {
      const arr = cfg.sheets["13_世界"] || (cfg.sheets["13_世界"] = []);
      const i = arr.findIndex((x) => x.世界ID === row.世界ID);
      if (i >= 0) arr[i] = Object.assign({}, arr[i], row);
      else arr.push(row);
    });
    return cfg;
  }

  async function loadConfig() {
    if (Bridge.config) return Bridge.config;
    const res = await fetch("data/config.json");
    if (!res.ok) throw new Error("config load fail");
    Bridge.config = mergePack(await res.json());
    return Bridge.config;
  }

  function daoName() {
    return (
      (Bridge.profile && Bridge.profile.daoName) ||
      (global.state && state.player && state.player.name) ||
      "鸿明"
    );
  }
  function fillDao(text) {
    return String(text || "").replace(/\{道号\}/g, daoName()).replace(/男主/g, daoName());
  }
  function migrateWorldProgress(p) {
    if (!p) return;
    p.worldProgress = p.worldProgress || {};
    p.worldProgress.WORLD_QINGMU = p.worldProgress.WORLD_QINGMU || { depthCleared: 0, unlockedDepth: 1 };
    p.worldProgress.WORLD_YAO = p.worldProgress.WORLD_YAO || { depthCleared: 0, unlockedDepth: 0 };
    if (p.tutorialDone) {
      p.worldProgress.WORLD_QINGMU.unlockedDepth = Math.max(p.worldProgress.WORLD_QINGMU.unlockedDepth || 1, 2);
      p.worldProgress.WORLD_YAO.unlockedDepth = Math.max(p.worldProgress.WORLD_YAO.unlockedDepth || 0, 1);
    }
    ensureFateDecks(p);
    ensureHeritageLevels(p);
  }
  function setProfile(p) {
    Bridge.profile = p;
    migrateWorldProgress(p);
  }
  function saveProfile() {
    if (Bridge.profile && global.FateSave) FateSave.writeProfile(Bridge.profile);
  }
  function syncDaoNameFromStory(name) {
    if (!Bridge.profile) return;
    Bridge.profile.daoName = name || Bridge.profile.daoName || "鸿明";
    saveProfile();
  }

  function grantPostTutorial(p) {
    if (!p) return;
    p.tutorialDone = true;
    p.tutorialStep = Math.max(p.tutorialStep || 0, 9);
    p.daoName = p.daoName || "鸿明";
    p.currencies.mingChen = Math.max(p.currencies.mingChen || 0, 80);
    p.currencies.mingJing = Math.max(p.currencies.mingJing || 0, 40);
    p.currencies.xianJing = Math.max(p.currencies.xianJing || 0, 20);
    const fates = new Set(p.unlockedFate || []);
    for (let i = 1; i <= 62; i++) fates.add("FATE_" + String(i).padStart(3, "0"));
    p.unlockedFate = [...fates];
    const hers = new Set(p.unlockedHeritage || []);
    hers.add("HERITAGE_001");
    for (let i = 31; i <= 49; i++) hers.add("HERITAGE_" + String(i).padStart(3, "0"));
    p.unlockedHeritage = [...hers];
    p.warehouse = p.warehouse || {};
    ["RELIC_115", "RELIC_116", "RELIC_117", "RELIC_095", "RELIC_096", "RELIC_085", "RELIC_025", "RELIC_039"].forEach((id) => {
      p.warehouse[id] = Math.max(p.warehouse[id] || 0, 1);
    });
    for (let i = 118; i <= 133; i++) {
      const id = "RELIC_" + i;
      p.warehouse[id] = Math.max(p.warehouse[id] || 0, 1);
    }
    p.worldProgress = p.worldProgress || {};
    migrateWorldProgress(p);
    p.unlockedCompanions = Array.from(new Set([...(p.unlockedCompanions || []), "COMP_HERO", "COMP_QINGTANG"]));
    p.chenYuanPity = p.chenYuanPity || 0;
    (p.unlockedHeritage || []).forEach((id) => {
      const m = /^HERITAGE_(\d+)$/.exec(id);
      if (m) hers.add("HERITAGE_" + String(Number(m[1])).padStart(3, "0"));
    });
    p.unlockedHeritage = [...hers];
  }

  function onTutorialComplete() {
    if (Bridge.profile) {
      grantPostTutorial(Bridge.profile);
      saveProfile();
    }
    enterFushiBase({ playIntro: true });
  }

  function refreshBaseTopbar() {
    const p = Bridge.profile;
    const name = (p && p.daoName) || "鸿明";
    if ($("baseDao")) $("baseDao").textContent = name;
    if ($("baseShard") && p) $("baseShard").textContent = p.currencies.mingChen || 0;
    if ($("fushiMingJing") && p) $("fushiMingJing").textContent = p.currencies.mingJing || 0;
    if ($("fushiXianJing") && p) $("fushiXianJing").textContent = p.currencies.xianJing || 0;
  }

  function setBaseIntroMode(on) {
    const screen = $("baseScreen");
    if (!screen) return;
    screen.classList.toggle("intro-mode", on);
    screen.classList.toggle("hub-mode", !on);
    const scene = screen.querySelector(".scene-illustration");
    const panel = screen.querySelector(".bottom-panel");
    const grid = $("fushiBaseGrid");
    if (scene) scene.style.display = on ? "" : "none";
    if (panel) panel.style.display = on ? "" : "none";
    if (grid) grid.style.display = on ? "none" : "grid";
  }

  function ensureFushiBaseDom() {
    const screen = $("baseScreen");
    if (!screen) return;
    const oldEnd = $("endBtn");
    if (oldEnd && oldEnd.parentElement) oldEnd.parentElement.remove();

    let grid = $("fushiBaseGrid");
    if (!grid) {
      const existing = screen.querySelector(".base-grid");
      if (existing) {
        existing.id = "fushiBaseGrid";
        grid = existing;
      } else {
        grid = document.createElement("div");
        grid.id = "fushiBaseGrid";
        grid.className = "base-grid fushi-base-grid";
        screen.appendChild(grid);
      }
    }
    grid.innerHTML = "";
    const tiles = [
      { title: "世界之门", sub: "选世界入世", action: () => openDepthPicker() },
      { title: "命运阁", sub: "图鉴与组卡", action: () => showFateCodex() },
      { title: "传承台", sub: "装备战斗传承", action: () => showHeritage() },
      { title: "同伴", sub: "人和技能", action: () => showCompanions() },
      { title: "仓库", sub: "局外物品", action: () => showWarehouse() },
      { title: "充值", sub: "仙晶档位", action: () => openPayShop() },
      { title: "命晶商店", sub: "买命尘包裹", action: () => openJingShop() },
      { title: "尘缘相逢", sub: "限定同伴苏锦书", action: () => openChenYuan() },
      { title: "演武场", sub: "练习拼刀", action: () => openTrainingPicker() },
      { title: "图鉴", sub: "剧情回顾", action: () => showCodex() },
    ];
    tiles.forEach((t) => {
      const btn = document.createElement("button");
      btn.className = "base-tile";
      btn.innerHTML = `<strong>${t.title}</strong><span>${t.sub}</span>`;
      btn.onclick = t.action;
      grid.appendChild(btn);
    });

    const daoSpan = screen.querySelector(".topbar");
    if (daoSpan && !$("baseDao")) {
      daoSpan.innerHTML = `
        <span class="resource">道号 <b id="baseDao">鸿明</b></span>
        <span class="resource">命尘 <b id="baseShard">0</b></span>
        <span class="resource">命晶 <b id="fushiMingJing">0</b></span>
        <span class="resource">仙晶 <b id="fushiXianJing">0</b></span>
        <button class="topbar-btn review-open">回顾</button>
        <button class="topbar-btn quick-control-btn topbar-sound sound-toggle" aria-label="声音开关"></button>
      `;
      daoSpan.querySelectorAll(".sound-toggle").forEach((btn) => {
        if (typeof global.toggleSound === "function") btn.onclick = toggleSound;
      });
      daoSpan.querySelectorAll(".review-open").forEach((btn) => {
        if (typeof global.showReview === "function") btn.onclick = showReview;
      });
    }

    const box = screen.querySelector(".bottom-panel .dialog-box");
    if (box) {
      box.innerHTML = `
        <div class="speaker">青棠</div>
        <div id="fushiWelcome" class="dialog-text">${BASE_INTRO}</div>
        <div class="dialog-actions">
          <button id="baseIntroConfirm" class="primary-btn">确认</button>
        </div>
      `;
      $("baseIntroConfirm").onclick = () => setBaseIntroMode(false);
    }
    hydratePortraits(screen);
  }

  function enterFushiBase(opts) {
    const playIntro = !!(opts && opts.playIntro);
    Bridge.mode = "base";
    Bridge.training = false;
    if (global.state) state._fushiDeepBattle = false;
    startBgm("story");
    ensureFushiBaseDom();
    const name = (Bridge.profile && Bridge.profile.daoName) || "鸿明";
    const welcome = $("fushiWelcome");
    if (welcome) welcome.textContent = BASE_INTRO.replace(/^师兄/, name === "鸿明" ? "师兄" : name);
    refreshBaseTopbar();
    if (Bridge.profile && Bridge.profile.tutorialDone) {
      grantPostTutorial(Bridge.profile);
      saveProfile();
    }
    loadConfig().catch(() => {});
    setBaseIntroMode(playIntro);
    updateMapChrome();
    hideTrainBar();
    if (typeof global.switchScreen === "function") switchScreen("baseScreen");
    hydrateBg($("baseScreen") && $("baseScreen").querySelector(".painted-bg"));
    hydratePortraits($("baseScreen"));
  }

  function listById(dict, idKey) {
    return Object.values(dict || {}).filter((x) => x && (x[idKey] || x.名称));
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  async function withConfig(fn) {
    try {
      await loadConfig();
    } catch (e) {
      showModalSafe("提示", "配置未能加载。请用 start_game.bat 启动。");
      return;
    }
    fn();
  }
  function portraitClass(res) {
    const key = String(res || "");
    if (key.includes("qingtang")) return "p-qingtang";
    if (key.includes("merchant") || key.includes("su")) return "p-merchant";
    if (key.includes("villain")) return "p-villain";
    if (key.includes("master")) return "p-master";
    return "p-hero";
  }
  function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function shopDayCounts() {
    const p = Bridge.profile;
    const day = todayKey();
    if (!p.shopDaily || p.shopDaily.day !== day) p.shopDaily = { day, counts: {} };
    return p.shopDaily.counts;
  }
  function itemIcon(id, name) {
    if (String(id).indexOf("DUST") >= 0 || String(name).indexOf("命尘") >= 0) return "尘";
    if (String(id).indexOf("FATE") >= 0 || String(name).indexOf("命运") >= 0) return "命";
    if (String(id).indexOf("HERITAGE") >= 0 || String(name).indexOf("传承") >= 0) return "传";
    if (String(id).indexOf("RENAME") >= 0 || String(name).indexOf("改名") >= 0) return "名";
    if (String(id).indexOf("RELIC") >= 0) return "宝";
    if (String(id).indexOf("JADE") >= 0) return "玉";
    return "物";
  }
  function lookupItem(id) {
    const cfg = Bridge.config || {};
    return (cfg.warehouseItems && cfg.warehouseItems[id]) || (cfg.relics && cfg.relics[id]) || { 名称: id, 描述: "" };
  }
  function lookupRenRow(id) {
    return lookupRen(id) || {};
  }
  function setPickerMode(on) {
    const body = $("modalText");
    const card = document.querySelector("#modal .modal-card");
    if (body) body.classList.toggle("pinned", !!on);
    if (card) card.classList.toggle("picker-mode", !!on);
  }
  function closeSubModal() {
    const sub = $("subModal");
    if (sub) sub.classList.remove("active");
    if ($("subModalText")) $("subModalText").innerHTML = "";
  }
  function showSubModalHtml(title, html) {
    const sub = $("subModal");
    if ($("subModalTitle")) $("subModalTitle").textContent = title;
    if ($("subModalText")) $("subModalText").innerHTML = html;
    if ($("subModalClose")) $("subModalClose").onclick = closeSubModal;
    if (sub) sub.classList.add("active");
  }
  function ensureFateDecks(p) {
    if (!p) return [[], [], []];
    if (!Array.isArray(p.fateDecks) || p.fateDecks.length < 3) {
      const old = Array.isArray(p.loadoutFate) ? p.loadoutFate : [];
      p.fateDecks = [old.slice(), [], []];
    }
    p.fateDecks = [0, 1, 2].map((i) => (Array.isArray(p.fateDecks[i]) ? p.fateDecks[i] : []));
    return p.fateDecks;
  }
  function allFateCards() {
    const dict = (Bridge.config && Bridge.config.fateCards) || {};
    return Object.values(dict)
      .filter((c) => c && c.命运卡ID && c.类型 !== "撤离")
      .sort((a, b) => String(a.命运卡ID).localeCompare(String(b.命运卡ID)));
  }
  function fateCat(c) {
    if (c && c.展示分类) return c.展示分类;
    const t = (c && c.类型) || "";
    if (t === "战斗") return "战斗事件";
    if (t === "事件" || t === "商店") return "选项事件";
    if (t === "问心" || t === "灵藏") return "翻牌事件";
    const body = String((c && c.正文) || "");
    const name = String((c && c.名称) || "");
    if (t === "剧情" && ((name + body).indexOf("青棠") >= 0 || body.indexOf("苏锦书") >= 0)) return "对话事件";
    return "剧情事件";
  }
  function fatePath(c) {
    return (c && c.获取途径) || "新手完成";
  }
  function fateDustPrice(c) {
    return Number(c && c.命尘解锁价) || 0;
  }
  function isFateUnlocked(id) {
    return ((Bridge.profile && Bridge.profile.unlockedFate) || []).indexOf(id) >= 0;
  }
  function grantFateIds(ids, silent) {
    if (!Bridge.profile) return;
    const set = new Set(Bridge.profile.unlockedFate || []);
    let n = 0;
    (ids || []).forEach((id) => {
      if (id && !set.has(id)) {
        set.add(id);
        n += 1;
      }
    });
    Bridge.profile.unlockedFate = [...set];
    if (n && !silent) toast("命运卡解锁 ×" + n);
    return n;
  }
  function unlockFatesByPath(path) {
    const ids = allFateCards()
      .filter((c) => fatePath(c) === path)
      .map((c) => c.命运卡ID);
    return grantFateIds(ids, true);
  }
  function fateCardHtml(c, opts) {
    opts = opts || {};
    const on = !!opts.selected;
    const locked = !!opts.locked;
    const cls = "fate-pick-card" + (on ? " selected" : "") + (locked ? " locked" : "");
    const extra = locked
      ? `<p>获取：${esc(fatePath(c))}</p>${
          fateDustPrice(c) > 0
            ? `<button class="ghost-btn fate-unlock-btn" data-buy="${esc(c.命运卡ID)}">消耗 ${fateDustPrice(c)} 命尘解锁</button>`
            : ""
        }`
      : `<p>${esc(c.正文 || "")}</p>`;
    return `<button type="button" class="${cls}" data-fate="${esc(c.命运卡ID)}">
      <span class="tag">${esc(fateCat(c))}</span>
      <b>${esc(c.名称 || c.命运卡ID)}</b>
      ${extra}
    </button>`;
  }

  function showFateCodex() {
    withConfig(() => {
      const p = Bridge.profile;
      ensureFateDecks(p);
      Bridge.codexUi = Bridge.codexUi || { tab: "book", lock: "all", cat: "all", slot: 0 };
      const ui = Bridge.codexUi;
      const cats = ["all", "战斗事件", "选项事件", "翻牌事件", "剧情事件", "对话事件"];
      const catLabel = { all: "全部" };
      const chip = (key, val, label) =>
        `<button type="button" class="filter-chip${String(ui[key]) === String(val) ? " on" : ""}" data-k="${key}" data-v="${esc(val)}">${label}</button>`;
      const headBook = `<div class="filter-row">${chip("lock", "all", "全部")}${chip("lock", "on", "已解锁")}${chip("lock", "off", "未解锁")}</div>
        <div class="filter-row">${cats.map((c) => chip("cat", c, catLabel[c] || c)).join("")}</div>`;
      const decks = ensureFateDecks(p);
      const headDeck = `<div class="filter-row">${[0, 1, 2]
        .map((i) => chip("slot", String(i), `卡组${i + 1}（${(decks[i] || []).length}）`))
        .join("")}</div>
        <p class="pick-lead">点选已解锁命运卡存进当前卡组。世界之门补选时可直接套用。</p>`;
      showModalHtmlSafe(
        "命运阁",
        `<div class="picker-shell">
          <div class="picker-head">
            <div class="filter-row">${chip("tab", "book", "图鉴")}${chip("tab", "deck", "我的卡组")}</div>
            ${ui.tab === "deck" ? headDeck : headBook}
          </div>
          <div class="picker-scroll" id="fateCodexList"></div>
        </div>`
      );
      setPickerMode(true);
      const root = $("modalText");
      if (root) {
        root.querySelectorAll(".filter-chip").forEach((b) => {
          b.onclick = () => {
            const k = b.getAttribute("data-k");
            let v = b.getAttribute("data-v");
            if (k === "slot") v = Number(v);
            Bridge.codexUi[k] = v;
            showFateCodex();
          };
        });
      }
      renderFateCodexList();
    });
  }
  function renderFateCodexList() {
    const host = $("fateCodexList");
    if (!host) return;
    const p = Bridge.profile;
    const ui = Bridge.codexUi || { tab: "book", lock: "all", cat: "all", slot: 0 };
    const decks = ensureFateDecks(p);
    const slot = Number(ui.slot) || 0;
    const selected = new Set(decks[slot] || []);
    let list = allFateCards();
    if (ui.tab === "book") {
      if (ui.lock === "on") list = list.filter((c) => isFateUnlocked(c.命运卡ID));
      if (ui.lock === "off") list = list.filter((c) => !isFateUnlocked(c.命运卡ID));
      if (ui.cat && ui.cat !== "all") list = list.filter((c) => fateCat(c) === ui.cat);
    } else {
      list = list.filter((c) => isFateUnlocked(c.命运卡ID));
    }
    host.innerHTML =
      list
        .map((c) =>
          fateCardHtml(c, {
            selected: ui.tab === "deck" && selected.has(c.命运卡ID),
            locked: ui.tab === "book" && !isFateUnlocked(c.命运卡ID),
          })
        )
        .join("") || "<p class='pick-lead'>没有符合筛选的命运卡。</p>";
    host.querySelectorAll("[data-fate]").forEach((btn) => {
      btn.onclick = (ev) => {
        if (ev.target && ev.target.getAttribute && ev.target.getAttribute("data-buy")) return;
        const id = btn.getAttribute("data-fate");
        if (ui.tab === "deck") {
          const arr = ensureFateDecks(p)[slot];
          const i = arr.indexOf(id);
          if (i >= 0) arr.splice(i, 1);
          else arr.push(id);
          saveProfile();
          renderFateCodexList();
          return;
        }
        if (!isFateUnlocked(id)) return;
      };
    });
    host.querySelectorAll("[data-buy]").forEach((b) => {
      b.onclick = (ev) => {
        ev.stopPropagation();
        buyFateWithDust(b.getAttribute("data-buy"));
      };
    });
  }
  function buyFateWithDust(id) {
    const c = (Bridge.config.fateCards || {})[id];
    if (!c || !Bridge.profile) return;
    const price = fateDustPrice(c);
    if (price <= 0) return toast(fatePath(c) || "此卡不能用命尘解锁");
    if (isFateUnlocked(id)) return toast("已经解锁");
    if (!FateSave.spendCurrency(Bridge.profile, "mingChen", price)) return toast("命尘不足");
    grantFateIds([id], true);
    saveProfile();
    refreshBaseTopbar();
    toast(`已消耗 ${price} 命尘，解锁「${c.名称}」`);
    renderFateCodexList();
  }

  const HERO_BASE_ATK = 10;
  const HERO_BASE_HP = 100;
  const HERITAGE_DUST_PER_POINT = 200;
  const HERITAGE_GROW_HP = {
    HERITAGE_002: 1, HERITAGE_006: 1, HERITAGE_009: 1, HERITAGE_010: 1,
    HERITAGE_013: 1, HERITAGE_014: 1, HERITAGE_019: 1, HERITAGE_021: 1,
    HERITAGE_023: 1, HERITAGE_024: 1, HERITAGE_025: 1, HERITAGE_026: 1,
    HERITAGE_029: 1, HERITAGE_030: 1, HERITAGE_034: 1, HERITAGE_035: 1,
    HERITAGE_038: 1, HERITAGE_039: 1, HERITAGE_044: 1, HERITAGE_046: 1,
  };
  function ensureHeritageLevels(p) {
    if (!p) return {};
    if (!p.heritageLevels || typeof p.heritageLevels !== "object") p.heritageLevels = {};
    return p.heritageLevels;
  }
  function heritageGrowKind(h) {
    const raw = String((h && (h.养成属性 || h.grow)) || "").trim();
    if (raw.indexOf("气") >= 0 || /^hp$/i.test(raw)) return "hp";
    if (raw.indexOf("攻") >= 0 || /^atk$/i.test(raw)) return "atk";
    const id = h && (h.传承ID || h.id);
    if (id && HERITAGE_GROW_HP[id]) return "hp";
    const t = String((h && h.效果类型) || "");
    if (t === "TRUE_DAMAGE_REDUCE" || t === "PRESSURE_REDUCE" || t === "HEAL_HP") return "hp";
    return "atk";
  }
  function heritageLevelOf(id) {
    const lv = ensureHeritageLevels(Bridge.profile);
    return Math.max(0, Math.floor(Number(lv[id]) || 0));
  }
  function heroBaseStats(profile) {
    const p = profile || Bridge.profile;
    const cfg = Bridge.config || {};
    let atk = HERO_BASE_ATK;
    let hp = HERO_BASE_HP;
    const levels = (p && p.heritageLevels) || {};
    Object.keys(levels).forEach((id) => {
      const n = Math.max(0, Math.floor(Number(levels[id]) || 0));
      if (!n) return;
      const h = (cfg.heritages || {})[id] || { 传承ID: id };
      if (heritageGrowKind(h) === "hp") hp += n;
      else atk += n;
    });
    return { atk, hp };
  }
  function applyHeroHpToRun(run) {
    if (!run) return;
    const stats = heroBaseStats();
    const bonus = Math.max(0, stats.hp - HERO_BASE_HP);
    const ruleHp = Number(run.maxHp) || HERO_BASE_HP;
    run.maxHp = ruleHp + bonus;
    run.hp = run.maxHp;
  }
  function upgradeHeritage(id) {
    const p = Bridge.profile;
    const h = (Bridge.config && Bridge.config.heritages || {})[id];
    if (!p || !h) return;
    const unlocked = new Set(p.unlockedHeritage || []);
    if (!unlocked.has(id)) return toast("先解锁这道传承");
    const price = Number(h.升级命尘) > 0 ? Number(h.升级命尘) : HERITAGE_DUST_PER_POINT;
    if (!FateSave.spendCurrency(p, "mingChen", price)) return toast(`命尘不足，升级需 ${price}`);
    const lv = ensureHeritageLevels(p);
    lv[id] = heritageLevelOf(id) + 1;
    saveProfile();
    refreshBaseTopbar();
    const kind = heritageGrowKind(h);
    const stats = heroBaseStats();
    toast(
      `「${h.名称 || id}」升至 ${lv[id]} 级，基础${kind === "hp" ? "气血" : "攻击力"} +1（当前攻击 ${stats.atk} / 气血 ${stats.hp}）`
    );
    showHeritage();
  }
  function showHeritage() {
    withConfig(() => {
      const cfg = Bridge.config || {};
      const unlocked = new Set((Bridge.profile && Bridge.profile.unlockedHeritage) || ["HERITAGE_001"]);
      const equipped = new Set((Bridge.profile && Bridge.profile.equippedHeritage) || []);
      const all = Object.values(cfg.heritages || {}).sort((a, b) => String(a.传承ID).localeCompare(String(b.传承ID)));
      const stats = heroBaseStats();
      const dust = (Bridge.profile && Bridge.profile.currencies && Bridge.profile.currencies.mingChen) || 0;
      const rows = all
        .map((h) => {
          const on = unlocked.has(h.传承ID);
          const eq = equipped.has(h.传承ID);
          const kind = heritageGrowKind(h);
          const lv = heritageLevelOf(h.传承ID);
          const price = Number(h.升级命尘) > 0 ? Number(h.升级命尘) : HERITAGE_DUST_PER_POINT;
          const growName = kind === "hp" ? "基础气血" : "基础攻击力";
          const body = on ? esc(h.描述 || "") : "完成对应机缘后解锁。";
          const grow = `养成：每级 +1 ${growName}　当前 ${lv} 级（已提供 ${growName} +${lv}）`;
          const btns = on
            ? `<div class="hub-row-actions">
                <button class="ghost-btn" data-eq="${esc(h.传承ID)}">${eq ? "卸下" : "装备"}</button>
                <button class="primary-btn" data-up="${esc(h.传承ID)}">升级 ${price}命尘</button>
              </div>`
            : `<span class="hub-lock">未解锁</span>`;
          return `<div class="hub-row${on ? "" : " locked"}">
            <div class="hub-mini-card"><div class="glyph">传</div><div class="tag">${on ? (eq ? "已装备" : "已解锁") : "未解锁"}</div><div class="name">${esc(h.名称 || h.传承ID)}</div></div>
            <div class="hub-copy"><b>${esc(h.名称 || h.传承ID)}</b><p>${body}</p><p class="heritage-grow">${grow}</p>${btns}</div>
          </div>`;
        })
        .join("");
      showModalHtmlSafe(
        "传承台",
        `<div class="hub-panel hub-list">
          <div class="heritage-stats">
            <span>基础攻击力 <b>${stats.atk}</b></span>
            <span>基础气血 <b>${stats.hp}</b></span>
            <span>命尘 <b>${dust}</b></span>
          </div>
          <p class="heritage-hint">撤离带回的命尘可在此温养传承。每 200 命尘升 1 级，有的加攻击，有的加气血。升级后永久加到主角基础上，不必装备。</p>
          ${rows || "<p>金鹏之心已带回青崖峰。</p>"}
        </div>`
      );
      const root = $("modalText");
      if (!root) return;
      root.querySelectorAll("[data-eq]").forEach((b) => {
        b.onclick = () => {
          const id = b.getAttribute("data-eq");
          let eq = Bridge.profile.equippedHeritage || [];
          if (eq.includes(id)) eq = eq.filter((x) => x !== id);
          else {
            if (eq.length >= 3) return toast("最多装备 3 个");
            eq.push(id);
          }
          Bridge.profile.equippedHeritage = eq;
          saveProfile();
          showHeritage();
        };
      });
      root.querySelectorAll("[data-up]").forEach((b) => {
        b.onclick = () => upgradeHeritage(b.getAttribute("data-up"));
      });
    });
  }
  function showCompanions() {
    withConfig(() => {
      const cfg = Bridge.config || {};
      const unlocked = new Set((Bridge.profile && Bridge.profile.unlockedCompanions) || []);
      const list = Object.values(cfg.companions || {}).filter((c) => c.同伴ID !== "COMP_VILLAIN");
      const rows = list
        .map((c) => {
          const on = unlocked.has(c.同伴ID);
          const cls = portraitClass(c.立绘资源);
          const skillIds = String(c.人和ID列表 || "")
            .split(/[;,.，、\s]+/)
            .filter(Boolean);
          const skills = skillIds
            .map((id) => {
              const r = lookupRenRow(id);
              return r.名称 ? `【${r.名称}】${r.描述 || ""}` : "";
            })
            .filter(Boolean)
            .join("\n");
          const shown = c.同伴ID === "COMP_HERO" ? daoName() + "(你)" : c.名称;
          const body = on ? esc(fillDao(c.简介 || "")) + (skills ? "\n" + esc(skills) : "") : "未解锁";
          return `<div class="hub-row hub-comp-row${on ? "" : " locked"}">
            <div class="hub-comp-art"><div class="portrait ${cls}" data-label="${esc(shown)}"></div></div>
            <div class="hub-copy"><b>${esc(shown)}</b><p style="white-space:pre-wrap">${body}</p>${on ? "" : '<span class="hub-lock">未解锁</span>'}</div>
          </div>`;
        })
        .join("");
      showModalHtmlSafe("同伴", `<div class="hub-panel hub-list">${rows || "<p>尚无同伴。</p>"}</div>`);
      hydratePortraits($("modalText"));
    });
  }
  function showWarehouse() {
    withConfig(() => {
      renderWarehouse();
    });
  }
  function renderWarehouse() {
    const p = Bridge.profile;
    const wh = (p && p.warehouse) || {};
    const ids = Object.keys(wh).filter((id) => (wh[id] || 0) > 0);
    const cards = ids
      .map((id) => {
        const item = lookupItem(id);
        const name = item.名称 || id;
        const canOpen = !!(item.打开后效果类型 && item.打开后效果类型 !== "NONE") || id === "ITEM_RENAME";
        const btn = canOpen
          ? `<button class="primary-btn" data-open="${esc(id)}">打开</button>`
          : `<span class="shop-price">×${wh[id]}</span>`;
        return `<div class="hub-shop-card">
          <div class="shop-item-icon">${esc(itemIcon(id, name))}</div>
          <strong>${esc(name)}</strong>
          <div class="shop-card-desc">${esc(item.描述 || "局外物品")}</div>
          ${btn}
        </div>`;
      })
      .join("");
    showModalHtmlSafe("仓库", `<div class="hub-panel hub-shop-grid">${cards || "<p>仓库还空着。</p>"}</div>`);
    const root = $("modalText");
    if (!root) return;
    root.querySelectorAll("[data-open]").forEach((b) => {
      b.onclick = () => openWarehouseItem(b.getAttribute("data-open"));
    });
  }
  function openWarehouseItem(id) {
    const p = Bridge.profile;
    if (!p || !p.warehouse[id]) return toast("没有这件物品");
    const item = lookupItem(id);
    const t = item.打开后效果类型 || "";
    if (id === "ITEM_RENAME" || t === "NONE" && String(item.名称).indexOf("改名") >= 0) {
      const name = window.prompt("新的道号", p.daoName || "鸿明");
      if (!name) return;
      p.daoName = String(name).slice(0, 8);
      p.warehouse[id] -= 1;
      if (p.warehouse[id] <= 0) delete p.warehouse[id];
      saveProfile();
      refreshBaseTopbar();
      renderWarehouse();
      return toast("道号已改");
    }
    p.warehouse[id] -= 1;
    if (p.warehouse[id] <= 0) delete p.warehouse[id];
    if (t === "ADD_MINGCHEN") {
      FateSave.addCurrency(p, "mingChen", Number(item.参数A) || 0);
      toast("命尘 +" + (item.参数A || 0));
    } else if (t === "GRANT_FATE_CARD") {
      const have = new Set(p.unlockedFate || []);
      const pool = Object.keys((Bridge.config && Bridge.config.fateCards) || {}).filter((fid) => !have.has(fid));
      if (!pool.length) toast("命运卡已集齐，折合命尘 +50"), FateSave.addCurrency(p, "mingChen", 50);
      else {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        p.unlockedFate = [...have, pick];
        const card = Bridge.config.fateCards[pick];
        toast("解锁命运卡：" + ((card && card.名称) || pick));
      }
    } else if (t === "GRANT_HERITAGE") {
      const have = new Set(p.unlockedHeritage || []);
      const pool = Object.keys((Bridge.config && Bridge.config.heritages) || {}).filter((hid) => !have.has(hid));
      if (!pool.length) toast("传承已集齐，折合命尘 +50"), FateSave.addCurrency(p, "mingChen", 50);
      else {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        p.unlockedHeritage = [...have, pick];
        const h = Bridge.config.heritages[pick];
        toast("解锁传承：" + ((h && h.名称) || pick));
      }
    } else toast("已使用");
    saveProfile();
    refreshBaseTopbar();
    renderWarehouse();
  }
  function openJingShop() {
    withConfig(() => renderJingShop());
  }
  function renderJingShop() {
    const p = Bridge.profile;
    if (!p) return;
    const rows = (Bridge.config.sheets["21_命晶商店"] || []).filter((r) => r.商品ID);
    const counts = shopDayCounts();
    const cards = rows
      .map((r) => {
        const used = counts[r.商品ID] || 0;
        const cap = Number(r.每日限购) || 0;
        const left = cap ? Math.max(0, cap - used) : 99;
        const sold = left <= 0;
        return `<div class="hub-shop-card">
          <div class="shop-item-icon">${esc(itemIcon(r.仓库物品ID, r.名称))}</div>
          <strong>${esc(r.名称)}</strong>
          <div class="shop-card-desc">${esc(r.描述 || "")}${cap ? " · 今日剩" + left + "/" + cap : ""}</div>
          <div class="shop-price">${esc(r.售价命晶)} 命晶</div>
          <button class="primary-btn" data-mjs="${esc(r.商品ID)}" ${sold ? "disabled" : ""}>${sold ? "售罄" : "购买"}</button>
        </div>`;
      })
      .join("");
    showModalHtmlSafe(
      "命晶商店",
      `<div class="hub-panel"><p style="margin:0 0 8px;font-size:12px;color:#5a3a18;">用命晶换商品，买下后进仓库打开。命晶不能直接换命尘。</p><div class="hub-shop-grid">${cards}</div></div>`
    );
    const root = $("modalText");
    if (!root) return;
    root.querySelectorAll("[data-mjs]").forEach((b) => {
      b.onclick = () => {
        const row = rows.find((x) => x.商品ID === b.getAttribute("data-mjs"));
        if (!row) return;
        const cap = Number(row.每日限购) || 0;
        const dayCounts = shopDayCounts();
        if (cap && (dayCounts[row.商品ID] || 0) >= cap) return toast("今日已售罄");
        if (!FateSave.spendCurrency(p, "mingJing", Number(row.售价命晶))) return toast("命晶不足");
        FateSave.addWarehouse(p, row.仓库物品ID, 1);
        dayCounts[row.商品ID] = (dayCounts[row.商品ID] || 0) + 1;
        saveProfile();
        refreshBaseTopbar();
        toast("已入仓库");
        renderJingShop();
      };
    });
  }
  function openPayShop() {
    withConfig(() => renderPayShop());
  }
  function renderPayShop() {
    const p = Bridge.profile;
    if (!p) return;
    p.firstPayDone = p.firstPayDone || {};
    const tiers = (Bridge.config.sheets["20_货币与充值"] || [])
      .filter((r) => r.档位ID && String(r.档位ID).indexOf("PAY_") === 0)
      .sort((a, b) => Number(a.排序) - Number(b.排序));
    const rows = tiers
      .map((r) => {
        const first = !p.firstPayDone[r.档位ID] && Number(r.首次翻倍) === 1;
        const base = Number(r.到账仙晶) || 0;
        const get = first ? base * 2 : base;
        return `<div class="pay-row">
          <div class="shop-item-icon">仙</div>
          <div><b>¥${esc(r.人民币价格)}</b><span>到账 ${base} 仙晶</span>${first ? '<div class="pay-first">首充双倍 · 实得 ' + get + "</div>" : ""}</div>
          <button class="primary-btn" data-pay="${esc(r.档位ID)}">购买</button>
        </div>`;
      })
      .join("");
    showModalHtmlSafe(
      "充值",
      `<div class="hub-panel">
        <p style="margin:0 0 8px;font-size:12px;color:#5a3a18;">演示用，不产生真实扣款。仙晶可 1:1 兑换命晶，命晶不能兑回仙晶。</p>
        <div class="pay-list">${rows}</div>
        <div class="exchange-box">
          <b>仙晶 → 命晶</b>
          <input id="exchangeAmount" type="number" min="1" value="60" />
          <button class="primary-btn" id="btnExchange" style="width:100%;">兑换</button>
        </div>
      </div>`
    );
    const root = $("modalText");
    if (!root) return;
    root.querySelectorAll("[data-pay]").forEach((b) => {
      b.onclick = () => {
        const r = tiers.find((x) => x.档位ID === b.getAttribute("data-pay"));
        if (!r) return;
        const first = !p.firstPayDone[r.档位ID] && Number(r.首次翻倍) === 1;
        const get = (Number(r.到账仙晶) || 0) * (first ? 2 : 1);
        FateSave.addCurrency(p, "xianJing", get);
        p.firstPayDone[r.档位ID] = true;
        saveProfile();
        refreshBaseTopbar();
        toast("获得仙晶 ×" + get);
        renderPayShop();
      };
    });
    const ex = $("btnExchange");
    if (ex)
      ex.onclick = () => {
        const n = Math.floor(Number(($("exchangeAmount") && $("exchangeAmount").value) || 0));
        const res = FateSave.exchangeXianToMingJing(p, n);
        if (!res.ok) return toast(res.msg || "兑换失败");
        refreshBaseTopbar();
        toast("已兑换命晶 ×" + n);
        renderPayShop();
      };
  }
  function wheelPool() {
    return ((Bridge.config && Bridge.config.sheets["22_转盘奖池"]) || []).filter(
      (r) => r.奖池ID === "WHEEL_MAIN" && Number(r.权重) > 0
    );
  }
  function weightedPick(rows) {
    const total = rows.reduce((s, r) => s + Number(r.权重 || 0), 0) || 1;
    let n = Math.random() * total;
    for (const r of rows) {
      n -= Number(r.权重 || 0);
      if (n <= 0) return r;
    }
    return rows[rows.length - 1];
  }
  function grantChenYuanPrize(row) {
    const p = Bridge.profile;
    const t = row.奖励类型;
    if (t === "命尘") {
      FateSave.addCurrency(p, "mingChen", Number(row.数量) || 0);
      return "命尘 ×" + row.数量;
    }
    if (t === "命晶") {
      FateSave.addCurrency(p, "mingJing", Number(row.数量) || 0);
      return "命晶 ×" + row.数量;
    }
    if (t === "仓库物品") {
      FateSave.addWarehouse(p, row.奖励ID, Number(row.数量) || 1);
      const item = lookupItem(row.奖励ID);
      return "仓库 · " + (item.名称 || row.奖励ID);
    }
    if (t === "命运卡") {
      p.unlockedFate = Array.from(new Set([...(p.unlockedFate || []), row.奖励ID]));
      const card = (Bridge.config.fateCards || {})[row.奖励ID];
      return "命运卡 · " + ((card && card.名称) || row.奖励ID);
    }
    if (t === "传承") {
      p.unlockedHeritage = Array.from(new Set([...(p.unlockedHeritage || []), row.奖励ID]));
      const h = (Bridge.config.heritages || {})[row.奖励ID];
      return "传承 · " + ((h && h.名称) || row.奖励ID);
    }
    if (t === "同伴") {
      if ((p.unlockedCompanions || []).includes(row.奖励ID)) {
        FateSave.addCurrency(p, "mingJing", 80);
        return "重复同伴，折合 80 命晶";
      }
      p.unlockedCompanions = Array.from(new Set([...(p.unlockedCompanions || []), row.奖励ID]));
      unlockFatesByPath("尘缘相逢活动");
      return "限定同伴 · 苏锦书";
    }
    return "获得奖励";
  }
  function openChenYuan() {
    withConfig(() => renderChenYuan());
  }
  function renderChenYuan() {
    const p = Bridge.profile;
    if (!p) return;
    p.chenYuanPity = p.chenYuanPity || 0;
    const owned = (p.unlockedCompanions || []).includes("COMP_SU");
    showModalHtmlSafe(
      "尘缘相逢",
      `<div class="hub-panel">
        <div class="chenyuan-hero">
          <div class="copy"><strong>苏锦书</strong>限定同伴<br/>160 命晶 / 抽 · 80 抽保底<br/>${owned ? "已与她相逢。" : "尚未解锁。"}</div>
          <div class="portrait p-merchant" data-label="苏锦书"></div>
        </div>
        <div class="chenyuan-wheel-wrap">
          <div class="chenyuan-pointer"></div>
          <div id="chenYuanWheel" class="chenyuan-wheel"></div>
        </div>
        <div class="chenyuan-meta">距保底 <b id="chenYuanPity">${p.chenYuanPity}</b>/80 · 命晶 <b id="chenYuanJing">${p.currencies.mingJing || 0}</b></div>
        <button class="primary-btn" id="chenYuanPull" style="width:100%;">抽取 · 160 命晶</button>
      </div>`
    );
    hydratePortraits($("modalText"));
    const btn = $("chenYuanPull");
    if (btn) btn.onclick = pullChenYuan;
  }
  function pullChenYuan() {
    const p = Bridge.profile;
    const btn = $("chenYuanPull");
    if (!p || (btn && btn.disabled)) return;
    if (!FateSave.spendCurrency(p, "mingJing", 160)) return toast("命晶不足");
    const pool = wheelPool();
    const owned = (p.unlockedCompanions || []).includes("COMP_SU");
    p.chenYuanPity = (p.chenYuanPity || 0) + 1;
    let row;
    if (!owned && p.chenYuanPity >= 80) {
      row = pool.find((x) => x.奖励类型 === "同伴") || { 奖励类型: "同伴", 奖励ID: "COMP_SU", 数量: 1 };
      p.chenYuanPity = 0;
    } else {
      row = weightedPick(pool) || { 奖励类型: "命尘", 数量: 100 };
      if (row.奖励类型 === "同伴") p.chenYuanPity = 0;
    }
    const wheel = $("chenYuanWheel");
    const idx = Math.max(0, pool.indexOf(row));
    const turns = 4 + Math.random();
    const deg = turns * 360 + (360 - ((idx + 0.5) / Math.max(pool.length, 8)) * 360);
    if (wheel) {
      wheel.style.transition = "none";
      wheel.style.transform = "rotate(0deg)";
      void wheel.offsetWidth;
      wheel.style.transition = "transform 2.4s cubic-bezier(.15,.85,.2,1)";
      wheel.style.transform = "rotate(" + deg + "deg)";
    }
    if (btn) btn.disabled = true;
    setTimeout(() => {
      const label = grantChenYuanPrize(row);
      saveProfile();
      refreshBaseTopbar();
      toast(label);
      renderChenYuan();
    }, 2500);
  }
  function showCodex() {
    withConfig(() => {
      const rows = ((Bridge.config.sheets["18_图鉴"] || []) || [])
        .map((r) => {
          return `<div class="hub-row">
            <div class="hub-mini-card"><div class="glyph">鉴</div><div class="tag">${esc(r.分类 || "图鉴")}</div></div>
            <div class="hub-copy"><b>${esc(r.标题)}</b><p>${esc(r.正文 || "")}</p></div>
          </div>`;
        })
        .join("");
      showModalHtmlSafe("图鉴", `<div class="hub-panel hub-list">${rows || "<p>图鉴还是空的。</p>"}</div>`);
    });
  }

  function lookupTian(id) {
    return ((Bridge.config && Bridge.config.sheets["10_天时"]) || []).find((x) => x.天时ID === id) || null;
  }
  function lookupDi(id) {
    return ((Bridge.config && Bridge.config.sheets["11_地利"]) || []).find((x) => x.地利ID === id) || null;
  }
  function lookupRen(id) {
    return (
      (Bridge.config && Bridge.config.renSkills && Bridge.config.renSkills[id]) ||
      ((Bridge.config && Bridge.config.sheets["12_人和"]) || []).find((x) => x.人和ID === id) ||
      null
    );
  }

  function worldRow(worldId) {
    const rows = (Bridge.config && Bridge.config.sheets && Bridge.config.sheets["13_世界"]) || [];
    return rows.find((w) => w.世界ID === worldId) || {};
  }
  function worldName(worldId) {
    return worldRow(worldId).名称 || worldId;
  }
  function unlockedDepthOf(worldId) {
    const prog = Bridge.profile && Bridge.profile.worldProgress && Bridge.profile.worldProgress[worldId];
    return Number(prog && prog.unlockedDepth) || 0;
  }
  function configuredDepths(worldId) {
    const rows = (Bridge.config && Bridge.config.sheets && Bridge.config.sheets["14_深度规则"]) || [];
    return rows
      .filter((r) => r.世界ID === worldId)
      .map((r) => Number(r.深度) || 0)
      .filter((d) => d > 0)
      .sort((a, b) => a - b);
  }

  async function openDepthPicker() {
    try {
      await loadConfig();
    } catch (e) {
      showModalSafe("提示", "世界配置未能加载。请用 start_game.bat 启动，或检查网页是否完整。");
      return;
    }
    migrateWorldProgress(Bridge.profile);
    const worlds = ((Bridge.config.sheets && Bridge.config.sheets["13_世界"]) || [])
      .slice()
      .sort((a, b) => Number(a.排序 || 0) - Number(b.排序 || 0));
    const hasSave = !!(Bridge.profile && Bridge.profile.savedWorldRun);
    showModalHtmlSafe(
      "世界之门",
      `<p style="margin:0 0 10px;">通过新手后，可入青木界更深一层，或循师尊线索踏入妖灵界。红色命运牌是首领，在最上方。</p><div id="depthPickHost" class="world-pick"></div>`
    );
    const host = $("depthPickHost");
    if (!host) return;
    if (hasSave) {
      const b = document.createElement("button");
      b.className = "choice-btn";
      b.style.cssText = "margin:0 0 8px;width:100%;";
      b.textContent = "继续上次进度";
      b.onclick = () => {
        closeModalSafe();
        resumeWorldRun();
      };
      host.appendChild(b);
    }
    worlds.forEach((w) => {
      const unlocked = unlockedDepthOf(w.世界ID);
      const block = document.createElement("div");
      block.className = "result-row world-pick-block";
      const title = document.createElement("b");
      title.textContent = w.名称 || w.世界ID;
      const intro = document.createElement("p");
      intro.textContent = fillDao(w.简介 || "") || (unlocked ? "已开放。" : "尚未开放。");
      block.appendChild(title);
      block.appendChild(intro);
      if (unlocked < 1) {
        const lock = document.createElement("p");
        lock.style.marginTop = "6px";
        lock.textContent = "通过新手后开放。";
        block.appendChild(lock);
      } else {
        const stack = document.createElement("div");
        stack.className = "option-stack";
        const depths = configuredDepths(w.世界ID).filter((d) => d <= unlocked);
        depths.forEach((d) => {
          const row = document.createElement("div");
          row.className = "depth-btn-row";
          const view = document.createElement("button");
          view.className = "ghost-btn";
          view.textContent = "查看给定";
          view.onclick = () => openGivenFateModal(w.世界ID, d);
          const enter = document.createElement("button");
          enter.className = "choice-btn";
          enter.textContent = hasSave ? `新开 · 深度 ${d}` : `进入深度 ${d}`;
          enter.onclick = () => openPickFateModal(w.世界ID, d);
          row.appendChild(view);
          row.appendChild(enter);
          stack.appendChild(row);
        });
        block.appendChild(stack);
      }
      host.appendChild(block);
    });
  }

  function openGivenFateModal(worldId, depth) {
    const cfg = Bridge.config;
    const rule = FateExplore.getDepthRule(cfg, worldId, depth);
    const fixed = FateExplore.getFixedPool(cfg, worldId, depth) || [];
    const need = Number(rule && rule.玩家补卡数量) || 0;
    const total = fixed.length + need;
    const name = worldName(worldId);
    const rows = fixed
      .map((id) => (cfg.fateCards && cfg.fateCards[id]) || { 命运卡ID: id, 名称: id, 正文: "" })
      .map((c) => fateCardHtml(c, {}))
      .join("");
    showSubModalHtml(
      "本次给定命运卡",
      `<div class="picker-shell">
        <div class="picker-head">
          <p class="pick-count">${esc(name)} · 深度${depth} · 给定 ${fixed.length} / 共 ${total}</p>
          <p class="pick-lead">这些牌由世界给出，入世后会洗进牌阵。补选在下一步。</p>
        </div>
        <div class="picker-scroll">${rows || "<p class='pick-lead'>此深度尚未配置固定卡。</p>"}</div>
        <div class="picker-foot"><button class="primary-btn" id="goPickFateBtn" style="width:100%;">去补选</button></div>
      </div>`
    );
    if ($("goPickFateBtn"))
      $("goPickFateBtn").onclick = () => openPickFateModal(worldId, depth);
  }
  const RECOMMEND_PICKS = {
    "WORLD_QINGMU:1": ["FATE_013", "FATE_011", "FATE_014", "FATE_016", "FATE_015", "FATE_008", "FATE_021", "FATE_029"],
    "WORLD_QINGMU:2": ["FATE_031", "FATE_033", "FATE_035", "FATE_037", "FATE_039", "FATE_047", "FATE_051", "FATE_052", "FATE_057", "FATE_041"],
    "WORLD_YAO:1": ["FATE_035", "FATE_037", "FATE_043", "FATE_045", "FATE_048", "FATE_053"],
  };
  function pickableFateCards(worldId, depth) {
    const cfg = Bridge.config;
    const p = Bridge.profile;
    const fixed = new Set(FateExplore.getFixedPool(cfg, worldId, depth) || []);
    return ((p && p.unlockedFate) || [])
      .filter((id) => !fixed.has(id))
      .map((id) => (cfg.fateCards && cfg.fateCards[id]) || { 命运卡ID: id, 名称: id })
      .filter((c) => c.类型 !== "撤离" && String(c.备注 || "").indexOf("BOSS") < 0);
  }
  function recommendFatePicks(worldId, depth, need, pool) {
    const byId = {};
    (pool || []).forEach((c) => {
      byId[c.命运卡ID] = c;
    });
    const used = new Set();
    const out = [];
    (RECOMMEND_PICKS[worldId + ":" + depth] || []).forEach((id) => {
      if (out.length >= need) return;
      if (byId[id] && !used.has(id)) {
        used.add(id);
        out.push(id);
      }
    });
    const groups = {};
    (pool || []).forEach((c) => {
      if (used.has(c.命运卡ID)) return;
      const t = c.类型 || "事件";
      (groups[t] = groups[t] || []).push(c);
    });
    const cycle = ["商店", "灵藏", "问心", "剧情", "事件", "战斗"];
    let guard = 0;
    while (out.length < need && guard < 240) {
      guard += 1;
      let added = false;
      cycle.forEach((t) => {
        if (out.length >= need) return;
        const arr = groups[t];
        if (arr && arr.length) {
          const c = arr.shift();
          used.add(c.命运卡ID);
          out.push(c.命运卡ID);
          added = true;
        }
      });
      if (!added) break;
    }
    (pool || []).forEach((c) => {
      if (out.length >= need) return;
      if (!used.has(c.命运卡ID)) {
        used.add(c.命运卡ID);
        out.push(c.命运卡ID);
      }
    });
    return out.slice(0, need);
  }
  function applyRecommendPick() {
    const ui = Bridge.pickUi;
    if (!ui) return;
    const pool = pickableFateCards(ui.worldId, ui.depth);
    if (!pool.length) return toast("没有可补选的已解锁命运卡");
    const ids = recommendFatePicks(ui.worldId, ui.depth, ui.need, pool);
    if (!ids.length) return toast("没有可推荐的命运卡");
    ui.selected = ids;
    bindPickFateList();
    toast(
      ids.length < ui.need
        ? `推荐卡只有 ${ids.length} 张，还差 ${ui.need - ids.length} 张`
        : `已选推荐搭配（${ids.length}/${ui.need}），可再微调`
    );
    const first = $("pickFateList") && $("pickFateList").querySelector(".fate-pick-card.selected");
    if (first && first.scrollIntoView) first.scrollIntoView({ block: "nearest" });
  }
  function openPickFateModal(worldId, depth) {
    const cfg = Bridge.config;
    const p = Bridge.profile;
    ensureFateDecks(p);
    const rule = FateExplore.getDepthRule(cfg, worldId, depth);
    const need = Number(rule && rule.玩家补卡数量) || 0;
    const fixed = new Set(FateExplore.getFixedPool(cfg, worldId, depth) || []);
    const unlocked = ((p && p.unlockedFate) || []).filter((id) => !fixed.has(id));
    const cards = unlocked
      .map((id) => (cfg.fateCards && cfg.fateCards[id]) || { 命运卡ID: id, 名称: id })
      .filter((c) => c.类型 !== "撤离");
    Bridge.pickUi = { worldId, depth, need, selected: [] };
    const decks = ensureFateDecks(p);
    const slotBtns = [0, 1, 2]
      .map((i) => {
        const n = (decks[i] || []).length;
        return `<button type="button" class="choice-btn" data-apply-deck="${i}">卡组${i + 1}${n ? ` · ${n}` : " · 空"}</button>`;
      })
      .join("");
    showSubModalHtml(
      "补选命运卡",
      `<div class="picker-shell">
        <div class="picker-head">
          <p class="pick-count" id="pickFateCount">需补选 ${need} · 已选 0</p>
          <p class="pick-lead">${esc(worldName(worldId))} · 深度${depth}。可点推荐搭配一键选好，也可自己点选，选中后外框为金。</p>
          <button type="button" class="recommend-btn" id="recommendPickBtn">推荐搭配</button>
        </div>
        <div class="picker-scroll" id="pickFateList">${
          cards.map((c) => fateCardHtml(c, { selected: false })).join("") ||
          "<p class='pick-lead'>没有可补选的已解锁命运卡。请先去命运阁解锁。</p>"
        }</div>
        <div class="picker-foot">
          <div class="deck-slot-row">${slotBtns}</div>
          <button class="primary-btn" id="confirmPickFateBtn" style="width:100%;">确定进入</button>
        </div>
      </div>`
    );
    bindPickFateList();
    const host = $("subModalText");
    if (host) {
      host.querySelectorAll("[data-apply-deck]").forEach((b) => {
        b.onclick = () => applyDeckToPick(Number(b.getAttribute("data-apply-deck")));
      });
    }
    if ($("recommendPickBtn")) $("recommendPickBtn").onclick = applyRecommendPick;
    if ($("confirmPickFateBtn")) $("confirmPickFateBtn").onclick = confirmPickFateEnter;
  }
  function bindPickFateList() {
    const ui = Bridge.pickUi;
    const host = $("pickFateList");
    const count = $("pickFateCount");
    if (!ui || !host) return;
    if (count) count.textContent = `需补选 ${ui.need} · 已选 ${ui.selected.length}`;
    host.querySelectorAll("[data-fate]").forEach((btn) => {
      const id = btn.getAttribute("data-fate");
      btn.classList.toggle("selected", ui.selected.indexOf(id) >= 0);
      btn.onclick = () => {
        const i = ui.selected.indexOf(id);
        if (i >= 0) ui.selected.splice(i, 1);
        else {
          if (ui.selected.length >= ui.need) return toast(`最多补选 ${ui.need} 张`);
          ui.selected.push(id);
        }
        bindPickFateList();
      };
    });
  }
  function applyDeckToPick(slot) {
    const ui = Bridge.pickUi;
    if (!ui) return;
    const decks = ensureFateDecks(Bridge.profile);
    const cfg = Bridge.config;
    const fixed = new Set(FateExplore.getFixedPool(cfg, ui.worldId, ui.depth) || []);
    const unlocked = new Set((Bridge.profile && Bridge.profile.unlockedFate) || []);
    const ids = (decks[slot] || []).filter((id) => unlocked.has(id) && !fixed.has(id));
    if (!ids.length) return toast("该卡组是空的，或卡都在本次给定里");
    ui.selected = ids.slice(0, ui.need);
    bindPickFateList();
    toast(`已套用卡组${slot + 1}（${ui.selected.length}/${ui.need}）`);
  }
  function confirmPickFateEnter() {
    const ui = Bridge.pickUi;
    if (!ui) return;
    if (ui.selected.length !== ui.need) return toast(`还需补选 ${ui.need - ui.selected.length} 张`);
    const worldId = ui.worldId;
    const depth = ui.depth;
    const picks = ui.selected.slice();
    closeSubModal();
    closeModalSafe();
    startDeepRun(worldId, depth, true, picks);
  }
  function startDeepRun(worldId, depth, clearSave, picks) {
    if (typeof worldId === "number") {
      picks = clearSave;
      clearSave = depth;
      depth = worldId;
      worldId = "WORLD_QINGMU";
    }
    worldId = worldId || "WORLD_QINGMU";
    depth = Number(depth) || 1;
    if (clearSave && Bridge.profile) {
      Bridge.profile.savedWorldRun = null;
      saveProfile();
    }
    const cfg = Bridge.config;
    const rule = FateExplore.getDepthRule(cfg, worldId, depth);
    const need = Number(rule && rule.玩家补卡数量) || 0;
    const pick = Array.isArray(picks) ? picks.slice(0, need) : [];
    if (pick.length < need) {
      toast(`入世前需补选 ${need} 张命运卡`);
      openPickFateModal(worldId, depth);
      return;
    }
    let created;
    try {
      created = FateExplore.createRun(cfg, Bridge.profile, worldId, depth, pick);
    } catch (e) {
      toast((e && e.message) || "无法生成牌阵");
      return;
    }
    if (!created || !created.ok) {
      toast((created && created.msg) || "无法生成牌阵");
      return;
    }
    Bridge.run = created.run;
    applyHeroHpToRun(Bridge.run);
    Bridge.training = false;
    Bridge.mode = "deep";
    syncRunHud();
    startBgm("story");
    if (typeof global.switchScreen === "function") switchScreen("mapScreen");
    renderDeepMap();
    toast(`${worldName(worldId)} · 深度${depth}`);
  }

  function resumeWorldRun() {
    const snap = Bridge.profile && Bridge.profile.savedWorldRun;
    if (!snap) return toast("没有可继续的进度");
    Bridge.run = snap.run;
    Bridge.training = false;
    Bridge.mode = "deep";
    if (snap.battle) {
      Bridge.battle = restoreBattle(snap.battle);
      Bridge.battleNode = snap.battle.battleNode || null;
      if (global.state) state._fushiDeepBattle = true;
      if (typeof global.switchScreen === "function") switchScreen("battleScreen");
      renderDeepBattle();
      bindDeepBattleButtons();
      showTrainBar(false);
      toast("回到未完成的拼刀");
      return;
    }
    syncRunHud();
    startBgm("story");
    if (typeof global.switchScreen === "function") switchScreen("mapScreen");
    renderDeepMap();
    toast("继续上次入世");
  }

  function syncRunHud() {
    const run = Bridge.run;
    if (!run || !global.state || !state.player) return;
    state.player.hp = run.hp;
    state.player.yuan = run.yuan;
    state.player.luck = run.luck;
    state.player.pool = (Bridge.profile && Bridge.profile.currencies.mingChen) || 0;
    if (typeof global.updateResources === "function") updateResources();
  }

  function updateMapChrome() {
    const skip = $("skipNewbieBtn");
    const extract = $("extractRunBtn");
    const pause = $("pauseRunBtn");
    const deep = Bridge.mode === "deep" && Bridge.run && !Bridge.training;
    if (skip) skip.style.display = Bridge.mode === "deep" || Bridge.mode === "base" ? "none" : "inline-block";
    if (extract) extract.style.display = deep ? "inline-block" : "none";
    if (pause) pause.style.display = deep ? "inline-block" : "none";
  }
  function showSkipOnNewbieMap() {
    if (Bridge.mode === "deep" || Bridge.mode === "base") return;
    const skip = $("skipNewbieBtn");
    const extract = $("extractRunBtn");
    const pause = $("pauseRunBtn");
    if (skip) skip.style.display = "inline-block";
    if (extract) extract.style.display = "none";
    if (pause) pause.style.display = "none";
  }

  function renderDeepMap() {
    const run = Bridge.run;
    if (!run) return;
    Bridge.mode = "deep";
    updateMapChrome();
    syncRunHud();
    const layer = run.layer || 0;
    if ($("resHp")) $("resHp").textContent = run.hp;
    if ($("resYuan")) $("resYuan").textContent = run.yuan;
    if ($("resLuck")) $("resLuck").textContent = run.luck;
    if ($("resPool") && Bridge.profile) $("resPool").textContent = Bridge.profile.currencies.mingChen || 0;
    const wname = worldName(run.worldId || "WORLD_QINGMU");
    if ($("mapTitle")) $("mapTitle").textContent = layer === 0 ? `${wname} · 深度${run.depth} · 前山` : `${wname} · 深度${run.depth} · 密道`;
    const mapBg = $("mapBg");
    if (mapBg) {
      mapBg.className = "painted-bg " + (layer >= 1 ? "bg-map2" : "bg-map1");
      hydrateBg(mapBg);
    }
    const avail = new Set(FateExplore.getAvailable(run));
    const board = $("fateMap");
    board.innerHTML = "";
    (run.edges || []).forEach((edge, ei) => {
      if (run.blockedEdges && run.blockedEdges[ei]) return;
      const na = run.nodes[edge[0]];
      const nb = run.nodes[edge[1]];
      if (!na || !nb || na.layer !== layer || nb.layer !== layer) return;
      const line = document.createElement("div");
      line.className = "path-line";
      const dx = nb.x - na.x;
      const dy = nb.y - na.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      line.style.left = na.x + "%";
      line.style.top = na.y + "%";
      line.style.width = len + "%";
      line.style.transformOrigin = "0 50%";
      line.style.transform = `rotate(${ang}deg)`;
      board.appendChild(line);
    });
    run.nodes.forEach((n) => {
      if (n.layer !== layer) return;
      const arriving = n._justArrived && (n.kind === "stairs" || n.flipLayer);
      const visited = (n.revealed || n.resolved) && !arriving;
      const isAvailable = avail.has(n.index);
      const el = document.createElement("div");
      el.className =
        "fate-node" +
        (visited ? " flipped" : "") +
        (n.index === run.pos ? " current" : "") +
        (isAvailable ? " available" : "") +
        (n.isBoss ? " danger" : "") +
        (n.kind === "stairs" || n.kind === "exit" || n.kind === "start" ? " named" : "");
      el.style.left = n.x + "%";
      el.style.top = n.y + "%";
      el.style.setProperty(
        "--back-mark",
        n.kind === "stairs" ? "阶" : n.kind === "exit" ? "归" : n.kind === "start" ? "起" : "命"
      );
      el.innerHTML = `<div class="fate-node-inner">
          <div class="fate-face fate-back"></div>
          <div class="fate-face fate-front">
            <div class="fate-icon">${visited ? n.mark || "命" : "命"}</div>
            <div class="fate-label">${n.name || ""}</div>
          </div>
        </div>`;
      if (isAvailable) el.onclick = () => tryMoveDeep(n.index);
      if (arriving) {
        requestAnimationFrame(() => {
          el.classList.add("flipping");
          setTimeout(() => {
            el.classList.add("flipped");
            el.classList.remove("flipping");
          }, 780);
        });
      }
      board.appendChild(el);
    });
    const cur = run.nodes[run.pos];
    if (cur && cur.layer === layer) {
      const token = document.createElement("div");
      token.className = "sword-token";
      token.style.left = cur.x + "%";
      token.style.top = cur.y + "%";
      board.appendChild(token);
    }
    presentDeepNode();
  }

  function afterDeepMove(r) {
    const run = Bridge.run;
    if (!r || !r.ok) return toast((r && r.msg) || "无法移动");
    if (!run.alive) {
      return extractDeepRun(false, { forced: true });
    }
    renderDeepMap();
  }
  function tryMoveDeep(index) {
    const run = Bridge.run;
    if (!run) return;
    afterDeepMove(FateExplore.moveTo(run, index));
  }
  function moveByDirection(dir) {
    const run = Bridge.run;
    if (!run) return;
    const cur = run.nodes[run.pos];
    const avail = FateExplore.getAvailable(run);
    if (!avail.length) return toast("请先结算当前命运牌");
    if (!cur) return;
    const scored = avail
      .map((idx) => {
        const node = run.nodes[idx];
        const dx = node.x - cur.x;
        const dy = node.y - cur.y;
        const score = dir === "up" ? -dy : dir === "down" ? dy : dir === "left" ? -dx : dx;
        return { idx, score, offAxis: dir === "up" || dir === "down" ? Math.abs(dx) : Math.abs(dy) };
      })
      .filter((item) => item.score > 2)
      .sort((a, b) => b.score - a.score || a.offAxis - b.offAxis);
    if (!scored.length) return toast("这个方向没有相邻命运牌");
    tryMoveDeep(scored[0].idx);
  }

  function fortunePack() {
    const faces = [
      { label: "大吉", luck: 36, hp: 8, text: "签面大吉。气运大涨，气血也暖了一截。" },
      { label: "吉", luck: 18, text: "签面为吉。气运上升。" },
      { label: "平", luck: 6, yuan: 1, text: "签面平常。气运微增，真元回了一点。" },
      { label: "凶", luck: -12, hp: -10, text: "签面为凶。气运受损，气血也被抽走一截。" },
    ];
    return FateExplore.shuffle(faces);
  }
  function openDeepFortune(node) {
    Bridge._fortuneOpen = true;
    if (typeof global.switchScreen === "function") switchScreen("storyScreen");
    const screen = $("storyScreen");
    if (screen) {
      screen.classList.remove("shop-dialog", "choice-dialog");
      screen.classList.add("event-dialog");
    }
    if ($("storySpeaker")) $("storySpeaker").textContent = "问心";
    if ($("nameForm")) $("nameForm").style.display = "none";
    if ($("storyActions")) $("storyActions").style.display = "none";
    const body = (node.conf && node.conf.正文) || "四签翻动，吉凶未定。";
    if ($("storyText")) {
      $("storyText").textContent = body + "\n\n命签摊开：吉、吉、大吉、凶。\n它们翻面后在你眼前快速交错。";
    }
    const host = $("storyChoices");
    if (!host) {
      Bridge._fortuneOpen = false;
      return;
    }
    host.innerHTML = "";
    host.style.display = "grid";
    const board = document.createElement("div");
    board.className = "fortune-board";
    ["吉", "吉", "大吉", "凶"].forEach((label, i) => {
      const card = document.createElement("button");
      card.className = "fortune-card";
      card.type = "button";
      card.innerHTML = `<div class="fortune-card-inner">
        <div class="fortune-card-face fortune-card-front">${label}</div>
        <div class="fortune-card-face fortune-card-back">命签</div>
      </div>`;
      board.appendChild(card);
      setTimeout(() => card.classList.add("dealt"), i * 260);
    });
    host.appendChild(board);
    const pack = fortunePack();
    setTimeout(() => {
      board.querySelectorAll(".fortune-card").forEach((card) => card.classList.add("face-down"));
    }, 2700);
    setTimeout(() => board.classList.add("shuffling"), 4050);
    setTimeout(() => {
      board.classList.remove("shuffling");
      if ($("storyText")) $("storyText").textContent = body + "\n\n命签摊开：吉、吉、大吉、凶。\n它们翻面后在你眼前快速交错。\n\n请选择一张。";
      [...board.querySelectorAll(".fortune-card")].forEach((card, i) => {
        card._fortune = pack[i];
        card.classList.add("selectable");
        card.onclick = () => revealDeepFortune(board, card, node);
      });
    }, 6800);
  }
  function revealDeepFortune(board, selected, node) {
    const fortune = selected._fortune || { label: "吉", luck: 12, text: "签面为吉。" };
    board.querySelectorAll(".fortune-card").forEach((card) => {
      card.classList.remove("selectable");
      card.onclick = null;
      card.disabled = true;
      if (card !== selected) card.style.opacity = ".42";
    });
    const front = selected.querySelector(".fortune-card-front");
    if (front) front.textContent = fortune.label;
    selected.disabled = false;
    selected.classList.remove("face-down");
    selected.classList.add("revealed");
    const run = Bridge.run;
    const logs = [];
    if (run && fortune.luck) logs.push(...FateExplore.applyEffect(run, "ADD_LUCK", fortune.luck));
    if (run && fortune.hp) logs.push(...FateExplore.applyEffect(run, "HEAL_HP", fortune.hp));
    if (run && fortune.yuan) logs.push(...FateExplore.applyEffect(run, "ADD_YUAN", fortune.yuan));
    if (run) FateExplore.markResolved(run, node);
    syncRunHud();
    const result = `你翻开命签，签面亮起：${fortune.label}。\n\n${fortune.text}${logs.length ? "\n" + logs.join(" · ") : ""}`;
    if ($("storyText")) $("storyText").textContent = result;
    toast(logs.join(" · ") || fortune.label);
    if (typeof global.playSfx === "function") playSfx("page");
    const nextBtn = $("storyNextBtn");
    if ($("storyActions")) $("storyActions").style.display = "flex";
    if (nextBtn) {
      const prev = nextBtn.onclick;
      nextBtn.textContent = "返回牌阵";
      nextBtn.onclick = () => {
        nextBtn.onclick = prev;
        nextBtn.textContent = "继续";
        closeDeepFortune();
      };
    }
  }
  function closeDeepFortune() {
    Bridge._fortuneOpen = false;
    const screen = $("storyScreen");
    if (screen) screen.classList.remove("event-dialog", "choice-dialog", "shop-dialog");
    if ($("storyChoices")) {
      $("storyChoices").innerHTML = "";
      $("storyChoices").style.display = "none";
    }
    if ($("storyActions")) $("storyActions").style.display = "none";
    if (Bridge.run && !Bridge.run.alive) {
      return extractDeepRun(false, { forced: true });
    }
    if (typeof global.switchScreen === "function") switchScreen("mapScreen");
    renderDeepMap();
  }

  function presentDeepNode() {
    const run = Bridge.run;
    if (!run) return;
    const cur = run.nodes[run.pos];
    if (!cur) return;
    cur.revealed = true;
    const kindLabel = cur.kind === "start" ? "起点" : cur.kind === "stairs" ? "上台阶" : cur.kind === "exit" ? "撤离" : cur.type || "命运";
    if ($("mapPanelTitle")) $("mapPanelTitle").textContent = `${cur.name || "命运"} · ${kindLabel}`;
    const text =
      (cur.conf && cur.conf.正文) ||
      (cur.kind === "start" ? "已抵达起点。选择相邻发光命运牌前进。" : "");
    if ($("mapPanelText")) {
      $("mapPanelText").textContent =
        text +
        (cur.kind === "start"
          ? "\n可用右下角方向键，或点相邻发光牌前进。"
          : cur.kind === "stairs"
            ? "\n这是本页最后一格。走上来会翻开此牌，确认后再前往新区域。"
            : cur.kind === "exit"
              ? FateExplore.canExtract(run)
                ? "\n已抵达终点。击败首领后可从这里撤离，带走本局收获。"
                : FateExplore.mapHasBoss(run) && !run.bossDefeated
                  ? "\n已抵达终点，但本层首领还没倒下。先去打红色的首领牌，再回到这里撤离。"
                  : "\n这是最后一页的终点格，可从这里撤离。"
              : "\n可用右下角方向键或点击相邻发光牌继续。");
    }
    const box = $("deepMapChoices");
    if (!box) return;
    box.style.display = "none";
    box.innerHTML = "";
    if (cur.resolved || cur.kind === "start") return;

    if (cur.kind === "exit" || cur.type === "撤离") {
      box.style.display = "grid";
      const b = document.createElement("button");
      const ready = FateExplore.canExtract(run);
      b.className = ready ? "primary-btn" : "choice-btn";
      b.textContent = ready ? "撤离" : "尝试撤离";
      b.onclick = () => tryExtract();
      box.appendChild(b);
      return;
    }
    if (cur.kind === "stairs" || cur.flipLayer) {
      if (cur._justArrived) {
        if ($("mapPanelText")) $("mapPanelText").textContent = "剑符落在上台阶牌背上，命运正在翻开……";
        box.style.display = "none";
        if (!cur._flipTimer) {
          cur._flipTimer = setTimeout(() => {
            cur._justArrived = false;
            cur._flipTimer = null;
            if (Bridge.run && Bridge.run.nodes[Bridge.run.pos] === cur) presentDeepNode();
          }, 1600);
        }
        return;
      }
      if ($("mapPanelText")) {
        $("mapPanelText").textContent =
          (cur.conf && cur.conf.正文 ? cur.conf.正文 + "\n\n" : "") +
          "牌面翻开。再往前是新的区域，点按钮后才会切换牌阵。";
      }
      box.style.display = "grid";
      const b = document.createElement("button");
      b.className = "primary-btn";
      b.textContent = "前往新区域";
      b.onclick = () => {
        box.style.display = "none";
        goNextDeepLayer(cur);
      };
      box.appendChild(b);
      return;
    }
    if (cur.type === "战斗" || cur.kind === "battle" || cur.isBoss) {
      box.style.display = "grid";
      const b = document.createElement("button");
      b.className = "choice-btn";
      b.textContent = cur.isBoss ? "挑战首领" : "进入战斗";
      b.onclick = () => beginDeepBattle(cur, cur.conf && cur.conf.怪物ID);
      box.appendChild(b);
      return;
    }
    if (cur.type === "商店") {
      box.style.display = "grid";
      const b = document.createElement("button");
      b.className = "choice-btn";
      b.textContent = "浏览摊位";
      b.onclick = () => {
        FateSave.addCurrency(Bridge.profile, "mingChen", 8);
        run.pendingReward = (run.pendingReward || 0) + 8;
        saveProfile();
        FateExplore.markResolved(run, cur);
        toast("买到一点命尘（撤离时才真正带回）");
        renderDeepMap();
      };
      box.appendChild(b);
      return;
    }
    if (cur.type === "问心" || cur.kind === "fortune") {
      box.style.display = "none";
      if (!cur.resolved && !Bridge._fortuneOpen) openDeepFortune(cur);
      return;
    }
    if (cur.type === "灵藏" || cur.kind === "treasure") {
      box.style.display = "grid";
      const b = document.createElement("button");
      b.className = "choice-btn";
      b.textContent = "拾取灵藏";
      b.onclick = () => resolveNode(1);
      box.appendChild(b);
      return;
    }
    box.style.display = "grid";
    const opt1 = (cur.conf && cur.conf.选项1文本) || "推进命运";
    const b = document.createElement("button");
    b.className = "choice-btn";
    b.textContent = opt1;
    b.onclick = () => resolveNode(1);
    box.appendChild(b);
    if (cur.conf && cur.conf.选项2文本) {
      const b2 = document.createElement("button");
      b2.className = "choice-btn";
      b2.textContent = cur.conf.选项2文本;
      b2.onclick = () => resolveNode(2);
      box.appendChild(b2);
    }
  }

  function goNextDeepLayer(cur) {
    const run = Bridge.run;
    if (!run || !cur || Bridge._layerTransit) return;
    Bridge._layerTransit = true;
    cur.resolved = true;
    cur._justArrived = false;
    const dest =
      run.nodes.find((n) => n.layer === cur.layer + 1 && n.kind === "start") ||
      run.nodes.find((n) => n.layer === cur.layer + 1);
    if (!dest) {
      Bridge._layerTransit = false;
      return toast("没有下一层");
    }
    const board = $("fateMap");
    if (board) board.style.animation = "mapSlideUp 1.05s ease both";
    toast("前往新区域");
    setTimeout(() => {
      run.layer = dest.layer;
      run.pos = dest.index;
      dest.revealed = true;
      dest.resolved = true;
      dest.kind = "start";
      dest.mark = dest.mark || "起";
      if (board) board.style.animation = "";
      Bridge._layerTransit = false;
      renderDeepMap();
    }, 1050);
  }

  function resolveNode(opt) {
    const run = Bridge.run;
    const r = FateExplore.resolveChoice(run, opt);
    if (r && r.ok && r.action === "battle") return beginDeepBattle(r.node, r.monsterId);
    if (r && r.ok && r.action === "done") toast((r.logs && r.logs.join(" · ")) || "命运已推进");
    else {
      FateExplore.markResolved(run, run.nodes[run.pos]);
      run.pendingReward = (run.pendingReward || 0) + 5;
      toast("命运已推进");
    }
    renderDeepMap();
  }

  function tryExtract() {
    const run = Bridge.run;
    if (!run) return;
    if (FateExplore.canExtract(run)) {
      showModalHtmlSafe(
        "撤离",
        `<p>已抵达终点。撤离后将带回本局奖励。</p>
         <button class="primary-btn" id="confirmExtract" style="width:100%;margin-top:8px;">确认撤离</button>`
      );
      const b = $("confirmExtract");
      if (b) b.onclick = () => {
        closeModalSafe();
        extractDeepRun(true);
      };
      return;
    }
    const onExit = FateExplore.onExitCell(run);
    const needBoss = FateExplore.mapHasBoss(run) && !run.bossDefeated;
    if (onExit && needBoss) {
      showModalHtmlSafe(
        "先击败首领",
        `<p>这已经是最后一格。请先去打红色的首领牌，再回到这里撤离，才能带走本局收获。</p>
         <button class="choice-btn" id="confirmExtract" style="width:100%;margin-top:8px;">放弃收获并离开</button>`
      );
    } else if (!onExit) {
      showModalHtmlSafe(
        "撤离",
        `<p>请先走到本页最上方的撤离格（归）。现在离开会失去本局已获得的奖励。</p>
         <button class="choice-btn" id="confirmExtract" style="width:100%;margin-top:8px;">放弃收获并离开</button>`
      );
    } else {
      showModalHtmlSafe(
        "提前撤离",
        `<p>现在离开会失去本局已获得的奖励。</p>
         <button class="choice-btn" id="confirmExtract" style="width:100%;margin-top:8px;">放弃收获并离开</button>`
      );
    }
    const b = $("confirmExtract");
    if (b)
      b.onclick = () => {
        closeModalSafe();
        extractDeepRun(false);
      };
  }

  function extractDeepRun(success, opts) {
    if (Bridge._leavingWorld) return;
    const run = Bridge.run;
    if (!run) return enterFushiBase({ playIntro: false });
    Bridge._leavingWorld = true;
    const forced = !!(opts && opts.forced);
    if (Bridge.profile) {
      if (success && run) {
        const gain = 20 + run.depth * 10 + (run.pendingReward || 0);
        FateSave.addCurrency(Bridge.profile, "mingChen", gain);
        const worldId = run.worldId || "WORLD_QINGMU";
        const prog = Bridge.profile.worldProgress[worldId] || { depthCleared: 0, unlockedDepth: 1 };
        prog.depthCleared = Math.max(prog.depthCleared || 0, run.depth);
        prog.unlockedDepth = Math.max(prog.unlockedDepth || 1, run.depth + 1);
        Bridge.profile.worldProgress[worldId] = prog;
        Bridge.profile.runCount = (Bridge.profile.runCount || 0) + 1;
        if (worldId === "WORLD_QINGMU" && run.depth >= 2) {
          const n = unlockFatesByPath("青木界深度2撤离");
          if (n) toast(`撤离成功，带回命尘 ${gain}，并解锁 ${n} 张命运卡`);
          else toast(`撤离成功，带回命尘 ${gain}`);
        } else if (worldId === "WORLD_YAO" && run.depth >= 1) {
          const n = unlockFatesByPath("妖灵界深度1撤离");
          if (n) toast(`撤离成功，带回命尘 ${gain}，并解锁 ${n} 张命运卡`);
          else toast(`撤离成功，带回命尘 ${gain}`);
        } else {
          toast(`撤离成功，带回命尘 ${gain}`);
        }
      } else {
        toast(forced ? "气血耗尽，被迫撤离。本局奖励未能带回。" : "已返回青崖峰，本局奖励未带回");
      }
      Bridge.profile.savedWorldRun = null;
      saveProfile();
    }
    Bridge.run = null;
    Bridge.battle = null;
    Bridge._leavingWorld = false;
    enterFushiBase({ playIntro: false });
  }

  function pauseWorld() {
    if (!Bridge.profile || !Bridge.run) return;
    Bridge.profile.savedWorldRun = {
      run: Bridge.run,
      battle: Bridge.battle ? snapshotBattle(Bridge.battle) : null,
    };
    saveProfile();
    toast("进度已暂时保存");
    Bridge.run = null;
    Bridge.battle = null;
    enterFushiBase({ playIntro: false });
  }

  function toChushiCard(c) {
    const suit = SUIT_KEY[c.suit] || "S";
    const value = RANK_PIP[c.rank] || 1;
    return { suit, value, name: c.label || c.name, uid: c.uid, _src: c };
  }
  function cardHtmlChushi(card, selected) {
    const v = card.value;
    const sym = SUIT_SYM[card.suit] || "♠";
    const rank = ({ 1: "A", 11: "J", 12: "Q", 13: "K" }[v] || String(v));
    return {
      className: "play-card suit-" + card.suit.toLowerCase() + (selected ? " selected" : ""),
      html: `<div class="card-rank">${sym}${rank}<span class="card-elem">${ELEM[card.suit] || ""}</span></div>
        <div class="card-chip">${ELEM[card.suit] || ""}</div>
        <div class="card-corner"><span class="card-stem">${STEM[v] || ""}</span><span class="card-suit">${sym}</span></div>`,
    };
  }

  function collectEffects(loadout) {
    const effects = [];
    const env = [];
    const cfg = Bridge.config || {};
    const stats = heroBaseStats();
    if (stats.atk > 0) {
      effects.push({
        名称: "基础攻击",
        效果类型: "ADD_SCORE_FLAT",
        参数A: stats.atk,
        组别: "基础",
        描述: `主角当前基础攻击力 ${stats.atk}。每次出牌伤害分+${stats.atk}。可在传承台用命尘升级。`,
      });
    }
    if (loadout && loadout.heritage && cfg.heritages[loadout.heritage]) {
      const h = cfg.heritages[loadout.heritage];
      effects.push(Object.assign({}, h, { 名称: h.名称, 组别: "传承" }));
    }
    (loadout && loadout.relics ? loadout.relics : []).forEach((id) => {
      const r = cfg.relics[id];
      if (r) effects.push(Object.assign({}, r, { 名称: r.名称, 组别: "宝物" }));
    });
    if (loadout && loadout.tian) {
      const t = lookupTian(loadout.tian);
      if (t) env.push(Object.assign({}, t, { 名称: "天时·" + t.名称, 组别: "天时" }));
    }
    if (loadout && loadout.dili) {
      const d = lookupDi(loadout.dili);
      if (d) env.push(Object.assign({}, d, { 名称: "地利·" + d.名称, 组别: "地利" }));
    }
    if (loadout && loadout.ren) {
      const ren = lookupRen(loadout.ren);
      if (ren && String(ren.技能类型 || "") === "被动") {
        effects.push(Object.assign({}, ren, { 名称: "人和·" + (ren.名称 || ""), 组别: "人和" }));
      }
    }
    return { effects, env };
  }

  function beginDeepBattle(node, monsterId) {
    const mob =
      (Bridge.config && Bridge.config.monsters[monsterId]) ||
      { 名称: node && node.isBoss ? "黑雾首领" : "黑雾怪", 气血: node && node.isBoss ? 320 : 180, 回合1压迫: 60, 回合1真实伤害: 12 };
    Bridge.battleNode = node;
    Bridge.selected = new Set();
    Bridge.training = false;
    Bridge.inspectMode = false;
    const loadout = (Bridge.profile && Bridge.profile.loadout) || {};
    Bridge.loadout = loadout;
    const { effects, env } = collectEffects(loadout);
    Bridge.battle = FateBattle.createBattle({
      enemyHp: Number(mob.气血) || 180,
      playerHp: Bridge.run ? Bridge.run.hp : 100,
      pressure: Number(mob.回合1压迫) || 60,
      trueDamage: Number(mob.回合1真实伤害 || mob.回合1真实) || 12,
      effects,
      envEffects: env,
    });
    Bridge.battle._mob = mob;
    Bridge.battle._enemyMaxHp = Number(mob.气血) || Bridge.battle.enemyHp;
    applyOpenHeals(Bridge.battle, effects.concat(env));
    startBgm("battle");
    const bg = $("battleBg");
    if (bg) {
      bg.className = "painted-bg " + (node && node.isBoss ? "bg-boss" : "bg-battle");
      hydrateBg(bg);
    }
    if (global.state) state._fushiDeepBattle = true;
    if (typeof global.switchScreen === "function") switchScreen("battleScreen");
    renderDeepBattle();
    bindDeepBattleButtons();
    showTrainBar(false);
  }

  function applyOpenHeals(battle, list) {
    list.forEach((e) => {
      const t = e.效果类型 || e.type;
      const a = Number(e.参数A) || 0;
      if (t === "HEAL_HP") battle.playerHp = Math.min(999, battle.playerHp + a);
      if (t === "MODIFY_PLAYS") {
        battle.playsPerTurn += a;
        battle.playsLeft += a;
      }
      if (t === "MODIFY_DISCARDS") {
        battle.discardsPerTurn += a;
        battle.discardsLeft += a;
      }
    });
  }

  function snapshotBattle(b) {
    return {
      hand: b.hand,
      drawPile: b.drawPile,
      discardPile: b.discardPile,
      enemyHp: b.enemyHp,
      playerHp: b.playerHp,
      pressure: b.pressure,
      trueDamage: b.trueDamage,
      turn: b.turn,
      playsLeft: b.playsLeft,
      discardsLeft: b.discardsLeft,
      playsPerTurn: b.playsPerTurn,
      discardsPerTurn: b.discardsPerTurn,
      handSize: b.handSize,
      drawPerTurn: b.drawPerTurn,
      floorRatio: b.floorRatio,
      effects: b.effects,
      envEffects: b.envEffects,
      _mob: b._mob,
      _enemyMaxHp: b._enemyMaxHp,
      training: Bridge.training,
      loadout: Bridge.loadout,
      battleNode: Bridge.battleNode,
      renUses: Bridge.renUses || {},
    };
  }
  function restoreBattle(snap) {
    const b = FateBattle.createBattle({
      enemyHp: snap.enemyHp,
      playerHp: snap.playerHp,
      pressure: snap.pressure,
      trueDamage: snap.trueDamage,
      effects: snap.effects,
      envEffects: snap.envEffects,
    });
    ["hand", "drawPile", "discardPile", "turn", "playsLeft", "discardsLeft", "playsPerTurn", "discardsPerTurn", "handSize", "drawPerTurn", "floorRatio"].forEach(
      (k) => {
        if (snap[k] != null) b[k] = snap[k];
      }
    );
    b._mob = snap._mob;
    b._enemyMaxHp = snap._enemyMaxHp || (snap._mob && snap._mob.气血) || snap.enemyHp;
    Bridge.renUses = snap.renUses || {};
    Bridge.loadout = snap.loadout;
    Bridge.training = !!snap.training;
    Bridge.battleNode = snap.battleNode || null;
    return b;
  }

  function rowDesc(row) {
    if (!row) return "";
    return row.描述 || row.效果说明 || "";
  }
  function describeId(kind, id) {
    const cfg = Bridge.config || {};
    if (kind === "heritage") return rowDesc(cfg.heritages[id]);
    if (kind === "tian") return rowDesc(lookupTian(id));
    if (kind === "dili") return rowDesc(lookupDi(id));
    if (kind === "ren") return rowDesc(lookupRen(id));
    return "";
  }
  function refreshTrainDescs() {
    const map = [
      ["trHeritage", "trHeritageDesc", "heritage"],
      ["trTian", "trTianDesc", "tian"],
      ["trDi", "trDiDesc", "dili"],
      ["trRen", "trRenDesc", "ren"],
    ];
    map.forEach(([sel, desc, kind]) => {
      const el = $(desc);
      const box = $(sel);
      if (el && box) el.textContent = describeId(kind, box.value) || "暂无说明";
    });
  }
  const TRAIN_HP_MIN = 200;
  const TRAIN_HP_MAX = 1000;
  const TRAIN_HP_DEFAULT = 500;
  const TRAIN_HP_STEP = 50;
  function clampTrainHp(n) {
    const raw = Number(n);
    if (!Number.isFinite(raw)) return TRAIN_HP_DEFAULT;
    const snapped = Math.round(raw / TRAIN_HP_STEP) * TRAIN_HP_STEP;
    return Math.min(TRAIN_HP_MAX, Math.max(TRAIN_HP_MIN, snapped));
  }
  function paintTrainHpTrack(v) {
    const slider = $("trHp");
    if (!slider) return;
    const pct = ((v - TRAIN_HP_MIN) / (TRAIN_HP_MAX - TRAIN_HP_MIN)) * 100;
    slider.style.background = `linear-gradient(90deg, #c9a227 ${pct}%, rgba(105,65,24,.18) ${pct}%)`;
  }
  function currentTrainHp() {
    return clampTrainHp($("trHp") && $("trHp").value);
  }
  function setTrainHp(n) {
    const v = clampTrainHp(n);
    if ($("trHp")) $("trHp").value = String(v);
    if ($("trHpValue")) $("trHpValue").textContent = String(v);
    paintTrainHpTrack(v);
    return v;
  }
  function bindTrainHpSlider() {
    const slider = $("trHp");
    if (!slider) return;
    slider.oninput = () => setTrainHp(slider.value);
    if ($("trHpMinus")) $("trHpMinus").onclick = () => setTrainHp(currentTrainHp() - TRAIN_HP_STEP);
    if ($("trHpPlus")) $("trHpPlus").onclick = () => setTrainHp(currentTrainHp() + TRAIN_HP_STEP);
    setTrainHp(slider.value);
  }
  function readTrainLoadout() {
    return {
      heritage: ($("trHeritage") && $("trHeritage").value) || "",
      tian: ($("trTian") && $("trTian").value) || "",
      dili: ($("trDi") && $("trDi").value) || "",
      ren: ($("trRen") && $("trRen").value) || "",
      relics: [...document.querySelectorAll("#trRelics input:checked")].map((x) => x.value),
      enemyHp: currentTrainHp(),
    };
  }
  function applyTrainLoadout(lo) {
    if ($("trHeritage") && lo.heritage) $("trHeritage").value = lo.heritage;
    if ($("trTian") && lo.tian) $("trTian").value = lo.tian;
    if ($("trDi") && lo.dili) $("trDi").value = lo.dili;
    if ($("trRen") && lo.ren) $("trRen").value = lo.ren;
    document.querySelectorAll("#trRelics input").forEach((inp) => {
      inp.checked = (lo.relics || []).includes(inp.value);
    });
    if (lo.enemyHp != null) setTrainHp(lo.enemyHp);
    refreshTrainDescs();
  }
  function randomTrainLoadout(hers, tians, dis, rens, relics) {
    const pick = (arr) => (arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);
    const t = pick(tians);
    const d = pick(dis);
    const r = pick(rens);
    const shuffled = (relics || []).slice().sort(() => Math.random() - 0.5);
    const n = Math.min(shuffled.length, 1 + Math.floor(Math.random() * 3));
    return {
      heritage: pick(hers) || "",
      tian: (t && t.天时ID) || "",
      dili: (d && d.地利ID) || "",
      ren: (r && r.人和ID) || "",
      relics: shuffled.slice(0, n),
    };
  }
  function openTrainingPicker(fromResult) {
    const saved = Bridge.profile && Bridge.profile.savedTraining;
    const pack = global.FateContentPack || {};
    const cfg = Bridge.config || {};
    const hers = pack.trainingHeritageIds || ["HERITAGE_001"];
    const relics = pack.trainingRelicIds || [];
    const tians = (cfg.sheets["10_天时"] || []).slice();
    const dis = (cfg.sheets["11_地利"] || []).slice();
    const rens = (cfg.sheets["12_人和"] || []).slice();
    const opt = (list, idKey, nameKey, cur) =>
      list
        .map((x) => {
          const id = x[idKey];
          return `<option value="${id}" ${id === cur ? "selected" : ""}>${x[nameKey] || id}</option>`;
        })
        .join("");
    const loadout = (Bridge.profile && Bridge.profile.loadout) || {};
    const hpInit = clampTrainHp(loadout.enemyHp != null ? loadout.enemyHp : TRAIN_HP_DEFAULT);
    let starting = false;
    showModalHtmlSafe(
      "演武场",
      `<div class="picker-shell">
        <div class="picker-head">
          ${saved ? `<button class="choice-btn" id="resumeTrainBtn" style="width:100%;margin-bottom:6px;">继续上次训练</button>` : ""}
          <p class="pick-lead">选择传承、天时、地利、人和，宝物最多 3 件。</p>
          <div class="train-hp">
            <div class="train-hp-top"><span>木人气血</span><b id="trHpValue">${hpInit}</b></div>
            <div class="hp-slider-row">
              <button type="button" class="hp-step-btn" id="trHpMinus" aria-label="减少气血">−</button>
              <div class="hp-slider-wrap">
                <input type="range" id="trHp" min="${TRAIN_HP_MIN}" max="${TRAIN_HP_MAX}" step="${TRAIN_HP_STEP}" value="${hpInit}" />
                <div class="hp-ticks" aria-hidden="true">${[200,300,400,500,600,700,800,900,1000].map((n) => `<i class="${n === 200 || n === 500 || n === 1000 ? "major" : ""}"></i>`).join("")}</div>
                <div class="hp-tick-labels"><span>200</span><span>500</span><span>1000</span></div>
              </div>
              <button type="button" class="hp-step-btn" id="trHpPlus" aria-label="增加气血">+</button>
            </div>
          </div>
        </div>
        <div class="picker-scroll">
          <div class="train-field"><label>传承</label><select id="trHeritage">${opt(
            hers.map((id) => Object.assign({ 传承ID: id, 名称: id }, cfg.heritages[id] || {})),
            "传承ID",
            "名称",
            loadout.heritage
          )}</select></div>
          <div class="pick-desc" id="trHeritageDesc"></div>
          <div class="train-field"><label>天时</label><select id="trTian">${opt(tians, "天时ID", "名称", loadout.tian)}</select></div>
          <div class="pick-desc" id="trTianDesc"></div>
          <div class="train-field"><label>地利</label><select id="trDi">${opt(dis, "地利ID", "名称", loadout.dili)}</select></div>
          <div class="pick-desc" id="trDiDesc"></div>
          <div class="train-field"><label>人和</label><select id="trRen">${opt(rens, "人和ID", "名称", loadout.ren)}</select></div>
          <div class="pick-desc" id="trRenDesc"></div>
          <p class="pick-lead" style="margin-top:4px;">宝物（最多 3 件）</p>
          <div id="trRelics" class="train-relic-grid"></div>
        </div>
        <div class="picker-foot">
          <div class="option-stack">
            <button class="choice-btn" id="randomTrainBtn">随机方案</button>
            <button class="primary-btn" id="startTrainBtn">进入战斗</button>
          </div>
        </div>
      </div>`,
      () => {
        if (fromResult && !starting) enterFushiBase({ playIntro: false });
      }
    );
    setPickerMode(true);
    const host = $("trRelics");
    if (host) {
      relics.forEach((id) => {
        const r = cfg.relics[id] || {};
        const lab = document.createElement("label");
        lab.className = "train-relic";
        lab.innerHTML = `<input type="checkbox" value="${id}" ${((loadout.relics || []).includes(id) && "checked") || ""}/>
          <div><b>${esc(r.名称 || id)}</b><span>${esc(rowDesc(r) || "暂无说明")}</span></div>`;
        host.appendChild(lab);
      });
      host.querySelectorAll("input").forEach((inp) => {
        inp.onchange = () => {
          const n = host.querySelectorAll("input:checked").length;
          if (n > 3) {
            inp.checked = false;
            toast("宝物最多 3 件");
          }
        };
      });
    }
    ["trHeritage", "trTian", "trDi", "trRen"].forEach((id) => {
      if ($(id)) $(id).onchange = refreshTrainDescs;
    });
    bindTrainHpSlider();
    refreshTrainDescs();
    if ($("resumeTrainBtn"))
      $("resumeTrainBtn").onclick = () => {
        starting = true;
        closeModalSafe();
        resumeTraining();
      };
    if ($("randomTrainBtn"))
      $("randomTrainBtn").onclick = () => {
        applyTrainLoadout(randomTrainLoadout(hers, tians, dis, rens, relics));
        toast("已随手抓了一套");
      };
    if ($("startTrainBtn"))
      $("startTrainBtn").onclick = () => {
        const lo = readTrainLoadout();
        if (lo.relics.length > 3) return toast("宝物最多 3 件");
        if (Bridge.profile) {
          Bridge.profile.loadout = lo;
          saveProfile();
        }
        starting = true;
        closeModalSafe();
        startTrainingBattle(lo);
      };
  }

  function startTrainingBattle(loadout) {
    Bridge.loadout = loadout || (Bridge.profile && Bridge.profile.loadout) || {};
    Bridge.training = true;
    Bridge.run = null;
    Bridge.battleNode = null;
    Bridge.selected = new Set();
    Bridge.inspectMode = false;
    Bridge.renUses = {};
    const { effects, env } = collectEffects(Bridge.loadout);
    const enemyHp = clampTrainHp(Bridge.loadout && Bridge.loadout.enemyHp);
    Bridge.loadout.enemyHp = enemyHp;
    Bridge.battle = FateBattle.createBattle({
      enemyHp,
      playerHp: heroBaseStats().hp,
      pressure: 55,
      trueDamage: 10,
      effects,
      envEffects: env,
    });
    Bridge.battle._mob = { 名称: "训练木人", 气血: enemyHp, 回合2压迫: 70, 回合2真实: 12, 回合3压迫: 90, 回合3真实: 16 };
    Bridge.battle._enemyMaxHp = enemyHp;
    applyOpenHeals(Bridge.battle, effects.concat(env));
    startBgm("battle");
    const bg = $("battleBg");
    if (bg) {
      bg.className = "painted-bg bg-battle";
      hydrateBg(bg);
    }
    if (global.state) state._fushiDeepBattle = true;
    if (typeof global.switchScreen === "function") switchScreen("battleScreen");
    renderDeepBattle();
    bindDeepBattleButtons();
    showTrainBar(true);
    toast("演武场：练习牌型与拼刀");
  }

  function resumeTraining() {
    const snap = Bridge.profile && Bridge.profile.savedTraining;
    if (!snap) return openTrainingPicker();
    Bridge.battle = restoreBattle(snap);
    Bridge.training = true;
    Bridge.selected = new Set();
    if (global.state) state._fushiDeepBattle = true;
    startBgm("battle");
    const bg = $("battleBg");
    if (bg) {
      bg.className = "painted-bg bg-battle";
      hydrateBg(bg);
    }
    if (typeof global.switchScreen === "function") switchScreen("battleScreen");
    renderDeepBattle();
    bindDeepBattleButtons();
    showTrainBar(true);
    toast("回到未完成的训练");
  }

  function showTrainBar() {
    const bar = $("trainBattleBar");
    if (bar) bar.style.display = "none";
    const hint = $("hintBtn");
    if (hint && (Bridge.training || Bridge.mode === "deep" || (global.state && state._fushiDeepBattle))) {
      hint.textContent = "选项";
      hint.disabled = false;
      hint.classList.remove("guided", "continue-glow");
    }
  }
  function hideTrainBar() {
    const bar = $("trainBattleBar");
    if (bar) bar.style.display = "none";
    const hint = $("hintBtn");
    if (hint && !(global.state && state._fushiDeepBattle)) {
      hint.textContent = "提示";
      if (typeof global.showHint === "function") hint.onclick = showHint;
    }
  }

  function shortLabel(name) {
    return String(name || "效")
      .replace(/^天时·/, "")
      .replace(/^地利·/, "")
      .replace(/^人和技·/, "")
      .replace(/^人和·/, "")
      .slice(0, 2);
  }
  function fillRail(battle) {
    const body = $("relicRailBody");
    const row = $("relicRow");
    if (body) body.innerHTML = "";
    if (row) row.innerHTML = "";
    const items = [].concat(battle.effects || []).concat(battle.envEffects || []);
    let lastGroup = "";
    items.forEach((e) => {
      const name = e.名称 || "效果";
      const group = e.组别 || (e.宝物ID ? "宝物" : e.传承ID ? "传承" : "环境");
      const desc = rowDesc(e) || e.效果类型 || "暂无说明";
      if (body && group !== lastGroup) {
        const title = document.createElement("div");
        title.className = "rail-title";
        title.textContent = group;
        body.appendChild(title);
        lastGroup = group;
      }
      if (body) {
        const rail = document.createElement("button");
        rail.type = "button";
        rail.className = "relic-rail-item";
        rail.innerHTML = `<span class="relic-short">${esc(shortLabel(name))}</span><span class="relic-full">${esc(name)}</span>`;
        rail.onclick = () => showModalSafe(name, desc);
        body.appendChild(rail);
      }
      if (row) {
        const chip = document.createElement("span");
        chip.className = "relic-chip";
        chip.textContent = name;
        chip.onclick = () => showModalSafe(name, desc);
        row.appendChild(chip);
      }
    });
    if (body && !body.childElementCount) {
      body.innerHTML = `<button type="button" class="relic-rail-item"><span class="relic-short">无</span><span class="relic-full">无额外效果</span></button>`;
    }
  }
  function resultRow(kind, name, desc) {
    return `<div class="result-row"><b>${esc(kind)} · ${esc(name || "—")}</b><p>${esc(desc || "")}</p></div>`;
  }
  function snapshotTrainResult(win) {
    const b = Bridge.battle;
    return {
      win: !!win,
      playerHp: b ? Math.max(0, b.playerHp) : 0,
      enemyHp: b ? Math.max(0, b.enemyHp) : 0,
      turn: b ? b.turn || 1 : 1,
      loadout: Bridge.loadout || (Bridge.profile && Bridge.profile.loadout) || {},
    };
  }
  function showTrainingResult(snap) {
    const cfg = Bridge.config || {};
    const lo = (snap && snap.loadout) || {};
    const her = cfg.heritages && cfg.heritages[lo.heritage];
    const tian = lookupTian(lo.tian);
    const dili = lookupDi(lo.dili);
    const ren = lookupRen(lo.ren);
    const rows = [
      resultRow("传承", her && her.名称, rowDesc(her)),
      resultRow("天时", tian && tian.名称, rowDesc(tian)),
      resultRow("地利", dili && dili.名称, rowDesc(dili)),
      resultRow("人和", ren && (ren.名称 || ren.技能名), rowDesc(ren)),
    ];
    const relics = lo.relics || [];
    if (!relics.length) rows.push(resultRow("宝物", "未带宝物", ""));
    relics.forEach((id) => {
      const r = cfg.relics && cfg.relics[id];
      rows.push(resultRow("宝物", (r && r.名称) || id, rowDesc(r)));
    });
    const kicker = snap.win
      ? `剩余气血 ${snap.playerHp}　用了 ${snap.turn} 回合`
      : `训练木人还剩 ${snap.enemyHp} 点气血`;
    let leaveBase = true;
    showModalHtmlSafe(
      snap.win ? "演武胜利" : "演武失败",
      `<p class="result-kicker">${kicker}</p>
      <div class="option-stack">
        <button class="primary-btn" id="trainAgainBtn">再练一局</button>
        <button class="choice-btn" id="trainHomeBtn">返回青崖峰</button>
      </div>
      <p>本局搭配</p>
      <div class="result-list">${rows.join("")}</div>`,
      () => {
        if (leaveBase) enterFushiBase({ playIntro: false });
      }
    );
    if ($("trainAgainBtn"))
      $("trainAgainBtn").onclick = () => {
        leaveBase = false;
        closeModalSafe();
        openTrainingPicker(true);
      };
    if ($("trainHomeBtn"))
      $("trainHomeBtn").onclick = () => {
        leaveBase = true;
        closeModalSafe();
      };
  }
  function snapshotWorldBattleResult(win) {
    const b = Bridge.battle;
    const node = Bridge.battleNode;
    const mob = (b && b._mob) || {};
    return {
      win: !!win,
      isBoss: !!(node && node.isBoss),
      mobName: mob.名称 || (node && node.name) || "敌人",
      playerHp: b ? Math.max(0, b.playerHp) : 0,
      enemyHp: b ? Math.max(0, b.enemyHp) : 0,
      turn: b ? b.turn || 1 : 1,
      luckGain: win ? 10 : 0,
      loadout: Bridge.loadout || (Bridge.profile && Bridge.profile.loadout) || {},
    };
  }
  function showWorldBattleResult(snap) {
    const cfg = Bridge.config || {};
    const lo = (snap && snap.loadout) || {};
    const her = cfg.heritages && cfg.heritages[lo.heritage];
    const tian = lookupTian(lo.tian);
    const dili = lookupDi(lo.dili);
    const ren = lookupRen(lo.ren);
    const rows = [
      resultRow("对手", snap.mobName, snap.isBoss ? "本层首领" : "拦路之敌"),
      resultRow("传承", her && her.名称, rowDesc(her)),
      resultRow("天时", tian && tian.名称, rowDesc(tian)),
      resultRow("地利", dili && dili.名称, rowDesc(dili)),
      resultRow("人和", ren && (ren.名称 || ren.技能名), rowDesc(ren)),
    ];
    const relics = lo.relics || [];
    if (!relics.length) rows.push(resultRow("宝物", "未带宝物", ""));
    relics.forEach((id) => {
      const r = cfg.relics && cfg.relics[id];
      rows.push(resultRow("宝物", (r && r.名称) || id, rowDesc(r)));
    });
    const title = snap.win ? (snap.isBoss ? "首领倒下" : "拼刀胜利") : "拼刀失败";
    const kicker = snap.win
      ? `剩余气血 ${snap.playerHp}　用了 ${snap.turn} 回合　气运 +${snap.luckGain}`
      : `气血耗尽。${snap.mobName} 还剩 ${snap.enemyHp} 点气血。本次入世只能撤离离开。`;
    let extracted = false;
    showModalHtmlSafe(
      title,
      `<p class="result-kicker">${kicker}</p>
      <div class="option-stack">
        ${
          snap.win
            ? `<button class="primary-btn" id="worldBattleContinue">继续探索</button>`
            : `<button class="primary-btn" id="worldBattleExtract">被迫撤离</button>`
        }
      </div>
      <p>本局搭配</p>
      <div class="result-list">${rows.join("")}</div>`,
      () => {
        if (snap.win) {
          if (typeof global.switchScreen === "function") switchScreen("mapScreen");
          renderDeepMap();
          return;
        }
        if (!extracted) extractDeepRun(false, { forced: true });
      }
    );
    if ($("worldBattleContinue"))
      $("worldBattleContinue").onclick = () => {
        closeModalSafe();
      };
    if ($("worldBattleExtract"))
      $("worldBattleExtract").onclick = () => {
        extracted = true;
        closeModalSafe();
        extractDeepRun(false, { forced: true });
      };
  }
  function settleDeepBattle(win) {
    startBgm("story");
    if (global.state) state._fushiDeepBattle = false;
    hideTrainBar();
    if (Bridge.training) {
      if (Bridge.profile) {
        Bridge.profile.savedTraining = null;
        if (win && global.FateSave) FateSave.addCurrency(Bridge.profile, "mingChen", 10);
        saveProfile();
      }
      const snap = snapshotTrainResult(win);
      Bridge.battle = null;
      showTrainingResult(snap);
      return;
    }
    if (Bridge.run && Bridge.battle) Bridge.run.hp = Math.max(0, Bridge.battle.playerHp);
    const snap = snapshotWorldBattleResult(win);
    if (win) {
      if (Bridge.battleNode && Bridge.run) FateExplore.afterBattleVictory(Bridge.run, Bridge.battleNode);
      Bridge.battle = null;
      if (Bridge.profile && Bridge.run) {
        Bridge.profile.savedWorldRun = { run: Bridge.run, battle: null };
        saveProfile();
      }
      showWorldBattleResult(snap);
      return;
    }
    if (Bridge.run) {
      Bridge.run.hp = 0;
      Bridge.run.alive = false;
    }
    Bridge.battle = null;
    showWorldBattleResult(snap);
  }

  function renderDeepBattle() {
    const b = Bridge.battle;
    if (!b) return;
    const mob = b._mob || {};
    if ($("battleHp")) $("battleHp").textContent = b.playerHp;
    const maxHp = b._enemyMaxHp || (b._mob && b._mob.气血) || b.enemyHp || 1;
    if ($("enemyName")) $("enemyName").textContent = (b._mob && b._mob.名称) || "敌人";
    if ($("enemyHpText")) $("enemyHpText").textContent = Math.max(0, b.enemyHp) + "/" + maxHp;
    if ($("enemyHpFill")) $("enemyHpFill").style.width = Math.max(0, Math.min(100, (b.enemyHp / maxHp) * 100)) + "%";
    if ($("battleLuck") && Bridge.profile) $("battleLuck").textContent = (Bridge.run && Bridge.run.luck) || 40;
    if ($("skillState")) {
      const ren = lookupRen((Bridge.loadout && Bridge.loadout.ren) || (Bridge.profile && Bridge.profile.loadout && Bridge.profile.loadout.ren) || "REN_001");
      $("skillState").textContent = (ren && ren.名称) || "青崖剑诀";
    }
    if ($("battleInfoTitle")) $("battleInfoTitle").textContent = mob.名称 || "敌人";
    if ($("intentScore")) $("intentScore").textContent = b.pressure;
    if ($("intentDamage")) $("intentDamage").textContent = b.trueDamage;
    const preview = b.preview ? b.preview([...Bridge.selected]) : { damage: 0, pattern: "—" };
    if ($("intentTaken")) $("intentTaken").textContent = Bridge.selected.size ? preview.damage : "—";
    if ($("enemyIntent")) {
      $("enemyIntent").classList.toggle("intent-win", Bridge.selected.size > 0 && preview.damage >= b.pressure);
      $("enemyIntent").dataset.pressure = b.pressure;
      $("enemyIntent").dataset.damage = b.trueDamage;
    }
    if ($("comboPreview")) {
      $("comboPreview").innerHTML = Bridge.selected.size
        ? `<div class="combo-meter">
            <div class="combo-pill"><span>当前牌型</span><b>${preview.pattern}</b></div>
            <div class="combo-pill"><span>最终伤害分</span><b class="${preview.damage >= b.pressure ? "score-ok" : "score-bad"}">${preview.damage}</b></div>
            <div class="combo-pill"><span>出牌</span><b>${b.playsLeft}</b></div>
            <div class="combo-pill"><span>弃牌</span><b>${b.discardsLeft}</b></div>
          </div>`
        : `<strong>拼刀</strong>选牌组成牌型，伤害分压过压迫分可减少承伤。敌方气血 ${b.enemyHp} · 我方 ${b.playerHp}`;
    }
    if ($("battleLog")) $("battleLog").textContent = `${mob.名称 || "敌人"} 气血 ${b.enemyHp}　|　我方气血 ${b.playerHp}`;
    fillRail(b);
    const zone = $("handZone");
    if (!zone) return;
    zone.innerHTML = "";
    b.hand.forEach((c) => {
      const painted = cardHtmlChushi(toChushiCard(c), Bridge.selected.has(c.uid));
      const el = document.createElement("div");
      el.className = painted.className;
      el.innerHTML = painted.html;
      el.onclick = () => {
        if (Bridge._resolving) return;
        if (Bridge.inspectMode) {
          showDeepCardDetail(c);
          return;
        }
        if (Bridge.selected.has(c.uid)) Bridge.selected.delete(c.uid);
        else {
          if (Bridge.selected.size >= 5) return toast("最多选 5 张");
          Bridge.selected.add(c.uid);
        }
        if (typeof global.playSfx === "function") playSfx("page");
        renderDeepBattle();
      };
      zone.appendChild(el);
    });
    if ($("scoreLane") && !Bridge._resolving) $("scoreLane").innerHTML = "";
    const cardW = 58,
      overlap = 9,
      count = b.hand.length;
    const needed = cardW + Math.max(0, count - 1) * (cardW - overlap);
    zone.style.setProperty("--hand-scale", needed > (zone.clientWidth || 280) ? Math.max(0.76, (zone.clientWidth || 280) / needed) : "1");
  }

  function bindDeepBattleButtons() {
    const playBtn = $("playBtn");
    const skillBtn = $("skillBtn");
    const hintBtn = $("hintBtn");
    if (playBtn) {
      playBtn.disabled = false;
      playBtn.onclick = onDeepPlay;
    }
    if (skillBtn) {
      skillBtn.disabled = false;
      skillBtn.textContent = "技能";
      skillBtn.onclick = onRenSkill;
    }
    if (hintBtn) {
      hintBtn.textContent = "选项";
      hintBtn.disabled = false;
      hintBtn.classList.remove("guided", "continue-glow");
      hintBtn.onclick = openBattleOptions;
    }
    const disc = $("deepDiscardBtn");
    if (disc) disc.onclick = onDeepDiscard;
    if ($("inspectModeBtn")) {
      $("inspectModeBtn").onclick = onDeepInspect;
      $("inspectModeBtn").classList.toggle("active", !!Bridge.inspectMode);
    }
    if ($("deckBtn")) $("deckBtn").onclick = onDeepDeck;
    if ($("sortSuitBtn")) $("sortSuitBtn").onclick = () => onDeepSort("suit");
    if ($("sortRankBtn")) $("sortRankBtn").onclick = () => onDeepSort("rank");
  }

  function showDeepCardDetail(c) {
    const painted = toChushiCard(c);
    const chip = painted.value === 1 ? 11 : Math.min(painted.value, 10);
    showModalHtmlSafe(
      c.label || "手牌",
      `<p>五行 ${esc(c.elem || "—")}　天干 ${esc(c.name || "—")}</p>
       <p>基础伤害 ${chip}</p>
       <p>可参与凑牌型。点数和牌型倍率共同决定最终伤害分。</p>`
    );
  }
  function onDeepInspect() {
    if (!Bridge.battle) return;
    Bridge.inspectMode = !Bridge.inspectMode;
    if ($("inspectModeBtn")) $("inspectModeBtn").classList.toggle("active", !!Bridge.inspectMode);
    toast(Bridge.inspectMode ? "查看效果：点手牌看详情" : "选择模式：点手牌弹起");
  }
  function sortDeepCards(arr, mode) {
    const suitOrder = { SPADE: 0, HEART: 1, CLUB: 2, DIAMOND: 3 };
    const pip = (c) => (c.rank === "A" ? 14 : Number(c.pip) || 0);
    return arr.slice().sort((a, b) => {
      if (mode === "rank") return pip(b) - pip(a) || suitOrder[a.suit] - suitOrder[b.suit];
      return suitOrder[a.suit] - suitOrder[b.suit] || pip(b) - pip(a);
    });
  }
  function onDeepSort(mode) {
    const b = Bridge.battle;
    if (!b) return;
    Bridge.deckSort = mode;
    b.hand = sortDeepCards(b.hand, mode);
    Bridge.selected.clear();
    renderDeepBattle();
    toast(mode === "rank" ? "已按数字排序" : "已按花色排序");
  }
  function deckCardHtml(c) {
    const painted = toChushiCard(c);
    const sym = SUIT_SYM[painted.suit] || "";
    const rank = ({ 1: "A", 11: "J", 12: "Q", 13: "K" }[painted.value] || String(painted.value));
    return `<div class="deck-card">${sym}${rank}</div>`;
  }
  function onDeepDeck() {
    const b = Bridge.battle;
    if (!b) return;
    const mode = Bridge.deckSort || "suit";
    const draw = sortDeepCards(b.drawPile || [], mode);
    const gone = sortDeepCards(b.discardPile || [], mode);
    showModalHtmlSafe(
      "查看牌组",
      `<p>抽牌堆 ${draw.length}　弃牌堆 ${gone.length}　手牌 ${(b.hand || []).length}</p>
       <p><strong>抽牌堆（未摸）</strong></p>
       <div class="deck-grid">${draw.map(deckCardHtml).join("") || "<p>空</p>"}</div>
       <p><strong>弃牌堆</strong></p>
       <div class="deck-grid">${gone.map(deckCardHtml).join("") || "<p>空</p>"}</div>`
    );
  }

  function openBattleOptions() {
    const restartBtn = Bridge.training
      ? `<button class="choice-btn" id="optRestart">重开</button>`
      : "";
    const exitBtnHtml = Bridge.training
      ? `<button class="choice-btn" id="optExit">退出</button>`
      : "";
    showModalHtmlSafe(
      "选项",
      `<div class="option-stack">
        ${exitBtnHtml}
        ${restartBtn}
        <button class="choice-btn" id="optPause">暂时离开</button>
      </div>`
    );
    const exitBtn = $("optExit");
    const pauseBtn = $("optPause");
    const restart = $("optRestart");
    if (exitBtn)
      exitBtn.onclick = () => {
        closeModalSafe();
        onTrainExit();
      };
    if (restart)
      restart.onclick = () => {
        closeModalSafe();
        onTrainRestart();
      };
    if (pauseBtn)
      pauseBtn.onclick = () => {
        closeModalSafe();
        onTrainPause();
      };
  }

  function renUseInfo() {
    const lo = Bridge.loadout || (Bridge.profile && Bridge.profile.loadout) || {};
    const ren = lookupRen(lo.ren || "REN_001");
    if (!ren) return { lo, ren: null, id: "", used: 0, max: 0, left: 0, passive: false };
    const id = ren.人和ID || lo.ren;
    const passive = String(ren.技能类型 || "") === "被动";
    let max = passive ? 0 : Number(ren.每场次数) || 1;
    if (!passive && lo.heritage === "HERITAGE_033" && (ren.效果类型 === "CONVERT_PLAYED_RANK" || id === "REN_001")) max += 1;
    const used = (Bridge.renUses && Bridge.renUses[id]) || 0;
    return { lo, ren, id, used, max, left: Math.max(0, max - used), passive };
  }
  function onRenSkill() {
    if (!Bridge.battle || Bridge._resolving) return;
    const info = renUseInfo();
    if (!info.ren) return toast("未装备人和技");
    if (info.passive) {
      showModalHtmlSafe(
        "人和技 · " + (info.ren.名称 || "技能"),
        `<p>${esc(rowDesc(info.ren) || "暂无说明")}</p>
         <p>这是被动技能，开战已经生效，不必再点使用。</p>
         <div class="option-stack">
           <button class="choice-btn" id="cancelRenBtn">知道了</button>
         </div>`
      );
      if ($("cancelRenBtn")) $("cancelRenBtn").onclick = () => closeModalSafe();
      return;
    }
    const needCard = ["CONVERT_PLAYED_RANK", "CONVERT_SUIT", "SACRIFICE_ADD"].includes(info.ren.效果类型);
    showModalHtmlSafe(
      "人和技 · " + (info.ren.名称 || "技能"),
      `<p>${esc(rowDesc(info.ren) || "暂无说明")}</p>
       <p>本场剩余 ${info.left} / ${info.max} 次</p>
       ${needCard ? "<p>使用前请先选中恰好 1 张手牌。</p>" : ""}
       <div class="option-stack">
         <button class="primary-btn" id="useRenBtn"${info.left ? "" : " disabled"}>使用技能</button>
         <button class="choice-btn" id="cancelRenBtn">取消</button>
       </div>`
    );
    if ($("useRenBtn"))
      $("useRenBtn").onclick = () => {
        if (!info.left) return toast("本场次数用完");
        if (needCard && Bridge.selected.size !== 1) return toast("先选中恰好 1 张手牌");
        closeModalSafe();
        applyRenSkill();
      };
    if ($("cancelRenBtn")) $("cancelRenBtn").onclick = () => closeModalSafe();
  }
  function applyRenSkill() {
    const b = Bridge.battle;
    if (!b || Bridge._resolving) return;
    const info = renUseInfo();
    const ren = info.ren;
    if (!ren) return toast("未装备人和技");
    const id = info.id;
    Bridge.renUses = Bridge.renUses || {};
    if (info.left <= 0) return toast("本场次数用完");
    const t = ren.效果类型;
    if (t === "CONVERT_PLAYED_RANK") {
      if (Bridge.selected.size !== 1) return toast("先选中恰好 1 张手牌");
      const uid = [...Bridge.selected][0];
      const card = b.hand.find((c) => c.uid === uid);
      const order = FateBattle.RANKS;
      const idx = order.findIndex((r) => r.id === card.rank);
      if (idx < 0 || idx >= order.length - 1) return toast("已到最高点");
      const next = order[idx + 1];
      card.rank = next.id;
      card.name = next.name;
      card.pip = next.pip;
      card.score = next.score;
      card.label = card.mark + card.name;
      toast(`${ren.名称}：→ ${card.label}`);
    } else if (t === "PRESSURE_REDUCE") {
      b.pressure = Math.max(0, b.pressure - (Number(ren.参数A) || 0));
      toast("压迫下降");
    } else if (t === "HEAL_HP") {
      b.playerHp += Number(ren.参数A) || 0;
      toast("气血回复");
    } else if (t === "MODIFY_DISCARDS") {
      b.discardsLeft += Number(ren.参数A) || 1;
      toast("弃牌次数+1");
    } else if (t === "ADD_SCORE_FLAT") {
      b.effects = (b.effects || []).concat([{ 名称: ren.名称, 效果类型: "ADD_SCORE_FLAT", 参数A: ren.参数A }]);
      toast(ren.名称 + " 已生效");
    } else if (t === "CONVERT_SUIT") {
      if (Bridge.selected.size !== 1) return toast("先选中恰好 1 张手牌");
      const uid = [...Bridge.selected][0];
      const card = b.hand.find((c) => c.uid === uid);
      const order = FateBattle.SUITS;
      const idx = order.findIndex((s) => s.id === card.suit);
      const next = order[(idx + 1) % order.length];
      card.suit = next.id;
      card.elem = next.elem;
      card.mark = next.mark;
      card.color = next.color;
      card.label = card.mark + card.name;
      toast("偷天换日：→ " + card.label);
    } else if (t === "ALL_IN") {
      b.effects = (b.effects || []).concat([{ 名称: ren.名称, 效果类型: "MUL_MULT", 参数A: Number(ren.参数A) || 2 }]);
      b.discardsLeft = 0;
      toast("破釜沉舟：本回合倍率×2，不能弃牌");
    } else if (t === "RECOVER_DISCARD") {
      if (!b.discardPile || !b.discardPile.length) return toast("弃牌堆是空的");
      const back = b.discardPile.pop();
      b.hand.push(back);
      toast("借尸还魂：收回 " + (back.label || back.name));
    } else if (t === "MODIFY_PLAYS") {
      b.playsLeft += Number(ren.参数A) || 1;
      toast("瞒天过海：出牌+1");
    } else if (t === "SACRIFICE_ADD") {
      if (Bridge.selected.size !== 1) return toast("先选中恰好 1 张弃掉");
      const uid = [...Bridge.selected][0];
      const gone = b.hand.find((c) => c.uid === uid);
      b.hand = b.hand.filter((c) => c.uid !== uid);
      if (gone) b.discardPile.push(gone);
      b.effects = (b.effects || []).concat([{ 名称: ren.名称, 效果类型: "ADD_SCORE_FLAT", 参数A: ren.参数A }]);
      Bridge.selected.clear();
      toast("围魏救赵：弃牌，本回合伤害分+" + (ren.参数A || 80));
    } else {
      b.discardsLeft += 1;
      toast("额外弃牌");
    }
    Bridge.renUses[id] = (Bridge.renUses[id] || 0) + 1;
    renderDeepBattle();
  }

  function setBattleBusy(on) {
    Bridge._resolving = !!on;
    ["playBtn", "skillBtn", "hintBtn", "deepDiscardBtn"].forEach((id) => {
      const el = $(id);
      if (el) el.disabled = !!on;
    });
  }

  function playDeepScoreFx(cards, result, done) {
    const duel = {
      enemyTaken: (result.duel && result.duel.dealt) || 0,
      playerTaken: (result.duel && result.duel.taken) || 0,
    };
    const relics = []
      .concat((Bridge.battle && Bridge.battle.effects) || [])
      .concat((Bridge.battle && Bridge.battle.envEffects) || [])
      .map((e) => e.名称)
      .filter(Boolean)
      .slice(0, 2);
    if (typeof global.playScoreSequence === "function") {
      playScoreSequence(cards, { relics, pattern: result.pattern }, duel, done);
      return;
    }
    if (typeof global.playSfx === "function") playSfx("hit");
    done();
  }

  function onDeepPlay() {
    const b = Bridge.battle;
    if (!b || Bridge._resolving) return;
    const uids = [...Bridge.selected];
    const cards = uids.map((uid) => b.hand.find((c) => c.uid === uid)).filter(Boolean).map(toChushiCard);
    const oldEnemy = b.enemyHp;
    const oldPlayer = b.playerHp;
    const r = b.playSelected(uids);
    Bridge.selected.clear();
    if (!r.ok) return toast(r.msg);
    b.enemyHp = oldEnemy;
    b.playerHp = oldPlayer;
    setBattleBusy(true);
    if ($("scoreLane")) $("scoreLane").innerHTML = "";
    renderDeepBattle();
    playDeepScoreFx(cards, r, () => {
      if (!Bridge.battle) return;
      Bridge.battle.enemyHp = r.enemyHp;
      Bridge.battle.playerHp = r.playerHp;
      setBattleBusy(false);
      const hint = $("hintBtn");
      if (hint) {
        hint.textContent = "选项";
        hint.disabled = false;
        hint.onclick = openBattleOptions;
      }
      finishDeepPlay(r);
    });
  }

  function finishDeepPlay(r) {
    const b = Bridge.battle;
    if (!b) return;
    toast(`${r.pattern}！${r.duel.win ? "压过" : "未压过"} · 打出 ${r.duel.dealt}`);
    if (Bridge.run) Bridge.run.hp = b.playerHp;
    renderDeepBattle();
    if (b.enemyHp <= 0) {
      toast("胜利！");
      return settleDeepBattle(true);
    }
    if (b.playerHp <= 0) {
      toast("气血耗尽");
      return settleDeepBattle(false);
    }
    if (b.playsLeft <= 0) {
      const mob = b._mob || {};
      const t = Math.min((b.turn || 0) + 1, 3);
      b.endTurn({
        pressure: Number(mob[`回合${t}压迫`] || b.pressure + 12),
        trueDamage: Number(mob[`回合${t}真实伤害`] || mob[`回合${t}真实`] || b.trueDamage + 2),
      });
      renderDeepBattle();
      if (b.playerHp <= 0) {
        toast("气血耗尽");
        return settleDeepBattle(false);
      }
    }
  }
  function onDeepDiscard() {
    const b = Bridge.battle;
    if (!b) return;
    const r = b.discardSelected([...Bridge.selected]);
    Bridge.selected.clear();
    toast(
      r.ok
        ? b.discardsLeft > 0
          ? `弃了 ${r.discarded} 张，本回合还可弃 ${b.discardsLeft} 次`
          : `弃了 ${r.discarded} 张，本回合弃牌次数已用完`
        : r.msg
    );
    renderDeepBattle();
  }

  function onTrainExit() {
    showModalHtmlSafe(
      Bridge.training ? "退出训练" : "退出战斗",
      `<p>${Bridge.training ? "退出将丢失当前训练进度，返回青崖峰。" : "世界探索只能从撤离离开。请先回到牌阵，走到撤离格。"}</p>
       <button class="choice-btn" id="confirmTrainExit" style="width:100%;margin-top:8px;">确认退出</button>`
    );
    const b = $("confirmTrainExit");
    if (b)
      b.onclick = () => {
        closeModalSafe();
        if (Bridge.profile) {
          Bridge.profile.savedTraining = null;
          saveProfile();
        }
        Bridge.battle = null;
        Bridge.training = false;
        hideTrainBar();
        enterFushiBase({ playIntro: false });
      };
  }
  function onTrainRestart() {
    showModalHtmlSafe(
      "重开训练",
      `<p>丢失当前进度，用同一套配置再开一局。</p>
       <button class="choice-btn" id="confirmTrainRestart" style="width:100%;margin-top:8px;">确认重开</button>`
    );
    const b = $("confirmTrainRestart");
    if (b)
      b.onclick = () => {
        closeModalSafe();
        startTrainingBattle(Bridge.loadout);
      };
  }
  function onTrainPause() {
    if (Bridge.training) {
      if (Bridge.profile) {
        Bridge.profile.savedTraining = snapshotBattle(Bridge.battle);
        saveProfile();
      }
      toast("训练进度已保存");
      Bridge.battle = null;
      hideTrainBar();
      enterFushiBase({ playIntro: false });
    } else {
      pauseWorld();
    }
  }

  function installTitleAuth() {
    const panel = document.querySelector("#titleScreen .bottom-panel .dialog-box");
    if (!panel || panel.dataset.authReady === "1") return;
    panel.dataset.authReady = "1";
    panel.innerHTML = `
      <div class="speaker">系统</div>
      <div class="dialog-text">一张牌，一段命。先登录或一键进入，资源会在后台加载。</div>
      <div id="authForm" class="auth-form">
        <input id="loginAccount" type="text" placeholder="账号" maxlength="16" autocomplete="username" />
        <input id="loginPassword" type="password" placeholder="密码" maxlength="24" autocomplete="current-password" />
        <div class="auth-actions">
          <button type="button" id="btnRegister" class="ghost-btn">注册</button>
          <button type="button" id="btnLogin" class="ghost-btn">登录</button>
        </div>
        <button type="button" id="btnQuickStart" class="primary-btn quick-start-btn">一键注册登录</button>
        <div id="authStatus" class="auth-status">未登录 · 道号默认可在剧情中修改</div>
      </div>
      <div id="loadProgressWrap" class="load-progress-wrap" style="display:none;">
        <div class="load-progress-label">正在唤起命运牌局… <span id="loadProgressPct">0%</span></div>
        <div class="load-progress-bar"><i id="loadProgressFill"></i></div>
      </div>
      <div class="dialog-actions">
        <button id="startBtn" class="primary-btn" disabled>进入</button>
      </div>
    `;
  }
  function setAuthStatus(text) {
    const el = $("authStatus");
    if (el) el.textContent = text;
  }
  function setEnterEnabled(on) {
    const btn = $("startBtn");
    if (btn) btn.disabled = !on;
  }

  Bridge.installTitleAuth = installTitleAuth;
  Bridge.setAuthStatus = setAuthStatus;
  Bridge.setEnterEnabled = setEnterEnabled;
  Bridge.loadConfig = loadConfig;
  Bridge.setProfile = setProfile;
  Bridge.syncDaoNameFromStory = syncDaoNameFromStory;
  Bridge.onTutorialComplete = onTutorialComplete;
  Bridge.enterFushiBase = enterFushiBase;
  Bridge.grantPostTutorial = grantPostTutorial;
  Bridge.isDeep = () => Bridge.mode === "deep";
  Bridge.renderDeepMap = renderDeepMap;
  Bridge.moveByDirection = moveByDirection;
  Bridge.tryExtract = tryExtract;
  Bridge.pauseWorld = pauseWorld;
  Bridge.showSkipOnNewbieMap = showSkipOnNewbieMap;
  Bridge.updateMapChrome = updateMapChrome;
  Bridge.onDeepDiscard = onDeepDiscard;
  Bridge.onDeepInspect = onDeepInspect;
  Bridge.onDeepDeck = onDeepDeck;
  Bridge.onDeepSort = onDeepSort;
  Bridge.onRenSkill = onRenSkill;

  global.FushiBridge = Bridge;
})(window);
