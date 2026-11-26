import React, { useEffect, useMemo, useState } from 'react';
import service from './service.js';
import './App.css';

const FILTERS = [
  { key: 'all', label: 'הכול' },
  { key: 'active', label: 'פתוחות' },
  { key: 'done', label: 'הושלמו' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'לילה טוב';
  if (h < 12) return 'בוקר טוב';
  if (h < 17) return 'צהריים טובים';
  if (h < 21) return 'ערב טוב';
  return 'לילה טוב';
}

function App() {
  const [newTodo, setNewTodo] = useState('');
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  async function getTodos() {
    try {
      const data = await service.getTasks();
      setTodos(data);
      setError('');
    } catch {
      setError('אין חיבור לשרת. ודאי שהשרת פועל ונסי שוב.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getTodos();
  }, []);

  async function createTodo(e) {
    e.preventDefault();
    const name = newTodo.trim();
    if (!name) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    setNewTodo('');
    try {
      await service.addTask(name);
      await getTodos();
    } catch {
      setError('לא הצלחתי לשמור את המשימה.');
    }
  }

  async function toggle(todo) {
    const isComplete = !todo.isComplete;
    setTodos(ts => ts.map(t => (t.id === todo.id ? { ...t, isComplete } : t)));
    try {
      await service.setCompleted(todo.id, isComplete);
    } catch {
      await getTodos();
    }
  }

  async function remove(id) {
    setTodos(ts => ts.filter(t => t.id !== id));
    try {
      await service.deleteTask(id);
    } catch {
      await getTodos();
    }
  }

  function startEdit(todo) {
    setEditingId(todo.id);
    setEditText(todo.name || '');
  }

  async function saveEdit(todo) {
    const name = editText.trim();
    setEditingId(null);
    if (!name) return remove(todo.id);
    if (name === todo.name) return;
    setTodos(ts => ts.map(t => (t.id === todo.id ? { ...t, name } : t)));
    try {
      await service.updateName(todo.id, name, !!todo.isComplete);
    } catch {
      await getTodos();
    }
  }

  async function clearCompleted() {
    const done = todos.filter(t => t.isComplete);
    setTodos(ts => ts.filter(t => !t.isComplete));
    await Promise.all(done.map(t => service.deleteTask(t.id).catch(() => {})));
  }

  const total = todos.length;
  const doneCount = todos.filter(t => t.isComplete).length;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;

  const visible = useMemo(() => {
    if (filter === 'active') return todos.filter(t => !t.isComplete);
    if (filter === 'done') return todos.filter(t => t.isComplete);
    return todos;
  }, [todos, filter]);

  const today = new Date().toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="page" dir="rtl">
      <div className="blob blob-1" />
      <div className="blob blob-2" />

      <main className="card">
        <header className="top">
          <div>
            <p className="date">{today}</p>
            <h1 className="title">{greeting()} 👋</h1>
            <p className="subtitle">
              {total === 0
                ? 'אין משימות עדיין. מה בתוכנית להיום?'
                : doneCount === total
                ? 'כל המשימות הושלמו! כל הכבוד 🎉'
                : `נשארו ${total - doneCount} משימות מתוך ${total}`}
            </p>
          </div>
          <div className="ring" style={{ '--p': percent }}>
            <span>{percent}%</span>
          </div>
        </header>

        <form className={`add ${shake ? 'shake' : ''}`} onSubmit={createTodo}>
          <input
            className="add-input"
            placeholder="מה צריך לעשות?"
            value={newTodo}
            onChange={e => setNewTodo(e.target.value)}
            maxLength={100}
            autoFocus
          />
          <button className="add-btn" type="submit" aria-label="הוספת משימה">
            +
          </button>
        </form>

        <nav className="tv-tabs">
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`chip ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="count">
                {f.key === 'all' ? total : f.key === 'done' ? doneCount : total - doneCount}
              </span>
            </button>
          ))}
        </nav>

        {error && <div className="error">{error}</div>}

        <ul className="list">
          {loading && <li className="empty">טוען משימות…</li>}

          {!loading && visible.length === 0 && !error && (
            <li className="empty">
              <span className="empty-icon">
                {filter === 'done' ? '🌱' : '✨'}
              </span>
              {filter === 'done' ? 'עוד לא הושלמו משימות' : 'אין כאן משימות'}
            </li>
          )}

          {visible.map(todo => (
            <li key={todo.id} className={`item ${todo.isComplete ? 'done' : ''}`}>
              <button
                className="check"
                onClick={() => toggle(todo)}
                aria-label={todo.isComplete ? 'סימון כלא בוצע' : 'סימון כבוצע'}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </button>

              {editingId === todo.id ? (
                <input
                  className="tv-edit"
                  value={editText}
                  autoFocus
                  maxLength={100}
                  onChange={e => setEditText(e.target.value)}
                  onBlur={() => saveEdit(todo)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveEdit(todo);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
              ) : (
                <span
                  className="name"
                  onDoubleClick={() => startEdit(todo)}
                  title="לחיצה כפולה לעריכה"
                >
                  {todo.name || <em className="no-name">(משימה ללא שם)</em>}
                </span>
              )}

              <button className="del" onClick={() => remove(todo.id)} aria-label="מחיקה">
                <svg viewBox="0 0 24 24">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>

        {doneCount > 0 && (
          <footer className="foot">
            <span>לחיצה כפולה על משימה לעריכה</span>
            <button className="tv-clear" onClick={clearCompleted}>
              ניקוי משימות שהושלמו
            </button>
          </footer>
        )}
      </main>
    </div>
  );
}

export default App;
