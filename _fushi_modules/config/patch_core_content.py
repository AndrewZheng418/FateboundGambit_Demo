# -*- coding: utf-8 -*-
"""向 config.json 注入一批可玩核心内容（剧情/命运卡/人和/天时地利/撤离），不依赖再开 Excel。"""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CFG = ROOT / "data" / "config.json"


def fate(fid, name, typ, title, body, opt1=("继续", "NONE", ""), opt2=("", "NONE", ""), mob="", shop="", note=""):
    return {
        "命运卡ID": fid,
        "名称": name,
        "类型": typ,
        "稀有度": "普通",
        "标题文案": title,
        "正文": body,
        "选项1文本": opt1[0],
        "选项1效果类型": opt1[1],
        "选项1参数": opt1[2],
        "选项2文本": opt2[0],
        "选项2效果类型": opt2[1],
        "选项2参数": opt2[2],
        "怪物ID": mob,
        "商店池ID": shop,
        "是否可进固定池": 1,
        "备注": note,
    }


def main():
    cfg = json.loads(CFG.read_text(encoding="utf-8"))

    stories = [
        {"剧情ID": "STORY_OPEN_1", "标题": "贺宴之夜", "正文": "青崖峰贺宴未散，黑雾裂空而降。师尊将金鹏传承打入你体内，残峰坠入阎浮。"},
        {"剧情ID": "STORY_OPEN_2", "标题": "与青棠同行", "正文": "青棠握紧碎玉：「师兄，我们先活下去。只要青崖峰还在，就能回来。」"},
        {"剧情ID": "STORY_D1_MID", "标题": "后山回望", "正文": "回望山门，火光与黑雾交织。你第一次明白：所谓入世，是把命押进别人的劫数里。"},
        {"剧情ID": "STORY_D1_BOSS", "标题": "黑雾执事", "正文": "执事踏雾而来：「青崖余孽，把传承留下。」拼刀，从这里开始。"},
        {"剧情ID": "STORY_D2_INTRO", "标题": "更深的密道", "正文": "深度提升后，命运牌阵更密、压迫更重。你开始主动选择要遭遇的命运。"},
        {"剧情ID": "STORY_EXTRACT", "标题": "灵灯撤离", "正文": "灵灯亮起。命尘与记忆将被带回青崖峰——这一次，你改写了其中一段劫。"},
    ]
    cfg["sheets"]["27_世界剧情"] = stories
    cfg["stories"] = {s["剧情ID"]: s for s in stories}

    # richer fate set for playable loops
    fates = [
        fate("FATE_001", "断桥拦路", "事件", "断桥", "山道断桥，对面黑雾翻涌。", ("绕行（真元-1）", "ADD_YUAN", "-1"), ("强闯（气血-8）", "HEAL_HP", "-8")),
        fate("FATE_002", "旧物灵藏", "灵藏", "旧物", "草丛铜佩微光。", ("拾取气运+25", "ADD_LUCK", "25"), ("仔细搜索再+真元", "ADD_YUAN", "1")),
        fate("FATE_003", "苏锦书茶棚", "商店", "茶棚", "行商苏锦书支起茶棚。", ("进入商店", "OPEN_SHOP", "SHOP_TEA"), ("离开", "NONE", ""), shop="SHOP_TEA"),
        fate("FATE_004", "黑雾追兵", "战斗", "追兵", "黑袍追兵拦住去路。", ("接战", "START_BATTLE", "MOB_001"), ("", "NONE", ""), mob="MOB_001"),
        fate("FATE_005", "问心一签", "问心", "问心", "四签翻动，心念一动便知吉凶。", ("抽签气运+40", "ADD_LUCK", "40"), ("谨慎收签气血+6", "HEAL_HP", "6")),
        fate("FATE_006", "密道机关", "事件", "机关", "石壁星图转动。", ("破解（气运+15）", "ADD_LUCK", "15"), ("蛮力（气血-10，真元+2）", "HEAL_HP", "-10")),
        fate("FATE_007", "四象商铺", "商店", "四象", "白虎朱雀货架齐全。", ("进入商店", "OPEN_SHOP", "SHOP_SIXIANG"), ("离开", "NONE", ""), shop="SHOP_SIXIANG"),
        fate("FATE_008", "黑雾刀客", "战斗", "刀客", "雾中拔刀声近。", ("接战", "START_BATTLE", "MOB_002"), ("", "NONE", ""), mob="MOB_002"),
        fate("FATE_009", "青棠私语", "剧情", "私语", "青棠低声：「累了就说，我还在。」", ("点头前进", "STORY_TEXT", "STORY_OPEN_2"), ("休息回血+12", "HEAL_HP", "12")),
        fate("FATE_010", "撤离灵灯", "撤离", "撤离", "灵灯亮起，可返回青崖峰。", ("准备撤离", "NONE", "EXTRACT"), ("再留片刻", "NONE", "")),
        fate("FATE_011", "雾影弓手", "战斗", "弓手", "箭簇擦过耳侧。", ("接战", "START_BATTLE", "MOB_003"), ("", "NONE", ""), mob="MOB_003"),
        fate("FATE_012", "药囊", "灵藏", "药囊", "半瓶还温热的伤药。", ("服用+18气血", "HEAL_HP", "18"), ("省着点+8气血+气运10", "HEAL_HP", "8")),
        fate("FATE_013", "后山回望", "剧情", "回望", "火光与黑雾交织。", ("继续", "STORY_TEXT", "STORY_D1_MID"), ("", "NONE", "")),
        fate("FATE_014", "断魂先锋", "战斗", "先锋", "精英压迫骤升。", ("接战", "START_BATTLE", "MOB_011"), ("", "NONE", ""), mob="MOB_011", note="精英"),
        fate("FATE_015", "聚灵泉", "事件", "泉", "泉水可续真元。", ("饮用真元+2", "ADD_YUAN", "2"), ("灌装气运+20", "ADD_LUCK", "20")),
        fate("FATE_016", "黑市摊", "商店", "黑市", "来历不明的行商。", ("进入", "OPEN_SHOP", "SHOP_BASIC"), ("离开", "NONE", ""), shop="SHOP_BASIC"),
        fate("FATE_017", "试刀石", "事件", "试刀", "你感到牌意更锋利。", ("感悟（下个战斗前心情）", "ADD_LUCK", "10"), ("运气练刀气血-5气运+30", "HEAL_HP", "-5")),
        fate("FATE_018", "雾中呼救", "事件", "呼救", "像有人在雾里喊你。", ("救援（气血-6，气运+35）", "HEAL_HP", "-6"), ("不睬", "NONE", "")),
        fate("FATE_019", "星图残页", "灵藏", "残页", "像某段传承的注释。", ("收起", "ADD_LUCK", "18"), ("研读真元+1", "ADD_YUAN", "1")),
        fate("FATE_020", "深度1首领", "战斗", "首领", "执事拦在灵灯前。", ("决战", "START_BATTLE", "MOB_100"), ("", "NONE", ""), mob="MOB_100", note="BOSS"),
        fate("FATE_021", "更深密道", "剧情", "密道", "深度上升，牌阵更密。", ("前行", "STORY_TEXT", "STORY_D2_INTRO"), ("", "NONE", "")),
        fate("FATE_022", "潮雾狼", "战斗", "狼", "兽形黑雾扑来。", ("接战", "START_BATTLE", "MOB_002"), ("", "NONE", ""), mob="MOB_002"),
        fate("FATE_023", "问心再签", "问心", "再签", "第二次问心，吉凶更烈。", ("大赌气运+55", "ADD_LUCK", "55"), ("稳妥回血+10", "HEAL_HP", "10")),
        fate("FATE_024", "执事残部", "战斗", "残部", "未散的黑雾重新凝形。", ("接战", "START_BATTLE", "MOB_010"), ("", "NONE", ""), mob="MOB_010"),
        fate("FATE_025", "深度2首领", "战斗", "深渊执事", "压迫如山。", ("决战", "START_BATTLE", "MOB_200"), ("", "NONE", ""), mob="MOB_200", note="BOSS"),
        fate("FATE_026", "避雨亭", "事件", "避雨", "暂歇。", ("休息回血+15", "HEAL_HP", "15"), ("打坐真元+2", "ADD_YUAN", "2")),
        fate("FATE_027", "遗落剑符", "灵藏", "剑符", "一枚尚温的剑符。", ("收纳气运+22", "ADD_LUCK", "22"), ("", "NONE", "")),
        fate("FATE_028", "岔路碑", "事件", "岔路", "左险右稳。", ("走险路气运+40气血-8", "HEAL_HP", "-8"), ("走稳路真元+1", "ADD_YUAN", "1")),
        fate("FATE_029", "茶烟再起", "商店", "再遇茶棚", "苏锦书又支起了铺子。", ("进入", "OPEN_SHOP", "SHOP_TEA"), ("离开", "NONE", ""), shop="SHOP_TEA"),
        fate("FATE_030", "撤离前夜", "剧情", "前夜", "该走了吗？", ("阅读", "STORY_TEXT", "STORY_EXTRACT"), ("", "NONE", "")),
    ]
    # pad to ~60 with variants
    for i in range(31, 61):
        typ = ["事件", "灵藏", "战斗", "剧情"][i % 4]
        mob = "MOB_001" if typ == "战斗" else ""
        fates.append(
            fate(
                f"FATE_{i:03d}",
                f"命途·{i}",
                typ,
                f"命途{i}",
                f"可改写的命运残篇 #{i}。",
                ("前进气运+8", "ADD_LUCK", "8"),
                ("养神回血+5", "HEAL_HP", "5"),
                mob=mob,
                note="扩展池",
            )
        )

    cfg["sheets"]["07_命运卡"] = fates
    cfg["fateCards"] = {f["命运卡ID"]: f for f in fates}

    # depth1/2 fixed pools rewritten for playable narrative
    fixed = []
    d1 = ["FATE_001", "FATE_002", "FATE_003", "FATE_004", "FATE_005", "FATE_009", "FATE_013", "FATE_020"]
    for i, fid in enumerate(d1, 1):
        fixed.append({"世界ID": "WORLD_QINGMU", "深度": 1, "顺序": i, "命运卡ID": fid, "备注": "深度1主线固定"})
    d2 = [
        "FATE_021", "FATE_006", "FATE_007", "FATE_008", "FATE_011", "FATE_012", "FATE_014", "FATE_015",
        "FATE_016", "FATE_017", "FATE_018", "FATE_019", "FATE_022", "FATE_023", "FATE_024", "FATE_026",
        "FATE_027", "FATE_028", "FATE_029", "FATE_025",
    ]
    for i, fid in enumerate(d2, 1):
        fixed.append({"世界ID": "WORLD_QINGMU", "深度": 2, "顺序": i, "命运卡ID": fid, "备注": "深度2固定20"})
    cfg["sheets"]["15_深度固定卡池"] = fixed

    # 人和 skills richer
    cfg["sheets"]["12_人和"] = [
        {"人和ID": "REN_001", "名称": "青崖剑诀", "绑定同伴ID": "COMP_HERO", "技能类型": "主动", "效果类型": "CONVERT_PLAYED_RANK", "参数A": "手牌选中", "参数B": "加一", "参数C": 1, "每场次数": 1, "描述": "选1张手牌，点数+1（乙→丙…日封顶）。", "解锁": "默认"},
        {"人和ID": "REN_002", "名称": "青棠守心", "绑定同伴ID": "COMP_QINGTANG", "技能类型": "被动", "效果类型": "TRUE_DAMAGE_REDUCE", "参数A": 3, "参数B": "", "参数C": "", "每场次数": 0, "描述": "同行时受到真实伤害-3。", "解锁": "解锁青棠"},
        {"人和ID": "REN_003", "名称": "吐纳换牌", "绑定同伴ID": "COMP_HERO", "技能类型": "主动", "效果类型": "ON_DISCARD_DRAW", "参数A": 2, "参数B": "", "参数C": "", "每场次数": 1, "描述": "弃掉任意张后，再抽等量（最多2）。本实现：免费额外弃牌并抽回。", "解锁": "教程后"},
        {"人和ID": "REN_004", "名称": "压锋", "绑定同伴ID": "COMP_HERO", "技能类型": "主动", "效果类型": "PRESSURE_REDUCE", "参数A": 20, "参数B": "", "参数C": "", "每场次数": 1, "描述": "本回合压迫分-20。", "解锁": "深度2"},
    ]
    cfg["renSkills"] = {r["人和ID"]: r for r in cfg["sheets"]["12_人和"]}

    cfg["sheets"]["10_天时"] = [
        {"天时ID": "TIAN_001", "名称": "灵潮涌动", "解锁阶段": 3, "效果类型": "ADD_SCORE_FLAT", "参数A": 15, "参数B": "", "描述": "本回合出牌伤害分+15", "备注": ""},
        {"天时ID": "TIAN_002", "名称": "风雷相激", "解锁阶段": 4, "效果类型": "ADD_MULT", "参数A": 0.25, "参数B": "", "描述": "倍率+0.25", "备注": ""},
        {"天时ID": "TIAN_003", "名称": "黑雾压境", "解锁阶段": 5, "效果类型": "PRESSURE_REDUCE", "参数A": -15, "参数B": "", "描述": "压迫+15（更难）", "备注": ""},
        {"天时ID": "TIAN_004", "名称": "燥火天", "解锁阶段": 5, "效果类型": "IF_SUIT_COUNT_ADD", "参数A": "火", "参数B": 1, "参数C": 8, "描述": "火属性每张+8", "备注": ""},
    ]
    cfg["sheets"]["11_地利"] = [
        {"地利ID": "DI_001", "名称": "磐石之势", "解锁阶段": 2, "效果类型": "TRUE_DAMAGE_REDUCE", "参数A": 3, "参数B": "", "描述": "整场受伤-3", "备注": ""},
        {"地利ID": "DI_002", "名称": "聚灵阵", "解锁阶段": 3, "效果类型": "ADD_SCORE_FLAT", "参数A": 20, "参数B": "", "描述": "出牌+20分", "备注": ""},
        {"地利ID": "DI_003", "名称": "狭路", "解锁阶段": 4, "效果类型": "NONE", "参数A": "", "参数B": "", "描述": "氛围地利（暂无数值）", "备注": ""},
        {"地利ID": "DI_004", "名称": "密道回声", "解锁阶段": 3, "效果类型": "ADD_MULT", "参数A": 0.15, "参数B": "", "描述": "倍率+0.15", "备注": ""},
    ]

    # ensure extract rewards cover depth1/2
    cfg["sheets"]["16_撤离奖励"] = [
        {"世界ID": "WORLD_QINGMU", "深度": 1, "完成卡数下限": 8, "完成卡数上限": 11, "奖励1类型": "命尘", "奖励1ID或空": "", "奖励1数量": 60, "奖励2类型": "命晶", "奖励2数量": 8, "备注": "达标"},
        {"世界ID": "WORLD_QINGMU", "深度": 1, "完成卡数下限": 12, "完成卡数上限": 14, "奖励1类型": "命尘", "奖励1ID或空": "", "奖励1数量": 100, "奖励2类型": "命晶", "奖励2数量": 15, "备注": "较好"},
        {"世界ID": "WORLD_QINGMU", "深度": 1, "完成卡数下限": 15, "完成卡数上限": 16, "奖励1类型": "命尘", "奖励1ID或空": "", "奖励1数量": 140, "奖励2类型": "命晶", "奖励2数量": 25, "备注": "满探"},
        {"世界ID": "WORLD_QINGMU", "深度": 2, "完成卡数下限": 30, "完成卡数上限": 34, "奖励1类型": "命尘", "奖励1ID或空": "", "奖励1数量": 160, "奖励2类型": "命晶", "奖励2数量": 20, "备注": ""},
        {"世界ID": "WORLD_QINGMU", "深度": 2, "完成卡数下限": 35, "完成卡数上限": 39, "奖励1类型": "命尘", "奖励1ID或空": "", "奖励1数量": 220, "奖励2类型": "命晶", "奖励2数量": 35, "备注": ""},
        {"世界ID": "WORLD_QINGMU", "深度": 2, "完成卡数下限": 40, "完成卡数上限": 40, "奖励1类型": "命尘", "奖励1ID或空": "", "奖励1数量": 300, "奖励2类型": "命晶", "奖励2数量": 50, "备注": "满探"},
    ]

    # depth1 tune for shorter first loop if needed - keep 8 fixed + 8 fill, min 8 with boss
    rules = cfg["sheets"]["14_深度规则"]
    for r in rules:
        if r.get("世界ID") == "WORLD_QINGMU" and int(r.get("深度", 0)) == 1:
            r["最少命运卡"] = 8
            r["最多命运卡"] = 16
            r["固定卡数量"] = 8
            r["玩家补卡数量"] = 8
            r["Boss怪物ID"] = "MOB_100"
            r["备注"] = "深度1可玩短环：至少完成8张且击败首领可撤"

    CFG.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    print("patched", CFG)
    print("fate", len(cfg["fateCards"]), "stories", len(cfg["stories"]))


if __name__ == "__main__":
    main()
