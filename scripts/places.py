"""出现地点名称本地化：英文地点 → 官方简体中文。
数据来源（按优先级）：
  1. PokeAPI location_names 简体中文（来自《太阳/月亮》官方文本，仅阿罗拉）
  2. PKHeX 地点文本中由官方简体中文版游戏解包的文本：
     Let's Go 皮卡丘/伊布（关都）、太阳/月亮（阿罗拉）、剑/盾（伽勒尔）、晶灿钻石/明亮珍珠（神奥）
  3. PKHeX 其余世代的简体中文地点表（金银、红蓝宝石/火红叶绿、心金魂银、黑白2、X/Y、圆形竞技场/暗之旋风），
     这些游戏本身没有简体中文版，其中文名与神奇宝贝百科/官方后续作品通用译名一致。
文件位于 raw/pkhex/，英文与简体中文按行号一一对应。无法确认的名称保留英文，绝不臆测。"""
import os, re, glob, unicodedata, urllib.request
PK_BASE = 'https://raw.githubusercontent.com/kwsch/PKHeX/master/PKHeX.Core/Resources/text/locations/'
PK_FILES = {  # 前缀: (目录, [分段], 是否为官方中文版游戏文本)
 'gg': ('gen7', ['00000', '40000'], True), 'sm': ('gen7', ['00000', '30000', '40000', '60000'], True),
 'swsh': ('gen8', ['00000', '30000', '40000', '60000'], True), 'bdsp': ('gen8b', ['00000', '30000', '40000', '60000'], True),
 'gsc': ('gen2', ['00000'], False), 'rsefrlg': ('gen3', ['00000'], False), 'cxd': ('gen3', ['00000'], False),
 'hgss': ('gen4', ['00000', '02000', '03000'], False), 'bw2': ('gen5', ['00000', '30000', '40000', '60000'], False),
 'xy': ('gen6', ['00000', '30000', '40000', '60000'], False), 'sv': ('gen9', ['00000'], True)}
# 地区 → 依次查找的来源（官方中文版游戏优先）
REGION_SRC = {'1': ['gg', 'rsefrlg', 'hgss', 'gsc'], '2': ['hgss', 'gsc'], '3': ['rsefrlg', 'xy'], '4': ['bdsp', 'hgss'],
              '5': ['bw2'], '6': ['xy'], '7': ['sm'], '8': ['swsh'], '9': [], '10': ['sv'], '11': ['cxd']}
ALL_SRC = ['gg', 'sm', 'swsh', 'bdsp', 'hgss', 'rsefrlg', 'gsc', 'bw2', 'xy', 'cxd']
# 地区名为官方简体中文译名
REGION_ZH = {'Kanto': '关都', 'Johto': '城都', 'Hoenn': '丰缘', 'Sinnoh': '神奥', 'Unova': '合众', 'Kalos': '卡洛斯', 'Alola': '阿罗拉', 'Galar': '伽勒尔'}
REGION_WORDS = ('Kanto ', 'Johto ', 'Hoenn ', 'Sinnoh ', 'Unova ', 'Kalos ', 'Alola ', 'Galar ')

def norm_en(s):
    s = unicodedata.normalize('NFKC', s).replace('’', "'").replace('‘', "'").replace('é', 'e').strip()
    s = re.sub(r'^Mount ', 'Mt. ', s)
    return re.sub(r'\s+', ' ', s).lower()
def norm_zh(s):
    s = unicodedata.normalize('NFKC', s).strip()  # 全角数字 → 半角：１号道路 → 1号道路
    return s

def load_pkhex(raw):
    d = os.path.join(raw, 'pkhex'); os.makedirs(d, exist_ok=True)
    src = {}
    for pre, (gdir, parts, official) in PK_FILES.items():
        m = {}
        for part in parts:
            files = {}
            for lang in ('en', 'zh-Hans'):
                fn = os.path.join(d, f'text_{pre}_{part}_{lang}.txt')
                if not os.path.exists(fn): urllib.request.urlretrieve(f'{PK_BASE}{gdir}/text_{pre}_{part}_{lang}.txt', fn)
                files[lang] = open(fn, encoding='utf-8-sig').read().split('\n')
            for e0, z0 in zip(files['en'], files['zh-Hans']):
                e0, z0 = e0.strip(), norm_zh(z0)
                if not e0 or not z0 or set(e0) <= set('—-') or z0.startswith(('－', '-')): continue
                es, zs = e0.split(' / '), z0.split(' / ')
                if len(es) != len(zs): es, zs = [e0], [z0]
                for e, z in zip(es, zs):
                    # 去掉版本/地区括注：“Navel Rock (FRLG)”“Phenac City (C)”“101号道路(丰缘)”
                    mm = re.match(r'^(.*?)\s*\((?:FRLG|E|RS|RSE|ORAS|XY|B2W2|BW|DP|Pt|HGSS|C|XD)\)$', e)
                    if mm: e = mm.group(1); z = re.sub(r'\s*[（(][^）)]*[)）]$', '', z)
                    z = re.sub(r'\s*[（(](?:丰缘|关都|城都|神奥|合众|卡洛斯)[)）]$', '', z)
                    if e and z: m.setdefault(norm_en(e), z)
        src[pre] = (m, official)
    return src

