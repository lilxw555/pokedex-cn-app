#!/usr/bin/env python3
"""从 PokeAPI 官方 CSV (github.com/PokeAPI/pokeapi/tree/master/data/v2/csv) 生成本地 JSON。
用法: python3 scripts/build_data.py  (CSV 放在 raw/ 目录；缺失时自动下载)"""
import csv, json, os, re, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'raw'); OUT = os.path.join(ROOT, 'data')
BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/'
FILES = ['pokemon','pokemon_species','pokemon_species_names','pokemon_species_flavor_text','pokemon_types',
 'pokemon_stats','types','type_names','type_efficacy','moves','move_names','move_flavor_text',
 'move_damage_classes','move_damage_class_prose','pokemon_abilities','ability_names','pokemon_forms',
 'pokemon_form_names','stat_names','version_groups','pokemon_evolution','evolution_triggers','item_names','location_names','encounters','encounter_slots','location_areas','location_area_prose','locations','version_names','versions','encounter_methods','encounter_condition_values','encounter_condition_value_map','pokemon_dex_numbers','pokedexes','pokedex_version_groups','ability_flavor_text','items','item_flavor_text','item_categories','item_pocket_names','abilities']
ZH = '12'  # zh-hans
os.makedirs(RAW, exist_ok=True); os.makedirs(OUT, exist_ok=True)
def load(n):
    p = os.path.join(RAW, n + '.csv')
    if not os.path.exists(p): urllib.request.urlretrieve(BASE + n + '.csv', p)
    with open(p, encoding='utf-8') as f: return list(csv.DictReader(f))
D = {n: load(n) for n in FILES}
def clean(t): return re.sub(r'\s+', '', t.replace('\u00ad', '')).strip()
def ival(v): return int(v) if v not in ('', None) else None

# 类型
type_zh = {r['type_id']: r['name'] for r in D['type_names'] if r['local_language_id'] == ZH}
types = [{'id': int(r['id']), 'key': r['identifier'], 'name': type_zh[r['id']]} for r in D['types'] if int(r['id']) <= 18]
eff = {}
for r in D['type_efficacy']:
    eff.setdefault(int(r['damage_type_id']), {})[int(r['target_type_id'])] = int(r['damage_factor']) / 100
chart = [[eff[a['id']][d['id']] for d in types] for a in types]
stat_zh = {int(r['stat_id']): r['name'] for r in D['stat_names'] if r['local_language_id'] == ZH}
json.dump({'types': types, 'chart': chart, 'note': 'chart[攻击属性][防御属性]，来自 PokeAPI type_efficacy（当前世代）'},
          open(os.path.join(OUT, 'types.json'), 'w', encoding='utf-8'), ensure_ascii=False)

# 宝可梦
sp_name = {r['pokemon_species_id']: r for r in D['pokemon_species_names'] if r['local_language_id'] == ZH}
vg_order = {}
flav = {}
for r in D['pokemon_species_flavor_text']:
    if r['language_id'] == ZH:
        v = int(r['version_id'])
        if r['species_id'] not in flav or v > flav[r['species_id']][0]: flav[r['species_id']] = (v, clean(r['flavor_text']))
ptypes = {}
for r in D['pokemon_types']: ptypes.setdefault(r['pokemon_id'], []).append((int(r['slot']), int(r['type_id'])))
pstats = {}
for r in D['pokemon_stats']: pstats.setdefault(r['pokemon_id'], {})[int(r['stat_id'])] = int(r['base_stat'])
ab_zh = {r['ability_id']: r['name'] for r in D['ability_names'] if r['local_language_id'] == ZH}
pabil = {}
for r in D['pokemon_abilities']: pabil.setdefault(r['pokemon_id'], []).append((int(r['slot']), ab_zh.get(r['ability_id'], ''), r['is_hidden'] == '1'))
form_of = {}
for r in D['pokemon_forms']:
    if r['is_default'] == '1': form_of[r['pokemon_id']] = r['id']
