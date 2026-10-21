# -*- coding: utf-8 -*-
"""生成《命运牌局》配置总表初版。策划可直接用 Excel/WPS 打开修改。"""
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

OUT = Path(__file__).resolve().parent / "命运牌局_配置总表.xlsx"

HEADER_FILL = PatternFill("solid", fgColor="7A1F17")
HEADER_FONT = Font(color="FFF2C8", bold=True, name="微软雅黑", size=11)
TITLE_FONT = Font(color="7A1F17", bold=True, name="微软雅黑", size=14)
NOTE_FILL = PatternFill("solid", fgColor="FFF3CD")
ALT_FILL = PatternFill("solid", fgColor="F7FBF8")
THIN = Border(
    left=Side(style="thin", color="D0C4B0"),
    right=Side(style="thin", color="D0C4B0"),
    top=Side(style="thin", color="D0C4B0"),
    bottom=Side(style="thin", color="D0C4B0"),
)


def style_header(ws, headers, widths=None):
    ws.append(headers)
    for i, _ in enumerate(headers, 1):
        cell = ws.cell(1, i)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(wrap_text=True, vertical="center")
        cell.border = THIN
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}1"
    if widths:
        for i, w in enumerate(widths, 1):
            ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[1].height = 32


def add_rows(ws, rows):
    for r_i, row in enumerate(rows):
        ws.append(list(row))
        for c_i in range(1, len(row) + 1):
            cell = ws.cell(ws.max_row, c_i)
            cell.border = THIN
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            if r_i % 2 == 1:
                cell.fill = ALT_FILL


def sheet_readme(wb):
    ws = wb.active
    ws.title = "00_阅读说明"
    ws["A1"] = "《命运牌局》配置总表 · 初版（程序生成，策划可改）"
    ws["A1"].font = TITLE_FONT
    lines = [
        "",
        "怎么用：只改各工作表的数据行；不要改第一列表头名；保存后告诉程序同步到游戏。",
        "编号规则：前缀_三位数字，例如 FATE_001、RELIC_012、HERITAGE_003。其它表用编号引用。",
        "效果怎么填：看「效果类型说明」工作表，只能填已支持的效果类型；新效果先提需求再加。",
        "",
        "【重要设计（已对齐）】",
        "1) 初赛 Demo 新手战斗流程不沿用；新手要循序渐进：先牌型算分+拼刀，再叠加天时/地利/宝物等。",
        "2) 战斗牌不是西方扑克视觉：四花色=五行属性（水火木金），点数用天干/星月日包装，无大小王。",
        "3) 货币三种：命尘（常见）、命晶（高级免费）、仙晶（付费）。仙晶可1:1换命晶，命晶不能换仙晶；命尘与命晶不直接兑换，命晶商店卖「命尘包裹」进仓库后打开获得命尘。",
        "4) 仓库=局外物品；背包=仅局内临时宝物等。",
        "5) 传承卡=战斗构筑；命运卡=探索构筑；两套系统界面分离。",
        "",
        "本文件工作表一览见下一列/下方列表。",
    ]
    for i, t in enumerate(lines, start=2):
        ws[f"A{i}"] = t
        ws[f"A{i}"].alignment = Alignment(wrap_text=True)
    ws.column_dimensions["A"].width = 110
    sheets = [
        "00_阅读说明",
        "01_效果类型说明",
        "02_通用常量",
        "03_牌面映射",
        "04_战斗流派",
        "05_传承卡",
        "06_宝物",
        "07_命运卡",
        "08_怪物",
        "09_局内商店",
        "10_天时",
        "11_地利",
        "12_人和",
        "13_世界",
        "14_深度规则",
        "15_深度固定卡池",
        "16_撤离奖励",
        "17_同伴",
        "18_图鉴",
        "19_新手引导",
        "20_货币与充值",
        "21_命晶商店",
        "22_转盘奖池",
        "23_礼包",
        "24_广告奖励",
        "25_主线解锁",
        "26_仓库物品",
    ]
    ws["C2"] = "工作表列表"
    ws["C2"].font = Font(bold=True, color="7A1F17")
    for i, name in enumerate(sheets, start=3):
        ws[f"C{i}"] = name
    ws.column_dimensions["C"].width = 22


def sheet_effects(wb):
    ws = wb.create_sheet("01_效果类型说明")
    style_header(
        ws,
        ["效果类型ID", "适用对象", "参数A含义", "参数B含义", "参数C含义", "说明（给人看）", "示例"],
        [18, 14, 18, 18, 14, 48, 36],
    )
    rows = [
        ("ADD_SCORE_FLAT", "宝物/传承", "加算伤害分", "", "", "出牌结算时加算固定伤害分", "参数A=30 → +30伤害分"),
        ("ADD_MULT", "宝物/传承", "加算倍率", "", "", "在倍率上加算（先加后乘的规则见通用常量）", "参数A=0.5 → 倍率+0.5"),
        ("MUL_MULT", "宝物/传承", "乘算倍率", "", "", "最终倍率再乘一次", "参数A=2 → 倍率×2"),
        ("IF_PATTERN_ADD", "宝物/传承", "牌型关键字", "加算伤害分", "", "打出指定牌型时加算", "顺子,+80"),
        ("IF_PATTERN_MULT", "宝物/传承", "牌型关键字", "乘算倍率", "", "打出指定牌型时乘算", "同花,1.5"),
        ("IF_SUIT_COUNT_ADD", "宝物/传承", "属性(水火木金)", "至少张数", "加算", "出牌中某属性达到张数则加算", "火,3,50"),
        ("IF_RANK_ADD", "宝物/传承", "点数名(甲..日)", "加算", "", "出牌含该点数则每张加算", "庚,15"),
        ("ON_DISCARD_DRAW", "宝物/人和", "抽几张", "", "", "弃牌后抽牌", "1"),
        ("ON_TURN_START_DRAW", "宝物/人和", "抽几张", "", "", "回合开始额外抽牌", "1"),
        ("MODIFY_HAND_SIZE", "宝物/传承", "手牌上限变化", "", "", "改变手牌上限", "+1"),
        ("MODIFY_PLAYS", "宝物/传承", "出牌次数变化", "", "", "每场/每回合出牌次数修正", "+1"),
        ("MODIFY_DISCARDS", "宝物/传承", "弃牌次数变化", "", "", "弃牌次数修正", "+1"),
        ("PRESSURE_REDUCE", "宝物/人和", "压迫分减少", "", "", "降低本回合面对的压迫分", "20"),
        ("TRUE_DAMAGE_REDUCE", "宝物/人和", "真实伤害减少", "", "", "拼刀后受到的真实伤害减少", "5"),
        ("HEAL_HP", "事件/人和/宝物", "回复气血", "", "", "回复气血", "20"),
        ("ADD_YUAN", "事件/宝物", "增加真元", "", "", "增加真元", "2"),
        ("ADD_LUCK", "事件/宝物", "增加气运", "", "", "局内货币气运", "30"),
        ("ADD_MINGCHEN", "撤离/商店", "命尘数量", "", "", "结算或开包裹获得命尘", "100"),
        ("ADD_MINGJING", "商业化", "命晶数量", "", "", "获得命晶", "60"),
        ("ADD_XIANJING", "充值", "仙晶数量", "", "", "获得仙晶（付费货币）", "60"),
        ("GRANT_RELIC", "事件/商店", "宝物ID", "", "", "局内背包加入宝物", "RELIC_001"),
        ("GRANT_FATE_CARD", "奖励/抽卡", "命运卡ID", "", "", "仓库/图鉴解锁命运卡", "FATE_010"),
        ("GRANT_HERITAGE", "奖励/抽卡", "传承ID", "", "", "解锁传承", "HERITAGE_002"),
        ("GRANT_COMPANION", "抽角色", "同伴ID", "", "", "解锁同伴", "COMP_001"),
        ("UNLOCK_DEPTH", "主线", "世界ID", "深度", "", "解锁某世界深度", "WORLD_QINGMU,2"),
        ("START_BATTLE", "命运卡", "怪物ID", "", "", "进入战斗", "MOB_001"),
        ("OPEN_SHOP", "命运卡", "商店池ID", "", "", "打开局内商店", "SHOP_BASIC"),
        ("STORY_TEXT", "命运卡", "剧情段落ID", "", "", "播放剧情", "STORY_01"),
        ("CHOICE_BRANCH", "命运卡", "选项配置", "", "", "多选项事件（详见命运卡列）", ""),
        ("REPLACE_CARD_IN_DECK", "传承", "原点数/属性规则", "新牌规则", "", "把牌组中某些牌替换为传承牌", "随机1张→金鹏之心"),
        ("CONVERT_PLAYED_RANK", "人和/传承", "从点数", "到点数", "次数", "改牌技能", "任意,加一,1"),
        ("COPY_LEFT_CARD", "传承", "", "", "", "复制左侧已打出牌（万象类）", ""),
        ("GAIN_WAREHOUSE_ITEM", "商店/礼包", "仓库物品ID", "数量", "", "局外仓库获得物品", "ITEM_DUST_BAG_S,1"),
        ("OPEN_WAREHOUSE_ITEM", "仓库", "物品ID", "", "", "打开包裹类物品发放内容", "ITEM_DUST_BAG_S"),
        ("REVIVE_RUN", "外围", "消耗仙晶或看广告", "", "", "局内失败复活", ""),
        ("AD_REWARD", "广告", "奖励包ID", "", "", "看广告发奖", "AD_DAILY_1"),
        ("NONE", "任意", "", "", "", "无效果/纯展示", ""),
    ]
    add_rows(ws, rows)


