# 人間関係の距離感メモアプリ MVP仕様書 v1

**アプリ名（仮）：** ひと距離メモ  
**コンセプト：** 人と関わった後の疲労度・気分変化・次回の距離感を記録し、自分にとって無理のない人間関係パターンに気づく  
**ターゲット：** 20〜40代、仕事・友人・家族などの人間関係で疲れやすいが、感情や距離感を整理する習慣がない人  
**費用：** $0 / 月（外部APIなし・端末内SQLite / Web localStorageで完結）  
**注意：** 本アプリは医療・カウンセリング・診断を目的としない。あくまで自己記録と振り返りのためのツールとする。

---

## 技術スタック

| レイヤー | 技術 | 備考 |
|----------|------|------|
| フロントエンド | React Native（Expo） | iOS / Android 1コードベース |
| データベース | SQLite（expo-sqlite） / Web localStorage | 実機は端末内SQLite、Web版はブラウザ内保存。API連携なし |
| グラフ | react-native-chart-kit または victory-native | 週次・相手別の傾向を可視化 |
| AI / API | なし（ルールベース + 統計計算） | API費用ゼロ |
| 通知 | なし | MVPでは実装しない |
| 認証 | なし | MVPでは端末内・ブラウザ内の個人利用に限定 |
| 利用ログ | SQLite / localStorageに保存 | 記録作成・画面閲覧・グラフ閲覧などを記録 |
| フィードバック | SQLite / localStorageに保存 | 要望・不具合・感想を端末内またはブラウザ内に保存 |
| ビルド | Expo | 開発・発表用ビルドを想定 |

---

## ローカル保存方針

| 項目 | 方針 |
|------|------|
| 保存場所 | Expo Go / 実機ではユーザー端末内SQLite。Web版ではブラウザのlocalStorage |
| 外部同期 | なし |
| ログイン | なし |
| オフライン利用 | 可能 |
| データ容量 | 数千件規模の記録ならSQLiteで十分 |
| バックアップ | MVPでは対象外 |
| 個人情報 | 相手の名前は自由入力のため、ユーザーに配慮文を表示する |

1日3件の対人記録 × 1年 = 約1,095件。  
1件あたり数KB未満のため、SQLiteで十分対応可能。

Web版の記録は、そのブラウザ内にのみ保存される。別の端末や別のブラウザには同期されない。ブラウザのデータ削除、シークレットモード利用、端末変更などにより記録が失われる可能性があるため、「このアプリについて」で明示する。

---

## 画面一覧

| # | 画面名 | 説明 |
|---|--------|------|
| 1 | ホーム | 今週の記録数・平均疲労度・最近の記録・簡易インサイト |
| 2 | 相手一覧 | 登録した相手を一覧表示。関係性・平均疲労度も表示 |
| 3 | 相手登録 / 編集 | 名前・関係性・メモを登録 |
| 4 | 記録入力 | 相手・出来事・気分・疲労度・次回の距離感を記録 |
| 5 | 記録詳細 | 1件の記録内容とルールベースコメントを表示 |
| 6 | 記録履歴 | 日付順・相手別で記録を確認 |
| 7 | 分析 | 週次グラフ・相手別平均疲労度・境界線傾向を可視化 |
| 8 | フィードバック | 要望・不具合・感想を入力 |
| 9 | このアプリについて | アプリ説明・免責文・保存先・全データ削除の確認 |

### 画面フロー

```text
アプリ起動
  └─ ホーム
       ├─ [記録する] → 記録入力 → 記録詳細 → ホーム
       ├─ [相手]     → 相手一覧 → 相手登録 / 編集
       ├─ [履歴]     → 記録履歴 → 記録詳細
       ├─ [分析]     → 分析
       ├─ [このアプリについて] → このアプリについて
       └─ [意見を送る] → フィードバック
```

### 各画面の詳細

#### 1. ホーム画面

- 今週の記録数
- 今週の平均疲労度
- 今週の平均境界線スコア
- 最近の記録3件
- 今週の簡易インサイト1〜2文
- メインボタン：「記録する」

#### 2. 相手一覧画面

- 登録済みの相手を一覧表示
- 表示項目
  - 名前
  - 関係性
  - 記録件数
  - 平均疲労度
  - 平均境界線スコア
- 相手をタップすると、その相手の記録履歴へ遷移
- 追加ボタンから相手登録画面へ遷移

#### 3. 相手登録 / 編集画面

- 名前
- 関係性
  - 職場
  - 友人
  - 家族
  - 恋人・パートナー
  - 知人
  - その他
