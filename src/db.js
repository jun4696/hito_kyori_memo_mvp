import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

let dbPromise;
const WEB_STORE_KEY = "hito_kyori_memo_web_store_v1";

const isWeb = Platform.OS === "web";

function emptyStore() {
  return {
    people: [],
    interaction_logs: [],
    usage_logs: [],
    feedbacks: [],
    nextIds: {
      people: 1,
      interaction_logs: 1,
      usage_logs: 1,
      feedbacks: 1,
    },
  };
}

function loadStore() {
  if (!isWeb || typeof window === "undefined") return emptyStore();

  try {
    const raw = window.localStorage.getItem(WEB_STORE_KEY);
    if (!raw) return emptyStore();
    return { ...emptyStore(), ...JSON.parse(raw) };
  } catch {
    return emptyStore();
  }
}

function saveStore(store) {
  if (!isWeb || typeof window === "undefined") return;
  window.localStorage.setItem(WEB_STORE_KEY, JSON.stringify(store));
}

function insertWeb(table, item) {
  const store = loadStore();
  const id = store.nextIds[table] || 1;
  store.nextIds[table] = id + 1;
  store[table].push({ ...item, id });
  saveStore(store);
  return id;
}

function peopleWithStats(store) {
  return store.people
    .map((person) => {
      const logs = store.interaction_logs.filter((entry) => entry.person_id === person.id);
      return {
        ...person,
        log_count: logs.length,
        avg_fatigue: avg(logs.map((entry) => entry.fatigue_score)),
        avg_boundary: avg(logs.map((entry) => entry.boundary_score)),
      };
    })
    .sort((a, b) => (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at));
}

function withPerson(entry, store) {
  const person = store.people.find((item) => item.id === entry.person_id);
  return {
    ...entry,
    person_name: person?.name || "削除済み",
    relationship_type: person?.relationship_type || "",
  };
}

function avg(values) {
  const valid = values.filter((value) => Number.isFinite(Number(value)));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + Number(value), 0) / valid.length;
}

function recentDateString(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export async function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("hito_kyori_memo.db");
  }
  return dbPromise;
}

export async function initDb() {
  if (isWeb) {
    saveStore(loadStore());
    return;
  }

  const db = await getDb();
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      relationship_type TEXT,
      memo TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS interaction_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL,
      event_date TEXT NOT NULL,
      event_text TEXT,
      mood_before INTEGER CHECK (mood_before BETWEEN 1 AND 5),
      mood_after INTEGER CHECK (mood_after BETWEEN 1 AND 5),
      fatigue_score INTEGER NOT NULL CHECK (fatigue_score BETWEEN 1 AND 5),
      boundary_score INTEGER NOT NULL CHECK (boundary_score BETWEEN 1 AND 5),
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      screen TEXT,
      target_id INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

export async function saveUsageLog(action, screen, targetId = null) {
  if (isWeb) {
    insertWeb("usage_logs", {
      action,
      screen,
      target_id: targetId,
      created_at: new Date().toISOString(),
    });
    return;
  }

  const db = await getDb();
  await db.runAsync(
    "INSERT INTO usage_logs (action, screen, target_id, created_at) VALUES (?, ?, ?, ?)",
    [action, screen, targetId, new Date().toISOString()],
  );
}

export async function listPeople() {
  if (isWeb) {
    return peopleWithStats(loadStore());
  }

  const db = await getDb();
  return db.getAllAsync(`
    SELECT
      people.*,
      COUNT(interaction_logs.id) AS log_count,
      AVG(interaction_logs.fatigue_score) AS avg_fatigue,
      AVG(interaction_logs.boundary_score) AS avg_boundary
    FROM people
    LEFT JOIN interaction_logs ON interaction_logs.person_id = people.id
    GROUP BY people.id
    ORDER BY people.updated_at DESC, people.created_at DESC
  `);
}

export async function createPerson({ name, relationship_type, memo }) {
  if (isWeb) {
    const now = new Date().toISOString();
    const id = insertWeb("people", {
      name: name.trim(),
      relationship_type,
      memo: memo.trim(),
      created_at: now,
      updated_at: now,
    });
    await saveUsageLog("create_person", "people", id);
    return id;
  }

  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    "INSERT INTO people (name, relationship_type, memo, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [name.trim(), relationship_type, memo.trim(), now, now],
  );
  await saveUsageLog("create_person", "people", result.lastInsertRowId);
  return result.lastInsertRowId;
}

