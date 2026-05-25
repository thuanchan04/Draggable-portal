import { useEffect, useRef, useState } from "react";
import {
  Trash2,
  Pencil,
  Save,
  X,
  StickyNote,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
} from "lucide-react";

import "./App.css";

type Note = {
  id: number;
  title: string;
  content: string;
};

type Toast = {
  id: number;
  message: string;
  type: "success" | "error" | "info";
};

type ConfirmDialog = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  type?: "danger" | "warning" | "info";
};

type RenameDialog = {
  isOpen: boolean;
  id: number | null;
  currentTitle: string;
};

function App() {
  const portalRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);
  const offsetRef = useRef({
    x: 0,
    y: 0,
  });

  const [isOpen, setIsOpen] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState<Note[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const saved = window.localStorage.getItem("notes");

    if (!saved) {
      return [];
    }

    try {
      return JSON.parse(saved) as Note[];
    } catch {
      return [];
    }
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [position, setPosition] = useState({
    x: 300,
    y: 120,
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "info",
  });
  const [renameDialog, setRenameDialog] = useState<RenameDialog>({
    isOpen: false,
    id: null,
    currentTitle: "",
  });
  const [newTitle, setNewTitle] = useState("");

  // SAVE LOCALSTORAGE
  useEffect(() => {
    localStorage.setItem("notes", JSON.stringify(notes));
  }, [notes]);

  // DRAGGING
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragRef.current) return;
      setPosition({
        x: e.clientX - offsetRef.current.x,
        y: e.clientY - offsetRef.current.y,
      });
    };

    const up = () => {
      dragRef.current = false;
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  // START DRAG
  const startDrag = (e: React.MouseEvent) => {
    dragRef.current = true;
    offsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  // Toast notification
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  // Confirm dialog
  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    type: "danger" | "warning" | "info" = "info"
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      onCancel,
      type,
    });
  };

  const closeConfirm = () => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    if (confirmDialog.onCancel) {
      confirmDialog.onCancel();
    }
  };

  const handleConfirm = () => {
    confirmDialog.onConfirm();
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
  };

  // Rename dialog
  const openRenameDialog = (id: number, currentTitle: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setRenameDialog({
      isOpen: true,
      id,
      currentTitle,
    });
    setNewTitle(currentTitle);
  };

  const closeRenameDialog = () => {
    setRenameDialog({ isOpen: false, id: null, currentTitle: "" });
    setNewTitle("");
  };

  const handleRenameConfirm = () => {
    if (!newTitle.trim()) {
      showToast("Title cannot be empty", "error");
      return;
    }

    const trimmedTitle = newTitle.trim();
    const id = renameDialog.id;
    
    if (!id) return;

    const note = notes.find((item) => item.id === id);
    if (!note) return;

    // Check for duplicate title
    const isDuplicate = notes.some(
      (n) => n.title.toLowerCase() === trimmedTitle.toLowerCase() && n.id !== id
    );

    if (isDuplicate) {
      showToast("A note with this title already exists", "error");
      return;
    }

    if (trimmedTitle === note.title) {
      closeRenameDialog();
      return;
    }

    setNotes((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, title: trimmedTitle } : item
      )
    );

    if (selectedId === id) {
      setTitle(trimmedTitle);
    }

    showToast(`Note renamed to "${trimmedTitle}"`, "success");
    closeRenameDialog();
  };

  // Check if title already exists
  const isTitleDuplicate = (newTitle: string, excludeId?: number) => {
    return notes.some(
      (note) =>
        note.title.toLowerCase() === newTitle.toLowerCase() &&
        note.id !== excludeId
    );
  };

  // SAVE
  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      showToast("Please enter both title and content", "error");
      return;
    }

    if (isTitleDuplicate(title.trim())) {
      showToast("A note with this title already exists", "error");
      return;
    }

    showConfirm(
      "Save Note",
      "Are you sure you want to save this note?",
      () => {
        const newNote: Note = {
          id: Date.now(),
          title: title.trim(),
          content: content.trim(),
        };

        setNotes((prev) => [newNote, ...prev]);
        setTitle("");
        setContent("");
        setSelectedId(null);
        showToast("Note saved successfully!", "success");
      },
      undefined,
      "info"
    );
  };

  // UPDATE NOTE
  const handleUpdate = () => {
    if (!title.trim() || !content.trim()) {
      showToast("Please enter both title and content", "error");
      return;
    }

    if (selectedId === null) return;

    if (isTitleDuplicate(title.trim(), selectedId)) {
      showToast("A note with this title already exists", "error");
      return;
    }

    showConfirm(
      "Update Note",
      "Are you sure you want to update this note?",
      () => {
        setNotes((prev) =>
          prev.map((item) =>
            item.id === selectedId
              ? { ...item, title: title.trim(), content: content.trim() }
              : item
          )
        );
        showToast("Note updated successfully!", "success");
      },
      undefined,
      "info"
    );
  };

  // DELETE
  const handleDelete = (id: number, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    const note = notes.find((n) => n.id === id);
    
    showConfirm(
      "Delete Note",
      `Are you sure you want to delete "${note?.title}"? This action cannot be undone.`,
      () => {
        setNotes((prev) => prev.filter((item) => item.id !== id));

        if (selectedId === id) {
          setTitle("");
          setContent("");
          setSelectedId(null);
        }
        
        showToast(`Note "${note?.title}" deleted`, "info");
      },
      undefined,
      "danger"
    );
  };

  // OPEN NOTE
  const openNote = (note: Note) => {
    setSelectedId(note.id);
    setTitle(note.title);
    setContent(note.content);
  };

  // Clear form for new note
  const handleNewNote = () => {
    if (selectedId !== null && (title.trim() || content.trim())) {
      showConfirm(
        "Discard Changes",
        "You have unsaved changes. Are you sure you want to discard them?",
        () => {
          setSelectedId(null);
          setTitle("");
          setContent("");
          setIsOpen(true);
        },
        undefined,
        "warning"
      );
      return;
    }

    setSelectedId(null);
    setTitle("");
    setContent("");
    setIsOpen(true);
  };

  // Close portal
  const handleClosePortal = () => {
    showConfirm(
      "Close Portal",
      "Are you sure you want to close the portal?",
      () => {
        setIsOpen(false);
      },
      undefined,
      "info"
    );
  };

  return (
    <div className="app">
      {/* RENAME DIALOG */}
      {renameDialog.isOpen && (
        <div className="confirm-overlay" onClick={closeRenameDialog}>
          <div className="rename-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="rename-header">
              <div className="rename-icon">
                <Pencil size={24} />
              </div>
              <h3>Rename Note</h3>
              <button className="rename-close" onClick={closeRenameDialog}>
                <X size={20} />
              </button>
            </div>
            <div className="rename-body">
              <label>Enter new title:</label>
              <input
                type="text"
                className="rename-input"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Note title..."
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameConfirm();
                  }
                }}
              />
            </div>
            <div className="rename-footer">
              <button className="rename-cancel" onClick={closeRenameDialog}>
                Cancel
              </button>
              <button className="rename-confirm" onClick={handleRenameConfirm}>
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG */}
      {confirmDialog.isOpen && (
        <div className="confirm-overlay" onClick={closeConfirm}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className={`confirm-header confirm-${confirmDialog.type}`}>
              <div className="confirm-icon">
                {confirmDialog.type === "danger" && <AlertTriangle size={24} />}
                {confirmDialog.type === "warning" && <AlertCircle size={24} />}
                {confirmDialog.type === "info" && <Info size={24} />}
              </div>
              <h3>{confirmDialog.title}</h3>
            </div>
            <div className="confirm-body">
              <p>{confirmDialog.message}</p>
            </div>
            <div className="confirm-footer">
              <button className="confirm-cancel" onClick={closeConfirm}>
                Cancel
              </button>
              <button
                className={`confirm-confirm confirm-${confirmDialog.type}-btn`}
                onClick={handleConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <div className="toast-icon">
              {toast.type === "success" && <CheckCircle size={20} />}
              {toast.type === "error" && <AlertCircle size={20} />}
              {toast.type === "info" && <Info size={20} />}
            </div>
            <div className="toast-message">{toast.message}</div>
            <button
              className="toast-close"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo">
          <StickyNote size={22} />
          <h2>Notes</h2>
        </div>
        <button className="new-note-btn" onClick={handleNewNote}>
          New Note
        </button>
        <div className="notes-list">
          {notes.length === 0 ? (
            <div className="empty-notes">
              <p>No notes yet</p>
              <small>Click "New Note" to get started</small>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={`note-card ${selectedId === note.id ? "active" : ""}`}
                onClick={() => openNote(note)}
              >
                <span className="note-title">{note.title}</span>

                <div className="note-actions">
                  <button
                    className="rename-btn"
                    onClick={(e) => openRenameDialog(note.id, note.title, e)}
                    title="Rename"
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    className="delete-btn"
                    onClick={(e) => handleDelete(note.id, e)}
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        <h1>Draggable Portal</h1>

        {!isOpen && (
          <button className="open-btn" onClick={() => setIsOpen(true)}>
            Open Portal
          </button>
        )}

        {isOpen && (
          <div
            ref={portalRef}
            className="portal"
            style={{
              left: position.x,
              top: position.y,
            }}
          >
            {/* HEADER */}
            <div className="portal-header" onMouseDown={startDrag}>
              <span>My Portal</span>

              <div className="header-actions">
                {selectedId && (
                  <>
                    <button
                      onClick={() => openRenameDialog(selectedId, title)}
                      title="Rename"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() => handleDelete(selectedId)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}

                {selectedId ? (
                  <button onClick={handleUpdate} title="Update" className="save-btn">
                    <Save size={16} />
                  </button>
                ) : (
                  <button onClick={handleSave} title="Save New" className="save-btn">
                    <Save size={16} />
                  </button>
                )}

                <button
                  className="close-btn"
                  onClick={handleClosePortal}
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* TITLE */}
            <input
              className="title-input"
              placeholder="Title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            {/* CONTENT */}
            <textarea
              placeholder="Write note..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;