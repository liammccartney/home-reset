import { useState, useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import supabase from "./supabase";

const FONT = "'Newsreader', Georgia, serif";

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

function fireConfetti() {
  const end = Date.now() + 2000;
  const frame = () => {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

// --- Hooks ---

function useUserName() {
  const [name, setName] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setName(localStorage.getItem("home-reset-name"));
    setLoaded(true);
  }, []);

  const saveName = useCallback((n) => {
    localStorage.setItem("home-reset-name", n);
    setName(n);
  }, []);

  return { name, loaded, saveName };
}

function useRealtimeTimer() {
  const [timer, setTimer] = useState({
    is_active: false,
    duration_seconds: 600,
    started_at: null,
    paused_remaining: null,
  });
  const [display, setDisplay] = useState(600);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!supabase) { setLoaded(true); return; }
    supabase.from("timer").select("*").eq("id", 1).single().then(({ data }) => {
      if (data) setTimer(data);
      setLoaded(true);
    });

    const channel = supabase
      .channel("timer-changes")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "timer" }, (payload) => {
        setTimer(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!timer.is_active) {
      setDisplay(timer.paused_remaining ?? timer.duration_seconds);
      return;
    }

    const compute = () => {
      const elapsed = (Date.now() - new Date(timer.started_at).getTime()) / 1000;
      setDisplay(Math.max(0, Math.ceil(timer.duration_seconds - elapsed)));
    };

    compute();
    const interval = setInterval(compute, 200);
    return () => clearInterval(interval);
  }, [timer.is_active, timer.started_at, timer.duration_seconds, timer.paused_remaining]);

  const start = useCallback(async () => {
    if (!supabase) return;
    await supabase.from("timer").update({
      started_at: new Date().toISOString(),
      duration_seconds: 600,
      is_active: true,
      paused_remaining: null,
    }).eq("id", 1);
  }, []);

  const pause = useCallback(async () => {
    if (!supabase) return;
    const elapsed = (Date.now() - new Date(timer.started_at).getTime()) / 1000;
    const remaining = Math.max(0, Math.ceil(timer.duration_seconds - elapsed));
    await supabase.from("timer").update({
      is_active: false,
      paused_remaining: remaining,
    }).eq("id", 1);
  }, [timer.started_at, timer.duration_seconds]);

  const resume = useCallback(async () => {
    if (!supabase) return;
    await supabase.from("timer").update({
      started_at: new Date().toISOString(),
      duration_seconds: timer.paused_remaining,
      is_active: true,
      paused_remaining: null,
    }).eq("id", 1);
  }, [timer.paused_remaining]);

  const reset = useCallback(async () => {
    if (!supabase) return;
    await supabase.from("timer").update({
      is_active: false,
      started_at: null,
      duration_seconds: 600,
      paused_remaining: null,
    }).eq("id", 1);
  }, []);

  const finished = timer.is_active && display <= 0;
  const isPaused = !timer.is_active && timer.paused_remaining != null;

  return { display, isActive: timer.is_active, isPaused, finished, loaded, start, pause, resume, reset };
}