export async function deletePerson(id) {
  if (isWeb) {
    const store = loadStore();
    store.people = store.people.filter((person) => person.id !== id);
    store.interaction_logs = store.interaction_logs.filter((entry) => entry.person_id !== id);
    saveStore(store);
    await saveUsageLog("delete_person", "people", id);
    return;
  }

  const db = await getDb();
  await db.runAsync("DELETE FROM people WHERE id = ?", [id]);
  await saveUsageLog("delete_person", "people", id);
}

export async function createInteraction(input) {
  if (isWeb) {
    const now = new Date().toISOString();
    const id = insertWeb("interaction_logs", {
      person_id: input.person_id,
      event_date: input.event_date,
      event_text: input.event_text.trim(),
      mood_before: input.mood_before,
      mood_after: input.mood_after,
      fatigue_score: input.fatigue_score,
      boundary_score: input.boundary_score,
      note: input.note.trim(),
      created_at: now,
      updated_at: now,
    });
    await saveUsageLog("create_interaction", "entry", id);
    return id;
  }

  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO interaction_logs
      (person_id, event_date, event_text, mood_before, mood_after, fatigue_score, boundary_score, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.person_id,
      input.event_date,
      input.event_text.trim(),
      input.mood_before,
      input.mood_after,
      input.fatigue_score,
      input.boundary_score,
      input.note.trim(),
      now,
      now,
    ],
  );
  await saveUsageLog("create_interaction", "entry", result.lastInsertRowId);
  return result.lastInsertRowId;
}

export async function deleteInteraction(id) {
  if (isWeb) {
    const store = loadStore();
    store.interaction_logs = store.interaction_logs.filter((entry) => entry.id !== id);
    saveStore(store);
    await saveUsageLog("delete_interaction", "history", id);
    return;
  }

  const db = await getDb();
  await db.runAsync("DELETE FROM interaction_logs WHERE id = ?", [id]);
  await saveUsageLog("delete_interaction", "history", id);
}

export async function listInteractions(filters = {}) {
  if (isWeb) {
    const store = loadStore();
    return store.interaction_logs
      .filter((entry) => !filters.personId || entry.person_id === filters.personId)
      .filter((entry) => !filters.highFatigue || entry.fatigue_score >= 4)
      .filter((entry) => !filters.highBoundary || entry.boundary_score >= 4)
      .map((entry) => withPerson(entry, store))
      .sort((a, b) => `${b.event_date}${b.created_at}`.localeCompare(`${a.event_date}${a.created_at}`));
  }

  const db = await getDb();
  const where = [];
  const params = [];

  if (filters.personId) {
    where.push("interaction_logs.person_id = ?");
    params.push(filters.personId);
  }
  if (filters.highFatigue) where.push("interaction_logs.fatigue_score >= 4");
  if (filters.highBoundary) where.push("interaction_logs.boundary_score >= 4");

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return db.getAllAsync(
    `
    SELECT interaction_logs.*, people.name AS person_name, people.relationship_type
    FROM interaction_logs
    JOIN people ON people.id = interaction_logs.person_id
    ${whereSql}
    ORDER BY event_date DESC, interaction_logs.created_at DESC
    `,
    params,
  );
}

export async function getInteraction(id) {
  if (isWeb) {
    const store = loadStore();
    const entry = store.interaction_logs.find((item) => item.id === id);
    return entry ? withPerson(entry, store) : null;
  }

  const db = await getDb();
  return db.getFirstAsync(
    `
    SELECT interaction_logs.*, people.name AS person_name, people.relationship_type
    FROM interaction_logs
    JOIN people ON people.id = interaction_logs.person_id
    WHERE interaction_logs.id = ?
    `,
    [id],
  );
}

