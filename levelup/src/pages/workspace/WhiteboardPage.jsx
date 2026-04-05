import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import {
  Download,
  Eraser,
  Grid2x2,
  Highlighter,
  Maximize2,
  Minus,
  Minimize2,
  PenTool,
  Plus,
  Redo2,
  RotateCcw,
  Sparkles,
  StickyNote,
  Trash2,
  Undo2,
} from "lucide-react";
import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";
import { db } from "../../firebase";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";

const DEFAULT_ROOM_ID = "levelup-live";
const BOARD_WIDTH = 1600;
const BOARD_HEIGHT = 900;
const NOTE_CARD_WIDTH = 320;
const NOTE_CARD_HEIGHT = 230;
const MIN_BRUSH = 6;
const MAX_BRUSH = 22;
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 2.25;
const NOTE_SYNC_DELAY_MS = 90;
const DRAFT_SYNC_INTERVAL_MS = 50;

const COLOR_SWATCHES = [
  "#FF2D8D",
  "#007BFF",
  "#8A2BE2",
  "#FFD60A",
  "#FF7A00",
];

const TOOL_OPTIONS = [
  {
    id: "pen",
    label: "Pen",
    hint: "Sketch formulas, flows, and quick ideas.",
    icon: PenTool,
  },
  {
    id: "highlighter",
    label: "Highlighter",
    hint: "Mark key steps and important concepts.",
    icon: Highlighter,
  },
  {
    id: "eraser",
    label: "Eraser",
    hint: "Clean a section without resetting the board.",
    icon: Eraser,
  },
];

const NOTE_TONES = [
  {
    id: "amber",
    label: "Amber",
    bg: "bg-amber-300/90",
    border: "border-amber-100/80",
    text: "text-[#422006]",
    fill: "rgba(252, 211, 77, 0.96)",
    stroke: "rgba(252, 250, 245, 0.75)",
  },
  {
    id: "rose",
    label: "Rose",
    bg: "bg-rose-300/90",
    border: "border-rose-100/80",
    text: "text-[#4a1024]",
    fill: "rgba(253, 164, 175, 0.95)",
    stroke: "rgba(255, 241, 242, 0.8)",
  },
  {
    id: "sky",
    label: "Sky",
    bg: "bg-sky-300/90",
    border: "border-sky-100/80",
    text: "text-[#082f49]",
    fill: "rgba(125, 211, 252, 0.95)",
    stroke: "rgba(240, 249, 255, 0.82)",
  },
];

const INITIAL_NOTES = [
  {
    id: "starter-note-1",
    title: "Session Goal",
    body: "Map the problem, solve step by step, then leave the final takeaway here.",
    tone: "amber",
    x: 1000,
    y: 92,
  },
  {
    id: "starter-note-2",
    title: "Tutor Cue",
    body: "Use the highlighter for key formulas and the pen for working steps.",
    tone: "sky",
    x: 1120,
    y: 350,
  },
];

