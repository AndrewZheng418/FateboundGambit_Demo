/**
 * 命运牌局复赛主流程
 * - 登录无道号；注册成功直接进新手剧情
 * - 初赛开局剧情 + 剧情内取道号
 * - 二维命运牌阵探索
 * - 可视化拼刀战斗
 */
(function () {
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const ASSETS = {
    backgrounds: {
      "bg-title": "assets/cover_ming_card.jpg",
      "bg-cottage": "assets/bg_qingya_cottage.jpg",
      "bg-attack": "assets/bg_qingya_attack.jpg",
      "bg-map1": "assets/bg_fate_map_backhill.jpg",
      "bg-map2": "assets/bg_fate_map_tunnel.jpg",
      "bg-battle": "assets/bg_battle_minion.jpg",
      "bg-boss": "assets/bg_battle_boss.jpg",
      "bg-shop": "assets/bg_shop_sujinshu.jpg",
      "bg-base": "assets/bg_qingya_cottage.jpg",
    },
    portraits: {
      "p-hero": "assets/portrait_hero.webp",
      "p-qingtang": "assets/portrait_qingtang.webp",
      "p-master": "assets/portrait_master.webp",
      "p-merchant": "assets/portrait_merchant.webp",
      "p-villain": "assets/portrait_villain.webp",
    },
  };

  const App = {
    config: null,
    profile: null,
    storyIndex: 0,
    daoName: "鸿明",
    run: null,
    battle: null,
    battleNode: null,
    selected: new Set(),
    bagEffects: [],
    renUses: {},
    tian: null,
    dili: null,
    justRegistered: false,
  };

  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2400);
  }
  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  function showScreen(id) {
    $$(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
  }
  function moneyLine(p) {
    return `命尘 ${p.currencies.mingChen} · 命晶 ${p.currencies.mingJing} · 仙晶 ${p.currencies.xianJing}`;
  }
  function refreshMoney() {
    if (!App.profile) return;
    $$("[data-money]").forEach((el) => (el.textContent = moneyLine(App.profile)));
    $$("[data-dao]").forEach((el) => (el.textContent = App.profile.daoName || "—"));
  }

  function hydrateAssets() {
    Object.entries(ASSETS.backgrounds).forEach(([cls, src]) => {
      document.querySelectorAll("." + cls).forEach((el) => {
        el.style.setProperty("--bg-image", `url("${src}")`);
        el.style.backgroundImage = `url("${src}")`;
      });
    });
    Object.entries(ASSETS.portraits).forEach(([cls, src]) => {
      document.querySelectorAll("." + cls).forEach((el) => {
        el.style.setProperty("--portrait-image", `url("${src}")`);
        el.style.backgroundImage = `url("${src}")`;
      });
    });
  }

  async function boot() {
    showScreen("bootScreen");
    const bar = $("loadBar");
    const txt = $("loadText");
    const set = (p, t) => {
      bar.style.width = p + "%";
      txt.textContent = t;
    };
    set(8, "加载资源…");
    if (location.protocol === "file:") {
      txt.innerHTML = "请运行 start_game.bat，不要直接双击 index.html。";
      return;
    }
    await Promise.all(
      Object.values(ASSETS.backgrounds)
        .concat(Object.values(ASSETS.portraits))
        .map(
          (src) =>
            new Promise((res) => {
              const i = new Image();
              i.onload = i.onerror = res;
              i.src = src;
            })
        )
    );
    set(60, "读取配置表…");
    try {
      const res = await fetch("data/config.json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      App.config = await res.json();
    } catch (e) {
      txt.textContent = "配置读取失败：" + (e.message || e);
      return;
    }
    set(100, "完成");
    hydrateAssets();
    await wait(180);
    bindAll();
    showScreen("loginScreen");
  }

  function ensureStarterUnlocks() {
    const p = App.profile;
    const baseFate = [
      "FATE_001","FATE_002","FATE_003","FATE_004","FATE_005","FATE_006","FATE_007","FATE_008",
      "FATE_009","FATE_010","FATE_011","FATE_012","FATE_013","FATE_015","FATE_016","FATE_017",
      "FATE_018","FATE_019","FATE_021","FATE_026","FATE_027","FATE_028","FATE_029","FATE_030",
    ];
    p.unlockedFate = Array.from(new Set([...(p.unlockedFate || []), ...baseFate]));
    p.unlockedHeritage = Array.from(new Set([...(p.unlockedHeritage || []), "HERITAGE_001", "HERITAGE_007", "HERITAGE_010"]));
    p.unlockedCompanions = Array.from(new Set([...(p.unlockedCompanions || []), "COMP_HERO"]));
    p.equippedHeritage = p.equippedHeritage && p.equippedHeritage.length ? p.equippedHeritage : ["HERITAGE_001"];
    p.activeRen = p.activeRen || "REN_001";
    p.worldProgress = p.worldProgress || {};
    p.worldProgress.WORLD_QINGMU = p.worldProgress.WORLD_QINGMU || { depthCleared: 0, unlockedDepth: 1 };
    if (!p.daoName) p.daoName = "";
    FateSave.writeProfile(p);
  }

  function bindAll() {
    $("btnRegister").onclick = () => {
      const account = $("loginAccount").value.trim();
      const password = $("loginPassword").value;
      const r = FateSave.register(account, password, ""); // 道号稍后剧情里取
      if (!r.ok) return toast(r.msg);
      // 注册成功：直接登录并进新手，不要再点一次登录
      const login = FateSave.login(account, password);
      if (!login.ok) return toast(login.msg);
      App.profile = login.profile;
      App.justRegistered = true;
      ensureStarterUnlocks();
      refreshMoney();
      startOpeningStory();
      toast("注册成功，开始新手剧情");
    };
    $("btnLogin").onclick = () => {
      const r = FateSave.login($("loginAccount").value.trim(), $("loginPassword").value);
      if (!r.ok) return toast(r.msg);
      App.profile = r.profile;
      App.justRegistered = false;
      ensureStarterUnlocks();
      refreshMoney();
      if (!App.profile.tutorialDone || !App.profile.daoName) startOpeningStory();
      else enterBase();
    };
    $("storyNextBtn").onclick = nextStory;
    $("confirmNameBtn").onclick = confirmName;
    $("btnLogout").onclick = () => {
      FateSave.logout();
      App.profile = null;
      showScreen("loginScreen");
    };
    $("btnGrantTest").onclick = () => {
      FateSave.addCurrency(App.profile, "mingJing", 300);
      FateSave.addCurrency(App.profile, "mingChen", 200);
      FateSave.addCurrency(App.profile, "xianJing", 60);
      FateSave.writeProfile(App.profile);
      refreshMoney();
      toast("测试资源已发放");
    };
    $$("[data-panel]").forEach((b) => (b.onclick = () => openPanel(b.dataset.panel)));
    $("mapExtractBtn").onclick = onExtract;
    $("mapAbortBtn").onclick = () => {
      if (confirm("放弃本局回基地？（无撤离奖励）")) {
        App.run = null;
        enterBase();
      }
    };
    $("playBtn").onclick = onPlayCards;
    $("discardBtn").onclick = onDiscard;
    $("skillBtn").onclick = onRenSkill;
    $("btnCloseShop").onclick = () => {
      const node = App._shopNode;
      if (node && App.run) FateExplore.markResolved(App.run, node);
      $("panel-runshop").classList.add("hidden");
      renderMap();
    };
    $("btnRevivePay").onclick = () => {
      if (!confirm("【演示】花 10 仙晶复活？")) return;
      if (!FateSave.spendCurrency(App.profile, "xianJing", 10)) return toast("仙晶不足");
      if (App.battle) App.battle.playerHp = 50;
      if (App.run) {
        App.run.hp = Math.max(App.run.hp, 50);
        App.run.alive = true;
      }
      FateSave.writeProfile(App.profile);
      refreshMoney();
      $("reviveModal").classList.add("hidden");
      renderBattle();
    };
    $("btnGiveUp").onclick = () => {
      $("reviveModal").classList.add("hidden");
      App.run = null;
      App.battle = null;
      enterBase();
    };
    $("btnExchange") && null;
  }

  /* ========== 开局剧情 ========== */
  function startOpeningStory() {
    App.storyIndex = 0;
    App.daoName = App.profile.daoName || "鸿明";
    showScreen("storyScreen");
    renderStory();
  }
  function replaceName(text) {
    const name = App.daoName || "鸿明";
    return String(text || "")
      .replaceAll("鸿明", name)
      .replaceAll("主角", name);
  }
  function setStoryBg(key) {
    const el = $("storyBg");
    el.className = "painted-bg";
    const cls = key === "attack" ? "bg-attack" : key === "shop" ? "bg-shop" : "bg-cottage";
    el.classList.add(cls);
    hydrateAssets();
  }
  function renderRoles(speaker) {
    const roles = FateOpening.roles;
    const box = $("speakerRole");
    let html = roles.hero;
    let side = "left";
    if (speaker.includes("师尊") || speaker.includes("真人")) {
      html = roles.master;
      side = "right";
    } else if (speaker.includes("青棠")) {
      html = roles.qingtang;
      side = "right";
    } else if (speaker.includes("黑袍") || speaker.includes("首领")) {
      html = roles.villain;
      side = "right";
    } else if (speaker.includes("苏锦")) {
      html = roles.merchant;
      side = "right";
    } else if (speaker.includes("旁白")) {
      html = "";
    }
    box.className = "dialog-role " + side + " active";
    box.innerHTML = html;
    hydrateAssets();
  }
  function renderStory() {
    const story = FateOpening.story;
    const item = story[App.storyIndex];
    if (!item) {
      finishOpeningToBaseOrTutorialMap();
      return;
    }
    setStoryBg(item.bg);
    $("storySpeaker").textContent = replaceName(item.speaker);
    $("storyText").textContent = replaceName(item.text);
    renderRoles(item.speaker);
    const ask = !!item.askName;
    $("nameForm").style.display = ask ? "grid" : "none";
    $("storyActions").style.display = ask ? "none" : "flex";
    $("storyNextBtn").textContent = item.goMap ? "进入后山" : "继续";
  }
  function confirmName() {
    const val = $("nameInput").value.trim() || "鸿明";
    App.daoName = val;
    App.profile.daoName = val;
    FateSave.writeProfile(App.profile);
    refreshMoney();
    App.storyIndex++;
    renderStory();
  }
  function nextStory() {
    const item = FateOpening.story[App.storyIndex];
    if (item && item.goMap) {
      // 新手第一次：直接进入深度1教学牌阵，不必先回基地组卡
      App.profile.tutorialStep = Math.max(App.profile.tutorialStep || 0, 1);
      if (!App.profile.daoName) {
        App.profile.daoName = App.daoName || "鸿明";
      }
      FateSave.writeProfile(App.profile);
      beginTutorialRun();
      return;
    }
    App.storyIndex++;
    renderStory();
  }
  function finishOpeningToBaseOrTutorialMap() {
    enterBase();
  }
  function beginTutorialRun() {
    // 自动组一副深度1卡开跑
    const depth = 1;
    const rule = FateExplore.getDepthRule(App.config, "WORLD_QINGMU", depth);
    const need = Number(rule?.玩家补卡数量 || 0);
    const fixed = new Set(FateExplore.getFixedPool(App.config, "WORLD_QINGMU", depth));
    let picks = (App.profile.loadoutFate || []).slice();
    if (picks.length < need) {
      picks = (App.profile.unlockedFate || []).filter((id) => !fixed.has(id)).slice(0, need);
      if (picks.length < need) picks = (App.profile.unlockedFate || []).slice(0, need);
      App.profile.loadoutFate = picks;
      FateSave.writeProfile(App.profile);
    }
    const r = FateExplore.createRun(App.config, App.profile, "WORLD_QINGMU", depth, picks);
    if (!r.ok) {
      toast(r.msg);
      enterBase();
      return;
    }
    App.run = r.run;
    App.bagEffects = heritageEffects();
    showScreen("mapScreen");
    renderMap();
    toast("后山命运牌阵已展开。点击发光相邻牌前进。");
  }

  /* ========== 基地 ========== */
  function enterBase() {
    showScreen("baseScreen");
    refreshMoney();
    const prog = App.profile.worldProgress.WORLD_QINGMU;
    $("baseWelcome").textContent = `${App.profile.daoName || "行者"}，青崖峰待命中。青木界已解锁深度 ${prog.unlockedDepth}。可从命运阁组卡，再次入世。`;
    hydrateAssets();
  }

  function openPanel(name) {
    if (name === "battleTrain") {
      startTrainingBattle();
      return;
    }
    const body = buildPanel(name);
    if (!body) return;
    let sheet = document.getElementById("dynSheet");
    if (!sheet) {
      sheet = document.createElement("div");
      sheet.id = "dynSheet";
      sheet.className = "panel-sheet";
      $("sheetRoot").appendChild(sheet);
    }
    sheet.classList.remove("hidden");
    sheet.innerHTML = `<div class="panel-sheet-inner">${body}<button class="ghost-btn" style="width:100%;margin-top:12px;" id="dynClose">关闭</button></div>`;
    $("dynClose").onclick = () => sheet.classList.add("hidden");
    wirePanel(name, sheet);
  }

  function buildPanel(name) {
    if (name === "world") {
      return `<h2>世界之门</h2>` + (App.config.sheets["13_世界"] || [])
        .map((w) => {
          const prog = App.profile.worldProgress[w.世界ID] || { unlockedDepth: 0 };
          return `<div class="row-item"><div><b>${w.名称}</b><div class="muted" style="color:#6a7a72">${w.简介}<br/>解锁深度 ${prog.unlockedDepth || 0}</div></div>
            <button class="primary-btn" data-go-fate="1">组卡</button></div>`;
        })
        .join("");
    }
    if (name === "fate") {
      const depthMax = App.profile.worldProgress.WORLD_QINGMU?.unlockedDepth || 1;
      const rules = (App.config.sheets["14_深度规则"] || []).filter(
        (r) => r.世界ID === "WORLD_QINGMU" && Number(r.深度) <= depthMax
      );
      return `<h2>命运阁</h2>
        <label>深度</label>
        <select id="depthSelect">${rules
          .map((r) => `<option value="${r.深度}">深度${r.深度}｜最少${r.最少命运卡}/最多${r.最多命运卡}｜固定${r.固定卡数量}+自选${r.玩家补卡数量}</option>`)
          .join("")}</select>
        <h3>固定必带</h3><div id="fateFixedList"></div>
        <h3>库存补孔</h3><div id="fateNeed" class="hint-banner"></div><div id="fatePickList"></div>
        <button id="btnStartRun" class="primary-btn" style="width:100%;margin-top:10px;">洗牌展开牌阵</button>`;
    }
    if (name === "heritage") return `<h2>传承台</h2><div id="heritageList"></div>`;
    if (name === "companions") return `<h2>同伴</h2><div id="companionList"></div>`;
    if (name === "warehouse") return `<h2>仓库</h2><div id="warehouseList"></div>`;
    if (name === "shop") return `<h2>命晶商店</h2><div id="mingjingShopList"></div>`;
    if (name === "pay") {
      return `<h2>充值仙晶</h2><div class="hint-banner">演示用·不真扣款</div><div id="payList"></div>
        <h3>仙晶→命晶</h3><input id="exchangeAmount" type="number" value="60" />
        <button id="btnExchange" class="primary-btn" style="width:100%;margin-top:8px;">兑换</button>`;
    }
    if (name === "codex") return `<h2>图鉴 / 剧情</h2><div id="codexList"></div>`;
    return "";
  }

  function wirePanel(name, sheet) {
    if (name === "world") {
      $$("[data-go-fate]", sheet).forEach((b) => (b.onclick = () => { sheet.classList.add("hidden"); openPanel("fate"); }));
    }
    if (name === "fate") {
      paintFate();
      $("depthSelect").onchange = paintFate;
      $("btnStartRun").onclick = startRunFromBuilder;
    }
    if (name === "heritage") renderHeritage();
    if (name === "companions") renderCompanions();
    if (name === "warehouse") renderWarehouse();
    if (name === "shop") renderMingShop();
    if (name === "pay") {
      renderPay();
      $("btnExchange").onclick = () => {
        const n = Number($("exchangeAmount").value || 0);
        const r = FateSave.exchangeXianToMingJing(App.profile, n);
        toast(r.ok ? `命晶+${n}` : r.msg);
        refreshMoney();
      };
    }
    if (name === "codex") renderCodex();
  }

  function paintFate() {
    const depth = Number($("depthSelect").value || 1);
    const rule = FateExplore.getDepthRule(App.config, "WORLD_QINGMU", depth);
    const fixed = FateExplore.getFixedPool(App.config, "WORLD_QINGMU", depth);
    $("fateFixedList").innerHTML = fixed
      .map((id) => {
        const c = App.config.fateCards[id] || {};
        return `<span class="chip-tag">${c.名称 || id}</span>`;
      })
      .join("");
    const need = Number(rule?.玩家补卡数量 || 0);
    const fixedSet = new Set(fixed);
    const inv = (App.profile.unlockedFate || []).filter((id) => App.config.fateCards[id]);
    if (!(App.profile.loadoutFate || []).length) {
      App.profile.loadoutFate = inv.filter((id) => !fixedSet.has(id)).slice(0, need);
      if (App.profile.loadoutFate.length < need) App.profile.loadoutFate = inv.slice(0, need);
      FateSave.writeProfile(App.profile);
    }
    $("fatePickList").innerHTML = inv
      .map((id) => {
        const c = App.config.fateCards[id] || {};
        const on = (App.profile.loadoutFate || []).includes(id);
        return `<label class="check-line"><input type="checkbox" data-fate="${id}" ${on ? "checked" : ""}/> ${c.名称}（${c.类型}）</label>`;
      })
      .join("");
    const sync = () => {
      App.profile.loadoutFate = $$("#fatePickList [data-fate]:checked").map((x) => x.dataset.fate);
      FateSave.writeProfile(App.profile);
      $("fateNeed").textContent = `需自选 ${need} 张（已选 ${App.profile.loadoutFate.length}）。入世后洗牌成可迂回的命运牌阵。`;
    };
    $$("#fatePickList [data-fate]").forEach((x) => (x.onchange = sync));
    sync();
  }

  function startRunFromBuilder() {
    const depth = Number($("depthSelect").value || 1);
    const r = FateExplore.createRun(App.config, App.profile, "WORLD_QINGMU", depth, App.profile.loadoutFate || []);
    if (!r.ok) return toast(r.msg);
    App.run = r.run;
    App.bagEffects = heritageEffects();
    const sheet = $("dynSheet");
    if (sheet) sheet.classList.add("hidden");
    showScreen("mapScreen");
    renderMap();
    toast(`牌阵展开：${App.run.nodes.length} 张命运，点击相邻发光牌前进`);
  }

  /* ========== 二维牌阵渲染 ========== */
  function renderMap() {
    const run = App.run;
    if (!run) return;
    $("mapHp").textContent = run.hp;
    $("mapYuan").textContent = run.yuan;
    $("mapLuck").textContent = run.luck;
    $("mapDone").textContent = `${run.completed}/${run.nodes.length}`;
    $("mapTitle").textContent = `青木界 · 深度${run.depth} 命运牌阵`;
    $("mapExtractBtn").disabled = !FateExplore.canExtract(run);
    $("mapBg").className = "painted-bg " + (run.depth >= 2 ? "bg-map2" : "bg-map1");
    hydrateAssets();

    const avail = new Set(FateExplore.getAvailable(run));
    const board = $("fateMap");
    board.innerHTML = "";

    // edges
    run.edges.forEach(([a, b], ei) => {
      if (run.blockedEdges[ei]) return;
      const na = run.nodes[a];
      const nb = run.nodes[b];
      const line = document.createElement("div");
      line.className = "path-line";
      const x1 = na.x;
      const y1 = na.y;
      const x2 = nb.x;
      const y2 = nb.y;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      line.style.left = x1 + "%";
      line.style.top = y1 + "%";
      line.style.width = len + "%";
      line.style.transformOrigin = "0 50%";
      line.style.transform = `rotate(${ang}deg)`;
      board.appendChild(line);
    });

    run.nodes.forEach((n) => {
      const el = document.createElement("div");
      const cls = ["fate-node"];
      if (n.revealed || n.resolved) cls.push("flipped");
      if (n.index === run.pos) cls.push("current");
      if (avail.has(n.index)) cls.push("available");
      if (n.isBoss) cls.push("danger");
      el.className = cls.join(" ");
      el.style.left = n.x + "%";
      el.style.top = n.y + "%";
      el.style.setProperty("--front-mark", `'${n.mark || "命"}'`);
      el.innerHTML = `<div class="fate-node-inner">
          <div class="fate-face fate-back"></div>
          <div class="fate-face fate-front">
            <div class="fate-icon">${n.revealed || n.resolved ? n.icon || n.mark : "命"}</div>
            <div class="fate-label">${n.name || ""}</div>
          </div>
        </div>`;
      if (avail.has(n.index)) {
        el.onclick = () => {
          const r = FateExplore.moveTo(run, n.index);
          if (!r.ok) return toast(r.msg);
          if (!run.alive) {
            toast("气血归零");
            App.run = null;
            return enterBase();
          }
          renderMap();
          presentCurrentNode();
        };
      }
      board.appendChild(el);
    });

    const cur = run.nodes[run.pos];
    const token = document.createElement("div");
    token.className = "sword-token";
    token.style.left = cur.x + "%";
    token.style.top = cur.y + "%";
    board.appendChild(token);

    presentCurrentNode();
  }

  function presentCurrentNode() {
    const run = App.run;
    const cur = run.nodes[run.pos];
    if (!cur) return;
    cur.revealed = true;
    $("mapPanelTitle").textContent = `${cur.name} · ${cur.type}`;
    $("mapPanelText").textContent = cur.conf.正文 || (cur.kind === "start" ? "已抵达起点。选择相邻发光命运牌前进。" : "");
    const box = $("mapChoices");
    box.style.display = "none";
    box.innerHTML = "";

    if (cur.resolved || cur.kind === "start") {
      $("mapPanelText").textContent += FateExplore.canExtract(run)
        ? "\n已可撤离（击败首领且完成足够命运）。"
        : "\n点击相邻发光牌继续前进。";
      return;
    }

    if (cur.type === "战斗") {
      box.style.display = "grid";
      const b = document.createElement("button");
      b.className = "choice-btn";
      b.textContent = "进入战斗";
      b.onclick = () => beginBattle(cur, cur.conf.怪物ID);
      box.appendChild(b);
      return;
    }
    if (cur.type === "商店") {
      box.style.display = "grid";
      const b1 = document.createElement("button");
      b1.className = "choice-btn";
      b1.textContent = "进入商店";
      b1.onclick = () => openShop(cur);
      const b2 = document.createElement("button");
      b2.className = "choice-btn";
      b2.textContent = "路过";
      b2.onclick = () => {
        FateExplore.markResolved(run, cur);
        renderMap();
      };
      box.appendChild(b1);
      box.appendChild(b2);
      return;
    }
    if (cur.type === "撤离") {
      box.style.display = "grid";
      const b1 = document.createElement("button");
      b1.className = "choice-btn";
      b1.textContent = "尝试撤离";
      b1.onclick = onExtract;
      const b2 = document.createElement("button");
      b2.className = "choice-btn";
      b2.textContent = "暂不撤离";
      b2.onclick = () => {
        FateExplore.markResolved(run, cur);
        renderMap();
      };
      box.appendChild(b1);
      box.appendChild(b2);
      return;
    }

    // 事件/剧情/问心/灵藏
    box.style.display = "grid";
    const conf = cur.conf;
    if (conf.选项1文本) {
      const b = document.createElement("button");
      b.className = "choice-btn";
      b.textContent = conf.选项1文本;
      b.onclick = () => handleChoice(1);
      box.appendChild(b);
    }
    if (conf.选项2文本) {
      const b = document.createElement("button");
      b.className = "choice-btn";
      b.textContent = conf.选项2文本;
      b.onclick = () => handleChoice(2);
      box.appendChild(b);
    }
  }

  function handleChoice(opt) {
    const r = FateExplore.resolveChoice(App.run, opt);
    if (!r.ok) return toast(r.msg);
    if (r.action === "battle") return beginBattle(r.node, r.monsterId);
    if (r.action === "shop") return openShop(r.node, r.shopId);
    if (r.action === "story") {
      const st = App.config.stories?.[r.storyId];
      if (st) alert(st.标题 + "\n\n" + st.正文);
      FateExplore.markResolved(App.run, r.node);
      renderMap();
      return;
    }
    if (r.action === "extractOffer") return onExtract();
    if (r.logs?.length) toast(r.logs.join("，"));
    renderMap();
  }

  function openShop(node, shopId) {
    App._shopNode = node;
    shopId = shopId || node.conf.商店池ID || "SHOP_TEA";
    const goods = FateExplore.getShopGoods(App.config, shopId, 4);
    $("shopGoods").innerHTML = goods
      .map(
        (g, i) =>
          `<div class="row-item"><div><b>${g.名称}</b><div style="color:#6a7a72;font-size:12px">${g.描述}</div></div>
           <button class="primary-btn" data-buy="${i}">${g.price}气运</button></div>`
      )
      .join("");
    App._shopGoods = goods;
    $$("#shopGoods [data-buy]").forEach((b) => {
      b.onclick = () => {
        const g = App._shopGoods[Number(b.dataset.buy)];
        if (App.run.luck < g.price) return toast("气运不足");
        App.run.luck -= g.price;
        App.bagEffects.push(normalizeEffectRow(g, "宝物·"));
        toast(`购入 ${g.名称}`);
        renderMap();
      };
    });
    $("panel-runshop").classList.remove("hidden");
  }

  function onExtract() {
    const run = App.run;
    if (!FateExplore.canExtract(run)) {
      return toast(`还不能撤离：需击败首领且完成≥${run.rule.最少命运卡}（当前${run.completed}，首领${run.bossDefeated ? "已倒" : "未倒"}）`);
    }
    const reward = FateExplore.lookupExtractReward(App.config, run);
    let msg = `撤离成功！完成命运 ${run.completed} 张。`;
    if (reward) {
      if (reward.奖励1类型 === "命尘") {
        FateSave.addCurrency(App.profile, "mingChen", Number(reward.奖励1数量) || 0);
        msg += `\n命尘+${reward.奖励1数量}`;
      }
      if (reward.奖励2类型 === "命晶") {
        FateSave.addCurrency(App.profile, "mingJing", Number(reward.奖励2数量) || 0);
        msg += `\n命晶+${reward.奖励2数量}`;
      }
    }
    const prog = App.profile.worldProgress.WORLD_QINGMU;
    prog.depthCleared = Math.max(prog.depthCleared || 0, run.depth);
    if (run.depth >= (prog.unlockedDepth || 1) && run.depth < 5) {
      prog.unlockedDepth = run.depth + 1;
      msg += `\n解锁深度 ${prog.unlockedDepth}`;
    }
    if (!App.profile.unlockedCompanions.includes("COMP_QINGTANG")) {
      App.profile.unlockedCompanions.push("COMP_QINGTANG");
    }
    App.profile.tutorialDone = true;
    FateSave.writeProfile(App.profile);
    refreshMoney();
    App.run = null;
    alert(msg);
    enterBase();
  }

  /* ========== 战斗可视化 ========== */
  function normalizeEffectRow(row, prefix = "") {
    if (!row) return null;
    const t = row.效果类型;
    const base = { ...row, 名称: prefix + (row.名称 || "") };
    if (
      ["REPLACE_CARD_IN_DECK", "COPY_LEFT_CARD", "CONVERT_PLAYED_RANK", "MODIFY_DISCARDS", "MODIFY_PLAYS", "MODIFY_HAND_SIZE", "ON_DISCARD_DRAW", "ON_TURN_START_DRAW"].includes(t)
    ) {
      return { ...base, 效果类型: "ADD_SCORE_FLAT", 参数A: Number(row.参数A) > 0 ? Number(row.参数A) : 25 };
    }
    return base;
  }
  function heritageEffects() {
    return (App.profile.equippedHeritage || [])
      .map((id) => App.config.heritages[id])
      .filter(Boolean)
      .map((h) => normalizeEffectRow(h, "传承·"));
  }
  function passiveRenEffects() {
    if (!(App.profile.unlockedCompanions || []).includes("COMP_QINGTANG")) return [];
    const ren = (App.config.renSkills && App.config.renSkills.REN_002) || (App.config.sheets["12_人和"] || []).find((x) => x.人和ID === "REN_002");
    return ren ? [normalizeEffectRow(ren, "人和·")] : [];
  }
  function pickEnv() {
    const step = App.profile.tutorialStep || 0;
    const tians = App.config.sheets["10_天时"] || [];
    const dis = App.config.sheets["11_地利"] || [];
    let dili = null;
    let tian = null;
    // 新手前期不塞；深度>=2或教程推进后再给
    if ((App.run && App.run.depth >= 2) || step >= 4) {
      dili = dis[Math.floor(Math.random() * dis.length)] || null;
      tian = tians[Math.floor(Math.random() * tians.length)] || null;
    } else if (step >= 2) {
      dili = dis[0] || null;
    }
    return { tian, dili };
  }

  function beginBattle(node, monsterId) {
    const mob = App.config.monsters[monsterId] || {
      名称: "黑雾怪",
      气血: 180,
      回合1压迫: 60,
      回合1真实伤害: 12,
      回合2压迫: 80,
      回合2真实: 16,
    };
    App.battleNode = node;
    App.renUses = {};
    const env = pickEnv();
    App.tian = env.tian;
    App.dili = env.dili;
    const effects = [...heritageEffects(), ...App.bagEffects, ...passiveRenEffects()].filter(Boolean);
    const envEffects = [];
    if (App.dili && App.dili.效果类型 && App.dili.效果类型 !== "NONE") {
      envEffects.push({ ...App.dili, 名称: "地利·" + App.dili.名称 });
    }
    if (App.tian && App.tian.效果类型) {
      envEffects.push({ ...App.tian, 名称: "天时·" + App.tian.名称 });
    }
    App.battle = FateBattle.createBattle({
      enemyHp: Number(mob.气血) || 180,
      playerHp: App.run ? App.run.hp : 100,
      pressure: Number(mob.回合1压迫) || 60,
      trueDamage: Number(mob.回合1真实伤害 || mob.回合1真实) || 12,
      effects,
      envEffects,
    });
    App.battle._mob = mob;
    App.selected.clear();
    $("battleBg").className = "painted-bg " + (node && node.isBoss ? "bg-boss" : "bg-battle");
    showScreen("battleScreen");
    hydrateAssets();
    renderBattle();
  }

  function startTrainingBattle() {
    App.battleNode = null;
    App.bagEffects = heritageEffects();
    App.tian = null;
    App.dili = null;
    App.battle = FateBattle.createBattle({
      enemyHp: 160,
      playerHp: 100,
      pressure: 55,
      trueDamage: 10,
      effects: heritageEffects(),
      envEffects: [],
    });
    App.battle._mob = { 名称: "训练木人", 回合2压迫: 70, 回合2真实: 12 };
    App.selected.clear();
    $("battleBg").className = "painted-bg bg-battle";
    showScreen("battleScreen");
    hydrateAssets();
    renderBattle();
    toast("训练场：无天时地利，先练牌型与拼刀");
  }

  function renderBattle() {
    const b = App.battle;
    if (!b) return;
    const mob = b._mob || {};
    $("battleHp").textContent = b.playerHp;
    $("battleLuck").textContent = App.run ? App.run.luck : 0;
    $("enemyName").textContent = mob.名称 || "敌人";
    $("enemyHpText").textContent = b.enemyHp;
    $("intentScore").textContent = "压迫 " + b.pressure;
    $("intentDamage").textContent = "真实伤害 " + b.trueDamage;
    const preview = b.preview([...App.selected]);
    $("intentTaken").textContent = App.selected.size ? `预估我方伤害 ${preview.damage}` : "受到我方伤害 —";
    $("enemyIntent").classList.toggle("intent-win", App.selected.size > 0 && preview.damage >= b.pressure);
    $("battleEnv").textContent = [
      App.dili ? `地利：${App.dili.名称}` : "地利：无",
      App.tian ? `天时：${App.tian.名称}` : "天时：未解锁/未出现",
      `出牌${b.playsLeft} 弃牌${b.discardsLeft}`,
    ].join(" ｜ ");
    $("comboPreview").textContent = App.selected.size
      ? `牌型 ${preview.pattern} · 伤害分 ${preview.damage}（基础${preview.patternBase}+${preview.flat}）×${preview.mult.toFixed(2)}`
      : "选牌组成牌型，压过压迫分可减少承伤";
    $("relicRailBody").innerHTML = (b.effects || [])
      .slice(0, 8)
      .map((e) => `<div class="relic-rail-item"><b>${e.名称 || "效果"}</b></div>`)
      .join("");

    const hand = $("handZone");
    hand.innerHTML = "";
    b.hand.forEach((c) => {
      const el = document.createElement("button");
      const suitKey = ({ SPADE: "s", HEART: "h", CLUB: "c", DIAMOND: "d" }[c.suit] || "s");
      el.className = "play-card suit-" + suitKey + (App.selected.has(c.uid) ? " selected" : "");
      el.type = "button";
      el.innerHTML = `<div class="card-rank">${c.mark}<span class="card-elem">${c.elem}</span></div>
        <div class="dao-mark">${c.name}</div>
        <div class="card-chip">${c.label}</div>`;
      el.onclick = () => {
        if (App.selected.has(c.uid)) App.selected.delete(c.uid);
        else {
          if (App.selected.size >= 5) return toast("最多5张");
          App.selected.add(c.uid);
        }
        renderBattle();
      };
      hand.appendChild(el);
    });

    // score lane show selected
    $("scoreLane").innerHTML = [...App.selected]
      .map((uid) => {
        const c = b.hand.find((x) => x.uid === uid);
        return c ? `<div class="score-card">${c.mark}${c.name}</div>` : "";
      })
      .join("");
  }

  function onPlayCards() {
    const b = App.battle;
    const r = b.playSelected([...App.selected]);
    App.selected.clear();
    if (!r.ok) return toast(r.msg);
    toast(`${r.pattern}！${r.duel.win ? "压过" : "未压过"} 打出${r.duel.dealt}`);
    if (App.run) App.run.hp = b.playerHp;
    renderBattle();
    if (b.enemyHp <= 0) {
      toast("胜利！");
      if (App.battleNode && App.run) {
        FateExplore.afterBattleVictory(App.run, App.battleNode);
        App.profile.tutorialStep = Math.max(App.profile.tutorialStep || 0, 3);
        FateSave.writeProfile(App.profile);
        showScreen("mapScreen");
        renderMap();
      } else {
        showScreen("baseScreen");
        enterBase();
      }
      return;
    }
    if (b.playerHp <= 0) {
      $("reviveModal").classList.remove("hidden");
      return;
    }
    if (b.playsLeft <= 0) {
      const mob = b._mob || {};
      const t = Math.min(b.turn + 1, 3);
      const pressure = Number(mob[`回合${t}压迫`] || b.pressure + 12);
      const td = Number(mob[`回合${t}真实伤害`] || mob[`回合${t}真实`] || b.trueDamage + 2);
      if (App.run && (App.run.depth >= 2 || (App.profile.tutorialStep || 0) >= 4)) {
        const tians = App.config.sheets["10_天时"] || [];
        App.tian = tians[Math.floor(Math.random() * tians.length)];
        b.envEffects = [];
        if (App.dili) b.envEffects.push({ ...App.dili, 名称: "地利·" + App.dili.名称 });
        if (App.tian) b.envEffects.push({ ...App.tian, 名称: "天时·" + App.tian.名称 });
      }
      b.endTurn({ pressure, trueDamage: td });
      renderBattle();
    }
  }
  function onDiscard() {
    const r = App.battle.discardSelected([...App.selected]);
    App.selected.clear();
    toast(r.ok ? `弃牌${r.discarded}` : r.msg);
    renderBattle();
  }
  function onRenSkill() {
    const ren =
      (App.config.renSkills && App.config.renSkills[App.profile.activeRen || "REN_001"]) ||
      (App.config.sheets["12_人和"] || []).find((x) => x.人和ID === (App.profile.activeRen || "REN_001"));
    if (!ren) return;
    const id = ren.人和ID;
    const max = Number(ren.每场次数) || 0;
    if (max > 0 && (App.renUses[id] || 0) >= max) return toast("本场次数用完");
    if (ren.效果类型 === "CONVERT_PLAYED_RANK") {
      if (App.selected.size !== 1) return toast("先选中恰好1张手牌");
      const uid = [...App.selected][0];
      const card = App.battle.hand.find((c) => c.uid === uid);
      const order = FateBattle.RANKS;
      const idx = order.findIndex((r) => r.id === card.rank);
      if (idx < 0 || idx >= order.length - 1) return toast("已到最高点");
      const next = order[idx + 1];
      card.rank = next.id;
      card.name = next.name;
      card.pip = next.pip;
      card.score = next.score;
      card.label = card.mark + card.name;
      toast(`青崖剑诀：→ ${card.label}`);
    } else if (ren.效果类型 === "PRESSURE_REDUCE") {
      App.battle.pressure = Math.max(0, App.battle.pressure - (Number(ren.参数A) || 0));
      toast("压迫下降");
    } else {
      App.battle.discardsLeft += 1;
      toast("额外弃牌机会");
    }
    App.renUses[id] = (App.renUses[id] || 0) + 1;
    renderBattle();
  }

  /* ========== 基地子面板数据 ========== */
  function renderHeritage() {
    const unlocked = new Set(App.profile.unlockedHeritage || []);
    const equipped = new Set(App.profile.equippedHeritage || []);
    $("heritageList").innerHTML = Object.values(App.config.heritages || {})
      .slice(0, 40)
      .map((h) => {
        const on = unlocked.has(h.传承ID);
        const eq = equipped.has(h.传承ID);
        return `<div class="row-item"><div><b>${h.名称}</b><div style="color:#6a7a72;font-size:12px">${h.描述}</div></div>
          ${on ? `<button class="primary-btn" data-eq="${h.传承ID}">${eq ? "卸下" : "装备"}</button>` : "<span>未解锁</span>"}</div>`;
      })
      .join("");
    $$("#heritageList [data-eq]").forEach((b) => {
      b.onclick = () => {
        let eq = App.profile.equippedHeritage || [];
        const id = b.dataset.eq;
        if (eq.includes(id)) eq = eq.filter((x) => x !== id);
        else {
          if (eq.length >= 3) return toast("最多装备3个");
          eq.push(id);
        }
        App.profile.equippedHeritage = eq;
        FateSave.writeProfile(App.profile);
        renderHeritage();
      };
    });
  }
  function renderCompanions() {
    $("companionList").innerHTML = Object.values(App.config.companions || {})
      .map((c) => {
        const on = (App.profile.unlockedCompanions || []).includes(c.同伴ID);
        return `<div class="row-item"><div><b>${c.名称}</b><div style="color:#6a7a72;font-size:12px">${c.简介}<br/>人和：${c.人和ID列表 || "—"}</div></div><span>${on ? "已解锁" : "未解锁"}</span></div>`;
      })
      .join("");
  }
  function renderWarehouse() {
    const wh = App.profile.warehouse || {};
    const ids = Object.keys(wh);
    $("warehouseList").innerHTML = ids.length
      ? ids
          .map((id) => {
            const conf = App.config.warehouseItems?.[id] || { 名称: id };
            return `<div class="row-item"><div><b>${conf.名称}</b> ×${wh[id]}</div><button class="primary-btn" data-open="${id}">打开</button></div>`;
          })
          .join("")
      : "<p>仓库为空</p>";
    $$("#warehouseList [data-open]").forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.open;
        const conf = App.config.warehouseItems?.[id];
        App.profile.warehouse[id]--;
        if (App.profile.warehouse[id] <= 0) delete App.profile.warehouse[id];
        if (conf?.打开后效果类型 === "ADD_MINGCHEN") {
          FateSave.addCurrency(App.profile, "mingChen", Number(conf.参数A) || 0);
          toast("命尘+" + conf.参数A);
        }
        FateSave.writeProfile(App.profile);
        refreshMoney();
        renderWarehouse();
      };
    });
  }
  function renderMingShop() {
    $("mingjingShopList").innerHTML = (App.config.sheets["21_命晶商店"] || [])
      .map(
        (r) =>
          `<div class="row-item"><div><b>${r.名称}</b><div style="color:#6a7a72;font-size:12px">${r.描述}</div></div>
           <button class="primary-btn" data-mjs="${r.商品ID}">${r.售价命晶}命晶</button></div>`
      )
      .join("");
    $$("#mingjingShopList [data-mjs]").forEach((b) => {
      b.onclick = () => {
        const row = (App.config.sheets["21_命晶商店"] || []).find((x) => x.商品ID === b.dataset.mjs);
        if (!confirm(`花${row.售价命晶}命晶买「${row.名称}」？`)) return;
        if (!FateSave.spendCurrency(App.profile, "mingJing", Number(row.售价命晶))) return toast("命晶不足");
        FateSave.addWarehouse(App.profile, row.仓库物品ID, 1);
        FateSave.writeProfile(App.profile);
        refreshMoney();
        toast("已入仓库");
      };
    });
  }
  function renderPay() {
    $("payList").innerHTML = (App.config.sheets["20_货币与充值"] || [])
      .filter((r) => r.档位ID)
      .map((r) => {
        const first = !App.profile.firstPayDone?.[r.档位ID];
        const get = first && Number(r.首次翻倍) === 1 ? Number(r.到账仙晶) * 2 : Number(r.到账仙晶);
        return `<div class="row-item"><div><b>¥${r.人民币价格}</b> → 仙晶${get}${first ? "（首充双倍）" : ""}</div>
          <button class="primary-btn" data-pay="${r.档位ID}">购买</button></div>`;
      })
      .join("");
    $$("#payList [data-pay]").forEach((b) => {
      b.onclick = () => {
        const r = (App.config.sheets["20_货币与充值"] || []).find((x) => x.档位ID === b.dataset.pay);
        const first = !App.profile.firstPayDone?.[r.档位ID];
        const get = first && Number(r.首次翻倍) === 1 ? Number(r.到账仙晶) * 2 : Number(r.到账仙晶);
        if (!confirm(`【演示】¥${r.人民币价格} → 仙晶${get}？`)) return;
        FateSave.addCurrency(App.profile, "xianJing", get);
        App.profile.firstPayDone = App.profile.firstPayDone || {};
        App.profile.firstPayDone[r.档位ID] = true;
        FateSave.writeProfile(App.profile);
        refreshMoney();
        renderPay();
      };
    });
  }
  function renderCodex() {
    let html = (App.config.sheets["18_图鉴"] || [])
      .map((r) => `<div class="row-item"><div><b>${r.标题}</b><div style="color:#6a7a72;font-size:12px">${r.正文}</div></div></div>`)
      .join("");
    html += "<h3>世界剧情</h3>";
    html += (App.config.sheets["27_世界剧情"] || [])
      .map((s) => `<div class="row-item"><div><b>${s.标题}</b><div style="color:#6a7a72;font-size:12px">${s.正文}</div></div></div>`)
      .join("");
    $("codexList").innerHTML = html;
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
