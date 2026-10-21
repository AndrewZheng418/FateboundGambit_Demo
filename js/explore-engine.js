/**
 * 命运牌阵：组卡洗牌后生成「可迂回」的二维牌阵（节点+连线），非横向下一关。
 */
(function (global) {
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getDepthRule(config, worldId, depth) {
    return (config.sheets["14_深度规则"] || []).find(
      (r) => r.世界ID === worldId && Number(r.深度) === Number(depth)
    );
  }

  function getFixedPool(config, worldId, depth) {
    return (config.sheets["15_深度固定卡池"] || [])
      .filter((r) => r.世界ID === worldId && Number(r.深度) === Number(depth))
      .sort((a, b) => Number(a.顺序) - Number(b.顺序))
      .map((r) => r.命运卡ID);
  }

  function typeMeta(type, isBoss) {
    if (isBoss) return { icon: "战", mark: "战", kind: "battle" };
    const map = {
      起点: { icon: "符", mark: "起", kind: "start" },
      事件: { icon: "险", mark: "事", kind: "event" },
      灵藏: { icon: "藏", mark: "藏", kind: "treasure" },
      问心: { icon: "签", mark: "签", kind: "fortune" },
      商店: { icon: "市", mark: "商", kind: "shop" },
      战斗: { icon: "斗", mark: "战", kind: "battle" },
      剧情: { icon: "缘", mark: "事", kind: "event" },
      撤离: { icon: "终", mark: "终", kind: "exit" },
    };
    return map[type] || { icon: "命", mark: "命", kind: "event" };
  }

  function makeNode(fid, config, bossMob, i, x, y, layer) {
    const conf = config.fateCards[fid] || { 名称: fid, 类型: "事件" };
    const isBoss = String(conf.备注 || "").includes("BOSS") || conf.怪物ID === bossMob;
    const meta = typeMeta(conf.类型, isBoss);
    return {
      index: i,
      fateId: fid,
      name: conf.名称,
      type: conf.类型,
      conf,
      x,
      y,
      layer,
      revealed: i === 0,
      resolved: false,
      isBoss,
      icon: meta.icon,
      mark: meta.mark,
      kind: meta.kind,
      flipLayer: false,
    };
  }

  function placeSnake(list, layer) {
    const cols = 3;
    const n = list.length;
    const rows = Math.max(1, Math.ceil(n / cols));
    return list.map((item, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const y = 88 - (r * (70 / Math.max(rows - 1, 1)));
      const xs = r % 2 === 0 ? [22, 50, 78] : [78, 50, 22];
      return { item, x: xs[c], y: Math.max(14, y), layer, i };
    });
  }

  /**
   * 两层牌阵：下层逃亡、上层密道。Boss 固定在最顶层正中。
   */
  function layoutGraph(cardIds, config, bossMob) {
    const parsed = cardIds.map((fid) => {
      const conf = config.fateCards[fid] || { 名称: fid, 类型: "事件" };
      const isBoss = String(conf.备注 || "").includes("BOSS") || conf.怪物ID === bossMob;
      return { fid, conf, isBoss };
    });
    const bosses = parsed.filter((x) => x.isBoss);
    const rest = parsed.filter((x) => !x.isBoss);
    const split = Math.min(7, Math.max(5, Math.ceil(rest.length / 2)));
    const layer0src = rest.slice(0, split);
    const layer1src = rest.slice(split).concat(bosses);
    const placed0 = placeSnake(layer0src, 0);
    const placed1 = placeSnake(layer1src.length ? layer1src : bosses, 1);
    const nodes = [];
    placed0.forEach((p) => {
      nodes.push(makeNode(p.item.fid, config, bossMob, nodes.length, p.x, p.y, 0));
    });
    if (nodes.length) {
      const last0 = nodes[nodes.length - 1];
      last0.flipLayer = true;
      last0.mark = "渡";
      last0.name = last0.name || "密道入口";
    }
    placed1.forEach((p) => {
      nodes.push(makeNode(p.item.fid, config, bossMob, nodes.length, p.x, p.y, 1));
    });
    if (nodes[0]) {
      nodes[0].mark = "起";
      nodes[0].icon = "符";
      nodes[0].kind = "start";
      nodes[0].resolved = true;
      nodes[0].revealed = true;
      nodes[0].x = 50;
      nodes[0].y = 88;
    }
    const bossNode = nodes.find((x) => x.isBoss);
    if (bossNode) {
      bossNode.x = 50;
      bossNode.y = 10;
      bossNode.layer = 1;
    }
    const edges = [];
    const byLayer = [nodes.filter((n) => n.layer === 0), nodes.filter((n) => n.layer === 1)];
    byLayer.forEach((arr) => {
      for (let i = 0; i < arr.length - 1; i++) edges.push([arr[i].index, arr[i + 1].index]);
      for (let i = 1; i < arr.length - 2; i++) {
        if (i % 3 === 0 && i + 2 < arr.length) edges.push([arr[i].index, arr[i + 2].index]);
      }
    });
    if (byLayer[0].length && byLayer[1].length) {
      edges.push([byLayer[0][byLayer[0].length - 1].index, byLayer[1][0].index]);
    }
    return { nodes, edges };
  }

  function createRun(config, profile, worldId, depth, playerPicks) {
    const rule = getDepthRule(config, worldId, depth);
    if (!rule) throw new Error("缺少深度规则");
    const fixed = getFixedPool(config, worldId, depth);
    const needFill = Number(rule.玩家补卡数量) || 0;
    if ((playerPicks || []).length < needFill) {
      return { ok: false, msg: `还需自选命运卡 ${needFill - (playerPicks || []).length} 张` };
    }
    const picks = (playerPicks || []).slice(0, needFill);
    let ids = fixed.concat(picks);
    const maxCards = Number(rule.最多命运卡) || ids.length;
    if (ids.length > maxCards) ids = ids.slice(0, maxCards);

    const bossMob = rule.Boss怪物ID;
    const hasBoss = ids.some((id) => {
      const c = config.fateCards[id];
      return c && (String(c.备注 || "").includes("BOSS") || c.怪物ID === bossMob);
    });
    if (!hasBoss) {
      const bossFate = Object.values(config.fateCards).find((c) => c.怪物ID === bossMob);
      if (bossFate) ids.push(bossFate.命运卡ID);
    }

    // 洗牌内容，但布局算法再布置坐标与连线
    ids = shuffle(ids);
    // 起点语义：把一张非战斗卡放到第一位更自然
    const soft = ids.findIndex((id) => {
      const t = (config.fateCards[id] || {}).类型;
      return t !== "战斗" && t !== "撤离";
    });
    if (soft > 0) {
      const t = ids[0];
      ids[0] = ids[soft];
      ids[soft] = t;
    }

    const graph = layoutGraph(ids, config, bossMob);
    const run = {
      worldId,
      depth: Number(depth),
      layer: 0,
      pendingReward: 0,
      rule,
      nodes: graph.nodes,
      edges: graph.edges,
      pos: 0,
      completed: 0,
      hp: Number(rule.开局气血) || 100,
      maxHp: Number(rule.开局气血) || 100,
      yuan: Number(rule.开局真元) || 8,
      luck: Number(rule.开局气运) || 40,
      bag: [],
      bossDefeated: false,
      moveCost: Number(rule.移动真元消耗) || 1,
      alive: true,
      extracted: false,
      blockedEdges: {},
    };
    return { ok: true, run };
  }

  function getAvailable(run) {
    const cur = run.nodes[run.pos];
    if (!cur) return [];
    if (!cur.resolved && cur.kind !== "start") return [];
    const result = [];
    run.edges.forEach(([a, b], ei) => {
      if (run.blockedEdges[ei]) return;
      if (a === run.pos) result.push(b);
      if (b === run.pos) result.push(a);
    });
    const layer = run.layer || 0;
    return [...new Set(result)].filter((i) => {
      const n = run.nodes[i];
      if (!n || i === run.pos) return false;
      if (n.layer === layer) return true;
      return cur.flipLayer && n.layer === layer + 1;
    });
  }

  function payMove(run) {
    if (run.yuan > 0) {
      run.yuan -= 1;
      run.hp = Math.min(run.maxHp, run.hp + 5);
    } else {
      run.hp -= 5;
      if (run.hp <= 0) {
        run.hp = 0;
        run.alive = false;
      }
    }
  }

  function moveTo(run, targetIndex) {
    const avail = getAvailable(run);
    if (!avail.includes(targetIndex)) return { ok: false, msg: "只能移动到相邻发光的命运牌" };
    payMove(run);
    if (!run.alive) return { ok: false, msg: "气血耗尽" };
    run.pos = targetIndex;
    run.nodes[targetIndex].revealed = true;
    const next = run.nodes[targetIndex];
    let flipped = false;
    if (next && next.layer !== (run.layer || 0)) {
      run.layer = next.layer;
      flipped = true;
    }
    return { ok: true, flippedLayer: flipped, layer: run.layer };
  }

  function canExtract(run) {
    const min = Number(run.rule.最少命运卡) || 1;
    return run.bossDefeated && run.completed >= min && !run.extracted;
  }

  function applyEffect(run, type, param) {
    const logs = [];
    const n = Number(param);
    if (type === "ADD_YUAN") {
      run.yuan += n;
      logs.push(`真元${n >= 0 ? "+" : ""}${n}`);
    } else if (type === "HEAL_HP") {
      run.hp = Math.min(run.maxHp, run.hp + n);
      logs.push(`气血${n >= 0 ? "+" : ""}${n}`);
    } else if (type === "ADD_LUCK") {
      run.luck += n;
      logs.push(`气运${n >= 0 ? "+" : ""}${n}`);
    }
    if (run.hp <= 0) {
      run.hp = 0;
      run.alive = false;
    }
    return logs;
  }

  function markResolved(run, node) {
    if (!node || node.resolved) return;
    node.resolved = true;
    if (node.kind !== "start") run.completed += 1;
  }

  function resolveChoice(run, optionIndex) {
    const node = run.nodes[run.pos];
    if (!node || node.resolved) return { ok: false, msg: "已结算" };
    const conf = node.conf;
    const t = optionIndex === 1 ? conf.选项1效果类型 : conf.选项2效果类型;
    const p = optionIndex === 1 ? conf.选项1参数 : conf.选项2参数;
    const text = optionIndex === 1 ? conf.选项1文本 : conf.选项2文本;
    if (!text) return { ok: false, msg: "无效选项" };

    if (t === "START_BATTLE" || (node.type === "战斗" && optionIndex === 1)) {
      return { ok: true, action: "battle", monsterId: conf.怪物ID || p, node };
    }
    if (t === "OPEN_SHOP" || node.type === "商店") {
      return { ok: true, action: "shop", shopId: conf.商店池ID || p, node };
    }
    if (t === "STORY_TEXT") {
      return { ok: true, action: "story", storyId: p, node };
    }
    if (node.type === "撤离" || p === "EXTRACT") {
      return { ok: true, action: "extractOffer", node };
    }
    const logs = applyEffect(run, t, p);
    markResolved(run, node);
    return { ok: true, action: "done", logs, node };
  }

  function afterBattleVictory(run, node) {
    markResolved(run, node);
    if (node.isBoss) run.bossDefeated = true;
    run.luck += 10;
  }

  function lookupExtractReward(config, run) {
    const rows = (config.sheets["16_撤离奖励"] || []).filter(
      (r) => r.世界ID === run.worldId && Number(r.深度) === Number(run.depth)
    );
    return (
      rows.find(
        (r) => run.completed >= Number(r.完成卡数下限) && run.completed <= Number(r.完成卡数上限)
      ) || rows[rows.length - 1] || null
    );
  }

  function getShopGoods(config, shopId, limit = 4) {
    const rows = (config.sheets["09_局内商店"] || []).filter((r) => r.商店池ID === shopId);
    return shuffle(rows)
      .slice(0, limit)
      .map((r) => {
        const relic = config.relics[r.商品ID];
        return relic ? { ...relic, price: Number(r.价格气运) || 50 } : null;
      })
      .filter(Boolean);
  }

  global.FateExplore = {
    shuffle,
    getDepthRule,
    getFixedPool,
    createRun,
    getAvailable,
    moveTo,
    canExtract,
    resolveChoice,
    markResolved,
    afterBattleVictory,
    lookupExtractReward,
    getShopGoods,
    applyEffect,
  };
})(window);
