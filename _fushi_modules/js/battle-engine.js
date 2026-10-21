/**
 * 命运牌局 · 真战斗计分引擎（复赛）
 * - 52 张逻辑牌，无大小王
 * - 显示：五行属性 + 天干/星月日
 * - 真洗牌、真抽牌、牌型识别、伤害分、压迫分拼刀
 */
(function (global) {
  const SUITS = [
    { id: "SPADE", elem: "水", mark: "水", color: "#3A6B8C" },
    { id: "HEART", elem: "火", mark: "火", color: "#B33A3A" },
    { id: "CLUB", elem: "木", mark: "木", color: "#3F7D4E" },
    { id: "DIAMOND", elem: "金", mark: "金", color: "#C2A14D" },
  ];
  const RANKS = [
    { id: "A", name: "甲", pip: 14, score: 11 },
    { id: "2", name: "乙", pip: 2, score: 2 },
    { id: "3", name: "丙", pip: 3, score: 3 },
    { id: "4", name: "丁", pip: 4, score: 4 },
    { id: "5", name: "戊", pip: 5, score: 5 },
    { id: "6", name: "己", pip: 6, score: 6 },
    { id: "7", name: "庚", pip: 7, score: 7 },
    { id: "8", name: "辛", pip: 8, score: 8 },
    { id: "9", name: "壬", pip: 9, score: 9 },
    { id: "10", name: "癸", pip: 10, score: 10 },
    { id: "J", name: "星", pip: 11, score: 10 },
    { id: "Q", name: "月", pip: 12, score: 10 },
    { id: "K", name: "日", pip: 13, score: 10 },
  ];

  const PATTERN_MULT = {
    高牌: 1,
    一对: 1.5,
    两对: 2,
    三条: 3,
    顺子: 3.5,
    同花: 4,
    葫芦: 4.5,
    四条: 7,
    同花顺: 10,
    五条: 12,
  };

  function uid() {
    return "c_" + Math.random().toString(36).slice(2, 9);
  }

  function makeStandardDeck() {
    const deck = [];
    for (const s of SUITS) {
      for (const r of RANKS) {
        deck.push({
          uid: uid(),
          suit: s.id,
          elem: s.elem,
          color: s.color,
          mark: s.mark,
          rank: r.id,
          name: r.name,
          pip: r.pip,
          score: r.score,
          label: `${s.mark}${r.name}`,
        });
      }
    }
    return deck;
  }

  function shuffle(arr, rng = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function countBy(arr, keyFn) {
    const m = {};
    for (const x of arr) {
      const k = keyFn(x);
      m[k] = (m[k] || 0) + 1;
    }
    return m;
  }

  function isStraightPips(pips) {
    const u = [...new Set(pips)].sort((a, b) => a - b);
    if (u.length !== pips.length || u.length < 5) return false;
    // A-2-3-4-5 wheel using pip 14 as Ace high; treat A as 1 for wheel
    const normal = u.every((v, i) => i === 0 || v === u[i - 1] + 1);
    if (normal) return true;
    const asWheel = u.map((v) => (v === 14 ? 1 : v)).sort((a, b) => a - b);
    return asWheel.every((v, i) => i === 0 || v === asWheel[i - 1] + 1) && asWheel[0] === 1;
  }

  function detectPattern(cards) {
    if (!cards.length) return { name: "无", mult: 0 };
    const ranks = countBy(cards, (c) => c.rank);
    const suits = countBy(cards, (c) => c.suit);
    const counts = Object.values(ranks).sort((a, b) => b - a);
    const flush = cards.length >= 5 && Object.keys(suits).length === 1;
    const straight = cards.length >= 5 && isStraightPips(cards.map((c) => c.pip));
    if (cards.length >= 5 && counts[0] >= 5) return { name: "五条", mult: PATTERN_MULT["五条"] };
    if (flush && straight) return { name: "同花顺", mult: PATTERN_MULT["同花顺"] };
    if (counts[0] >= 4) return { name: "四条", mult: PATTERN_MULT["四条"] };
    if (counts[0] >= 3 && counts[1] >= 2) return { name: "葫芦", mult: PATTERN_MULT["葫芦"] };
    if (flush) return { name: "同花", mult: PATTERN_MULT["同花"] };
    if (straight) return { name: "顺子", mult: PATTERN_MULT["顺子"] };
    if (counts[0] >= 3) return { name: "三条", mult: PATTERN_MULT["三条"] };
    if (counts[0] >= 2 && counts[1] >= 2) return { name: "两对", mult: PATTERN_MULT["两对"] };
    if (counts[0] >= 2) return { name: "一对", mult: PATTERN_MULT["一对"] };
    return { name: "高牌", mult: PATTERN_MULT["高牌"] };
  }

  function applyEffectList(effects, ctx) {
    let flat = 0;
    let addMult = 0;
    let mulMult = 1;
    let pressureDelta = 0;
    let trueDmgDelta = 0;
    const logs = [];
    for (const e of effects || []) {
      const t = e.效果类型 || e.type;
      const a = e.参数A != null ? e.参数A : e.a;
      const b = e.参数B != null ? e.参数B : e.b;
      const c = e.参数C != null ? e.参数C : e.c;
      if (!t || t === "NONE") continue;
      if (t === "ADD_SCORE_FLAT") {
        flat += Number(a) || 0;
        logs.push(`${e.名称 || e.name || "效果"} +${a}分`);
      } else if (t === "ADD_MULT") {
        addMult += Number(a) || 0;
        logs.push(`${e.名称 || "效果"} 倍率+${a}`);
      } else if (t === "MUL_MULT") {
        mulMult *= Number(a) || 1;
        logs.push(`${e.名称 || "效果"} 倍率×${a}`);
      } else if (t === "IF_PATTERN_ADD" && ctx.pattern === String(a)) {
        flat += Number(b) || 0;
        logs.push(`${e.名称 || "效果"}(${a}) +${b}`);
      } else if (t === "IF_PATTERN_MULT" && ctx.pattern === String(a)) {
        mulMult *= Number(b) || 1;
        logs.push(`${e.名称 || "效果"}(${a}) ×${b}`);
      } else if (t === "IF_SUIT_COUNT_ADD") {
        const need = Number(b) || 1;
        const count = ctx.cards.filter((x) => x.elem === String(a)).length;
        if (count >= need) {
          flat += Number(c) || 0;
          logs.push(`${e.名称 || "效果"} ${a}×${count} +${c}`);
        }
      } else if (t === "IF_RANK_ADD") {
        const n = ctx.cards.filter((x) => x.name === String(a)).length;
        if (n) {
          flat += (Number(b) || 0) * n;
          logs.push(`${e.名称 || "效果"} ${a}×${n}`);
        }
      } else if (t === "PRESSURE_REDUCE") {
        pressureDelta -= Number(a) || 0;
        logs.push(`${e.名称 || "效果"} 压迫${a > 0 ? "-" : "+"}${Math.abs(a)}`);
      } else if (t === "TRUE_DAMAGE_REDUCE") {
        trueDmgDelta -= Number(a) || 0;
        logs.push(`${e.名称 || "效果"} 受伤修正 ${a}`);
      }
    }
    return { flat, addMult, mulMult, pressureDelta, trueDmgDelta, logs };
  }

  function scoreHand(cards, extras = {}) {
    const pattern = detectPattern(cards);
    const basePoints = cards.reduce((s, c) => s + (c.score || 0), 0);
    const patternBase = Math.round(basePoints * (pattern.mult || 1));
    const eff = applyEffectList(extras.effects || [], { pattern: pattern.name, cards });
    let mult = 1 + eff.addMult;
    mult *= eff.mulMult;
    // 环境
    const env = applyEffectList(extras.envEffects || [], { pattern: pattern.name, cards });
    mult = (mult + env.addMult) * env.mulMult;
    const damage = Math.max(0, Math.floor((patternBase + eff.flat + env.flat) * mult));
    return {
      pattern: pattern.name,
      patternMult: pattern.mult,
      basePoints,
      patternBase,
      flat: eff.flat + env.flat,
      mult,
      damage,
      logs: [...eff.logs, ...env.logs],
      pressureDelta: eff.pressureDelta + env.pressureDelta,
      trueDmgDelta: eff.trueDmgDelta + env.trueDmgDelta,
    };
  }

  function resolveDuel(damageScore, pressure, trueDamage, floorRatio = 0.3) {
    const win = damageScore >= pressure;
    let dealt;
    let taken;
    if (win) {
      dealt = damageScore;
      taken = Math.max(Math.floor(trueDamage * (pressure / Math.max(damageScore, 1))), Math.floor(trueDamage * floorRatio));
    } else {
      dealt = Math.max(Math.floor(damageScore * (damageScore / Math.max(pressure, 1))), Math.floor(damageScore * floorRatio));
      taken = trueDamage;
    }
    return { win, dealt, taken, pressure, damageScore, trueDamage };
  }

  function createBattle(options = {}) {
    const handSize = options.handSize || 8;
    const drawPerTurn = options.drawPerTurn || 5;
    const plays = options.playsPerTurn || 1;
    const discards = options.discardsPerTurn || 2;
    let drawPile = shuffle(options.deck || makeStandardDeck());
    let discardPile = [];
    let hand = [];

    function refillHand() {
      while (hand.length < handSize && drawPile.length) {
        hand.push(drawPile.pop());
      }
      if (hand.length < handSize && discardPile.length) {
        drawPile = shuffle(discardPile);
        discardPile = [];
        while (hand.length < handSize && drawPile.length) hand.push(drawPile.pop());
      }
    }

    refillHand();

    return {
      handSize,
      drawPerTurn,
      playsLeft: plays,
      discardsLeft: discards,
      playsPerTurn: plays,
      discardsPerTurn: discards,
      drawPile,
      discardPile,
      hand,
      turn: 1,
      enemyHp: options.enemyHp || 180,
      playerHp: options.playerHp || 100,
      pressure: options.pressure || 60,
      trueDamage: options.trueDamage || 12,
      effects: options.effects || [],
      envEffects: options.envEffects || [],
      floorRatio: options.floorRatio || 0.3,
      log: [],
      drawToHand(n = drawPerTurn) {
        for (let i = 0; i < n; i++) {
          if (!this.drawPile.length) {
            if (!this.discardPile.length) break;
            this.drawPile = shuffle(this.discardPile);
            this.discardPile = [];
          }
          if (this.hand.length >= this.handSize) break;
          this.hand.push(this.drawPile.pop());
        }
      },
      discardSelected(uids) {
        if (this.discardsLeft <= 0) return { ok: false, msg: "本回合弃牌次数已用完" };
        const set = new Set(uids);
        const gone = this.hand.filter((c) => set.has(c.uid));
        if (!gone.length) return { ok: false, msg: "未选中牌" };
        this.hand = this.hand.filter((c) => !set.has(c.uid));
        this.discardPile.push(...gone);
        this.discardsLeft -= 1;
        this.drawToHand(gone.length);
        return { ok: true, discarded: gone.length };
      },
      preview(uids) {
        const selected = this.hand.filter((c) => uids.includes(c.uid));
        return scoreHand(selected, { effects: this.effects, envEffects: this.envEffects });
      },
      playSelected(uids) {
        if (this.playsLeft <= 0) return { ok: false, msg: "本回合出牌次数已用完" };
        if (!uids.length) return { ok: false, msg: "请选择要打出的牌" };
        if (uids.length > 5) return { ok: false, msg: "最多打出5张" };
        const selected = this.hand.filter((c) => uids.includes(c.uid));
        if (selected.length !== uids.length) return { ok: false, msg: "选牌无效" };
        const scored = scoreHand(selected, { effects: this.effects, envEffects: this.envEffects });
        const pressure = Math.max(0, this.pressure + (scored.pressureDelta || 0));
        let trueDamage = Math.max(0, this.trueDamage + (scored.trueDmgDelta || 0));
        const duel = resolveDuel(scored.damage, pressure, trueDamage, this.floorRatio);
        this.enemyHp = Math.max(0, this.enemyHp - duel.dealt);
        this.playerHp = Math.max(0, this.playerHp - duel.taken);
        this.hand = this.hand.filter((c) => !uids.includes(c.uid));
        this.discardPile.push(...selected);
        this.playsLeft -= 1;
        const entry = { ...scored, duel, selected: selected.map((c) => c.label) };
        this.log.push(entry);
        return { ok: true, ...entry, enemyHp: this.enemyHp, playerHp: this.playerHp };
      },
      endTurn(nextIntent) {
        this.turn += 1;
        this.playsLeft = this.playsPerTurn;
        this.discardsLeft = this.discardsPerTurn;
        if (nextIntent) {
          this.pressure = nextIntent.pressure;
          this.trueDamage = nextIntent.trueDamage;
        }
        this.drawToHand(this.drawPerTurn);
      },
    };
  }

  global.FateBattle = {
    SUITS,
    RANKS,
    PATTERN_MULT,
    makeStandardDeck,
    shuffle,
    detectPattern,
    scoreHand,
    resolveDuel,
    createBattle,
    applyEffectList,
  };
})(window);
