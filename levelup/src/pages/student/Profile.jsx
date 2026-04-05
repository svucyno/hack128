import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { onValue, ref, update } from "firebase/database";
import StudentNavbar from "../../components/StudentNavbar";
import { auth, db } from "../../firebase";
import dinoProfile from "../../assets/images/profile-dino.png";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState(null);
  const [editing, setEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(dinoProfile);
  const [formState, setFormState] = useState({
    name: "",
    city: "",
    college: "",
    department: "",
    year: "",
    roll: "",
    phone: "",
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setUid(user.uid);

      const profileRef = ref(db, `users/${user.uid}`);
      const unsubProfile = onValue(profileRef, (snap) => {
        const data = snap.exists() ? snap.val() : null;
        setProfile(data);
        if (data?.avatarUrl) {
          setAvatarPreview(data.avatarUrl);
        } else {
          setAvatarPreview(dinoProfile);
        }
        setFormState((prev) => ({
          ...prev,
          name: data?.name || data?.fullName || "",
          city: data?.city || "",
          college: data?.college || "",
          department: data?.department || "",
          year: data?.year || "",
          roll: data?.roll || data?.staffId || "",
          phone: data?.phone || "",
        }));
        setLoading(false);
      });

      return () => {
        unsubProfile();
      };
    });

    return () => {
      unsubAuth();
    };
  }, []);

  const rows = useMemo(() => ([
    { label: "Name", value: profile?.name || profile?.fullName },
    { label: "Email", value: profile?.email },
    { label: "Role", value: profile?.role || profile?.designation },
    { label: "College / School", value: profile?.college },
    { label: "Department / Branch", value: profile?.department },
    { label: "Year / Semester", value: profile?.year },
    { label: "Roll number / ID", value: profile?.roll || profile?.staffId },
    { label: "Phone number", value: profile?.phone },
    { label: "City", value: profile?.city },
  ].filter((row) => row.value)), [profile]);

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === "string") {
        const nextAvatar = reader.result;
        setAvatarPreview(nextAvatar);
        if (uid) {
          await update(ref(db, `users/${uid}`), { avatarUrl: nextAvatar });
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFieldChange = (key, value) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!uid) return;
    const payload = {
      name: formState.name.trim(),
      city: formState.city.trim(),
      college: formState.college.trim(),
      department: formState.department.trim(),
      year: formState.year.trim(),
      roll: formState.roll.trim(),
      phone: formState.phone.trim(),
      avatarUrl: avatarPreview,
    };
    await update(ref(db, `users/${uid}`), payload);
    setEditing(false);
  };

  return (
    <div className="studentPage">
      <StudentNavbar />
      <main className="studentMain">
        <section className="studentSection">
          <div className="profileShell">
            <div className="profileSparkles" aria-hidden="true">
              {Array.from({ length: 18 }).map((_, index) => (
                <span key={`spark-${index}`} />
              ))}
            </div>
            <div className="profileTopBar">
              <span>Dashboard : Profile</span>
              <div className="profileTopIcons">
                <span />
                <span />
              </div>
            </div>

            <div className="profileHeroCard">
              <div className="profileHeroAura" />
              <div className="profileGlowOrb" />
              <div className="profileAvatarLarge">
              <img
                src={avatarPreview || dinoProfile}
                alt="Profile"
                onError={() => setAvatarPreview(dinoProfile)}
              />
                <div className="profileAvatarRing" />
              </div>
              <div className="profileHeroInfo">
                <h2>{profile?.name || profile?.fullName || "Your Name"}</h2>
                <div className="profileLevelPill">Level 12</div>
                <div className="profileMetaList">
                  <span>{profile?.email || "you@college.edu"}</span>
                  <span>{profile?.city || "Hyderabad"}</span>
                </div>
                <div className="profileXp">
                  <div className="profileXpLabel">XP 3,400 / 4,000</div>
                  <div className="profileXpBar">
                    <span style={{ width: "85%" }} />
                  </div>
                  <div className="profileRank">Advanced Learner</div>
                </div>
              </div>
              <div className="profileActions">
                <button className="studentPrimary" onClick={() => setEditing((prev) => !prev)}>
                  {editing ? "Cancel" : "Edit Profile"}
                </button>
                <label className="studentGhost profileUpload">
                  Change photo
                  <input type="file" accept="image/*" onChange={handleAvatarChange} />
                </label>
              </div>
            </div>

            <div className="profileTabs">
              <button className="profileTab is-active">Profile</button>
              <button className="profileTab">Achievements</button>
              <button className="profileTab">Settings</button>
            </div>

            <div className="profileStatGrid">
              <div className="profileStatCard">
                <div className="profileStatTitle">Courses Enrolled</div>
                <div className="profileStatNumber">8</div>
              </div>
              <div className="profileStatCard">
                <div className="profileStatTitle">Quizzes Completed</div>
                <div className="profileStatNumber">52</div>
              </div>
              <div className="profileStatCard">
                <div className="profileStatTitle">Achievements</div>
                <div className="profileStatNumber">14</div>
              </div>
              <div className="profileStatCard">
                <div className="profileStatTitle">XP Points</div>
                <div className="profileStatNumber">24,500</div>
              </div>
            </div>

            <div className="profileGrid">
              <div className="profileCard profileCardWide">
                <div className="profileCardTitle">Personal Info</div>
                {!loading && profile && !editing && rows.map((row) => (
                  <div key={row.label} className="profileRow">
                    <span>{row.label}</span>
                    <span>{row.value}</span>
                  </div>
                ))}
                {loading && (
                  <div className="profileRow">
                    <span>Loading</span>
                    <span>Fetching profile...</span>
                  </div>
                )}
                {!loading && !profile && (
                  <div className="profileRow">
                    <span>Status</span>
                    <span>No profile found</span>
                  </div>
                )}
                {!loading && profile && editing && (
                  <div className="profileForm">
                    <label>
                      Name
                      <input value={formState.name} onChange={(event) => handleFieldChange("name", event.target.value)} />
                    </label>
                    <label>
                      City
                      <input value={formState.city} onChange={(event) => handleFieldChange("city", event.target.value)} />
                    </label>
                    <label>
                      College / School
                      <input
                        value={formState.college}
                        onChange={(event) => handleFieldChange("college", event.target.value)}
                      />
                    </label>
                    <label>
                      Department / Branch
                      <input
                        value={formState.department}
                        onChange={(event) => handleFieldChange("department", event.target.value)}
                      />
                    </label>
                    <label>
                      Year / Semester
                      <input value={formState.year} onChange={(event) => handleFieldChange("year", event.target.value)} />
                    </label>
                    <label>
                      Roll number / ID
                      <input value={formState.roll} onChange={(event) => handleFieldChange("roll", event.target.value)} />
                    </label>
                    <label>
                      Phone number
                      <input value={formState.phone} onChange={(event) => handleFieldChange("phone", event.target.value)} />
                    </label>
                    <button className="studentPrimary" type="button" onClick={handleSave}>
                      Save changes
                    </button>
                  </div>
                )}
              </div>
              <div className="profileCard">
                <div className="profileCardTitle">Badges</div>
                <div className="profileBadges">
                  <span>7-day streak</span>
                  <span>100 MCQs</span>
                  <span>Quiz Ace</span>
                  <span>Fast Finisher</span>
                </div>
                <div className="profileCardTitle">Learning goal</div>
                <div className="profileGoal">
                  Finish DBMS in 14 days · 5 lessons left
                </div>
              </div>
              <div className="profileCard">
                <div className="profileCardTitle">Quick actions</div>
                <div className="profileQuick">
                  <button className="studentGhost">Manage courses</button>
                  <button className="studentGhost">View certificates</button>
                  <button className="studentGhost">Account settings</button>
                </div>
              </div>
            </div>
            <div className="profileWave" />
          </div>
        </section>
      </main>
    </div>
  );
}
