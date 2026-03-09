import { useState, useEffect, useCallback } from "react";
import cloud from "./storage";
import "./app.css";

const RANKS = [
  {
    id: "F",
    name: "F-Rank",
    subtitle: "Второе Пробуждение",
    weeks: "1–2",
    color: "#6b7280",
    glow: "rgba(107,114,128,0.4)",
    exercises: [
      { id: "pushups", name: "Отжимания", target: 10, icon: "💪" },
      { id: "squats", name: "Приседания", target: 15, icon: "🦵" },
      { id: "crunches", name: "Скручивания", target: 15, icon: "🔥" },
      { id: "walk_km", name: "Ходьба (км)", target: 2, icon: "🚶", step: 0.5 },
      { id: "plank_sec", name: "Планка (сек)", target: 20, icon: "⏱️", step: 5 },
    ],
  },
  {
    id: "E",
    name: "E-Rank",
    subtitle: "Пробуждение",
    weeks: "3–4",
    color: "#22c55e",
    glow: "rgba(34,197,94,0.4)",
    exercises: [
      { id: "pushups", name: "Отжимания", target: 30, icon: "💪" },
      { id: "squats", name: "Приседания", target: 30, icon: "🦵" },
      { id: "crunches", name: "Скручивания", target: 30, icon: "🔥" },
      { id: "walk_km", name: "Ходьба/бег (км)", target: 3, icon: "🏃", step: 0.5 },
    ],
  },
  {
    id: "D",
    name: "D-Rank",
    subtitle: "Адаптация",
    weeks: "5–6",
    color: "#3b82f6",
    glow: "rgba(59,130,246,0.4)",
    exercises: [
      { id: "pushups", name: "Отжимания", target: 50, icon: "💪" },
      { id: "squats", name: "Приседания", target: 50, icon: "🦵" },
      { id: "crunches", name: "Скручивания", target: 50, icon: "🔥" },
      { id: "walk_km", name: "Бег (км)", target: 5, icon: "🏃", step: 0.5 },
      { id: "plank_sec", name: "Планка (сек)", target: 60, icon: "⏱️", step: 5 },
    ],
  },
  {
    id: "C",
    name: "C-Rank",
    subtitle: "Рост",
    weeks: "7–8",
    color: "#a855f7",
    glow: "rgba(168,85,247,0.4)",
    exercises: [
      { id: "pushups", name: "Отжимания", target: 75, icon: "💪" },
      { id: "squats", name: "Приседания", target: 75, icon: "🦵" },
      { id: "crunches", name: "Скручивания", target: 75, icon: "🔥" },
      { id: "walk_km", name: "Бег (км)", target: 7, icon: "🏃", step: 0.5 },
      { id: "plank_sec", name: "Планка (сек)", target: 90, icon: "⏱️", step: 5 },
      { id: "lunges", name: "Выпады (на ногу)", target: 30, icon: "🦿" },
    ],
  },
  {
    id: "B",
    name: "B-Rank",
    subtitle: "Daily Quest",
    weeks: "9–10",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.4)",
    exercises: [
      { id: "pushups", name: "Отжимания", target: 100, icon: "💪" },
      { id: "squats", name: "Приседания", target: 100, icon: "🦵" },
      { id: "crunches", name: "Скручивания", target: 100, icon: "🔥" },
      { id: "walk_km", name: "Бег (км)", target: 10, icon: "🏃", step: 0.5 },
      { id: "plank_sec", name: "Планка (сек)", target: 120, icon: "⏱️", step: 5 },
    ],
  },
  {
    id: "A",
    name: "A-Rank",
    subtitle: "Shadow Monarch",
    weeks: "11+",
    color: "#ef4444",
    glow: "rgba(239,68,68,0.5)",
    exercises: [
      { id: "pushups", name: "Отжимания (усл.)", target: 100, icon: "💪" },
      { id: "squats", name: "Пистолетики", target: 50, icon: "🦵" },
      { id: "crunches", name: "Скручивания", target: 100, icon: "🔥" },
      { id: "walk_km", name: "Бег интервальный (км)", target: 10, icon: "🏃", step: 0.5 },
      { id: "plank_sec", name: "Планка (сек)", target: 180, icon: "⏱️", step: 5 },
      { id: "pullups", name: "Подтягивания", target: 20, icon: "🏋️" },
    ],
  },
];