form_zh = {r['pokemon_form_id']: r for r in D['pokemon_form_names'] if r['local_language_id'] == ZH}
species = {r['id']: r for r in D['pokemon_species']}
def mon(p):
    pid = p['id']
    st = pstats.get(pid, {})
    return {
        'pid': int(pid), 'key': p['identifier'],
        'types': [t for _, t in sorted(ptypes.get(pid, []))],
        'stats': [st.get(i) for i in range(1, 7)],
        'height': int(p['height']) / 10, 'weight': int(p['weight']) / 10,
        'abilities': [{'name': n, 'hidden': h} for _, n, h in sorted(pabil.get(pid, [])) if n],
    }
out, gaps = [], {'species_no_flavor_zh': [], 'forms_no_zh_name': []}
forms_by_species = {}
for p in D['pokemon']:
    forms_by_species.setdefault(p['species_id'], []).append(p)
for sid in sorted(forms_by_species, key=int):
    s = species[sid]; nm = sp_name[sid]
    plist = sorted(forms_by_species[sid], key=lambda p: (p['is_default'] != '1', int(p['id'])))
    base = mon(plist[0])
    e = {'id': int(sid), 'name': nm['name'], 'genus': nm['genus'], 'gen': int(s['generation_id']),
         'legendary': s['is_legendary'] == '1', 'mythical': s['is_mythical'] == '1',
         'flavor': flav.get(sid, (0, ''))[1], **base, 'forms': []}
    if not e['flavor']: gaps['species_no_flavor_zh'].append(int(sid))
    for p in plist[1:]:
        f = mon(p); fr = form_zh.get(form_of.get(p['id'], ''), {})
        f['name'] = fr.get('pokemon_name') or fr.get('form_name') or ''
        if not f['name']:
            gaps['forms_no_zh_name'].append(p['identifier'])
            suffix = p['identifier'][len(s['identifier']) + 1:] if p['identifier'].startswith(s['identifier'] + '-') else p['identifier']
            f['name'] = nm['name'] + '（' + suffix + '）'  # 无官方中文形态名，保留英文标识
        e['forms'].append(f)
    out.append(e)