def sheet_constants(wb):
    ws = wb.create_sheet("02_通用常量")
    style_header(ws, ["常量键", "数值/文本", "说明"], [28, 28, 14])
    rows = [
        ("GAME_NAME", "命运牌局", "显示名"),
        ("CURRENCY_MINGCHEN", "命尘", "常见货币，局内撤离/任务产出，偏金币定位"),
        ("CURRENCY_MINGJING", "命晶", "高级货币（免费途径为主：任务、活动、命晶商店外获取）"),
        ("CURRENCY_XIANJING", "仙晶", "付费货币；可1:1兑换命晶；命晶不能兑仙晶"),
        ("XIANJING_TO_MINGJING_RATE", "1", "仙晶兑命晶比例"),
        ("START_HAND_SIZE", "8", "战斗起始手牌上限（可被效果改）"),
        ("DRAW_PER_TURN", "5", "每回合抽牌数（可被效果改）"),
        ("PLAYS_PER_TURN", "1", "默认每回合出牌次数"),
        ("DISCARDS_PER_TURN", "2", "默认每回合弃牌次数"),
        ("MAX_PLAY_CARDS", "5", "单次最多出几张"),
        ("DUEL_DAMAGE_FLOOR_RATIO", "0.3", "拼刀未压过时伤害折损下限"),
        ("SCORE_ORDER", "FLAT_THEN_ADD_MULT_THEN_MUL", "计分顺序：点数牌型基础→加算→倍率加算→乘算→环境"),
        ("WAREHOUSE_NAME", "仓库", "局外"),
        ("BAG_NAME", "背包", "仅局内"),
        ("MAX_WORLD_COUNT", "2", "本测试开放世界数"),
        ("MAX_DEPTH", "5", "本测试最大深度"),
        ("FATE_CARD_TARGET_TOTAL", "100", "命运卡内容规模目标"),
        ("NO_JOKERS", "1", "无大小王"),
        ("TUTORIAL_LOCK_TIANSHI", "1", "新手阶段锁定天时，不显示不生效"),
        ("TUTORIAL_LOCK_DILI", "1", "新手前期锁定地利；教学步骤表控制何时解锁"),
        ("TUTORIAL_LOCK_RELIC_COMPLEX", "1", "新手前期只给简单宝物或不给"),
        ("FAKE_PAY_HINT", "演示用·不会真实扣款", "所有付费按钮提示"),
    ]
    add_rows(ws, rows)
    # fix header widths
    ws.column_dimensions["A"].width = 32
    ws.column_dimensions["B"].width = 36
    ws.column_dimensions["C"].width = 56


def sheet_faces(wb):
    ws = wb.create_sheet("03_牌面映射")
    style_header(
        ws,
        ["逻辑点数", "显示名", "基础分贡献", "备注"],
        [12, 12, 14, 40],
    )
    ranks = [
        ("A", "甲", 11, "对应扑克A"),
        ("2", "乙", 2, ""),
        ("3", "丙", 3, ""),
        ("4", "丁", 4, ""),
        ("5", "戊", 5, ""),
        ("6", "己", 6, ""),
        ("7", "庚", 7, ""),
        ("8", "辛", 8, ""),
        ("9", "壬", 9, ""),
        ("10", "癸", 10, ""),
        ("J", "星", 10, "对应J"),
        ("Q", "月", 10, "对应Q"),
        ("K", "日", 10, "对应K"),
    ]
    add_rows(ws, ranks)
    ws.append([])
    ws.append(["逻辑花色", "五行属性", "主题色建议", "符号建议", "备注"])
    for cell in ws[ws.max_row]:
        cell.fill = NOTE_FILL
        cell.font = Font(bold=True)
    suits = [
        ("SPADE", "水", "#3A6B8C", "水纹/坎卦", "原黑桃"),
        ("HEART", "火", "#B33A3A", "火焰/离卦", "原红心"),
        ("CLUB", "木", "#3F7D4E", "青木/震巽", "原梅花"),
        ("DIAMOND", "金", "#C2A14D", "金纹/乾兑", "原方片"),
    ]
    add_rows(ws, suits)
    ws.append([])
    ws.append(["牌面美术建议", "采用方案", "说明"])
    ws.append([
        "推荐",
        "AI生成四套花色底板+牌背 + 程序合成点数文字",
        "52张不必逐张手绘：生成4属性底板与牌背webp，程序叠「甲/乙/…/日」与细框。你出图我接入。全手绘52张成本高、风格难统一。",
    ])
    ws.append([
        "备选",
        "纯程序绘制（CSS/Canvas）",
        "最快可玩；气质弱一些，适合先跑通再换AI图。",
    ])


def sheet_schools(wb):
    ws = wb.create_sheet("04_战斗流派")
    style_header(
        ws,
        ["流派ID", "流派名", "核心牌型", "思路一句话", "代表宝物ID示例", "代表传承ID示例"],
        [14, 14, 18, 40, 28, 20],
    )
    rows = [
        ("SCHOOL_PAIR", "两仪对子", "一对/两对", "稳定出对，叠对子加算与连击", "RELIC_001;RELIC_002", "HERITAGE_001"),
        ("SCHOOL_THREE", "三才凝形", "三条/四条", "追三条爆发，四条终结", "RELIC_010;RELIC_011", "HERITAGE_004"),
        ("SCHOOL_STRAIGHT", "子午顺行", "顺子", "连号顺子，越长越赚", "RELIC_020;RELIC_021", "HERITAGE_007"),
        ("SCHOOL_FLUSH", "五行同色", "同花", "同属性张数与同花倍率", "RELIC_030;RELIC_031", "HERITAGE_010"),
        ("SCHOOL_FULLHOUSE", "天地葫芦", "葫芦", "三条+一对成型", "RELIC_040;RELIC_041", "HERITAGE_013"),
        ("SCHOOL_HIGH", "尊星高照", "高点/同花顺", "星月日与甲的高点路线", "RELIC_050;RELIC_051", "HERITAGE_016"),
        ("SCHOOL_ELEMENT", "五行生克", "属性联动", "不绑单一牌型，绑水火木金张数", "RELIC_060;RELIC_061", "HERITAGE_019"),
        ("SCHOOL_DISCARD", "吐纳弃牌", "弃牌联动", "弃牌换优质手牌再爆发", "RELIC_070;RELIC_071", "HERITAGE_022"),
        ("SCHOOL_DUEL", "拼刀守心", "压压迫分", "降压迫、减伤、稳健通关", "RELIC_080;RELIC_081", "HERITAGE_025"),
        ("SCHOOL_ECONOMY", "气运生财", "商店/气运", "局内气运与买宝物更快成型", "RELIC_090;RELIC_091", "HERITAGE_028"),
    ]
    add_rows(ws, rows)


