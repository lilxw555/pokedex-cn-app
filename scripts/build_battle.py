#!/usr/bin/env python3
"""对战小游戏数据：每只宝可梦（含形态）在“最近一个有数据的版本组”里能学的招式 + 招式附加效果（异常状态 / 吸血 / 回复 / 连续攻击等）。
输出 data/battle.js（按需加载）。用法: python3 scripts/build_battle.py"""
import csv, json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); RAW = os.path.join(ROOT, 'raw')
rd = lambda n: list(csv.DictReader(open(os.path.join(RAW, n + '.csv'), encoding='utf-8')))
order = {r['id']: int(r['order']) for r in rd('version_groups')}
pk = json.load(open(os.path.join(ROOT, 'data', 'pokemon.json'), encoding='utf-8'))['pokemon']
pids = set()
for p in pk:
    pids.add(p['pid']); [pids.add(f['pid']) for f in p.get('forms', []) if f.get('pid')]
moves = {m['id'] for m in json.load(open(os.path.join(ROOT, 'data', 'moves.json'), encoding='utf-8'))['moves']}
by = {}
for r in rd('pokemon_moves'):
    pid = int(r['pokemon_id'])
    if pid in pids and int(r['move_id']) in moves: by.setdefault(pid, {}).setdefault(r['version_group_id'], set()).add(int(r['move_id']))
ls = {}
for pid, vg in by.items():
    best = max(vg, key=lambda v: (order.get(v, 0) >= 0 and len(vg[v]) >= 8, order.get(v, 0)))
    ls[pid] = sorted(vg[best])
meta = {}
for r in rd('move_meta'):
    mid = int(r['move_id'])
    if mid not in moves: continue
    a = int(r['meta_ailment_id'] or 0); v = [a if a in (1, 2, 4, 5) else 0, int(r['ailment_chance'] or 0), int(r['min_hits'] or 0), int(r['max_hits'] or 0),
         int(r['drain'] or 0), int(r['healing'] or 0), int(r['crit_rate'] or 0), int(r['flinch_chance'] or 0), int(r['meta_category_id'] or 0)]
    if any(v): meta[mid] = v
txt = json.dumps({'ls': ls, 'meta': meta}, separators=(',', ':'))
open(os.path.join(ROOT, 'data', 'battle.js'), 'w').write('window.BATTLE_DATA=' + txt + ';\n')
print('learnsets', len(ls), 'of', len(pids), 'meta', len(meta), 'bytes', len(txt))