function useRealtimeTasks() {
  const [completions, setCompletions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const today = getToday();
  const weekId = getWeekId();

  useEffect(() => {
    if (!supabase) { setLoaded(true); return; }
    supabase
      .from("task_completions")
      .select("*")
      .in("date_key", [today, weekId])
      .then(({ data }) => {
        if (data) setCompletions(data);
        setLoaded(true);
      });

    const channel = supabase
      .channel("task-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "task_completions" }, (payload) => {
        const row = payload.new;
        if (row.date_key === today || row.date_key === weekId) {
          setCompletions((prev) => prev.some((c) => c.id === row.id) ? prev : [...prev, row]);
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "task_completions" }, (payload) => {
        setCompletions((prev) => prev.filter((c) => c.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [today, weekId]);

  const getCompletion = useCallback(
    (taskId, type) => {
      const dateKey = type === "daily" ? today : weekId;
      return completions.find((c) => c.task_id === taskId && c.task_type === type && c.date_key === dateKey);
    },
    [completions, today, weekId]
  );

  const isChecked = useCallback(
    (taskId, type) => !!getCompletion(taskId, type),
    [getCompletion]
  );

  const getCompletedBy = useCallback(
    (taskId, type) => getCompletion(taskId, type)?.completed_by,
    [getCompletion]
  );

  const toggle = useCallback(
    async (taskId, type, userName) => {
      if (!supabase) return;
      const existing = getCompletion(taskId, type);
      if (existing) {
        await supabase.from("task_completions").delete().eq("id", existing.id);
      } else {
        await supabase.from("task_completions").insert({
          task_id: taskId,
          task_type: type,
          date_key: type === "daily" ? today : weekId,
          completed_by: userName,
        });
      }
    },
    [getCompletion, today, weekId]
  );

  const dailyDone = DAILY_TASKS.filter((t) => isChecked(t.id, "daily")).length;
  const weeklyDone = WEEKLY_TASKS.filter((t) => isChecked(t.id, "weekly")).length;

  return { isChecked, getCompletedBy, toggle, dailyDone, weeklyDone, loaded };
}

// --- Main Component ---

export default function App() {
  const { name, loaded: nameLoaded, saveName } = useUserName();
  const timer = useRealtimeTimer();
  const tasks = useRealtimeTasks();
  const [showRules, setShowRules] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const prevAllDone = useRef(false);

  const todayName = getDayName();
  const todayWeeklyTask = WEEKLY_TASKS.find((t) => t.day === todayName);
  const dailyTotal = DAILY_TASKS.length;
  const dailyPct = Math.round((tasks.dailyDone / dailyTotal) * 100);
  const weeklyTotal = WEEKLY_TASKS.length;

  // Confetti when all daily + today's weekly are done
  useEffect(() => {
    const allDailyDone = tasks.dailyDone === DAILY_TASKS.length;
    const todayWeeklyDone = todayWeeklyTask ? tasks.isChecked(todayWeeklyTask.id, "weekly") : true;
    const allDone = allDailyDone && todayWeeklyDone;

    if (allDone && !prevAllDone.current) {
      fireConfetti();
    }
    prevAllDone.current = allDone;
  }, [tasks.dailyDone, todayWeeklyTask, tasks.isChecked]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const loaded = nameLoaded && timer.loaded && tasks.loaded;

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAF7F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#8B7E6A", fontFamily: FONT }}>Loading...</p>
      </div>
    );
  }

  // Name picker — first visit only
  if (!name) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#FAF7F2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        padding: "20px",
      }}>
        <div style={{
          background: "#fff",
          border: "2px solid #E8E2D8",
          borderRadius: "20px",
          padding: "40px 32px",
          maxWidth: "360px",
          width: "100%",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏠</div>
          <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 700, color: "#3D3529" }}>
            The Home Reset
          </h1>
          <p style={{ margin: "0 0 24px", fontSize: "15px", color: "#8B7E6A", fontStyle: "italic" }}>
            What's your name?
          </p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const trimmed = nameInput.trim();
            if (trimmed) saveName(trimmed);
          }}>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              autoFocus
              style={{
                width: "100%",
                padding: "14px 16px",
                fontSize: "16px",
                border: "2px solid #E8E2D8",
                borderRadius: "12px",
                outline: "none",
                fontFamily: FONT,
                textAlign: "center",
                boxSizing: "border-box",
              }}
            />
            <button
              type="submit"
              disabled={!nameInput.trim()}
              style={{
                marginTop: "12px",
                width: "100%",
                padding: "14px",
                fontSize: "16px",
                fontWeight: 600,
                background: nameInput.trim() ? "#5B7A5E" : "#C8C0B0",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                cursor: nameInput.trim() ? "pointer" : "default",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Let's go
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FAF7F2",
      fontFamily: FONT,
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
          background: timer.finished ? "#E8F5E9" : timer.isActive ? "#FFF8E1" : "#fff",
          border: `2px solid ${timer.finished ? "#81C784" : timer.isActive ? "#FFB74D" : "#E8E2D8"}`,
          borderRadius: "16px",
          padding: "20px",
          textAlign: "center",
          marginBottom: "24px",
          transition: "all 0.3s ease",
        }}>
          <div style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "1.5px", color: "#8B7E6A", marginBottom: "8px", fontFamily: "system-ui, sans-serif", fontWeight: 600 }}>
            {timer.finished ? "Time's up — you're done!" : timer.isActive ? "Reset in progress..." : timer.isPaused ? "Paused" : "10-Minute Reset Timer"}
          </div>
          <div style={{
            fontSize: "48px",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: timer.finished ? "#4CAF50" : timer.isActive ? "#E65100" : "#3D3529",
            lineHeight: 1,
            marginBottom: "12px",
            fontFamily: "system-ui, sans-serif",
          }}>
            {formatTime(timer.display)}
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              onClick={() => {
                if (timer.finished) timer.reset();
                else if (timer.isActive) timer.pause();
                else if (timer.isPaused) timer.resume();
                else timer.start();
              }}
              style={{
                background: timer.finished ? "#4CAF50" : timer.isActive ? "#E65100" : "#5B7A5E",
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
              {timer.finished ? "Reset" : timer.isActive ? "Pause" : timer.isPaused ? "Resume" : "Start"}
            </button>
            {!timer.finished && (
              <button
                onClick={timer.reset}
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
              {tasks.dailyDone}/{dailyTotal} {dailyPct === 100 && "✓"}
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
              const checked = tasks.isChecked(task.id, "daily");
              const who = tasks.getCompletedBy(task.id, "daily");
              return (
                <button
                  key={task.id}
                  onClick={() => tasks.toggle(task.id, "daily", name)}
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
                    flex: 1,
                  }}>
                    {task.emoji} {task.label}
                  </span>
                  {who && (
                    <span style={{
                      fontSize: "12px",
                      color: "#A89E8C",
                      fontFamily: "system-ui, sans-serif",
                      fontWeight: 500,
                    }}>
                      {who}
                    </span>
                  )}
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
            <h2 style={{ margin: "0 0 12px", fontSize: "20px", fontWeight: 700 }}>Today's Weekly Task</h2>
            <button
              onClick={() => tasks.toggle(todayWeeklyTask.id, "weekly", name)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                width: "100%",
                background: tasks.isChecked(todayWeeklyTask.id, "weekly")
                  ? "linear-gradient(135deg, #E8F5E9, #F1F8E9)"
                  : "linear-gradient(135deg, #FFF8E1, #FFF3E0)",
                border: `2px solid ${tasks.isChecked(todayWeeklyTask.id, "weekly") ? "#A5D6A7" : "#FFE0B2"}`,
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
                border: `2px solid ${tasks.isChecked(todayWeeklyTask.id, "weekly") ? "#81C784" : "#FFB74D"}`,
                background: tasks.isChecked(todayWeeklyTask.id, "weekly") ? "#81C784" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "16px",
                color: "#fff",
                fontWeight: 700,
              }}>
                {tasks.isChecked(todayWeeklyTask.id, "weekly") && "✓"}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: "17px",
                  fontWeight: 600,
                  textDecoration: tasks.isChecked(todayWeeklyTask.id, "weekly") ? "line-through" : "none",
                  opacity: tasks.isChecked(todayWeeklyTask.id, "weekly") ? 0.6 : 1,
                }}>
                  {todayWeeklyTask.emoji} {todayWeeklyTask.label}
                </div>
                <div style={{ fontSize: "13px", color: "#8B7E6A", marginTop: "2px", fontFamily: "system-ui, sans-serif" }}>
                  One task per day — that's it
                </div>
              </div>
              {tasks.getCompletedBy(todayWeeklyTask.id, "weekly") && (
                <span style={{
                  fontSize: "12px",
                  color: "#A89E8C",
                  fontFamily: "system-ui, sans-serif",
                  fontWeight: 500,
                }}>
                  {tasks.getCompletedBy(todayWeeklyTask.id, "weekly")}
                </span>
              )}
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
              color: tasks.weeklyDone === weeklyTotal ? "#4CAF50" : "#8B7E6A",
              fontWeight: 600,
            }}>
              {tasks.weeklyDone}/{weeklyTotal}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {WEEKLY_TASKS.map((task) => {
              const checked = tasks.isChecked(task.id, "weekly");
              const isToday = task.day === todayName;
              return (
                <button
                  key={task.id}
                  onClick={() => tasks.toggle(task.id, "weekly", name)}
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
              fontFamily: FONT,
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
          Done beats perfect. If you only do 2 of 5, that's 2 more than zero.
          <br />Timer stops, you stop. Protect your evening.
        </div>
      </div>
    </div>
  );
}