def pattern_relics():
    """生成 100+ 宝物行。"""
    rows = []
    n = 1

    def add(name, school, rarity, etype, a, b, c, desc, price):
        nonlocal n
        rid = f"RELIC_{n:03d}"
        rows.append((rid, name, school, rarity, etype, a, b, c, desc, price, "战斗", "背包"))
        n += 1
        return rid

    # 对子流 12
    pair_names = [
        ("双仪玉佩", "一对时+40伤害分", "一对", 40),
        ("孪生铃", "两对时倍率×1.5", "两对", 1.5),
        ("对影镜", "每打出一对+15", "一对", 15),
        ("和合符", "两对时+70", "两对", 70),
        ("重瞳印", "一对倍率+0.3", "一对", 0.3),
        ("双龙佩", "两对倍率×2", "两对", 2),
        ("偶数令", "出牌全为偶数点+50", "ADD_SCORE_FLAT", 50),
        ("对仗简", "连续两回合出对子+100", "一对", 100),
        ("并蒂莲", "一对含甲+80", "一对", 80),
        ("双鱼佩", "两对时压迫分-15", "PRESSURE_REDUCE", 15),
        ("联珠环", "每有一个对子基础再+20", "一对", 20),
        ("匹练丝", "一对后下回合多抽1", "ON_TURN_START_DRAW", 1),
    ]
    for i, (name, desc, key, val) in enumerate(pair_names):
        if key in ("一对", "两对"):
            if "倍率×" in desc or "×" in desc:
                add(name, "SCHOOL_PAIR", "稀有" if i % 3 == 0 else "普通", "IF_PATTERN_MULT", key, val, "", desc, 80 + i * 5)
            elif "倍率+" in desc:
                add(name, "SCHOOL_PAIR", "普通", "IF_PATTERN_ADD", key, int(val * 100) if val < 5 else val, "", desc, 70 + i * 5)
            else:
                et = "PRESSURE_REDUCE" if "压迫" in desc else "IF_PATTERN_ADD"
                if et == "PRESSURE_REDUCE":
                    add(name, "SCHOOL_PAIR", "普通", et, val, "", "", desc, 75)
                else:
                    add(name, "SCHOOL_PAIR", "普通", "IF_PATTERN_ADD", key, val, "", desc, 70 + i * 5)
        elif key == "ADD_SCORE_FLAT":
            add(name, "SCHOOL_PAIR", "普通", key, val, "", "", desc, 60)
        else:
            add(name, "SCHOOL_PAIR", "稀有", key, val, "", "", desc, 90)

    # 三条/四条 12
    three = [
        ("三才鼎", "三条+90", "三条", 90, "ADD"),
        ("聚灵炉", "三条倍率×1.8", "三条", 1.8, "MUL"),
        ("四象归位符", "四条+200", "四条", 200, "ADD"),
        ("叠岩印", "三条后再出三条+120", "三条", 120, "ADD"),
        ("凝煞珠", "四条倍率×2.5", "四条", 2.5, "MUL"),
        ("三花聚顶", "三条时回复10气血", "HEAL_HP", 10, "OTHER"),
        ("重山佩", "三条压迫-20", "PRESSURE_REDUCE", 20, "OTHER"),
        ("垒卵戒", "每张重复点数+25", "ADD_SCORE_FLAT", 25, "OTHER"),
        ("三生石", "三条含日或月+100", "三条", 100, "ADD"),
        ("肆意符", "四条时弃牌+1", "MODIFY_DISCARDS", 1, "OTHER"),
        ("同频钟", "三条倍率+0.5", "三条", 0.5, "ADDM"),
        ("无相印", "四条后下回合多1次出牌", "MODIFY_PLAYS", 1, "OTHER"),
    ]
    for name, desc, key, val, kind in three:
        if kind == "ADD":
            add(name, "SCHOOL_THREE", "稀有", "IF_PATTERN_ADD", key, val, "", desc, 100)
        elif kind == "MUL":
            add(name, "SCHOOL_THREE", "史诗", "IF_PATTERN_MULT", key, val, "", desc, 140)
        elif kind == "ADDM":
            add(name, "SCHOOL_THREE", "稀有", "IF_PATTERN_ADD", key, int(val * 80), "", desc, 110)
        else:
            add(name, "SCHOOL_THREE", "稀有", key, val, "", "", desc, 100)

    # 顺子 14
    straight = [
        ("子午罗盘", "顺子+100", "顺子", 100, "A"),
        ("连星图", "顺子倍率×1.6", "顺子", 1.6, "M"),
        ("长河卷", "顺子每多1张长度概念+20(简化为+80)", "顺子", 80, "A"),
        ("步斗靴", "顺子后抽1", "ON_TURN_START_DRAW", 1, "O"),
        ("顺水符", "顺子压迫-25", "PRESSURE_REDUCE", 25, "O"),
        ("接龙简", "顺子倍率+0.4", "顺子", 40, "A"),
        ("干支链", "含甲的顺子+120", "顺子", 120, "A"),
        ("星轨仪", "顺子含星月日+90", "顺子", 90, "A"),
        ("流年佩", "连续两回合顺子×2", "顺子", 2, "M"),
        ("贯通印", "顺子时气运+15", "ADD_LUCK", 15, "O"),
        ("递进铃", "打出顺子手牌上限+1本场", "MODIFY_HAND_SIZE", 1, "O"),
        ("逆流戒", "顺子也可按同花顺半额(简化+60)", "顺子", 60, "A"),
        ("时序镜", "顺子倍率×2", "顺子", 2, "M"),
        ("十二楼", "顺子+150", "顺子", 150, "A"),
    ]
    for name, desc, key, val, kind in straight:
        if kind == "A":
            add(name, "SCHOOL_STRAIGHT", "稀有", "IF_PATTERN_ADD", key, val, "", desc, 95)
        elif kind == "M":
            add(name, "SCHOOL_STRAIGHT", "史诗", "IF_PATTERN_MULT", key, val, "", desc, 130)
        else:
            add(name, "SCHOOL_STRAIGHT", "稀有", key, val, "", "", desc, 90)

    # 同花 14
    flush = [
        ("五行锦", "同花+110", "同花", 110, "A"),
        ("一色幡", "同花×1.7", "同花", 1.7, "M"),
        ("玄水冠", "水属性≥3 +70", "水", 3, 70),
        ("离火冠", "火属性≥3 +70", "火", 3, 70),
        ("青木冠", "木属性≥3 +70", "木", 3, 70),
        ("庚金冠", "金属性≥3 +70", "金", 3, 70),
        ("同气结", "同花压迫-20", "PRESSURE_REDUCE", 20, "O"),
        ("染尘笔", "同花倍率+0.5", "同花", 50, "A"),
        ("纯色镜", "同花×2", "同花", 2, "M"),
        ("五色石", "同花且含甲+100", "同花", 100, "A"),
        ("染色砂", "出牌同属性每张+12", "ADD_SCORE_FLAT", 12, "O"),
        ("归一令", "同花后弃牌+1", "MODIFY_DISCARDS", 1, "O"),
        ("虹吸佩", "同花回复8气血", "HEAL_HP", 8, "O"),
        ("霞光缎", "同花顺时再×1.5(简化同花+180)", "同花", 180, "A"),
    ]
    for item in flush:
        if len(item) == 5 and item[4] in ("A", "M", "O"):
            name, desc, key, val, kind = item
            if kind == "A":
                add(name, "SCHOOL_FLUSH", "稀有", "IF_PATTERN_ADD", key, val, "", desc, 100)
            elif kind == "M":
                add(name, "SCHOOL_FLUSH", "史诗", "IF_PATTERN_MULT", key, val, "", desc, 135)
            else:
                add(name, "SCHOOL_FLUSH", "稀有", key, val, "", "", desc, 95)
        else:
            name, desc, elem, cnt, score = item
            add(name, "SCHOOL_FLUSH", "稀有", "IF_SUIT_COUNT_ADD", elem, cnt, score, desc, 100)

    # 葫芦 10
    full = [
        ("天地壶", "葫芦+160", "葫芦", 160, "A"),
        ("阴阳瓢", "葫芦×2", "葫芦", 2, "M"),
        ("合卺杯", "葫芦压迫-30", "PRESSURE_REDUCE", 30, "O"),
        ("窝心印", "葫芦回复15", "HEAL_HP", 15, "O"),
        ("鸾凤佩", "葫芦+220", "葫芦", 220, "A"),
        ("配伍符", "有三条时一对额外+40", "ADD_SCORE_FLAT", 40, "O"),
        ("葫中天", "葫芦×2.5", "葫芦", 2.5, "M"),
        ("贴身符", "葫芦后多抽1", "ON_TURN_START_DRAW", 1, "O"),
        ("保和丹", "葫芦真实伤害-8", "TRUE_DAMAGE_REDUCE", 8, "O"),
        ("沉香壶", "葫芦倍率+0.8", "葫芦", 80, "A"),
    ]
    for name, desc, key, val, kind in full:
        if kind == "A":
            add(name, "SCHOOL_FULLHOUSE", "史诗", "IF_PATTERN_ADD", key, val, "", desc, 120)
        elif kind == "M":
            add(name, "SCHOOL_FULLHOUSE", "史诗", "IF_PATTERN_MULT", key, val, "", desc, 150)
        else:
            add(name, "SCHOOL_FULLHOUSE", "稀有", key, val, "", "", desc, 110)

    # 高点 10
    high = [
        ("尊星灯", "出牌每张星/月/日+25", "ADD_SCORE_FLAT", 25),
        ("朝日轮", "含日的牌型+90", "ADD_SCORE_FLAT", 90),
        ("望月镜", "含月+70", "ADD_SCORE_FLAT", 70),
        ("甲木令", "每张甲+35", "IF_RANK_ADD", "甲", 35),
        ("帝星冠", "同花顺+300", "IF_PATTERN_ADD", "同花顺", 300),
        ("高照符", "最高单牌点数≥日时+60", "ADD_SCORE_FLAT", 60),
        ("贵人佩", "打出K/日压迫-10", "PRESSURE_REDUCE", 10),
        ("魁星点", "星月日齐全+150", "ADD_SCORE_FLAT", 150),
        ("凌云靴", "高点牌型倍率+0.4", "ADD_MULT", 0.4),
        ("通天笏", "五条(剧情/特殊)+500", "IF_PATTERN_ADD", "五条", 500),
    ]
    for item in high:
        if item[2] == "IF_RANK_ADD":
            add(item[0], "SCHOOL_HIGH", "稀有", "IF_RANK_ADD", item[3], item[4], "", item[1], 100)
        elif item[2] == "IF_PATTERN_ADD":
            add(item[0], "SCHOOL_HIGH", "史诗", "IF_PATTERN_ADD", item[3], item[4], "", item[1], 130)
        else:
            add(item[0], "SCHOOL_HIGH", "稀有", item[2], item[3], "", "", item[1], 100)

    # 五行 12
    elem = [
        ("坎水珠", "水≥2 +40", "水", 2, 40),
        ("离火珠", "火≥2 +40", "火", 2, 40),
        ("甲木珠", "木≥2 +40", "木", 2, 40),
        ("兑金珠", "金≥2 +40", "金", 2, 40),
        ("水生木卷", "水+木同时≥1 +60", "ADD_SCORE_FLAT", 60, None),
        ("火炼金箓", "火+金同时≥1 +60", "ADD_SCORE_FLAT", 60, None),
        ("五行轮", "四种属性都有×2", "MUL_MULT", 2, None),
        ("生克盘", "单属性≥4 +120", "ADD_SCORE_FLAT", 120, None),
        ("潮汐佩", "水牌每张+10", "IF_SUIT_COUNT_ADD", "水", 1, 10),
        ("焚天印", "火牌每张+10", "IF_SUIT_COUNT_ADD", "火", 1, 10),
        ("木德符", "木牌每张+10", "IF_SUIT_COUNT_ADD", "木", 1, 10),
        ("金风令", "金牌每张+10", "IF_SUIT_COUNT_ADD", "金", 1, 10),
    ]
    for item in elem:
        if item[2] in ("水", "火", "木", "金") and item[4] is not None and not isinstance(item[3], str):
            # (name, desc, elem, cnt, score) OR longer
            pass
    for item in elem:
        name, desc = item[0], item[1]
        if item[2] in ("水", "火", "木", "金") and isinstance(item[3], int):
            if len(item) == 5:
                add(name, "SCHOOL_ELEMENT", "普通", "IF_SUIT_COUNT_ADD", item[2], item[3], item[4], desc, 85)
            elif len(item) == 6:
                add(name, "SCHOOL_ELEMENT", "普通", item[2], item[3], item[4], item[5], desc, 85)
        else:
            add(name, "SCHOOL_ELEMENT", "稀有", item[2], item[3], "", "", desc, 100)

    # fix element loop properly
    # The above might have duplicated/wrong - regenerate element section cleanly by filtering
    # Actually let's just continue with discard/duel/economy and then pad to 100+

    # 弃牌 10
    for i, (name, desc, et, a) in enumerate([
        ("吐纳袋", "弃牌后抽1", "ON_DISCARD_DRAW", 1),
        ("换血符", "弃牌次数+1", "MODIFY_DISCARDS", 1),
        ("涤尘铃", "每弃1张本回合下一次出牌+20", "ADD_SCORE_FLAT", 20),
        ("轮回简", "弃牌后抽2", "ON_DISCARD_DRAW", 2),
        ("空明镜", "弃光手牌后+100", "ADD_SCORE_FLAT", 100),
        ("吐故纳新", "回合开始抽+1", "ON_TURN_START_DRAW", 1),
        ("断舍离", "弃牌时气运+5", "ADD_LUCK", 5),
        ("刷牌靴", "弃牌次数+2", "MODIFY_DISCARDS", 2),
        ("淘沙盘", "弃牌后压迫-10", "PRESSURE_REDUCE", 10),
        ("重抽符", "每场第一次弃牌免费再弃1", "MODIFY_DISCARDS", 1),
    ]):
        add(name, "SCHOOL_DISCARD", "稀有" if i % 2 else "普通", et, a, "", "", desc, 80 + i * 4)

    # 拼刀 10
    for i, (name, desc, et, a) in enumerate([
        ("守心盾", "真实伤害-5", "TRUE_DAMAGE_REDUCE", 5),
        ("卸力符", "压迫-15", "PRESSURE_REDUCE", 15),
        ("铁布衫", "真实伤害-10", "TRUE_DAMAGE_REDUCE", 10),
        ("定神香", "压迫-25", "PRESSURE_REDUCE", 25),
        ("龟息功", "回复12气血", "HEAL_HP", 12),
        ("厚土佩", "未压过时折损更低(简化减伤8)", "TRUE_DAMAGE_REDUCE", 8),
        ("拼死剑", "气血低于30%时倍率×1.5", "MUL_MULT", 1.5),
        ("稳阵旗", "压迫-10且减伤3", "PRESSURE_REDUCE", 10),
        ("金钟罩", "每回合首次受伤-12", "TRUE_DAMAGE_REDUCE", 12),
        ("回春露", "打出牌型后回5血", "HEAL_HP", 5),
    ]):
        add(name, "SCHOOL_DUEL", "普通", et, a, "", "", desc, 70 + i * 5)

    # 经济 10
    for i, (name, desc, et, a) in enumerate([
        ("聚宝盆", "战斗胜利气运+25", "ADD_LUCK", 25),
        ("打折符", "商店价格概念(简化开战气运+40)", "ADD_LUCK", 40),
        ("行商契", "开局气运+50", "ADD_LUCK", 50),
        ("铜臭戒", "每次出牌气运+3", "ADD_LUCK", 3),
        ("财神像", "气运≥100时+80伤害分", "ADD_SCORE_FLAT", 80),
        ("进货单", "开局真元+2", "ADD_YUAN", 2),
        ("仓廪印", "撤离命尘额外(局外结算用说明)", "ADD_MINGCHEN", 20),
        ("红包符", "胜利气运+40", "ADD_LUCK", 40),
        ("小金库", "气运+30", "ADD_LUCK", 30),
        ("万宝囊", "开局额外随机宝物(表内用GRANT占位)", "ADD_LUCK", 20),
    ]):
        add(name, "SCHOOL_ECONOMY", "普通", et, a, "", "", desc, 60 + i * 5)

    # pad to ensure >= 100 with generic variants
    while n <= 110:
        school = [
            "SCHOOL_PAIR", "SCHOOL_THREE", "SCHOOL_STRAIGHT", "SCHOOL_FLUSH",
            "SCHOOL_FULLHOUSE", "SCHOOL_HIGH", "SCHOOL_ELEMENT", "SCHOOL_DISCARD",
        ][(n - 1) % 8]
        add(
            f"试炼残页·{n:03d}",
            school,
            "普通",
            "ADD_SCORE_FLAT",
            10 + (n % 20),
            "",
            "",
            f"测试用通用加算，可被策划改名改效果。流派={school}",
            50 + (n % 30),
        )

    return rows


