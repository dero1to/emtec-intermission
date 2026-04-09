# Companion 設定ファイル生成ロジック

`src/components/tools/CompanionConfigGenerate.tsx` は、配信オペレータ用 Stream Deck ソフトウェア **Bitfocus Companion** の設定ファイル（`.companionconfig`）をブラウザ上で生成してダウンロードさせるツールです。`src/pages/break/companion.tsx` からクエリパラメータ経由で呼び出されます。

## 1. エントリポイントと入出力

### 呼び出し側: `src/pages/break/companion.tsx`

URL クエリパラメータから以下を受け取り、トークデータ (`src/data/talks.ts`) を参照して開始時刻リストを生成し、`CompanionConfigGenerate` に渡します。

| パラメータ | 説明 |
| --- | --- |
| `confDay` | カンファレンス日 (`conferenceDayId`) |
| `trackId` | 対象トラック ID |
| `trackName` | トラック名（表示用） |
| `device` | `gostream` または `vr6hd`（映像スイッチャー種別） |
| `includeCount` | カウントダウンボタンを含めるか (`'true'`) |
| `includeTrackA` | TrackA シーン切替ボタンを含めるか |
| `includeSlido` | Slido ボタンを含めるか |
| `includeAttack` | アタック動画ボタンを時刻ごとに追加するか |

1. `talks` を `conferenceDayId` と `trackId` で絞り込み、`startTime` 昇順ソート。
2. 各トークの開始時刻を `HH:MM` 形式の文字列配列 `times` に変換。
3. `CompanionConfigGenerate` を直接関数呼び出し → JSON を生成し Blob URL 経由でダウンロードさせた後、`/break/menu/{confDay}` へリダイレクト。

> `CompanionConfigGenerate` は React コンポーネント形式ですが、レンダリング時に `generateConfig()` を呼び出して即ダウンロードし `null` を返す「副作用ユーティリティ」として使われています。

### 出力: `companion_{device}.companionconfig`

Companion v9 形式（`companionBuild: 4.1.3+8475-stable-02928d8be8`）の完全エクスポート JSON。`pages`・`instances`・`surfaces` などのトップレベルフィールドを含みます。

---

## 2. 生成される設定の全体構造

```jsonc
{
  "version": 9,
  "type": "full",
  "companionBuild": "...",
  "pages":    { "1": { ... }, "2": { ... } },   // Stream Deck の各ページ
  "instances": { ... },                          // 接続設定 (device + OBS)
  "surfaces":  { "streamdeck:default": { ... } },
  "triggers": {}, "custom_variables": {}, ...  // 空で固定
}
```

---

## 3. 接続インスタンス (`createInstances`)

デバイス種別に応じて 2 つの Companion インスタンスを作成します。`connectionId` は `generateNanoId()` で 21 文字のランダム ID を生成。

### GoStream
- `instance_type`: `osee-gostream-series`
- `config.host`: `192.168.179.129`
- マクロ実行 (`macroRunStart`) アクションで制御

### Roland VR-6HD
- `instance_type`: `generic-tcp-udp`
- `config`: TCP `192.168.179.129:8023`
- 2 段階の TCP `send` コマンド（`0000\n` リセット → `DTH:500504,{code};\n`）で制御

### OBS Studio
- 両デバイス共通で `obs-studio` インスタンスを追加
- `config`: `localhost:4455`、パスワード空
- `set_scene` アクションでシーン切替

---

## 4. ボタン定義と行レイアウト

Stream Deck は 5 列 × 3 行 (`gridSize: columns=5, rows=3`) の固定レイアウト。各ページは以下の構造を持ちます。

```
row 0: [Slide] [Futae] [Person] [Logo] [End]              ← レイアウト固定
row 1: (時刻 or 時刻+特殊ボタン)                          ← 複数ページ時 col4 = ↑
row 2: (時刻(Attack) or 残りの時刻+特殊ボタン)            ← 複数ページ時 col4 = ↓
```

### 4.1 Row 0: レイアウトボタン（固定）

`LAYOUT_BUTTONS` 定数で定義された 5 種類を毎ページ配置します。

| text | GoStream macroIndex | VR-6HD dthCode | OBS scene |
| --- | --- | --- | --- |
| 発表 | 0 | 02 | `------` |
| 蓋絵 | 1 | 00 | `------` |
| CAM\n配信のみ | 2 | 03 | `------` |
| 1分間\nFB | 4 | 01 (OBS) | `CountDown` |
| トラブル時 | 3 | 04 | `------` |

> VR-6HD 側の割り当て: `00=Futae`, `01=OBS`(未使用), `02=Slide`, `03=Person`, `04=Wait`, `05=End`

各ボタンは「デバイス用アクション」＋「OBS 用 `set_scene('------')`」をダウンアクションに持ちます（OBS シーンをクリアするイメージ）。

### 4.2 Row 1 / Row 2: 時刻・特殊ボタン

`times` と `specialButtonItems` を 1 列ずつ埋めていきます。`specialButtons` フラグに応じて以下のアイテムが `SPECIAL_BUTTONS` から追加されます。

| key | text | obsScene | macroIndex | dthCode |
| --- | --- | --- | --- | --- |
| `count` | Count | CountDown | 5 | 01 (OBS) |
| `trackA` | TrackA | TrackA | 5 | 01 (OBS) |
| `slido` | Slido | `------` | 6 | 01 (OBS) |

