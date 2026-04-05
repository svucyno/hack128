const supportedExtensions = ["pdf", "doc", "docx"];

function getExtension(fileName = "") {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function normalizeExtractedText(text = "") {
  const compactLines = [];
  let previousWasBlank = false;

  text
    .replace(/\u0000/g, " ")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .forEach((line) => {
      if (!line) {
        if (!previousWasBlank && compactLines.length) {
          compactLines.push("");
        }
        previousWasBlank = true;
        return;
      }

      compactLines.push(line);
      previousWasBlank = false;
    });

  return compactLines.join("\n").trim();
}

async function extractPdfText(file) {
  const [{ GlobalWorkerOptions, getDocument }, pdfWorkerModule] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);

  GlobalWorkerOptions.workerSrc = pdfWorkerModule.default;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  let text = "";

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    const lines = [];
    let currentLine = "";
    let lastY = null;

    const flushLine = () => {
      const normalizedLine = currentLine.replace(/\s+/g, " ").trim();
      if (normalizedLine) {
        lines.push(normalizedLine);
      }
      currentLine = "";
    };

    content.items.forEach((item) => {
      if (!("str" in item)) {
        return;
      }

      const value = String(item.str || "").replace(/\s+/g, " ").trim();
      const y = Array.isArray(item.transform) ? Number(item.transform[5] || 0) : 0;

      if (lastY !== null && Math.abs(y - lastY) > 4) {
        flushLine();
      }

      if (value) {
        const shouldInsertSpace =
          currentLine &&
          !/[(/-]$/.test(currentLine) &&
          !/^[,.;:!?)]/.test(value);

        currentLine = shouldInsertSpace ? `${currentLine} ${value}` : `${currentLine}${value}`;
      }

      lastY = y;

      if (item.hasEOL) {
        flushLine();
        lastY = null;
      }
    });

    flushLine();
    text += `${lines.join("\n")}\n\n`;
  }

  return normalizeExtractedText(text);
}

async function extractDocText(file) {
  const mammothModule = await import("mammoth/mammoth.browser");
  const mammoth = mammothModule.default || mammothModule;
  const arrayBuffer = await file.arrayBuffer();

  try {
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    if (value?.trim()) {
      return value;
    }
  } catch (error) {
    throw new Error(
      "This DOC file could not be parsed in-browser. Try a PDF/DOCX file or paste the text manually.",
    );
  }

  throw new Error(
    "No readable text was found in the uploaded document. Try another file or paste the content manually.",
  );
}

async function parseFileInput({
  file,
  manualText,
  emptyInputMessage,
  unsupportedFormatMessage,
  emptyFileMessage,
}) {
  if (manualText?.trim()) {
    const normalizedText = normalizeExtractedText(manualText);
    return {
      text: normalizedText,
      fileName: file?.name || "Manual input",
      previewText: normalizedText.slice(0, 600),
    };
  }

  if (!file) {
    throw new Error(emptyInputMessage);
  }

  const extension = getExtension(file.name);
  if (!supportedExtensions.includes(extension)) {
    throw new Error(unsupportedFormatMessage);
  }

  const text =
    extension === "pdf" ? await extractPdfText(file) : await extractDocText(file);
  const normalizedText = normalizeExtractedText(text);

  if (!normalizedText) {
    throw new Error(emptyFileMessage);
  }

  return {
    text: normalizedText,
    fileName: file.name,
    previewText: normalizedText.slice(0, 600),
  };
}

export async function parseResumeInput({ file, manualText }) {
  return parseFileInput({
    file,
    manualText,
    emptyInputMessage: "Upload a resume file or paste resume text before analyzing.",
    unsupportedFormatMessage: "Unsupported file format. Use PDF, DOC, or DOCX.",
    emptyFileMessage: "The uploaded file did not contain enough readable text to analyze.",
  });
}

export async function parseDocumentInput({ file, manualText }) {
  return parseFileInput({
    file,
    manualText,
    emptyInputMessage:
      "Upload a PDF, DOC, or DOCX file, or paste the document text before summarizing.",
    unsupportedFormatMessage: "Unsupported file format. Use PDF, DOC, or DOCX.",
    emptyFileMessage: "The uploaded file did not contain enough readable text to summarize.",
  });
}