- メモ
- 保存ボタン

#### 4. 記録入力画面

- 相手選択
- 出来事の日付
- 出来事の内容
- 会う前の気分：5段階ボタン
- 会った後の気分：5段階ボタン
- 疲労度：5段階ボタン
- 次回の距離感：5段階ボタン
- 補足メモ
- 保存ボタン

##### 5段階入力の定義

**会う前 / 会った後の気分**

| スコア | 表示 |
|---|---|
| 1 | とても重い |
| 2 | 少し重い |
| 3 | 普通 |
| 4 | 少し良い |
| 5 | とても良い |

**疲労度**

| スコア | 表示 |
|---|---|
| 1 | ほぼ疲れない |
| 2 | 少し疲れた |
| 3 | 普通 |
| 4 | かなり疲れた |
| 5 | ぐったりした |

**次回の距離感**

| スコア | 表示 |
|---|---|
| 1 | 近づきたい |
| 2 | 普通に接する |
| 3 | 少し控えめにする |
| 4 | かなり距離を取る |
| 5 | 当面避けたい |

#### 5. 記録詳細画面

- 相手名
- 関係性
- 日付
- 出来事
- 会う前の気分
- 会った後の気分
- 疲労度
- 次回の距離感
- メモ
- ルールベースコメント
- 編集 / 削除ボタン

#### 6. 記録履歴画面

- 日付順で記録を表示
- フィルター
  - 相手別
  - 関係性別
  - 疲労度4以上
  - 境界線4以上
- 記録をタップすると詳細画面へ遷移

#### 7. 分析画面

- 直近7日間の疲労度推移グラフ
- 相手別の平均疲労度バーチャート
- 相手別の平均境界線スコア
- 気分変化の平均
- 統計インサイト一覧

#### 8. フィードバック画面

- カテゴリ選択
  - 要望
  - 不具合
  - 使いにくい点
  - その他
- メッセージ入力
- 送信ボタン
- 送信後はSQLiteに保存

#### 9. このアプリについて画面

- アプリ説明
- 免責文
- データ保存先の説明
- Web版ではブラウザ内にのみ保存され、別端末・別ブラウザには同期されない旨の説明
- ブラウザデータ削除により記録が消える可能性がある旨の説明
- 全データ削除

---

## 機能リスト

### ✅ Must Have（v1.0）

| # | 機能 | 説明 |
|---|------|------|
| 1 | 相手登録 | 名前・関係性・メモを保存 |
| 2 | 対人記録 | 相手・出来事・気分・疲労度・次回の距離感を保存 |
| 3 | 5段階入力UI | 数値入力ではなく、ボタンまたはスライダーで入力 |
| 4 | 記録一覧 | 日付順・相手別に記録を確認 |
| 5 | 記録詳細 | 1件ごとの記録内容とコメントを表示 |
| 6 | ルールベースコメント | 疲労度・気分変化・境界線スコアから固定文言を生成 |
| 7 | 週次グラフ | 直近7日間の疲労度推移を表示 |
| 8 | 相手別グラフ | 相手別の平均疲労度を表示 |
| 9 | 統計インサイト | 疲労度・境界線・気分変化の傾向を計算 |
| 10 | 利用ログ | 記録作成・一覧閲覧・分析閲覧などを保存 |
| 11 | フィードバック | 要望・不具合・感想を保存 |
| 12 | データ永続化 | SQLiteへのローカル保存 |

### 🔵 Should Have（v1.1以降）

| # | 機能 | 説明 |
|---|------|------|
| 13 | 関係性別分析 | 職場・友人・家族などカテゴリ別に傾向を表示 |
| 14 | 月次レポート | 月単位の疲労度・境界線傾向を表示 |
| 15 | CSVエクスポート | 記録データをCSVで出力 |
| 16 | 相手ごとの詳細分析 | 特定の相手との気分変化や疲労度推移を表示 |
| 17 | PINロック | 端末内データの簡易保護 |

### ⚪ Nice to Have（v2.0以降）

| # | 機能 | 説明 |
|---|------|------|
| 18 | 通知 | 記録リマインダー |
| 19 | タグ機能 | 会話内容や場面をタグ付け |
| 20 | バックアップ | 外部ストレージへのバックアップ |
| 21 | クラウド同期 | 複数端末での利用 |
| 22 | カレンダー表示 | 日別の疲労度をカレンダーで可視化 |

---

## DB設計

### people テーブル

```sql
CREATE TABLE people (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  name               TEXT NOT NULL,
  relationship_type  TEXT,
  memo               TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT
);
```

