"use client";

import { useState, useEffect } from "react";

const DAILY_TASKS = [
  { id: "dishes", label: "Dishes done / dishwasher running", emoji: "🍽️" },
  { id: "counters", label: "Kitchen counters wiped", emoji: "✨" },
  { id: "laundry", label: "One load moved forward", emoji: "👕" },
  { id: "toys", label: "Toys corralled into bins", emoji: "🧸" },
  { id: "sweep", label: "Quick floor sweep (high-traffic)", emoji: "🧹" },
];

const WEEKLY_TASKS = [
  { id: "bathroom", label: "Bathroom wipe-down", emoji: "🚿", day: "Monday" },
  { id: "vacuum", label: "Vacuum / mop floors", emoji: "🏠", day: "Tuesday" },
  { id: "trash", label: "Trash & recycling out", emoji: "🗑️", day: "Wednesday" },
  { id: "fridge", label: "Fridge clean-out", emoji: "🥦", day: "Thursday" },
  { id: "sheets", label: "Wash sheets & towels", emoji: "🛏️", day: "Friday" },
  { id: "surfaces", label: "Dust surfaces", emoji: "💨", day: "Saturday" },
  { id: "rest", label: "Wildcard / catch-up / rest", emoji: "☀️", day: "Sunday" },
];

const CLOSING_LOOPS = [
  "Leave a room → take one thing with you",
  "Done eating → plate to sink",
  "Clothes off → hamper or hanger, never a chair",
  "Opened it → close it. Got it out → put it back.",
  "Mail in → sort immediately, recycle junk",
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDayName() {
  return DAYS[new Date().getDay()];
}

function getWeekId() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 604800000;
  return `${now.getFullYear()}-W${Math.floor(diff / oneWeek)}`;
}

function loadJSON(key) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

function saveJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export default function Page() {
  const [dailyChecked, setDailyChecked] = useState({});
  const [weeklyChecked, setWeeklyChecked] = useState({});
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(600);
  const [showRules, setShowRules] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage, auto-reset on new day/week
  useEffect(() => {
    const today = getToday();
    const week = getWeekId();

    const savedDate = localStorage.getItem("checklist-date");
    const savedWeek = localStorage.getItem("checklist-week");

    const daily = savedDate === today ? (loadJSON("checklist-daily") || {}) : {};
    const weekly = savedWeek === week ? (loadJSON("checklist-weekly") || {}) : {};

    setDailyChecked(daily);
    setWeeklyChecked(weekly);

    localStorage.setItem("checklist-date", today);
    localStorage.setItem("checklist-week", week);

    setLoaded(true);
  }, []);

  // Persist daily
  useEffect(() => {
    if (loaded) saveJSON("checklist-daily", dailyChecked);
  }, [dailyChecked, loaded]);

  // Persist weekly
  useEffect(() => {
    if (loaded) saveJSON("checklist-weekly", weeklyChecked);
  }, [weeklyChecked, loaded]);

  // Timer
  useEffect(() => {
    if (!timerActive || timerSeconds <= 0) {
      if (timerSeconds <= 0 && timerActive) setTimerActive(false);
      return;
    }
    const interval = setInterval(() => setTimerSeconds((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const toggleDaily = (id) => setDailyChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleWeekly = (id) => setWeeklyChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const dailyDone = DAILY_TASKS.filter((t) => dailyChecked[t.id]).length;
  const dailyTotal = DAILY_TASKS.length;
  const dailyPct = Math.round((dailyDone / dailyTotal) * 100);

  const todayName = getDayName();
  const todayWeeklyTask = WEEKLY_TASKS.find((t) => t.day === todayName);

  const weeklyDone = WEEKLY_TASKS.filter((t) => weeklyChecked[t.id]).length;
  const weeklyTotal = WEEKLY_TASKS.length;

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const timerFinished = timerSeconds <= 0;

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAF7F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#8B7E6A", fontFamily: "var(--font-newsreader), Georgia, serif" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FAF7F2",
      fontFamily: "var(--font-newsreader), Georgia, serif",
      color: "#3D3529",
      padding: "0",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #5B7A5E 0%, #7A9E7E 100%)",
        padding: "32px 24px 28px",
        color: "#fff",
      }}>
        <h1 style={{
          margin: 0,
          fontSize: "28px",
          fontWeight: 700,
          letterSpacing: "-0.5px",
          lineHeight: 1.2,
        }}>
          The Home Reset
        </h1>
        <p style={{
          margin: "6px 0 0",
          fontSize: "15px",
          opacity: 0.85,
          fontStyle: "italic",
          fontWeight: 400,
        }}>
          {todayName} — small moves, not deep cleans
        </p>
      </div>

      <div style={{ padding: "20px 20px 40px", maxWidth: "500px", margin: "0 auto" }}>

        {/* Timer */}
        <div style={{
          background: timerFinished ? "#E8F5E9" : timerActive ? "#FFF8E1" : "#fff",
          border: `2px solid ${timerFinished ? "#81C784" : timerActive ? "#FFB74D" : "#E8E2D8"}`,
          borderRadius: "16px",
          padding: "20px",
          textAlign: "center",
          marginBottom: "24px",
          transition: "all 0.3s ease",
        }}>
          <div style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "1.5px", color: "#8B7E6A", marginBottom: "8px", fontFamily: "system-ui, sans-serif", fontWeight: 600 }}>
            {timerFinished ? "Time's up — you're done!" : timerActive ? "Reset in progress..." : "10-Minute Reset Timer"}
          </div>
          <div style={{
            fontSize: "48px",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: timerFinished ? "#4CAF50" : timerActive ? "#E65100" : "#3D3529",
            lineHeight: 1,
            marginBottom: "12px",
            fontFamily: "system-ui, sans-serif",
          }}>
            {formatTime(timerSeconds)}
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              onClick={() => {
                if (timerFinished) {
                  setTimerSeconds(600);
                  setTimerActive(false);
                } else {
                  setTimerActive(!timerActive);
                }
              }}
              style={{
                background: timerFinished ? "#4CAF50" : timerActive ? "#E65100" : "#5B7A5E",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "10px 28px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {timerFinished ? "Reset" : timerActive ? "Pause" : "Start"}
            </button>
            {!timerFinished && (
              <button
                onClick={() => { setTimerSeconds(600); setTimerActive(false); }}
                style={{
                  background: "transparent",
                  color: "#8B7E6A",
                  border: "2px solid #E8E2D8",
                  borderRadius: "10px",
                  padding: "10px 20px",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Daily Tasks */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>Daily Reset</h2>
            <span style={{
              fontSize: "14px",
              fontFamily: "system-ui, sans-serif",
              color: dailyPct === 100 ? "#4CAF50" : "#8B7E6A",
              fontWeight: 600,
            }}>
              {dailyDone}/{dailyTotal} {dailyPct === 100 && "✓"}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{
            height: "6px",
            background: "#E8E2D8",
            borderRadius: "3px",
            marginBottom: "14px",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${dailyPct}%`,
              background: dailyPct === 100 ? "#81C784" : "#5B7A5E",
              borderRadius: "3px",
              transition: "width 0.4s ease",
            }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {DAILY_TASKS.map((task) => {
              const checked = !!dailyChecked[task.id];
              return (
                <button
                  key={task.id}
                  onClick={() => toggleDaily(task.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    background: checked ? "#F0EDE6" : "#fff",
                    border: `1.5px solid ${checked ? "#C8C0B0" : "#E8E2D8"}`,
                    borderRadius: "12px",
                    padding: "14px 16px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                    opacity: checked ? 0.65 : 1,
                  }}
                >
                  <span style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "8px",
                    border: `2px solid ${checked ? "#81C784" : "#C8C0B0"}`,
                    background: checked ? "#81C784" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: "14px",
                    color: "#fff",
                    fontWeight: 700,
                    transition: "all 0.2s ease",
                  }}>
                    {checked && "✓"}
                  </span>
                  <span style={{
                    fontSize: "16px",
                    textDecoration: checked ? "line-through" : "none",
                    color: checked ? "#8B7E6A" : "#3D3529",
                    lineHeight: 1.3,
                  }}>
                    {task.emoji} {task.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: "13px", color: "#A89E8C", margin: "10px 0 0 4px", fontStyle: "italic" }}>
            Resets automatically each day
          </p>
        </div>

        {/* Today's Weekly Task */}
        {todayWeeklyTask && (
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "20px", fontWeight: 700 }}>Today&#39;s Weekly Task</h2>
            <button
              onClick={() => toggleWeekly(todayWeeklyTask.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                width: "100%",
                background: weeklyChecked[todayWeeklyTask.id]
                  ? "linear-gradient(135deg, #E8F5E9, #F1F8E9)"
                  : "linear-gradient(135deg, #FFF8E1, #FFF3E0)",
                border: `2px solid ${weeklyChecked[todayWeeklyTask.id] ? "#A5D6A7" : "#FFE0B2"}`,
                borderRadius: "14px",
                padding: "18px 16px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{
                width: "30px",
                height: "30px",
                borderRadius: "10px",
                border: `2px solid ${weeklyChecked[todayWeeklyTask.id] ? "#81C784" : "#FFB74D"}`,
                background: weeklyChecked[todayWeeklyTask.id] ? "#81C784" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "16px",
                color: "#fff",
                fontWeight: 700,
              }}>
                {weeklyChecked[todayWeeklyTask.id] && "✓"}
              </span>
              <div>
                <div style={{
                  fontSize: "17px",
                  fontWeight: 600,
                  textDecoration: weeklyChecked[todayWeeklyTask.id] ? "line-through" : "none",
                  opacity: weeklyChecked[todayWeeklyTask.id] ? 0.6 : 1,
                }}>
                  {todayWeeklyTask.emoji} {todayWeeklyTask.label}
                </div>
                <div style={{ fontSize: "13px", color: "#8B7E6A", marginTop: "2px", fontFamily: "system-ui, sans-serif" }}>
                  One task per day — that&#39;s it
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Weekly Overview */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>Weekly Overview</h2>
            <span style={{
              fontSize: "14px",
              fontFamily: "system-ui, sans-serif",
              color: weeklyDone === weeklyTotal ? "#4CAF50" : "#8B7E6A",
              fontWeight: 600,
            }}>
              {weeklyDone}/{weeklyTotal}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {WEEKLY_TASKS.map((task) => {
              const checked = !!weeklyChecked[task.id];
              const isToday = task.day === todayName;
              return (
                <button
                  key={task.id}
                  onClick={() => toggleWeekly(task.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: checked ? "#E8F5E9" : isToday ? "#FFF8E1" : "#fff",
                    border: `1.5px solid ${checked ? "#A5D6A7" : isToday ? "#FFE0B2" : "#E8E2D8"}`,
                    borderRadius: "10px",
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontFamily: "system-ui, sans-serif",
                    opacity: checked ? 0.7 : 1,
                    textDecoration: checked ? "line-through" : "none",
                    color: "#3D3529",
                  }}
                >
                  <span style={{ fontSize: "15px" }}>{task.emoji}</span>
                  <span style={{ fontWeight: isToday ? 700 : 400 }}>{task.day.slice(0, 3)}</span>
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: "13px", color: "#A89E8C", margin: "10px 0 0 4px", fontStyle: "italic" }}>
            Resets each week — tap any day to check off early
          </p>
        </div>

        {/* Close the Loop Rules */}
        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={() => setShowRules(!showRules)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              background: "#fff",
              border: "1.5px solid #E8E2D8",
              borderRadius: showRules ? "12px 12px 0 0" : "12px",
              padding: "16px",
              cursor: "pointer",
              fontSize: "17px",
              fontWeight: 700,
              color: "#3D3529",
              fontFamily: "var(--font-newsreader), Georgia, serif",
            }}
          >
            <span>🔄 Close the Loop — House Rules</span>
            <span style={{
              transform: showRules ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
              fontSize: "14px",
            }}>▼</span>
          </button>
          {showRules && (
            <div style={{
              background: "#fff",
              border: "1.5px solid #E8E2D8",
              borderTop: "none",
              borderRadius: "0 0 12px 12px",
              padding: "4px 16px 16px",
            }}>
              {CLOSING_LOOPS.map((rule, i) => (
                <div key={i} style={{
                  padding: "10px 0",
                  borderBottom: i < CLOSING_LOOPS.length - 1 ? "1px solid #F0EDE6" : "none",
                  fontSize: "15px",
                  lineHeight: 1.5,
                  color: "#5C5341",
                }}>
                  {rule}
                </div>
              ))}
              <p style={{
                fontSize: "13px",
                color: "#A89E8C",
                margin: "10px 0 0",
                fontStyle: "italic",
                lineHeight: 1.5,
              }}>
                Print these out & stick them on the fridge. These prevent the pile-up.
              </p>
            </div>
          )}
        </div>

        {/* Footer note */}
        <div style={{
          textAlign: "center",
          padding: "16px",
          fontSize: "14px",
          color: "#A89E8C",
          fontStyle: "italic",
          lineHeight: 1.6,
        }}>
          Done beats perfect. If you only do 2 of 5, that&#39;s 2 more than zero.
          <br />Timer stops, you stop. Protect your evening.
        </div>
      </div>
    </div>
  );
}
