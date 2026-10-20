import { createHash } from "node:crypto";
import { z } from "zod";
import type { Db } from "./queries.server";
import { rpc } from "./queries.server";
import { docxToText } from "@/lib/learning/docx";
const MAX_BYTES = 6_000_000;
function fileType(bytes: Buffer, type: string) {
  const signature = bytes.subarray(0, 8).toString("hex");
  if (type === "application/pdf") return bytes.subarray(0, 5).toString() === "%PDF-";
  if (type === "image/png") return signature === "89504e470d0a1a0a";
  if (type === "image/jpeg") return signature.startsWith("ffd8ff");
  if (type === "text/plain" || type === "text/csv")
    return (
      !bytes.includes(0) &&
      !/^\s*(<(!doctype|html|script)|#!)/i.test(bytes.toString("utf8").slice(0, 100))
    );
  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    try {
      docxToText(bytes);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
export async function fileAction(
  db: Db,
  uid: string,
  action: string,
  input: Record<string, unknown>,
  key: string,
): Promise<Record<string, unknown>> {
  if (action === "download") {
    const id = z.string().uuid().parse(input.document_id);
    const entity = z
      .enum(["source_documents", "resources", "evidence"])
      .default("source_documents")
      .parse(input.entity);
    const { data, error } = await db
      .from(entity)
      .select(entity === "source_documents" ? "id,title,storage_path" : "id,title,url")
      .eq("id", id)
      .eq("user_id", uid)
      .is("deleted_at", null)
      .maybeSingle();
    const record = data as {
      id: string;
      title: string;
      storage_path?: string;
      url?: string;
    } | null;
    const path =
      entity === "source_documents"
        ? record?.storage_path
        : String(record?.url ?? "").startsWith("storage:")
          ? String(record?.url).slice(8)
          : null;
    if (
      error ||
      !record ||
      !path ||
      !String(path).startsWith(uid + "/") ||
      String(path)
        .split("/")
        .some((p) => p === "." || p === "..") ||
      /[\\%]/.test(String(path))
    )
      throw new Error("attachment_not_found");
    const { data: signed, error: e } = await db.storage
      .from("career-evidence")
      .createSignedUrl(path!, 300);
    if (e || !signed) throw new Error("download_failed");
    return { title: record.title, download_url: signed.signedUrl, expires_in: 300, private: true };
  }
  const v = z
    .object({
      title: z.string().min(1).max(300),
      target: z.enum(["source_documents", "resources", "evidence"]).default("source_documents"),
      skill_id: z.string().uuid().nullable().optional(),
      project_id: z.string().uuid().nullable().optional(),
      kind: z
        .enum([
          "resume",
          "job_description",
          "certificate",
          "article",
          "note",
          "transcript",
          "other",
        ])
        .default("other"),
      mime_type: z.string().max(80),
      base64: z.string().max(8_000_000),
    })
    .strict()
    .parse(input);
  if (v.target === "source_documents" && (v.skill_id || v.project_id))
    throw new Error("attachment_association_requires_resource_or_evidence");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(v.base64)) throw new Error("invalid_attachment");
  const bytes = Buffer.from(v.base64, "base64");
  if (!bytes.length || bytes.length > MAX_BYTES || !fileType(bytes, v.mime_type))
    throw new Error("invalid_attachment");
  const hash = createHash("sha256").update(bytes).digest("hex"),
    path = uid + "/control-attachments/" + hash;
  const { data: prior, error: lookupError } = await db
    .from("source_documents")
    .select("id,title,storage_path")
    .eq("user_id", uid)
    .eq("storage_path", path)
    .is("deleted_at", null)
    .maybeSingle();
  if (lookupError) throw new Error("attachment_lookup_failed");
  if (prior && v.target === "source_documents")
    return { status: "completed", document: prior, replayed: true };
  const { error } = await db.storage
    .from("career-evidence")
    .upload(path, bytes, { contentType: v.mime_type, upsert: false });
  if (error && !/already exists|duplicate/i.test(error.message)) throw new Error("upload_failed");
  if (v.target !== "source_documents")
    return rpc<Record<string, unknown>>(db, "control_attach_record", {
      p_uid: uid,
      p_target: v.target,
      p_input: {
        title: v.title,
        kind: v.mime_type.startsWith("image/") ? "image" : "file",
        ...(v.skill_id !== undefined ? { skill_id: v.skill_id } : {}),
        ...(v.project_id !== undefined ? { project_id: v.project_id } : {}),
      },
      p_path: path,
      p_key: key,
    });
  const result = await rpc<Record<string, unknown>>(db, "control_attach_document", {
    p_uid: uid,
    p_title: v.title,
    p_kind: v.kind,
    p_path: path,
    p_key: key,
  });
  return result;
}