### interaction_logs テーブル

```sql
CREATE TABLE interaction_logs (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id        INTEGER NOT NULL,
  event_date       TEXT NOT NULL,
  event_text       TEXT,
  mood_before      INTEGER CHECK (mood_before BETWEEN 1 AND 5),
  mood_after       INTEGER CHECK (mood_after BETWEEN 1 AND 5),
  fatigue_score    INTEGER NOT NULL CHECK (fatigue_score BETWEEN 1 AND 5),
  boundary_score   INTEGER NOT NULL CHECK (boundary_score BETWEEN 1 AND 5),
  note             TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT,
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);
```

### usage_logs テーブル

```sql
CREATE TABLE usage_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  action      TEXT NOT NULL,
  screen      TEXT,
  target_id   INTEGER,
  created_at  TEXT NOT NULL
);
```

### feedbacks テーブル

```sql
CREATE TABLE feedbacks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category    TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
```

---

## 利用ログ仕様

### 記録するアクション

| action | 内容 |
|--------|------|
| open_home | ホーム画面を開いた |
| open_people | 相手一覧を開いた |
| create_person | 相手を登録した |
| update_person | 相手を編集した |
| delete_person | 相手を削除した |
| create_interaction | 対人記録を作成した |
| update_interaction | 対人記録を編集した |
| delete_interaction | 対人記録を削除した |
| open_history | 記録履歴を開いた |
| open_analysis | 分析画面を開いた |
| create_feedback | フィードバックを送信した |

### 利用ログ保存関数

```javascript
async function saveUsageLog(db, action, screen, targetId = null) {
  const now = new Date().toISOString();

  await db.runAsync(
    `
    INSERT INTO usage_logs
      (action, screen, target_id, created_at)
    VALUES
      (?, ?, ?, ?)
    `,
    [action, screen, targetId, now]
  );
}
```

---

## ルールベースコメント仕様

### コメント方針

このアプリでは、診断・断定・治療的助言は行わない。  
コメントは「観察」「振り返り」「次回の距離感の検討」に限定する。

出してはいけない表現：

- この人とは縁を切るべきです
- あなたはメンタル不調です
- この関係は危険です
- うつ病の可能性があります
- 絶対に距離を置きましょう

出してよい表現：

- この記録では疲労度が高めです
- 次回は会う時間や話題の範囲を少し狭める選択肢があります
- 同じ相手との記録が続くと、傾向を見つけやすくなります
- 気分が下がった場面を短くメモしておくと、振り返りやすくなります

### ロジックの優先順位

```text
① 疲労度でベース文言を選択
② 気分変化で補足文を追加
③ 境界線スコアで補足文を追加
④ 最大2文で出力
```

### 疲労度別ベースコメント

```javascript
const FATIGUE_COMMENTS = {
  1: [
    "この関わりでは疲労感はかなり低めです。",
    "会った後の負担は少ない記録です。",
    "比較的無理なく関われている可能性があります。",
  ],
  2: [
    "少し疲れはありますが、大きな負担ではなさそうです。",
    "軽い疲労感がある記録です。",
    "今の距離感で大きな無理は出ていない可能性があります。",
  ],
  3: [
    "疲労度は中程度です。何に疲れたのかをメモしておくと、次回の参考になります。",
    "普通程度の疲れがある記録です。",
    "関わり方によっては負担が増える可能性があります。",
  ],
  4: [
    "疲労度が高めです。次回は会う時間や話題の範囲を少し狭める選択肢があります。",
    "この関わりでは負担が大きめに出ています。",
    "同じ相手で疲労度が高い記録が続くか確認すると、距離感を見直しやすくなります。",
  ],
  5: [
    "かなり強い疲労感が記録されています。次回は距離・時間・話題のどれかを調整する余地があります。",
    "この記録では負担が非常に大きく出ています。",
    "会った後に大きく消耗しているため、次回の接し方を具体的に決めておくと振り返りやすくなります。",
  ],
};
```

### 気分変化補足コメント

```javascript
function getMoodChangeSupplement(moodBefore, moodAfter) {
  if (!moodBefore || !moodAfter) return null;

  const diff = moodAfter - moodBefore;

  if (diff <= -2) {
    return "会った後に気分が大きく下がっています。どの場面で変化したかを短く残しておくと、次回の判断材料になります。";
  }

  if (diff === -1) {
    return "会った後に気分が少し下がっています。無理を感じた場面があればメモしておくと役立ちます。";
  }

  if (diff === 0) {
    return "会う前後で気分の大きな変化はありません。";
  }

  if (diff >= 1) {
    return "会った後に気分が上がっています。この関わり方は比較的負担が少ない可能性があります。";
  }

  return null;
}
```

