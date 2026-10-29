import { beforeAll, afterAll, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createV2Database, asRole, uid, other } from "./database";
let db: PGlite, n = 0;
type Result = { id: string; plan_hash: string; approval_id: string; state: string; steps: { id: string; status: string; result: { id: string }; lease_token: string }[] };
const call = async (input: object, key = "web:workflow:" + ++n, owner = uid) =>
  (await db.query<{ r: Result }>("SELECT agent_v2_workflow($1,$2,$3,$4,NULL,NULL) r", [owner,key,JSON.stringify(input),"Original owner instruction"])).rows[0].r;
const plan = [{id:"task",kind:"task.create",depends_on:[],input:{title:"Durable task"}},{id:"fact",kind:"memory.put",depends_on:["task"],input:{key:"workflow fact",category:"knowledge",value:"retained"}}];
beforeAll(async()=>{db=await createV2Database(["0006_agent_v2_focus.sql","0007_agent_v2_memory_documents.sql","0008_agent_v2_workflows.sql"]);await asRole(db,"authenticated");},30000);
afterAll(async()=>{await db?.close();});
it("previews immutable plans and binds approval to owner, hash, source and single use",async()=>{
 const p=await call({action:"prepare",steps:plan},"web:workflow:identity");
 expect(p.state).toBe("awaiting_confirmation");
 expect((await call({action:"prepare",steps:plan},"web:workflow:identity")).id).toBe(p.id);
 await expect(call({action:"prepare",steps:[plan[0]]},"web:workflow:identity")).rejects.toThrow("idempotency_conflict");
 await expect(call({action:"confirm",id:p.id,approval_id:p.approval_id,expected_plan_hash:"0".repeat(64),confirm:true})).rejects.toThrow("invalid_confirmation");
 await expect(call({action:"get",id:p.id},undefined,other)).rejects.toThrow("learning_access_denied");
 expect((await call({action:"confirm",id:p.id,approval_id:p.approval_id,expected_plan_hash:p.plan_hash,confirm:true})).state).toBe("ready");
 await expect(call({action:"confirm",id:p.id,approval_id:p.approval_id,expected_plan_hash:p.plan_hash,confirm:true})).rejects.toThrow("invalid_confirmation");
});
it("commits local effects and receipt atomically; lost response and restart never duplicate",async()=>{
 let p=await call({action:"prepare",steps:[plan[0]]});
 const c=(await db.query<{r:{step_id:string;token:string}}>("SELECT agent_v2_workflow_claim($1,$2) r",[uid,p.id])).rows[0].r;
 expect(c.step_id).toBe("task");
 await db.query("SELECT agent_v2_workflow_finish($1,$2,$3,$4)",[uid,p.id,c.step_id,c.token]);
 await db.query("SELECT agent_v2_workflow_finish($1,$2,$3,$4)",[uid,p.id,c.step_id,c.token]);
 p=await call({action:"get",id:p.id});expect(p.state).toBe("completed");expect(p.steps[0].result.id).toBeTruthy();
 await db.exec("RESET ROLE");
 expect((await db.query<{n:number}>("SELECT count(*)::int n FROM tasks WHERE title='Durable task'")).rows[0].n).toBe(1);
 await asRole(db,"authenticated");
});
