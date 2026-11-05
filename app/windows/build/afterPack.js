// 没有 wine 时 electron-builder 无法用 rcedit 改 exe 图标/版本信息，这里用纯 JS 的 resedit 完成
const fs = require('fs'), path = require('path');
exports.default = async ctx => {
  if (ctx.electronPlatformName !== 'win32') return;
  const ResEdit = require('resedit');
  const exe = path.join(ctx.appOutDir, ctx.packager.appInfo.productFilename + '.exe');
  const data = fs.readFileSync(exe);
  const exeObj = ResEdit.NtExecutable.from(data, { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(exeObj);
  const ico = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, 'icon.ico')));
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, 1, 1033, ico.icons.map(i => i.data));
  const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
  const v = ctx.packager.appInfo.version.split('.').map(Number);
  vi.setFileVersion(v[0], v[1], v[2], 0); vi.setProductVersion(v[0], v[1], v[2], 0);
  vi.setStringValues({ lang: 1033, codepage: 1200 }, {
    FileDescription: '宝可梦中文图鉴', ProductName: '宝可梦中文图鉴', CompanyName: 'Pokedex CN fan project',
    OriginalFilename: ctx.packager.appInfo.productFilename + '.exe', InternalName: 'pokedex-cn', LegalCopyright: 'Fan-made, non-commercial. Pokémon © Nintendo / Creatures / GAME FREAK / TPC'
  });
  vi.outputToResourceEntries(res.entries);
  res.outputResource(exeObj);
  fs.writeFileSync(exe, Buffer.from(exeObj.generate()));
  console.log('  • afterPack: icon + version info set on', path.basename(exe));
};