### 境界線補足コメント

```javascript
function getBoundarySupplement(boundaryScore) {
  if (!boundaryScore) return null;

  if (boundaryScore <= 2) {
    return "次回も比較的近い距離感で関わりたい記録です。";
  }

  if (boundaryScore === 3) {
    return "次回は少し控えめな距離感を意識する記録です。";
  }

  if (boundaryScore === 4) {
    return "次回は会う時間・頻度・話題の範囲を調整する選択肢があります。";
  }

  if (boundaryScore === 5) {
    return "次回は無理に関わらず、距離を取る前提で予定や接し方を考える記録です。";
  }

  return null;
}
```

### コメント生成関数

```javascript
function generateInteractionComment(entry) {
  const {
    fatigue_score,
    mood_before,
    mood_after,
    boundary_score
  } = entry;

  const bases = FATIGUE_COMMENTS[fatigue_score] || FATIGUE_COMMENTS[3];
  const base = bases[Math.floor(Math.random() * bases.length)];

  const moodSupplement = getMoodChangeSupplement(mood_before, mood_after);
  const boundarySupplement = getBoundarySupplement(boundary_score);

  const supplements = [moodSupplement, boundarySupplement].filter(Boolean);

  return [base, supplements[0]].filter(Boolean).join(" ");
}
```

---

## 統計インサイト仕様

### 計算する指標（週次・4種類）

```javascript
function calcWeeklyInsights(entries) {
  // entries: 直近7日分の interaction_logs 配列
  const valid = entries.filter(e => e.fatigue_score !== null);

  if (valid.length < 3) {
    return {
      insights: ["記録が少ないため、まだ傾向は判断できません。まずは3件以上記録すると分析できます。"]
    };
  }

  const insights = [];

  // 1. 平均疲労度
  const avgFatigue = avg(valid.map(e => e.fatigue_score));

  if (avgFatigue >= 4) {
    insights.push(`今週の平均疲労度は${avgFatigue.toFixed(1)}です。全体的に負担が大きめです。`);
  } else if (avgFatigue <= 2) {
    insights.push(`今週の平均疲労度は${avgFatigue.toFixed(1)}です。比較的負担の少ない関わりが多い週です。`);
  }

  // 2. 気分変化
  const withMood = valid.filter(e => e.mood_before !== null && e.mood_after !== null);

  if (withMood.length >= 3) {
    const moodDiffs = withMood.map(e => e.mood_after - e.mood_before);
    const avgMoodDiff = avg(moodDiffs);

    if (avgMoodDiff <= -1) {
      insights.push(`会った後の気分が平均${Math.abs(avgMoodDiff).toFixed(1)}下がっています。関わる場面や時間帯を見直す材料になります。`);
    } else if (avgMoodDiff >= 1) {
      insights.push(`会った後の気分が平均${avgMoodDiff.toFixed(1)}上がっています。負担の少ない関わり方ができている可能性があります。`);
    }
  }

  // 3. 境界線スコア
  const avgBoundary = avg(valid.map(e => e.boundary_score));

  if (avgBoundary >= 4) {
    insights.push(`今週は「距離を取りたい」記録が多めです。予定の入れ方や会話量を調整する余地があります。`);
  }

  // 4. 相手別の平均疲労度
  const byPerson = groupBy(valid, e => e.person_id);
  let highestPersonId = null;
  let highestFatigue = 0;

  for (const [personId, logs] of Object.entries(byPerson)) {
    if (logs.length < 2) continue;

    const personAvg = avg(logs.map(e => e.fatigue_score));

    if (personAvg > highestFatigue) {
      highestFatigue = personAvg;
      highestPersonId = personId;
    }
  }

  if (highestPersonId && highestFatigue >= 4) {
    insights.push(`特定の相手との記録で疲労度が高めに出ています。相手別グラフで確認できます。`);
  }

  return {
    avg_fatigue: avgFatigue.toFixed(2),
    avg_boundary: avgBoundary.toFixed(2),
    avg_mood_change: withMood.length
      ? avg(withMood.map(e => e.mood_after - e.mood_before)).toFixed(2)
      : null,
    log_count: valid.length,
    insights,
  };
}

// ユーティリティ
const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

const groupBy = (arr, fn) => arr.reduce((acc, x) => {
  const k = fn(x);
  (acc[k] = acc[k] || []).push(x);
  return acc;
}, {});
```

