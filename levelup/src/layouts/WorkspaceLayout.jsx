import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { onValue, ref } from "firebase/database";
import Sidebar from "../components/workspace/Sidebar";
import { auth, db } from "../firebase";
import { useWorkspaceStore } from "../hooks/useWorkspaceStore";
import { createWorkspaceStatePayload, saveWorkspaceState } from "../lib/userData";

export default function WorkspaceLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isImmersiveCareerGuidance = location.pathname === "/workspace/career-guidance";
  const user = useWorkspaceStore((state) => state.user);
  const profileReady = useWorkspaceStore((state) => state.profileReady);
  const notifications = useWorkspaceStore((state) => state.notifications);
  const searchQuery = useWorkspaceStore((state) => state.searchQuery);
  const uploadedFiles = useWorkspaceStore((state) => state.uploadedFiles);
  const processing = useWorkspaceStore((state) => state.processing);
  const calendarTasks = useWorkspaceStore((state) => state.calendarTasks);
  const jobApplications = useWorkspaceStore((state) => state.jobApplications);
  const companyPrepPacks = useWorkspaceStore((state) => state.companyPrepPacks);
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
    setSidebarOpen(false);
  }, [location.pathname]);

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
        jobApplications,
        companyPrepPacks,
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
    companyPrepPacks,
    jobApplications,
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

      <div
        className={`relative z-10 flex h-screen w-full ${
          isImmersiveCareerGuidance ? "p-3 sm:p-4 lg:p-5" : "gap-4 p-3 sm:p-4 lg:p-5"
        }`}
      >
        {isImmersiveCareerGuidance ? null : (
          <Sidebar
            open={sidebarOpen}
            setOpen={setSidebarOpen}
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
          />
        )}

        <motion.main
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="min-w-0 flex-1 overflow-hidden"
        >
          <div
            className={`theme-shell-panel flex h-full min-h-0 flex-col rounded-[34px] border backdrop-blur-2xl ${
              isImmersiveCareerGuidance ? "overflow-hidden" : "p-4 sm:p-5 lg:p-6"
            }`}
          >
            <div
              className={`min-h-0 flex-1 ${
                isImmersiveCareerGuidance ? "overflow-hidden" : "overflow-y-auto pr-1"
              }`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.28 }}
                  className={isImmersiveCareerGuidance ? "h-full" : "pb-2"}
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
