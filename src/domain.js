export const RELATIONSHIP_TYPES = [
  "職場",
  "友人",
  "家族",
  "恋人・パートナー",
  "知人",
  "その他",
];

export const MOOD_LABELS = {
  1: "とても重い",
  2: "少し重い",
  3: "普通",
  4: "少し良い",
  5: "とても良い",
};

export const FATIGUE_LABELS = {
  1: "ほぼ疲れない",
  2: "少し疲れた",
  3: "普通",
  4: "かなり疲れた",
  5: "ぐったりした",
};

export const BOUNDARY_LABELS = {
  1: "近づきたい",
  2: "普通に接する",
  3: "少し控えめにする",
  4: "かなり距離を取る",
  5: "当面避けたい",
};

const FATIGUE_COMMENTS = {
  1: ["この関わりでは疲労感はかなり低めです。"],
  2: ["軽い疲労感がある記録です。"],
  3: ["疲労度は中程度です。何に疲れたのかをメモしておくと、次回の参考になります。"],
  4: ["疲労度が高めです。次回は会う時間や話題の範囲を少し狭める選択肢があります。"],
  5: ["かなり強い疲労感が記録されています。次回は距離・時間・話題のどれかを調整する余地があります。"],
};

export function getMoodChangeSupplement(moodBefore, moodAfter) {
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
  return "会った後に気分が上がっています。この関わり方は比較的負担が少ない可能性があります。";
}

export function getBoundarySupplement(boundaryScore) {
  if (!boundaryScore) return null;
  if (boundaryScore <= 2) return "次回も比較的近い距離感で関わりたい記録です。";
  if (boundaryScore === 3) return "次回は少し控えめな距離感を意識する記録です。";
  if (boundaryScore === 4) return "次回は会う時間・頻度・話題の範囲を調整する選択肢があります。";
  return "次回は無理に関わらず、距離を取る前提で予定や接し方を考える記録です。";
}

export function generateInteractionComment(entry) {
  const bases = FATIGUE_COMMENTS[entry.fatigue_score] || FATIGUE_COMMENTS[3];
  const base = bases[0];
  const supplements = [
    getMoodChangeSupplement(entry.mood_before, entry.mood_after),
    getBoundarySupplement(entry.boundary_score),
  ].filter(Boolean);

  return [base, supplements[0]].filter(Boolean).join(" ");
}

export function average(values) {
  const valid = values.filter((value) => Number.isFinite(Number(value)));
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + Number(value), 0) / valid.length;
}

export function calcWeeklyInsights(entries) {
  const valid = entries.filter((entry) => entry.fatigue_score != null);
  if (valid.length < 3) {
    return {
      avg_fatigue: average(valid.map((entry) => entry.fatigue_score)),
      avg_boundary: average(valid.map((entry) => entry.boundary_score)),
      avg_mood_change: null,
      log_count: valid.length,
      insights: ["記録が少ないため、まだ傾向は判断できません。まずは3件以上記録すると分析できます。"],
    };
  }

  const insights = [];
  const avgFatigue = average(valid.map((entry) => entry.fatigue_score));
  const avgBoundary = average(valid.map((entry) => entry.boundary_score));
  const withMood = valid.filter((entry) => entry.mood_before != null && entry.mood_after != null);
  const avgMoodChange = average(withMood.map((entry) => entry.mood_after - entry.mood_before));

  if (avgFatigue >= 4) {
    insights.push(`今週の平均疲労度は${avgFatigue.toFixed(1)}です。全体的に負担が大きめです。`);
  } else if (avgFatigue <= 2) {
    insights.push(`今週の平均疲労度は${avgFatigue.toFixed(1)}です。比較的負担の少ない関わりが多い週です。`);
  }

  if (withMood.length >= 3 && avgMoodChange <= -1) {
    insights.push(`会った後の気分が平均${Math.abs(avgMoodChange).toFixed(1)}下がっています。関わる場面や時間帯を見直す材料になります。`);
  } else if (withMood.length >= 3 && avgMoodChange >= 1) {
    insights.push(`会った後の気分が平均${avgMoodChange.toFixed(1)}上がっています。負担の少ない関わり方ができている可能性があります。`);
  }

  if (avgBoundary >= 4) {
    insights.push("今週は「距離を取りたい」記録が多めです。予定の入れ方や会話量を調整する余地があります。");
  }

  if (insights.length === 0) {
    insights.push("今週は極端な偏りは少なめです。記録を続けると相手別の傾向が見えやすくなります。");
  }

  return {
    avg_fatigue: avgFatigue,
    avg_boundary: avgBoundary,
    avg_mood_change: avgMoodChange,
    log_count: valid.length,
    insights,
  };
}

export function todayString() {
  return new Date().toISOString().slice(0, 10);
}