export default function WhiteboardPage() {
  const user = useWorkspaceStore((state) => state.user);
  const profile = useWorkspaceStore((state) => state.profile);
  const [searchParams, setSearchParams] = useSearchParams();

  const roomId = sanitizeRoomId(searchParams.get("board") || DEFAULT_ROOM_ID);

  const canvasRef = useRef(null);
  const boardRef = useRef(null);
  const fullscreenRef = useRef(null);
  const drawingRef = useRef({ active: false, pointerId: null });
  const draftStrokeRef = useRef(null);
  const noteDragRef = useRef(null);
  const noteSyncTimersRef = useRef(new Map());
  const draftSyncMetaRef = useRef({ lastAt: 0, timerId: null });

  const [strokes, setStrokes] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [myStrokeHistory, setMyStrokeHistory] = useState([]);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [brushSize, setBrushSize] = useState(6);
  const [showGrid, setShowGrid] = useState(true);
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [roomInput, setRoomInput] = useState(roomId);
  const [syncStatus, setSyncStatus] = useState(user.uid ? "connecting" : "offline");
  const [collaborators, setCollaborators] = useState([]);
  const [copiedState, setCopiedState] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const accountName = profile?.name || user.name || "Student";
  const accountEmail = profile?.email || user.email || "";
  const activeNote = notes.find((note) => note.id === activeNoteId) || null;
  const activeCollaborators = collaborators.filter((participant) =>
    isParticipantActive(participant?.lastSeen),
  );
  const canUndo = Boolean(myStrokeHistory.length);
  const canRedo = Boolean(redoStack.length);
  const liveInkCount = strokes.length + drafts.length + (draftStrokeRef.current ? 1 : 0);

  useEffect(() => {
    setRoomInput(roomId);
  }, [roomId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.repeat) {
        return;
      }

      if (event.key.toLowerCase() !== "f" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      void handleToggleFullscreen();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    drawBoardScene({
      canvas: canvasRef.current,
      strokes,
      draftStrokes: collectDraftStrokes(drafts, draftStrokeRef.current),
      showGrid,
    });
  }, [drafts, showGrid, strokes]);

  useEffect(() => {
    if (!user.uid || !roomId) {
      setSyncStatus("offline");
      return undefined;
    }

    let active = true;
    let unsubscribeRoom = () => undefined;
    let heartbeatId = null;
    const roomRef = ref(db, `whiteboards/${roomId}`);
    const participantRef = ref(db, `whiteboards/${roomId}/participants/${user.uid}`);
    const userDraftRef = ref(db, `whiteboards/${roomId}/drafts/${user.uid}`);

    setSyncStatus("connecting");
    setStrokes([]);
    setNotes([]);
    setRedoStack([]);
    setMyStrokeHistory([]);
    setDrafts([]);
    setCollaborators([]);
    setActiveNoteId("");

    const initializeRoom = async () => {
      try {
        const snapshot = await get(roomRef);

        if (!snapshot.exists()) {
          await set(roomRef, buildInitialBoardRoomPayload({ roomId, createdBy: user.uid }));
        } else {
          await update(ref(db, `whiteboards/${roomId}/meta`), {
            roomId,
            updatedAt: serverTimestamp(),
            updatedAtMs: Date.now(),
          });
        }

        await set(participantRef, {
          uid: user.uid,
          name: accountName,
          email: accountEmail,
          avatar: accountName.trim().charAt(0).toUpperCase() || "S",
          lastSeen: serverTimestamp(),
          lastSeenMs: Date.now(),
        });

        await onDisconnect(participantRef).remove();
        await onDisconnect(userDraftRef).remove();

        heartbeatId = window.setInterval(() => {
          void update(participantRef, {
            name: accountName,
            email: accountEmail,
            avatar: accountName.trim().charAt(0).toUpperCase() || "S",
            lastSeen: serverTimestamp(),
            lastSeenMs: Date.now(),
          });
        }, 20000);
      } catch (error) {
        console.error("Whiteboard room init error:", error);
        if (active) {
          setSyncStatus("error");
        }
      }
    };

    void initializeRoom();

    unsubscribeRoom = onValue(
      roomRef,
      (snapshot) => {
        if (!active) {
          return;
        }

        const data = snapshot.exists() ? snapshot.val() : {};
        const nextStrokes = sortCollectionByTime(data?.strokes);
        const nextNotes = sortCollectionByTime(data?.notes);
        const nextDrafts = sortCollectionByTime(data?.drafts).filter(
          (draft) => draft.authorId !== user.uid,
        );
        const nextCollaborators = sortParticipants(data?.participants);

        setStrokes(nextStrokes);
        setNotes(nextNotes);
        setDrafts(nextDrafts);
        setCollaborators(nextCollaborators);
        setActiveNoteId((current) =>
          nextNotes.some((note) => note.id === current) ? current : nextNotes[0]?.id || "",
        );
        setMyStrokeHistory((current) =>
          current.filter((strokeId) =>
            nextStrokes.some(
              (stroke) => stroke.id === strokeId && String(stroke.authorId || "") === user.uid,
            ),
          ),
        );
        setRedoStack((current) =>
          current.filter(
            (stroke) =>
              stroke.roomId === roomId &&
              !nextStrokes.some((existingStroke) => existingStroke.id === stroke.id),
          ),
        );
        setSyncStatus("live");
      },
      (error) => {
        console.error("Whiteboard realtime sync error:", error);
        if (active) {
          setSyncStatus("error");
        }
      },
    );

    return () => {
      active = false;
      unsubscribeRoom();
      clearAllDeferredNoteSyncs(noteSyncTimersRef.current);
      clearDraftSyncTimer(draftSyncMetaRef);
      draftStrokeRef.current = null;
      noteDragRef.current = null;
      setIsDrawing(false);
      if (heartbeatId) {
        window.clearInterval(heartbeatId);
      }
      void remove(participantRef).catch(() => undefined);
      void remove(userDraftRef).catch(() => undefined);
    };
  }, [accountEmail, accountName, roomId, user.uid]);

  const renderBoard = () => {
    drawBoardScene({
      canvas: canvasRef.current,
      strokes,
      draftStrokes: collectDraftStrokes(drafts, draftStrokeRef.current),
      showGrid,
    });
  };

  const queueDraftSync = (stroke, force = false) => {
    if (!user.uid || !roomId || !stroke) {
      return;
    }

    const now = Date.now();
    if (!force && now - draftSyncMetaRef.current.lastAt < DRAFT_SYNC_INTERVAL_MS) {
      clearDraftSyncTimer(draftSyncMetaRef);
      draftSyncMetaRef.current.timerId = window.setTimeout(() => {
        queueDraftSync(stroke, true);
      }, DRAFT_SYNC_INTERVAL_MS);
      return;
    }

    draftSyncMetaRef.current.lastAt = now;
    clearDraftSyncTimer(draftSyncMetaRef);
    void set(ref(db, `whiteboards/${roomId}/drafts/${user.uid}`), {
      ...serializeStrokeForStorage(stroke, user.uid, accountName),
      updatedAt: serverTimestamp(),
      updatedAtMs: Date.now(),
      roomId,
    }).catch((error) => {
      console.error("Whiteboard draft sync error:", error);
      setSyncStatus("error");
    });
  };

  const persistStroke = async (stroke) => {
    if (!user.uid || !roomId || !stroke) {
      return;
    }

    await set(
      ref(db, `whiteboards/${roomId}/strokes/${stroke.id}`),
      serializeStrokeForStorage(stroke, user.uid, accountName, roomId),
    );

    await update(ref(db, `whiteboards/${roomId}/meta`), {
      updatedAt: serverTimestamp(),
      updatedAtMs: Date.now(),
    });
  };

  const scheduleNoteSync = (note, delayMs = NOTE_SYNC_DELAY_MS) => {
    if (!user.uid || !roomId || !note?.id) {
      return;
    }

    const timerMap = noteSyncTimersRef.current;
    const existingTimer = timerMap.get(note.id);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    const timerId = window.setTimeout(() => {
      timerMap.delete(note.id);
      void set(
        ref(db, `whiteboards/${roomId}/notes/${note.id}`),
        serializeNoteForStorage(note, user.uid, accountName),
      ).catch((error) => {
        console.error("Whiteboard note sync error:", error);
        setSyncStatus("error");
      });
      void update(ref(db, `whiteboards/${roomId}/meta`), {
        updatedAt: serverTimestamp(),
        updatedAtMs: Date.now(),
      });
    }, delayMs);

    timerMap.set(note.id, timerId);
  };

  const flushNoteSync = (noteId) => {
    if (!noteId) {
      return;
    }

    const timerId = noteSyncTimersRef.current.get(noteId);
    if (timerId) {
      window.clearTimeout(timerId);
      noteSyncTimersRef.current.delete(noteId);
    }

    const note = notes.find((item) => item.id === noteId);
    if (!note || !user.uid || !roomId) {
      return;
    }

    void set(
      ref(db, `whiteboards/${roomId}/notes/${note.id}`),
      serializeNoteForStorage(note, user.uid, accountName),
    ).catch((error) => {
      console.error("Whiteboard note flush error:", error);
      setSyncStatus("error");
    });
  };

  const handleCanvasPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (!canvasRef.current) {
      return;
    }

    const point = getBoardPointFromClient(event.clientX, event.clientY, canvasRef.current);
    draftStrokeRef.current = createStroke({
      point,
      tool,
      color,
      brushSize,
    });
    drawingRef.current = {
      active: true,
      pointerId: event.pointerId,
    };
    setIsDrawing(true);
    canvasRef.current.setPointerCapture?.(event.pointerId);
    queueDraftSync(draftStrokeRef.current, true);
    renderBoard();
  };

  const handleCanvasPointerMove = (event) => {
    if (!drawingRef.current.active || drawingRef.current.pointerId !== event.pointerId) {
      return;
    }

    const point = getBoardPointFromClient(event.clientX, event.clientY, canvasRef.current);
    draftStrokeRef.current = {
      ...draftStrokeRef.current,
      points: [...(draftStrokeRef.current?.points || []), point],
      updatedAtMs: Date.now(),
    };
    queueDraftSync(draftStrokeRef.current);
    renderBoard();
  };

  const endStroke = (event) => {
    if (!drawingRef.current.active || drawingRef.current.pointerId !== event.pointerId) {
      return;
    }

    canvasRef.current?.releasePointerCapture?.(event.pointerId);
    const finalizedStroke = draftStrokeRef.current;

    drawingRef.current = {
      active: false,
      pointerId: null,
    };
    draftStrokeRef.current = null;
    setIsDrawing(false);
    clearDraftSyncTimer(draftSyncMetaRef);
    void remove(ref(db, `whiteboards/${roomId}/drafts/${user.uid}`)).catch(() => undefined);

    if (!finalizedStroke?.points?.length) {
      renderBoard();
      return;
    }

    setStrokes((current) => upsertCollectionItem(current, finalizedStroke));
    setMyStrokeHistory((current) => [...current, finalizedStroke.id]);
    setRedoStack([]);
    void persistStroke(finalizedStroke).catch((error) => {
      console.error("Whiteboard stroke save error:", error);
      setSyncStatus("error");
    });
  };

  const handleUndo = () => {
    if (!canUndo) {
      return;
    }

    const strokeId = myStrokeHistory[myStrokeHistory.length - 1];
    const stroke = strokes.find((item) => item.id === strokeId);
    if (!stroke) {
      setMyStrokeHistory((current) => current.slice(0, -1));
      return;
    }

    setStrokes((current) => current.filter((item) => item.id !== strokeId));
    setMyStrokeHistory((current) => current.slice(0, -1));
    setRedoStack((current) => [...current, stroke]);
    void remove(ref(db, `whiteboards/${roomId}/strokes/${strokeId}`)).catch((error) => {
      console.error("Whiteboard undo error:", error);
      setSyncStatus("error");
    });
  };

  const handleRedo = () => {
    if (!canRedo) {
      return;
    }

    const stroke = redoStack[redoStack.length - 1];
    if (!stroke) {
      return;
    }

    setRedoStack((current) => current.slice(0, -1));
    setMyStrokeHistory((current) => [...current, stroke.id]);
    setStrokes((current) => upsertCollectionItem(current, stroke));
    void persistStroke({
      ...stroke,
      updatedAtMs: Date.now(),
    }).catch((error) => {
      console.error("Whiteboard redo error:", error);
      setSyncStatus("error");
    });
  };

  const handleClearBoard = async () => {
    draftStrokeRef.current = null;
    setIsDrawing(false);
    setStrokes([]);
    setRedoStack([]);
    setMyStrokeHistory([]);

    await Promise.all([
      set(ref(db, `whiteboards/${roomId}/strokes`), null),
      set(ref(db, `whiteboards/${roomId}/drafts`), null),
      update(ref(db, `whiteboards/${roomId}/meta`), {
        updatedAt: serverTimestamp(),
        updatedAtMs: Date.now(),
      }),
    ]);
  };

  const handleResetWorkspace = async () => {
    draftStrokeRef.current = null;
    setIsDrawing(false);
    setStrokes([]);
    setDrafts([]);
    setRedoStack([]);
    setMyStrokeHistory([]);
    setTool("pen");
    setColor(COLOR_SWATCHES[0]);
    setBrushSize(6);
    setShowGrid(true);
    setZoomLevel(1);

    await Promise.all([
      set(ref(db, `whiteboards/${roomId}/strokes`), null),
      set(ref(db, `whiteboards/${roomId}/drafts`), null),
      set(ref(db, `whiteboards/${roomId}/notes`), buildSeedNotes()),
      update(ref(db, `whiteboards/${roomId}/meta`), {
        roomId,
        updatedAt: serverTimestamp(),
        updatedAtMs: Date.now(),
      }),
    ]);
  };

  const handleAddNote = (tone = NOTE_TONES[0].id) => {
    const nextNote = {
      id: createEntityId("note"),
      title: "New Note",
      body: "Add a concept, doubt, formula, or tutor instruction here.",
      tone,
      x: 70 + (notes.length % 3) * 120,
      y: 80 + (notes.length % 4) * 90,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
      authorId: user.uid,
    };

    setNotes((current) => [...current, nextNote]);
    setActiveNoteId(nextNote.id);
    scheduleNoteSync(nextNote, 0);
  };

  const handleDeleteNote = (noteId) => {
    if (!noteId) {
      return;
    }

    const timerId = noteSyncTimersRef.current.get(noteId);
    if (timerId) {
      window.clearTimeout(timerId);
      noteSyncTimersRef.current.delete(noteId);
    }

    const remainingNotes = notes.filter((note) => note.id !== noteId);
    setNotes(remainingNotes);
    setActiveNoteId(remainingNotes[0]?.id || "");
    void remove(ref(db, `whiteboards/${roomId}/notes/${noteId}`)).catch((error) => {
      console.error("Whiteboard note delete error:", error);
      setSyncStatus("error");
    });
  };

  const handleNoteChange = (noteId, patch, immediate = false) => {
    let nextNote = null;

    setNotes((current) =>
      current.map((note) => {
        if (note.id !== noteId) {
          return note;
        }

        nextNote = {
          ...note,
          ...patch,
          updatedAtMs: Date.now(),
          authorId: note.authorId || user.uid,
        };
        return nextNote;
      }),
    );

    if (!nextNote) {
      return;
    }

    if (immediate) {
      scheduleNoteSync(nextNote, 0);
    } else {
      scheduleNoteSync(nextNote);
    }
  };

  const handleNotePointerDown = (event, note) => {
    if (!boardRef.current) {
      return;
    }

    event.stopPropagation();
    const point = getBoardPointFromClient(event.clientX, event.clientY, boardRef.current);
    noteDragRef.current = {
      id: note.id,
      offsetX: point.x - note.x,
      offsetY: point.y - note.y,
    };
    setActiveNoteId(note.id);
  };

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!noteDragRef.current || !boardRef.current) {
        return;
      }

      event.preventDefault();
      const point = getBoardPointFromClient(event.clientX, event.clientY, boardRef.current);
      const { id, offsetX, offsetY } = noteDragRef.current;
      const patch = {
        x: clamp(point.x - offsetX, 26, BOARD_WIDTH - NOTE_CARD_WIDTH - 26),
        y: clamp(point.y - offsetY, 26, BOARD_HEIGHT - NOTE_CARD_HEIGHT - 26),
      };

      handleNoteChange(id, patch);
    };

    const handlePointerUp = () => {
      if (noteDragRef.current?.id) {
        flushNoteSync(noteDragRef.current.id);
      }
      noteDragRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [notes, roomId, user.uid]);

  const handleExport = () => {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = BOARD_WIDTH;
    exportCanvas.height = BOARD_HEIGHT;

    drawBoardScene({
      canvas: exportCanvas,
      strokes,
      draftStrokes: drafts,
      showGrid,
      notes,
      includeNotes: true,
    });

    const link = document.createElement("a");
    link.href = exportCanvas.toDataURL("image/png");
    link.download = `${roomId}-whiteboard.png`;
    link.click();
  };

  const handleJoinRoom = () => {
    const nextRoomId = sanitizeRoomId(roomInput);
    setSearchParams(nextRoomId === DEFAULT_ROOM_ID ? {} : { board: nextRoomId });
    setCopiedState("");
  };

  const handleCopyRoomLink = async () => {
    if (typeof window === "undefined" || !navigator?.clipboard) {
      return;
    }

    const shareUrl = `${window.location.origin}${window.location.pathname}?board=${roomId}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopiedState("copied");
    window.setTimeout(() => setCopiedState(""), 1800);
  };

  const handleToggleFullscreen = async () => {
    if (!fullscreenRef.current || typeof document === "undefined") {
      return;
    }

    try {
      if (document.fullscreenElement === fullscreenRef.current) {
        await document.exitFullscreen();
        return;
      }

      await fullscreenRef.current.requestFullscreen();
    } catch (error) {
      console.error("Whiteboard fullscreen error:", error);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Collaborative Whiteboard"
        title="Teach, solve, and collaborate on one live board."
        description="Join a live whiteboard room, draw together in realtime, leave sticky-note guidance, and zoom the board when you need a larger teaching surface."
        aside={
          <div className="flex flex-col gap-3 lg:items-end">
            <button
              type="button"
              onClick={() => void handleToggleFullscreen()}
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-50 transition hover:bg-red-500/15 lg:self-auto"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {isFullscreen ? "Exit Fullscreen" : "Open Fullscreen Board"}
            </button>
            <div className="flex flex-wrap gap-3">
              <HeaderChip label={`${liveInkCount}`} caption="live ink" />
              <HeaderChip label={`${notes.length}`} caption="notes" />
              <HeaderChip label={`${activeCollaborators.length}`} caption="online" />
              <HeaderChip label={`${Math.round(zoomLevel * 100)}%`} caption="zoom" />
            </div>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <GlassCard className="p-5">
          <div className="rounded-[26px] border border-red-400/20 bg-red-500/10 p-5">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-red-100/80">
              <Sparkles className="h-4 w-4" />
              Live Whiteboard Room
            </div>
            <div className="mt-4 text-xl font-bold text-white">Run board sessions that multiple users can join.</div>
            <div className="mt-3 text-sm leading-7 text-white/65">
              Share the room link, draw in realtime, and zoom into the board instead of being forced into one fixed canvas size.
            </div>
          </div>

          <div className="mt-5">
            <SectionLabel>Room</SectionLabel>
              <div className="mt-3 rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">Current room</div>
                <div className="mt-2 text-lg font-semibold text-white">{roomId}</div>
                <div className="mt-1 text-sm text-white/55">
                  Sync status: <span className="capitalize text-white/80">{syncStatus}</span>
                </div>
                <div className="mt-2 text-sm text-white/50">
                  Press <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-white/78">F</span>{" "}
                  to toggle fullscreen for the board.
                </div>

                <label className="mt-4 block text-[11px] uppercase tracking-[0.18em] text-white/38">
                  Join another room
                </label>
              <input
                value={roomInput}
                onChange={(event) => setRoomInput(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28"
                placeholder="Enter room code"
              />

              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={handleJoinRoom}
                  className="flex-1 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-50 transition hover:bg-red-500/15"
                >
                  Join Room
                </button>
                <button
                  type="button"
                  onClick={handleCopyRoomLink}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/78 transition hover:bg-white/10 hover:text-white"
                >
                  {copiedState === "copied" ? "Copied" : "Copy Link"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <SectionLabel>Collaborators</SectionLabel>
            <div className="mt-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap gap-2">
                {activeCollaborators.length ? (
                  activeCollaborators.map((participant) => (
                    <div
                      key={participant.uid || participant.email || participant.name}
                      className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/15 text-sm font-semibold text-red-50">
                        {participant.avatar || participant.name?.charAt(0)?.toUpperCase() || "S"}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white/85">
                          {participant.name || "Student"}
                        </div>
                        <div className="text-xs text-white/42">
                          {participant.email || "Board collaborator"}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm leading-7 text-white/55">
                    No active collaborators detected in this room yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <SectionLabel>Tools</SectionLabel>
            <div className="mt-3 space-y-3">
              {TOOL_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTool(option.id)}
                  className={`w-full rounded-[24px] border p-4 text-left transition ${
                    tool === option.id
                      ? "border-red-400/25 bg-red-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-black/20 text-red-100">
                      <option.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{option.label}</div>
                      <div className="mt-1 text-sm leading-6 text-white/52">{option.hint}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <SectionLabel>Colors</SectionLabel>
            <div className="mt-3 flex flex-wrap gap-3">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  aria-label={`Use ${swatch} ink`}
                  className={`h-10 w-10 rounded-2xl border transition ${
                    color === swatch ? "border-white scale-105" : "border-white/10"
                  }`}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>

          <div className="mt-5">
            <SectionLabel>Brush Size</SectionLabel>
            <div className="mt-3 rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setBrushSize((current) => clamp(current - 2, MIN_BRUSH, MAX_BRUSH))}
                  className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-black/20 text-white/72 transition hover:text-white"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/40">Thickness</div>
                  <div className="mt-2 text-xl font-semibold text-white">{brushSize}px</div>
                </div>
                <button
                  type="button"
                  onClick={() => setBrushSize((current) => clamp(current + 2, MIN_BRUSH, MAX_BRUSH))}
                  className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-black/20 text-white/72 transition hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <input
                type="range"
                min={MIN_BRUSH}
                max={MAX_BRUSH}
                value={brushSize}
                onChange={(event) => setBrushSize(Number(event.target.value))}
                className="mt-4 w-full accent-red-400"
              />
            </div>
          </div>

          <div className="mt-5">
            <SectionLabel>Quick Notes</SectionLabel>
            <div className="mt-3 grid gap-3">
              {NOTE_TONES.map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => handleAddNote(tone.id)}
                  className={`rounded-[22px] border px-4 py-3 text-left text-sm font-medium transition hover:-translate-y-0.5 ${tone.bg} ${tone.border} ${tone.text}`}
                >
                  Add {tone.label} note
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-[26px] border border-white/10 bg-black/20 p-5">
            <SectionLabel>Board State</SectionLabel>
            <div className="mt-4 grid gap-3">
              <StateRow label="Active Tool" value={tool} />
              <StateRow label="Drawing" value={isDrawing ? "live" : "idle"} />
              <StateRow label="My Undo Stack" value={`${myStrokeHistory.length} items`} />
              <StateRow label="Selected Note" value={activeNote?.title || "none"} />
            </div>
          </div>
        </GlassCard>

        <div
          ref={fullscreenRef}
          className={isFullscreen ? "h-full w-full bg-[#03060d] p-3 sm:p-5" : ""}
        >
          <GlassCard
            className={`overflow-hidden p-0 ${
              isFullscreen ? "flex h-full flex-col rounded-[30px] border-white/12 bg-[#070b12]" : ""
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-4 sm:px-5">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">
                  Live Teaching Surface
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {tool === "eraser"
                    ? "Erase and refine the shared board"
                    : tool === "highlighter"
                      ? "Highlight the key moves"
                      : "Write, solve, and explain together"}
                </div>
                <div className="mt-1 text-sm text-white/48">
                  Room: <span className="text-white/78">{roomId}</span> |{" "}
                  {activeCollaborators.length} online
                  {isFullscreen ? " | Press Esc to exit fullscreen" : ""}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <ActionButton
                  label={showGrid ? "Hide Grid" : "Show Grid"}
                  icon={Grid2x2}
                  onClick={() => setShowGrid((current) => !current)}
                />
                <ActionButton label="Undo" icon={Undo2} onClick={handleUndo} disabled={!canUndo} />
                <ActionButton label="Redo" icon={Redo2} onClick={handleRedo} disabled={!canRedo} />
                <ActionButton label="Add Note" icon={StickyNote} onClick={() => handleAddNote()} />
                <ActionButton
                  label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  icon={isFullscreen ? Minimize2 : Maximize2}
                  onClick={() => void handleToggleFullscreen()}
                />
                <ActionButton label="Export PNG" icon={Download} onClick={handleExport} />
                <ActionButton
                  label="Clear Ink"
                  icon={Trash2}
                  onClick={() => void handleClearBoard()}
                  disabled={!strokes.length && !drafts.length}
                  tone="warning"
                />
                <ActionButton
                  label="Reset Room"
                  icon={RotateCcw}
                  onClick={() => void handleResetWorkspace()}
                />
              </div>
            </div>

            <div className={`space-y-4 p-4 sm:p-5 ${isFullscreen ? "flex min-h-0 flex-1 flex-col" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-black/20 px-4 py-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">Board zoom</div>
                  <div className="mt-1 text-sm text-white/72">
                    Increase zoom to get a larger canvas and scroll around it.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((current) => roundZoom(clamp(current - 0.25, MIN_ZOOM, MAX_ZOOM)))}
                    className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/72 transition hover:bg-white/10 hover:text-white"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="min-w-20 text-center text-sm font-semibold text-white">
                    {Math.round(zoomLevel * 100)}%
                  </div>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((current) => roundZoom(clamp(current + 0.25, MIN_ZOOM, MAX_ZOOM)))}
                    className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/72 transition hover:bg-white/10 hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/72 transition hover:bg-white/10 hover:text-white"
                  >
                    100%
                  </button>
                </div>
              </div>

              <div
                className={`overflow-auto rounded-[34px] border border-white/10 bg-[#05070d] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${
                  isFullscreen ? "min-h-0 flex-1" : "h-[72vh]"
                }`}
              >
                <div
                  className="relative"
                  style={{
                    width: `${Math.round(BOARD_WIDTH * zoomLevel)}px`,
                    height: `${Math.round(BOARD_HEIGHT * zoomLevel)}px`,
                  }}
                >
                  <div
                    ref={boardRef}
                    className="relative"
                    style={{
                      width: `${BOARD_WIDTH}px`,
                      height: `${BOARD_HEIGHT}px`,
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      width={BOARD_WIDTH}
                      height={BOARD_HEIGHT}
                      onPointerDown={handleCanvasPointerDown}
                      onPointerMove={handleCanvasPointerMove}
                      onPointerUp={endStroke}
                      onPointerCancel={endStroke}
                      className="absolute inset-0 h-full w-full touch-none"
                    />

                    {!strokes.length && !drafts.length && !isDrawing ? (
                      <div className="pointer-events-none absolute inset-x-6 top-6 rounded-[26px] border border-dashed border-white/10 bg-black/30 px-5 py-4 text-sm leading-7 text-white/58 backdrop-blur-sm">
                        Start drawing anywhere on the board. Share this room code with another user to collaborate in realtime.
                      </div>
                    ) : null}

                    {notes.map((note) => {
                      const tone = NOTE_TONES.find((item) => item.id === note.tone) || NOTE_TONES[0];

                      return (
                        <div
                          key={note.id}
                          className={`absolute z-10 w-64 rounded-[24px] border shadow-[0_18px_45px_rgba(0,0,0,0.25)] backdrop-blur-sm ${tone.bg} ${tone.border} ${tone.text} ${
                            activeNoteId === note.id ? "ring-2 ring-white/65" : "ring-1 ring-transparent"
                          }`}
                          style={{
                            left: `${note.x}px`,
                            top: `${note.y}px`,
                          }}
                          onPointerDown={() => setActiveNoteId(note.id)}
                        >
                          <div
                            onPointerDown={(event) => handleNotePointerDown(event, note)}
                            className="flex cursor-grab items-center justify-between gap-3 rounded-t-[24px] border-b border-black/10 px-4 py-3"
                          >
                            <input
                              value={note.title}
                              onChange={(event) =>
                                handleNoteChange(note.id, { title: event.target.value.trimStart() })
                              }
                              onBlur={() => flushNoteSync(note.id)}
                              onPointerDown={(event) => event.stopPropagation()}
                              className={`w-full bg-transparent text-sm font-semibold outline-none placeholder:opacity-55 ${tone.text}`}
                              placeholder="Note title"
                            />
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteNote(note.id);
                              }}
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-black/10 bg-white/20 text-black/65 transition hover:bg-white/35"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <textarea
                            value={note.body}
                            onChange={(event) => handleNoteChange(note.id, { body: event.target.value })}
                            onBlur={() => flushNoteSync(note.id)}
                            className={`min-h-32 w-full resize-none bg-transparent px-4 py-3 text-sm leading-6 outline-none placeholder:opacity-55 ${tone.text}`}
                            placeholder="Write a key idea, formula, or tutor instruction..."
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function HeaderChip({ label, caption }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-center">
      <div className="text-sm font-semibold uppercase tracking-[0.14em] text-white">{label}</div>
      <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/38">{caption}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
      {children}
    </div>
  );
}

function StateRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">{label}</div>
      <div className="mt-2 text-sm font-medium capitalize text-white/78">{value}</div>
    </div>
  );
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    Boolean(target.closest("[contenteditable='true']"))
  );
}

function ActionButton({ label, icon: Icon, onClick, disabled = false, tone = "neutral" }) {
  const toneClass =
    tone === "warning"
      ? "border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
      : "border-white/10 bg-white/5 text-white/72 hover:bg-white/10 hover:text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${toneClass}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function buildInitialBoardRoomPayload({ roomId, createdBy }) {
  return {
    meta: {
      roomId,
      createdBy,
      createdAt: serverTimestamp(),
      createdAtMs: Date.now(),
      updatedAt: serverTimestamp(),
      updatedAtMs: Date.now(),
    },
    notes: buildSeedNotes(),
    strokes: null,
    drafts: null,
    participants: null,
  };
}

function buildSeedNotes() {
  return INITIAL_NOTES.reduce((accumulator, note, index) => {
    accumulator[note.id] = {
      ...note,
      createdAt: serverTimestamp(),
      createdAtMs: Date.now() + index,
      updatedAt: serverTimestamp(),
      updatedAtMs: Date.now() + index,
      authorId: "",
      authorName: "LevelUp",
    };
    return accumulator;
  }, {});
}

function createStroke({ point, tool, color, brushSize }) {
  const id = createEntityId("stroke");
  const baseStroke = {
    id,
    tool,
    color,
    width: brushSize,
    opacity: 1,
    points: [point],
    roomId: "",
    createdAtMs: Date.now(),
    updatedAtMs: Date.now(),
  };

  if (tool === "eraser") {
    return {
      ...baseStroke,
      color: "#000000",
      width: brushSize + 18,
    };
  }

  if (tool === "highlighter") {
    return {
      ...baseStroke,
      width: brushSize + 10,
      opacity: 0.28,
    };
  }

  return baseStroke;
}

function serializeStrokeForStorage(stroke, authorId, authorName, roomId = "") {
  return {
    ...stroke,
    authorId,
    authorName,
    roomId: stroke.roomId || roomId,
    createdAt: stroke.createdAt || serverTimestamp(),
    createdAtMs: Number(stroke.createdAtMs || Date.now()),
    updatedAt: serverTimestamp(),
    updatedAtMs: Number(stroke.updatedAtMs || Date.now()),
  };
}

function serializeNoteForStorage(note, authorId, authorName) {
  return {
    ...note,
    title: String(note.title || "").slice(0, 100),
    body: String(note.body || "").slice(0, 1500),
    tone: NOTE_TONES.some((tone) => tone.id === note.tone) ? note.tone : NOTE_TONES[0].id,
    x: clamp(Number(note.x || 0), 0, BOARD_WIDTH - NOTE_CARD_WIDTH),
    y: clamp(Number(note.y || 0), 0, BOARD_HEIGHT - NOTE_CARD_HEIGHT),
    authorId: note.authorId || authorId,
    authorName: note.authorName || authorName,
    createdAt: note.createdAt || serverTimestamp(),
    createdAtMs: Number(note.createdAtMs || Date.now()),
    updatedAt: serverTimestamp(),
    updatedAtMs: Number(note.updatedAtMs || Date.now()),
  };
}

function drawBoardScene({
  canvas,
  strokes,
  draftStrokes = [],
  showGrid,
  notes = [],
  includeNotes = false,
}) {
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  drawBoardBackground(ctx);

  if (showGrid) {
    drawGrid(ctx);
  }

  [...strokes, ...draftStrokes].forEach((stroke) => {
    drawStroke(ctx, stroke);
  });

  if (includeNotes) {
    notes.forEach((note) => {
      drawExportNote(ctx, note);
    });
  }
}

function drawBoardBackground(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  gradient.addColorStop(0, "#050913");
  gradient.addColorStop(0.45, "#0b1220");
  gradient.addColorStop(1, "#03060d");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.32;
  const glow = ctx.createRadialGradient(260, 190, 0, 260, 190, 420);
  glow.addColorStop(0, "rgba(239,68,68,0.35)");
  glow.addColorStop(1, "rgba(239,68,68,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#f8fafc";
  for (let index = 0; index < BOARD_WIDTH; index += 140) {
    ctx.fillRect(index, 0, 1, BOARD_HEIGHT);
  }
  ctx.restore();
}

function drawGrid(ctx) {
  ctx.save();
  ctx.strokeStyle = "rgba(248,250,252,0.08)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= BOARD_WIDTH; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BOARD_HEIGHT);
    ctx.stroke();
  }

  for (let y = 0; y <= BOARD_HEIGHT; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(BOARD_WIDTH, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(248,250,252,0.15)";
  for (let x = 0; x <= BOARD_WIDTH; x += 200) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BOARD_HEIGHT);
    ctx.stroke();
  }

  for (let y = 0; y <= BOARD_HEIGHT; y += 200) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(BOARD_WIDTH, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawStroke(ctx, stroke) {
  if (!stroke?.points?.length) {
    return;
  }

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.width || 6;
  ctx.globalAlpha = stroke.opacity ?? 1;
  ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";

  if (stroke.points.length === 1) {
    ctx.fillStyle = stroke.color || "#ef4444";
    ctx.beginPath();
    ctx.arc(stroke.points[0].x, stroke.points[0].y, (stroke.width || 6) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.strokeStyle = stroke.color || "#ef4444";
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

  for (let index = 1; index < stroke.points.length; index += 1) {
    const current = stroke.points[index];
    const previous = stroke.points[index - 1];
    const midpointX = (previous.x + current.x) / 2;
    const midpointY = (previous.y + current.y) / 2;
    ctx.quadraticCurveTo(previous.x, previous.y, midpointX, midpointY);
  }

  const lastPoint = stroke.points[stroke.points.length - 1];
  ctx.lineTo(lastPoint.x, lastPoint.y);
  ctx.stroke();
  ctx.restore();
}

function drawExportNote(ctx, note) {
  const tone = NOTE_TONES.find((item) => item.id === note.tone) || NOTE_TONES[0];

  ctx.save();
  drawRoundedRect(ctx, note.x, note.y, NOTE_CARD_WIDTH, NOTE_CARD_HEIGHT, 24);
  ctx.fillStyle = tone.fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = tone.stroke;
  ctx.stroke();

  ctx.fillStyle = tone.id === "sky" ? "#082f49" : tone.id === "rose" ? "#4a1024" : "#422006";
  ctx.font = "700 26px Poppins, sans-serif";
  ctx.fillText(truncateForCanvas(note.title || "Note", 20), note.x + 24, note.y + 42);

  ctx.font = "500 20px Poppins, sans-serif";
  wrapCanvasText({
    ctx,
    text: note.body || "",
    x: note.x + 24,
    y: note.y + 78,
    maxWidth: NOTE_CARD_WIDTH - 48,
    lineHeight: 30,
    maxLines: 4,
  });
  ctx.restore();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapCanvasText({ ctx, text, x, y, maxWidth, lineHeight, maxLines }) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return;
  }

  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(nextLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.slice(0, maxLines).forEach((line, index) => {
    const finalLine =
      index === maxLines - 1 && lines.length > maxLines
        ? `${truncateForCanvas(line, Math.max(8, line.length - 3))}...`
        : line;
    ctx.fillText(finalLine, x, y + index * lineHeight);
  });
}

function truncateForCanvas(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function collectDraftStrokes(remoteDrafts, localDraft) {
  return [...remoteDrafts, ...(localDraft ? [localDraft] : [])];
}

function sortCollectionByTime(collection) {
  return Object.values(collection || {})
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = Number(left.updatedAtMs || left.createdAtMs || 0);
      const rightTime = Number(right.updatedAtMs || right.createdAtMs || 0);
      return leftTime - rightTime;
    });
}

function sortParticipants(collection) {
  return Object.values(collection || {})
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = Number(left.lastSeenMs || 0);
      const rightTime = Number(right.lastSeenMs || 0);
      return rightTime - leftTime;
    });
}

function upsertCollectionItem(items, nextItem) {
  const existingIndex = items.findIndex((item) => item.id === nextItem.id);
  if (existingIndex === -1) {
    return [...items, nextItem];
  }

  return items.map((item) => (item.id === nextItem.id ? nextItem : item));
}

function clearAllDeferredNoteSyncs(timerMap) {
  timerMap.forEach((timerId) => {
    window.clearTimeout(timerId);
  });
  timerMap.clear();
}

function clearDraftSyncTimer(draftSyncMetaRef) {
  if (draftSyncMetaRef.current.timerId) {
    window.clearTimeout(draftSyncMetaRef.current.timerId);
    draftSyncMetaRef.current.timerId = null;
  }
}

function getBoardPointFromClient(clientX, clientY, element) {
  const rect = element.getBoundingClientRect();
  return {
    x: clamp(((clientX - rect.left) / rect.width) * BOARD_WIDTH, 0, BOARD_WIDTH),
    y: clamp(((clientY - rect.top) / rect.height) * BOARD_HEIGHT, 0, BOARD_HEIGHT),
  };
}

function sanitizeRoomId(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || DEFAULT_ROOM_ID;
}

function isParticipantActive(lastSeen) {
  const timestamp = Number(lastSeen || 0);
  if (!timestamp) {
    return true;
  }
  return Date.now() - timestamp < 45000;
}

function createEntityId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function roundZoom(value) {
  return Math.round(value * 100) / 100;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
