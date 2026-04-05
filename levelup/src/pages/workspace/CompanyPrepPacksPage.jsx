import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  Briefcase,
  Building2,
  ClipboardCheck,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import GlassCard from "../../components/workspace/GlassCard";
import PageHeader from "../../components/workspace/PageHeader";
import { buildCompanyPrepPack, normalizeCompanyPrepPacks } from "../../lib/companyPrep";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";
import { normalizeJobApplications } from "../../lib/userData";

const FIELD_CLASS =
  "w-full rounded-[22px] border px-4 py-3 text-sm outline-none transition focus:scale-[1.005]";

const FIELD_STYLE = {
  background: "var(--theme-surface-0)",
  borderColor: "var(--theme-border)",
  color: "var(--theme-text-strong)",
};

export default function CompanyPrepPacksPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const profile = useWorkspaceStore((state) => state.profile);
  const profileReady = useWorkspaceStore((state) => state.profileReady);
  const jobApplications = useWorkspaceStore((state) => state.jobApplications);
  const companyPrepPacks = useWorkspaceStore((state) => state.companyPrepPacks);
  const setCompanyPrepPacks = useWorkspaceStore((state) => state.setCompanyPrepPacks);

  const guidance = profile?.careerGuidance || {};
  const resumeOverview = profile?.resumeOverview || {};
  const resumeWorkspace = profile?.resumeWorkspace || {};
  const latestReport = resumeWorkspace?.latestAnalysis?.report || null;
  const latestResumeVersion = getLatestResumeVersion({ resumeOverview, resumeWorkspace });
  const latestResumeScore = getLatestResumeScore({ resumeOverview, resumeWorkspace });
  const latestRole = getLatestRole({ resumeOverview, resumeWorkspace });
  const targetRole = String(
    guidance.latestTargetRole ||
      guidance.latestRecommendedRoles?.[0]?.role ||
      latestRole ||
      "",
  ).trim();
  const skillGaps = useMemo(
    () =>
      uniqueStrings([
        ...(guidance.latestSkillGapAnalysis?.prioritySkills || []),
        ...(guidance.latestSkillGapAnalysis?.missingSkills || []),
        ...(latestReport?.missingSkills || []),
      ]).slice(0, 10),
    [guidance, latestReport],
  );
  const recommendedRoles = useMemo(
    () =>
      (Array.isArray(guidance.latestRecommendedRoles) ? guidance.latestRecommendedRoles : [])
        .map((item) => ({
          role: String(item?.role || "").trim(),
          fitScore: normalizeScore(item?.fitScore ?? item?.match),
        }))
        .filter((item) => item.role),
    [guidance],
  );
  const matchedSkills = useMemo(
    () =>
      uniqueStrings([
        ...(latestReport?.jobMatches?.[0]?.matchedSkills || []),
        ...(latestReport?.extractedSkills || []),
      ]).slice(0, 12),
    [latestReport],
  );
  const applications = useMemo(
    () =>
      normalizeJobApplications(jobApplications).sort(
        (left, right) =>
          new Date(right.updatedAtIso || right.createdAtIso || 0).getTime() -
          new Date(left.updatedAtIso || left.createdAtIso || 0).getTime(),
      ),
    [jobApplications],
  );
  const prepPacks = useMemo(
    () =>
      normalizeCompanyPrepPacks(companyPrepPacks).sort(
        (left, right) =>
          new Date(right.updatedAtIso || right.generatedAtIso || 0).getTime() -
          new Date(left.updatedAtIso || left.generatedAtIso || 0).getTime(),
      ),
    [companyPrepPacks],
  );

  const [selectedPackId, setSelectedPackId] = useState("");
  const [form, setForm] = useState(() =>
    createPrepPackForm({
      targetRole,
      latestResumeVersion,
      latestResumeScore,
    }),
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const locationSeedRef = useRef("");

  useEffect(() => {
    if (selectedPackId && prepPacks.some((pack) => pack.id === selectedPackId)) {
      return;
    }

    if (prepPacks[0]?.id) {
      setSelectedPackId(prepPacks[0].id);
    }
  }, [prepPacks, selectedPackId]);

  useEffect(() => {
    setForm((current) => {
      const next = { ...current };
      let changed = false;

      if (!next.role && targetRole) {
        next.role = targetRole;
        changed = true;
      }

      if (!next.linkedResumeVersion && latestResumeVersion) {
        next.linkedResumeVersion = latestResumeVersion;
        changed = true;
      }

      if (!next.linkedResumeScore && latestResumeScore != null) {
        next.linkedResumeScore = String(latestResumeScore);
        changed = true;
      }

      return changed ? next : current;
    });
  }, [latestResumeScore, latestResumeVersion, targetRole]);

  useEffect(() => {
    const routePackId = String(location.state?.packId || "").trim();
    const seed = location.state?.seed || null;
    const signature = JSON.stringify({
      routePackId,
      applicationId: seed?.applicationId || "",
      company: seed?.company || "",
      role: seed?.role || "",
    });

    if (!signature || locationSeedRef.current === signature) {
      return;
    }

    locationSeedRef.current = signature;

    if (routePackId && prepPacks.some((pack) => pack.id === routePackId)) {
      const pack = prepPacks.find((item) => item.id === routePackId);
      if (pack) {
        setSelectedPackId(pack.id);
        setForm(buildFormFromPack(pack));
      }
    }

    if (seed) {
      setForm((current) => ({
        ...current,
        applicationId: String(seed.applicationId || "").trim(),
        company: String(seed.company || current.company).trim(),
        role: String(seed.role || current.role).trim(),
        jobDescription: String(seed.jobDescription || current.jobDescription).trim(),
        linkedResumeVersion: String(
          seed.linkedResumeVersion || current.linkedResumeVersion,
        ).trim(),
        linkedResumeScore:
          seed.linkedResumeScore == null
            ? current.linkedResumeScore
            : String(seed.linkedResumeScore),
      }));
      setNotice(
        `Prep context loaded for ${seed.company ? `${seed.company} · ` : ""}${seed.role || "selected role"}.`,
      );
    }
  }, [location.state, prepPacks]);

  const selectedPack = prepPacks.find((pack) => pack.id === selectedPackId) || null;
  const linkedApplication = applications.find(
    (application) => application.id === (selectedPack?.applicationId || form.applicationId),
  );
  const linkedApplicationCount = prepPacks.filter((pack) => pack.applicationId).length;
  const hardPackCount = prepPacks.filter((pack) => pack.expectedDifficulty === "Hard").length;
  const strongestPack = prepPacks[0] || null;

  const handleFormChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handlePickApplication = (applicationId) => {
    const application = applications.find((item) => item.id === applicationId);
    if (!application) {
      setForm((current) => ({
        ...current,
        applicationId: "",
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      applicationId: application.id,
      company: application.company,
      role: application.role,
      jobDescription: application.jobDescription || current.jobDescription,
      linkedResumeVersion:
        application.linkedResumeVersion || current.linkedResumeVersion || latestResumeVersion,
      linkedResumeScore:
        application.linkedResumeScore == null
          ? current.linkedResumeScore || (latestResumeScore == null ? "" : String(latestResumeScore))
          : String(application.linkedResumeScore),
      resumeTailored: application.resumeTailored,
    }));
    setError("");
  };

  const handleGeneratePack = (event) => {
    event.preventDefault();

    const company = form.company.trim();
    const role = form.role.trim();
    if (!company || !role) {
      setError("Company and role are required to generate a prep pack.");
      return;
    }

    const existingPack =
      selectedPack &&
      ((selectedPack.applicationId && selectedPack.applicationId === form.applicationId) ||
        (selectedPack.company.toLowerCase() === company.toLowerCase() &&
          selectedPack.role.toLowerCase() === role.toLowerCase()));

    const nextPack = buildCompanyPrepPack({
      id: existingPack ? selectedPack.id : "",
      company,
      role,
      applicationId: form.applicationId,
      applicationStatus: linkedApplication?.status || "",
      linkedResumeVersion: form.linkedResumeVersion.trim() || latestResumeVersion,
      linkedResumeScore: normalizeScore(form.linkedResumeScore) ?? latestResumeScore,
      targetRole,
      jobDescription: form.jobDescription.trim(),
      matchedSkills,
      skillGaps,
      recommendedRoles,
      resumeTailored: form.resumeTailored,
    });

    const nextPacks = [nextPack, ...prepPacks.filter((pack) => pack.id !== nextPack.id)];
    setCompanyPrepPacks(nextPacks);
    setSelectedPackId(nextPack.id);
    setNotice(`Prep pack ready for ${company} · ${role}.`);
    setError("");
  };

  const handleOpenPack = (pack) => {
    setSelectedPackId(pack.id);
    setForm(buildFormFromPack(pack));
    setError("");
    setNotice("");
  };

  const handleStartMockInterview = (pack) => {
    navigate("/workspace/mock-interview", {
      state: {
        companyPrepPack: {
          packId: pack.id,
          applicationId: pack.applicationId,
          role: pack.role,
          company: pack.company,
          difficulty: pack.mockInterviewProfile.difficulty,
          interviewType: pack.mockInterviewProfile.interviewType,
          focusAreas: pack.mockInterviewProfile.focusAreas,
          jobDescription: pack.jobDescription,
          maxQuestions: pack.mockInterviewProfile.maxQuestions,
        },
      },
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Placement Intelligence"
        title="Company Prep Packs"
        description="Enter a company and role to generate likely rounds, common topics, expected difficulty, a prep checklist, red flags, and a mock interview mode tuned to that process."
        aside={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/workspace/job-applications"
              className="theme-badge inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
            >
              <Briefcase className="h-4 w-4" />
              Job Applications
            </Link>
            <Link
              to="/workspace/mock-interview"
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
              style={{
                borderColor: "var(--theme-border)",
                background: "var(--theme-surface-0)",
                color: "var(--theme-text-strong)",
              }}
            >
              <Bot className="h-4 w-4" />
              Mock Interview
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PrepStat
          icon={Building2}
          label="Saved Packs"
          value={String(prepPacks.length)}
          helper="Reusable company-role prep profiles"
        />
        <PrepStat
          icon={ClipboardCheck}
          label="Linked Applications"
          value={String(linkedApplicationCount)}
          helper="Packs tied to a tracked opportunity"
        />
        <PrepStat
          icon={ShieldAlert}
          label="Hard Packs"
          value={String(hardPackCount)}
          helper="Higher-pressure prep cycles"
        />
        <PrepStat
          icon={TrendingUp}
          label="Latest Difficulty"
          value={strongestPack?.expectedDifficulty || "N/A"}
          helper={strongestPack ? `${strongestPack.company} · ${strongestPack.role}` : "Generate your first prep pack"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
        <div className="space-y-6">
          <GlassCard className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="theme-text-strong text-xl font-black">Generate Pack</div>
                <div className="theme-text-muted mt-2 text-sm leading-7">
                  Turn a company + role into a saved prep object the rest of the app can reuse.
                </div>
              </div>
              <Sparkles className="h-5 w-5 text-red-200" />
            </div>

            <div className="mt-5 grid gap-3">
              <ContextInfoCard
                label="Current Target Role"
                value={targetRole || "Not set yet"}
                helper="Pulled from Career Guidance first"
              />
              <ContextInfoCard
                label="Latest Resume"
                value={latestResumeVersion || "No analyzed resume yet"}
                helper={
                  latestResumeScore == null
                    ? "Analyze a resume to improve pack accuracy"
                    : `ATS ${latestResumeScore}/100`
                }
              />
              <ContextInfoCard
                label="Skill Gaps"
                value={skillGaps.length ? `${skillGaps.length} tracked` : "None saved"}
                helper={skillGaps.slice(0, 3).join(", ") || "No saved gaps yet"}
              />
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleGeneratePack}>
              <Field label="Tracked Application">
                <select
                  value={form.applicationId}
                  onChange={(event) => handlePickApplication(event.target.value)}
                  className={FIELD_CLASS}
                  style={FIELD_STYLE}
                >
                  <option value="">Create a standalone prep pack</option>
                  {applications.map((application) => (
                    <option key={application.id} value={application.id}>
                      {application.company} · {application.role}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Company">
                  <input
                    value={form.company}
                    onChange={(event) => handleFormChange("company", event.target.value)}
                    placeholder="Example: Zoho"
                    className={FIELD_CLASS}
                    style={FIELD_STYLE}
                  />
                </Field>

                <Field label="Role">
                  <input
                    value={form.role}
                    onChange={(event) => handleFormChange("role", event.target.value)}
                    placeholder="Example: Teacher"
                    className={FIELD_CLASS}
                    style={FIELD_STYLE}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Linked Resume Version">
                  <input
                    value={form.linkedResumeVersion}
                    onChange={(event) => handleFormChange("linkedResumeVersion", event.target.value)}
                    placeholder="Resume version"
                    className={FIELD_CLASS}
                    style={FIELD_STYLE}
                  />
                </Field>

                <Field label="ATS Score">
                  <input
                    value={form.linkedResumeScore}
                    onChange={(event) => handleFormChange("linkedResumeScore", event.target.value)}
                    placeholder="68"
                    className={FIELD_CLASS}
                    style={FIELD_STYLE}
                  />
                </Field>
              </div>

              <Field label="Job Description">
                <textarea
                  value={form.jobDescription}
                  onChange={(event) => handleFormChange("jobDescription", event.target.value)}
                  placeholder="Paste the JD to generate stronger topics, round signals, and red flags."
                  rows={7}
                  className={`${FIELD_CLASS} resize-none`}
                  style={FIELD_STYLE}
                />
              </Field>

              <label className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/78">
                <input
                  type="checkbox"
                  checked={form.resumeTailored}
                  onChange={(event) => handleFormChange("resumeTailored", event.target.checked)}
                  className="h-4 w-4 accent-red-500"
                />
                Resume already tailored for this company / role
              </label>

              {error ? (
                <div className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              {notice ? (
                <div className="rounded-[22px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  {notice}
                </div>
              ) : null}

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-[24px] px-5 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                style={{
                  background:
                    "linear-gradient(135deg,var(--theme-primary-from),var(--theme-primary-to))",
                }}
              >
                <Sparkles className="h-4 w-4" />
                Generate Company Prep Pack
              </button>
            </form>
          </GlassCard>

          <GlassCard className="p-5 sm:p-6">
            <div className="theme-text-strong text-xl font-black">Saved Packs</div>
            <div className="theme-text-muted mt-2 text-sm leading-7">
              Reopen any company pack and reuse it for applications or mock interviews.
            </div>

            <div className="mt-5 space-y-3">
              {prepPacks.length ? (
                prepPacks.map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => handleOpenPack(pack)}
                    className={`w-full rounded-[24px] border p-4 text-left transition ${
                      pack.id === selectedPackId
                        ? "border-red-400/25 bg-red-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{pack.company}</div>
                        <div className="mt-1 text-sm text-white/55">{pack.role}</div>
                      </div>
                      <PackDifficultyBadge value={pack.expectedDifficulty} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {pack.applicationStatus ? <PrepTag label={pack.applicationStatus} /> : null}
                      {pack.linkedResumeScore != null ? (
                        <PrepTag label={`ATS ${pack.linkedResumeScore}/100`} />
                      ) : null}
                      <PrepTag label={`${pack.likelyRounds.length} rounds`} />
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white/55">
                  No prep packs saved yet. Generate the first one from company, role, and JD context.
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          {!profileReady ? (
            <GlassCard className="p-6 text-sm text-white/72">
              Loading company prep context from your profile...
            </GlassCard>
          ) : !selectedPack ? (
            <GlassCard className="p-6 sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-100">
                <Building2 className="h-4 w-4" />
                Company Pack
              </div>
              <div className="mt-5 text-3xl font-black text-white">No prep pack selected yet</div>
              <div className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
                Generate a pack to get likely rounds, common topics, difficulty expectations, prep
                actions, and a company-tuned mock interview entry point.
              </div>
            </GlassCard>
          ) : (
            <>
              <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/10 px-5 py-5 sm:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-100">
                        <Building2 className="h-4 w-4" />
                        {selectedPack.company}
                      </div>
                      <div className="mt-4 text-2xl font-black text-white">{selectedPack.role}</div>
                      <div className="mt-2 text-sm leading-7 text-white/58">
                        {selectedPack.difficultyReason}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <PackDifficultyBadge value={selectedPack.expectedDifficulty} />
                      {selectedPack.linkedResumeScore != null ? (
                        <PrepTag label={`ATS ${selectedPack.linkedResumeScore}/100`} />
                      ) : null}
                      {selectedPack.linkedResumeVersion ? (
                        <PrepTag label={truncateText(selectedPack.linkedResumeVersion, 28)} />
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleStartMockInterview(selectedPack)}
                      className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100 transition hover:-translate-y-0.5"
                    >
                      Start Mock Interview
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    {selectedPack.applicationId ? (
                      <Link
                        to="/workspace/job-applications"
                        state={{
                          seed: {
                            applicationId: selectedPack.applicationId,
                            company: selectedPack.company,
                            role: selectedPack.role,
                            jobDescription: selectedPack.jobDescription,
                          },
                        }}
                        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                        style={{
                          borderColor: "var(--theme-border)",
                          background: "var(--theme-surface-0)",
                          color: "var(--theme-text-strong)",
                        }}
                      >
                        Open Application
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-6 p-5 sm:p-6">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <ContextInfoCard
                      label="Current Goal"
                      value={selectedPack.targetRole || "Not linked"}
                      helper="Target role context used for the pack"
                    />
                    <ContextInfoCard
                      label="Application Link"
                      value={linkedApplication ? `${linkedApplication.company} · ${linkedApplication.role}` : "Standalone pack"}
                      helper={linkedApplication?.status ? `Tracker stage: ${linkedApplication.status}` : "Not tied to a tracker record"}
                    />
                    <ContextInfoCard
                      label="Mock Mode"
                      value={formatInterviewType(selectedPack.mockInterviewProfile.interviewType)}
                      helper={selectedPack.mockInterviewProfile.focusAreas.slice(0, 2).join(", ") || "Role-tuned focus areas"}
                    />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <SectionCard title="Likely Rounds" icon={Briefcase}>
                      <div className="space-y-3">
                        {selectedPack.likelyRounds.map((round) => (
                          <div
                            key={`${selectedPack.id}-${round.title}`}
                            className="rounded-[20px] border border-white/10 bg-white/5 p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-white">{round.title}</div>
                              <PrepTag label={round.type} />
                            </div>
                            <div className="mt-2 text-sm leading-7 text-white/62">{round.focus}</div>
                            <div className="mt-2 text-xs leading-6 text-white/48">{round.signal}</div>
                          </div>
                        ))}
                      </div>
                    </SectionCard>

                    <SectionCard title="Common Topics" icon={Target}>
                      <div className="flex flex-wrap gap-2">
                        {selectedPack.commonTopics.map((topic) => (
                          <PrepTag key={`${selectedPack.id}-${topic}`} label={topic} />
                        ))}
                      </div>
                    </SectionCard>

                    <SectionCard title="Prep Checklist" icon={ClipboardCheck}>
                      <div className="space-y-3">
                        {selectedPack.prepChecklist.map((item) => (
                          <div
                            key={`${selectedPack.id}-${item.phase}-${item.title}`}
                            className="rounded-[20px] border border-white/10 bg-white/5 p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <PrepTag label={item.phase} />
                              <div className="text-sm font-semibold text-white">{item.title}</div>
                            </div>
                            <div className="mt-2 text-sm leading-7 text-white/62">{item.note}</div>
                          </div>
                        ))}
                      </div>
                    </SectionCard>

                    <SectionCard title="Resume Fit And Risks" icon={ShieldAlert}>
                      <div className="space-y-5">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
                            Matched Strengths
                          </div>
                          <div className="mt-3 space-y-2">
                            {selectedPack.matchedStrengths.length ? (
                              selectedPack.matchedStrengths.map((item) => (
                                <Bullet key={`${selectedPack.id}-strength-${item}`} tone="success">
                                  {item}
                                </Bullet>
                              ))
                            ) : (
                              <Bullet tone="neutral">No strong match signals were detected yet.</Bullet>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
                            Risk Areas
                          </div>
                          <div className="mt-3 space-y-2">
                            {selectedPack.riskAreas.map((item) => (
                              <Bullet key={`${selectedPack.id}-risk-${item}`} tone="warning">
                                {item}
                              </Bullet>
                            ))}
                          </div>
                        </div>
                      </div>
                    </SectionCard>
                  </div>

                  <SectionCard title="Red Flags" icon={ShieldAlert}>
                    <div className="space-y-2">
                      {selectedPack.redFlags.length ? (
                        selectedPack.redFlags.map((item) => (
                          <Bullet key={`${selectedPack.id}-flag-${item}`} tone="danger">
                            {item}
                          </Bullet>
                        ))
                      ) : (
                        <Bullet tone="success">
                          No major prep blockers detected from the current saved signals.
                        </Bullet>
                      )}
                    </div>
                  </SectionCard>
                </div>
              </GlassCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PrepStat({ icon: Icon, label, value, helper }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
            {label}
          </div>
          <div className="mt-3 text-3xl font-black text-white">{value}</div>
          <div className="mt-2 text-sm text-white/58">{helper}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-pink-100">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </GlassCard>
  );
}

function ContextInfoCard({ label, value, helper }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs leading-6 text-white/55">{helper}</div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-red-100">
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-lg font-black text-white">{title}</div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.22em]">
        {label}
      </div>
      <div className="mt-3">{children}</div>
    </label>
  );
}

function PrepTag({ label }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75">
      {label}
    </span>
  );
}

function PackDifficultyBadge({ value }) {
  const tone =
    value === "Hard"
      ? "bg-rose-500/15 text-rose-100"
      : value === "Easy"
        ? "bg-emerald-500/15 text-emerald-100"
        : "bg-sky-500/15 text-sky-100";

  return (
    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${tone}`}>
      {value}
    </span>
  );
}

function Bullet({ children, tone = "neutral" }) {
  const toneClass =
    tone === "success"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : tone === "warning"
        ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
        : tone === "danger"
          ? "border-rose-400/20 bg-rose-500/10 text-rose-100"
          : "border-white/10 bg-white/5 text-white/72";

  return (
    <div className={`rounded-[18px] border px-4 py-3 text-sm leading-7 ${toneClass}`}>
      {children}
    </div>
  );
}

function createPrepPackForm({ targetRole, latestResumeVersion, latestResumeScore }) {
  return {
    applicationId: "",
    company: "",
    role: targetRole || "",
    linkedResumeVersion: latestResumeVersion || "",
    linkedResumeScore:
      latestResumeScore == null || Number.isNaN(latestResumeScore)
        ? ""
        : String(latestResumeScore),
    jobDescription: "",
    resumeTailored: false,
  };
}

function buildFormFromPack(pack) {
  return {
    applicationId: pack.applicationId || "",
    company: pack.company,
    role: pack.role,
    linkedResumeVersion: pack.linkedResumeVersion || "",
    linkedResumeScore:
      pack.linkedResumeScore == null ? "" : String(pack.linkedResumeScore),
    jobDescription: pack.jobDescription || "",
    resumeTailored: false,
  };
}

function getLatestResumeVersion({ resumeOverview, resumeWorkspace }) {
  return String(
    resumeWorkspace?.latestAnalysis?.context?.fileName ||
      resumeWorkspace?.latestAnalysis?.report?.fileName ||
      resumeOverview?.latestResumeFileName ||
      "",
  ).trim();
}

function getLatestResumeScore({ resumeOverview, resumeWorkspace }) {
  const value = resumeWorkspace?.latestAnalysis?.report?.atsScore ?? resumeOverview?.atsScore;
  return normalizeScore(value);
}

function getLatestRole({ resumeOverview, resumeWorkspace }) {
  return String(
    resumeWorkspace?.latestAnalysis?.report?.jobMatches?.[0]?.role ||
      resumeWorkspace?.latestAnalysis?.report?.topRole ||
      resumeOverview?.topRole ||
      "",
  ).trim();
}

function uniqueStrings(values = []) {
  const seen = new Set();
  return (Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function normalizeScore(value) {
  return Number.isFinite(Number(value))
    ? Math.max(0, Math.min(100, Math.round(Number(value))))
    : null;
}

function formatInterviewType(value) {
  if (value === "hr") {
    return "HR";
  }
  if (value === "domain") {
    return "Domain";
  }
  return "Technical";
}

function truncateText(value, limit) {
  const safeValue = String(value || "").trim();
  if (safeValue.length <= limit) {
    return safeValue;
  }
  return `${safeValue.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}
