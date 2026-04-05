import { create } from "zustand";

export const useWorkspaceStore = create((set) => ({
  user: {
    uid: "",
    name: "Student",
    email: "",
    role: "Student",
    avatar: "S",
    createdAt: "",
    lastSignInAt: "",
    emailVerified: false,
  },
  profile: null,
  profileReady: false,
  notifications: 0,
  searchQuery: "",
  uploadedFiles: {},
  processing: {},
  calendarTasks: [],
  jobApplications: [],
  companyPrepPacks: [],
  setUser: (value) => set({ user: value }),
  setProfile: (value) => set({ profile: value }),
  setProfileReady: (value) => set({ profileReady: value }),
  setNotifications: (value) => set({ notifications: Number(value) || 0 }),
  setSearchQuery: (value) => set({ searchQuery: value }),
  setCalendarTasks: (value) =>
    set({ calendarTasks: Array.isArray(value) ? value : [] }),
  setJobApplications: (value) =>
    set({ jobApplications: Array.isArray(value) ? value : [] }),
  setCompanyPrepPacks: (value) =>
    set({ companyPrepPacks: Array.isArray(value) ? value : [] }),
  setUploadedFile: (key, file) =>
    set((state) => ({
      uploadedFiles: { ...state.uploadedFiles, [key]: file },
    })),
  setProcessing: (key, value) =>
    set((state) => ({
      processing: { ...state.processing, [key]: value },
    })),
  hydrateWorkspaceState: (workspaceState = {}) =>
    set({
      searchQuery: workspaceState.searchQuery || "",
      notifications: Number(workspaceState.notifications || 0),
      uploadedFiles: workspaceState.uploadedFiles || {},
      processing: workspaceState.processing || {},
      calendarTasks: Array.isArray(workspaceState.calendarTasks)
        ? workspaceState.calendarTasks
        : [],
      jobApplications: Array.isArray(workspaceState.jobApplications)
        ? workspaceState.jobApplications
        : [],
      companyPrepPacks: Array.isArray(workspaceState.companyPrepPacks)
        ? workspaceState.companyPrepPacks
        : [],
    }),
  resetWorkspaceState: () =>
    set({
      notifications: 0,
      searchQuery: "",
      uploadedFiles: {},
      processing: {},
      calendarTasks: [],
      jobApplications: [],
      companyPrepPacks: [],
    }),
}));
