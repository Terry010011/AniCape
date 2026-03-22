# Contributing to AniCape

[English](#english) | [繁體中文](#繁體中文)

---

## English

Thank you for your interest in contributing! AniCape is a pure-JS, zero-build-step project — you only need a browser and a text editor to get started.

### Table of Contents
- [Getting Started](#getting-started)
- [Project Architecture](#project-architecture)
- [EventBus — the communication contract](#eventbus--the-communication-contract)
- [Adding a New Feature](#adding-a-new-feature)
- [Code Style](#code-style)
- [Pull Request Checklist](#pull-request-checklist)
- [Reporting Bugs](#reporting-bugs)

---

### Getting Started

```bash
# 1. Fork this repository, then clone your fork
git clone https://github.com/YOUR_USERNAME/AniCape.git
cd AniCape

# 2. Serve locally (any static server works)
npx serve .
# or
python -m http.server 8080
```

Open `http://localhost:8080` in your browser. No build step required.

---

### Project Architecture

```
src/
├── constants.js          ← ALL magic numbers live here — edit this first
│
├── core/
│   ├── EventBus.js       ← Cross-module pub/sub (read this before touching any module)
│   ├── StateManager.js   ← Validated writes to the global `state` object
│   ├── state.js          ← The raw state object (read freely, write via StateManager)
│   ├── i18n.js           ← Translation system
│   └── utils.js          ← Misc helpers + config persistence
│
├── layers/
│   └── LayerTransform.js ← getScaleX/Y, getRenderedWidth/Height, applyToContext, containsPoint
│
├── logic/
│   ├── renderer.js       ← Canvas draw + gizmo UI; registers: render, canvas:*, masks:regenerate
│   ├── animation.js      ← Frame logic; registers: animation:play/stop/rebuildFrames
│   ├── layers.js         ← Layer CRUD; registers: layer:setActive
│   ├── history.js        ← Undo/Redo; registers: history:save
│   ├── ui.js             ← Central UI dispatcher; registers: ui:update
│   ├── export.js         ← Export dialog orchestration
│   └── project.js        ← Save/Load .anicape
│
├── ui/
│   ├── layers.js         ← Layer list HTML
│   ├── properties.js     ← Properties panel HTML; registers: ui:refreshProperties
│   └── colors.js         ← Region colour picker
│
├── events/
│   ├── bootstrap.js      ← App init entry point
│   ├── controls.js       ← Button / input event listeners
│   ├── drag.js           ← Canvas mouse drag (pan, move layer, resize/rotate gizmo)
│   ├── drop.js           ← File drag-and-drop
│   ├── keyboard.js       ← Keyboard shortcuts
│   ├── touch.js          ← Touch events
│   └── wheel.js          ← Mouse wheel zoom
│
├── export/
│   ├── compositor.js     ← Frame compositing
│   ├── optimizer.js      ← PNG / GIF compression workers
│   └── preview3d.js      ← skinview3d integration
│
├── parsers/
│   ├── GifParser.js      ← Raw GIF binary parser
│   └── SimpleGifHandler.js ← Unified animated image loader
│
└── workers/
    ├── oxipng.worker.js  ← OxiPNG WASM compression (Web Worker)
    └── upng.worker.js    ← UPNG PNG encoding (Web Worker)
```

**Script load order** is defined in `index.html`. Tier 0 (CONSTANTS, EventBus) must load before everything else. Do not reorder without checking dependencies.

---

### EventBus — the communication contract

Modules must **never** call functions from other modules by name. Use `EventBus` instead:

```js
// Emitting (any module can do this)
EventBus.emit('render');
EventBus.emit('history:save');
EventBus.emit('layer:setActive', layerId);
EventBus.emit('ui:alert', { key: 'alert_my_key' });

// Registering a handler (at the bottom of each module file)
EventBus.on('my:event', (data) => handleMyEvent(data));
```

**Full event catalogue** is documented in [`src/core/EventBus.js`](src/core/EventBus.js).

When adding a new cross-module interaction:
1. Choose a name following the `namespace:action` pattern
2. Add it to the catalogue comment in `EventBus.js`
3. Register the handler in the responsible module

---

### Adding a New Feature

#### New export format
1. Add constants to `src/constants.js`
2. Create `src/export/myFormat.js` with a named export function
3. Wire it into `src/logic/export.js`
4. Add UI strings to both `src/core/locales/en.json` and `zh.json`
5. Add a `<script>` tag in `index.html` (Tier 3 section)

#### New layer type
1. Extend `createLayer()` in `src/logic/layers.js`
2. Add rendering logic in `src/logic/renderer.js` → `render()`
3. Update `src/ui/properties.js` to show type-specific controls
4. Update `src/logic/project.js` save/load if the type needs serialisation

#### New keyboard shortcut
- Add it in `src/events/keyboard.js` and document it in `src/core/locales/en.json` + `zh.json`

---

### Code Style

- **Vanilla JS only** — no frameworks, no transpilers, no bundlers
- **No external dependencies** beyond the vendored `libs/` directory
- Constants belong in `src/constants.js`, not inline
- Cross-module calls go through `EventBus.emit()`, not direct function references
- State mutations go through `StateManager` methods where possible
- Transform calculations use `LayerTransform` helpers, not inline arithmetic
- JSDoc comments for all public functions with `@param` and `@returns`
- Keep lines under ~120 characters

---

### Pull Request Checklist

Before opening a PR, confirm:

- [ ] Tested in at least Chrome and Firefox
- [ ] Tested on mobile (or Chrome DevTools device emulation)
- [ ] New constants added to `src/constants.js`, not hardcoded
- [ ] New cross-module calls use `EventBus`, not direct function calls
- [ ] New event names added to the catalogue in `src/core/EventBus.js`
- [ ] Both `src/core/locales/en.json` and `zh.json` updated (if UI text changed)
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] No new entries in `libs/` without explicit discussion

---

### Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md).

Please include:
- Browser and OS version
- Steps to reproduce
- Expected vs actual behaviour
- A screenshot or exported `.anicape` project file if relevant

---

---

## 繁體中文

感謝您有興趣為 AniCape 貢獻！AniCape 是純 JS、無需建置步驟的專案 — 只需瀏覽器和文字編輯器即可開始。

### 目錄
- [快速開始](#快速開始)
- [專案架構](#專案架構)
- [EventBus — 模組間通訊合約](#eventbus--模組間通訊合約)
- [新增功能流程](#新增功能流程)
- [程式碼風格](#程式碼風格)
- [Pull Request 清單](#pull-request-清單)
- [回報 Bug](#回報-bug)

---

### 快速開始

```bash
# 1. Fork 後 clone 你的 fork
git clone https://github.com/YOUR_USERNAME/AniCape.git
cd AniCape

# 2. 用任何靜態伺服器啟動
npx serve .
# 或
python -m http.server 8080
```

在瀏覽器開啟 `http://localhost:8080`，無需任何建置步驟。

---

### 專案架構

```
src/
├── constants.js          ← 所有 magic number 集中在此 — 修改數值請從這裡開始
│
├── core/
│   ├── EventBus.js       ← 跨模組 pub/sub（修改任何模組前請先閱讀此檔）
│   ├── StateManager.js   ← 對 state 物件的驗證式寫入
│   ├── state.js          ← 原始 state 物件（可自由讀取，寫入請透過 StateManager）
│   ├── i18n.js           ← 翻譯系統
│   └── utils.js          ← 工具函式 + 設定持久化
│
├── layers/
│   └── LayerTransform.js ← getScaleX/Y、getRenderedWidth/Height、applyToContext、containsPoint
│
├── logic/
│   ├── renderer.js       ← Canvas 繪製 + Gizmo UI；處理：render、canvas:*、masks:regenerate
│   ├── animation.js      ← 幀邏輯；處理：animation:play/stop/rebuildFrames
│   ├── layers.js         ← 圖層 CRUD；處理：layer:setActive
│   ├── history.js        ← Undo/Redo；處理：history:save
│   ├── ui.js             ← UI 中央調度器；處理：ui:update
│   ├── export.js         ← 匯出對話框
│   └── project.js        ← 儲存/載入 .anicape
│
├── ui/
│   ├── layers.js         ← 圖層列表 HTML 渲染
│   ├── properties.js     ← 屬性面板 HTML 渲染；處理：ui:refreshProperties
│   └── colors.js         ← 區域顏色選擇器
│
├── events/
│   ├── bootstrap.js      ← 應用程式初始化進入點
│   ├── controls.js       ← 按鈕 / 輸入事件監聽
│   ├── drag.js           ← Canvas 滑鼠拖曳（平移、移動圖層、縮放/旋轉 Gizmo）
│   ├── drop.js           ← 檔案拖放
│   ├── keyboard.js       ← 鍵盤快捷鍵
│   ├── touch.js          ← 觸控事件
│   └── wheel.js          ← 滾輪縮放
│
└── workers/
    ├── oxipng.worker.js  ← OxiPNG WASM 壓縮（Web Worker）
    └── upng.worker.js    ← UPNG PNG 編碼（Web Worker）
```

**腳本載入順序**定義於 `index.html`。Tier 0（CONSTANTS、EventBus）必須在所有模組之前載入。

---

### EventBus — 模組間通訊合約

模組**絕對不可**直接呼叫其他模組的函式名稱，應使用 `EventBus`：

```js
// 發送事件（任何模組都可以）
EventBus.emit('render');
EventBus.emit('history:save');
EventBus.emit('layer:setActive', layerId);
EventBus.emit('ui:alert', { key: 'alert_my_key' });

// 在模組底部註冊 handler
EventBus.on('my:event', (data) => handleMyEvent(data));
```

完整事件目錄請見 [`src/core/EventBus.js`](src/core/EventBus.js)。

新增跨模組互動時：
1. 依 `namespace:action` 命名規則取名
2. 在 `EventBus.js` 的目錄註解中新增說明
3. 在負責處理的模組中註冊 handler

---

### 新增功能流程

#### 新增匯出格式
1. 在 `src/constants.js` 新增常數
2. 建立 `src/export/myFormat.js`
3. 整合至 `src/logic/export.js`
4. 在 `en.json` 和 `zh.json` 新增 UI 字串
5. 在 `index.html` Tier 3 區段加入 `<script>` 標籤

#### 新增圖層類型
1. 擴充 `src/logic/layers.js` 中的 `createLayer()`
2. 在 `src/logic/renderer.js` 的 `render()` 新增渲染邏輯
3. 更新 `src/ui/properties.js` 顯示對應控制項
4. 若需序列化，更新 `src/logic/project.js`

---

### 程式碼風格

- **純 JS** — 不使用框架、不使用轉譯器、不使用打包工具
- **不新增外部依賴** — 只能使用 `libs/` 目錄中已有的函式庫
- 常數必須放入 `src/constants.js`，不可內嵌
- 跨模組呼叫使用 `EventBus.emit()`，不直接引用函式名稱
- State 寫入盡量透過 `StateManager` 方法
- 幾何計算使用 `LayerTransform` 工具方法
- 公開函式需有 JSDoc 說明（含 `@param` 和 `@returns`）

---

### Pull Request 清單

提交 PR 前請確認：

- [ ] 已在 Chrome 和 Firefox 測試
- [ ] 已測試行動裝置（或 Chrome DevTools 模擬）
- [ ] 新常數已加入 `src/constants.js`，未直接寫死
- [ ] 跨模組呼叫使用 EventBus，未直接呼叫函式名稱
- [ ] 新事件名稱已加入 `src/core/EventBus.js` 目錄
- [ ] 已同步更新 `en.json` 與 `zh.json`（若有 UI 文字異動）
- [ ] 已在 `CHANGELOG.md` 的 `[Unreleased]` 區段記錄變更
- [ ] `libs/` 中沒有新增任何未經討論的函式庫

---

### 回報 Bug

請使用 [Bug 回報範本](.github/ISSUE_TEMPLATE/bug_report.md)。

請包含：
- 瀏覽器與作業系統版本
- 重現步驟
- 預期行為 vs 實際行為
- 相關截圖或 `.anicape` 專案檔
