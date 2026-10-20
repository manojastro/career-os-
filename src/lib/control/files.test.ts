import { describe, it, expect, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { fileAction } from "./files.server";
const uid = "00000000-0000-4000-8000-000000000001";
function fixture(row: Record<string, unknown>[] = []) {
  const calls: { url: string; body: unknown }[] = [];
  const fetcher = vi.fn(async (info: RequestInfo | URL, init?: RequestInit) => {
    const url = String(info);
    let body: unknown = init?.body;
    try {
      body = JSON.parse(String(body));
    } catch {
      /* Binary upload. */
    }
    calls.push({ url, body });
    const result = url.includes("/storage/v1/object/sign/")
      ? { signedURL: "/object/sign/career-evidence/" + uid + "/file?token=fixture" }
      : url.includes("/storage/v1/")
        ? { Key: "saved" }
        : url.includes("/rpc/")
          ? { status: "completed", processing: "not_started" }
          : row;
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  return {
    db: createClient("https://fixture.supabase.co", "fixture-only", {
      global: { fetch: fetcher },
      auth: { persistSession: false },
    }),
    calls,
  };
}
describe("private attachment transport", () => {
  it("uploads actual validated PDF bytes and creates resource metadata under the owner prefix", async () => {
    const { db, calls } = fixture();
    const result = await fileAction(
      db,
      uid,
      "upload",
      {
        title: "Fixture PDF",
        target: "resources",
        mime_type: "application/pdf",
        base64: Buffer.from("%PDF-1.7\nfixture").toString("base64"),
      },
      "fixture:upload:1",
    );
    expect(result.status).toBe("completed");
    expect(calls.some((c) => c.url.includes("/" + uid + "/control-attachments/"))).toBe(true);
    const rpc = calls.find((c) => c.url.includes("/rpc/control_attach_record"))?.body as Record<
      string,
      unknown
    >;
    expect(rpc.p_uid).toBe(uid);
    expect(rpc.p_target).toBe("resources");
  });
  it("maps evidence screenshots to image metadata and reports processing as not started", async () => {
    const { db, calls } = fixture();
    const result = await fileAction(
      db,
      uid,
      "upload",
      {
        title: "Fixture screenshot",
        target: "evidence",
        mime_type: "image/png",
        base64: Buffer.from("89504e470d0a1a0a", "hex").toString("base64"),
      },
      "fixture:image:1",
    );
    expect(result.processing).toBe("not_started");
    expect(
      (calls.find((c) => c.url.includes("/rpc/"))?.body as { p_input: { kind: string } }).p_input
        .kind,
    ).toBe("image");
  });
  it("rejects MIME spoofing and executable/HTML content before storage", async () => {
    for (const mime of ["application/pdf", "text/plain", "application/octet-stream"]) {
      const { db, calls } = fixture();
      await expect(
        fileAction(
          db,
          uid,
          "upload",
          {
            title: "Bad file",
            mime_type: mime,
            base64: Buffer.from("<html>bad</html>").toString("base64"),
          },
          "fixture:bad:file",
        ),
      ).rejects.toThrow("invalid_attachment");
      expect(calls).toHaveLength(0);
    }
  });
  it("refuses cross owner or traversal references without signing", async () => {
    for (const path of [
      "00000000-0000-4000-8000-000000000002/private.pdf",
      uid + "/../private.pdf",
      uid + "/%2e%2e/file",
    ]) {
      const { db, calls } = fixture([{ id: uid, title: "Forbidden", url: "storage:" + path }]);
      await expect(
        fileAction(
          db,
          uid,
          "download",
          { entity: "evidence", document_id: uid },
          "fixture:download:bad",
        ),
      ).rejects.toThrow("attachment_not_found");
      expect(calls.some((c) => c.url.includes("/storage/v1/"))).toBe(false);
    }
  });
  it("returns a real expiring storage URL for an owned attachment", async () => {
    const { db, calls } = fixture([{ id: uid, title: "Owner file", storage_path: uid + "/file" }]);
    const result = await fileAction(
      db,
      uid,
      "download",
      { document_id: uid },
      "fixture:download:1",
    );
    expect(result.private).toBe(true);
    expect(result.expires_in).toBe(300);
    expect(result.download_url).toContain("token=fixture");
    expect(calls.some((c) => c.url.includes("user_id=eq." + uid))).toBe(true);
    expect(calls.find((c) => c.url.includes("/storage/v1/"))?.body).toEqual({ expiresIn: 300 });
  });
  it("rejects an unsupported source document association instead of dropping the project link", async () => {
    const { db, calls } = fixture();
    await expect(
      fileAction(
        db,
        uid,
        "upload",
        {
          title: "PDF",
          project_id: uid,
          mime_type: "application/pdf",
          base64: Buffer.from("%PDF-fixture").toString("base64"),
        },
        "fixture:association",
      ),
    ).rejects.toThrow("attachment_association_requires_resource_or_evidence");
    expect(calls).toHaveLength(0);
  });
});