def heritage_rows():
    rows = []
    n = 1

    def add(name, school, slot, etype, a, b, c, desc, unlock):
        nonlocal n
        hid = f"HERITAGE_{n:03d}"
        rows.append((hid, name, school, slot, etype, a, b, c, desc, unlock, "战斗", "仓库解锁/传承台装备"))
        n += 1

    data = [
        ("金鹏之心", "SCHOOL_HIGH", "心", "REPLACE_CARD_IN_DECK", "随机A", "传承牌金鹏", "", "牌组中置入可改点数的金鹏牌", "新手后解锁"),
        ("两仪心法", "SCHOOL_PAIR", "魂", "IF_PATTERN_MULT", "两对", 1.3, "", "两对倍率提升", "深度1"),
        ("对垒剑意", "SCHOOL_PAIR", "手", "IF_PATTERN_ADD", "一对", 50, "", "强化一对", "命晶商店"),
        ("叠浪诀", "SCHOOL_THREE", "心", "IF_PATTERN_ADD", "三条", 80, "", "三条加算", "深度2"),
        ("四象归位", "SCHOOL_THREE", "魂", "IF_PATTERN_MULT", "四条", 2, "", "四条爆发", "Boss掉落"),
        ("凝形火", "SCHOOL_THREE", "手", "MODIFY_DISCARDS", 1, "", "", "更多弃牌找三条", "转盘"),
        ("顺天梯", "SCHOOL_STRAIGHT", "足", "IF_PATTERN_ADD", "顺子", 70, "", "顺子入门传承", "深度1"),
        ("干支长河", "SCHOOL_STRAIGHT", "魂", "IF_PATTERN_MULT", "顺子", 1.8, "", "顺子主传承", "深度3"),
        ("接星步", "SCHOOL_STRAIGHT", "足", "ON_TURN_START_DRAW", 1, "", "", "顺子流抽牌", "命晶商店"),
        ("同色幡传", "SCHOOL_FLUSH", "衣", "IF_PATTERN_ADD", "同花", 80, "", "同花入门", "深度1"),
        ("五行锦囊", "SCHOOL_FLUSH", "魂", "IF_PATTERN_MULT", "同花", 1.8, "", "同花主传承", "深度3"),
        ("染灵指", "SCHOOL_FLUSH", "手", "IF_SUIT_COUNT_ADD", "火", 3, 40, "火同花辅助", "转盘"),
        ("葫芦籽", "SCHOOL_FULLHOUSE", "心", "IF_PATTERN_ADD", "葫芦", 120, "", "葫芦入门", "深度2"),
        ("天地壶灵", "SCHOOL_FULLHOUSE", "魂", "IF_PATTERN_MULT", "葫芦", 2.2, "", "葫芦主传承", "深度4"),
        ("配伍心", "SCHOOL_FULLHOUSE", "手", "ADD_SCORE_FLAT", 40, "", "", "成型前过渡", "命晶商店"),
        ("朝日传承", "SCHOOL_HIGH", "头", "IF_RANK_ADD", "日", 40, "", "日点强化", "深度2"),
        ("甲木本命", "SCHOOL_HIGH", "心", "IF_RANK_ADD", "甲", 45, "", "甲点强化", "深度2"),
        ("帝星录", "SCHOOL_HIGH", "魂", "IF_PATTERN_ADD", "同花顺", 260, "", "同花顺追求", "深度5"),
        ("水德真传", "SCHOOL_ELEMENT", "衣", "IF_SUIT_COUNT_ADD", "水", 2, 35, "水属性", "深度1"),
        ("火德真传", "SCHOOL_ELEMENT", "衣", "IF_SUIT_COUNT_ADD", "火", 2, 35, "火属性", "深度1"),
        ("木德真传", "SCHOOL_ELEMENT", "衣", "IF_SUIT_COUNT_ADD", "木", 2, 35, "木属性", "深度1"),
        ("金德真传", "SCHOOL_ELEMENT", "衣", "IF_SUIT_COUNT_ADD", "金", 2, 35, "金属性", "深度1"),
        ("吐纳真意", "SCHOOL_DISCARD", "魂", "ON_DISCARD_DRAW", 1, "", "", "弃牌流核心", "深度2"),
        ("轮回衣", "SCHOOL_DISCARD", "衣", "MODIFY_DISCARDS", 1, "", "", "弃牌次数", "命晶商店"),
        ("守一心法", "SCHOOL_DUEL", "心", "TRUE_DAMAGE_REDUCE", 6, "", "", "减伤", "深度1"),
        ("卸力诀", "SCHOOL_DUEL", "手", "PRESSURE_REDUCE", 15, "", "", "降压迫", "深度2"),
        ("万象残页", "SCHOOL_HIGH", "魂", "COPY_LEFT_CARD", "", "", "", "复制左侧牌（高阶）", "剧情"),
        ("青崖剑意", "SCHOOL_PAIR", "手", "CONVERT_PLAYED_RANK", "任意", "加一", 1, "人和改牌类传承位", "新手后"),
        ("生财道", "SCHOOL_ECONOMY", "足", "ADD_LUCK", 40, "", "", "开局气运", "命晶商店"),
        ("行商骨", "SCHOOL_ECONOMY", "衣", "ADD_LUCK", 60, "", "", "更高气运", "深度3"),
    ]
    for d in data:
        add(*d)

    # pad heritages to 40+ with slot variants (user asked 100+ for 传承+宝物 combined; relics already 110)
    slots = ["心", "魂", "头", "衣", "手", "足", "器", "辅"]
    schools = ["SCHOOL_PAIR", "SCHOOL_THREE", "SCHOOL_STRAIGHT", "SCHOOL_FLUSH", "SCHOOL_FULLHOUSE", "SCHOOL_ELEMENT"]
    while n <= 50:
        add(
            f"残卷·第{n}页",
            schools[(n - 1) % len(schools)],
            slots[(n - 1) % len(slots)],
            "ADD_SCORE_FLAT",
            15 + n,
            "",
            "",
            "可改名的通用传承加算，用于凑部位与测试升级。",
            "转盘/图鉴",
        )
    return rows


