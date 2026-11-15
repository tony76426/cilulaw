# 慈律官網資源優化（2026-11-16）

以 main 的 e95f590 為基準。保留原始圖片、所有文字、版型、字型、SEO/JSON-LD、GTM/GA4 事件與 CTA；沒有重新生成或修飾人物。既有舊網址仍存在。

## 已完成

- 7 位團隊人像新增 160、320、640、最高 960px WebP；不放大低解析原圖，不裁切。團隊導覽縮圖、桌面人像與手機大圖各設定符合版面的 sizes。
- 法律服務、聯絡、預約與關於我們共 16 種圖示產生 120/240px 透明 WebP；保留圖示本身外觀。
- 全站 Logo 共用 256/512px WebP，辦公室及團隊工作照產生 480/最高 960px 版本；保留原始 Logo 作社群/高解析使用。
- 首頁 4 張輪播新增 960/1600px WebP；首張以相同 media 條件的 CSS 與 preload 優先載入。其他圖片分批準備，維持原本 4 秒淡入淡出；若網路慢或圖片失敗，保留已顯示圖片，避免空白。
- 非首屏照片/圖示延遲載入與非同步解碼；首屏 Logo、團隊導覽與第一位人物維持正常載入。
- 圖片採內容雜湊檔名；共用 CSS/JS 加入內容版本。不同頁面重用同一資源 URL。
- 未刪除任何原始或重複圖片。未改動 CSS 視覺規則、字型字重與 GTM 程式內容；現有 gtm-events.js 已使用 defer。內嵌樣式與行為牽涉近期設計，沒有為少量位元組改寫或合併。

## 檔案大小實測（非瀏覽器傳輸量）

| 資源組 | 原始不同檔案合計 | 優化後最大版本合計 | 減少 |
|---|---:|---:|---:|
| 7 位人物照片 | 7,688,370 B | 464,126 B | 94.0% |
| 6 類服務圖示 | 2,374,021 B | 62,224 B | 97.4% |
| 4 張首頁輪播 | 1,534,111 B | 437,392 B | 71.5% |

實際下載量依 viewport、DPR、瀏覽器 srcset 選擇、捲動、停留時間與快取而不同。縮圖在一般螢幕會使用更小版本。保留來源會增加儲存庫總大小，以上改善是訪客使用的資源大小，不是儲存庫縮減比例。

## 已完成驗證

- 全站 HTML 的本地 img/srcset、CSS/JS link 引用均存在，所有生成圖可解碼、尺寸/雜湊正確、透明素材仍有透明通道。
- 對照基準，所有可見文字、標題/metadata、表單、按鈕、連結與 JSON-LD 不變。
- 原圖與 WebP 並排人工檢視部分人像與辦公室照片，未發現明顯外觀差異。
- 所有內嵌 JavaScript 語法檢查通過；輪播測試覆蓋慢速、失敗、重試、分批載入、隱藏頁籤與響應式來源切換。
- 執行環境無法啟動 Chromium（系統拒絕 socket），未完成真實瀏覽器的手機/桌機截圖、Lighthouse、LCP、重訪傳輸量與實際點擊事件驗證；不得把檔案大小改善視為這些指標已通過。

## 快取與 Render 待辦

讀取正式站 HTML、圖片與 design-refinement.css 回應，皆為 `Cache-Control: public, max-age=0, s-maxage=300`，且有 ETag/CDN HIT。現況有 CDN 快取與重新驗證，但沒有長期瀏覽器快取。

此次未修改 Render 設定：Render 連線沒有選定 workspace，無法核實服務/部署或設定自訂標頭。沒有以 `_headers` 假裝已套用 Render 規則，也沒有加入會建立另一個服務的 Blueprint。

後續可於已確認的 cilulaw Static Site 設定 `/images/optimized/*` 為 `Cache-Control: public, max-age=31536000, immutable`；僅對內容雜湊路徑使用此設定。CSS/JS 仍有未帶版本的舊引用可能，適合先採 `public, max-age=3600`，以 query 版本管理更新。HTML 保留原本重新驗證政策。

部署完成後需同條件量測首頁、團隊、服務及預約的首次/重訪傳輸量、Lighthouse/LCP、CTA/追蹤及三種裝置版面，並觀察 7–14 日 Render 頻寬；區分流量、爬蟲及廣告變動。不宣稱已完成此觀察或節省特定帳單金額。

## 重建與檢查

Python 3 + Pillow（本次 Pillow 13.0.0）：

```sh
python scripts/optimize_assets.py
python scripts/check_optimized_assets.py
node scripts/check_carousel.cjs
node --check hero-carousel.js
```

完整原始檔與尺寸/大小/雜湊對照見 `docs/image-assets.json`。回退時還原本次 commit，即恢復原圖片引用。
