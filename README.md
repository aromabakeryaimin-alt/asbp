# PARK GATE｜Firebase 樂園入閘系統

包含電腦管理後台 `/admin`、iPad 入閘端 `/gate`、Google 登入、Realtime Database、Cloud Functions 伺服器核銷、人臉比對、門票及紀錄管理。

> 這是可部署測試的 MVP，不是已完成法規審查的商用門禁產品。人臉向量是敏感生物特徵資料；2D 人臉比對沒有活體檢測，可能受照片／螢幕攻擊，不可單獨作身份證明或拒絕入場依據。正式營運前必須完成法律審查、告知同意、保存期限、撤回同意及刪除流程、資安測試、活體檢測與人工覆核流程。

## 1. 建立新 Firebase 專案
1. 在 https://console.firebase.google.com/ 建立全新專案。
2. Project settings → Your apps → 新增 Web App，複製 config。
3. Authentication → Sign-in method → 啟用 Google。
4. Realtime Database → Create Database，選擇適合園區的地區，保持鎖定。
5. 本 ZIP 已預先填入 `mps1-addbd` 的 Web App 設定及 Realtime Database URL，無須再複製設定檔。
6. `.firebaserc` 已指定專案 `mps1-addbd`；部署前請在 Firebase Console 確認 Authentication 的 Google 登入及 Realtime Database 已建立。

## 2. 安裝及部署
需要 Node.js 22、npm、Firebase CLI：
```bash
npm install -g firebase-tools
firebase login
cd functions
npm install
cd ..
firebase use mps1-addbd
firebase deploy --only database,functions
firebase deploy --only hosting
```
Cloud Functions 部署通常需要 Blaze 方案及連結帳單帳戶。先設定 Google Cloud 預算警示並監控用量。

## 3. 設定管理員及閘口角色
先讓每個帳戶用 Google 登入一次，令其出現在 Firebase Authentication Users。然後用有 Admin SDK 權限的受信任環境設定 ADC：
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/secure/path/service-account.json"
node scripts/set-role.js admin@example.com admin
node scripts/set-role.js gate01@example.com gate
```
Windows PowerShell：
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\secure\service-account.json"
node scripts/set-role.js admin@example.com admin
node scripts/set-role.js gate01@example.com gate
```
服務帳戶金鑰不可放進 `public`、不可提交 GitHub、不可傳給前端。設定 claims 後，使用者必須登出再登入刷新 token。

## 4. 網址
- 首頁：`https://mps1-addbd.web.app/`
- 管理後台：`https://mps1-addbd.web.app/admin`
- iPad 入閘：`https://mps1-addbd.web.app/gate`

## 5. 測試
1. 管理員登入 `/admin`，建立遊客及門票，下載 QR。
2. 在同一遊客編號下登記人臉（須取得明確同意）。
3. 閘口人員登入 `/gate`，啟動 QR 掃描及人臉鏡頭。
4. 測試有效、過期、停用、已用完、錯誤人臉及人工核實。
5. 兩部 iPad 同時掃描單次票，確認只會有一次核銷成功。

## 6. 門票規則
- `single`：固定 1 次。
- `multi`：建立時設定 1–10,000 次。
- `multi_day`：有效起訖日期內按指定次數核銷；此 MVP 不提供無限次門票。
- 人工核銷必須填原因並記錄操作人員。

## 7. 資料安全與限制
- RTDB 直接讀寫全部拒絕；敏感操作經 Functions 並驗證 `admin` / `gate` 自訂 claims。
- 人臉特徵存在 `biometrics/{visitorId}`，由 Functions 依 QR 票所屬遊客在伺服器比對；前端不直接讀取資料庫。
- 此版本沒有活體檢測、影像防偽、公平性測試、刪除人臉 UI、撤回同意流程及備份到期刪除政策。正式營運前必須補齊。
- QR token 是 bearer credential，建立時只顯示一次；不得公開或記錄原文。遺失／外洩時應停用舊票並重新發票。
- 新加坡營運請先確認 PDPA 及相關場地、遊客來源地法律對生物特徵資料的要求。