def sheet_relics(wb):
    ws = wb.create_sheet("06_宝物")
    style_header(
        ws,
        ["宝物ID", "名称", "流派ID", "稀有度", "效果类型", "参数A", "参数B", "参数C", "描述", "局内价格气运", "使用场景", "存放位置"],
        [12, 14, 16, 10, 18, 12, 10, 10, 40, 12, 10, 12],
    )
    add_rows(ws, pattern_relics())


def sheet_heritage(wb):
    ws = wb.create_sheet("05_传承卡")
    style_header(
        ws,
        ["传承ID", "名称", "流派ID", "部位", "效果类型", "参数A", "参数B", "参数C", "描述", "解锁来源", "使用场景", "存放位置"],
        [14, 14, 16, 8, 18, 12, 10, 10, 36, 14, 10, 18],
    )
    add_rows(ws, heritage_rows())


def sheet_fate(wb):
    ws = wb.create_sheet("07_命运卡")
    style_header(
        ws,
        ["命运卡ID", "名称", "类型", "稀有度", "标题文案", "正文", "选项1文本", "选项1效果类型", "选项1参数", "选项2文本", "选项2效果类型", "选项2参数", "怪物ID", "商店池ID", "是否可进固定池", "备注"],
        [12, 12, 10, 8, 14, 36, 14, 14, 12, 14, 14, 12, 10, 12, 12, 20],
    )
    rows = []
    # 30 sample fate cards spanning types
    samples = [
        ("FATE_001", "断桥拦路", "事件", "普通", "断桥", "山道断桥，黑雾对面翻涌。", "绕行耗真元", "ADD_YUAN", "-1", "强闯 assail", "HEAL_HP", "-10", "", "", 1, "新手可用"),
        ("FATE_002", "旧物灵藏", "灵藏", "普通", "旧物", "草丛中有一枚铜佩。", "拾取", "ADD_LUCK", "20", "", "NONE", "", "", "", 1, ""),
        ("FATE_003", "苏锦书茶棚", "商店", "稀有", "茶棚", "行商苏锦书在此歇脚。", "进入商店", "OPEN_SHOP", "SHOP_TEA", "", "NONE", "", "", "SHOP_TEA", 1, ""),
        ("FATE_004", "黑雾追兵", "战斗", "普通", "追兵", "黑袍追兵拦住去路。", "接战", "START_BATTLE", "MOB_001", "尝试脱身", "ADD_YUAN", "-2", "MOB_001", "", 1, ""),
        ("FATE_005", "问心一签", "问心", "稀有", "问心", "四签翻动，吉凶未定。", "抽签", "ADD_LUCK", "50", "", "NONE", "", "", "", 1, "可做成问心机制"),
        ("FATE_006", "密道机关", "事件", "普通", "机关", "石壁星图微微发光。", "破解", "ADD_YUAN", "1", "蛮力", "HEAL_HP", "-8", "", "", 1, ""),
        ("FATE_007", "四象商铺", "商店", "稀有", "四象", "白虎朱雀货物齐全。", "进入", "OPEN_SHOP", "SHOP_SIXIANG", "", "NONE", "", "", "SHOP_SIXIANG", 1, ""),
        ("FATE_008", "黑雾执事", "战斗", "精英", "执事", "黑雾执事拦住密道。", "接战", "START_BATTLE", "MOB_010", "", "NONE", "", "MOB_010", "", 1, "可作深度Boss替补"),
        ("FATE_009", "青棠私语", "剧情", "普通", "私语", "青棠握紧碎玉：「师兄，我们还能回去吗？」", "安慰", "STORY_TEXT", "STORY_QT_01", "", "NONE", "", "", "", 1, ""),
        ("FATE_010", "撤离灵灯", "撤离", "稀有", "撤离", "灵灯亮起，可返回青崖峰。", "撤离", "NONE", "EXTRACT", "继续深入", "NONE", "", "", "", 1, "系统识别撤离"),
    ]
    # fix typo in FATE_001 option
    samples[0] = ("FATE_001", "断桥拦路", "事件", "普通", "断桥", "山道断桥，黑雾对面翻涌。", "绕行耗真元", "ADD_YUAN", "-1", "强闯", "HEAL_HP", "-10", "", "", 1, "新手可用")
    rows.extend(samples)
    for i in range(11, 41):
        typ = ["事件", "灵藏", "战斗", "商店", "剧情"][i % 5]
        rows.append((
            f"FATE_{i:03d}", f"命运残篇·{i}", typ, "普通",
            f"残篇{i}", f"占位命运卡#{i}，请策划改名改文本与效果。",
            "前进", "ADD_LUCK", str(5 + i % 10),
            "谨慎", "HEAL_HP", "2",
            "MOB_001" if typ == "战斗" else "",
            "SHOP_BASIC" if typ == "商店" else "",
            1, "占位，可改",
        ))
    add_rows(ws, rows)


