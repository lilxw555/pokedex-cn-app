#!/usr/bin/env python3
"""生成 download/version.json：版本号与更新说明读自 js/release.js（唯一来源），文件大小 / SHA-256 读自实际的 exe 和 apk。
用法: python3 scripts/make_version.py <download 目录>"""
import hashlib, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'js', 'release.js'), encoding='utf-8').read()
ver = re.search(r"version:'([\d.]+)'", src).group(1); code = int(re.search(r'versionCode:(\d+)', src).group(1))
notes = re.findall(r"^\s*'(.+?)',?$", src.split('notes:[', 1)[1].split(']', 1)[0], re.M)
D = sys.argv[1]
def info(name):
    p = os.path.join(D, name); h = hashlib.sha256(open(p, 'rb').read()).hexdigest()
    return {'url': 'https://pokedex-cn.netlify.app/download/' + name, 'size': os.path.getsize(p), 'sha256': h}
m = {'version': ver, 'versionCode': code, 'notes': notes, 'exe': info('pokedex-cn.exe'), 'apk': info('pokedex-cn.apk')}
json.dump(m, open(os.path.join(D, 'version.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(m, ensure_ascii=False)[:300])
