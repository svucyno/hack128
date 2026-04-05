import { jsPDF } from "jspdf";

function addWrappedText(doc, text, x, y, width, lineHeight = 16) {
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export function downloadAnalysisReport(analysis) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  let y = 48;

  const writeSection = (title, lines) => {
    if (y > 700) {
      doc.addPage();
      y = 48;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title, margin, y);
    y += 22;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    lines.forEach((line) => {
      y = addWrappedText(doc, `• ${line}`, margin, y, contentWidth);
      y += 6;
    });
  };

  doc.setFillColor(10, 10, 14);
  doc.rect(0, 0, pageWidth, 98, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("ResumeOS Analysis Report", margin, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Candidate: ${analysis.extractedUser.name}`, margin, 72);
  doc.text(`ATS Score: ${analysis.atsScore}/100`, margin + 230, 72);

  doc.setTextColor(20, 24, 33);
  y = 128;

  writeSection("Profile", [
    `Email: ${analysis.extractedUser.email}`,
    `Phone: ${analysis.extractedUser.phone}`,
    `Experience Level: ${analysis.extractedUser.experienceLevel} (${analysis.extractedUser.yearsExperienceDisplay} years inferred)`,
    `Experience Note: ${analysis.extractedUser.experienceNote}`,
    `Education: ${analysis.extractedUser.educationLevel}`,
    `Resume Word Count: ${analysis.resumeWordCount}`,
  ]);

  writeSection("ATS Breakdown", [
    `Keyword Match: ${analysis.breakdown.keywordMatch}/30`,
    `Skills Match: ${analysis.breakdown.skillsMatch}/25`,
    `Experience: ${analysis.breakdown.experience}/15`,
    `Education: ${analysis.breakdown.education}/10`,
    `Formatting: ${analysis.breakdown.formatting}/10`,
    `Projects/Impact: ${analysis.breakdown.projectsImpact}/10`,
  ]);

  writeSection(
    "Top Role Matches",
    analysis.jobMatches.map(
      (match) => `${match.role}: ${match.match}% fit | Focus areas: ${match.focusAreas.join(", ")}`,
    ),
  );

  writeSection("Extracted Skills", [analysis.extractedSkills.join(", ") || "No clear skills detected"]);
  writeSection("Skill Gaps", [analysis.missingSkills.join(", ") || "No critical gaps detected"]);
  writeSection("Improvement Suggestions", analysis.suggestions);
  writeSection("Career Recommendations", analysis.careerRecommendations);

  if (analysis.jdComparison) {
    writeSection("Resume vs Job Description", [
      `Alignment Score: ${analysis.jdComparison.score}%`,
      `Matched Keywords: ${analysis.jdComparison.matchedKeywords.join(", ") || "None"}`,
      `Missing Keywords: ${analysis.jdComparison.missingKeywords.join(", ") || "None"}`,
    ]);
  }

  const reportName = `${analysis.extractedUser.name || "resume"}-analysis-report.pdf`
    .toLowerCase()
    .replace(/\s+/g, "-");

  doc.save(reportName);
}
