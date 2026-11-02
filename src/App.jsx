import { useState, useEffect, useMemo } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useParams,
  useNavigate
} from 'react-router-dom'

import './App.css'

const STORAGE_KEY = 'notes-app-v1'
const THEME_KEY = 'notely-theme'

const COLORS = ['yellow', 'green', 'blue', 'pink', 'purple', 'white']

const DEFAULT_NOTES = [
  {
    id: '1',
    title: 'Welcome to Notes4U',
    content: 'Welcome! Organize your thoughts, ideas and daily tasks here. Add tags to keep everything organized.',
    tags: ['work', 'ideas'],
    pinned: true,
    archived: false,
    trashedAt: null,
    color: 'yellow',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
]
// HELPERS
// =====================================

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2)

function normalizeNote(note) {
  return {
    id: String(note.id || uid()),
    title: typeof note.title === 'string' ? note.title : '',
    content: typeof note.content === 'string' ? note.content : '',
    tags: Array.isArray(note.tags)
      ? note.tags.filter(tag => typeof tag === 'string')
      : [],
    pinned: Boolean(note.pinned),
    archived: Boolean(note.archived),
    trashedAt: note.trashedAt || null,
    color: COLORS.includes(note.color) ? note.color : 'white',
    createdAt: Number(note.createdAt) || Date.now(),
    updatedAt: Number(note.updatedAt) || Number(note.createdAt) || Date.now()
  }
}

function loadNotes() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (!saved) return DEFAULT_NOTES.map(normalizeNote)

    const parsed = JSON.parse(saved)

    if (!Array.isArray(parsed)) return DEFAULT_NOTES.map(normalizeNote)

    return parsed.map(normalizeNote)
  } catch (error) {
    console.error('Unable to load notes:', error)
    return DEFAULT_NOTES.map(normalizeNote)
  }
}

