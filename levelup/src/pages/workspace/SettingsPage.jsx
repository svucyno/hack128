import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Profile & Platform Settings"
        title="Manage student profile, goals, and workspace preferences."
        description="Update academic details, target roles, notification preferences, and platform settings for your AI Career Intelligence workspace."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <GlassCard className="p-6">
          <div className="text-lg font-semibold text-white">Student Profile</div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <SettingField label="Full Name" value="Ramisetty Amrutha" />
            <SettingField label="Email" value="amrutha@student.edu" />
            <SettingField label="College" value="SV University" />
            <SettingField label="Department" value="Computer Science" />
            <SettingField label="Year" value="Final Year" />
            <SettingField label="Target Role" value="Full Stack Developer" />
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="text-lg font-semibold text-white">Preferences</div>
          <div className="mt-5 space-y-4">
            <PreferenceRow title="AI mentor notifications" description="Receive alerts for roadmap updates and role suggestions." />
            <PreferenceRow title="Performance risk alerts" description="Get notified when student readiness trends drop." />
            <PreferenceRow title="Tutor recommendations" description="Show mentor and course suggestions based on weak areas." />
            <PreferenceRow title="Summarizer quick actions" description="Enable document upload shortcuts on the dashboard." />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function SettingField({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.18em] text-white/40">{label}</div>
      <div className="mt-2 text-sm font-medium text-white/80">{value}</div>
    </div>
  );
}

function PreferenceRow({ title, description }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-2 text-sm leading-7 text-white/55">{description}</div>
        </div>
        <div className="mt-1 h-6 w-11 rounded-full bg-red-500/30 p-1">
          <div className="ml-auto h-4 w-4 rounded-full bg-red-400" />
        </div>
      </div>
    </div>
  );
}
