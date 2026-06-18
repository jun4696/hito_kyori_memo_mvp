import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BOUNDARY_LABELS,
  FATIGUE_LABELS,
  MOOD_LABELS,
  RELATIONSHIP_TYPES,
  average,
  calcWeeklyInsights,
  generateInteractionComment,
  todayString,
} from "./src/domain";
import {
  clearAllData,
  createFeedback,
  createInteraction,
  createPerson,
  deleteInteraction,
  deletePerson,
  getInteraction,
  getPeopleStats,
  getWeeklyStats,
  initDb,
  listInteractions,
  listPeople,
  listRecentWeeklyEntries,
  saveUsageLog,
} from "./src/db";

const SCREENS = [
  { key: "home", label: "ホーム" },
  { key: "people", label: "相手" },
  { key: "entry", label: "記録" },
  { key: "history", label: "履歴" },
  { key: "analysis", label: "分析" },
  { key: "about", label: "このアプリについて" },
];

const initialEntry = {
  person_id: null,
  event_date: todayString(),
  event_text: "",
  mood_before: 3,
  mood_after: 3,
  fatigue_score: 3,
  boundary_score: 3,
  note: "",
};

function round(value) {
  return value == null ? "-" : Number(value).toFixed(1);
}

function confirm(message, onOk) {
  if (typeof window !== "undefined" && window.confirm) {
    if (window.confirm(message)) onOk();
    return;
  }
  Alert.alert("確認", message, [
    { text: "キャンセル", style: "cancel" },
    { text: "実行", style: "destructive", onPress: onOk },
  ]);
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState(null);
  const [screen, setScreen] = useState("home");
  const [people, setPeople] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [peopleStats, setPeopleStats] = useState([]);
  const [weeklyEntries, setWeeklyEntries] = useState([]);
  const [filters, setFilters] = useState({ highFatigue: false, highBoundary: false, personId: null });

  const reload = useCallback(async () => {
    const [nextPeople, nextEntries, nextWeeklyStats, nextPeopleStats, nextWeeklyEntries] =
      await Promise.all([
        listPeople(),
        listInteractions(filters),
        getWeeklyStats(),
        getPeopleStats(),
        listRecentWeeklyEntries(),
      ]);

    setPeople(nextPeople);
    setEntries(nextEntries);
    setWeeklyStats(nextWeeklyStats);
    setPeopleStats(nextPeopleStats);
    setWeeklyEntries(nextWeeklyEntries);
  }, [filters]);

  useEffect(() => {
    initDb().then(async () => {
      await saveUsageLog("open_home", "home");
      setReady(true);
    }).catch((error) => {
      setInitError(error?.message || String(error));
    });
  }, []);

  useEffect(() => {
    if (ready) reload();
  }, [ready, reload]);

  async function go(nextScreen) {
    setScreen(nextScreen);
    const actionMap = {
      home: "open_home",
      people: "open_people",
      history: "open_history",
      analysis: "open_analysis",
    };
    if (actionMap[nextScreen]) await saveUsageLog(actionMap[nextScreen], nextScreen);
    await reload();
  }

  const weeklyInsights = useMemo(() => calcWeeklyInsights(weeklyEntries), [weeklyEntries]);

  if (initError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.appName}>ひと距離メモ</Text>
          <Text style={styles.caption}>初期化中に問題が起きました。</Text>
        </View>
        <View style={styles.contentInner}>
          <Text style={styles.insight}>{initError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ready) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loading}>読み込み中...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.appName}>ひと距離メモ</Text>
        <Text style={styles.caption}>診断ではなく、関わり方を振り返るための記録アプリです。</Text>
      </View>
      <View style={styles.tabs}>
        {SCREENS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.tab, screen === item.key && styles.tabActive]}
            onPress={() => go(item.key)}
          >
            <Text style={[styles.tabText, screen === item.key && styles.tabTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {screen === "home" && (
          <HomeScreen
            entries={entries.slice(0, 3)}
            insights={weeklyInsights}
            onEntryPress={async (id) => {
              setSelectedEntry(await getInteraction(id));
              setScreen("detail");
            }}
            onCreate={() => setScreen("entry")}
            onFeedback={() => setScreen("feedback")}
          />
        )}
        {screen === "people" && (
          <PeopleScreen
            people={people}
            onAdd={() => setScreen("personForm")}
            onDelete={async (id) => {
              await deletePerson(id);
              await reload();
            }}
            onHistory={(id) => {
              setFilters((current) => ({ ...current, personId: id }));
              setScreen("history");
            }}
          />
        )}
        {screen === "personForm" && <PersonForm onSave={async () => {
          await reload();
          setScreen("people");
        }} />}
        {screen === "entry" && (
          <EntryForm
            people={people}
            onSave={async (id) => {
              setSelectedEntry(await getInteraction(id));
              await reload();
              setScreen("detail");
            }}
            onAddPerson={() => setScreen("personForm")}
          />
        )}
        {screen === "history" && (
          <HistoryScreen
            people={people}
            entries={entries}
            filters={filters}
            setFilters={setFilters}
            onEntryPress={async (id) => {
              setSelectedEntry(await getInteraction(id));
              setScreen("detail");
            }}
          />
        )}
        {screen === "detail" && selectedEntry && (
          <DetailScreen
            entry={selectedEntry}
            onDelete={() =>
              confirm("この記録を削除しますか？", async () => {
                await deleteInteraction(selectedEntry.id);
                await reload();
                setScreen("history");
              })
            }
          />
        )}
        {screen === "analysis" && (
          <AnalysisScreen weeklyStats={weeklyStats} peopleStats={peopleStats} insights={weeklyInsights} />
        )}
        {screen === "feedback" && <FeedbackScreen onSave={async () => {
          await reload();
          setScreen("home");
        }} />}
        {screen === "about" && (
          <AboutScreen
            onClear={() =>
              confirm("全データを削除します。元に戻せません。", async () => {
                await clearAllData();
                await reload();
                setScreen("home");
              })
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HomeScreen({ entries, insights, onEntryPress, onCreate, onFeedback }) {
  const avgFatigue = insights.avg_fatigue;
  const avgBoundary = insights.avg_boundary;

  return (
    <View>
      <View style={styles.metricGrid}>
        <Metric label="今週の記録" value={`${insights.log_count}件`} />
        <Metric label="平均疲労度" value={round(avgFatigue)} />
        <Metric label="平均距離感" value={round(avgBoundary)} />
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={onCreate}>
        <Text style={styles.primaryButtonText}>記録する</Text>
      </TouchableOpacity>
      <Section title="今週のインサイト">
        {insights.insights.map((text) => (
          <Text key={text} style={styles.body}>{text}</Text>
        ))}
      </Section>
      <Section title="最近の記録">
        {entries.length === 0 ? <Text style={styles.muted}>まだ記録がありません。</Text> : entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} onPress={() => onEntryPress(entry.id)} />
        ))}
      </Section>
      <TouchableOpacity style={styles.secondaryButton} onPress={onFeedback}>
        <Text style={styles.secondaryButtonText}>意見を送る</Text>
      </TouchableOpacity>
    </View>
  );
}

function PeopleScreen({ people, onAdd, onDelete, onHistory }) {
  return (
    <View>
      <TouchableOpacity style={styles.primaryButton} onPress={onAdd}>
        <Text style={styles.primaryButtonText}>相手を追加</Text>
      </TouchableOpacity>
      {people.length === 0 ? <Text style={styles.muted}>ニックネームで登録できます。</Text> : people.map((person) => (
        <View key={person.id} style={styles.card}>
          <TouchableOpacity onPress={() => onHistory(person.id)}>
            <Text style={styles.cardTitle}>{person.name}</Text>
            <Text style={styles.meta}>{person.relationship_type || "未設定"} / {person.log_count || 0}件</Text>
            <Text style={styles.body}>平均疲労度 {round(person.avg_fatigue)} / 平均距離感 {round(person.avg_boundary)}</Text>
            {person.memo ? <Text style={styles.muted}>{person.memo}</Text> : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerLink} onPress={() => confirm("この相手と記録を削除しますか？", () => onDelete(person.id))}>
            <Text style={styles.dangerText}>削除</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

function PersonForm({ onSave }) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState(RELATIONSHIP_TYPES[0]);
  const [memo, setMemo] = useState("");

  async function submit() {
    if (!name.trim()) return Alert.alert("入力不足", "名前を入力してください。");
    await createPerson({ name, relationship_type: relationship, memo });
    onSave();
  }

  return (
    <View>
      <Section title="相手登録">
        <Text style={styles.label}>名前</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="ニックネーム推奨" />
        <Text style={styles.label}>関係性</Text>
        <ChoiceRow options={RELATIONSHIP_TYPES} value={relationship} onChange={setRelationship} />
        <Text style={styles.label}>メモ</Text>
        <TextInput style={[styles.input, styles.textArea]} value={memo} onChangeText={setMemo} multiline />
      </Section>
      <TouchableOpacity style={styles.primaryButton} onPress={submit}>
        <Text style={styles.primaryButtonText}>保存</Text>
      </TouchableOpacity>
    </View>
  );
}

function EntryForm({ people, onSave, onAddPerson }) {
  const [form, setForm] = useState({ ...initialEntry, person_id: people[0]?.id ?? null });

  useEffect(() => {
    if (!form.person_id && people[0]?.id) {
      setForm((current) => ({ ...current, person_id: people[0].id }));
    }
  }, [form.person_id, people]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (!form.person_id) return Alert.alert("相手が必要です", "先に相手を登録してください。");
    if (!form.event_text.trim()) return Alert.alert("入力不足", "出来事を短く入力してください。");
    const id = await createInteraction(form);
    setForm({ ...initialEntry, person_id: form.person_id, event_date: todayString() });
    onSave(id);
  }

  if (people.length === 0) {
    return (
      <View>
        <Text style={styles.body}>記録する前に、相手を1人登録してください。</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={onAddPerson}>
          <Text style={styles.primaryButtonText}>相手を追加</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <Section title="記録入力">
        <Text style={styles.label}>相手</Text>
        <ChoiceRow options={people.map((person) => ({ label: person.name, value: person.id }))} value={form.person_id} onChange={(value) => setField("person_id", value)} />
        <Text style={styles.label}>日付</Text>
        <TextInput style={styles.input} value={form.event_date} onChangeText={(value) => setField("event_date", value)} placeholder="YYYY-MM-DD" />
        <Text style={styles.label}>出来事</Text>
        <TextInput style={[styles.input, styles.textArea]} value={form.event_text} onChangeText={(value) => setField("event_text", value)} multiline />
        <ScorePicker label="会う前の気分" labels={MOOD_LABELS} value={form.mood_before} onChange={(value) => setField("mood_before", value)} />
        <ScorePicker label="会った後の気分" labels={MOOD_LABELS} value={form.mood_after} onChange={(value) => setField("mood_after", value)} />
        <ScorePicker label="疲労度" labels={FATIGUE_LABELS} value={form.fatigue_score} onChange={(value) => setField("fatigue_score", value)} />
        <ScorePicker label="次回の距離感" labels={BOUNDARY_LABELS} value={form.boundary_score} onChange={(value) => setField("boundary_score", value)} />
        <Text style={styles.label}>補足メモ</Text>
        <TextInput style={[styles.input, styles.textArea]} value={form.note} onChangeText={(value) => setField("note", value)} multiline />
      </Section>
      <TouchableOpacity style={styles.primaryButton} onPress={submit}>
        <Text style={styles.primaryButtonText}>保存</Text>
      </TouchableOpacity>
    </View>
  );
}

function HistoryScreen({ people, entries, filters, setFilters, onEntryPress }) {
  return (
    <View>
      <Section title="フィルター">
        <ChoiceRow
          options={[{ label: "全員", value: null }, ...people.map((person) => ({ label: person.name, value: person.id }))]}
          value={filters.personId}
          onChange={(value) => setFilters((current) => ({ ...current, personId: value }))}
        />
        <View style={styles.inline}>
          <Toggle label="疲労度4以上" active={filters.highFatigue} onPress={() => setFilters((current) => ({ ...current, highFatigue: !current.highFatigue }))} />
          <Toggle label="距離感4以上" active={filters.highBoundary} onPress={() => setFilters((current) => ({ ...current, highBoundary: !current.highBoundary }))} />
        </View>
      </Section>
      {entries.length === 0 ? <Text style={styles.muted}>条件に合う記録がありません。</Text> : entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} onPress={() => onEntryPress(entry.id)} />
      ))}
    </View>
  );
}

function DetailScreen({ entry, onDelete }) {
  return (
    <View>
      <Section title="記録詳細">
        <Text style={styles.cardTitle}>{entry.person_name}</Text>
        <Text style={styles.meta}>{entry.relationship_type || "未設定"} / {entry.event_date}</Text>
        <Text style={styles.label}>出来事</Text>
        <Text style={styles.body}>{entry.event_text || "-"}</Text>
        <Text style={styles.label}>スコア</Text>
        <Text style={styles.body}>会う前: {MOOD_LABELS[entry.mood_before]} / 会った後: {MOOD_LABELS[entry.mood_after]}</Text>
        <Text style={styles.body}>疲労度: {FATIGUE_LABELS[entry.fatigue_score]} / 距離感: {BOUNDARY_LABELS[entry.boundary_score]}</Text>
        <Text style={styles.label}>メモ</Text>
        <Text style={styles.body}>{entry.note || "-"}</Text>
        <Text style={styles.label}>コメント</Text>
        <Text style={styles.insight}>{generateInteractionComment(entry)}</Text>
      </Section>
      <TouchableOpacity style={styles.dangerButton} onPress={onDelete}>
        <Text style={styles.dangerButtonText}>削除</Text>
      </TouchableOpacity>
    </View>
  );
}

function AnalysisScreen({ weeklyStats, peopleStats, insights }) {
  return (
    <View>
      <Section title="直近7日間の疲労度">
        {weeklyStats.length === 0 ? <Text style={styles.muted}>まだグラフにできる記録がありません。</Text> : weeklyStats.map((item) => (
          <Bar key={item.event_date} label={item.event_date.slice(5)} value={Number(item.avg_fatigue)} max={5} />
        ))}
      </Section>
      <Section title="相手別の平均疲労度">
        {peopleStats.length === 0 ? <Text style={styles.muted}>相手別分析は記録後に表示されます。</Text> : peopleStats.map((item) => (
          <Bar key={item.id} label={item.name} value={Number(item.avg_fatigue)} max={5} subLabel={`距離感 ${round(item.avg_boundary)} / ${item.log_count}件`} />
        ))}
      </Section>
      <Section title="統計インサイト">
        <Text style={styles.body}>平均疲労度 {round(insights.avg_fatigue)} / 平均距離感 {round(insights.avg_boundary)} / 気分変化 {round(insights.avg_mood_change)}</Text>
        {insights.insights.map((text) => <Text key={text} style={styles.insight}>{text}</Text>)}
      </Section>
    </View>
  );
}

function FeedbackScreen({ onSave }) {
  const [category, setCategory] = useState("要望");
  const [message, setMessage] = useState("");

  async function submit() {
    if (!message.trim()) return Alert.alert("入力不足", "メッセージを入力してください。");
    await createFeedback({ category, message });
    setMessage("");
    onSave();
  }

  return (
    <View>
      <Section title="フィードバック">
        <Text style={styles.muted}>MVPでは外部送信せず、端末内SQLiteに保存します。</Text>
        <Text style={styles.label}>カテゴリ</Text>
        <ChoiceRow options={["要望", "不具合", "使いにくい点", "その他"]} value={category} onChange={setCategory} />
        <Text style={styles.label}>メッセージ</Text>
        <TextInput style={[styles.input, styles.textArea]} value={message} onChangeText={setMessage} multiline />
      </Section>
      <TouchableOpacity style={styles.primaryButton} onPress={submit}>
        <Text style={styles.primaryButtonText}>送信</Text>
      </TouchableOpacity>
    </View>
  );
}

function AboutScreen({ onClear }) {
  return (
    <View>
      <Section title="このアプリについて">
        <Text style={styles.body}>人と関わった後の疲労度・気分変化・次回の距離感を残し、自分にとって無理のない関わり方を振り返るためのツールです。</Text>
        <Text style={styles.muted}>医療・カウンセリング・診断を目的としません。表示されるコメントは、記録を振り返るための観察メモです。</Text>
      </Section>
      <Section title="データの保存">
        <Text style={styles.body}>Expo Goや実機では端末内SQLiteに保存します。Web確認ではブラウザのlocalStorageに保存します。</Text>
        <Text style={styles.muted}>外部APIやログインは使いません。</Text>
      </Section>
      <TouchableOpacity style={styles.dangerButton} onPress={onClear}>
        <Text style={styles.dangerButtonText}>全データ削除</Text>
      </TouchableOpacity>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function EntryCard({ entry, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.cardTitle}>{entry.person_name}</Text>
      <Text style={styles.meta}>{entry.event_date} / 疲労度 {entry.fatigue_score} / 距離感 {entry.boundary_score}</Text>
      <Text style={styles.body}>{entry.event_text || "出来事未入力"}</Text>
    </TouchableOpacity>
  );
}

function ScorePicker({ label, labels, value, onChange }) {
  return (
    <View style={styles.scoreBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.scoreRow}>
        {[1, 2, 3, 4, 5].map((score) => (
          <TouchableOpacity key={score} style={[styles.scoreButton, value === score && styles.scoreButtonActive]} onPress={() => onChange(score)}>
            <Text style={[styles.scoreNumber, value === score && styles.scoreNumberActive]}>{score}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.muted}>{labels[value]}</Text>
    </View>
  );
}

function ChoiceRow({ options, value, onChange }) {
  return (
    <View style={styles.choiceRow}>
      {options.map((option) => {
        const normalized = typeof option === "string" ? { label: option, value: option } : option;
        const active = normalized.value === value;
        return (
          <TouchableOpacity key={`${normalized.label}-${normalized.value}`} style={[styles.choice, active && styles.choiceActive]} onPress={() => onChange(normalized.value)}>
            <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{normalized.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Toggle({ label, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.choice, active && styles.choiceActive]} onPress={onPress}>
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Bar({ label, value, max, subLabel }) {
  const pct = `${Math.max(5, Math.min(100, (value / max) * 100))}%`;
  return (
    <View style={styles.barWrap}>
      <View style={styles.barHeader}>
        <Text style={styles.body}>{label}</Text>
        <Text style={styles.meta}>{round(value)}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: pct }]} />
      </View>
      {subLabel ? <Text style={styles.meta}>{subLabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8f5ef",
  },
  loading: {
    padding: 24,
    color: "#2c2b29",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: "#f8f5ef",
  },
  appName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1f2d2b",
  },
  caption: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#6d6760",
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e3ddd2",
  },
  tab: {
    minWidth: 64,
    alignItems: "center",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
  },
  tabActive: {
    backgroundColor: "#235c54",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4e5552",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  content: {
    flex: 1,
  },
  contentInner: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    padding: 16,
    paddingBottom: 40,
  },
  metricGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  metric: {
    flex: 1,
    minHeight: 78,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e4ded3",
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#235c54",
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#6d6760",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 10,
    fontSize: 18,
    fontWeight: "800",
    color: "#26312f",
  },
  card: {
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e4ded3",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#26312f",
  },
  body: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    color: "#383633",
  },
  meta: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: "#766f67",
  },
  muted: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: "#81786e",
  },
  insight: {
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#d28743",
    paddingLeft: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#383633",
  },
  primaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#235c54",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#235c54",
  },
  secondaryButtonText: {
    color: "#235c54",
    fontWeight: "800",
    fontSize: 15,
  },
  dangerButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: "#9d312f",
  },
  dangerButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  dangerLink: {
    marginTop: 8,
  },
  dangerText: {
    color: "#9d312f",
    fontWeight: "700",
  },
  label: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "800",
    color: "#514c45",
  },
  input: {
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d9d1c5",
    fontSize: 15,
    color: "#2f302d",
  },
  textArea: {
    minHeight: 86,
    textAlignVertical: "top",
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choice: {
    minHeight: 38,
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d9d1c5",
  },
  choiceActive: {
    backgroundColor: "#235c54",
    borderColor: "#235c54",
  },
  choiceText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4e5552",
  },
  choiceTextActive: {
    color: "#ffffff",
  },
  inline: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  scoreBlock: {
    marginTop: 8,
  },
  scoreRow: {
    flexDirection: "row",
    gap: 8,
  },
  scoreButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d9d1c5",
  },
  scoreButtonActive: {
    backgroundColor: "#d28743",
    borderColor: "#d28743",
  },
  scoreNumber: {
    fontWeight: "800",
    color: "#4e5552",
  },
  scoreNumberActive: {
    color: "#ffffff",
  },
  barWrap: {
    marginBottom: 12,
  },
  barHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  barTrack: {
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#e7dfd4",
  },
  barFill: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "#d28743",
  },
});
