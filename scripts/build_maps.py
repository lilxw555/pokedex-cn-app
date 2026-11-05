#!/usr/bin/env python3
"""地区示意地图数据：布局见 map_layouts.py（原创示意图），地点中文名与遭遇数据来自 PokeAPI CSV（与图鉴同一套译名逻辑）。
输出 data/maps.js（打开地图时才加载）。用法: python3 scripts/build_maps.py"""
import csv, json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); RAW = os.path.join(ROOT, 'raw')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from places import Places
from map_layouts import R, AREA_OVERRIDE
rd = lambda n: list(csv.DictReader(open(os.path.join(RAW, n + '.csv'), encoding='utf-8')))
D = {n: rd(n) for n in ['locations', 'location_names', 'location_area_prose', 'location_areas']}
PL = Places(RAW, D, '12')
LOC = {r['identifier']: r for r in D['locations']}
loc_en = {r['location_id']: r['name'] for r in D['location_names'] if r['local_language_id'] == '9'}
PRE = {'1': 'kanto-', '2': 'johto-', '3': 'hoenn-', '4': 'sinnoh-', '5': 'unova-', '6': 'kalos-', '7': 'alola-', '8': 'galar-', '10': ''}
def resolve(ident, region):
    for c in (PRE[region] + ident, ident):
        r = LOC.get(c)
        if r and r['region_id'] == region: return r['id']
    return None
vg_of = {r['id']: int(r['version_group_id']) for r in rd('versions')}
pk = json.load(open(os.path.join(ROOT, 'data', 'pokemon.json'), encoding='utf-8'))['pokemon']
species = {}
for p in pk:
    species[p['pid']] = p['id']
    for f in p.get('forms', []):
        if f.get('pid'): species[f['pid']] = p['id']
area_loc = {r['id']: r['location_id'] for r in D['location_areas']}
OV_AREAS = {a for v in AREA_OVERRIDE.values() for a in v}
enc = {}
for r in rd('encounters'):
    aid = r['location_area_id']; lid = area_loc.get(aid); sid = species.get(int(r['pokemon_id']))
    if not lid or not sid: continue
    if aid in OV_AREAS: lid = 'area:' + aid
    e = enc.setdefault(lid, {}).setdefault(sid, [99, 0, set()])
    e[0] = min(e[0], int(r['min_level'])); e[1] = max(e[1], int(r['max_level'])); e[2].add(int(r['version_id']))
out = []; stats = {}
for key, m in R.items():
    vgs = set(m['vgs']); used = set(); n_link = 0; n_all = 0; miss = []
    def entry(ident):
        global_ = None
        lid = resolve(ident, m['region'])
        if not lid: return None
        nm = PL.loc_name(lid); nm = nm[0] if nm else loc_en.get(lid, ident)
        rows = []; src = enc.get(lid, {})
        if (key, ident) in AREA_OVERRIDE:
            src = {}
            for a in AREA_OVERRIDE[(key, ident)]:
                for sid, (lo, hi, vs) in enc.get('area:' + a, {}).items():
                    e = src.setdefault(sid, [99, 0, set()]); e[0] = min(e[0], lo); e[1] = max(e[1], hi); e[2] |= vs
        for sid, (lo, hi, vs) in sorted(src.items()):
            vs = sorted(v for v in vs if vg_of[str(v)] in vgs)
            if vs: rows.append([sid, lo, hi, vs])
        return lid, nm, rows
    nodes, routes, E = [], [], {}
    for ident, (x, y, kind) in m['nodes'].items():
        r = entry(ident)
        if not r: miss.append(ident); continue
        lid, nm, rows = r
        if lid in used or any(n[4] == nm and n[1] == x and n[2] == y for n in nodes): continue
        used.add(lid); nodes.append([ident, x, y, kind, nm]); n_all += 1
        if rows: E[ident] = rows; n_link += 1
    for ident, pts in m['routes']:
        r = entry(ident)
        if not r: miss.append(ident); continue
        lid, nm, rows = r
        P = [list(m['nodes'][p][:2]) if isinstance(p, str) else list(p) for p in pts]
        routes.append([ident, P, nm, 1 if ('sea-route' in ident or '水路' in nm) else 0]); n_all += 1
        if rows: E[ident] = rows; n_link += 1
    vers = sorted({v for rows in E.values() for r in rows for v in r[3]})
    out.append({'k': key, 'name': m['name'], 'h': m['h'], 'games': [[g, vv] for g, vv in m['games']], 'nodes': nodes, 'routes': routes, 'enc': E, 'vers': vers})
    stats[key] = (n_link, n_all, miss)
es = open(os.path.join(ROOT, 'data', 'encounters.js'), encoding='utf-8').read(); EV = json.loads(es[es.index('=') + 1:].rstrip().rstrip(';'))['versions']
used_v = sorted({v for r in out for v in r['vers']})
out = {'regions': out, 'vn': {v: EV[str(v)]['name'] for v in used_v if str(v) in EV}}
txt = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
open(os.path.join(ROOT, 'data', 'maps.js'), 'w', encoding='utf-8').write('window.MAP_DATA=' + txt + ';\n')
for k, (a, b, miss) in stats.items(): print(k, 'linked', a, '/', b, 'unresolved', miss)
print('bytes', len(txt.encode()))
