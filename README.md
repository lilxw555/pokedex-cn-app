# 宝可梦中文图鉴

粉丝制作的非官方、非商业宝可梦中文图鉴：图鉴、招式、属性相克、队伍构建、对战小游戏、九个地区的原创示意地图等。

- 网站：https://pokedex-cn.netlify.app
- 离线版下载（Windows .exe / Android .apk）：[Releases](https://github.com/lilxw555/pokedex-cn-app/releases)（中国大陆访问 GitHub 较慢时，可用网站下载页的备用下载）
- [隐私政策](privacy.html) · [版权与免责声明](copyright.html)

## 目录

- 根目录：网站本体，纯静态 HTML/CSS/JS，无需构建，直接打开 `index.html` 也能用
- `scripts/`：数据与地图生成脚本
- `app/windows/`：Electron 外壳与应用内更新
- `app/android/`：Android WebView 外壳（`build.sh` 需自备签名密钥库，并通过环境变量 `KS_PASS` 提供密码）

## 声明

本项目与 Nintendo、Creatures Inc.、GAME FREAK inc.、The Pokémon Company 无关。Pokémon 及相关名称、形象 © Nintendo / Creatures Inc. / GAME FREAK inc. / The Pokémon Company。数据来自 [PokeAPI](https://pokeapi.co)，图片与叫声来自 [PokeAPI/sprites](https://github.com/PokeAPI/sprites) 与 [PokeAPI/cries](https://github.com/PokeAPI/cries)。

原创代码以 MIT 许可发布（见 [LICENSE](LICENSE)），宝可梦相关内容和第三方素材不在 MIT 许可范围内（见 [NOTICE](NOTICE)）。侵权或问题反馈请提交 [Issues](https://github.com/lilxw555/pokedex-cn-app/issues)。
