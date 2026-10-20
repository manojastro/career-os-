import type { Database as ExistingDatabase, Json } from "@/integrations/supabase/types";
type Table<R> = { Row: R; Insert: Partial<R>; Update: Partial<R>; Relationships: [] };
type Owned = { user_id: string; created_at: string };
type AddedTables = {
  control_messages: Table<
    Owned & { id: string; chat_ref: string; message_ref: string; text: string }
  >;
  control_receipts: Table<Owned & { request_key: string; payload: Json; result: Json }>;
  control_approvals: Table<
    Owned & {
      id: string;
      chat_ref: string;
      operations: Json;
      preview: Json;
      expires_at: string;
      consumed_at: string | null;
    }
  >;
  control_changes: Table<
    Owned & {
      sequence: number;
      id: string;
      request_key: string;
      entity: string;
      record_id: string;
      before_row: Json | null;
      after_row: Json | null;
      undone_at: string | null;
    }
  >;
  control_context: Table<{
    user_id: string;
    chat_ref: string;
    entity: string | null;
    record_ids: Json;
    selected_id: string | null;
    updated_at: string;
    query_signature: string | null;
    base_offset: number;
    lists: Json;
  }>;
  control_dev_requests: Table<
    Owned & {
      id: string;
      request: string;
      status: string;
      branch: string | null;
      review_url: string | null;
      verification: Json | null;
      updated_at: string;
    }
  >;
  control_registry: Table<{ entity: string; definition: Json }>;
};
export type Database = Omit<ExistingDatabase, "public"> & {
  public: Omit<ExistingDatabase["public"], "Tables"> & {
    Tables: ExistingDatabase["public"]["Tables"] & AddedTables;
  };
};