function formatDate(timestamp) {
  if (!timestamp) return ''

  return new Date(timestamp).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

// APP
// =====================================

function App() {
  const [notes, setNotes] = useState(loadNotes)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [view, setView] = useState('notes')
  const [toast, setToast] = useState('')
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || 'light'
    } catch {
      return 'light'
    }
  })

  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
    } catch (error) {
      console.error('Unable to save notes:', error)
      showToast('Unable to save notes. Check browser storage.')
    }
  }, [notes])

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      console.warn('Unable to save theme preference')
    }

    document.documentElement.classList.toggle(
      'dark-theme',
      theme === 'dark'
    )
  }, [theme])

  const showToast = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2500)
  }

  const allTags = useMemo(() => {
    return [
      ...new Set(
        notes
          .filter(note => !note.trashedAt)
          .flatMap(note => note.tags)
      )
    ].sort()
  }, [notes])

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase()

    return notes
      .filter(note => {
        const isTrash = Boolean(note.trashedAt)

        if (view === 'trash' && !isTrash) return false
        if (view !== 'trash' && isTrash) return false

        if (view === 'pinned' && (!note.pinned || note.archived)) return false
        if (view === 'archive' && !note.archived) return false

        if (view === 'notes' && note.archived) return false

        const matchesTag = !activeTag || note.tags.includes(activeTag)

        const matchesSearch =
          !query ||
          [note.title, note.content, ...note.tags]
            .join(' ')
            .toLowerCase()
            .includes(query)

        return matchesTag && matchesSearch
      })
      .sort((a, b) => {
        return (
          Number(b.pinned) - Number(a.pinned) ||
          b.updatedAt - a.updatedAt
        )
      })
  }, [notes, search, activeTag, view])

  const upsertNote = (note) => {
    setNotes(prev => {
      const exists = prev.some(item => item.id === note.id)

      if (exists) {
        return prev.map(item =>
          item.id === note.id ? normalizeNote(note) : item
        )
      }

      return [normalizeNote(note), ...prev]
    })

    showToast('Note saved successfully!')
  }

  const moveToTrash = (id) => {
    setNotes(prev =>
      prev.map(note =>
        note.id === id
          ? { ...note, pinned: false, trashedAt: Date.now() }
          : note
      )
    )

    setDeleteTarget(null)
    showToast('Moved to trash')
  }

  const restoreNote = (id) => {
    setNotes(prev =>
      prev.map(note =>
        note.id === id
          ? { ...note, trashedAt: null }
          : note
      )
    )

    showToast('Note restored')
  }

  const permanentlyDelete = (id) => {
    setNotes(prev => prev.filter(note => note.id !== id))
    setDeleteTarget(null)
    showToast('Note permanently deleted')
  }

  const togglePin = (id) => {
    setNotes(prev =>
      prev.map(note =>
        note.id === id
          ? { ...note, pinned: !note.pinned }
          : note
      )
    )

    showToast('Pin status updated')
  }

  const toggleArchive = (id) => {
    setNotes(prev =>
      prev.map(note =>
        note.id === id
          ? { ...note, archived: !note.archived, pinned: false }
          : note
      )
    )

    showToast('Archive status updated')
  }

  const changeColor = (id, color) => {
    setNotes(prev =>
      prev.map(note =>
        note.id === id ? { ...note, color } : note
      )
    )
  }

  const pageTitles = {
    notes: 'All Notes',
    pinned: 'Pinned Notes',
    archive: 'Archived Notes',
    trash: 'Trash'
  }

  return (
    <BrowserRouter>
      <div className="app">

        {/* HEADER */}

        <header className="topbar">

          <Link to="/" className="brand">
            <span className="brand-icon">📝</span>
            <span>Notes4U</span>
          </Link>

          <div className="search-box">
            <span className="search-icon">⌕</span>

            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes, tags and ideas..."
              aria-label="Search notes"
            />

            {search && (
              <button
                className="icon-btn"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="header-actions">

            <button
              className="icon-btn"
              onClick={() =>
                setTheme(theme === 'light' ? 'dark' : 'light')
              }
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? '☾' : '☀'}
            </button>

            <Link to="/new" className="primary-btn">
              + New Note
            </Link>

          </div>
        </header>

        <Routes>

          <Route
            path="/"
            element={
              <MainLayout
                notes={filteredNotes}
                allTags={allTags}
                activeTag={activeTag}
                setActiveTag={setActiveTag}
                view={view}
                setView={setView}
                pageTitle={pageTitles[view]}
                onPin={togglePin}
                onArchive={toggleArchive}
                onDelete={setDeleteTarget}
                onRestore={restoreNote}
                onPermanentDelete={setDeleteTarget}
                onColor={changeColor}
              />
            }
          />

          <Route
            path="/new"
            element={
              <Editor
                notes={notes}
                onSave={upsertNote}
                allTags={allTags}
                showToast={showToast}
              />
            }
          />

          <Route
            path="/edit/:id"
            element={
              <Editor
                notes={notes}
                onSave={upsertNote}
                allTags={allTags}
                showToast={showToast}
              />
            }
          />

        </Routes>

        {/* DELETE CONFIRMATION */}

        {deleteTarget && (
          <div
            className="dialog-backdrop"
            onMouseDown={e => {
              if (e.target === e.currentTarget) {
                setDeleteTarget(null)
              }
            }}
          >
            <div
              className="dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-title"
            >
              <h3 id="delete-title">
                {view === 'trash' ? 'Delete permanently?' : 'Move to trash?'}
              </h3>

              <p>
                {view === 'trash'
                  ? 'This note will be permanently deleted. This action cannot be undone.'
                  : 'You can restore this note later from the Trash section.'}
              </p>

              <div className="dialog-actions">

                <button
                  className="secondary-btn"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>

                <button
                  className="primary-btn"
                  onClick={() =>
                    view === 'trash'
                      ? permanentlyDelete(deleteTarget)
                      : moveToTrash(deleteTarget)
                  }
                >
                  {view === 'trash' ? 'Delete permanently' : 'Move to trash'}
                </button>

              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="toast" role="status" aria-live="polite">
            {toast}
          </div>
        )}

      </div>
    </BrowserRouter>
  )
}

// MAIN LAYOUT
// =====================================