> 特殊ボタンは VR-6HD 側で OBS 入力 (`01`) に切り替えた上で、OBS 側のシーンを変更する二段構えです。

時刻ボタンは `obsScene = "{time} ~"`（例: `10:30 ~`）を設定し、OBS 側で対応するシーンに切替。

### 4.3 `includeAttack` モード

`includeAttack === true` の場合、row 1 に時刻ボタン、row 2 に同じ時刻の **アタック動画** ボタン（`obsScene = "Attack_{time}"`, text = `Video\n{time}`）を**縦方向に対応させて**配置します。
最後のページの row 2 に空きがあれば、特殊ボタンをそこに詰め込みます。

---

## 5. ページ分割ロジック

`times.length` と特殊ボタン数、`includeAttack` の有無からページ数を算出します。

### 5.1 `includeAttack` オフ
- row 1 + row 2 に時刻ボタン＋特殊ボタンを順番配置
- 単一ページ（総数 ≤ 8 かつ特殊合算 ≤ 10）: **1 ページ/ 10 ボタン**
- 総ボタン数 > 8: **ページあたり 8 ボタン**（col 4 はナビゲーションに使用）
- `totalPages = ceil(totalButtons / slotsPerPage)`

### 5.2 `includeAttack` オン
- row 1 = 時刻、row 2 = アタック動画（ペア）
- 単一ページ: **1 ページ/ 5 時刻スロット**
- 時刻数 > 4: **ページあたり 4 時刻スロット**（col 4 はナビゲーション用）
- `totalPages = ceil(totalTimeSlots / slotsPerPage)`

### 5.3 ページナビゲーション（複数ページ時のみ）

`createPageNavigationButton` で作成される矢印ボタンを col 4 に縦配置します。

- `controls['1']['4']` = `↑` (pageup) — 2 ページ目以降で表示
- `controls['2']['4']` = `↓` (pagedown) — 最終ページ以外で表示

アクションは Companion 内部の `set_page_byindex`（`connectionId: 'internal'`）で、`pageNum ± 1` を指定。

---

## 6. アクション生成ヘルパー

| 関数 | 役割 |
| --- | --- |
| `createGoStreamAction(connectionId, macroIndex)` | GoStream の `macroRunStart` を 1 つ返す |
| `createVR6HDActions(connectionId, dthCode)` | VR-6HD の TCP `send` を 2 つ返す（リセット + DTH 切替） |
| `createObsSetSceneAction(connectionId, scene)` | OBS `set_scene` を返す |
| `createButton(text, size, actions)` | 上記アクションをまとめてボタン JSON を生成 |
| `createPageNavigationButton(direction, nowPageNumber)` | 矢印ボタン（`set_page_byindex`）生成 |

ボタンは必ず `steps['0'].action_sets.down` にアクションを詰め、`up` は空。`BUTTON_STYLE_BASE`（白文字黒背景・中央揃え）と `BUTTON_OPTIONS`（`stepProgression: auto`）を共通で使用します。

---

## 7. サーフェス設定 (`createSurfaces`)

- `surfaces['streamdeck:default']` に 1 つ Elgato Stream Deck (`columns=5, rows=3`) を登録。
- `startup_page_id` / `last_page_id` を **最初のページの nanoid** に設定することで、Companion 起動時に 1 ページ目を表示。
- ページ生成ループ中で `_firstPageId` を一時的に `pages` に格納 → 構築完了時に取り出して削除するという副作用的な受け渡し方法を使用。

---

## 8. 典型的な呼び出しフロー

```
ブラウザ
  └─ /break/companion?confDay=1&trackId=2&trackName=A&device=vr6hd
        &includeCount=true&includeSlido=true&includeAttack=false
  └─ companion.tsx useEffect
        ├─ talks.filter → sort → times[] = ["10:30", "11:00", ...]
        └─ CompanionConfigGenerate({ device:'vr6hd', times, specialButtons, includeAttack:false })
              ├─ createInstances('vr6hd')
              ├─ ページ分割計算
              ├─ 各ページで controls[row][col] を構築
              ├─ createSurfaces(firstPageId)
              └─ JSON.stringify → data URL → <a download> でファイル保存
  └─ router.push('/break/menu/1')
```

---

## 9. 注意点・ハマりどころ

1. **`generateNanoId` は暗号論的乱数ではない**: `Math.random()` ベースなので厳密な一意性保証なし（ページ ID 衝突確率は実用上無視できる）。
2. **`_firstPageId` のハック**: `pages` オブジェクトに一時的に追加して最後に `delete` している。TypeScript のキャストで乗り切っているが、ユーティリティ関数として切り出した方が読みやすい。
3. **IP アドレスがハードコード**: `192.168.179.129` が両デバイスで固定値。環境ごとに変える場合はここを編集する必要があります。
4. **Companion のバージョン依存**: `version: 9`, `companionBuild: 4.1.3+...` に紐づく。Companion 本体を更新したら互換性の検証が必要。
5. **`CompanionConfigGenerate` は実質的に関数**: React コンポーネントとして定義されているが、`useEffect` などフックを使わず呼び出し時に即座にダウンロードを起こして `null` を返す。`companion.tsx` からは `useEffect` 内で関数呼び出しとして実行しており、JSX としてはレンダリングしていません。
6. **アタック有効時の特殊ボタン配置**: 最後のページの row 2 に空きがないと、特殊ボタンが**シルエント的に欠落**します。`times.length % 4 === 0` かつ `includeAttack=true` かつ特殊ボタンあり、の組み合わせで発生します。
