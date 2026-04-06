import { useEffect, useMemo, useState } from "react";
import { updateProfile } from "firebase/auth";
import {
  Bell,
  CheckCircle2,
  LoaderCircle,
  Mail,
  Save,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import ThemeToggle from "../../components/ThemeToggle";
import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";
import { auth } from "../../firebase";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";
import {
  normalizeSettingsPreferences,
  saveUserSettings,
} from "../../lib/userData";

const INPUT_STYLE = {
  width: "100%",
  borderRadius: "18px",
  border: "1px solid var(--theme-border)",
  background: "var(--theme-surface-dark)",
  color: "var(--theme-text-strong)",
  padding: "0.9rem 1rem",
  outline: "none",
};

export default function SettingsPage() {
  const profile = useWorkspaceStore((state) => state.profile);
  const profileReady = useWorkspaceStore((state) => state.profileReady);
  const user = useWorkspaceStore((state) => state.user);
  const [form, setForm] = useState(buildSettingsForm(profile, user));
  const [preferences, setPreferences] = useState(
    normalizeSettingsPreferences(profile?.preferences),
  );
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const initialState = useMemo(() => {
    const nextForm = buildSettingsForm(profile, user);
    const nextPreferences = normalizeSettingsPreferences(profile?.preferences);
    return {
      form: nextForm,
      preferences: nextPreferences,
      serialized: JSON.stringify({
        form: nextForm,
        preferences: nextPreferences,
      }),
    };
  }, [profile, user]);

  useEffect(() => {
    setForm(initialState.form);
    setPreferences(initialState.preferences);
  }, [initialState]);

  const hasChanges = useMemo(
    () =>
      JSON.stringify({
        form: normalizeForm(form),
        preferences: normalizeSettingsPreferences(preferences),
      }) !== initialState.serialized,
    [form, initialState.serialized, preferences],
  );

  const currentTargetRole = form.targetRole || "Not set";
  const resumeScore = profile?.resumeWorkspace?.latestAnalysis?.report?.score;
  const latestResumeName =
    profile?.resumeWorkspace?.latestAnalysis?.fileName ||
    profile?.resumeOverview?.latestResumeFileName ||
    "";

  const handleFieldChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (success) {
      setSuccess("");
    }
    if (error) {
      setError("");
    }
  };

  const handlePreferenceToggle = (key) => {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
    if (success) {
      setSuccess("");
    }
  };

  const handleReset = () => {
    setForm(initialState.form);
    setPreferences(initialState.preferences);
    setSuccess("");
    setError("");
  };

  const handleSave = async () => {
    if (!user?.uid) {
      setError("Sign in again to update settings.");
      return;
    }

    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const normalizedForm = normalizeForm(form);

      if (
        auth.currentUser &&
        normalizedForm.name &&
        normalizedForm.name !== auth.currentUser.displayName
      ) {
        await updateProfile(auth.currentUser, {
          displayName: normalizedForm.name,
        });
      }

      await saveUserSettings(user.uid, {
        ...normalizedForm,
        preferences,
      });

      setSuccess("Settings saved. Career Guidance and workspace profile are now updated.");
    } catch (saveError) {
      setError(saveError?.message || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Profile & Platform Settings"
        title="Manage student profile, goals, and workspace preferences."
        description="These values are loaded from your saved workspace profile and will update the rest of the app when you save."
      />

      {!profileReady ? (
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 text-sm theme-text-muted">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Loading your saved settings...
          </div>
        </GlassCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
        <GlassCard className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold theme-text-strong">Student Profile</div>
              <div className="mt-2 text-sm leading-7 theme-text-muted">
                Edit the details used across Career Guidance, Adaptive Learning, mock interviews,
                and workspace identity.
              </div>
            </div>
            <div className="theme-shell-panel rounded-[18px] border px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] theme-text-muted">
              Synced from workspace data
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <EditableField
              label="Full Name"
              value={form.name}
              onChange={(value) => handleFieldChange("name", value)}
              placeholder="Enter your full name"
            />
            <ReadOnlyField
              label="Sign-in Email"
              value={form.email || user?.email || "Not available"}
              helper="This comes from your account login."
            />
            <EditableField
              label="College / School"
              value={form.college}
              onChange={(value) => handleFieldChange("college", value)}
              placeholder="SV University"
            />
            <EditableField
              label="Department / Branch"
              value={form.department}
              onChange={(value) => handleFieldChange("department", value)}
              placeholder="Computer Science"
            />
            <EditableField
              label="Year / Semester"
              value={form.year}
              onChange={(value) => handleFieldChange("year", value)}
              placeholder="Final Year"
            />
            <EditableField
              label="Phone Number"
              value={form.phone}
              onChange={(value) => handleFieldChange("phone", value)}
              placeholder="+91 98765 43210"
            />
            <EditableField
              label="City"
              value={form.city}
              onChange={(value) => handleFieldChange("city", value)}
              placeholder="Tirupati"
            />
            <EditableField
              label="Target Role"
              value={form.targetRole}
              onChange={(value) => handleFieldChange("targetRole", value)}
              placeholder="Full Stack Developer"
            />
          </div>

          {(success || error) ? (
            <div
              className={`mt-5 rounded-[20px] border px-4 py-4 text-sm leading-7 ${
                success
                  ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                  : "border-red-400/20 bg-red-500/10 text-red-100"
              }`}
            >
              <div className="flex items-start gap-3">
                {success ? <CheckCircle2 className="mt-0.5 h-5 w-5" /> : <Bell className="mt-0.5 h-5 w-5" />}
                <span>{success || error}</span>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="inline-flex items-center gap-2 rounded-[18px] border border-transparent px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(135deg,var(--theme-primary-from),var(--theme-primary-to))",
                boxShadow: "var(--theme-shadow-card)",
              }}
            >
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={saving || !hasChanges}
              className="rounded-[18px] border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold theme-text-strong transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <UserRound className="h-5 w-5 theme-text-strong" />
              </div>
              <div>
                <div className="text-lg font-semibold theme-text-strong">
                  Workspace Snapshot
                </div>
                <div className="mt-2 text-sm leading-7 theme-text-muted">
                  Quick view of the identity and target signals currently driving the app.
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <SnapshotRow label="Current target role" value={currentTargetRole} icon={Target} />
              <SnapshotRow
                label="Latest analyzed resume"
                value={latestResumeName || "No analyzed resume yet"}
                helper={
                  resumeScore != null ? `ATS score ${resumeScore}/100` : "Analyze a resume to sync score here."
                }
                icon={Sparkles}
              />
              <SnapshotRow
                label="Account email"
                value={form.email || user?.email || "Not available"}
                helper="Displayed from your workspace identity"
                icon={Mail}
              />
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="text-lg font-semibold theme-text-strong">Preferences</div>
            <div className="mt-2 text-sm leading-7 theme-text-muted">
              Save your workspace toggles and theme preference from one place.
            </div>

            <div className="mt-5 space-y-4">
              <PreferenceToggle
                title="AI mentor notifications"
                description="Receive alerts for roadmap updates and role suggestions."
                checked={preferences.aiMentorNotifications}
                onToggle={() => handlePreferenceToggle("aiMentorNotifications")}
              />
              <PreferenceToggle
                title="Performance risk alerts"
                description="Show alerts when readiness and performance signals drop."
                checked={preferences.performanceRiskAlerts}
                onToggle={() => handlePreferenceToggle("performanceRiskAlerts")}
              />
              <PreferenceToggle
                title="Tutor recommendations"
                description="Show tutor and course recommendations for weak areas."
                checked={preferences.tutorRecommendations}
                onToggle={() => handlePreferenceToggle("tutorRecommendations")}
              />
              <PreferenceToggle
                title="Summarizer quick actions"
                description="Keep document and note summarizer shortcuts easy to reach."
                checked={preferences.summarizerQuickActions}
                onToggle={() => handlePreferenceToggle("summarizerQuickActions")}
              />
            </div>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] theme-text-muted">
                Theme
              </div>
              <div className="mt-4">
                <ThemeToggle />
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function EditableField({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="theme-shell-panel rounded-[22px] border p-4">
      <div className="text-xs uppercase tracking-[0.22em] theme-text-muted">{label}</div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-3"
        style={INPUT_STYLE}
      />
    </label>
  );
}

function ReadOnlyField({ label, value, helper = "" }) {
  return (
    <div className="theme-shell-panel rounded-[22px] border p-4">
      <div className="text-xs uppercase tracking-[0.22em] theme-text-muted">{label}</div>
      <input
        value={value}
        readOnly
        className="mt-3 cursor-not-allowed opacity-80"
        style={INPUT_STYLE}
      />
      {helper ? <div className="mt-2 text-xs theme-text-muted">{helper}</div> : null}
    </div>
  );
}

function PreferenceToggle({ title, description, checked, onToggle }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold theme-text-strong">{title}</div>
          <div className="mt-2 text-sm leading-7 theme-text-muted">{description}</div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={checked}
          className={`mt-1 h-6 w-11 rounded-full border p-1 transition ${
            checked
              ? "border-red-300/20 bg-red-500/30"
              : "border-white/10 bg-white/10"
          }`}
        >
          <div
            className={`h-4 w-4 rounded-full transition ${
              checked ? "ml-auto bg-red-300" : "bg-white/60"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function SnapshotRow({ label, value, helper = "", icon: Icon }) {
  return (
    <div className="theme-shell-panel rounded-[22px] border px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
          <Icon className="h-4 w-4 theme-text-strong" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-[0.22em] theme-text-muted">{label}</div>
          <div className="mt-2 text-sm font-semibold theme-text-strong">{value}</div>
          {helper ? <div className="mt-1 text-xs theme-text-muted">{helper}</div> : null}
        </div>
      </div>
    </div>
  );
}

function buildSettingsForm(profile, user) {
  const targetRole = String(
    profile?.careerGuidance?.latestTargetRole ||
      profile?.adaptiveLearning?.targetRole ||
      profile?.resumeWorkspace?.latestAnalysis?.report?.jobMatches?.[0]?.role ||
      profile?.resumeWorkspace?.latestAnalysis?.report?.topRole ||
      profile?.resumeOverview?.topRole ||
      "",
  ).trim();

  return normalizeForm({
    name: profile?.name || user?.name || "",
    email: profile?.email || user?.email || "",
    college: profile?.college || "",
    department: profile?.department || "",
    year: profile?.year || "",
    phone: profile?.phone || "",
    city: profile?.city || "",
    targetRole,
  });
}

function normalizeForm(form) {
  return {
    name: String(form?.name || "").trim(),
    email: String(form?.email || "").trim().toLowerCase(),
    college: String(form?.college || "").trim(),
    department: String(form?.department || "").trim(),
    year: String(form?.year || "").trim(),
    phone: String(form?.phone || "").trim(),
    city: String(form?.city || "").trim(),
    targetRole: String(form?.targetRole || "").trim(),
  };
}
