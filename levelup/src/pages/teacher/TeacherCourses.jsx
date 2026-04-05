import { useState } from "react";
import TeacherNavbar from "../../components/TeacherNavbar";

const starterVideos = [{ title: "Intro", url: "" }];
const starterPdfs = [{ name: "Syllabus", url: "" }];

export default function TeacherCourses() {
  const [course, setCourse] = useState({
    title: "",
    subtitle: "",
    description: "",
    price: "499",
    category: "Core CS",
    level: "Beginner",
    duration: "6h",
  });
  const [videos, setVideos] = useState(starterVideos);
  const [pdfs, setPdfs] = useState(starterPdfs);
  const [liveClass, setLiveClass] = useState({ date: "", time: "", link: "" });
  const [enableDoubts, setEnableDoubts] = useState(true);

  const updateCourse = (key, value) => {
    setCourse((prev) => ({ ...prev, [key]: value }));
  };

  const updateVideo = (index, key, value) => {
    setVideos((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const updatePdf = (index, key, value) => {
    setPdfs((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const addVideo = () => setVideos((prev) => [...prev, { title: "", url: "" }]);
  const addPdf = () => setPdfs((prev) => [...prev, { name: "", url: "" }]);

  return (
    <div className="teacherPage">
      <TeacherNavbar />
      <main className="teacherMain">
        <section className="teacherHero teacherHeroCompact">
          <div className="teacherHeroGlow" />
          <div className="teacherHeroContent">
            <div className="teacherKicker">Course builder</div>
            <h1>Create a course like Udemy.</h1>
            <p>Upload videos, PDFs, add descriptions, and enable a doubt section below each lesson.</p>
          </div>
          <div className="teacherHeroActions">
            <button className="teacherPrimary">Save draft</button>
            <button className="teacherSecondary">Preview course</button>
          </div>
        </section>

        <section className="teacherBuilder">
          <div className="teacherBuilderColumn">
            <div className="teacherBoardCard teacherBoardWide">
              <div className="teacherCardTitle">Course details</div>
              <div className="teacherFormGrid">
                <label>
                  Title
                  <input value={course.title} onChange={(e) => updateCourse("title", e.target.value)} />
                </label>
                <label>
                  Subtitle
                  <input value={course.subtitle} onChange={(e) => updateCourse("subtitle", e.target.value)} />
                </label>
                <label>
                  Category
                  <input value={course.category} onChange={(e) => updateCourse("category", e.target.value)} />
                </label>
                <label>
                  Level
                  <input value={course.level} onChange={(e) => updateCourse("level", e.target.value)} />
                </label>
                <label>
                  Duration
                  <input value={course.duration} onChange={(e) => updateCourse("duration", e.target.value)} />
                </label>
                <label>
                  Price
                  <input value={course.price} onChange={(e) => updateCourse("price", e.target.value)} />
                </label>
                <label className="teacherFormSpan">
                  Description
                  <textarea
                    rows={4}
                    value={course.description}
                    onChange={(e) => updateCourse("description", e.target.value)}
                  />
                </label>
              </div>
              <div className="teacherPillRow">
                <span className="teacherPill">Category: {course.category}</span>
                <span className="teacherPill">Level: {course.level}</span>
                <span className="teacherPill">Duration: {course.duration}</span>
              </div>
            </div>

            <div className="teacherBoardCard">
              <div className="teacherCardTitle">Curriculum builder</div>
              <div className="teacherListStack">
                {videos.map((video, index) => (
                  <div key={`video-${index}`} className="teacherInlineItem teacherInlineSplit">
                    <input
                      placeholder="Lesson title"
                      value={video.title}
                      onChange={(e) => updateVideo(index, "title", e.target.value)}
                    />
                    <input
                      placeholder="Video URL"
                      value={video.url}
                      onChange={(e) => updateVideo(index, "url", e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="teacherInlineActions">
                <button className="teacherGhost" onClick={addVideo}>Add module</button>
                <button className="teacherSecondary">Import playlist</button>
              </div>
            </div>

            <div className="teacherBoardCard">
              <div className="teacherCardTitle">Resources & PDFs</div>
              <div className="teacherDropzone">
                <strong>Drop files here</strong>
                <span>Upload slides, notes, templates, and practice sheets.</span>
              </div>
              <div className="teacherListStack">
                {pdfs.map((pdf, index) => (
                  <div key={`pdf-${index}`} className="teacherInlineItem teacherInlineSplit">
                    <input
                      placeholder="PDF name"
                      value={pdf.name}
                      onChange={(e) => updatePdf(index, "name", e.target.value)}
                    />
                    <input
                      placeholder="PDF URL"
                      value={pdf.url}
                      onChange={(e) => updatePdf(index, "url", e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <button className="teacherGhost" onClick={addPdf}>Add PDF</button>
            </div>

            <div className="teacherBoardCard teacherBoardWide">
              <div className="teacherCardTitle">Live teaching</div>
              <div className="teacherFormGrid">
                <label>
                  Date
                  <input
                    type="date"
                    value={liveClass.date}
                    onChange={(e) => setLiveClass({ ...liveClass, date: e.target.value })}
                  />
                </label>
                <label>
                  Time
                  <input
                    type="time"
                    value={liveClass.time}
                    onChange={(e) => setLiveClass({ ...liveClass, time: e.target.value })}
                  />
                </label>
                <label className="teacherFormSpan">
                  Live meeting link
                  <input value={liveClass.link} onChange={(e) => setLiveClass({ ...liveClass, link: e.target.value })} />
                </label>
              </div>
            </div>
          </div>

          <div className="teacherBuilderSidebar">
            <div className="teacherBoardCard teacherPreviewCard">
              <div className="teacherCardTitle">Course preview</div>
              <div className="teacherPreviewHero">
                <div className="teacherPreviewTag">{course.category}</div>
                <div className="teacherPreviewGlow" />
              </div>
              <div className="teacherPreviewBody">
                <h3>{course.title || "Course title"}</h3>
                <p>{course.subtitle || "Add a short subtitle to attract students."}</p>
                <div className="teacherPreviewMeta">
                  <span>{course.duration}</span>
                  <span>{course.level}</span>
                  <span>{videos.length} lessons</span>
                </div>
                <div className="teacherPreviewPriceRow">
                  <div>
                    <div className="teacherPreviewPrice">₹{course.price}</div>
                    <small>One-time purchase</small>
                  </div>
                  <div className="teacherMiniStat">
                    <strong>4.8</strong>
                    <span>Avg rating</span>
                  </div>
                </div>
                <button className="teacherPrimary">Publish course</button>
              </div>
            </div>

            <div className="teacherBoardCard">
              <div className="teacherCardTitle">Doubt section</div>
              <div className="teacherToggle">
                <input
                  id="doubt-toggle"
                  type="checkbox"
                  checked={enableDoubts}
                  onChange={(e) => setEnableDoubts(e.target.checked)}
                />
                <label htmlFor="doubt-toggle">Enable discussion below each lesson</label>
              </div>
            </div>

            <div className="teacherBoardCard">
              <div className="teacherCardTitle">Launch checklist</div>
              <ul className="teacherChecklist">
                <li>Add at least 3 lessons</li>
                <li>Upload PDF notes</li>
                <li>Set a course price</li>
                <li>Enable doubt section</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
