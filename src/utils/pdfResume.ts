// Extracts plain text from a resume PDF entirely in the browser (nothing is uploaded).

export const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB

/** Errors with a message that is safe to show to the user */
export class PdfResumeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfResumeError';
  }
}

const normalize = (text: string) =>
  text
    .replace(/\r/g, '')
    .replace(/[ \t\u00a0]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export async function extractPdfText(file: File): Promise<string> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) throw new PdfResumeError('Please choose a PDF file.');
  if (file.size > MAX_PDF_BYTES) throw new PdfResumeError('This PDF is larger than 5 MB. Please use a smaller file or paste your resume.');

  // Loaded on demand so pdf.js only downloads when someone actually uploads a file
  const [pdfjs, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  } catch (err) {
    if (err instanceof Error && err.name === 'PasswordException') {
      throw new PdfResumeError('This PDF is password protected. Please remove the password or paste your resume.');
    }
    throw new PdfResumeError('Could not read this PDF. Please paste your resume instead.');
  }

  try {
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let pageText = '';
      for (const item of content.items) {
        if ('str' in item) {
          pageText += item.str + (item.hasEOL ? '\n' : ' ');
        }
      }
      pages.push(pageText);
    }
    return normalize(pages.join('\n\n'));
  } finally {
    await doc.destroy();
  }
}