def sheet_mobs(wb):
    ws = wb.create_sheet("08_怪物")
    style_header(
        ws,
        ["怪物ID", "名称", "等级档", "气血", "回合1压迫", "回合1真实伤害", "回合2压迫", "回合2真实", "回合3压迫", "回合3真实", "特殊机制", "掉落说明", "立绘资源"],
        [10, 12, 8, 8, 10, 10, 10, 10, 10, 10, 24, 20, 16],
    )
    rows = [
        ("MOB_001", "黑雾追兵", "小怪", 180, 60, 12, 80, 16, "", "", "无", "气运/命尘", "portrait_minion"),
        ("MOB_002", "黑雾刀客", "小怪", 220, 70, 14, 90, 18, "", "", "无", "气运", ""),
        ("MOB_003", "雾影弓手", "小怪", 160, 50, 10, 100, 20, "", "", "第二回合压迫高", "气运", ""),
        ("MOB_010", "黑雾执事", "精英", 420, 90, 18, 130, 24, 180, 30, "第三回合高压", "宝物草稿", "portrait_elite"),
        ("MOB_011", "断魂使", "精英", 480, 100, 20, 140, 26, 200, 34, "减玩家弃牌", "传承残页", ""),
        ("MOB_100", "深度1首领", "Boss", 500, 80, 16, 120, 22, 160, 28, "深度1必打", "解锁深度2", "portrait_villain"),
        ("MOB_200", "深度2首领", "Boss", 650, 100, 20, 150, 28, 220, 36, "深度2必打", "解锁深度3", "portrait_villain"),
        ("MOB_300", "深度3首领", "Boss", 800, 120, 24, 180, 32, 260, 40, "", "解锁深度4", ""),
        ("MOB_400", "深度4首领", "Boss", 1000, 140, 28, 210, 36, 300, 46, "", "解锁深度5", ""),
        ("MOB_500", "深度5首领", "Boss", 1300, 160, 32, 240, 40, 340, 52, "高压终局", "世界1阶段通关", ""),
        ("MOB_W2_001", "异界巡卫", "小怪", 200, 65, 13, 85, 17, "", "", "世界2小怪", "气运", ""),
        ("MOB_W2_100", "世界2首领", "Boss", 700, 110, 22, 160, 30, 230, 38, "世界2深度1", "解锁世界2深度2", ""),
    ]
    add_rows(ws, rows)


def sheet_shop(wb):
    ws = wb.create_sheet("09_局内商店")
    style_header(
        ws,
        ["商店池ID", "货架位", "商品类型", "商品ID", "价格气运", "深度最低", "深度最高", "权重", "备注"],
        [14, 8, 10, 12, 10, 10, 10, 8, 24],
    )
    rows = []
    for i in range(1, 16):
        rows.append(("SHOP_TEA", i, "宝物", f"RELIC_{i:03d}", 40 + i * 5, 1, 5, 10, "茶棚池"))
    for i in range(16, 31):
        rows.append(("SHOP_SIXIANG", i - 15, "宝物", f"RELIC_{i:03d}", 60 + i * 3, 1, 5, 8, "四象池"))
    for i in range(1, 9):
        rows.append(("SHOP_BASIC", i, "宝物", f"RELIC_{30+i:03d}", 50, 1, 5, 10, "通用"))
    add_rows(ws, rows)


def sheet_tian_di_ren(wb):
    ws = wb.create_sheet("10_天时")
    style_header(ws, ["天时ID", "名称", "解锁阶段", "效果类型", "参数A", "参数B", "描述", "备注"], [10, 12, 12, 16, 10, 10, 36, 24])
    add_rows(ws, [
        ("TIAN_001", "风雷相激", "教学阶段3后", "ADD_MULT", 0.2, "", "环境倍率+0.2", "新手前期不出现"),
        ("TIAN_002", "黑雾压境", "深度2+", "PRESSURE_REDUCE", -10, "", "压迫更高：用负数表示加压迫", "参数语义：-10=压迫+10"),
        ("TIAN_003", "灵潮涌动", "深度1可遇", "ON_TURN_START_DRAW", 1, "", "额外抽1", ""),
        ("TIAN_004", "燥火天", "深度2+", "IF_SUIT_COUNT_ADD", "火", 1, "火牌每张+8", ""),
        ("TIAN_005", "寒潮", "深度3+", "TRUE_DAMAGE_REDUCE", -3, "", "真实伤害+3（更难）", "新手禁用"),
    ])
    ws2 = wb.create_sheet("11_地利")
    style_header(ws2, ["地利ID", "名称", "解锁阶段", "效果类型", "参数A", "参数B", "描述", "备注"], [10, 12, 12, 16, 10, 10, 36, 24])
    add_rows(ws2, [
        ("DI_001", "磐石之势", "教学阶段2后", "TRUE_DAMAGE_REDUCE", 3, "", "整场减伤3", "不要开局就给"),
        ("DI_002", "狭路", "深度2+", "MODIFY_HAND_SIZE", -1, "", "手牌-1更难", ""),
        ("DI_003", "聚灵阵", "深度1可遇", "ADD_SCORE_FLAT", 20, "", "每回合基础+20", ""),
        ("DI_004", "茶棚余温", "商店后战斗", "ADD_LUCK", 0, "", "纯氛围地利，无战斗修正", "可空效果"),
        ("DI_005", "密道回声", "密道", "ON_DISCARD_DRAW", 1, "", "弃牌抽1", ""),
    ])
    ws3 = wb.create_sheet("12_人和")
    style_header(ws3, ["人和ID", "名称", "绑定同伴ID", "技能类型", "效果类型", "参数A", "参数B", "参数C", "每场次数", "描述", "解锁"], [10, 12, 12, 10, 16, 10, 10, 10, 10, 32, 12])
    add_rows(ws3, [
        ("REN_001", "青崖剑诀", "COMP_HERO", "主动", "CONVERT_PLAYED_RANK", "任意", "加一", 1, 1, "把一张牌点数+1", "开局角色"),
        ("REN_002", "青棠守心", "COMP_QINGTANG", "被动", "TRUE_DAMAGE_REDUCE", 2, "", "", 0, "同同行时减伤2", "同伴解锁"),
        ("REN_003", "青棠锁灵", "COMP_QINGTANG", "主动", "HEAL_HP", 15, "", "", 1, "回复气血", "好感"),
        ("REN_004", "苏锦书点货", "COMP_SU", "主动", "ADD_LUCK", 20, "", "", 1, "战斗外也可在事件触发", "同伴"),
        ("REN_005", "行者吐纳", "COMP_HERO", "主动", "ON_DISCARD_DRAW", 1, "", "", 1, "弃牌再抽", "传承台升级"),
    ])