function MainLayout({
  notes,
  allTags,
  activeTag,
  setActiveTag,
  view,
  setView,
  pageTitle,
  onPin,
  onArchive,
  onDelete,
  onRestore,
  onPermanentDelete,
  onColor
}) {
  return (
    <div className="dashboard">

      <aside className="sidebar">

        <Link to="/new" className="sidebar-create">
          ✏️ &nbsp; Create a new note
        </Link>

        <nav className="sidebar-nav" aria-label="Note navigation">

          {[
            { id: 'notes', icon: '▤', label: 'All Notes' },
            { id: 'pinned', icon: '📌', label: 'Pinned' },
            { id: 'archive', icon: '▣', label: 'Archive' },
            { id: 'trash', icon: '♲', label: 'Trash' }
          ].map(item => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => {
                setView(item.id)
                setActiveTag(null)
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}

        </nav>

        <div className="sidebar-heading">
          Labels
        </div>

        <div className="sidebar-tags">

          <button
            className={`tag-nav ${!activeTag ? 'active' : ''}`}
            onClick={() => setActiveTag(null)}
          >
            All labels
          </button>

          {allTags.map(tag => (
            <button
              key={tag}
              className={`tag-nav ${activeTag === tag ? 'active' : ''}`}
              onClick={() =>
                setActiveTag(activeTag === tag ? null : tag)
              }
            >
              # {tag}
            </button>
          ))}

        </div>

      </aside>

      <main className="content">

        <div className="content-heading">
          <div>
            <h1>{pageTitle}</h1>
            <p className="content-subtitle">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'} found
            </p>
          </div>

          {view !== 'trash' && (
            <Link to="/new" className="secondary-btn">
              + Add Note
            </Link>
          )}
        </div>

        <div className="notes-grid">

          {notes.length === 0 ? (

            <div className="empty-state">
              <div className="empty-icon">
                {view === 'trash' ? '🗑️' : '📝'}
              </div>

              <h2>
                {view === 'trash'
                  ? 'Your trash is empty'
                  : 'Nothing here yet'}
              </h2>

              <p>
                {view === 'trash'
                  ? 'Deleted notes will appear here.'
                  : 'Create a note and start organizing your thoughts.'}
              </p>

              {view === 'notes' && (
                <Link to="/new" className="primary-btn">
                  Create your first note
                </Link>
              )}
            </div>

          ) : (

            notes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                view={view}
                onPin={onPin}
                onArchive={onArchive}
                onDelete={view === 'trash' ? onPermanentDelete : onDelete}
                onRestore={onRestore}
                onColor={onColor}
              />
            ))

          )}

        </div>

      </main>

    </div>
  )
}

// NOTE CARD
// =====================================

