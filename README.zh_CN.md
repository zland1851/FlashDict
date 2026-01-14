# FlashDict

[[English](README.md)]

Chrome浏览器扩展，网页划词查询，一键创建Anki卡片。

## 功能特点

- **划词翻译** - 在任意网页上选中文字即可查看释义
- **多词典支持** - 支持Collins、Cambridge、Oxford等多种词典
- **Anki集成** - 通过AnkiConnect或AnkiWeb创建卡片
- **发音播放** - 收听单词发音

## 快速开始

1. 从Chrome商店或Firefox扩展页安装插件
2. 在网页上选中任意单词（双击或拖选）
3. 弹窗显示单词释义
4. （可选）点击 **(+)** 按钮将单词添加到Anki

对于链接文字，按住 <kbd>Shift</kbd> 键选择，或使用快捷键（默认：<kbd>Shift+Q</kbd>）。

## 配置选项

点击扩展图标 → 选项，进入设置页面。

### 通用选项
| 选项 | 说明 |
|------|------|
| 启用 | 开启/关闭扩展 |
| 快捷键 | 配置选词快捷键（Shift/Ctrl/Alt） |
| 选择词典 | 通过 dict 列表选择词典 |


### Anki集成
配置牌组名称、笔记类型和字段映射：
- 单词（Expression）
- 音标（Reading）
- 释义（Definition）
- 原句（Sentence）
- 来源（URL）

需要安装 [Anki](https://apps.ankiweb.net/) 桌面版和 [AnkiConnect](https://github.com/FooSoft/anki-connect) 插件，或使用AnkiWeb账户。

### 词典选项
- 选择内置词典（Collins英中词典）
- 加载在线词典（Cambridge、Oxford、有道等）
- 添加自定义词典脚本

## 开发

### 环境要求
- Node.js 18+
- npm

### 安装步骤
```bash
git clone https://github.com/zland1851/ODH.git
cd ODH
npm install
npm run build
```

### 在Chrome中加载
1. 打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `dist` 文件夹

### 常用命令
```bash
npm run build          # 构建扩展
npm test               # 运行测试
npm run build:tsc      # 仅类型检查
```

### 项目结构
```
src/
├── bg/                 # 后台/Service Worker（TypeScript）
│   ├── ts/            # TypeScript源码
│   ├── js/            # 旧版JavaScript
│   └── sandbox/       # 词典沙箱
├── fg/                 # 前端（内容脚本）
└── dict/              # 词典脚本
```

详见 [SPEC.md](SPEC.md)（技术规范）和 [CLAUDE.md](CLAUDE.md)（开发指南）。

### 自定义词典脚本

可以创建自定义脚本从任意在线词典抓取释义。详见[开发指南](doc/development.zh_CN.md)。

可用词典脚本列表见 [scriptlist.zh_CN.md](doc/scriptlist.zh_CN.md)。

## 致谢

本项目基于 [ninja33/ODH](https://github.com/ninja33/ODH)，现维护于 [zland1851/FlashDict](https://github.com/zland1851/FlashDict)

## 许可证

GPL-3.0