const STORAGE_KEY = "sl-tracker";
const getToday = () => new Date().toISOString().slice(0, 10);

function haptic(type) {
  try {
    const hf = window.Telegram?.WebApp?.HapticFeedback;
    if (!hf) return;
    if (type === "light") hf.impactOccurred("light");
    else if (type === "medium") hf.impactOccurred("medium");
    else if (type === "success") hf.notificationOccurred("success");
    else if (type === "warning") hf.notificationOccurred("warning");
  } catch {}
}

export default function App() {
  const [currentRankIdx, setCurrentRankIdx] = useState(0);
  const [todayProgress, setTodayProgress] = useState({});
  const [streak, setStreak] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [history, setHistory] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [showRankUp, setShowRankUp] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [activeTab, setActiveTab] = useState("quest");

  useEffect(() => {
    (async () => {
      try {
        const raw = await cloud.get(STORAGE_KEY);
        if (raw) {
          const state = JSON.parse(raw);
          setCurrentRankIdx(state.currentRankIdx || 0);
          setStreak(state.streak || 0);
          setTotalDays(state.totalDays || 0);
          setHistory(state.history || {});
          const today = getToday();
          if (state.history?.[today]) {
            setTodayProgress(state.history[today]);
          }
        }
      } catch (e) {
        console.warn("No saved state:", e);
      }
      setLoaded(true);
    })();
  }, []);

  const save = useCallback(async (progress, rankIdx, stk, total, hist) => {
    const today = getToday();
    const updated = { ...hist, [today]: progress };
    // Keep last 90 days to fit CloudStorage 4KB limit
    const keys = Object.keys(updated).sort();
    if (keys.length > 90) {
      keys.slice(0, keys.length - 90).forEach((k) => delete updated[k]);
    }
    try {
      await cloud.set(STORAGE_KEY, JSON.stringify({
        currentRankIdx: rankIdx,
        streak: stk,
        totalDays: total,
        history: updated,
      }));
    } catch (e) {
      console.error("Save failed:", e);
    }
  }, []);

  const rank = RANKS[currentRankIdx];

  const updateExercise = (exId, delta) => {
    haptic("light");
    const step = rank.exercises.find((e) => e.id === exId)?.step || 1;
    const newVal = Math.max(0, (todayProgress[exId] || 0) + delta * step);
    const newProgress = { ...todayProgress, [exId]: newVal };
    setTodayProgress(newProgress);

    const allDone = rank.exercises.every(
      (ex) => (newProgress[ex.id] || 0) >= ex.target
    );
    const today = getToday();
    const newHistory = { ...history, [today]: newProgress };
    const wasCompleteToday = history[today]?._completed;

    if (allDone && !wasCompleteToday) {
      newProgress._completed = true;
      const newTotal = totalDays + 1;
      const newStreak = streak + 1;
      setTotalDays(newTotal);
      setStreak(newStreak);
      setShowComplete(true);
      haptic("success");
      setTimeout(() => setShowComplete(false), 3000);
      setHistory(newHistory);
      save(newProgress, currentRankIdx, newStreak, newTotal, newHistory);
    } else {
      setHistory(newHistory);
      save(newProgress, currentRankIdx, streak, totalDays, newHistory);
    }
  };

  const rankUp = () => {
    if (currentRankIdx < RANKS.length - 1) {
      const newIdx = currentRankIdx + 1;
      setCurrentRankIdx(newIdx);
      setShowRankUp(true);
      haptic("success");
      setTimeout(() => setShowRankUp(false), 3000);
      save(todayProgress, newIdx, streak, totalDays, history);
    }
  };

  const rankDown = () => {
    if (currentRankIdx > 0) {
      haptic("warning");
      const newIdx = currentRankIdx - 1;
      setCurrentRankIdx(newIdx);
      save(todayProgress, newIdx, streak, totalDays, history);
    }
  };

  const resetAll = () => {
    if (!confirm("Сбросить весь прогресс? Это действие необратимо.")) return;
    haptic("warning");
    setCurrentRankIdx(0);
    setTodayProgress({});
    setStreak(0);
    setTotalDays(0);
    setHistory({});
    save({}, 0, 0, 0, {});
  };

  const shareResults = () => {
    haptic("medium");
    const name = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || "Охотник";
    const exercises = rank.exercises.map((ex) => {
      const val = todayProgress[ex.id] || 0;
      const done = val >= ex.target;
      return `${done ? "✅" : "⬜"} ${ex.name}: ${val}/${ex.target}`;
    }).join("\n");

    const text = [
      `⚔️ DAILY QUEST — ${rank.name}`,
      `Охотник: ${name}`,
      `Прогресс: ${completionPct}%${todayComplete ? " ✅" : ""}`,
      `Streak: ${streak} дн.`,
      ``,
      exercises,
      ``,
      todayComplete
        ? `「 Квест выполнен. 」`
        : `「 Квест в процессе... 」`,
    ].join("\n");

    const encoded = encodeURIComponent(text);
    try {
      window.Telegram?.WebApp?.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(" ")}&text=${encoded}`
      );
    } catch {
      // Fallback for dev/browser
      navigator.clipboard?.writeText(text);
      alert("Скопировано в буфер!");
    }
  };

  const completionPct = rank.exercises.length
    ? Math.round(
        (rank.exercises.reduce(
          (sum, ex) => sum + Math.min(1, (todayProgress[ex.id] || 0) / ex.target),
          0
        ) / rank.exercises.length) * 100
      )
    : 0;

  const todayComplete = completionPct === 100;

  if (!loaded) {
    return (
      <div className="container">
        <div className="loading">SYSTEM LOADING...</div>
      </div>
    );
  }

  return (
    <div className="container">
      {showRankUp && (
        <div className="overlay">
          <div className="overlay-content" style={{ color: RANKS[currentRankIdx].color }}>
            ⚔️ RANK UP ⚔️
            <div className="overlay-sub">{RANKS[currentRankIdx].name}</div>
            <div className="overlay-detail">{RANKS[currentRankIdx].subtitle}</div>
          </div>
        </div>
      )}
      {showComplete && (
        <div className="overlay">
          <div className="overlay-content" style={{ color: "#22c55e" }}>
            ✅ DAILY QUEST COMPLETE
            <div className="overlay-sub">Streak: {streak} дней</div>
          </div>
        </div>
      )}

      <div className="header">
        <div className="system-tag">SYSTEM</div>
        <h1 className="title">DAILY QUEST</h1>
        <div className="rank-badge" style={{ borderColor: rank.color, boxShadow: `0 0 20px ${rank.glow}` }}>
          <span className="rank-letter" style={{ color: rank.color }}>{rank.id}</span>
        </div>
        <div className="rank-name" style={{ color: rank.color }}>{rank.name}</div>
        <div className="rank-subtitle">{rank.subtitle} — нед. {rank.weeks}</div>
      </div>

      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-value">{streak}</div>
          <div className="stat-label">Streak</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{totalDays}</div>
          <div className="stat-label">Всего дней</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: todayComplete ? "#22c55e" : rank.color }}>
            {completionPct}%
          </div>
          <div className="stat-label">Сегодня</div>
        </div>
      </div>

      <div className="progress-outer">
        <div
          className="progress-inner"
          style={{
            width: `${completionPct}%`,
            background: `linear-gradient(90deg, ${rank.color}, ${rank.color}cc)`,
            boxShadow: `0 0 12px ${rank.glow}`,
          }}
        />
      </div>

      <div className="tabs">
        <button
          className="tab"
          style={{
            borderBottomColor: activeTab === "quest" ? rank.color : "transparent",
            color: activeTab === "quest" ? rank.color : "#6b7280",
          }}
          onClick={() => setActiveTab("quest")}
        >
          QUEST
        </button>
        <button
          className="tab"
          style={{
            borderBottomColor: activeTab === "settings" ? rank.color : "transparent",
            color: activeTab === "settings" ? rank.color : "#6b7280",
          }}
          onClick={() => setActiveTab("settings")}
        >
          SETTINGS
        </button>
      </div>

      {activeTab === "quest" && (
        <div className="exercise-list">
          {rank.exercises.map((ex) => {
            const val = todayProgress[ex.id] || 0;
            const pct = Math.min(100, (val / ex.target) * 100);
            const done = val >= ex.target;
            return (
              <div
                key={ex.id}
                className="exercise-card"
                style={{ borderLeftColor: done ? "#22c55e" : rank.color, opacity: done ? 0.7 : 1 }}
              >
                <div className="ex-top">
                  <span className="ex-icon">{ex.icon}</span>
                  <span className="ex-name">{ex.name}</span>
                  <span className="ex-count" style={{ color: done ? "#22c55e" : "#e5e7eb" }}>
                    {val}/{ex.target}
                  </span>
                </div>
                <div className="ex-bar-outer">
                  <div
                    className="ex-bar-inner"
                    style={{
                      width: `${pct}%`,
                      background: done
                        ? "linear-gradient(90deg, #22c55e, #16a34a)"
                        : `linear-gradient(90deg, ${rank.color}, ${rank.color}99)`,
                    }}
                  />
                </div>
                <div className="ex-buttons">
                  <button className="btn btn-minus" onClick={() => updateExercise(ex.id, -1)}>−</button>
                  <button className="btn btn-plus" style={{ background: rank.color }} onClick={() => updateExercise(ex.id, 1)}>
                    +{ex.step || 1}
                  </button>
                  <button className="btn btn-plus" style={{ background: `${rank.color}bb` }} onClick={() => updateExercise(ex.id, 5)}>
                    +{(ex.step || 1) * 5}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "settings" && (
        <div className="settings">
          <div className="settings-group">
            <div className="settings-label">Текущий ранг</div>
            <div className="rank-controls">
              <button className="btn-setting" style={{ opacity: currentRankIdx === 0 ? 0.3 : 1 }} onClick={rankDown}>
                ◀ Понизить
              </button>
              <span className="current-rank" style={{ color: rank.color }}>{rank.name}</span>
              <button className="btn-setting" style={{ opacity: currentRankIdx >= RANKS.length - 1 ? 0.3 : 1 }} onClick={rankUp}>
                Повысить ▶
              </button>
            </div>
          </div>
          <div className="settings-group">
            <div className="settings-label">Все ранги</div>
            <div className="rank-pills">
              {RANKS.map((r, i) => (
                <div
                  key={r.id}
                  className="rank-pill"
                  style={{
                    background: i === currentRankIdx ? r.color : "transparent",
                    borderColor: r.color,
                    color: i === currentRankIdx ? "#0a0a0f" : r.color,
                  }}
                >
                  {r.id}
                </div>
              ))}
            </div>
          </div>
          <div className="settings-group" style={{ marginTop: 30 }}>
            <button className="btn-reset" onClick={resetAll}>⚠️ Сбросить всё</button>
          </div>
        </div>
      )}

      <button
        className="btn-share"
        style={{
          borderColor: `${rank.color}44`,
          color: rank.color,
          background: `${rank.color}11`,
        }}
        onClick={shareResults}
      >
        📤 Поделиться {todayComplete ? "победой" : "прогрессом"}
      </button>

      <div className="footer">
        {todayComplete
          ? "「 Квест выполнен. Ожидайте следующий квест. 」"
          : "「 Невыполнение квеста повлечёт наказание. 」"}
      </div>
    </div>
  );
}
