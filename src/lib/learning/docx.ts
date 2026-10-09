// Safe text extraction for the learning guide: published Google Docs HTML and uploaded DOCX.
// Content is untrusted data. Nothing is executed: markup is tokenised with regexes into plain text.
import { Unzip, UnzipInflate } from "fflate";

export const MAX_DOCX_BYTES = 10 * 1024 * 1024;
export const MAX_ZIP_ENTRIES = 1000;
export const MAX_XML_BYTES = 20 * 1024 * 1024;
export const DOCX_INPUT_CHUNK = 16 * 1024;

export class DocxError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

function decodeEntities(s: string) {
  return s
    .replace(/&#x([0-9a-f]{1,6});/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d{1,7});/g, (_, d) => safeChar(Number(d)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
function safeChar(n: number) {
  return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : "";
}

function tidy(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t\u00a0]+$/g, "").replace(/^[ \u00a0]+/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Published Google Doc (/pub) HTML → plain text in the same shape as the txt export. */
export function htmlToText(html: string) {
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  const s = body
    .replace(/<(script|style|noscript|template|svg|head)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<li\b[^>]*>/gi, "\n* ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|table|ul|ol)>/gi, "\n")
    .replace(/<\/t[dh]>/gi, "\t")
    .replace(/<[^>]*>/g, "");
  return tidy(decodeEntities(s));
}

/** WordprocessingML document.xml → plain text (paragraphs, list bullets, tabs, breaks). */
export function documentXmlToText(xml: string) {
  const out: string[] = [];
  const paras = xml.match(/<w:p[\s>][\s\S]*?<\/w:p>|<w:p\/>/g) ?? [];
  for (const p of paras) {
    const bullet = /<w:numPr>/.test(p) ? "* " : "";
    let line = "";
    const tokens = p.match(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>|<w:tab\/>|<w:br[^>]*\/>|<w:cr\/>/g) ?? [];
    for (const t of tokens) {
      if (t.startsWith("<w:tab")) line += "\t";
      else if (t.startsWith("<w:br") || t.startsWith("<w:cr")) line += "\n";
      else line += t.replace(/^<w:t[^>]*>/, "").replace(/<\/w:t>$/, "");
    }
    out.push(bullet + decodeEntities(line));
  }
  return tidy(out.join("\n"));
}

/**
 * Extracts word/document.xml from a DOCX with byte/entry limits measured on actual inflated output
 * (zip-bomb safe). Macro-enabled packages are rejected. Throws DocxError codes.
 */
export function docxToText(bytes: Uint8Array) {
  if (bytes.byteLength > MAX_DOCX_BYTES) throw new DocxError("file_too_large");
  if (bytes.byteLength < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 3 || bytes[3] !== 4)
    throw new DocxError("not_a_docx");
  let entries = 0;
  let total = 0;
  let sawTypes = false;
  let failure: string | null = null;
  const chunks: Uint8Array[] = [];
  let finished = false;
  const uz = new Unzip();
  uz.register(UnzipInflate);
  uz.onfile = (f) => {
    entries++;
    if (entries > MAX_ZIP_ENTRIES) failure ??= "too_many_entries";
    if (f.name.includes("..") || f.name.startsWith("/")) failure ??= "invalid_entry_name";
    if (/vbaProject\.bin$/i.test(f.name)) failure ??= "macro_content_rejected";
    if (f.name === "[Content_Types].xml") sawTypes = true;
    if (f.name !== "word/document.xml" || failure) return;
    // Early heuristic from the (untrusted) header; actual inflated bytes are still enforced below.
    if (typeof f.originalSize === "number" && f.originalSize > MAX_XML_BYTES) {
      failure ??= "document_xml_too_large";
      return;
    }
    f.ondata = (err, chunk, final) => {
      if (err) {
        failure ??= "corrupt_docx";
        return;
      }
      total += chunk.byteLength;
      if (total > MAX_XML_BYTES) {
        failure ??= "document_xml_too_large";
        f.terminate();
        return;
      }
      chunks.push(chunk);
      if (final) finished = true;
    };
    f.start();
  };
  // Feed small bounded input chunks so one push can only inflate a bounded amount before
  // ondata enforces the output limit; stop immediately on the first failure.
  try {
    for (let off = 0; off < bytes.byteLength && !failure; off += DOCX_INPUT_CHUNK) {
      const end = Math.min(off + DOCX_INPUT_CHUNK, bytes.byteLength);
      uz.push(bytes.subarray(off, end), end === bytes.byteLength);
    }
  } catch {
    failure ??= "corrupt_docx";
  }
  if (failure) throw new DocxError(failure);
  if (!sawTypes || !finished) throw new DocxError("not_a_docx");
  const xml = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    xml.set(c, o);
    o += c.byteLength;
  }
  return documentXmlToText(new TextDecoder("utf-8").decode(xml));
}