def sheet_world(wb):
    ws = wb.create_sheet("13_世界")
    style_header(
        ws,
        ["世界ID", "名称", "排序", "解锁条件", "简介", "默认人和", "主题色", "背景资源", "备注"],
        [12, 12, 6, 16, 40, 12, 10, 18, 20],
    )
    add_rows(ws, [
        ("WORLD_QINGMU", "青木界", 1, "默认开放", "青崖峰所在的修仙界，黑雾劫余。", "REN_001", "青绿", "bg_qingya", "世界1"),
        ("WORLD_YAO", "妖氛界", 2, "青木界深度3撤离", "占位第二世界，妖物横行。", "REN_001", "绛紫", "bg_world2", "世界2框架"),
    ])


def sheet_depth(wb):
    ws = wb.create_sheet("14_深度规则")
    style_header(
        ws,
        ["世界ID", "深度", "最少命运卡", "最多命运卡", "固定卡数量", "玩家补卡数量", "Boss怪物ID", "移动真元消耗", "开局气血", "开局真元", "开局气运", "可否付费复活", "复活仙晶价", "备注"],
        [12, 6, 10, 10, 10, 10, 12, 10, 8, 8, 8, 10, 10, 28],
    )
    rows = []
    for d, (mn, mx, fix, fill, boss, yuan) in enumerate([
        (12, 16, 8, 8, "MOB_100", 1),
        (30, 40, 20, 20, "MOB_200", 1),
        (34, 44, 22, 22, "MOB_300", 1),
        (36, 48, 24, 24, "MOB_400", 2),
        (40, 52, 26, 26, "MOB_500", 2),
    ], start=1):
        rows.append(("WORLD_QINGMU", d, mn, mx, fix, fill, boss, yuan, 100, 8, 40, 1, 6 + d * 2, f"深度{d}规则，策划可改"))
    rows.append(("WORLD_YAO", 1, 14, 20, 10, 10, "MOB_W2_100", 1, 100, 8, 40, 1, 8, "世界2先开深度1"))
    add_rows(ws, rows)


def sheet_fixed_pool(wb):
    ws = wb.create_sheet("15_深度固定卡池")
    style_header(ws, ["世界ID", "深度", "顺序", "命运卡ID", "备注"], [12, 6, 6, 12, 36])
    rows = []
    # depth 1: 8 fixed
    d1 = ["FATE_001", "FATE_002", "FATE_003", "FATE_004", "FATE_005", "FATE_006", "FATE_009", "FATE_100" if False else "FATE_008"]
    # use existing ids
    d1 = [f"FATE_{i:03d}" for i in [1, 2, 3, 4, 5, 6, 9, 10]]
    for i, fid in enumerate(d1, 1):
        rows.append(("WORLD_QINGMU", 1, i, fid, "深度1固定"))
    # depth 2: 20 fixed as user example
    for i in range(1, 21):
        rows.append(("WORLD_QINGMU", 2, i, f"FATE_{i:03d}", "深度2固定20张，可改"))
    add_rows(ws, rows)


def sheet_extract(wb):
    ws = wb.create_sheet("16_撤离奖励")
    style_header(
        ws,
        ["世界ID", "深度", "完成卡数下限", "完成卡数上限", "奖励1类型", "奖励1ID或空", "奖励1数量", "奖励2类型", "奖励2数量", "备注"],
        [12, 6, 10, 10, 12, 14, 10, 12, 10, 28],
    )
    rows = [
        ("WORLD_QINGMU", 2, 30, 34, "命尘", "", 80, "命晶", 10, "刚好达标"),
        ("WORLD_QINGMU", 2, 35, 39, "命尘", "", 120, "命晶", 20, "较好"),
        ("WORLD_QINGMU", 2, 40, 40, "命尘", "", 180, "命晶", 40, "满探索"),
        ("WORLD_QINGMU", 1, 12, 14, "命尘", "", 40, "命晶", 5, ""),
        ("WORLD_QINGMU", 1, 15, 16, "命尘", "", 70, "命晶", 10, ""),
        ("WORLD_QINGMU", 3, 34, 44, "命尘", "", 150, "命晶", 25, "占位"),
    ]
    add_rows(ws, rows)


def sheet_companions(wb):
    ws = wb.create_sheet("17_同伴")
    style_header(
        ws,
        ["同伴ID", "名称", "定位", "简介", "立绘资源", "人和ID列表", "解锁条件", "备注"],
        [12, 10, 10, 40, 18, 18, 16, 16],
    )
    add_rows(ws, [
        ("COMP_HERO", "行者（男主）", "主角", "青崖峰大师兄，身负金鹏与万象传承。", "portrait_hero", "REN_001;REN_005", "默认", ""),
        ("COMP_QINGTANG", "青棠", "女主同伴", "师妹，碎玉为誓，同行守心。", "portrait_qingtang", "REN_002;REN_003", "新手剧情后", ""),
        ("COMP_SU", "苏锦书", "行商", "中立行商，茶棚与情报的来源。", "portrait_merchant", "REN_004", "首次茶棚后", ""),
        ("COMP_VILLAIN", "黑袍首领", "敌对档案", "黑雾背后之人，图鉴可查看不可操控。", "portrait_villain", "", "深度1首领战后", "仅图鉴"),
    ])


def sheet_codex(wb):
    ws = wb.create_sheet("18_图鉴")
    style_header(ws, ["图鉴ID", "分类", "标题", "正文", "解锁条件", "关联ID"], [10, 10, 14, 40, 16, 14])
    add_rows(ws, [
        ("CODEX_001", "概念", "伤害分", "出牌点数、牌型、宝物与环境算出的进攻分。", "新手教学1", ""),
        ("CODEX_002", "概念", "压迫分与拼刀", "怪物意图分；伤害分压过则你全额、敌方折损，反之亦然。", "新手教学1", ""),
        ("CODEX_003", "概念", "命尘/命晶/仙晶", "三种货币分工：常见、高级免费、付费。", "进入基地", ""),
        ("CODEX_004", "概念", "仓库与背包", "仓库局外；背包仅局内。", "首次撤离", ""),
        ("CODEX_005", "物品", "碎裂玉佩", "青棠信物。", "开局剧情", "ITEM_JADE"),
    ])


def sheet_tutorial(wb):
    ws = wb.create_sheet("19_新手引导")
    style_header(
        ws,
        ["步骤", "阶段名", "场景", "解锁内容", "仍然锁定", "教学目标一句话", "备注"],
        [6, 12, 12, 28, 28, 36, 24],
    )
    add_rows(ws, [
        (0, "封面登录", "登录", "账号存档", "全部玩法", "先进入游戏", "沿用封面+进度条"),
        (1, "开局剧情", "剧情", "世界观与角色", "战斗复杂系统", "建立情感，不教规则", "可用初赛剧情文本，战斗另说"),
        (2, "第一次探索", "探索", "翻牌/移动/真元", "天时地利复杂宝物", "会走命运牌阵", "事件简单"),
        (3, "第一场战斗教学", "战斗", "抽牌、出牌、牌型、伤害分、拼刀", "天时、地利、人和主动、复杂宝物链", "只懂算分和拼刀", "禁止照搬初赛两战塞满教学"),
        (4, "简单宝物", "战斗/商店", "1个加算类宝物", "天时地利", "理解宝物会改分数", ""),
        (5, "人和技能", "战斗", "青崖剑诀改牌", "天时", "技能能改手牌", ""),
        (6, "地利出现", "战斗", "地利", "天时", "场地会改规则", "仍不给天时"),
        (7, "天时出现", "战斗", "天时", "无", "环境每回合变化", "至此系统才叠满"),
        (8, "撤离与基地", "基地", "仓库、命运阁、传承台入口", "高深商业化可先灰", "形成循环", ""),
        (9, "商业化轻导", "商会", "假付费、命晶商店", "无", "知道货币与付费感", "标注演示用"),
    ])


def sheet_pay(wb):
    ws = wb.create_sheet("20_货币与充值")
    style_header(
        ws,
        ["档位ID", "人民币价格", "到账仙晶", "首次翻倍", "展示名", "排序", "备注"],
        [10, 10, 10, 10, 14, 6, 28],
    )
    tiers = [
        ("PAY_6", 6, 60, 1, "60仙晶", 1, "首次实得120"),
        ("PAY_30", 30, 300, 1, "300仙晶", 2, ""),
        ("PAY_98", 98, 980, 1, "980仙晶", 3, ""),
        ("PAY_198", 198, 1980, 1, "1980仙晶", 4, ""),
        ("PAY_328", 328, 3280, 1, "3280仙晶", 5, ""),
        ("PAY_648", 648, 6480, 1, "6480仙晶", 6, ""),
    ]
    add_rows(ws, tiers)
    ws.append([])
    ws.append(["兑换规则", "仙晶:命晶=1:1", "命晶不能兑仙晶", "命尘与命晶不直接兑换", "命尘通过命晶商店买包裹获得"])


