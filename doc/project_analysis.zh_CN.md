# ODH 项目技术分析与升级方案

## 项目概述

**Online Dictionary Helper (ODH)** 是一个 Chrome/Firefox 浏览器扩展，用于在网页上划词查询在线词典，并支持将查询结果制作成 Anki 卡片。

- **项目来源**: Fork 自 [ninja33/ODH](https://github.com/ninja33/ODH)
- **当前版本**: 0.9.5
- **最后更新**: 约 4 年前
- **主要语言**: JavaScript (84.4%), HTML (11.3%), CSS (4.3%)

## 核心功能特性

### 1. 词典查询功能
- **内置词典**: Collins 英汉词典（离线）
- **在线词典**: 支持多种在线词典脚本
  - 英汉: Cambridge, Oxford, Youdao, Baicizhan, Collins 等
  - 英英: Collins, LDOCE6, UrbanDict 等
  - 其他语言: 法语、西班牙语、德语、俄语、意大利语等
- **词典脚本系统**: 支持用户自定义词典脚本（通过 Sandbox 环境运行）

### 2. Anki 集成
- **AnkiConnect**: 通过 AnkiConnect 插件与 Anki 桌面版通信
- **AnkiWeb**: 支持 AnkiWeb 在线服务
- **制卡功能**: 自动填充单词、音标、释义、例句等字段

### 3. 文本选择与弹窗
- **多种选择方式**: 鼠标拖选、双击、热键触发
- **上下文提取**: 自动提取选中单词所在句子
- **弹窗显示**: 在选中文本附近显示词典释义

### 4. 词形变化处理
- **Deinflector**: 支持英语单词的词形变化还原（如复数、过去式等）

## 技术架构

### 1. 文件结构

```
src/
├── manifest.json          # 扩展清单文件
├── bg/                    # Background (后台脚本)
│   ├── background.html    # 后台页面
│   ├── js/
│   │   ├── backend.js     # 后台主逻辑
│   │   ├── agent.js       # Sandbox 通信代理
│   │   ├── ankiconnect.js # AnkiConnect 接口
│   │   ├── ankiweb.js     # AnkiWeb 接口
│   │   ├── builtin.js     # 内置词典
│   │   ├── deinflector.js # 词形变化处理
│   │   ├── options.js     # 选项页面逻辑
│   │   ├── popup.js       # 弹出窗口逻辑
│   │   └── utils.js       # 工具函数
│   ├── sandbox/           # 沙箱环境（运行字典脚本）
│   │   ├── sandbox.html
│   │   ├── sandbox.js     # 沙箱主逻辑
│   │   ├── api.js         # 沙箱 API 接口
│   │   └── sign.js
│   └── css/               # 样式文件
├── fg/                    # Frontend (内容脚本)
│   ├── js/
│   │   ├── frontend.js    # 前端主逻辑
│   │   ├── popup.js       # 弹窗显示
│   │   ├── frame.js       # 弹窗框架
│   │   ├── range.js       # 文本范围处理
│   │   ├── text.js        # 文本处理
│   │   ├── spell.js       # 拼写检查
│   │   └── api.js         # 前端 API
│   └── css/               # 样式文件
├── dict/                  # 字典脚本目录
│   └── *.js               # 各种字典脚本
└── _locales/              # 国际化文件
```

### 2. 核心模块

#### 2.1 Background Script (后台脚本)
- **文件**: `bg/js/backend.js`
- **类**: `ODHBack`
- **职责**:
  - 管理扩展状态和选项
  - 处理消息传递（与 Content Script 通信）
  - 管理字典脚本加载和执行
  - 处理 Anki 相关操作
  - 管理词形变化和内置词典

#### 2.2 Content Script (内容脚本)
- **文件**: `fg/js/frontend.js`
- **类**: `ODHFront`
- **职责**:
  - 监听鼠标和键盘事件
  - 处理文本选择
  - 显示弹窗
  - 与 Background Script 通信获取词典结果

#### 2.3 Sandbox (沙箱环境)
- **文件**: `bg/sandbox/sandbox.js`
- **类**: `Sandbox`
- **职责**:
  - 安全执行用户自定义字典脚本
  - 提供受限的 API 接口（fetch, deinflect 等）
  - 通过 postMessage 与 Background Script 通信

#### 2.4 字典脚本接口
- **标准格式**: 每个字典脚本必须是一个类，包含 `findTerm(word)` 方法
- **返回**: Promise，解析为词典结果数组
- **示例**: `encn_Youdao.js`, `encn_Cambridge.js` 等

#### 2.5 Options Page (选项页面)
- **文件**: `bg/js/options.js`, `bg/options.html`
- **主要功能**:
  - **通用选项管理**: 启用/禁用扩展、鼠标选择、热键配置、上下文和例句数量设置
  - **Anki 配置**: 
    - 服务选择（AnkiConnect/AnkiWeb/None）
    - AnkiWeb 登录（用户名/密码）
    - 牌组和模板选择
    - 字段映射（expression, reading, definition, sentence 等）
    - 标签和重复卡片设置
  - **词典配置**:
    - 当前使用的词典选择
    - 单语/双语词典模式
    - 音频偏好设置
  - **脚本管理**:
    - 系统脚本列表（内置词典脚本）
    - 用户自定义脚本（UDF Scripts）
    - 脚本启用/禁用和云端加载选项
- **关键函数**:
  - `populateAnkiDeckAndModel()`: 从 Anki 获取牌组和模板列表
  - `populateAnkiFields()`: 根据模板获取字段列表
  - `updateAnkiStatus()`: 检查 Anki 连接状态
  - `populateDictionary()`: 填充可用词典列表
  - `populateSysScriptsList()`: 管理系统脚本列表
  - `onSaveClicked()`: 保存所有配置选项
- **依赖**: jQuery, `odhback()` (后台脚本接口), `optionsLoad()`/`optionsSave()` (存储工具)

### 3. 通信机制

```
Content Script <---> Background Script <---> Sandbox
     (消息)              (消息)              (postMessage)
```

- **Content Script ↔ Background**: `chrome.runtime.sendMessage()`
- **Background ↔ Sandbox**: `window.postMessage()` (通过 iframe)

## 已过期的技术与 API

### 1. Manifest V2 → Manifest V3

**当前状态**: 使用 Manifest V2
```json
{
  "manifest_version": 2,
  "browser_action": {...},
  "background": {
    "page": "bg/background.html"
  }
}
```

**问题**:
- Chrome 计划在 2024 年逐步淘汰 Manifest V2
- Firefox 也正在迁移到 Manifest V3

**需要迁移**:
- `browser_action` → `action`
- `background.page` → `background.service_worker`
- `webRequestBlocking` → 声明性 API (`declarativeNetRequest`)
- `chrome.extension.getURL()` → `chrome.runtime.getURL()` (部分已使用)

### 2. 已废弃的 Chrome API

#### 2.1 `chrome.extension.getURL()`
- **位置**: `src/bg/js/backend.js:39, 43`
- **状态**: 已废弃，应使用 `chrome.runtime.getURL()`
- **影响**: 低（部分代码已使用新 API）

#### 2.2 `chrome.browserAction`
- **位置**: `src/bg/js/backend.js:56, 59`
- **状态**: Manifest V3 中改为 `chrome.action`
- **影响**: 高（需要迁移到 Manifest V3）

#### 2.3 `webRequestBlocking`
- **位置**: `src/manifest.json:38`
- **状态**: Manifest V3 中需要声明性 API
- **影响**: 中（需要检查是否实际使用）

### 3. 安全相关问题

#### 3.1 Sandbox 中使用 `eval()`
- **位置**: `src/bg/sandbox/sandbox.js:39`
- **代码**: `let SCRIPT = eval(\`(${scripttext})\`);`
- **问题**: 使用 `eval()` 执行远程脚本存在安全风险
- **建议**: 考虑使用更安全的脚本加载方式（如动态 import，但需要 Manifest V3）

#### 3.2 远程脚本加载
- **位置**: `src/bg/sandbox/sandbox.js:18`
- **代码**: 从 GitHub 加载脚本
- **问题**: 需要 HTTPS，且可能受 CORS 限制

### 4. 依赖库版本

#### 4.1 jQuery 3.0.0
- **位置**: `src/bg/background.html:4`
- **状态**: 较旧版本（当前最新为 3.7.x）
- **影响**: 低（功能正常，但建议更新）

### 5. 浏览器兼容性

#### 5.1 最低 Chrome 版本
- **当前**: `"minimum_chrome_version": "50.0.0.0"`
- **状态**: 过旧，现代浏览器已不支持
- **建议**: 更新到至少 Chrome 88+ (支持 Manifest V3)

## 技术栈分析

### 1. 前端技术
- **JavaScript**: ES6+ (使用 class, async/await, Promise)
- **HTML5**: 标准 HTML
- **CSS3**: 自定义样式
- **jQuery**: DOM 操作和事件处理

### 2. 浏览器 API
- **Chrome Extension API**: 
  - `chrome.runtime` (消息传递)
  - `chrome.tabs` (标签页管理)
  - `chrome.storage` (数据存储)
  - `chrome.i18n` (国际化)
  - `chrome.commands` (快捷键)
- **Web API**:
  - `DOMParser` (HTML 解析)
  - `fetch` (通过 Sandbox API 代理)
  - `postMessage` (跨上下文通信)

### 3. 外部服务
- **AnkiConnect**: 本地 HTTP 服务 (默认端口 8765)
- **AnkiWeb**: 在线服务 API
- **在线词典**: 各种第三方词典网站

## 升级优先级建议

### 高优先级（必须修复）

1. **迁移到 Manifest V3**
   - 将 `manifest_version` 升级到 3
   - 替换 `browser_action` 为 `action`
   - 将 `background.page` 改为 `service_worker`
   - 处理 `webRequestBlocking` 权限

2. **替换废弃的 Chrome API**
   - 将所有 `chrome.extension.getURL()` 替换为 `chrome.runtime.getURL()`
   - 将 `chrome.browserAction` 替换为 `chrome.action`

3. **Service Worker 迁移**
   - Background Script 需要从持久化页面改为 Service Worker
   - 处理状态持久化（Service Worker 不能保持状态）
   - 处理事件监听器的注册时机

### 中优先级（建议修复）

4. **Sandbox 安全性**
   - 评估 `eval()` 的使用，考虑更安全的替代方案
   - 加强远程脚本加载的安全检查

5. **依赖更新**
   - 更新 jQuery 到最新稳定版本
   - 检查是否有其他依赖需要更新

6. **代码现代化**
   - 使用 ES6+ 模块系统（如果 Manifest V3 支持）
   - 优化异步代码结构

### 低优先级（可选优化）

7. **性能优化**
   - 优化字典查询的并发处理
   - 缓存机制优化

8. **用户体验**
   - 改进错误处理提示
   - 优化弹窗显示效果

## 潜在问题与挑战

### 1. Service Worker 限制
- **问题**: Service Worker 不能保持持久化状态
- **影响**: Background Script 中的状态管理需要重构
- **解决方案**: 使用 `chrome.storage` 持久化状态

### 2. 消息传递变化
- **问题**: Service Worker 与 Content Script 的通信方式略有不同
- **影响**: 需要测试所有消息传递路径
- **解决方案**: 确保所有 `chrome.runtime.sendMessage()` 调用正确处理

### 3. Sandbox 环境
- **问题**: Manifest V3 中 Sandbox 的使用方式可能变化
- **影响**: 字典脚本加载机制可能需要调整
- **解决方案**: 查阅 Manifest V3 文档，确保 Sandbox 配置正确

### 4. 权限模型变化
- **问题**: Manifest V3 的权限模型更严格
- **影响**: 某些功能可能需要用户明确授权
- **解决方案**: 更新权限声明，添加必要的权限请求

## 测试建议

### 1. 功能测试
- [ ] 文本选择功能
- [ ] 词典查询功能（内置和在线）
- [ ] Anki 制卡功能
- [ ] 选项页面配置
- [ ] 字典脚本加载

### 2. 兼容性测试
- [ ] Chrome 最新版本
- [ ] Firefox 最新版本
- [ ] Edge 最新版本（如果支持）

### 3. 安全性测试
- [ ] Sandbox 脚本执行安全性
- [ ] 远程脚本加载安全性
- [ ] 权限使用合理性

## 参考资料

- [Chrome Extension Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Firefox WebExtensions Manifest V3](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/)
- [ODH 原项目](https://github.com/ninja33/ODH)
- [AnkiConnect 文档](https://github.com/FooSoft/anki-connect)

## 总结

ODH 项目整体架构清晰，功能完整，但使用了已过时的 Manifest V2 和部分废弃的 Chrome API。主要升级工作集中在：

1. **核心迁移**: Manifest V2 → V3
2. **API 更新**: 废弃 API → 新 API
3. **架构调整**: Background Page → Service Worker
4. **安全性增强**: Sandbox 脚本执行机制

建议按照优先级逐步进行升级，确保每个阶段都进行充分测试，避免破坏现有功能。