json.dump({'stat_names': [stat_zh[i] for i in range(1, 7)], 'pokemon': out},
          open(os.path.join(OUT, 'pokemon.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

# 技能
mv_zh = {r['move_id']: r['name'] for r in D['move_names'] if r['local_language_id'] == ZH}
mflav = {}
for r in D['move_flavor_text']:
    if r['language_id'] == ZH and not clean(r['flavor_text']).startswith('无法使用这个招式'):  # 跳过朱紫中"招式已删除"的占位文本
        v = int(r['version_group_id'])
        if r['move_id'] not in mflav or v > mflav[r['move_id']][0]: mflav[r['move_id']] = (v, clean(r['flavor_text']))
dc_zh = {r['move_damage_class_id']: r['name'] for r in D['move_damage_class_prose'] if r['local_language_id'] == ZH}
dc_key = {r['id']: r['identifier'] for r in D['move_damage_classes']}
moves, gaps['moves_no_zh_name'], gaps['moves_no_desc_zh'] = [], [], []
for r in D['moves']:
    if int(r['id']) >= 10000: continue  # 暗影技能（XD）不计入
    name = mv_zh.get(r['id'])
    if not name: gaps['moves_no_zh_name'].append(r['identifier']); name = r['identifier']
    desc = mflav.get(r['id'], (0, ''))[1]
    if not desc: gaps['moves_no_desc_zh'].append(r['identifier'])
    moves.append({'id': int(r['id']), 'key': r['identifier'], 'name': name, 'type': int(r['type_id']),
                  'cat': dc_key[r['damage_class_id']], 'catName': dc_zh[r['damage_class_id']],
                  'power': ival(r['power']), 'acc': ival(r['accuracy']), 'pp': ival(r['pp']),
                  'priority': int(r['priority']), 'gen': int(r['generation_id']), 'desc': desc})
json.dump({'moves': moves}, open(os.path.join(OUT, 'moves.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump(gaps, open(os.path.join(OUT, 'gaps.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('pokemon', len(out), 'forms', sum(len(e['forms']) for e in out), 'moves', len(moves),
      {k: len(v) for k, v in gaps.items()})

# 进化链（条件文字：触发方式为界面翻译，物品/地点/招式/宝可梦名称取自 PokeAPI 中文数据）
item_zh = {r['item_id']: r['name'] for r in D['item_names'] if r['local_language_id'] == ZH}
loc_zh = {r['location_id']: r['name'] for r in D['location_names'] if r['local_language_id'] == ZH}
trig = {r['id']: r['identifier'] for r in D['evolution_triggers']}
TRIG_CN = {'level-up': '升级', 'trade': '通信交换', 'use-item': '使用道具', 'shed': '蜕壳（队伍有空位且有精灵球）', 'spin': '让角色原地旋转',
 'tower-of-darkness': '挑战恶之塔', 'tower-of-waters': '挑战水之塔', 'three-critical-hits': '一场战斗中击中要害 3 次',
 'take-damage': '受到一定伤害后前往特定地点', 'in-battle-level-up': '战斗中升级', 'agile-style-move': '以迅疾之姿使用招式',
 'strong-style-move': '以刚猛之姿使用招式', 'recoil-damage': '累计承受反作用力伤害', 'use-move': '使用特定招式',
 'three-defeated-bisharp': '打倒 3 只带领仆刃的劈斩司令', 'gimmighoul-coins': '收集 999 枚索财灵的硬币', 'meltan-candies': '使用美录坦糖果', 'unclassified': '特殊条件'}
TOD = {'day': '白天', 'night': '夜晚', 'dusk': '黄昏', 'full-moon': '满月', 'midday': '正午'}
REL = {'1': '攻击 > 防御', '-1': '攻击 < 防御', '0': '攻击 = 防御'}
import sys as _s; _s.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from places import Places as _P
_PL = _P(RAW, D, ZH)
def _locname(lid):
    try:
        n = _PL.loc_name(lid); n = n[0] if isinstance(n, tuple) else n
        return n if n and not re.search(r'[A-Za-z]', n) else None
    except Exception: return None
def cond(r):
    t = trig.get(r['evolution_trigger_id'], '')
    parts = []
    if t == 'use-item' and r['trigger_item_id']: parts.append('使用' + item_zh.get(r['trigger_item_id'], '道具'))
    elif t == 'level-up' and r['minimum_level']: parts.append('等级 ' + r['minimum_level'])
    elif t == 'level-up': parts.append('升级')
    else: parts.append(TRIG_CN.get(t, t))
    if r['gender_id']: parts.append({'1': '雌性', '2': '雄性'}.get(r['gender_id'], ''))
    if r['held_item_id']: parts.append('携带' + item_zh.get(r['held_item_id'], '道具'))
    if r['known_move_id']: parts.append('学会「' + mv_zh.get(r['known_move_id'], '?') + '」')
    if r['known_move_type_id']: parts.append('学会' + type_zh.get(r['known_move_type_id'], '') + '属性招式')
    if r['minimum_happiness']: parts.append('亲密度 ≥ ' + r['minimum_happiness'])
    if r['minimum_beauty']: parts.append('美丽度 ≥ ' + r['minimum_beauty'])
    if r['minimum_affection']: parts.append('友好度 ≥ ' + r['minimum_affection'])
    if r['time_of_day']: parts.append(TOD.get(r['time_of_day'], r['time_of_day']))
    if r['location_id']: parts.append('在' + (loc_zh.get(r['location_id']) or _locname(r['location_id']) or '特定地点'))
    if r['relative_physical_stats']: parts.append(REL.get(r['relative_physical_stats'], ''))
    if r['party_species_id']: parts.append('队伍中有' + sp_name[r['party_species_id']]['name'])
    if r['party_type_id']: parts.append('队伍中有' + type_zh.get(r['party_type_id'], '') + '属性宝可梦')
    if r['trade_species_id']: parts.append('与' + sp_name[r['trade_species_id']]['name'] + '交换')
    if r.get('needs_overworld_rain') == '1': parts.append('野外下雨时')
    if r.get('turn_upside_down') == '1': parts.append('将主机倒置')
    if r.get('needs_multiplayer') == '1': parts.append('联机游玩时')
    if r.get('near_special_rock') == '1': parts.append('在特殊岩石附近')
    if r.get('used_move_id'): parts.append('使用「' + mv_zh.get(r['used_move_id'], '?') + '」' + (' ' + r['minimum_move_count'] + ' 次' if r.get('minimum_move_count') else ''))
    if r.get('minimum_steps'): parts.append('同行走 ' + r['minimum_steps'] + ' 步')
    if r.get('minimum_damage_taken'): parts.append('累计受到 ' + r['minimum_damage_taken'] + ' 点伤害')
    if r.get('percentage_chance'): parts.append('概率 ' + r['percentage_chance'] + '%')
    return ' · '.join(x for x in parts if x)
evo_cond = {}
for r in D['pokemon_evolution']:
    c = cond(r); lst = evo_cond.setdefault(r['evolved_species_id'], [])
    if c and c not in lst: lst.append(c)
chains = {}
for e in out:
    s_ = species[str(e['id'])]; e['chain'] = int(s_['evolution_chain_id']) if s_['evolution_chain_id'] else None
    if e['chain']: chains.setdefault(e['chain'], []).append([e['id'], ival(s_['evolves_from_species_id']), ' / '.join(evo_cond.get(str(e['id']), [])[:3])])
json.dump({'chains': chains}, open(os.path.join(OUT, 'evolution.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump({'stat_names': [stat_zh[i] for i in range(1, 7)], 'pokemon': out},
          open(os.path.join(OUT, 'pokemon.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('evolution chains', len(chains))

# ---- 出现地点 & 来源版本 ----
ver_name = {}
for r in D['version_names']:
    if r['local_language_id'] == ZH or (r['local_language_id'] == '9' and r['version_id'] not in ver_name): ver_name[r['version_id']] = r['name']
# PokeAPI 的 zh-hans 版本名有部分是繁体或缺失，这里统一为简体中文
VER_FIX = {'red': '红', 'blue': '蓝', 'silver': '银', 'ruby': '红宝石', 'sapphire': '蓝宝石', 'emerald': '绿宝石', 'firered': '火红',
           'leafgreen': '叶绿', 'soulsilver': '魂银', 'colosseum': '圆形竞技场', 'xd': '暗之旋风XD', 'red-japan': '红', 'green-japan': '绿',
           'blue-japan': '蓝', 'the-indigo-disk-scarlet': '朱: 蓝之圆盘', 'the-indigo-disk-violet': '紫: 蓝之圆盘', 'champions': 'Champions'}
versions = {r['id']: {'name': VER_FIX.get(r['identifier']) or ver_name.get(r['id'], r['identifier']) + '', 'vg': int(r['version_group_id'])} for r in D['versions']}
for r in D['versions']:
    if r['identifier'].endswith('-japan'): versions[r['id']]['name'] += '（日版）'
vgs = {r['id']: {'gen': int(r['generation_id']), 'order': int(r['order']),
       'name': '/'.join(v['name'] for vid, v in sorted(versions.items(), key=lambda x: int(x[0])) if str(v['vg']) == r['id']) or r['identifier']}
       for r in D['version_groups']}
loc_en = {r['location_id']: r['name'] for r in D['location_names'] if r['local_language_id'] == '9'}
loc_ident = {r['id']: r['identifier'] for r in D['locations']}
area_en = {r['location_area_id']: r['name'] for r in D['location_area_prose'] if r['local_language_id'] == '9'}
import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from places import Places
PL = Places(RAW, D, ZH)
area_name, area_state, area_old = {}, {}, {}
for r in D['location_areas']:
    lid = r['location_id']; base = loc_zh.get(lid); sub = r['identifier'] or ''
    # 旧逻辑（仅 PokeAPI 中文名，细分区域直接拼英文标识符），用于对比覆盖率
    area_old[r['id']] = ('full' if not sub or sub == 'area' else 'base') if base else 'en'
    area_name[r['id']], area_state[r['id']], _ = PL.area_name(r)
METHOD_CN = {'walk': '草丛/行走', 'old-rod': '破旧钓竿', 'good-rod': '好钓竿', 'super-rod': '厉害钓竿', 'surf': '冲浪', 'rock-smash': '碎岩',
 'headbutt': '头锤树木', 'dark-grass': '深色草丛', 'grass-spots': '晃动的草丛', 'cave-spots': '洞窟扬尘', 'bridge-spots': '桥上影子',
 'super-rod-spots': '水面波纹（钓鱼）', 'surf-spots': '水面波纹（冲浪）', 'yellow-flowers': '黄色花丛', 'purple-flowers': '紫色花丛', 'red-flowers': '红色花丛',
 'rough-terrain': '崎岖地形', 'gift': '赠送', 'gift-egg': '赠送的蛋', 'static': '固定出现', 'pokeflute': '宝可梦之笛唤醒', 'headbutt-low': '头锤树木（低）',
 'headbutt-normal': '头锤树木（中）', 'headbutt-high': '头锤树木（高）', 'squirt-bottle': '使用喷水壶', 'wailmer-pail': '使用吼吼鲸喷壶', 'seaweed': '海草（潜水）',
 'roaming-grass': '游走（草丛）', 'roaming-water': '游走（水面）', 'devon-scope': '得文侦测镜', 'feebas-tile-fishing': '特定水域钓鱼', 'island-scan': '岛屿搜索',
 'sos': '求援对战', 'bubbling-spots': '冒泡的水面', 'berry-trees': '树果树', 'npc-trade': '与 NPC 交换', 'sos-from-bubbling-spot': '冒泡水面求援',
 'overworld': '野外现身', 'overworld-water': '野外现身（水面）', 'overworld-flying': '野外现身（空中）', 'overworld-special': '野外现身（特殊）',
 'overworld-flying-special': '野外现身（空中·特殊）', 'overworld-water-special': '野外现身（水面·特殊）', 'horde': '群体对战', 'hidden-grotto': '隐藏洞穴',
 'honey-tree': '甜甜蜜树', 'overworld-dirt': '野外现身（地面）', 'wanderer': '游荡', 'wanderer-water': '游荡（水面）', 'chase-water': '水面追逐',
 'dynamax-adventure': '极巨大冒险', 'max-raid': '极巨团体战', 'trash-can-ambush': '垃圾桶伏击', 'rustling-bush-ambush': '晃动草丛伏击',
 'ceiling-ambush': '天花板伏击', 'ground-ambush': '地面伏击', 'sky-ambush': '空中伏击', 'snag': '夺取', 'snag-rematch': '夺取（再战）', 'pokespot': '宝可点'}
method = {r['id']: METHOD_CN.get(r['identifier'], r['identifier']) for r in D['encounter_methods']}
COND_CN = {'swarm-yes': '大量出现时', 'time-morning': '早晨', 'time-day': '白天', 'time-night': '夜晚', 'radar-on': '使用宝可追踪', 'season-spring': '春季',
 'season-summer': '夏季', 'season-autumn': '秋季', 'season-winter': '冬季', 'weather-normal': '晴朗', 'weather-overcast': '阴天', 'weather-raining': '下雨',
 'weather-thunderstorm': '雷雨', 'weather-snowing': '下雪', 'weather-snowstorm': '暴风雪', 'weather-sandstorm': '沙暴', 'weather-intense-sun': '大晴天', 'weather-fog': '起雾',
 'weekday-sunday': '星期日', 'weekday-monday': '星期一', 'weekday-tuesday': '星期二', 'weekday-wednesday': '星期三', 'weekday-thursday': '星期四',
 'weekday-friday': '星期五', 'weekday-saturday': '星期六', 'radio-hoenn': '收音机播放丰缘之声', 'radio-sinnoh': '收音机播放神奥之声', 'bug-catching-contest-yes': '捕虫大会期间'}
SKIP_COND = {'swarm-no', 'radar-off', 'slot2-none', 'radio-off', 'other-none', 'item-none', 'story-progress-none', 'bug-catching-contest-no'}
cval = {r['id']: r['identifier'] for r in D['encounter_condition_values']}
sp_by_ident = {species[k]['identifier']: v['name'] for k, v in sp_name.items() if k in species}
def cond_cn(c):
    if c in COND_CN: return COND_CN[c]
    m = re.match(r'coins-(\d+)$', c)
    if m: return '需 ' + m.group(1) + ' 枚代币'
    m = re.match(r'max-den-rating-(\d)-star$', c)
    if m: return m.group(1) + ' 星极巨巢穴'
    if c.startswith('max-den-rarity-'): return '极巨巢穴·' + {'common': '常见', 'rare': '稀有', 'special': '特殊'}.get(c[15:], c[15:])
    m = re.match(r'friend-safari-slot-(\d)$', c)
    if m: return '朋友狩猎区第 ' + m.group(1) + ' 栏'
    m = re.match(r'starter-(.+)$', c)
    if m and m.group(1) in sp_by_ident: return '御三家选择' + sp_by_ident[m.group(1)]
    m = re.match(r'trade-(.+)$', c)
    if m and m.group(1) in sp_by_ident: return '交换' + sp_by_ident[m.group(1)]
    m = re.match(r'alolan-diglett-found-(\d+)$', c)
    if m: return '找到 ' + m.group(1) + ' 只阿罗拉地鼠后'
    if c.startswith('headbutt-tree-'): return '头锤树·' + {'common': '普通', 'rare': '稀有', 'secret': '隐藏'}.get(c[14:], c[14:])
    if c.startswith('honey-tree-group-'): return '甜甜蜜树 ' + c[-1].upper() + ' 组'
    if c.startswith('slot2-'):
        vn = next((v['name'] for v in versions.values() if False), None)
        return 'GBA 卡槽插入' + {'ruby': '红宝石', 'sapphire': '蓝宝石', 'emerald': '绿宝石', 'firered': '火红', 'leafgreen': '叶绿'}.get(c[6:], c[6:])
    if c.startswith('johto-safari-blocks-'): return '城都狩猎区地形布置' + ('（未布置）' if c.endswith('inactive') else '')
    if c.startswith('great-marsh-daily-slot'): return '大湿地每日变化'
    if c == 'story-progress-national-dex': return '获得全国图鉴后'
    if c == 'story-progress-hall-of-fame': return '进入殿堂后'
    if c in ('story-progress-before-hall-of-fame', 'story-progress-before-national-dex'): return {'story-progress-before-hall-of-fame': '进入殿堂前', 'story-progress-before-national-dex': '获得全国图鉴前'}[c]
    return c
econd = {}
for r in D['encounter_condition_value_map']: econd.setdefault(r['encounter_id'], []).append(cval[r['encounter_condition_value_id']])
slots = {r['id']: r for r in D['encounter_slots']}
default_pid = {e['pid']: e['id'] for e in out}
agg = {}
for r in D['encounters']:
    sid = default_pid.get(int(r['pokemon_id']))
    if not sid: continue
    sl = slots[r['encounter_slot_id']]
    conds = tuple(sorted(c for c in econd.get(r['id'], []) if c not in SKIP_COND))
    k = (sid, int(r['version_id']), r['location_area_id'], sl['encounter_method_id'], conds)
    a = agg.setdefault(k, [999, 0, 0])
    a[0] = min(a[0], int(r['min_level'])); a[1] = max(a[1], int(r['max_level'])); a[2] += int(sl['rarity'] or 0)
strings, sidx = [], {}
def S(x):
    if x not in sidx: sidx[x] = len(strings); strings.append(x)
    return sidx[x]
merged = {}
for (sid, vid, aid, mid, conds), (lo, hi, rar) in agg.items():
    m = merged.setdefault((sid, vid, aid, mid, lo, hi, min(rar, 100)), [])
    ctext = '、'.join(cond_cn(c) for c in conds)
    if ctext and ctext not in m: m.append(ctext)
# 跨版本合并：同一地点 / 方式 / 等级 / 出现率 / 条件 → 一行，附版本标签
vorder = lambda v: (vgs[str(versions[str(v)]['vg'])]['order'], v)
rows = {}
for (sid, vid, aid, mid, lo, hi, rar), cl in merged.items():
    k = (sid, area_name[aid], method[mid], lo, hi, rar, ' / '.join(cl))
    rows.setdefault(k, set()).add(vid)
enc = {}
for (sid, an, mn, lo, hi, rar, ct), vs in sorted(rows.items(), key=lambda x: (x[0][0], min(vorder(v) for v in x[1]), x[0][1], -x[0][5])):
    enc.setdefault(sid, []).append([sorted(vs, key=vorder), S(an), S(mn), lo, hi, rar, S(ct) if ct else -1])
# 地点名称翻译覆盖率（翻译前 = 旧版仅用 PokeAPI 中文名）
used_areas = {r['location_area_id'] for r in D['encounters']}
def cov_of(st):
    c = {'full': 0, 'base': 0, 'en': 0}
    for a in used_areas: c[st[a]] += 1
    return c
rows_by_area = {}
for (sid, vid, aid, mid, lo, hi, rar) in merged: rows_by_area[aid] = rows_by_area.get(aid, 0) + 1
def cov_rows(st):
    c = {'full': 0, 'base': 0, 'en': 0}
    for a, n in rows_by_area.items(): c[st[a]] += n
    return c
place_cov = {'areas_used': len(used_areas), 'before_areas': cov_of(area_old), 'after_areas': cov_of(area_state),
             'version_rows': sum(rows_by_area.values()), 'before_rows': cov_rows(area_old), 'after_rows': cov_rows(area_state),
             'merged_rows': sum(len(v) for v in enc.values()),
             'untranslated_examples': sorted({area_name[a] for a in used_areas if area_state[a] == 'en'})}
# 来源版本 + 图鉴收录
intro = {}
for r in D['pokemon_forms']:
    if r['is_default'] == '1' and int(r['pokemon_id']) in default_pid: intro[default_pid[int(r['pokemon_id'])]] = int(r['introduced_in_version_group_id'] or 0)
dex_vg = {}
for r in D['pokedex_version_groups']: dex_vg.setdefault(r['pokedex_id'], []).append(int(r['version_group_id']))
main_dex = {r['id'] for r in D['pokedexes'] if r['is_main_series'] == '1' and r['identifier'] != 'national'}
in_dex = {}
for r in D['pokemon_dex_numbers']:
    if r['pokedex_id'] in main_dex:
        in_dex.setdefault(int(r['species_id']), set()).update(dex_vg.get(r['pokedex_id'], []))
origin = {e['id']: [intro.get(e['id'], 0), sorted(in_dex.get(e['id'], []), key=lambda v: vgs[str(v)]['order'])] for e in out}
json.dump({'versions': {k: v for k, v in versions.items()}, 'vgs': vgs, 'strings': strings, 'enc': enc, 'origin': origin},
          open(os.path.join(OUT, 'encounters.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
# 覆盖率统计
cov = {'species_with_encounters': len(enc), 'species_total': len(out), 'by_gen': {}, 'versions_with_data': sorted({versions[str(vv)]['name'] for v in enc.values() for x in v for vv in x[0]}),
       'areas_total': len(area_name), 'place_names': place_cov}
for e in out:
    g = cov['by_gen'].setdefault(e['gen'], [0, 0]); g[1] += 1; g[0] += e['id'] in enc
vers_cnt = {}
for v in enc.values():
    for x in {vv for y in v for vv in y[0]}: vers_cnt[versions[str(x)]['name']] = vers_cnt.get(versions[str(x)]['name'], 0) + 1
cov['species_per_version'] = vers_cnt
json.dump(cov, open(os.path.join(OUT, 'encounter_coverage.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('encounters: species', len(enc), 'version rows', place_cov['version_rows'], '-> merged rows', place_cov['merged_rows'])
print('place names before', place_cov['before_areas'], place_cov['before_rows'])
print('place names after ', place_cov['after_areas'], place_cov['after_rows'])

# 同时输出 .js 版本，方便直接双击 HTML（file://）打开时也能离线使用
for n, var in (('types', 'TYPES_DATA'), ('pokemon', 'POKEMON_DATA'), ('moves', 'MOVES_DATA'), ('evolution', 'EVO_DATA'), ('encounters', 'ENC_DATA')):
    with open(os.path.join(OUT, n + '.json'), encoding='utf-8') as f: txt = f.read()
    with open(os.path.join(OUT, n + '.js'), 'w', encoding='utf-8') as f: f.write('window.' + var + '=' + txt + ';\n')

# ===== 特性 / 道具图鉴（按需加载）=====
def latest_zh(rows, key):
    best = {}
    for r in rows:
        if r['language_id'] != ZH: continue
        o = vgs.get(r['version_group_id'], {}).get('order', int(r['version_group_id']))
        if r[key] not in best or o >= best[r[key]][0]: best[r[key]] = (o, r['flavor_text'].replace('\n', '').replace('\u3000', '').replace('\x0c', '').strip())
    return {k: v[1] for k, v in best.items()}
ab_desc = latest_zh(D['ability_flavor_text'], 'ability_id')
pk_sp = {r['id']: (int(r['species_id']), r['is_default'] == '1') for r in D['pokemon']}
ab_mons = {}
for r in D['pokemon_abilities']:
    sp, d = pk_sp.get(r['pokemon_id'], (0, False))
    if d and sp in default_pid.values():
        l = ab_mons.setdefault(r['ability_id'], [])
        if not any(x[0] == sp for x in l): l.append([sp, 1 if r['is_hidden'] == '1' else 0])
abil = [{'id': int(r['id']), 'name': ab_zh[r['id']], 'en': r['identifier'], 'gen': int(r['generation_id']), 'desc': ab_desc.get(r['id'], ''), 'mons': sorted(ab_mons.get(r['id'], []))}
        for r in D['abilities'] if r['is_main_series'] == '1' and r['id'] in ab_zh]
it_desc = latest_zh(D['item_flavor_text'], 'item_id')
pocket = {r['item_pocket_id']: r['name'] for r in D['item_pocket_names'] if r['local_language_id'] == ZH}
cat_pk = {r['id']: r['pocket_id'] for r in D['item_categories']}
items = [{'id': int(r['id']), 'name': item_zh[r['id']], 'en': r['identifier'], 'pk': pocket.get(cat_pk.get(r['category_id']), '其他'), 'cost': int(r['cost'] or 0), 'desc': it_desc[r['id']]}
         for r in D['items'] if r['id'] in item_zh and r['id'] in it_desc]
for n, var, obj in (('abilities', 'ABIL_DATA', abil), ('items', 'ITEM_DATA', items)):
    txt = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(OUT, n + '.json'), 'w', encoding='utf-8').write(txt)
    open(os.path.join(OUT, n + '.js'), 'w', encoding='utf-8').write('window.' + var + '=' + txt + ';\n')
print('abilities', len(abil), 'items', len(items))
