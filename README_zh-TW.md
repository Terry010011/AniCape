# AniCape | Minecraft 動態披風製作工具

[English](README.md) | 繁體中文

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-green.svg)](manifest.json)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)]()

AniCape 是一款基於網頁的 Minecraft 動態披風編輯工具，旨在協助玩家為 Wynntils 及 MinecraftCapes 等模組製作高品質專屬披風，減少對外部大型圖像編輯軟體的依賴。

---

## 核心功能

- 圖層式編輯：支援疊加多張圖片與純色圖層來組合您的獨特披風。
- 動態支援：提供對 GIF 檔案與自定義幀序列的處理功能。
- 變換工具：提供縮放、旋轉與翻轉等多種精準圖層操作。
- 區域剪裁：可將圖層映射至披風的特定部位（如正面、背面、側面）。
- 3D 預覽：在匯出階段可於 3D 模型上檢視披風效果。
- 歷程紀錄：支援復原與重做操作，讓您自由嘗試不同設定。
- 針對模組優化：
  - Wynntils：匯出為優化的 PNG 條帶 (Strip)。
  - MinecraftCapes：匯出為帶有時間採樣的優化 GIF。
- 跨平台支援：針對行動裝置觸控操作進行優化，並可作為 PWA 離線使用。
- 多語言切換：提供英文與繁體中文版本。

---

## 技術棧

- 核心：原生 JavaScript (ES6+), HTML5 Canvas
- 樣式：支援深色/淺色模式的現代 CSS3
- 3D 引擎：[skinview3d](https://github.com/bs-community/skinview3d) 用於角色模型預覽
- 程式庫：
  - `UPNG.js`：進階 PNG 編碼與優化
  - `gif.js` & `omggif`：高效能 GIF 生成
  - `pako`：用於檔案壓縮
  - `JSZip`：專案封裝與匯出管理
  - `driver.js`：引導式使用者教學

---

## 專案結構

```text
src/
├── constants.js           # 所有 magic number（歷史紀錄上限、縮放範圍、動畫時間…）
│
├── core/
│   ├── EventBus.js        # 跨模組 pub/sub — 事件目錄在檔案內
│   ├── StateManager.js    # 對 state 物件的驗證式寫入
│   ├── state.js           # 原始應用程式狀態
│   ├── i18n.js            # 翻譯系統
│   ├── utils.js           # 工具函式 + 設定持久化
│   └── locales/           # en.json、zh.json
│
├── layers/
│   └── LayerTransform.js  # getScaleX/Y、getRenderedWidth/Height、applyToContext、containsPoint
│
├── logic/                 # 業務邏輯
│   ├── renderer.js        # Canvas 繪製 + Gizmo UI
│   ├── animation.js       # 幀序列 + 動畫迴圈
│   ├── layers.js          # 圖層 CRUD
│   ├── history.js         # Undo / Redo
│   ├── ui.js              # UI 中央調度器
│   ├── export.js          # 匯出對話框
│   ├── project.js         # 儲存 / 載入 .anicape
│   └── tutorial.js        # driver.js 引導教學
│
├── ui/                    # UI 面板 HTML 渲染
│   ├── layers.js          # 圖層列表
│   ├── properties.js      # 圖層屬性面板
│   └── colors.js          # 區域顏色選擇器
│
├── events/                # DOM 事件連接
│   ├── bootstrap.js       # 應用程式初始化進入點
│   ├── controls.js        # 按鈕 / 輸入監聽器
│   ├── drag.js            # Canvas 拖曳（平移、移動、縮放、旋轉）
│   ├── drop.js            # 檔案拖放
│   ├── keyboard.js        # 鍵盤快捷鍵
│   ├── touch.js           # 觸控事件
│   └── wheel.js           # 滾輪縮放
│
├── export/
│   ├── compositor.js      # 幀合成
│   ├── optimizer.js       # PNG / GIF 壓縮（WASM workers）
│   └── preview3d.js       # skinview3d 3D 預覽
│
├── parsers/
│   ├── GifParser.js       # 原始 GIF 二進位解析器
│   └── SimpleGifHandler.js # 統一動畫圖片載入器
│
├── workers/
│   ├── oxipng.worker.js   # OxiPNG WASM（Web Worker）
│   └── upng.worker.js     # UPNG PNG 編碼（Web Worker）
│
└── partials/              # 動態注入的 HTML 模態視窗

assets/        # 標誌、披風模板、教學 SVG
libs/          # 已打包的第三方程式庫（無 npm）
css/           # style.css
index.html     # 進入點 — 同時定義腳本載入順序
```

> **貢獻者請注意：** `index.html` 中的腳本載入順序遵循嚴格的 Tier 系統。
> 詳見 [CONTRIBUTING.md](CONTRIBUTING.md) 的完整架構說明。

---

## 貢獻

歡迎貢獻！開 PR 前請閱讀 [CONTRIBUTING.md](CONTRIBUTING.md)。
內含 EventBus 架構說明、新增功能的流程，以及 PR 提交清單。

---

## 開始使用

由於 AniCape 為純客戶端應用程式，您可以在不進行任何伺服器設置的情況下在本地運行。

### 線上演示
造訪官方網站：[anicape.wryy.org](https://anicape.wryy.org/)

### 本地開發
1. 複製儲存庫：
   ```bash
   git clone https://github.com/Terry010011/AniCape.git
   ```
2. 在瀏覽器中打開 `index.html`。
3. *建議*：使用本地開發伺服器（如 VS Code Live Server）以確保 Web Workers 和 PWA 服務工作者等功能正常運作。

---

## 授權

本專案採用 MIT 授權。如需詳細資訊，請參閱 [LICENSE](LICENSE) 文件。

---

## 鳴謝

由 Terry010011 開發。同時感謝本專案中使用的所有開源程式庫作者。