export async function getWeeklyStats() {
  if (isWeb) {
    const store = loadStore();
    const since = recentDateString(6);
    const grouped = store.interaction_logs
      .filter((entry) => entry.event_date >= since)
      .reduce((acc, entry) => {
        acc[entry.event_date] = acc[entry.event_date] || [];
        acc[entry.event_date].push(entry);
        return acc;
      }, {});

    return Object.entries(grouped)
      .map(([event_date, logs]) => ({
        event_date,
        avg_fatigue: avg(logs.map((entry) => entry.fatigue_score)),
        avg_boundary: avg(logs.map((entry) => entry.boundary_score)),
        log_count: logs.length,
      }))
      .sort((a, b) => a.event_date.localeCompare(b.event_date));
  }

  const db = await getDb();
  return db.getAllAsync(`
    SELECT
      event_date,
      AVG(fatigue_score) AS avg_fatigue,
      AVG(boundary_score) AS avg_boundary,
      COUNT(*) AS log_count
    FROM interaction_logs
    WHERE event_date >= date('now', '-6 days')
    GROUP BY event_date
    ORDER BY event_date
  `);
}

export async function getPeopleStats() {
  if (isWeb) {
    const store = loadStore();
    return peopleWithStats(store)
      .filter((person) => person.log_count > 0)
      .sort((a, b) => Number(b.avg_fatigue || 0) - Number(a.avg_fatigue || 0));
  }

  const db = await getDb();
  return db.getAllAsync(`
    SELECT
      people.id,
      people.name,
      people.relationship_type,
      AVG(interaction_logs.fatigue_score) AS avg_fatigue,
      AVG(interaction_logs.boundary_score) AS avg_boundary,
      COUNT(interaction_logs.id) AS log_count
    FROM interaction_logs
    JOIN people ON interaction_logs.person_id = people.id
    GROUP BY people.id
    ORDER BY avg_fatigue DESC
  `);
}

export async function listRecentWeeklyEntries() {
  if (isWeb) {
    const store = loadStore();
    const since = recentDateString(6);
    return store.interaction_logs
      .filter((entry) => entry.event_date >= since)
      .sort((a, b) => `${b.event_date}${b.created_at}`.localeCompare(`${a.event_date}${a.created_at}`));
  }

  const db = await getDb();
  return db.getAllAsync(`
    SELECT * FROM interaction_logs
    WHERE event_date >= date('now', '-6 days')
    ORDER BY event_date DESC, created_at DESC
  `);
}

export async function createFeedback({ category, message }) {
  if (isWeb) {
    insertWeb("feedbacks", {
      category,
      message: message.trim(),
      created_at: new Date().toISOString(),
    });
    await saveUsageLog("create_feedback", "feedback");
    return;
  }

  const db = await getDb();
  const result = await db.runAsync(
    "INSERT INTO feedbacks (category, message, created_at) VALUES (?, ?, ?)",
    [category, message.trim(), new Date().toISOString()],
  );
  await saveUsageLog("create_feedback", "feedback", result.lastInsertRowId);
}

export async function listFeedbacks() {
  if (isWeb) {
    return loadStore().feedbacks.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const db = await getDb();
  return db.getAllAsync("SELECT * FROM feedbacks ORDER BY created_at DESC");
}

export async function listUsageLogs() {
  if (isWeb) {
    return loadStore().usage_logs.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50);
  }

  const db = await getDb();
  return db.getAllAsync("SELECT * FROM usage_logs ORDER BY created_at DESC LIMIT 50");
}

export async function clearAllData() {
  if (isWeb) {
    saveStore(emptyStore());
    return;
  }

  const db = await getDb();
  await db.execAsync(`
    DELETE FROM interaction_logs;
    DELETE FROM people;
    DELETE FROM feedbacks;
    DELETE FROM usage_logs;
  `);
}