function NoteCard({
  note,
  view,
  onPin,
  onArchive,
  onDelete,
  onRestore,
  onColor
}) {
  const [showColors, setShowColors] = useState(false)

  const isTrash = view === 'trash'

  return (
    <article className={`note-card ${note.color || 'white'}`}>

      <div className="note-pin">

        {note.pinned && !isTrash && (
          <span title="Pinned">📌</span>
        )}

      </div>

      <Link to={isTrash ? '#' : `/edit/${note.id}`} className="note-open">

        <h3 className="note-title">
          {note.title || 'Untitled'}
        </h3>

        <p className="note-content">
          {note.content || 'No additional content'}
        </p>

      </Link>

      {note.tags.length > 0 && (
        <div className="note-tags">
          {note.tags.map(tag => (
            <span className="note-tag" key={tag}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="note-footer">

        <span className="note-date">
          Edited {formatDate(note.updatedAt)}
        </span>

        <div className="note-actions">

          {isTrash ? (

            <>
              <button
                className="note-action"
                title="Restore"
                aria-label="Restore note"
                onClick={() => onRestore(note.id)}
              >
                ↶
              </button>

              <button
                className="note-action"
                title="Delete permanently"
                aria-label="Delete permanently"
                onClick={() => onDelete(note.id)}
              >
                🗑
              </button>
            </>

          ) : (

            <>
              <button
                className="note-action"
                title={note.pinned ? 'Unpin' : 'Pin'}
                aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                onClick={() => onPin(note.id)}
              >
                {note.pinned ? '📌' : '⌖'}
              </button>

              <button
                className="note-action"
                title="Change color"
                aria-label="Change note color"
                onClick={() => setShowColors(!showColors)}
              >
                ◉
              </button>

              <button
                className="note-action"
                title={note.archived ? 'Unarchive' : 'Archive'}
                aria-label={note.archived ? 'Unarchive note' : 'Archive note'}
                onClick={() => onArchive(note.id)}
              >
                ▣
              </button>

              <button
                className="note-action"
                title="Move to trash"
                aria-label="Move note to trash"
                onClick={() => onDelete(note.id)}
              >
                🗑
              </button>
            </>

          )}

        </div>

      </div>

      {showColors && !isTrash && (
        <div className="color-options" style={{ marginTop: 12 }}>
          {COLORS.map(color => (
            <button
              key={color}
              className={`color-choice ${color}`}
              title={color}
              aria-label={`Set ${color} note color`}
              onClick={() => {
                onColor(note.id, color)
                setShowColors(false)
              }}
            />
          ))}
        </div>
      )}

    </article>
  )
}

// EDITOR
// =====================================

function Editor({ notes, onSave, allTags, showToast }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const existing = notes.find(note => note.id === id)

  const [title, setTitle] = useState(existing?.title || '')
  const [content, setContent] = useState(existing?.content || '')
  const [tags, setTags] = useState(existing?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [color, setColor] = useState(existing?.color || 'white')
  const [error, setError] = useState('')

  // Keep editor synchronized with the selected note.

  useEffect(() => {
    setTitle(existing?.title || '')
    setContent(existing?.content || '')
    setTags(existing?.tags || [])
    setColor(existing?.color || 'white')
    setError('')
  }, [id, existing?.id])

  if (id && !existing) {
    return (
      <div className="editor-wrapper">
        <div className="empty-state">
          <div className="empty-icon">🔎</div>
          <h2>Note not found</h2>
          <p>This note may have been deleted or moved to trash.</p>
          <button
            className="primary-btn"
            onClick={() => navigate('/')}
          >
            Back to notes
          </button>
        </div>
      </div>
    )
  }

  const addTag = (value) => {
    const clean = value
      .replace(/^#/, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .trim()

    if (!clean) return

    if (tags.includes(clean)) {
      setTagInput('')
      return
    }

    setTags(prev => [...prev, clean])
    setTagInput('')
  }

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      setError('Please enter a title or some note content.')
      return
    }

    const now = Date.now()

    const note = {
      id: existing?.id || uid(),
      title: title.trim() || 'Untitled',
      content: content.trim(),
      tags,
      pinned: existing?.pinned || false,
      archived: existing?.archived || false,
      trashedAt: null,
      color,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    }

    onSave(note)
    navigate('/')
  }

  return (
    <div className="editor-wrapper">

      <div className="editor-top">

        <button
          className="secondary-btn"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <span className="content-subtitle">
          {existing ? 'Edit your note' : 'Create a new note'}
        </span>

      </div>

      <div className="editor-card">

        <input
          className="editor-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
          aria-label="Note title"
          maxLength={150}
          autoFocus
        />

        <textarea
          className="editor-content"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write down your thoughts..."
          aria-label="Note content"
        />

        <div className="editor-section">

          <label className="editor-label">
            Tags
          </label>

          <div className="editor-tags">

            {tags.map(tag => (
              <span className="editor-tag" key={tag}>
                #{tag}

                <button
                  onClick={() =>
                    setTags(prev => prev.filter(item => item !== tag))
                  }
                  aria-label={`Remove ${tag} tag`}
                >
                  ×
                </button>
              </span>
            ))}

          </div>

          <div className="tag-input-row">

            <input
              className="tag-input"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag(tagInput)
                }
              }}
              placeholder="Add a tag..."
              aria-label="New tag"
            />

            <button
              className="secondary-btn"
              onClick={() => addTag(tagInput)}
            >
              Add
            </button>

          </div>

          {allTags.filter(tag => !tags.includes(tag)).length > 0 && (
            <div className="note-tags" style={{ marginTop: 13 }}>

              {allTags
                .filter(tag => !tags.includes(tag))
                .slice(0, 8)
                .map(tag => (
                  <button
                    key={tag}
                    className="secondary-btn"
                    style={{ padding: '6px 10px', fontSize: 11 }}
                    onClick={() => addTag(tag)}
                  >
                    + #{tag}
                  </button>
                ))}

            </div>
          )}

        </div>

        <div className="editor-section">

          <label className="editor-label">
            Note color
          </label>

          <div className="color-options">

            {COLORS.map(option => (
              <button
                key={option}
                className={`color-choice ${option} ${color === option ? 'selected' : ''}`}
                title={option}
                aria-label={`Choose ${option} color`}
                aria-pressed={color === option}
                onClick={() => setColor(option)}
              />
            ))}

          </div>

        </div>

        {error && (
          <p role="alert" style={{ color: '#d93025', fontSize: 13 }}>
            {error}
          </p>
        )}

        <div className="editor-actions">

          <button
            className="secondary-btn"
            onClick={() => navigate('/')}
          >
            Cancel
          </button>

          <button
            className="primary-btn"
            onClick={handleSave}
          >
            {existing ? 'Update Note' : 'Save Note'}
          </button>

        </div>

      </div>

    </div>
  )
}

export default App