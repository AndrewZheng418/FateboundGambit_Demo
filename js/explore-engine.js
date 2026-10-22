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
      台阶: { icon: "阶", mark: "阶", kind: "stairs" },
      撤离: { icon: "归", mark: "归", kind: "exit" },
    };
    return map[type] || { icon: "命", mark: "命", kind: "event" };
  }
  function isFlipType(t) {
    return t === "灵藏" || t === "问心";
  }
  function isBossCard(conf, bossMob) {
    if (!conf) return false;
    return String(conf.备注 || "").includes("BOSS") || (bossMob && conf.怪物ID === bossMob);
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

  function structConf(name, type, body, opt) {
    return { 名称: name, 类型: type, 正文: body, 选项1文本: opt || "", 选项1效果类型: "", 选项1参数: "" };
  }
  function makeStructNode(i, x, y, layer, spec) {
    const meta = typeMeta(spec.type);
    return {
      index: i,
      fateId: "",
      name: spec.name,
      type: spec.type,
      conf: spec.conf || structConf(spec.name, spec.type, spec.body || "", spec.opt),
      x,
      y,
      layer,
      revealed: !!spec.revealed,
      resolved: !!spec.resolved,
      isBoss: !!spec.isBoss,
      icon: spec.icon || meta.icon,
      mark: spec.mark || meta.mark,
      kind: spec.kind || meta.kind,
      flipLayer: !!spec.flipLayer,
      structural: true,
    };
  }
  function placeLayerItems(items, layer) {
    const n = items.length;
    if (n <= 1) return [{ item: items[0], x: 50, y: 50, layer }];
    const coords = [{ item: items[0], x: 50, y: 86, layer }];
    const mid = items.slice(1, n - 1);
    const cols = mid.length <= 2 ? 2 : 3;
    const rows = Math.max(1, Math.ceil(mid.length / cols));
    mid.forEach((item, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const y = rows === 1 ? 52 : 70 - r * (34 / Math.max(rows - 1, 1));
      const xs = cols === 2 ? (r % 2 === 0 ? [32, 68] : [68, 32]) : r % 2 === 0 ? [22, 50, 78] : [78, 50, 22];
      coords.push({ item, x: xs[c] || 50, y: Math.max(34, Math.min(70, y)), layer });
    });
    coords.push({ item: items[n - 1], x: 50, y: 16, layer });
    return coords;
  }
  function contentKind(c) {
    const t = (c.conf && c.conf.类型) || "";
    if (t === "问心") return "fortune";
    if (t === "灵藏") return "treasure";
    if (t === "商店") return "shop";
    if (t === "战斗") return "battle";
    if (t === "剧情") return "story";
    return "event";
  }
  function pickMapContent(rest, nLayers, perLayer) {
    const bags = { fortune: [], treasure: [], shop: [], battle: [], story: [], event: [] };
    shuffle(rest).forEach((c) => bags[contentKind(c)].push(c));
    const order = ["battle", "fortune", "shop", "story", "treasure", "event"];
    const mixed = [];
    let added = true;
    while (added) {
      added = false;
      order.forEach((k) => {
        if (bags[k].length) {
          mixed.push({ k, c: bags[k].shift() });
          added = true;
        }
      });
    }
    const layers = Array.from({ length: nLayers }, () => []);
    const xin = Array(nLayers).fill(0);
    let cursor = 0;
    mixed.forEach((item) => {
      for (let t = 0; t < nLayers; t++) {
        const i = (cursor + t) % nLayers;
        if (layers[i].length >= perLayer) continue;
        if (item.k === "fortune" && xin[i] >= 1) continue;
        layers[i].push(item.c);
        if (item.k === "fortune") xin[i] += 1;
        cursor = i + 1;
        return;
      }
    });
    return layers.map((slot) => shuffle(slot));
  }
  function enrichFlipPool(ids, config) {
    const list = (ids || []).slice();
    const used = new Set(list);
    const typeOf = (id) => (config.fateCards[id] || {}).类型;
    const extrasOf = (type) =>
      Object.keys(config.fateCards || {}).filter((id) => typeOf(id) === type && !used.has(id));
    const fill = (type, want) => {
      let have = list.filter((id) => typeOf(id) === type).length;
      const extras = extrasOf(type);
      for (let i = list.length - 1; i >= 0 && have < want && extras.length; i--) {
        const t = typeOf(list[i]);
        if (t !== "事件" && t !== "剧情") continue;
        const next = extras.shift();
        used.delete(list[i]);
        used.add(next);
        list[i] = next;
        have += 1;
      }
    };
    fill("问心", 2);
    fill("灵藏", 3);
    return list;
  }
  function fallbackBoss(bossMob, config) {
    const mob = (config.monsters && config.monsters[bossMob]) || {};
    return {
      fid: "",
      conf: {
        名称: mob.名称 || "本层首领",
        类型: "战斗",
        正文: "这是本层最后的拦路之人。击败后，才能从终点格撤离并带走收获。",
        选项1文本: "挑战首领",
        选项1效果类型: "START_BATTLE",
        选项1参数: bossMob,
        怪物ID: bossMob,
        备注: "BOSS",
      },
      isBoss: true,
    };
  }

  /**
   * 分页牌阵：首页起点已翻开；非末页最后一格上台阶；末页最后一格撤离。
   * 每页最多约 8 格，避免短屏点不中。
   */
  function layoutGraph(cardIds, config, bossMob) {
    const parsed = (cardIds || []).map((fid) => {
      const conf = config.fateCards[fid] || { 名称: fid, 类型: "事件" };
      return { fid, conf, isBoss: isBossCard(conf, bossMob) };
    });
    const bosses = parsed.filter((x) => x.isBoss);
    const rest = parsed.filter((x) => !x.isBoss && (x.conf.类型 || "") !== "撤离");
    const CONTENT_PER_LAYER = 5;
    const nLayers = rest.length >= 6 ? 2 : 1;
    const buckets = pickMapContent(rest, nLayers, CONTENT_PER_LAYER);
    const nodes = [];
    const edges = [];
    for (let L = 0; L < nLayers; L++) {
      const isFirst = L === 0;
      const isLast = L === nLayers - 1;
      const layerItems = [];
      layerItems.push({
        structural: true,
        name: isFirst ? "起点" : "密道入口",
        type: "起点",
        kind: "start",
        mark: "起",
        icon: "符",
        body: isFirst ? "已抵达起点。选择相邻发光命运牌前进。" : "牌阵翻到了下一层。选择相邻发光命运牌继续。",
        revealed: isFirst,
        resolved: isFirst,
      });
      (buckets[L] || []).forEach((c) => layerItems.push(c));
      if (isLast) {
        layerItems.push(bosses[0] || fallbackBoss(bossMob, config));
        layerItems.push({
          structural: true,
          name: "撤离",
          type: "撤离",
          kind: "exit",
          mark: "归",
          icon: "归",
          body: "这是本层最后一格。击败首领后可从这里撤离，带走本局收获。",
          opt: "尝试撤离",
        });
      } else {
        layerItems.push({
          structural: true,
          name: "上台阶",
          type: "台阶",
          kind: "stairs",
          mark: "阶",
          icon: "阶",
          flipLayer: true,
          body: "这是本页最后一格。走上来后，牌阵会翻到下一层。",
          opt: "登上台阶",
        });
      }
      const placed = placeLayerItems(layerItems, L);
      const startIndex = nodes.length;
      placed.forEach((p) => {
        const item = p.item;
        if (item.structural) {
          nodes.push(
            makeStructNode(nodes.length, p.x, p.y, L, {
              name: item.name,
              type: item.type,
              kind: item.kind,
              mark: item.mark,
              icon: item.icon,
              body: item.body,
              opt: item.opt,
              revealed: item.revealed,
              resolved: item.resolved,
              flipLayer: item.flipLayer,
            })
          );
        } else {
          const node = makeNode(item.fid, config, bossMob, nodes.length, p.x, p.y, L);
          if (item.conf) {
            node.conf = item.conf;
            node.name = item.conf.名称 || node.name;
            node.type = item.conf.类型 || node.type;
            node.isBoss = !!item.isBoss || isBossCard(item.conf, bossMob);
            const meta = typeMeta(node.type, node.isBoss);
            node.icon = meta.icon;
            node.mark = meta.mark;
            node.kind = meta.kind;
          }
          node.revealed = false;
          nodes.push(node);
        }
      });
      const last = nodes.length - 1;
      for (let i = startIndex; i < last; i++) edges.push([i, i + 1]);
      for (let i = startIndex + 1; i < last - 1; i++) {
        if ((i - startIndex) % 3 === 0 && i + 2 < last) edges.push([i, i + 2]);
      }
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

    ids = enrichFlipPool(shuffle(ids), config);
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
    const next = run.nodes[targetIndex];
    if (next) {
      next.revealed = true;
      next._justArrived = true;
    }
    if (next && next.kind === "start") next.resolved = true;
    if (next && next.layer !== (run.layer || 0)) run.layer = next.layer;
    return { ok: true, arrivedStairs: !!(next && (next.kind === "stairs" || next.flipLayer)), layer: run.layer };
  }

  function onExitCell(run) {
    const cur = run && run.nodes && run.nodes[run.pos];
    return !!(cur && (cur.kind === "exit" || cur.type === "撤离"));
  }
  function mapHasBoss(run) {
    return !!(run && (run.nodes || []).some((n) => n.isBoss));
  }
  function canExtract(run) {
    if (!run || run.extracted) return false;
    if (!onExitCell(run)) return false;
    if (mapHasBoss(run) && !run.bossDefeated) return false;
    return true;
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
    onExitCell,
    mapHasBoss,
    resolveChoice,
    markResolved,
    afterBattleVictory,
    lookupExtractReward,
    getShopGoods,
    applyEffect,
  };
})(window);
