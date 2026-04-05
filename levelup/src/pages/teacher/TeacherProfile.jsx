import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { onValue, ref, update } from "firebase/database";
import TeacherNavbar from "../../components/TeacherNavbar";
import { auth, db } from "../../firebase";
import defaultAvatar from "../../assets/images/profile-dino.png";

export default function TeacherProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(defaultAvatar);
  const [editing, setEditing] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    designation: "",
    department: "",
    college: "",
    staffId: "",
    phone: "",
    city: "",
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
        setAvatarPreview(data?.avatarUrl || defaultAvatar);
        setFormState({
          name: data?.name || data?.fullName || "",
          designation: data?.designation || "Teacher",
          department: data?.department || "",
          college: data?.college || "",
          staffId: data?.staffId || data?.roll || "",
          phone: data?.phone || "",
          city: data?.city || "",
        });
        setLoading(false);
      });
      return () => unsubProfile();
    });
    return () => unsubAuth();
  }, []);

  const rows = useMemo(() => ([
    { label: "Name", value: profile?.name || profile?.fullName },
    { label: "Email", value: profile?.email },
    { label: "Role", value: profile?.role || "Teacher" },
    { label: "Designation", value: profile?.designation || "Teacher" },
    { label: "Department", value: profile?.department },
    { label: "College / School", value: profile?.college },
    { label: "Staff ID", value: profile?.staffId || profile?.roll },
    { label: "Phone number", value: profile?.phone },
    { label: "City", value: profile?.city },
  ].filter((row) => row.value)), [profile]);

  const resizeAvatar = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Invalid image data."));
        return;
      }
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Failed to read image."));
    img.onload = () => {
      const size = 240;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported."));
        return;
      }
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (size - w) / 2;
      const y = (size - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => reject(new Error("Invalid image file."));
    reader.readAsDataURL(file);
  });

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const nextAvatar = await resizeAvatar(file);
      setAvatarPreview(nextAvatar);
      if (uid) {
        await update(ref(db, `users/${uid}`), { avatarUrl: nextAvatar });
      }
    } catch (error) {
      console.error("Avatar update error:", error);
    }
  };

  const handleFieldChange = (key, value) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!uid) return;
    await update(ref(db, `users/${uid}`), {
      name: formState.name.trim(),
      designation: formState.designation.trim(),
      department: formState.department.trim(),
      college: formState.college.trim(),
      staffId: formState.staffId.trim(),
      phone: formState.phone.trim(),
      city: formState.city.trim(),
      avatarUrl: avatarPreview,
    });
    setEditing(false);
  };

  return (
    <div className="teacherPage">
      <TeacherNavbar />
      <main className="teacherMain">
        <section className="teacherProfileShell">
          <div className="teacherProfileParticles" aria-hidden="true">
            {Array.from({ length: 16 }).map((_, index) => (
              <span key={`teacher-particle-${index}`} />
            ))}
          </div>
          <div className="teacherProfileHero">
            <div className="teacherProfileGlow" />
            <div className="teacherProfileBadge">
              <img src={avatarPreview} alt="Teacher" onError={() => setAvatarPreview(defaultAvatar)} />
              <div className="teacherProfileRing" />
            </div>
            <div>
              <div className="teacherKicker">Teacher Profile</div>
              <h1>{profile?.name || profile?.fullName || "Your Name"}</h1>
              <p>{profile?.email || "you@school.edu"} · {profile?.designation || "Instructor"}</p>
            </div>
            <div className="teacherProfileActions">
              <button className="teacherPrimary" onClick={() => setEditing((prev) => !prev)}>
                {editing ? "Cancel" : "Edit profile"}
              </button>
              <label className="teacherGhost teacherUpload">
                Upload image
                <input type="file" accept="image/*" onChange={handleAvatarChange} />
              </label>
            </div>
          </div>
          <div className="teacherProfileGrid">
          <div className="teacherBoardCard teacherBoardWide">
            <div className="teacherCardTitle">Personal Info</div>
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
            {!loading && profile && !editing && rows.map((row) => (
              <div key={row.label} className="profileRow">
                <span>{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
            {!loading && profile && editing && (
              <div className="profileForm">
                <label>
                  Name
                  <input value={formState.name} onChange={(event) => handleFieldChange("name", event.target.value)} />
                </label>
                <label>
                  Designation
                  <input
                    value={formState.designation}
                    onChange={(event) => handleFieldChange("designation", event.target.value)}
                  />
                </label>
                <label>
                  Department
                  <input
                    value={formState.department}
                    onChange={(event) => handleFieldChange("department", event.target.value)}
                  />
                </label>
                <label>
                  College / School
                  <input
                    value={formState.college}
                    onChange={(event) => handleFieldChange("college", event.target.value)}
                  />
                </label>
                <label>
                  Staff ID
                  <input value={formState.staffId} onChange={(event) => handleFieldChange("staffId", event.target.value)} />
                </label>
                <label>
                  Phone number
                  <input value={formState.phone} onChange={(event) => handleFieldChange("phone", event.target.value)} />
                </label>
                <label>
                  City
                  <input value={formState.city} onChange={(event) => handleFieldChange("city", event.target.value)} />
                </label>
                <button className="teacherPrimary" type="button" onClick={handleSave}>
                  Save changes
                </button>
              </div>
            )}
          </div>
          <div className="teacherBoardCard teacherSummaryCard">
            <div className="teacherCardTitle">Teaching Summary</div>
            <div className="teacherSummaryGrid">
              <div className="teacherSummaryItem">
                <span>Courses</span>
                <strong>4 active</strong>
              </div>
              <div className="teacherSummaryItem">
                <span>Students</span>
                <strong>186 enrolled</strong>
              </div>
              <div className="teacherSummaryItem">
                <span>Pending</span>
                <strong>12 grading</strong>
              </div>
              <div className="teacherSummaryItem">
                <span>Class score</span>
                <strong>84%</strong>
              </div>
            </div>
            <div className="teacherSummaryPulse">
              <span>Live</span>
              <div className="teacherSummaryBar">
                <span style={{ width: "84%" }} />
              </div>
              <small>Performance trend</small>
            </div>
          </div>
          <div className="teacherBoardCard">
            <div className="teacherCardTitle">Quick Actions</div>
            <div className="teacherQuickActions">
              <button className="teacherGhost">Edit profile</button>
              <button className="teacherGhost">Update office hours</button>
              <button className="teacherGhost">Download report</button>
            </div>
          </div>
          </div>
        </section>
      </main>
    </div>
  );
}
