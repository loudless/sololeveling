import { useState, useEffect, useCallback } from "react";
import cloud from "./storage";
import RANKS from "./ranks";
import "./app.css";

const STORAGE_KEY = "sl-tracker";
const getToday = () => new Date().toISOString().slice(0, 10);

function calcStreak(history) {
  const days = Object.keys(history)
    .filter((d) => history[d]?._completed)
    .sort()
    .reverse();
  if (!days.length) return 0;
  const today = getToday();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (days[0] !== today && days[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + "T00:00:00");
    const curr = new Date(days[i] + "T00:00:00");
    const diff = (prev - curr) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

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
          const hist = state.history || {};
          setCurrentRankIdx(state.currentRankIdx || 0);
          setStreak(calcStreak(hist));
          setTotalDays(state.totalDays || 0);
          setHistory(hist);
          const today = getToday();
          if (hist[today]) {
            setTodayProgress(hist[today]);
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
    const compact = {};
    for (const [day, val] of Object.entries(hist)) {
      if (day === today) continue;
      if (val?._completed) compact[day] = { _completed: true };
    }
    compact[today] = progress;
    const keys = Object.keys(compact).sort();
    if (keys.length > 60) {
      keys.slice(0, keys.length - 60).forEach((k) => delete compact[k]);
    }
    try {
      await cloud.set(STORAGE_KEY, JSON.stringify({
        currentRankIdx: rankIdx,
        streak: stk,
        totalDays: total,
        history: compact,
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
      const newStreak = calcStreak(newHistory);
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
