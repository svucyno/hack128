import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { onValue, ref } from "firebase/database";
import Sidebar from "../components/workspace/Sidebar";
import TopNavbar from "../components/workspace/TopNavbar";
import { auth, db } from "../firebase";
import { useWorkspaceStore } from "../hooks/useWorkspaceStore";
import { createWorkspaceStatePayload, saveWorkspaceState } from "../lib/userData";

export default function WorkspaceLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useWorkspaceStore((state) => state.user);
  const profileReady = useWorkspaceStore((state) => state.profileReady);
  const notifications = useWorkspaceStore((state) => state.notifications);
  const searchQuery = useWorkspaceStore((state) => state.searchQuery);
  const uploadedFiles = useWorkspaceStore((state) => state.uploadedFiles);
  const processing = useWorkspaceStore((state) => state.processing);
  const calendarTasks = useWorkspaceStore((state) => state.calendarTasks);
  const setUser = useWorkspaceStore((state) => state.setUser);
  const setProfile = useWorkspaceStore((state) => state.setProfile);
  const setProfileReady = useWorkspaceStore((state) => state.setProfileReady);
  const hydrateWorkspaceState = useWorkspaceStore((state) => state.hydrateWorkspaceState);
  const resetWorkspaceState = useWorkspaceStore((state) => state.resetWorkspaceState);
  const lastWorkspaceSnapshotRef = useRef("");

  useEffect(() => {
    let unsubscribeProfile = () => undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribeProfile();

      if (!firebaseUser) {
        setUser({
          uid: "",
          name: "Student",
          email: "",
          role: "Student",
          avatar: "S",
          createdAt: "",
          lastSignInAt: "",
          emailVerified: false,
        });
        setProfile(null);
        resetWorkspaceState();
        lastWorkspaceSnapshotRef.current = "";
        setProfileReady(true);
        navigate("/login", { replace: true });
        return;
      }

      setProfileReady(false);
      unsubscribeProfile = onValue(ref(db, `users/${firebaseUser.uid}`), (snapshot) => {
        const profile = snapshot.exists() ? snapshot.val() : null;
        const displayName = profile?.name || firebaseUser.displayName || "Student";
        const email = profile?.email || firebaseUser.email || "";
        const workspaceState = createWorkspaceStatePayload(profile?.workspaceState || {});

        setProfile(profile);
        hydrateWorkspaceState(workspaceState);
        lastWorkspaceSnapshotRef.current = JSON.stringify(workspaceState);
        setUser({
          uid: firebaseUser.uid,
          name: displayName,
          email,
          role: profile?.role || "Student",
          avatar: displayName.trim().charAt(0).toUpperCase() || "S",
          createdAt: firebaseUser.metadata?.creationTime || "",
          lastSignInAt: firebaseUser.metadata?.lastSignInTime || "",
          emailVerified: Boolean(firebaseUser.emailVerified),
        });
        setProfileReady(true);
      });
    });

    return () => {
      unsubscribeProfile();
      unsubscribeAuth();
    };
  }, [
    hydrateWorkspaceState,
    navigate,
    resetWorkspaceState,
    setProfile,
    setProfileReady,
    setUser,
  ]);

  useEffect(() => {
    if (!user.uid || !profileReady) {
      return;
    }

    const workspaceSnapshot = createWorkspaceStatePayload({
        searchQuery,
        notifications,
        uploadedFiles,
        processing,
        calendarTasks,
        lastVisitedRoute: location.pathname,
      });
    const serializedSnapshot = JSON.stringify(workspaceSnapshot);

    if (serializedSnapshot === lastWorkspaceSnapshotRef.current) {
      return;
    }

    lastWorkspaceSnapshotRef.current = serializedSnapshot;
    void saveWorkspaceState(user.uid, workspaceSnapshot);
  }, [
    location.pathname,
    notifications,
    processing,
    profileReady,
    searchQuery,
    uploadedFiles,
    calendarTasks,
    user.uid,
  ]);

  return (
    <div className="theme-page h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="theme-workspace-ambient absolute inset-0" />
        <div className="theme-glow-pink absolute -left-32 top-24 h-80 w-80 rounded-full blur-3xl" />
        <div className="theme-glow-blue absolute right-0 top-0 h-96 w-96 rounded-full blur-3xl" />
        <div className="theme-glow-orange absolute bottom-0 left-1/3 h-80 w-80 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex h-screen max-w-[1600px] gap-6 p-4 lg:p-6">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

        <motion.main
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="min-w-0 flex-1 overflow-hidden"
        >
          <div className="theme-shell-panel flex h-full min-h-0 flex-col rounded-[34px] border p-5 backdrop-blur-2xl sm:p-6 lg:p-8">
            <TopNavbar />
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.28 }}
                  className="pb-2"
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.main>
      </div>
    </div>
  );
}