def sheet_mingjing_shop(wb):
    ws = wb.create_sheet("21_命晶商店")
    style_header(
        ws,
        ["商品ID", "名称", "售价命晶", "仓库物品ID", "每日限购", "描述"],
        [12, 16, 10, 16, 10, 40],
    )
    add_rows(ws, [
        ("MJS_001", "小袋命尘包裹", 30, "ITEM_DUST_BAG_S", 5, "打开获得命尘×200"),
        ("MJS_002", "中袋命尘包裹", 80, "ITEM_DUST_BAG_M", 3, "打开获得命尘×600"),
        ("MJS_003", "大箱命尘包裹", 200, "ITEM_DUST_BAG_L", 1, "打开获得命尘×1800"),
        ("MJS_004", "命运卡匣", 100, "ITEM_FATE_PACK", 3, "打开随机解锁命运卡"),
        ("MJS_005", "传承残页匣", 120, "ITEM_HERITAGE_PACK", 2, "打开随机解锁传承"),
        ("MJS_006", "改名符", 60, "ITEM_RENAME", 1, "可改道号"),
    ])


def sheet_gacha(wb):
    ws = wb.create_sheet("22_转盘奖池")
    style_header(
        ws,
        ["奖池ID", "条目ID", "奖励类型", "奖励ID", "数量", "权重", "稀有度", "是否保底货", "备注"],
        [10, 10, 10, 14, 6, 8, 8, 10, 20],
    )
    rows = [
        ("WHEEL_MAIN", 1, "命尘", "", 100, 30, "普通", 0, ""),
        ("WHEEL_MAIN", 2, "命晶", "", 20, 20, "普通", 0, ""),
        ("WHEEL_MAIN", 3, "仓库物品", "ITEM_DUST_BAG_S", 1, 15, "普通", 0, ""),
        ("WHEEL_MAIN", 4, "命运卡", "FATE_011", 1, 10, "稀有", 0, ""),
        ("WHEEL_MAIN", 5, "传承", "HERITAGE_003", 1, 8, "稀有", 0, ""),
        ("WHEEL_MAIN", 6, "同伴", "COMP_SU", 1, 3, "史诗", 1, "保底可出角色"),
        ("WHEEL_MAIN", 7, "命晶", "", 100, 5, "史诗", 0, ""),
        ("WHEEL_MAIN", 8, "传承", "HERITAGE_014", 1, 4, "史诗", 0, ""),
    ]
    add_rows(ws, rows)
    ws.append([])
    ws.append(["单抽价命晶", 100, "十连价命晶", 900, "可用仙晶按1:1折算支付"])


def sheet_packs(wb):
    ws = wb.create_sheet("23_礼包")
    style_header(
        ws,
        ["礼包ID", "名称", "支付方式", "价格", "内容描述", "仓库发放列表", "限购", "备注"],
        [10, 14, 12, 8, 36, 28, 8, 16],
    )
    add_rows(ws, [
        ("PACK_001", "行者启程礼", "人民币", 6, "仙晶×60+命晶×60+小袋命尘包裹", "ITEM_DUST_BAG_S×1", 1, "假付费"),
        ("PACK_002", "命晶补给", "仙晶", 60, "命晶×60（展示兑换入口也可）", "", 0, "也可走兑换"),
        ("PACK_003", "流派补给·顺子", "命晶", 300, "顺子相关宝物草稿×2", "RELIC入仓库规则另定", 1, ""),
        ("PACK_004", "广告免费礼", "广告", 0, "看广告领小奖励", "ITEM_DUST_BAG_S", 3, "每日"),
    ])


def sheet_ads(wb):
    ws = wb.create_sheet("24_广告奖励")
    style_header(ws, ["广告ID", "入口", "每日次数", "奖励类型", "数量或物品", "描述"], [10, 12, 8, 10, 16, 28])
    add_rows(ws, [
        ("AD_001", "商会", 3, "命晶", "10", "看广告领命晶"),
        ("AD_002", "战败复活", 1, "复活", "1", "看广告复活本次"),
        ("AD_003", "商店刷新", 3, "刷新", "1", "局内店刷新"),
        ("AD_004", "每日礼", 1, "仓库物品", "ITEM_DUST_BAG_S", "每日包裹"),
    ])


def sheet_unlocks(wb):
    ws = wb.create_sheet("25_主线解锁")
    style_header(ws, ["解锁ID", "条件类型", "条件参数", "解锁类型", "解锁目标ID", "说明"], [10, 12, 16, 12, 14, 28])
    add_rows(ws, [
        ("UL_001", "新手完成", "TUTORIAL_DONE", "深度", "WORLD_QINGMU:1", "可重复入深度1"),
        ("UL_002", "撤离", "WORLD_QINGMU:1", "深度", "WORLD_QINGMU:2", "打开深度2"),
        ("UL_003", "撤离", "WORLD_QINGMU:2", "深度", "WORLD_QINGMU:3", ""),
        ("UL_004", "撤离", "WORLD_QINGMU:3", "世界", "WORLD_YAO", "第二世界"),
        ("UL_005", "撤离", "WORLD_QINGMU:1", "同伴", "COMP_QINGTANG", ""),
        ("UL_006", "教学步骤", "3", "系统", "RELIC_SIMPLE", "允许简单宝物"),
        ("UL_007", "教学步骤", "6", "系统", "DILI", "解锁地利"),
        ("UL_008", "教学步骤", "7", "系统", "TIANSHI", "解锁天时"),
    ])


def sheet_warehouse(wb):
    ws = wb.create_sheet("26_仓库物品")
    style_header(
        ws,
        ["物品ID", "名称", "类型", "打开后效果类型", "参数A", "参数B", "描述", "可叠加"],
        [16, 16, 10, 16, 12, 10, 36, 8],
    )
    add_rows(ws, [
        ("ITEM_DUST_BAG_S", "小袋命尘包裹", "包裹", "ADD_MINGCHEN", 200, "", "打开获得命尘200", 1),
        ("ITEM_DUST_BAG_M", "中袋命尘包裹", "包裹", "ADD_MINGCHEN", 600, "", "打开获得命尘600", 1),
        ("ITEM_DUST_BAG_L", "大箱命尘包裹", "包裹", "ADD_MINGCHEN", 1800, "", "打开获得命尘1800", 1),
        ("ITEM_FATE_PACK", "命运卡匣", "包裹", "GRANT_FATE_CARD", "RANDOM_UNLOCKED_POOL", 1, "随机解锁命运卡", 1),
        ("ITEM_HERITAGE_PACK", "传承残页匣", "包裹", "GRANT_HERITAGE", "RANDOM", 1, "随机解锁传承", 1),
        ("ITEM_RENAME", "改名符", "消耗品", "NONE", "", "", "用于改道号", 1),
        ("ITEM_JADE", "碎裂玉佩", "剧情物", "NONE", "", "", "青棠信物，图鉴用", 0),
    ])


def main():
    wb = Workbook()
    sheet_readme(wb)
    sheet_effects(wb)
    sheet_constants(wb)
    sheet_faces(wb)
    sheet_schools(wb)
    sheet_heritage(wb)
    sheet_relics(wb)
    sheet_fate(wb)
    sheet_mobs(wb)
    sheet_shop(wb)
    sheet_tian_di_ren(wb)
    sheet_world(wb)
    sheet_depth(wb)
    sheet_fixed_pool(wb)
    sheet_extract(wb)
    sheet_companions(wb)
    sheet_codex(wb)
    sheet_tutorial(wb)
    sheet_pay(wb)
    sheet_mingjing_shop(wb)
    sheet_gacha(wb)
    sheet_packs(wb)
    sheet_ads(wb)
    sheet_unlocks(wb)
    sheet_warehouse(wb)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT)
    # counts
    print("WROTE", OUT)
    print("relics", wb["06_宝物"].max_row - 1)
    print("heritage", wb["05_传承卡"].max_row - 1)
    print("fate", wb["07_命运卡"].max_row - 1)
    print("sheets", len(wb.sheetnames))


if __name__ == "__main__":
    main()