---

## SQL集計例

### 直近7日間の疲労度平均

```sql
SELECT
  event_date,
  AVG(fatigue_score) AS avg_fatigue,
  AVG(boundary_score) AS avg_boundary,
  COUNT(*) AS log_count
FROM interaction_logs
WHERE event_date >= date('now', '-6 days')
GROUP BY event_date
ORDER BY event_date;
```

### 相手別の平均疲労度

```sql
SELECT
  people.id,
  people.name,
  people.relationship_type,
  AVG(interaction_logs.fatigue_score) AS avg_fatigue,
  AVG(interaction_logs.boundary_score) AS avg_boundary,
  COUNT(*) AS log_count
FROM interaction_logs
JOIN people ON interaction_logs.person_id = people.id
GROUP BY people.id
ORDER BY avg_fatigue DESC;
```

### 境界線スコア4以上の記録

```sql
SELECT
  interaction_logs.*,
  people.name,
  people.relationship_type
FROM interaction_logs
JOIN people ON interaction_logs.person_id = people.id
WHERE boundary_score >= 4
ORDER BY event_date DESC;
```

### 利用ログ集計

```sql
SELECT
  action,
  COUNT(*) AS count
FROM usage_logs
GROUP BY action
ORDER BY count DESC;
```

---

## 開発スケジュール

| フェーズ | 期間 | 内容 | 状態 |
|----------|------|------|------|
| Phase 1 | 1週間 | Expoプロジェクト作成・SQLite導入・テーブル作成 | ⬜ 未着手 |
| Phase 2 | 1週間 | 相手登録・相手一覧・相手編集画面 | ⬜ 未着手 |
| Phase 3 | 1週間 | 記録入力・記録詳細・ルールベースコメント | ⬜ 未着手 |
| Phase 4 | 1週間 | 記録履歴・フィルター・削除 / 編集 | ⬜ 未着手 |
| Phase 5 | 1週間 | 分析画面・週次グラフ・相手別グラフ | ⬜ 未着手 |
| Phase 6 | 1週間 | 利用ログ・フィードバック・テスト・UI調整 | ⬜ 未着手 |
| **合計** | **6週間** | **MVP完成** | |

---

## リスクと対策

| リスク | 対策 |
|--------|------|
| ただの日記アプリに見える | 相手別・疲労度・境界線スコアを中心に設計する |
| メンタルヘルス診断に見える | 診断・治療・断定表現を避け、自己記録アプリとして明記する |
| 記録項目が多くて面倒 | 初期入力は相手・疲労度・境界線・出来事だけでも保存可能にする |
| 個人情報が含まれる | 相手名はニックネーム推奨と表示する |
| グラフ実装で詰まる | 最初は直近7日疲労度と相手別平均疲労度の2種類に絞る |
| SQLite操作で複雑化する | CRUD関数をテーブルごとに分離する |
| コメントが助言しすぎる | コメントは観察と振り返りに限定する |
| フィードバックが外部送信される誤解 | MVPでは端末内保存であることを明記する |

---

## MVPで削るもの

| 削る機能 | 理由 |
|----------|------|
| Supabase連携 | API・認証・RLSが増え、初期制約とズレるため |
| Googleログイン | MVPの核ではないため |
| プッシュ通知 | 実装負荷の割に検証価値が低いため |
| 睡眠時間入力 | 人間関係の距離感というテーマから外れるため |
| カレンダー履歴 | 見た目は良いが、初期MVPでは優先度が低いため |
| 月次レポート | 週次分析で十分なため |
| クラウド同期 | 卒業課題MVPでは不要なため |
| AIコメント | API費用・安全性・品質管理の問題があるため |

---

## MVPの成功条件

| 指標 | 内容 |
|------|------|
| 記録作成 | 相手を登録し、対人記録を保存できる |
| 振り返り | 過去の記録を一覧・詳細で確認できる |
| 可視化 | 週次疲労度と相手別疲労度をグラフで確認できる |
| 気づき | ルールベースコメントと統計インサイトを表示できる |
| ログ取得 | 主要アクションがusage_logsに保存される |
| フィードバック | ユーザーの意見をfeedbacksに保存できる |

---

## 最終コンセプト文

このアプリは、メンタルヘルスを診断・改善するものではなく、人と関わった後の疲労感・気分変化・次回の距離感を記録し、自分にとって無理のない人間関係パターンを見つけるためのセルフ記録アプリである。