class Places:
    def __init__(self, raw, D, ZH='12'):
        self.src = load_pkhex(raw)
        self.loc = {r['id']: r for r in D['locations']}
        self.loc_en = {r['location_id']: r['name'] for r in D['location_names'] if r['local_language_id'] == '9'}
        self.loc_zh = {r['location_id']: norm_zh(r['name']) for r in D['location_names'] if r['local_language_id'] == ZH}
        self.area_en = {r['location_area_id']: r['name'] for r in D['location_area_prose'] if r['local_language_id'] == '9'}
        self.by_ident = {r['identifier']: r['id'] for r in D['locations']}
        self.stats = {}

    def lookup(self, name, region, srcs=None):
        """英文地点名 → (中文, 来源)；找不到返回 None。"""
        cands = [name]
        n = name
        for w in REGION_WORDS:
            if n.startswith(w): n = n[len(w):]; cands.append(n)
        if n.startswith('Sea Route '): cands.append('Route ' + n[10:])  # 水路在游戏文本中写作 Route N（中文为 N号水路）
        if re.match(r'^Road \d+$', n): cands.append('Route ' + n[5:])
        order = srcs or REGION_SRC.get(region) or ALL_SRC
        for c in cands:
            k = norm_en(c)
            for s in order:
                m, off = self.src[s]
                if k in m: return m[k], s
        return None

    def loc_name(self, lid):
        if lid in self.loc_zh: return self.loc_zh[lid], 'pokeapi'
        r = self.loc[lid]['region_id']; en = self.loc_en.get(lid)
        if en:
            hit = self.lookup(en, r)
            if hit: return hit
        return None

    def ident_zh(self, ident, region):
        """位置标识符（如 viridian-city / route-207）→ 中文。"""
        m = re.match(r'^route-(\d+)$', ident)
        if m:
            h = self.lookup('Route ' + m.group(1), region); return h and h[0]
        for cand in (ident, {'1': 'kanto-', '2': 'johto-', '3': 'hoenn-', '4': 'sinnoh-', '5': 'unova-', '6': 'kalos-', '7': 'alola-', '8': 'galar-'}.get(region, '') + ident):
            lid = self.by_ident.get(cand)
            if lid:
                h = self.loc_name(lid)
                if h: return h[0]
        return None

    DIRS = {'north': '北', 'south': '南', 'east': '东', 'west': '西', 'northwest': '西北', 'northeast': '东北', 'southwest': '西南',
            'southeast': '东南', 'north-west': '西北', 'north-east': '东北', 'south-west': '西南', 'south-east': '东南',
            'nw': '西北', 'ne': '东北', 'sw': '西南', 'se': '东南', 'center': '中央', 'middle': '中部'}
    WORDS = {'inside': '内部', 'outside': '外部', 'inner': '内侧', 'outer': '外侧', 'entrance': '入口', 'exit': '出口', 'main': '主区域',
             'underwater': '水下', 'roof': '屋顶', 'lobby': '大厅', 'left': '左侧', 'right': '右侧', 'top': '顶部',
             'pokemon-center': '宝可梦中心', 'gym': '道馆', 'poke-mart': '友好商店', 'high-tide': '涨潮时', 'low-tide': '退潮时'}

    def suffix_zh(self, s, region):
        if not s or s == 'area': return ''
        D, W = self.DIRS, self.WORDS
        def floor(x):
            m = re.match(r'^(b?)(\d+)f$', x) or re.match(r'^(b)f(\d+)$', x)
            return m and ('B' if m.group(1) else '') + m.group(2) + 'F'
        if s in W: return W[s]
        m = re.match(r'^(.+)-oras$', s)  # “north-oras”：仅《欧米伽红宝石/阿尔法蓝宝石》的分区
        if m: return self.suffix_zh(m.group(1), region)
        if s in D: return D[s]
        m = re.match(r'^max-den-([a-z]+)$', s)
        if m: return '极巨巢穴 ' + m.group(1).upper()
        if floor(s): return floor(s)
        m = re.match(r'^(b?\d+f|bf\d)-(b?\d+f)$', s)
        if m and floor(m.group(1)) and floor(m.group(2)): return floor(m.group(1)) + '–' + floor(m.group(2))
        m = re.match(r'^(b?\d+f|bf\d)-([a-z])$', s)
        if m and floor(m.group(1)): return floor(m.group(1)) + ' ' + m.group(2).upper()
        m = re.match(r'^(b?\d+f|bf\d)-(left|right)$', s)
        if m and floor(m.group(1)): return floor(m.group(1)) + W[m.group(2)]
        m = re.match(r'^inside-(b?\d+f|exit)$', s)
        if m: return '内部' + (floor(m.group(1)) or W[m.group(1)])
        m = re.match(r'^area-(\d+)(?:-(north|south|east|west))?$', s)
        if m: return '区域 ' + m.group(1) + ('，' + D[m.group(2)] if m.group(2) else '')
        m = re.match(r'^unknown-area-(\d+)$', s)
        if m: return '未知区域 ' + m.group(1)
        m = re.match(r'^room-(\d+)$', s)
        if m: return '房间 ' + m.group(1)
        m = re.match(r'^([a-z]+(?:-[a-z]+)?)-towards-(.+)$', s)
        if m and m.group(1) in D:
            z = self.ident_zh(m.group(2), region)
            if z: return D[m.group(1)] + '，通往' + z
        m = re.match(r'^([a-z]+(?:-[a-z]+)?)-of-(.+)$', s)
        if m and m.group(1) in D:
            z = self.ident_zh(m.group(2), region)
            if z: return z + ('以' if len(D[m.group(1)]) == 1 else '') + D[m.group(1)] + ('方' if len(D[m.group(1)]) == 2 else '')
        m = re.match(r'^(b?\d+f)-(route-\d+)$', s)
        if m:
            z = self.ident_zh(m.group(2), region)
            if z: return floor(m.group(1)) + '，' + z + '一侧'
        m = re.match(r'^(.+)-entrance$', s)
        if m:
            z = self.ident_zh(m.group(1), region)
            if z: return z + '一侧入口'
        z = self.ident_zh(s, region)
        if z: return z
        return None

    def en_suffix(self, aid, ident, base_en):
        p = re.sub(r'\bRoad (\d+)', r'Route \1', self.area_en.get(aid) or '')
        b = re.sub(r'^Road (\d+)', r'Route \1', base_en or '')
        m = re.search(r'\(([^()]*)\)\s*$', p)
        if m:
            t = m.group(1); pre = p[:m.start()].strip()
            if norm_en(t) == norm_en(b) and pre: t = pre
        else:
            t = None
            for v in {b, b.replace('Mt. ', 'Mount '), re.sub(r'^(Kanto|Johto|Hoenn|Sinnoh|Unova|Kalos|Alola|Galar) ', '', b)}:
                if v and p.lower().startswith(v.lower()) and len(p) > len(v): t = p[len(v):].strip(' ,-–'); break
            if t is None: t = p if p and norm_en(p) not in (norm_en(b), norm_en(base_en or '')) else ident.replace('-', ' ')
        return t[:1].upper() + t[1:] if t else t

    def area_name(self, area):
        """返回 (显示名, 状态)：状态 full=完全中文, base=地点中文但细分区域保留英文, en=英文。"""
        aid, lid, ident = area['id'], area['location_id'], area['identifier'] or ''
        region = self.loc[lid]['region_id']
        base_en = self.loc_en.get(lid) or self.loc[lid]['identifier']
        prose = self.area_en.get(aid)
        # 整个细分区域本身就是游戏中的一个地点名（如“Safari Zone Gate”“Mt. Moon Square”）
        if ident and ident != 'area' and prose and norm_en(prose) != norm_en(base_en) and norm_en(prose) != norm_en(re.sub(r'^Road ', 'Route ', base_en)):
            h = self.lookup(prose, region)
            if h and not re.match(r'^(Route|Road|Sea Route) \d+$', prose): return h[0], 'full', h[1]
        base = self.loc_name(lid)
        suf_en = self.en_suffix(aid, ident, base_en) if ident and ident != 'area' else ''
        if suf_en and norm_en(suf_en) in (norm_en(base_en), norm_en(re.sub(r'^Road ', 'Route ', base_en))): suf_en = ''
        if base:
            zh, srcname = base
            if not suf_en: return zh, 'full', srcname
            sz = self.suffix_zh(ident, region)
            if sz == '': return zh, 'full', srcname
            if sz is not None: return zh + '（' + sz + '）', 'full', srcname
            return zh + '（' + suf_en + '）', 'base', srcname
        m = re.match(r'^Roaming (Kanto|Johto|Hoenn|Sinnoh|Unova|Kalos|Alola|Galar)$', base_en) or re.match(r'^(Kalos) \(Roaming\)$', base_en)
        if m: return REGION_ZH[m.group(1)] + '地区（游走）', 'full', 'region'
        if lid not in self.loc_en: base_en = ' '.join(w.capitalize() for w in base_en.split('-'))
        en = re.sub(r'^Road (\d+)', r'Route \1', base_en)
        return (en + ('（' + suf_en + '）' if suf_en else '')), 'en', None
