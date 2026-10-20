-- Reviewed deployed schema metadata. No production user rows or credentials.
CREATE TABLE public.control_registry(entity text PRIMARY KEY, definition jsonb NOT NULL);
REVOKE ALL ON public.control_registry FROM PUBLIC;
REVOKE ALL ON public.control_registry FROM anon,authenticated;
ALTER TABLE public.control_registry ENABLE ROW LEVEL SECURITY;
INSERT INTO public.control_registry VALUES
('activity_log', '{"owner":"user_id","softDelete":true,"writable":false,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"entity_type":{"type":"text","nullable":false,"required":true,"editable":false},"entity_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"action":{"type":"text","nullable":false,"required":true,"editable":false},"summary":{"type":"text","nullable":false,"required":true,"editable":false},"occurred_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"metadata":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":[]}'::jsonb),
('agent_commands', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"command":{"type":"text","nullable":false,"required":true,"enum":["run_now","pause","refresh_preferences","reprocess_document","ping_learning_manager","send_test_telegram"],"editable":true},"workflow":{"type":"text","nullable":false,"required":false,"editable":true,"enum":["all","orchestrator","study_coach","project_builder","job_hunter","networking_advisor","interview_coach","certification_event_scout","vault_intake"]},"payload":{"type":"jsonb","nullable":false,"required":false,"editable":true},"status":{"type":"text","nullable":false,"required":false,"enum":["cancelled"],"editable":true},"idempotency_key":{"type":"text","nullable":true,"required":false,"editable":false},"claimed_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"completed_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"result":{"type":"jsonb","nullable":false,"required":false,"editable":false},"source":{"type":"text","nullable":false,"required":false,"editable":false},"provenance":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update"]}'::jsonb),
('agent_notifications', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"title":{"type":"text","nullable":false,"required":true,"editable":true},"body":{"type":"text","nullable":false,"required":false,"editable":true},"channel":{"type":"text","nullable":false,"required":false,"enum":["in_app","email","telegram","other"],"editable":true},"delivery_status":{"type":"text","nullable":false,"required":false,"enum":["pending","delivered","failed"],"editable":true},"delivered_at":{"type":"timestamptz","nullable":true,"required":false,"editable":true},"read_at":{"type":"timestamptz","nullable":true,"required":false,"editable":true},"dedupe_key":{"type":"text","nullable":true,"required":false,"editable":false},"run_id":{"type":"uuid","nullable":true,"required":false,"references":"agent_runs","editable":false},"source":{"type":"text","nullable":false,"required":false,"editable":false},"provenance":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('agent_runs', '{"owner":"user_id","softDelete":true,"writable":false,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"workflow":{"type":"text","nullable":false,"required":true,"editable":false},"idempotency_key":{"type":"text","nullable":false,"required":true,"editable":false},"status":{"type":"text","nullable":false,"required":true,"enum":["running","succeeded","failed","skipped"],"editable":false},"started_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"finished_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"next_run_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"error":{"type":"text","nullable":false,"required":false,"editable":false},"usage":{"type":"jsonb","nullable":false,"required":false,"editable":false},"delivery":{"type":"jsonb","nullable":false,"required":false,"editable":false},"source":{"type":"text","nullable":false,"required":false,"editable":false},"provenance":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":[]}'::jsonb),
('audit_events', '{"owner":"user_id","softDelete":false,"writable":false,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"actor":{"type":"text","nullable":false,"required":true,"enum":["user","agent","system"],"editable":false},"action":{"type":"text","nullable":false,"required":true,"editable":false},"entity_type":{"type":"text","nullable":false,"required":true,"editable":false},"entity_id":{"type":"uuid","nullable":true,"required":false,"editable":false},"detail":{"type":"jsonb","nullable":false,"required":false,"editable":false},"source":{"type":"text","nullable":false,"required":false,"editable":false},"provenance":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false}},"operations":[]}'::jsonb),
('career_preferences', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"target_roles":{"type":"_text","nullable":false,"required":false,"editable":true},"locations":{"type":"_text","nullable":false,"required":false,"editable":true},"work_types":{"type":"_text","nullable":false,"required":false,"editable":true},"min_salary":{"type":"text","nullable":false,"required":false,"editable":true},"avoid_companies":{"type":"_text","nullable":false,"required":false,"editable":true},"focus_skills":{"type":"_text","nullable":false,"required":false,"editable":true},"briefing_time":{"type":"text","nullable":false,"required":false,"editable":true,"confirm":true},"timezone":{"type":"text","nullable":false,"required":false,"editable":true,"confirm":true},"agent_paused":{"type":"bool","nullable":false,"required":false,"editable":true,"confirm":true},"paused_workflows":{"type":"_text","nullable":false,"required":false,"editable":true,"confirm":true},"notes":{"type":"text","nullable":false,"required":false,"editable":true},"source":{"type":"text","nullable":false,"required":false,"enum":["user","agent"],"editable":false},"provenance":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"study_minutes":{"type":"int4","nullable":false,"required":false,"editable":true},"research_sources":{"type":"_text","nullable":false,"required":false,"editable":true,"confirm":true}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('companies', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"name":{"type":"text","nullable":false,"required":true,"editable":true},"website":{"type":"text","nullable":false,"required":false,"editable":true},"industry":{"type":"text","nullable":false,"required":false,"editable":true},"notes":{"type":"text","nullable":false,"required":false,"editable":true},"source_url":{"type":"text","nullable":false,"required":false,"editable":true},"verified_at":{"type":"timestamptz","nullable":true,"required":false,"editable":true},"status":{"type":"text","nullable":false,"required":false,"enum":["tracking","target","avoid","archived"],"editable":true},"dedupe_key":{"type":"text","nullable":true,"required":false,"editable":false},"run_id":{"type":"uuid","nullable":true,"required":false,"references":"agent_runs","editable":false},"source":{"type":"text","nullable":false,"required":false,"enum":["user","agent","import"],"editable":false},"provenance":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('contacts', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"name":{"type":"text","nullable":false,"required":true,"editable":true},"company":{"type":"text","nullable":false,"required":false,"editable":true},"role":{"type":"text","nullable":false,"required":false,"editable":true},"linkedin_url":{"type":"text","nullable":false,"required":false,"editable":true},"email":{"type":"text","nullable":false,"required":false,"editable":true},"location":{"type":"text","nullable":false,"required":false,"editable":true},"relationship_stage":{"type":"text","nullable":false,"required":false,"enum":["New","Connected","Conversation Started","Active","Warm","Recruiter","Mentor","Archived"],"editable":true},"topics":{"type":"_text","nullable":false,"required":false,"editable":true},"notes":{"type":"text","nullable":false,"required":false,"editable":true},"date_connected":{"type":"date","nullable":true,"required":false,"editable":true},"last_interaction":{"type":"date","nullable":true,"required":false,"editable":false},"next_followup":{"type":"date","nullable":true,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('curriculum_prerequisites', '{"owner":"user_id","softDelete":true,"writable":false,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"topic_id":{"type":"uuid","nullable":false,"required":true,"references":"curriculum_topics","editable":false},"prerequisite_topic_id":{"type":"uuid","nullable":false,"required":true,"references":"curriculum_topics","editable":false},"basis":{"type":"text","nullable":false,"required":false,"enum":["sequence_inferred","guide_explicit","manual"],"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":[]}'::jsonb),
('curriculum_sources', '{"owner":"user_id","softDelete":true,"writable":false,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"url":{"type":"text","nullable":false,"required":true,"editable":false},"document_id":{"type":"text","nullable":false,"required":true,"editable":false},"title":{"type":"text","nullable":false,"required":false,"editable":false},"status":{"type":"text","nullable":false,"required":false,"enum":["never_synced","ok","incomplete","failed"],"editable":false},"active_version_id":{"type":"uuid","nullable":true,"required":false,"references":"curriculum_versions","editable":false},"last_checked_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"last_synced_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"last_error":{"type":"text","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":[]}'::jsonb),
('curriculum_topics', '{"owner":"user_id","softDelete":true,"writable":false,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"source_id":{"type":"uuid","nullable":false,"required":true,"references":"curriculum_sources","editable":false},"stable_topic_id":{"type":"text","nullable":false,"required":true,"editable":false},"volume":{"type":"text","nullable":false,"required":true,"editable":false},"volume_title":{"type":"text","nullable":false,"required":false,"editable":false},"title":{"type":"text","nullable":false,"required":true,"editable":false},"description":{"type":"text","nullable":false,"required":false,"editable":false},"parent_topic_id":{"type":"uuid","nullable":true,"required":false,"references":"curriculum_topics","editable":false},"priority":{"type":"text","nullable":false,"required":false,"enum":["MUST","SHOULD","OPTIONAL"],"editable":false},"priority_source":{"type":"text","nullable":false,"required":false,"enum":["guide_label","inferred"],"editable":false},"sequence":{"type":"int4","nullable":false,"required":false,"editable":false},"recommended_minutes":{"type":"int4","nullable":false,"required":false,"editable":false},"practical_exercise":{"type":"text","nullable":false,"required":false,"editable":false},"completion_criteria":{"type":"text","nullable":false,"required":false,"editable":false},"interview_notes":{"type":"text","nullable":false,"required":false,"editable":false},"body":{"type":"text","nullable":false,"required":false,"editable":false},"source_reference":{"type":"text","nullable":false,"required":false,"editable":false},"content_hash":{"type":"text","nullable":false,"required":false,"editable":false},"first_version_id":{"type":"uuid","nullable":true,"required":false,"references":"curriculum_versions","editable":false},"last_version_id":{"type":"uuid","nullable":true,"required":false,"references":"curriculum_versions","editable":false},"skill_id":{"type":"uuid","nullable":true,"required":false,"references":"skills","editable":false},"skill_topic_id":{"type":"uuid","nullable":true,"required":false,"references":"skill_topics","editable":false},"removed_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":[]}'::jsonb),
('curriculum_versions', '{"owner":"user_id","softDelete":true,"writable":false,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"source_id":{"type":"uuid","nullable":false,"required":true,"references":"curriculum_sources","editable":false},"content_hash":{"type":"text","nullable":false,"required":true,"editable":false},"status":{"type":"text","nullable":false,"required":true,"enum":["validated","incomplete","failed","unchanged"],"editable":false},"applied":{"type":"bool","nullable":false,"required":false,"editable":false},"topic_count":{"type":"int4","nullable":false,"required":false,"editable":false},"report":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":[]}'::jsonb),
('daily_logs', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"log_date":{"type":"date","nullable":false,"required":true,"editable":true},"journal":{"type":"text","nullable":false,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('events', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"title":{"type":"text","nullable":false,"required":true,"editable":true},"organizer":{"type":"text","nullable":false,"required":false,"editable":true},"starts_at":{"type":"timestamptz","nullable":true,"required":false,"editable":true},"location":{"type":"text","nullable":false,"required":false,"editable":true},"url":{"type":"text","nullable":false,"required":false,"editable":true},"source_url":{"type":"text","nullable":false,"required":false,"editable":true},"verified_at":{"type":"timestamptz","nullable":true,"required":false,"editable":true},"summary":{"type":"text","nullable":false,"required":false,"editable":true},"status":{"type":"text","nullable":false,"required":false,"enum":["suggested","saved","registered_manually","attended","dismissed"],"editable":true},"dedupe_key":{"type":"text","nullable":true,"required":false,"editable":false},"run_id":{"type":"uuid","nullable":true,"required":false,"references":"agent_runs","editable":false},"source":{"type":"text","nullable":false,"required":false,"enum":["user","agent","import"],"editable":false},"provenance":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('evidence', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"title":{"type":"text","nullable":false,"required":true,"editable":true},"kind":{"type":"text","nullable":false,"required":true,"editable":true},"url":{"type":"text","nullable":false,"required":false,"editable":true},"description":{"type":"text","nullable":false,"required":false,"editable":true},"skill_id":{"type":"uuid","nullable":true,"required":false,"references":"skills","editable":true},"project_id":{"type":"uuid","nullable":true,"required":false,"references":"projects","editable":true},"goal_id":{"type":"uuid","nullable":true,"required":false,"references":"goals","editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('feedback', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"target_type":{"type":"text","nullable":false,"required":true,"enum":["recommendation","job_lead","study_task","project_task","outreach","event","uncertain_claim","source_document","notification","general"],"editable":true},"target_id":{"type":"uuid","nullable":true,"required":false,"editable":true},"action":{"type":"text","nullable":false,"required":true,"enum":["done","save","dismiss","useful","not_useful","note"],"editable":true},"note":{"type":"text","nullable":false,"required":false,"editable":true},"source":{"type":"text","nullable":false,"required":false,"editable":false},"provenance":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('focus_sessions', '{"owner":"user_id","softDelete":true,"writable":false,"special":true,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"task_id":{"type":"uuid","nullable":false,"required":true,"references":"tasks","editable":false},"started_at":{"type":"timestamptz","nullable":false,"required":true,"editable":false},"ended_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"duration_minutes":{"type":"int4","nullable":false,"required":false,"editable":false},"note":{"type":"text","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":[]}'::jsonb),
('followups', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"contact_id":{"type":"uuid","nullable":false,"required":true,"references":"contacts","editable":true},"due_date":{"type":"date","nullable":false,"required":true,"editable":true},"completed_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"note":{"type":"text","nullable":false,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('goals', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"title":{"type":"text","nullable":false,"required":true,"editable":true},"description":{"type":"text","nullable":false,"required":false,"editable":true},"goal_type":{"type":"text","nullable":false,"required":false,"enum":["career","quarter","monthly"],"editable":true},"parent_goal_id":{"type":"uuid","nullable":true,"required":false,"references":"goals","editable":true},"target_date":{"type":"date","nullable":true,"required":false,"editable":true},"status":{"type":"text","nullable":false,"required":false,"enum":["active","completed","paused"],"editable":true},"reason":{"type":"text","nullable":false,"required":false,"editable":true},"success_criteria":{"type":"text","nullable":false,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('inbox_items', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"content":{"type":"text","nullable":false,"required":true,"editable":true},"kind":{"type":"text","nullable":false,"required":false,"enum":["unprocessed","task","note","resource","idea"],"editable":true},"archived":{"type":"bool","nullable":false,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('interview_practice', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"question_id":{"type":"uuid","nullable":false,"required":true,"references":"interview_questions","editable":true},"practiced_at":{"type":"timestamptz","nullable":false,"required":false,"editable":true},"confidence":{"type":"int2","nullable":false,"required":false,"editable":true},"notes":{"type":"text","nullable":false,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"answer":{"type":"text","nullable":false,"required":false,"editable":true},"weaknesses":{"type":"text","nullable":false,"required":false,"editable":true},"recommendation_id":{"type":"uuid","nullable":true,"required":false,"references":"recommendations","editable":true}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('interview_questions', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"question":{"type":"text","nullable":false,"required":true,"editable":true},"answer":{"type":"text","nullable":false,"required":false,"editable":true},"category":{"type":"text","nullable":false,"required":false,"editable":true},"difficulty":{"type":"text","nullable":false,"required":false,"enum":["Easy","Medium","Hard"],"editable":true},"status":{"type":"text","nullable":false,"required":false,"enum":["New","Learning","Practiced","Strong"],"editable":true},"confidence":{"type":"int2","nullable":false,"required":false,"editable":true},"skill_id":{"type":"uuid","nullable":true,"required":false,"references":"skills","editable":true},"last_practiced":{"type":"date","nullable":true,"required":false,"editable":false},"practice_count":{"type":"int4","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"recommendation_id":{"type":"uuid","nullable":true,"required":false,"references":"recommendations","editable":true}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('interview_stories', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"title":{"type":"text","nullable":false,"required":true,"editable":true},"situation":{"type":"text","nullable":false,"required":false,"editable":true},"task":{"type":"text","nullable":false,"required":false,"editable":true},"action":{"type":"text","nullable":false,"required":false,"editable":true},"result":{"type":"text","nullable":false,"required":false,"editable":true},"lessons":{"type":"text","nullable":false,"required":false,"editable":true},"project_id":{"type":"uuid","nullable":true,"required":false,"references":"projects","editable":true},"tags":{"type":"_text","nullable":false,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('job_applications', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"company":{"type":"text","nullable":false,"required":true,"editable":true},"role":{"type":"text","nullable":false,"required":true,"editable":true},"location":{"type":"text","nullable":false,"required":false,"editable":true},"work_type":{"type":"text","nullable":false,"required":false,"editable":true},"job_url":{"type":"text","nullable":false,"required":false,"editable":true},"job_description":{"type":"text","nullable":false,"required":false,"editable":true},"salary_range":{"type":"text","nullable":false,"required":false,"editable":true},"date_found":{"type":"date","nullable":true,"required":false,"editable":true},"date_applied":{"type":"date","nullable":true,"required":false,"editable":false},"status":{"type":"text","nullable":false,"required":false,"enum":["Saved","Planning to Apply","Applied","Recruiter Contact","Screening","Technical Interview","Hiring Manager","Final Round","Offer","Rejected","Withdrawn"],"editable":true},"recruiter":{"type":"text","nullable":false,"required":false,"editable":true},"recruiter_linkedin":{"type":"text","nullable":false,"required":false,"editable":true},"resume_version":{"type":"text","nullable":false,"required":false,"editable":true},"notes":{"type":"text","nullable":false,"required":false,"editable":true},"followup_date":{"type":"date","nullable":true,"required":false,"editable":true},"priority":{"type":"text","nullable":false,"required":false,"enum":["low","medium","high"],"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('job_interviews', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"application_id":{"type":"uuid","nullable":false,"required":true,"references":"job_applications","editable":true},"stage":{"type":"text","nullable":false,"required":true,"editable":true},"scheduled_at":{"type":"timestamptz","nullable":true,"required":false,"editable":true},"notes":{"type":"text","nullable":false,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('job_leads', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"company_id":{"type":"uuid","nullable":true,"required":false,"references":"companies","editable":true},"company":{"type":"text","nullable":false,"required":true,"editable":true},"title":{"type":"text","nullable":false,"required":true,"editable":true},"location":{"type":"text","nullable":false,"required":false,"editable":true},"work_type":{"type":"text","nullable":false,"required":false,"editable":true},"salary_range":{"type":"text","nullable":false,"required":false,"editable":true},"official_url":{"type":"text","nullable":false,"required":true,"editable":true},"source_url":{"type":"text","nullable":false,"required":false,"editable":true},"verified_at":{"type":"timestamptz","nullable":true,"required":false,"editable":true},"posted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":true},"summary":{"type":"text","nullable":false,"required":false,"editable":true},"fit_notes":{"type":"text","nullable":false,"required":false,"editable":true},"fit_is_inference":{"type":"bool","nullable":false,"required":false,"editable":true},"application_id":{"type":"uuid","nullable":true,"required":false,"references":"job_applications","editable":true},"status":{"type":"text","nullable":false,"required":false,"enum":["new","verified","saved","applied","dismissed","expired"],"editable":true},"dedupe_key":{"type":"text","nullable":true,"required":false,"editable":false},"run_id":{"type":"uuid","nullable":true,"required":false,"references":"agent_runs","editable":false},"source":{"type":"text","nullable":false,"required":false,"enum":["user","agent","import"],"editable":false},"provenance":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('job_skill_requirements', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"application_id":{"type":"uuid","nullable":false,"required":true,"references":"job_applications","editable":true},"skill_name":{"type":"text","nullable":false,"required":true,"editable":true},"requirement_type":{"type":"text","nullable":false,"required":false,"editable":true},"skill_id":{"type":"uuid","nullable":true,"required":false,"references":"skills","editable":true},"assessment":{"type":"text","nullable":false,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('learning_assignments', '{"owner":"user_id","softDelete":true,"writable":false,"special":true,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"topic_id":{"type":"uuid","nullable":false,"required":true,"references":"curriculum_topics","editable":false},"task_id":{"type":"uuid","nullable":true,"required":false,"references":"tasks","editable":false},"assignment_date":{"type":"date","nullable":false,"required":true,"editable":false},"status":{"type":"text","nullable":false,"required":false,"enum":["planned","delivered","completed","partial","not_started","rescheduled","cancelled"],"editable":false},"help_requested":{"type":"bool","nullable":false,"required":false,"editable":false},"planned_minutes":{"type":"int4","nullable":false,"required":false,"editable":false},"recorded_minutes":{"type":"int4","nullable":false,"required":false,"editable":false},"plan":{"type":"jsonb","nullable":false,"required":false,"editable":false},"rationale":{"type":"text","nullable":false,"required":false,"editable":false},"practical_outcome":{"type":"text","nullable":false,"required":false,"editable":false},"completion_criteria":{"type":"text","nullable":false,"required":false,"editable":false},"progress_notes":{"type":"text","nullable":false,"required":false,"editable":false},"is_inference":{"type":"bool","nullable":false,"required":false,"editable":false},"source":{"type":"text","nullable":false,"required":false,"enum":["app","agent"],"editable":false},"idempotency_key":{"type":"text","nullable":false,"required":true,"editable":false},"completed_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"request_payload":{"type":"jsonb","nullable":true,"required":false,"editable":false}},"operations":[]}'::jsonb),
('learning_baselines', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"topic_id":{"type":"uuid","nullable":false,"required":true,"references":"curriculum_topics","editable":true},"level":{"type":"text","nullable":false,"required":true,"enum":["Not Started","Familiar","Learning","Practiced","Applied"],"editable":true},"basis":{"type":"text","nullable":false,"required":false,"enum":["manual"],"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete"]}'::jsonb),
('learning_feedback', '{"owner":"user_id","softDelete":true,"writable":false,"special":true,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"assignment_id":{"type":"uuid","nullable":false,"required":true,"references":"learning_assignments","editable":false},"kind":{"type":"text","nullable":false,"required":true,"enum":["completed","partial","not_started","reschedule","help","minutes"],"editable":false},"channel":{"type":"text","nullable":false,"required":true,"enum":["app","telegram","agent"],"editable":false},"raw_text":{"type":"text","nullable":false,"required":false,"editable":false},"minutes":{"type":"int4","nullable":true,"required":false,"editable":false},"notes":{"type":"text","nullable":false,"required":false,"editable":false},"new_date":{"type":"date","nullable":true,"required":false,"editable":false},"idempotency_key":{"type":"text","nullable":false,"required":true,"editable":false},"result":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"request_payload":{"type":"jsonb","nullable":true,"required":false,"editable":false}},"operations":[]}'::jsonb),
('learning_preferences', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"guide_url":{"type":"text","nullable":false,"required":false,"editable":true,"confirm":true},"sync_time":{"type":"text","nullable":false,"required":false,"editable":true,"confirm":true},"morning_time":{"type":"text","nullable":false,"required":false,"editable":true,"confirm":true},"evening_time":{"type":"text","nullable":false,"required":false,"editable":true,"confirm":true},"timezone":{"type":"text","nullable":false,"required":false,"editable":true,"confirm":true},"daily_minutes":{"type":"int4","nullable":false,"required":false,"editable":true},"weekly_minutes":{"type":"int4","nullable":false,"required":false,"editable":true},"paused":{"type":"bool","nullable":false,"required":false,"editable":true,"confirm":true},"baseline_completed_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"hermes_last_seen_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"telegram_status":{"type":"text","nullable":false,"required":false,"enum":["unknown","sent_ok","send_failed","reply_ok"],"editable":false},"telegram_status_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete"]}'::jsonb),
('learning_sessions', '{"owner":"user_id","softDelete":true,"writable":false,"special":true,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"skill_id":{"type":"uuid","nullable":true,"required":false,"references":"skills","editable":false},"task_id":{"type":"uuid","nullable":true,"required":false,"references":"tasks","editable":false},"minutes":{"type":"int4","nullable":false,"required":true,"editable":false},"learned":{"type":"text","nullable":false,"required":false,"editable":false},"occurred_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"focus_session_id":{"type":"uuid","nullable":true,"required":false,"references":"focus_sessions","editable":false}},"operations":[]}'::jsonb),
('milestones', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"goal_id":{"type":"uuid","nullable":false,"required":true,"references":"goals","editable":true},"title":{"type":"text","nullable":false,"required":true,"editable":true},"due_date":{"type":"date","nullable":true,"required":false,"editable":true},"status":{"type":"text","nullable":false,"required":false,"enum":["pending","in_progress","completed"],"editable":true},"success_criteria":{"type":"text","nullable":false,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('mock_interviews', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"title":{"type":"text","nullable":false,"required":true,"editable":true},"occurred_at":{"type":"timestamptz","nullable":false,"required":false,"editable":true},"feedback":{"type":"text","nullable":false,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('network_interactions', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"contact_id":{"type":"uuid","nullable":false,"required":true,"references":"contacts","editable":true},"kind":{"type":"text","nullable":false,"required":true,"editable":true},"occurred_at":{"type":"timestamptz","nullable":false,"required":false,"editable":true},"notes":{"type":"text","nullable":false,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('notes', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"title":{"type":"text","nullable":false,"required":true,"editable":true},"content":{"type":"text","nullable":false,"required":false,"editable":true},"entity_type":{"type":"text","nullable":true,"required":false,"editable":true},"entity_id":{"type":"uuid","nullable":true,"required":false,"editable":true},"source_url":{"type":"text","nullable":false,"required":false,"editable":true},"tags":{"type":"_text","nullable":false,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('notifications', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"title":{"type":"text","nullable":false,"required":true,"editable":true},"body":{"type":"text","nullable":false,"required":false,"editable":true},"read_at":{"type":"timestamptz","nullable":true,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('outreach', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"contact_id":{"type":"uuid","nullable":true,"required":false,"references":"contacts","editable":true},"recipient":{"type":"text","nullable":false,"required":false,"editable":true},"channel":{"type":"text","nullable":false,"required":false,"enum":["linkedin","email","other"],"editable":true},"subject":{"type":"text","nullable":false,"required":false,"editable":true},"draft":{"type":"text","nullable":false,"required":false,"editable":true},"reason":{"type":"text","nullable":false,"required":false,"editable":true},"status":{"type":"text","nullable":false,"required":false,"enum":["draft","approved","sent_manually","responded","saved","dismissed"],"editable":true},"is_inference":{"type":"bool","nullable":false,"required":false,"editable":true},"dedupe_key":{"type":"text","nullable":true,"required":false,"editable":false},"run_id":{"type":"uuid","nullable":true,"required":false,"references":"agent_runs","editable":false},"source":{"type":"text","nullable":false,"required":false,"enum":["user","agent","import"],"editable":false},"provenance":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"sent_at":{"type":"timestamptz","nullable":true,"required":false,"editable":true},"response_received_at":{"type":"timestamptz","nullable":true,"required":false,"editable":true},"response_notes":{"type":"text","nullable":false,"required":false,"editable":true},"source_url":{"type":"text","nullable":false,"required":false,"editable":true},"verified_at":{"type":"timestamptz","nullable":true,"required":false,"editable":true}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('planner_blocks', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"task_id":{"type":"uuid","nullable":true,"required":false,"references":"tasks","editable":true},"title":{"type":"text","nullable":false,"required":true,"editable":true},"block_date":{"type":"date","nullable":false,"required":true,"editable":true},"start_time":{"type":"time","nullable":false,"required":true,"editable":true},"end_time":{"type":"time","nullable":false,"required":true,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('profiles', '{"owner":"id","softDelete":false,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":true,"editable":false},"display_name":{"type":"text","nullable":false,"required":false,"editable":true},"career_target":{"type":"text","nullable":false,"required":false,"editable":true},"weekly_hours":{"type":"int4","nullable":false,"required":false,"editable":true},"onboarded_at":{"type":"timestamptz","nullable":true,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false}},"operations":["update","edit_text"]}'::jsonb),
('project_decisions', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"project_id":{"type":"uuid","nullable":false,"required":true,"references":"projects","editable":true},"title":{"type":"text","nullable":false,"required":true,"editable":true},"context":{"type":"text","nullable":false,"required":false,"editable":true},"decision":{"type":"text","nullable":false,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('project_milestones', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"project_id":{"type":"uuid","nullable":false,"required":true,"references":"projects","editable":true},"title":{"type":"text","nullable":false,"required":true,"editable":true},"due_date":{"type":"date","nullable":true,"required":false,"editable":true},"completed_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('project_tasks', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"project_id":{"type":"uuid","nullable":false,"required":true,"references":"projects","editable":true},"title":{"type":"text","nullable":false,"required":true,"editable":true},"kind":{"type":"text","nullable":false,"required":false,"enum":["milestone","task","evidence"],"editable":true},"detail":{"type":"text","nullable":false,"required":false,"editable":true},"evidence_url":{"type":"text","nullable":false,"required":false,"editable":true},"due_date":{"type":"date","nullable":true,"required":false,"editable":true},"status":{"type":"text","nullable":false,"required":false,"enum":["todo","doing","done","saved","dismissed"],"editable":true},"is_inference":{"type":"bool","nullable":false,"required":false,"editable":true},"dedupe_key":{"type":"text","nullable":true,"required":false,"editable":false},"run_id":{"type":"uuid","nullable":true,"required":false,"references":"agent_runs","editable":false},"source":{"type":"text","nullable":false,"required":false,"enum":["user","agent","import"],"editable":false},"provenance":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('projects', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"name":{"type":"text","nullable":false,"required":true,"editable":true},"description":{"type":"text","nullable":false,"required":false,"editable":true},"problem":{"type":"text","nullable":false,"required":false,"editable":true},"business_value":{"type":"text","nullable":false,"required":false,"editable":true},"architecture":{"type":"text","nullable":false,"required":false,"editable":true},"technologies":{"type":"_text","nullable":false,"required":false,"editable":true},"github_url":{"type":"text","nullable":false,"required":false,"editable":true},"deployment_url":{"type":"text","nullable":false,"required":false,"editable":true},"status":{"type":"text","nullable":false,"required":false,"enum":["Idea","Planning","Building","Testing","Deployed","Archived"],"editable":true},"start_date":{"type":"date","nullable":true,"required":false,"editable":true},"target_date":{"type":"date","nullable":true,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('recommendations', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"kind":{"type":"text","nullable":false,"required":false,"enum":["top_priority","briefing","action","insight","interview"],"editable":true},"title":{"type":"text","nullable":false,"required":true,"editable":true},"body":{"type":"text","nullable":false,"required":false,"editable":true},"priority":{"type":"int2","nullable":false,"required":false,"editable":true},"briefing_date":{"type":"date","nullable":true,"required":false,"editable":true},"is_inference":{"type":"bool","nullable":false,"required":false,"editable":true},"source_url":{"type":"text","nullable":false,"required":false,"editable":true},"verified_at":{"type":"timestamptz","nullable":true,"required":false,"editable":true},"status":{"type":"text","nullable":false,"required":false,"enum":["new","done","saved","dismissed"],"editable":true},"dedupe_key":{"type":"text","nullable":true,"required":false,"editable":false},"run_id":{"type":"uuid","nullable":true,"required":false,"references":"agent_runs","editable":false},"source":{"type":"text","nullable":false,"required":false,"enum":["user","agent","import"],"editable":false},"provenance":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"document_id":{"type":"uuid","nullable":true,"required":false,"references":"source_documents","editable":true}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('resources', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"title":{"type":"text","nullable":false,"required":true,"editable":true},"url":{"type":"text","nullable":false,"required":false,"editable":true},"source_type":{"type":"text","nullable":false,"required":false,"editable":true},"skill_id":{"type":"uuid","nullable":true,"required":false,"references":"skills","editable":true},"project_id":{"type":"uuid","nullable":true,"required":false,"references":"projects","editable":true},"status":{"type":"text","nullable":false,"required":false,"enum":["Inbox","To Review","Learning","Completed","Archived"],"editable":true},"priority":{"type":"text","nullable":false,"required":false,"enum":["low","medium","high"],"editable":true},"notes":{"type":"text","nullable":false,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('scheduler_runs', '{"owner":"user_id","softDelete":true,"writable":false,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"job":{"type":"text","nullable":false,"required":true,"enum":["curriculum_sync","morning_plan","evening_check"],"editable":false},"run_date":{"type":"date","nullable":false,"required":true,"editable":false},"status":{"type":"text","nullable":false,"required":false,"enum":["claimed","succeeded","failed","skipped"],"editable":false},"catch_up":{"type":"bool","nullable":false,"required":false,"editable":false},"detail":{"type":"jsonb","nullable":false,"required":false,"editable":false},"started_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"finished_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"lease_until":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"attempt":{"type":"int4","nullable":false,"required":false,"editable":false},"attempt_token":{"type":"uuid","nullable":true,"required":false,"editable":false}},"operations":[]}'::jsonb),
('skill_topics', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"skill_id":{"type":"uuid","nullable":false,"required":true,"references":"skills","editable":true},"parent_topic_id":{"type":"uuid","nullable":true,"required":false,"references":"skill_topics","editable":true},"title":{"type":"text","nullable":false,"required":true,"editable":true},"status":{"type":"text","nullable":false,"required":false,"enum":["Not Started","Learning","Practicing","Applied","Interview Ready"],"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('skills', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"name":{"type":"text","nullable":false,"required":true,"editable":true},"status":{"type":"text","nullable":false,"required":false,"enum":["Not Started","Learning","Practicing","Applied","Interview Ready"],"editable":true},"category":{"type":"text","nullable":false,"required":false,"editable":true},"knowledge":{"type":"int2","nullable":false,"required":false,"editable":true},"hands_on":{"type":"int2","nullable":false,"required":false,"editable":true},"project_proof":{"type":"int2","nullable":false,"required":false,"editable":true},"production":{"type":"int2","nullable":false,"required":false,"editable":true},"interview":{"type":"int2","nullable":false,"required":false,"editable":true},"last_activity":{"type":"date","nullable":true,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('source_documents', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"title":{"type":"text","nullable":false,"required":true,"editable":true},"kind":{"type":"text","nullable":false,"required":false,"enum":["resume","job_description","certificate","article","note","transcript","other"],"editable":true},"url":{"type":"text","nullable":false,"required":false,"editable":true},"storage_path":{"type":"text","nullable":false,"required":false,"editable":false},"summary":{"type":"text","nullable":false,"required":false,"editable":true},"status":{"type":"text","nullable":false,"required":false,"enum":["new","pending","processing","processed","action_needed","failed","archived"],"editable":true},"dedupe_key":{"type":"text","nullable":true,"required":false,"editable":false},"run_id":{"type":"uuid","nullable":true,"required":false,"references":"agent_runs","editable":false},"source":{"type":"text","nullable":false,"required":false,"enum":["user","agent","import"],"editable":false},"provenance":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"agent_summary":{"type":"text","nullable":false,"required":false,"editable":true},"processed_at":{"type":"timestamptz","nullable":true,"required":false,"editable":true}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('study_history', '{"owner":"user_id","softDelete":true,"writable":false,"special":true,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"study_task_id":{"type":"uuid","nullable":true,"required":false,"references":"study_tasks","editable":false},"skill_id":{"type":"uuid","nullable":true,"required":false,"references":"skills","editable":false},"minutes":{"type":"int4","nullable":false,"required":false,"editable":false},"notes":{"type":"text","nullable":false,"required":false,"editable":false},"occurred_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"source":{"type":"text","nullable":false,"required":false,"enum":["user","agent","import"],"editable":false},"provenance":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":[]}'::jsonb),
('study_tasks', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"title":{"type":"text","nullable":false,"required":true,"editable":true},"detail":{"type":"text","nullable":false,"required":false,"editable":true},"skill_id":{"type":"uuid","nullable":true,"required":false,"references":"skills","editable":true},"resource_url":{"type":"text","nullable":false,"required":false,"editable":true},"estimated_minutes":{"type":"int4","nullable":false,"required":false,"editable":true},"due_date":{"type":"date","nullable":true,"required":false,"editable":true},"priority":{"type":"text","nullable":false,"required":false,"enum":["low","medium","high"],"editable":true},"status":{"type":"text","nullable":false,"required":false,"enum":["queued","in_progress","done","saved","dismissed"],"editable":true},"is_inference":{"type":"bool","nullable":false,"required":false,"editable":true},"dedupe_key":{"type":"text","nullable":true,"required":false,"editable":false},"run_id":{"type":"uuid","nullable":true,"required":false,"references":"agent_runs","editable":false},"source":{"type":"text","nullable":false,"required":false,"enum":["user","agent","import"],"editable":false},"provenance":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"consolidated_task_id":{"type":"uuid","nullable":true,"required":false,"references":"tasks","editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('task_dependencies', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"task_id":{"type":"uuid","nullable":false,"required":true,"references":"tasks","editable":true},"depends_on_id":{"type":"uuid","nullable":false,"required":true,"references":"tasks","editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete"]}'::jsonb),
('task_subtasks', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"task_id":{"type":"uuid","nullable":false,"required":true,"references":"tasks","editable":true},"title":{"type":"text","nullable":false,"required":true,"editable":true},"completed_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('tasks', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"title":{"type":"text","nullable":false,"required":true,"editable":true},"description":{"type":"text","nullable":false,"required":false,"editable":true},"type":{"type":"text","nullable":false,"required":false,"enum":["Learn","Build","Practice","Interview","Network","Apply","Research","Document","Admin"],"editable":true},"status":{"type":"text","nullable":false,"required":false,"enum":["backlog","month","week","today","doing","completed"],"editable":true},"priority":{"type":"text","nullable":false,"required":false,"enum":["low","medium","high"],"editable":true},"estimated_minutes":{"type":"int4","nullable":false,"required":false,"editable":true},"actual_minutes":{"type":"int4","nullable":false,"required":false,"editable":false},"due_date":{"type":"date","nullable":true,"required":false,"editable":true},"scheduled_date":{"type":"date","nullable":true,"required":false,"editable":true},"scheduled_start":{"type":"time","nullable":true,"required":false,"editable":true},"scheduled_end":{"type":"time","nullable":true,"required":false,"editable":true},"skill_id":{"type":"uuid","nullable":true,"required":false,"references":"skills","editable":true},"project_id":{"type":"uuid","nullable":true,"required":false,"references":"projects","editable":true},"goal_id":{"type":"uuid","nullable":true,"required":false,"references":"goals","editable":true},"milestone_id":{"type":"uuid","nullable":true,"required":false,"references":"milestones","editable":true},"application_id":{"type":"uuid","nullable":true,"required":false,"references":"job_applications","editable":true},"contact_id":{"type":"uuid","nullable":true,"required":false,"references":"contacts","editable":true},"completed_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"sort_order":{"type":"int4","nullable":false,"required":false,"editable":true},"tags":{"type":"_text","nullable":false,"required":false,"editable":true},"recurrence":{"type":"text","nullable":true,"required":false,"editable":true},"evidence_required":{"type":"bool","nullable":false,"required":false,"editable":true},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"skill_topic_id":{"type":"uuid","nullable":true,"required":false,"references":"skill_topics","editable":true}},"operations":["create","update","delete","record_time","edit_text"]}'::jsonb),
('telegram_message_map', '{"owner":"user_id","softDelete":true,"writable":false,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"assignment_id":{"type":"uuid","nullable":true,"required":false,"references":"learning_assignments","editable":false},"kind":{"type":"text","nullable":false,"required":true,"enum":["morning_plan","evening_check","test","reply","help"],"editable":false},"direction":{"type":"text","nullable":false,"required":true,"enum":["outbound","inbound"],"editable":false},"chat_ref":{"type":"text","nullable":false,"required":false,"editable":false},"message_id":{"type":"text","nullable":false,"required":false,"editable":false},"delivery_status":{"type":"text","nullable":false,"required":true,"enum":["pending","sent","failed","unknown","received"],"editable":false},"error":{"type":"text","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"idempotency_key":{"type":"text","nullable":true,"required":false,"editable":false},"reply_to_message_id":{"type":"text","nullable":false,"required":false,"editable":false},"reservation_token":{"type":"uuid","nullable":true,"required":false,"editable":false},"reserved_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"finished_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false},"reconciled":{"type":"bool","nullable":false,"required":false,"editable":false}},"operations":[]}'::jsonb),
('uncertain_claims', '{"owner":"user_id","softDelete":true,"writable":true,"special":false,"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":true,"editable":false},"claim":{"type":"text","nullable":false,"required":true,"editable":true},"context":{"type":"text","nullable":false,"required":false,"editable":true},"source_url":{"type":"text","nullable":false,"required":false,"editable":true},"verified_at":{"type":"timestamptz","nullable":true,"required":false,"editable":true},"confidence":{"type":"int2","nullable":false,"required":false,"editable":true},"document_id":{"type":"uuid","nullable":true,"required":false,"references":"source_documents","editable":true},"status":{"type":"text","nullable":false,"required":false,"enum":["open","confirmed","rejected","dismissed"],"editable":true},"dedupe_key":{"type":"text","nullable":true,"required":false,"editable":false},"run_id":{"type":"uuid","nullable":true,"required":false,"references":"agent_runs","editable":false},"source":{"type":"text","nullable":false,"required":false,"enum":["user","agent","import"],"editable":false},"provenance":{"type":"jsonb","nullable":false,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"deleted_at":{"type":"timestamptz","nullable":true,"required":false,"editable":false}},"operations":["create","update","delete","edit_text"]}'::jsonb),
('control_dev_requests', '{"owner":"user_id","softDelete":false,"writable":false,"special":false,"operations":[],"fields":{"id":{"type":"uuid","nullable":false,"required":false,"editable":false},"user_id":{"type":"uuid","nullable":false,"required":false,"editable":false},"request":{"type":"text","nullable":false,"required":false,"editable":false},"status":{"type":"text","nullable":false,"required":false,"editable":false},"branch":{"type":"text","nullable":true,"required":false,"editable":false},"review_url":{"type":"text","nullable":true,"required":false,"editable":false},"verification":{"type":"jsonb","nullable":true,"required":false,"editable":false},"created_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false},"updated_at":{"type":"timestamptz","nullable":false,"required":false,"editable":false}}}'::jsonb);
CREATE TABLE public.control_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id),
 chat_ref text NOT NULL, message_ref text NOT NULL, text text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,chat_ref,message_ref)
);
CREATE TABLE public.control_receipts (
 user_id uuid NOT NULL REFERENCES auth.users(id), request_key text NOT NULL, payload jsonb NOT NULL,
 result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,request_key)
);
CREATE TABLE public.control_approvals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id),
 chat_ref text NOT NULL, operations jsonb NOT NULL, preview jsonb NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes', consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.control_changes (
 sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id),
 request_key text NOT NULL, entity text NOT NULL, record_id uuid NOT NULL,
 before_row jsonb, after_row jsonb, undone_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX control_changes_request ON public.control_changes(user_id,request_key,created_at);
CREATE TABLE public.control_context (
 user_id uuid NOT NULL REFERENCES auth.users(id), chat_ref text NOT NULL, entity text,
 record_ids jsonb NOT NULL DEFAULT '[]', selected_id uuid, updated_at timestamptz NOT NULL DEFAULT now(),
 query_signature text, base_offset integer NOT NULL DEFAULT 0,
 lists jsonb NOT NULL DEFAULT '{}',
 PRIMARY KEY(user_id,chat_ref)
);
CREATE TABLE public.control_dev_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id),
 request text NOT NULL CHECK(length(request) BETWEEN 5 AND 20000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_development','review','approved','deployed','rejected')),
 branch text, review_url text, verification jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
-- Owner reads; service-role writes exclusively.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['control_messages','control_receipts','control_approvals','control_changes','control_context','control_dev_requests'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t);
  EXECUTE format('CREATE POLICY owner_read ON public.%I FOR SELECT TO authenticated USING (user_id=auth.uid())',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
END $$;
GRANT SELECT ON public.control_registry TO service_role;

CREATE FUNCTION public.control_journal() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE k text:=current_setting('career.control_key',true); uid uuid;
BEGIN
 IF nullif(k,'') IS NULL THEN RETURN NEW; END IF;
 uid:=coalesce(nullif(to_jsonb(NEW)->>'user_id','')::uuid,NEW.id);
 INSERT INTO public.control_changes(user_id,request_key,entity,record_id,before_row,after_row)
 VALUES(uid,k,TG_TABLE_NAME,NEW.id,CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,to_jsonb(NEW));
 RETURN NEW;
END $$;
CREATE FUNCTION public.control_ownership_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE d jsonb; f record; v text; target jsonb; uid uuid; linked boolean; targetname text;
BEGIN
 SELECT definition INTO d FROM public.control_registry WHERE entity=TG_TABLE_NAME;
 uid:=(to_jsonb(NEW)->> (d->>'owner'))::uuid;
 FOR f IN SELECT key,value FROM jsonb_each(d->'fields') WHERE value ? 'references' LOOP
  v:=to_jsonb(NEW)->>f.key;
  IF v IS NOT NULL THEN
   SELECT definition INTO target FROM public.control_registry WHERE entity=f.value->>'references';
   IF target IS NULL THEN RAISE EXCEPTION 'unsupported_relationship'; END IF;
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE id=$1 AND %I=$2 %s)',f.value->>'references',target->>'owner',CASE WHEN (target->>'softDelete')::boolean AND coalesce(current_setting('career.control_undo',true),'')<>'on' AND to_jsonb(NEW)->>'deleted_at' IS NULL THEN 'AND deleted_at IS NULL' ELSE '' END) INTO linked USING v::uuid,uid;
   IF NOT linked THEN RAISE EXCEPTION 'linked_record_not_found'; END IF;
  END IF;
 END LOOP;
 -- Polymorphic links use an explicit entity allowlist as well.
 IF TG_TABLE_NAME='notes' THEN
 IF NEW.entity_id IS NOT NULL THEN
   SELECT definition INTO target FROM public.control_registry WHERE entity=NEW.entity_type;
   IF target IS NULL THEN RAISE EXCEPTION 'unsupported_relationship'; END IF;
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE id=$1 AND %I=$2 %s)',NEW.entity_type,target->>'owner',CASE WHEN (target->>'softDelete')::boolean AND coalesce(current_setting('career.control_undo',true),'')<>'on' AND NEW.deleted_at IS NULL THEN 'AND deleted_at IS NULL' ELSE '' END) INTO linked USING NEW.entity_id,uid;
   IF NOT linked THEN RAISE EXCEPTION 'linked_record_not_found'; END IF;
 END IF;
 END IF;
 IF TG_TABLE_NAME='feedback' AND to_jsonb(NEW)->>'target_id' IS NOT NULL THEN
  targetname:=CASE to_jsonb(NEW)->>'target_type' WHEN 'recommendation' THEN 'recommendations' WHEN 'job_lead' THEN 'job_leads' WHEN 'study_task' THEN 'study_tasks' WHEN 'project_task' THEN 'project_tasks' WHEN 'outreach' THEN 'outreach' WHEN 'event' THEN 'events' WHEN 'uncertain_claim' THEN 'uncertain_claims' WHEN 'source_document' THEN 'source_documents' WHEN 'notification' THEN 'notifications' END;
  SELECT definition INTO target FROM control_registry WHERE entity=targetname;
  IF target IS NULL THEN RAISE EXCEPTION 'unsupported_relationship'; END IF;
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE id=$1 AND %I=$2 %s)',targetname,target->>'owner',CASE WHEN coalesce(current_setting('career.control_undo',true),'')<>'on' AND to_jsonb(NEW)->>'deleted_at' IS NULL THEN 'AND deleted_at IS NULL' ELSE '' END) INTO linked USING (to_jsonb(NEW)->>'target_id')::uuid,uid;
  IF NOT linked THEN RAISE EXCEPTION 'linked_record_not_found'; END IF;
 END IF;
 IF TG_TABLE_NAME IN ('resources','evidence') AND left(to_jsonb(NEW)->>'url',8)='storage:' THEN
  v:=substring(to_jsonb(NEW)->>'url',9);
  IF left(v,length(uid::text)+1)<>uid::text||'/' OR v LIKE '%..%' OR v ~ '[\\%]' OR v ~ '(^|/)\.(/|$)' THEN RAISE EXCEPTION 'invalid_storage_reference'; END IF;
 END IF;
 IF coalesce(current_setting('career.control_undo',true),'')<>'on' AND to_jsonb(NEW)->>'deleted_at' IS NULL THEN
  IF TG_TABLE_NAME='goals' THEN
   IF EXISTS(WITH RECURSIVE parents AS (SELECT id,parent_goal_id FROM goals WHERE id=(to_jsonb(NEW)->>'parent_goal_id')::uuid AND user_id=uid UNION SELECT g.id,g.parent_goal_id FROM goals g JOIN parents p ON g.id=p.parent_goal_id WHERE g.user_id=uid) SELECT 1 FROM parents WHERE id=NEW.id) OR to_jsonb(NEW)->>'parent_goal_id'=NEW.id::text THEN RAISE EXCEPTION 'cyclic_relationship'; END IF;
  ELSIF TG_TABLE_NAME='task_dependencies' THEN
   IF EXISTS(WITH RECURSIVE edges AS (SELECT (to_jsonb(NEW)->>'depends_on_id')::uuid id UNION SELECT t.depends_on_id FROM task_dependencies t JOIN edges e ON t.task_id=e.id WHERE t.user_id=uid AND t.deleted_at IS NULL AND t.id<>NEW.id) SELECT 1 FROM edges WHERE id=(to_jsonb(NEW)->>'task_id')::uuid) THEN RAISE EXCEPTION 'cyclic_relationship'; END IF;
  ELSIF TG_TABLE_NAME='curriculum_prerequisites' THEN
   IF EXISTS(WITH RECURSIVE edges AS (SELECT (to_jsonb(NEW)->>'prerequisite_topic_id')::uuid id UNION SELECT t.prerequisite_topic_id FROM curriculum_prerequisites t JOIN edges e ON t.topic_id=e.id WHERE t.user_id=uid AND t.deleted_at IS NULL AND t.id<>NEW.id) SELECT 1 FROM edges WHERE id=(to_jsonb(NEW)->>'topic_id')::uuid) THEN RAISE EXCEPTION 'cyclic_relationship'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
-- Completion applies equally to the existing website and Telegram.
CREATE FUNCTION public.control_task_invariants() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF coalesce(current_setting('career.control_undo',true),'')='on' OR NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
 IF NEW.status='completed' THEN
  IF NEW.evidence_required AND NOT EXISTS(SELECT 1 FROM public.evidence WHERE user_id=NEW.user_id AND deleted_at IS NULL AND
    ((NEW.project_id IS NOT NULL AND project_id=NEW.project_id) OR (NEW.skill_id IS NOT NULL AND skill_id=NEW.skill_id) OR (NEW.goal_id IS NOT NULL AND goal_id=NEW.goal_id))) THEN RAISE EXCEPTION 'evidence_required'; END IF;
  IF EXISTS(SELECT 1 FROM public.task_dependencies d JOIN public.tasks t ON t.id=d.depends_on_id WHERE d.task_id=NEW.id AND d.user_id=NEW.user_id AND d.deleted_at IS NULL AND t.deleted_at IS NULL AND t.status<>'completed') THEN RAISE EXCEPTION 'dependencies_incomplete'; END IF;
  NEW.completed_at:=coalesce(NEW.completed_at,now());
 ELSE NEW.completed_at:=NULL;
 END IF;
 IF NEW.scheduled_start IS NOT NULL AND (NEW.scheduled_date IS NULL OR NEW.scheduled_end IS NULL OR NEW.scheduled_end<=NEW.scheduled_start) THEN RAISE EXCEPTION 'invalid_schedule'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER control_task_rules BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.control_task_invariants();

-- Preserve pre-existing rows: new/renamed identities are normalized without merging history.
CREATE INDEX control_skill_name_lookup ON public.skills(user_id,lower(btrim(name))) WHERE deleted_at IS NULL;
CREATE FUNCTION public.control_skill_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.deleted_at IS NOT NULL OR coalesce(current_setting('career.control_undo',true),'')='on' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.name IS NOT DISTINCT FROM OLD.name THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text||':skill_names',0));
 NEW.name:=btrim(NEW.name);
 IF NEW.name='' OR EXISTS(SELECT 1 FROM skills WHERE user_id=NEW.user_id AND id<>NEW.id AND deleted_at IS NULL AND lower(btrim(name))=lower(NEW.name)) THEN RAISE EXCEPTION 'skill_name_exists'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER control_skill_name BEFORE INSERT OR UPDATE OF name ON public.skills FOR EACH ROW EXECUTE FUNCTION public.control_skill_identity();
REVOKE ALL ON FUNCTION public.control_skill_identity() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.control_schedule_sync() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF pg_trigger_depth()>1 OR coalesce(current_setting('career.control_undo',true),'')='on' THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' OR (NEW.scheduled_date,NEW.scheduled_start,NEW.scheduled_end,NEW.title,NEW.deleted_at) IS DISTINCT FROM (OLD.scheduled_date,OLD.scheduled_start,OLD.scheduled_end,OLD.title,OLD.deleted_at) THEN
  IF NEW.deleted_at IS NOT NULL OR NEW.scheduled_date IS NULL OR NEW.scheduled_start IS NULL THEN
   UPDATE planner_blocks SET deleted_at=now(),updated_at=now() WHERE task_id=NEW.id AND user_id=NEW.user_id AND deleted_at IS NULL;
  ELSE
   UPDATE planner_blocks SET block_date=NEW.scheduled_date,start_time=NEW.scheduled_start,end_time=NEW.scheduled_end,title=NEW.title,updated_at=now() WHERE task_id=NEW.id AND user_id=NEW.user_id AND deleted_at IS NULL;
   IF NOT FOUND THEN
    INSERT INTO planner_blocks(user_id,task_id,title,block_date,start_time,end_time) VALUES(NEW.user_id,NEW.id,NEW.title,NEW.scheduled_date,NEW.scheduled_start,NEW.scheduled_end);
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER control_task_schedule AFTER INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.control_schedule_sync();
CREATE FUNCTION public.control_planner_sync() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF pg_trigger_depth()>1 OR coalesce(current_setting('career.control_undo',true),'')='on' THEN RETURN NEW; END IF;
 IF NEW.end_time<=NEW.start_time THEN RAISE EXCEPTION 'invalid_schedule'; END IF;
 IF TG_OP='UPDATE' AND OLD.task_id IS NOT NULL AND (NEW.task_id IS DISTINCT FROM OLD.task_id OR NEW.deleted_at IS NOT NULL) THEN
  UPDATE tasks SET scheduled_date=NULL,scheduled_start=NULL,scheduled_end=NULL,updated_at=now() WHERE id=OLD.task_id AND user_id=NEW.user_id;
 END IF;
 IF NEW.task_id IS NOT NULL AND NEW.deleted_at IS NULL THEN
  UPDATE tasks SET scheduled_date=NEW.block_date,scheduled_start=NEW.start_time,scheduled_end=NEW.end_time,updated_at=now() WHERE id=NEW.task_id AND user_id=NEW.user_id;
  UPDATE planner_blocks SET block_date=NEW.block_date,start_time=NEW.start_time,end_time=NEW.end_time,updated_at=now() WHERE user_id=NEW.user_id AND task_id=NEW.task_id AND id<>NEW.id AND deleted_at IS NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER control_planner_schedule AFTER INSERT OR UPDATE ON planner_blocks FOR EACH ROW EXECUTE FUNCTION control_planner_sync();
REVOKE ALL ON FUNCTION control_planner_sync() FROM PUBLIC,anon,authenticated;
-- Soft-delete linked business records or detach optional links; retain time and delivery history.
CREATE FUNCTION public.control_cascade() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE child record; field record;
BEGIN
 IF coalesce(current_setting('career.control_undo',true),'')='on' OR NEW.deleted_at IS NULL OR OLD.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
 FOR child IN SELECT entity,definition FROM control_registry WHERE (definition->>'writable')::boolean OR entity='learning_assignments' LOOP
  FOR field IN SELECT key,value FROM jsonb_each(child.definition->'fields') WHERE value->>'references'=TG_TABLE_NAME LOOP
   IF (field.value->>'nullable')::boolean THEN
    EXECUTE format('UPDATE public.%I SET %I=NULL,updated_at=now() WHERE %I=$1 AND %I=$2 AND deleted_at IS NULL',child.entity,field.key,field.key,child.definition->>'owner') USING NEW.id,(to_jsonb(NEW)->> (SELECT definition->>'owner' FROM control_registry WHERE entity=TG_TABLE_NAME))::uuid;
   ELSIF (child.definition->>'softDelete')::boolean THEN
    EXECUTE format('UPDATE public.%I SET deleted_at=now(),updated_at=now() WHERE %I=$1 AND %I=$2 AND deleted_at IS NULL',child.entity,field.key,child.definition->>'owner') USING NEW.id,(to_jsonb(NEW)->> (SELECT definition->>'owner' FROM control_registry WHERE entity=TG_TABLE_NAME))::uuid;
   END IF;
  END LOOP;
 END LOOP;
 UPDATE notes SET entity_id=NULL,updated_at=now() WHERE entity_type=TG_TABLE_NAME AND entity_id=NEW.id AND user_id=(to_jsonb(NEW)->> (SELECT definition->>'owner' FROM control_registry WHERE entity=TG_TABLE_NAME))::uuid AND deleted_at IS NULL;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION control_cascade() FROM PUBLIC,anon,authenticated;

DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT entity,definition FROM public.control_registry WHERE (definition->>'writable')::boolean OR (definition->>'special')::boolean LOOP
  EXECUTE format('CREATE TRIGGER control_links BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.control_ownership_guard()',t.entity);
  EXECUTE format('CREATE TRIGGER control_audit AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.control_journal()',t.entity);
  IF (t.definition->>'softDelete')::boolean THEN EXECUTE format('CREATE TRIGGER control_cascade_links AFTER UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION control_cascade()',t.entity); END IF;
 END LOOP;
END $$;

CREATE FUNCTION public.control_apply(p_uid uuid,p_ops jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE op jsonb; d jsonb; vals jsonb; f record; cols text; projection text; oldrow jsonb; rowdata jsonb; results jsonb:='[]'; refs jsonb:='{}'; rid uuid; ent text; action text; textfield text; original text; replacement text; needle text; position integer;
BEGIN
 IF jsonb_typeof(p_ops)<>'array' OR jsonb_array_length(p_ops) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'invalid_operations'; END IF;
 FOR op IN SELECT value FROM jsonb_array_elements(p_ops) LOOP
  ent:=op->>'entity';action:=op->>'action'; vals:=coalesce(op->'values','{}');
  SELECT definition INTO d FROM public.control_registry WHERE entity=ent;
  IF d IS NULL OR NOT (d->>'writable')::boolean OR action NOT IN ('create','update','delete','record_time','edit_text') THEN RAISE EXCEPTION 'unsupported_operation'; END IF;
  IF NOT (d->'operations' ? action) THEN RAISE EXCEPTION 'unsupported_operation'; END IF;
  IF action='record_time' THEN
   IF ent<>'tasks' OR (vals->>'minutes')::integer NOT BETWEEN 1 AND 600 THEN RAISE EXCEPTION 'invalid_time_record'; END IF;
   rid:=CASE WHEN left(op->>'id',1)='$' THEN (refs->>substring(op->>'id',2))::uuid ELSE (op->>'id')::uuid END;
   IF rid IS NULL THEN RAISE EXCEPTION 'unknown_reference'; END IF;
   PERFORM public.learning_record_focus(p_uid,rid,gen_random_uuid(),coalesce((vals->>'ended_at')::timestamptz,now())-make_interval(mins=>(vals->>'minutes')::integer),coalesce((vals->>'ended_at')::timestamptz,now()),(vals->>'minutes')::integer,coalesce((vals->>'complete')::boolean,false));
   SELECT to_jsonb(t) INTO rowdata FROM public.tasks t WHERE id=rid AND user_id=p_uid;
   results:=results||jsonb_build_array(jsonb_build_object('entity',ent,'action',action,'record',rowdata));
   CONTINUE;
  END IF;
  IF jsonb_typeof(vals)<>'object' OR octet_length(vals::text)>100000 THEN RAISE EXCEPTION 'invalid_fields'; END IF;
  IF action<>'edit_text' THEN
  FOR f IN SELECT key,value FROM jsonb_each(vals) LOOP
   IF NOT coalesce((d->'fields'->f.key->>'editable')::boolean,false) THEN RAISE EXCEPTION 'protected_field'; END IF;
   IF f.value::text='null' AND NOT (d->'fields'->f.key->>'nullable')::boolean THEN RAISE EXCEPTION 'null_not_allowed'; END IF;
   IF d->'fields'->f.key ? 'enum' AND f.value::text<>'null' AND NOT (d->'fields'->f.key->'enum' ? (vals->>f.key)) THEN RAISE EXCEPTION 'invalid_enum'; END IF;
   IF d->'fields'->f.key ? 'references' AND left(vals->>f.key,1)='$' THEN
    IF NOT refs ? substring(vals->>f.key,2) THEN RAISE EXCEPTION 'unknown_reference'; END IF;
    vals:=jsonb_set(vals,ARRAY[f.key],refs->substring(vals->>f.key,2));
   END IF;
  END LOOP;
  END IF;
  IF action='create' THEN
   IF ent='agent_commands' THEN
    IF vals->>'command'='resume' THEN RAISE EXCEPTION 'automation_activation_blocked'; END IF;
    IF NOT (d->'fields'->'workflow'->'enum' ? coalesce(vals->>'workflow','all')) THEN RAISE EXCEPTION 'invalid_command_payload'; END IF;
    IF vals->>'command'='reprocess_document' THEN
     IF (coalesce(vals->'payload','{}')-'document_id')<>'{}'::jsonb OR NOT EXISTS(SELECT 1 FROM source_documents WHERE id=(vals->'payload'->>'document_id')::uuid AND user_id=p_uid AND deleted_at IS NULL) THEN RAISE EXCEPTION 'invalid_command_payload'; END IF;
     vals:=vals||jsonb_build_object('workflow','vault_intake');
    ELSIF coalesce(vals->'payload','{}')<>'{}'::jsonb THEN RAISE EXCEPTION 'invalid_command_payload';
    END IF;
    vals:=vals||jsonb_build_object('status','queued','idempotency_key',current_setting('career.control_key',true));
   END IF;
   rid:=gen_random_uuid(); vals:=vals||jsonb_build_object('id',rid,d->>'owner',p_uid);
   IF ent='profiles' THEN RAISE EXCEPTION 'profile_already_exists'; END IF;
   SELECT string_agg(format('%I',key),','),string_agg(format('x.%I',key),',') INTO cols,projection FROM jsonb_each(vals);
   EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) x RETURNING to_jsonb(%I.*)',ent,cols,projection,ent,ent) INTO rowdata USING vals;
  ELSE
   rid:=CASE WHEN left(op->>'id',1)='$' THEN (refs->>substring(op->>'id',2))::uuid ELSE (op->>'id')::uuid END;
   IF rid IS NULL THEN RAISE EXCEPTION 'unknown_reference'; END IF;
   EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 AND %I=$2 %s FOR UPDATE',ent,d->>'owner',CASE WHEN (d->>'softDelete')::boolean THEN 'AND deleted_at IS NULL' ELSE '' END) INTO oldrow USING rid,p_uid;
   IF oldrow IS NULL THEN RAISE EXCEPTION 'record_not_found'; END IF;
   IF action='edit_text' THEN
    textfield:=vals->>'field';original:=coalesce(oldrow->>textfield,'');replacement:=vals->>'text';needle:=vals->>'find';
    IF NOT coalesce((d->'fields'->textfield->>'editable')::boolean,false) OR d->'fields'->textfield->>'type'<>'text' OR d->'fields'->textfield ? 'enum' OR textfield ~ '(url|time|timezone|website|email)' OR replacement IS NULL OR length(replacement)>20000 OR vals->>'mode' NOT IN ('append','replace_fragment') THEN RAISE EXCEPTION 'invalid_text_edit'; END IF;
    IF ent='notes' AND textfield='content' AND original ~ '^\s*<' THEN
     IF coalesce(needle,'') ~ '[<>]' THEN RAISE EXCEPTION 'invalid_text_edit'; END IF;
     replacement:=replace(replace(replace(replacement,'&','&amp;'),'<','&lt;'),'>','&gt;');
    END IF;
    IF vals->>'mode'='append' THEN
     original:=original||CASE WHEN ent='notes' AND textfield='content' AND original ~ '^\s*<' THEN '<p>'||replace(replacement,E'\n','<br>')||'</p>' ELSE CASE WHEN original='' THEN '' ELSE E'\n' END||replacement END;
    ELSE
     IF nullif(needle,'') IS NULL THEN RAISE EXCEPTION 'invalid_text_edit'; END IF;
     position:=strpos(original,needle);
     IF position=0 THEN RAISE EXCEPTION 'text_fragment_not_found'; END IF;
     IF strpos(substring(original,position+length(needle)),needle)>0 THEN RAISE EXCEPTION 'text_fragment_ambiguous'; END IF;
     original:=overlay(original PLACING replacement FROM position FOR length(needle));
    END IF;
    IF length(original)>20000 THEN RAISE EXCEPTION 'text_too_large_use_document'; END IF;
    vals:=jsonb_build_object(textfield,original);
   END IF;
   IF ent='learning_baselines' AND oldrow->>'basis'='evidence' THEN RAISE EXCEPTION 'evidence_baseline_protected'; END IF;
   IF ent IN ('study_tasks','project_tasks') AND oldrow->>'consolidated_task_id' IS NOT NULL AND (vals ? 'status' OR action='delete') THEN RAISE EXCEPTION 'use_canonical_task'; END IF;
   IF ent='agent_commands' AND (oldrow->>'status'<>'queued' OR vals->>'status'<>'cancelled' OR (vals-'status')<>'{}'::jsonb) THEN RAISE EXCEPTION 'command_not_cancellable'; END IF;
   -- Learning completions must retain the existing accounting RPC.
   IF ent='tasks' AND vals ? 'status' AND EXISTS(SELECT 1 FROM public.learning_assignments WHERE user_id=p_uid AND task_id=rid AND deleted_at IS NULL AND status NOT IN ('completed','skipped')) THEN RAISE EXCEPTION 'use_learning_completion'; END IF;
   IF action='delete' THEN
    IF NOT (d->>'softDelete')::boolean THEN RAISE EXCEPTION 'deletion_not_supported'; END IF;
    vals:=jsonb_build_object('deleted_at',now());
   END IF;
   vals:=oldrow||vals||jsonb_build_object('updated_at',now());
   SELECT string_agg(format('%I=x.%I',key,key),',') INTO cols FROM jsonb_each(d->'fields') WHERE key NOT IN ('id','user_id','created_at');
   EXECUTE format('UPDATE public.%I t SET %s FROM jsonb_populate_record(NULL::public.%I,$1) x WHERE t.id=$2 AND t.%I=$3 RETURNING to_jsonb(t)',ent,cols,ent,d->>'owner') INTO rowdata USING vals,rid,p_uid;
  END IF;
  IF rowdata IS NULL THEN RAISE EXCEPTION 'zero_rows_changed'; END IF;
  IF op ? 'ref' THEN
   IF refs ? (op->>'ref') THEN RAISE EXCEPTION 'duplicate_reference'; END IF;
   refs:=refs||jsonb_build_object(op->>'ref',rid);
  END IF;
  results:=results||jsonb_build_array(jsonb_build_object('entity',ent,'action',action,'record',rowdata));
 END LOOP;
 RETURN results;
END $$;
CREATE FUNCTION public.control_execute(p_uid uuid,p_chat text,p_message text,p_key text,p_ops jsonb,p_approval uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE receipt public.control_receipts; approval public.control_approvals; needs boolean; preview jsonb; result jsonb; op jsonb; f record; m public.control_messages; lastentity text; ids jsonb; expected jsonb:='[]'; snapshot jsonb; d jsonb; affected jsonb; affectedcount integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_uid::text,713));
 IF NOT EXISTS(SELECT 1 FROM public.agent_owner WHERE singleton AND user_id=p_uid) THEN RAISE EXCEPTION 'owner_not_bound'; END IF;
 SELECT * INTO m FROM public.control_messages WHERE user_id=p_uid AND chat_ref=p_chat AND message_ref=p_message AND created_at>now()-interval '30 minutes';
 IF m.id IS NULL THEN RAISE EXCEPTION 'inbound_context_required'; END IF;
 IF length(p_key) NOT BETWEEN 8 AND 200 THEN RAISE EXCEPTION 'invalid_request_key'; END IF;
 SELECT * INTO receipt FROM public.control_receipts WHERE user_id=p_uid AND request_key=p_key;
 IF receipt.user_id IS NOT NULL THEN
  IF receipt.payload IS DISTINCT FROM p_ops THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
  RETURN receipt.result;
 END IF;
 PERFORM set_config('career.control_key',p_key,true);
 needs:=jsonb_array_length(p_ops)>1;
 FOR op IN SELECT value FROM jsonb_array_elements(p_ops) LOOP
  needs:=needs OR op->>'action'='delete' OR op->>'entity' IN ('profiles','career_preferences','learning_preferences','agent_commands');
  IF op->>'action'='update' AND left(op->>'id',1)<>'$' THEN
   SELECT definition INTO d FROM control_registry WHERE entity=op->>'entity';
   IF d IS NOT NULL THEN
    EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 AND %I=$2 FOR UPDATE',op->>'entity',d->>'owner') INTO snapshot USING (op->>'id')::uuid,p_uid;
    FOR f IN SELECT key,value FROM jsonb_each(coalesce(op->'values','{}')) LOOP
     needs:=needs OR (jsonb_typeof(snapshot->f.key)='string' AND length(snapshot->>f.key)>2000 AND snapshot->f.key IS DISTINCT FROM f.value);
    END LOOP;
   END IF;
  END IF;
  FOR f IN SELECT key,value FROM jsonb_each(coalesce(op->'values','{}')) LOOP
   needs:=needs OR length(f.value::text)>2000 OR coalesce((SELECT (definition->'fields'->f.key->>'confirm')::boolean FROM public.control_registry WHERE entity=op->>'entity'),false);
  END LOOP;
 END LOOP;
 IF needs AND p_approval IS NULL THEN
  -- Validate against real DB constraints/ownership without persisting a preview mutation.
  BEGIN
   preview:=public.control_apply(p_uid,p_ops);
   SELECT count(*)::int INTO affectedcount FROM control_changes WHERE user_id=p_uid AND request_key=p_key;
   IF affectedcount>500 THEN RAISE EXCEPTION 'too_many_linked_changes_use_batches'; END IF;
   SELECT coalesce(jsonb_agg(jsonb_build_object('entity',entity,'id',record_id,'before',before_row,'after',after_row) ORDER BY sequence),'[]') INTO affected FROM control_changes WHERE user_id=p_uid AND request_key=p_key;
   RAISE EXCEPTION 'control_preview_rollback';
  EXCEPTION WHEN raise_exception THEN
   IF SQLERRM<>'control_preview_rollback' THEN RAISE; END IF;
  END;
  FOR op IN SELECT value FROM jsonb_array_elements(p_ops) WHERE value ? 'id' AND left(value->>'id',1)<>'$' LOOP
   SELECT definition INTO d FROM control_registry WHERE entity=op->>'entity';
   EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 AND %I=$2 FOR UPDATE',op->>'entity',d->>'owner') INTO snapshot USING (op->>'id')::uuid,p_uid;
   expected:=expected||jsonb_build_array(jsonb_build_object('entity',op->>'entity','id',op->>'id','row',snapshot));
  END LOOP;
  FOR op IN SELECT value FROM jsonb_array_elements(coalesce(affected,'[]')) a WHERE value->'before'<>'null'::jsonb AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(affected,'[]')) c WHERE c->>'entity'=a.value->>'entity' AND c->>'id'=a.value->>'id' AND c->'before'='null'::jsonb) LOOP
   IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(expected) v WHERE v->>'entity'=op->>'entity' AND v->>'id'=op->>'id') THEN
    expected:=expected||jsonb_build_array(jsonb_build_object('entity',op->>'entity','id',op->>'id','row',op->'before'));
   END IF;
  END LOOP;
  preview:=jsonb_build_object('operations',p_ops,'result_preview',preview,'expected_rows',expected,'count',jsonb_array_length(p_ops),'affected_changes',affected,'affected_change_count',affectedcount);
  INSERT INTO public.control_approvals(user_id,chat_ref,operations,preview) VALUES(p_uid,p_chat,p_ops,preview) RETURNING * INTO approval;
  result:=jsonb_build_object('status','awaiting_confirmation','approval_id',approval.id,'expires_at',approval.expires_at,'preview',preview,'reply','confirm '||approval.id);
 ELSE
  IF needs THEN
   SELECT * INTO approval FROM public.control_approvals WHERE id=p_approval AND user_id=p_uid AND chat_ref=p_chat FOR UPDATE;
   IF approval.id IS NULL OR approval.consumed_at IS NOT NULL OR approval.expires_at<=now() OR approval.operations IS DISTINCT FROM p_ops OR lower(trim(m.text))<>'confirm '||approval.id THEN RAISE EXCEPTION 'invalid_confirmation'; END IF;
   FOR op IN SELECT value FROM jsonb_array_elements(coalesce(approval.preview->'expected_rows','[]')) LOOP
    SELECT definition INTO d FROM control_registry WHERE entity=op->>'entity';
    EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 AND %I=$2 FOR UPDATE',op->>'entity',d->>'owner') INTO snapshot USING (op->>'id')::uuid,p_uid;
    IF snapshot IS DISTINCT FROM op->'row' THEN RAISE EXCEPTION 'approval_stale_repreview'; END IF;
   END LOOP;
   UPDATE public.control_approvals SET consumed_at=now() WHERE id=approval.id;
  END IF;
  PERFORM set_config('career.control_key',p_key,true);
  result:=jsonb_build_object('status','completed','changes',public.control_apply(p_uid,p_ops),'request_key',p_key);
  SELECT count(*)::int INTO affectedcount FROM control_changes WHERE user_id=p_uid AND request_key=p_key;
  IF affectedcount>500 THEN RAISE EXCEPTION 'too_many_linked_changes_use_batches'; END IF;
  IF needs THEN
   FOR op IN SELECT jsonb_build_object('entity',c.entity,'id',c.record_id,'row',c.before_row) FROM (SELECT DISTINCT ON(entity,record_id) entity,record_id,before_row FROM control_changes WHERE user_id=p_uid AND request_key=p_key ORDER BY entity,record_id,sequence ASC) c WHERE c.before_row IS NOT NULL LOOP
    IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(approval.preview->'expected_rows') v WHERE v=op) THEN RAISE EXCEPTION 'approval_stale_repreview'; END IF;
   END LOOP;
  END IF;
  result:=result||jsonb_build_object('affected_change_count',affectedcount);
  lastentity:=result->'changes'->(jsonb_array_length(result->'changes')-1)->>'entity';
  SELECT jsonb_agg(rid ORDER BY position) INTO ids FROM (SELECT value->'record'->'id' rid,min(ordinality) position FROM jsonb_array_elements(result->'changes') WITH ORDINALITY WHERE value->>'entity'=lastentity AND value->>'action'<>'delete' GROUP BY value->'record'->'id') q;
  INSERT INTO control_context(user_id,chat_ref,entity,record_ids,selected_id,updated_at,lists)
  VALUES(p_uid,p_chat,lastentity,coalesce(ids,'[]'),CASE WHEN jsonb_array_length(coalesce(ids,'[]'))=1 THEN (ids->>0)::uuid ELSE NULL END,now(),jsonb_build_object(lastentity,jsonb_build_object('record_ids',coalesce(ids,'[]'),'selected_id',CASE WHEN jsonb_array_length(coalesce(ids,'[]'))=1 THEN (ids->>0)::uuid ELSE NULL END,'base_offset',0,'query_signature',NULL,'updated_at',now())))
  ON CONFLICT(user_id,chat_ref) DO UPDATE SET entity=EXCLUDED.entity,record_ids=EXCLUDED.record_ids,selected_id=EXCLUDED.selected_id,updated_at=now(),query_signature=NULL,base_offset=0,lists=control_context.lists||EXCLUDED.lists;
  INSERT INTO public.audit_events(user_id,actor,action,entity_type,detail,source) VALUES(p_uid,'agent','control_execute','control',jsonb_build_object('request_key',p_key,'count',jsonb_array_length(p_ops)),'agent');
 END IF;
 INSERT INTO public.control_receipts(user_id,request_key,payload,result) VALUES(p_uid,p_key,p_ops,result);
 RETURN result;
END $$;
-- All privileged functions are server-only.
REVOKE ALL ON FUNCTION public.control_apply(uuid,jsonb),public.control_execute(uuid,text,text,text,jsonb,uuid),public.control_journal() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_execute(uuid,text,text,text,jsonb,uuid) TO service_role;

CREATE FUNCTION public.control_undo(p_uid uuid,p_request text,p_key text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c record; currentrow jsonb; d jsonb; cols text; restored jsonb; receipt public.control_receipts;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_uid::text,713));
 SELECT * INTO receipt FROM control_receipts WHERE user_id=p_uid AND request_key=p_key;
 IF receipt.user_id IS NOT NULL THEN
  IF receipt.payload<>jsonb_build_object('undo',p_request) THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
  RETURN receipt.result;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM control_changes WHERE user_id=p_uid AND request_key=p_request AND undone_at IS NULL) THEN RAISE EXCEPTION 'nothing_to_undo'; END IF;
 -- Compare final snapshot of every affected record before making any change.
 FOR c IN SELECT DISTINCT ON(entity,record_id) * FROM control_changes WHERE user_id=p_uid AND request_key=p_request AND undone_at IS NULL ORDER BY entity,record_id,sequence DESC LOOP
  SELECT definition INTO d FROM control_registry WHERE entity=c.entity;
  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 AND %I=$2 FOR UPDATE',c.entity,d->>'owner') INTO currentrow USING c.record_id,p_uid;
  IF currentrow IS DISTINCT FROM c.after_row THEN RAISE EXCEPTION 'undo_conflict'; END IF;
 END LOOP;
 PERFORM set_config('career.control_key',p_key,true);
 -- Restore in reverse order, including dependent effects captured in the transaction.
 PERFORM set_config('career.control_undo','on',true);
 FOR c IN SELECT * FROM control_changes WHERE user_id=p_uid AND request_key=p_request AND undone_at IS NULL ORDER BY sequence DESC LOOP
  SELECT definition INTO d FROM control_registry WHERE entity=c.entity;
  restored:=c.before_row;
  IF restored IS NULL THEN
   IF NOT (d->>'softDelete')::boolean THEN RAISE EXCEPTION 'undo_not_supported'; END IF;
   restored:=c.after_row||jsonb_build_object('deleted_at',now(),'updated_at',now());
  END IF;
  SELECT string_agg(format('%I=x.%I',key,key),',') INTO cols FROM jsonb_each(d->'fields') WHERE key NOT IN ('id','user_id','created_at');
  EXECUTE format('UPDATE public.%I t SET %s FROM jsonb_populate_record(NULL::public.%I,$1) x WHERE t.id=$2 AND t.%I=$3',c.entity,cols,c.entity,d->>'owner') USING restored,c.record_id,p_uid;
 END LOOP;
 PERFORM set_config('career.control_undo','',true);
 UPDATE control_changes SET undone_at=now() WHERE user_id=p_uid AND request_key=p_request;
 UPDATE control_receipts SET result=result||jsonb_build_object('status','undone') WHERE user_id=p_uid AND request_key=p_request;
 UPDATE control_context SET selected_id=NULL,record_ids='[]',lists='{}',base_offset=0,query_signature=NULL,updated_at=now() WHERE user_id=p_uid;
 restored:=jsonb_build_object('status','completed','undone_request',p_request);
 INSERT INTO control_receipts(user_id,request_key,payload,result) VALUES(p_uid,p_key,jsonb_build_object('undo',p_request),restored);
 RETURN restored;
END $$;
REVOKE ALL ON FUNCTION public.control_undo(uuid,text,text),public.control_ownership_guard(),public.control_task_invariants(),public.control_schedule_sync() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_undo(uuid,text,text) TO service_role;

CREATE FUNCTION public.control_query(p_uid uuid,p_entity text,p_query jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE d jsonb; f record; conditions text; field text; op text; params jsonb; result jsonb; lim integer; off integer; ordering text; direction text; search text;
BEGIN
 SELECT definition INTO d FROM control_registry WHERE entity=p_entity;
 IF d IS NULL THEN RAISE EXCEPTION 'unsupported_entity'; END IF;
 lim:=coalesce((p_query->>'limit')::integer,50);off:=coalesce((p_query->>'offset')::integer,0);
 IF lim NOT BETWEEN 1 AND 200 OR off<0 THEN RAISE EXCEPTION 'invalid_pagination'; END IF;
 conditions:=format('t.%I=$1',d->>'owner');
 IF (d->>'softDelete')::boolean THEN conditions:=conditions||' AND t.deleted_at IS NULL'; END IF;
 search:=p_query->>'search';
 IF length(search)>200 THEN RAISE EXCEPTION 'search_too_long'; END IF;
 IF nullif(search,'') IS NOT NULL THEN
  conditions:=conditions||' AND to_jsonb(t)::text ILIKE $3 ESCAPE ''!''';
 END IF;
 params:=coalesce(p_query->'filters','[]');
 IF jsonb_typeof(params)<>'array' OR jsonb_array_length(params)>20 THEN RAISE EXCEPTION 'invalid_filters'; END IF;
 FOR f IN SELECT value,ordinality FROM jsonb_array_elements(params) WITH ORDINALITY LOOP
  field:=f.value->>'field';op:=f.value->>'op';
  IF NOT (d->'fields' ? field) OR op NOT IN ('eq','ne','gte','lte','contains','is_null') THEN RAISE EXCEPTION 'invalid_filter'; END IF;
  IF op='is_null' THEN conditions:=conditions||format(' AND (to_jsonb(t)->%L) = ''null''::jsonb',field);
  ELSIF op IN ('eq','ne') THEN conditions:=conditions||format(' AND (to_jsonb(t)->%L) %s ($2->''filters''->%s->''value'')',field,CASE WHEN op='eq' THEN '=' ELSE '<>' END,f.ordinality-1);
  ELSIF op IN ('gte','lte') THEN conditions:=conditions||format(' AND t.%I %s (jsonb_populate_record(NULL::public.%I,jsonb_build_object(%L,$2->''filters''->%s->''value''))).%I',field,CASE WHEN op='gte' THEN '>=' ELSE '<=' END,p_entity,field,f.ordinality-1,field);
  ELSE conditions:=conditions||format(' AND position(lower($2->''filters''->%s->>''value'') in lower(to_jsonb(t)->>%L))>0',f.ordinality-1,field);
  END IF;
 END LOOP;
 ordering:=coalesce(p_query->>'sort','updated_at'); direction:=coalesce(p_query->>'direction','desc');
 IF NOT (d->'fields' ? ordering) OR direction NOT IN ('asc','desc') THEN RAISE EXCEPTION 'invalid_sort'; END IF;
 EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(q)),''[]''::jsonb) FROM (SELECT t.* FROM public.%I t WHERE %s ORDER BY t.%I %s NULLS LAST,t.id %s LIMIT %s OFFSET %s) q',p_entity,conditions,ordering,direction,direction,lim+1,off)
 INTO result USING p_uid,p_query,'%'||replace(replace(replace(search,'!','!!'),'%','!%'),'_','!_')||'%';
 RETURN jsonb_build_object('entity',p_entity,'rows',CASE WHEN jsonb_array_length(result)>lim THEN result-(lim) ELSE result END,'has_more',jsonb_array_length(result)>lim,'next_offset',CASE WHEN jsonb_array_length(result)>lim THEN off+lim ELSE NULL END);
END $$;
REVOKE ALL ON FUNCTION public.control_query(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_query(uuid,text,jsonb) TO service_role;

CREATE FUNCTION public.control_prepare_undo(p_uid uuid,p_chat text,p_request text,p_key text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE prior public.control_receipts; a public.control_approvals; result jsonb; snapshots jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_uid::text,713));
 SELECT * INTO prior FROM control_receipts WHERE user_id=p_uid AND request_key=p_key;
 IF prior.user_id IS NOT NULL THEN
  IF prior.payload<>jsonb_build_object('undo',p_request) THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
  RETURN prior.result;
 END IF;
 SELECT jsonb_agg(jsonb_build_object('entity',entity,'record_id',record_id,'before',before_row,'after',after_row) ORDER BY sequence) INTO snapshots FROM control_changes WHERE user_id=p_uid AND request_key=p_request AND undone_at IS NULL;
 IF snapshots IS NULL THEN RAISE EXCEPTION 'nothing_to_undo'; END IF;
 INSERT INTO control_approvals(user_id,chat_ref,operations,preview)
 VALUES(p_uid,p_chat,jsonb_build_array(jsonb_build_object('action','undo','request_key',p_request)),jsonb_build_object('changes',snapshots)) RETURNING * INTO a;
 result:=jsonb_build_object('status','awaiting_confirmation','approval_id',a.id,'expires_at',a.expires_at,'preview',a.preview,'reply','confirm '||a.id);
 INSERT INTO control_receipts(user_id,request_key,payload,result) VALUES(p_uid,p_key,jsonb_build_object('undo',p_request),result);
 RETURN result;
END $$;
CREATE FUNCTION public.control_confirm_undo(p_uid uuid,p_chat text,p_message text,p_id uuid,p_key text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.control_approvals; prior public.control_receipts; result jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_uid::text,713));
 SELECT * INTO prior FROM control_receipts WHERE user_id=p_uid AND request_key=p_key;
 IF prior.user_id IS NOT NULL THEN
  IF prior.payload<>jsonb_build_object('undo_confirmation',p_id) THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
  RETURN prior.result;
 END IF;
 SELECT * INTO a FROM control_approvals WHERE id=p_id AND user_id=p_uid AND chat_ref=p_chat FOR UPDATE;
 IF a.id IS NULL OR a.consumed_at IS NOT NULL OR a.expires_at<=now() OR a.operations->0->>'action'<>'undo' OR
 NOT EXISTS(SELECT 1 FROM control_messages WHERE user_id=p_uid AND chat_ref=p_chat AND message_ref=p_message AND created_at>now()-interval '30 minutes' AND lower(trim(text))='confirm '||p_id) THEN RAISE EXCEPTION 'invalid_confirmation'; END IF;
 result:=control_undo(p_uid,a.operations->0->>'request_key',p_key||':undo');
 UPDATE control_approvals SET consumed_at=now() WHERE id=p_id;
 INSERT INTO control_receipts(user_id,request_key,payload,result) VALUES(p_uid,p_key,jsonb_build_object('undo_confirmation',p_id),result);
 RETURN result;
END $$;
CREATE FUNCTION public.control_queue_development(p_uid uuid,p_request text,p_key text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE prior public.control_receipts; rowdata jsonb; result jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_uid::text,713));
 SELECT * INTO prior FROM control_receipts WHERE user_id=p_uid AND request_key=p_key;
 IF prior.user_id IS NOT NULL THEN
  IF prior.payload<>jsonb_build_object('development_request',p_request) THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
  RETURN prior.result;
 END IF;
 INSERT INTO control_dev_requests(user_id,request) VALUES(p_uid,p_request) RETURNING to_jsonb(control_dev_requests.*) INTO rowdata;
 result:=jsonb_build_object('status','pending','request',rowdata,'coding_integration','not_configured','deployed',false,'next_step','Controlled development branch, tests, reviewed diff and explicit production approval are required.');
 INSERT INTO control_receipts(user_id,request_key,payload,result) VALUES(p_uid,p_key,jsonb_build_object('development_request',p_request),result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.control_prepare_undo(uuid,text,text,text),public.control_confirm_undo(uuid,text,text,uuid,text),public.control_queue_development(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_prepare_undo(uuid,text,text,text),public.control_confirm_undo(uuid,text,text,uuid,text),public.control_queue_development(uuid,text,text) TO service_role;

CREATE FUNCTION public.control_attach_document(p_uid uuid,p_title text,p_kind text,p_path text,p_key text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE prior public.control_receipts; doc public.source_documents; result jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_uid::text,713));
 IF left(p_path,length(p_uid::text)+1)<>p_uid::text||'/' THEN RAISE EXCEPTION 'invalid_attachment'; END IF;
 IF p_kind NOT IN ('resume','job_description','certificate','article','note','transcript','other') OR length(p_title) NOT BETWEEN 1 AND 300 THEN RAISE EXCEPTION 'invalid_attachment'; END IF;
 SELECT * INTO prior FROM control_receipts WHERE user_id=p_uid AND request_key=p_key;
 IF prior.user_id IS NOT NULL THEN
  IF prior.payload<>jsonb_build_object('attachment',p_path,'title',p_title,'kind',p_kind) THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
  RETURN prior.result;
 END IF;
 SELECT * INTO doc FROM source_documents WHERE user_id=p_uid AND storage_path=p_path AND deleted_at IS NULL;
 IF doc.id IS NULL THEN
  PERFORM set_config('career.control_key',p_key,true);
  INSERT INTO source_documents(user_id,title,kind,storage_path,status,source) VALUES(p_uid,p_title,p_kind,p_path,'action_needed','user') RETURNING * INTO doc;
 END IF;
 result:=jsonb_build_object('status','completed','document',to_jsonb(doc),'processing','not_started','request_key',p_key);
 INSERT INTO control_receipts(user_id,request_key,payload,result) VALUES(p_uid,p_key,jsonb_build_object('attachment',p_path,'title',p_title,'kind',p_kind),result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.control_attach_document(uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_attach_document(uuid,text,text,text,text) TO service_role;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.control_changes;
 END IF;
END $$;

-- Registry refinements preserve internal execution/claiming and guide provenance.

CREATE FUNCTION public.control_export(p_uid uuid,p_entities text[],p_project uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET statement_timeout='15s' AS $$
DECLARE ent text; d jsonb; rows jsonb; result jsonb:='{}'; conditions text; taskids uuid[]; assignmentids uuid[]; skillids uuid[]; goalids uuid[]; contactids uuid[]; appids uuid[];
BEGIN
 IF cardinality(p_entities)>60 THEN RAISE EXCEPTION 'unsupported_entity'; END IF;
 IF p_project IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM projects WHERE id=p_project AND user_id=p_uid AND deleted_at IS NULL) THEN RAISE EXCEPTION 'record_not_found'; END IF;
  SELECT array_agg(id),array_agg(skill_id),array_agg(goal_id),array_agg(contact_id),array_agg(application_id) INTO taskids,skillids,goalids,contactids,appids FROM tasks WHERE project_id=p_project AND user_id=p_uid AND deleted_at IS NULL;
  SELECT array_agg(id) INTO assignmentids FROM learning_assignments WHERE user_id=p_uid AND task_id=ANY(taskids) AND deleted_at IS NULL;
 END IF;
 FOREACH ent IN ARRAY p_entities LOOP
  SELECT definition INTO d FROM control_registry WHERE entity=ent;
  IF d IS NULL THEN RAISE EXCEPTION 'unsupported_entity'; END IF;
  conditions:=format('t.%I=$1',d->>'owner');
  IF (d->>'softDelete')::boolean THEN conditions:=conditions||' AND t.deleted_at IS NULL'; END IF;
  IF p_project IS NOT NULL THEN
   IF ent='projects' THEN conditions:=conditions||' AND t.id=$2';
   ELSIF d->'fields' ? 'project_id' THEN conditions:=conditions||' AND t.project_id=$2';
   ELSIF d->'fields' ? 'task_id' THEN conditions:=conditions||' AND t.task_id=ANY($3)';
   ELSIF d->'fields' ? 'assignment_id' THEN conditions:=conditions||' AND t.assignment_id=ANY($4)';
   ELSIF ent='skills' THEN conditions:=conditions||' AND t.id=ANY($5)';
   ELSIF ent='goals' THEN conditions:=conditions||' AND t.id=ANY($6)';
   ELSIF ent='contacts' THEN conditions:=conditions||' AND t.id=ANY($7)';
   ELSIF ent='job_applications' THEN conditions:=conditions||' AND t.id=ANY($8)';
   ELSIF ent='notes' THEN conditions:=conditions||' AND ((t.entity_type=''projects'' AND t.entity_id=$2) OR (t.entity_type=''tasks'' AND t.entity_id=ANY($3)))';
   ELSE CONTINUE;
   END IF;
  END IF;
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id),''[]''::jsonb) FROM public.%I t WHERE %s',ent,conditions) INTO rows USING p_uid,p_project,taskids,assignmentids,skillids,goalids,contactids,appids;
  result:=result||jsonb_build_object(ent,rows);
  IF octet_length(result::text)>20000000 THEN RAISE EXCEPTION 'export_too_large_use_entity_export'; END IF;
 END LOOP;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION control_export(uuid,text[],uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION control_export(uuid,text[],uuid) TO service_role;

CREATE FUNCTION public.control_attach_record(p_uid uuid,p_target text,p_input jsonb,p_path text,p_key text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE prior public.control_receipts; vals jsonb; result jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_uid::text,713));
 IF p_target NOT IN ('resources','evidence') OR left(p_path,length(p_uid::text)+1)<>p_uid::text||'/' OR p_path LIKE '%..%' THEN RAISE EXCEPTION 'invalid_attachment'; END IF;
 SELECT * INTO prior FROM control_receipts WHERE user_id=p_uid AND request_key=p_key;
 IF prior.user_id IS NOT NULL THEN
  IF prior.payload<>jsonb_build_object('attachment',p_path,'target',p_target,'input',p_input) THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
  RETURN prior.result;
 END IF;
 vals:=jsonb_build_object('title',p_input->>'title','url','storage:'||p_path);
 IF p_input ? 'skill_id' THEN vals:=vals||jsonb_build_object('skill_id',p_input->'skill_id'); END IF;
 IF p_input ? 'project_id' THEN vals:=vals||jsonb_build_object('project_id',p_input->'project_id'); END IF;
 IF p_target='resources' THEN vals:=vals||jsonb_build_object('source_type','File');
 ELSE vals:=vals||jsonb_build_object('kind',p_input->>'kind'); END IF;
 PERFORM set_config('career.control_key',p_key,true);
 result:=jsonb_build_object('status','completed','changes',control_apply(p_uid,jsonb_build_array(jsonb_build_object('entity',p_target,'action','create','values',vals))),'request_key',p_key,'processing','not_started');
 INSERT INTO control_receipts(user_id,request_key,payload,result) VALUES(p_uid,p_key,jsonb_build_object('attachment',p_path,'target',p_target,'input',p_input),result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION control_attach_record(uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION control_attach_record(uuid,text,jsonb,text,text) TO service_role;

CREATE FUNCTION public.control_prepare_workflow(p_uid uuid,p_chat text,p_operation text,p_key text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.control_approvals; prior public.control_receipts; result jsonb; ops jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_uid::text,713));
 IF p_operation NOT IN ('sync_guide','finish_baseline') THEN RAISE EXCEPTION 'unsupported_operation'; END IF;
 ops:=jsonb_build_array(jsonb_build_object('action','learning_workflow','operation',p_operation));
 SELECT * INTO prior FROM control_receipts WHERE user_id=p_uid AND request_key=p_key;
 IF prior.user_id IS NOT NULL THEN
  IF prior.payload<>ops THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
  RETURN prior.result;
 END IF;
 INSERT INTO control_approvals(user_id,chat_ref,operations,preview) VALUES(p_uid,p_chat,ops,jsonb_build_object('operation',p_operation,'preferences',(SELECT to_jsonb(p)-'hermes_last_seen_at'-'telegram_status_at'-'telegram_status'-'updated_at' FROM learning_preferences p WHERE user_id=p_uid AND deleted_at IS NULL LIMIT 1),
 'effect',CASE WHEN p_operation='sync_guide' THEN 'Re-read the configured Google guide using the existing parser and import transaction. Existing incomplete-source safeguards apply.' ELSE 'Mark the owner self-assessment baseline finished; no skill ratings or mastery are inferred.' END)) RETURNING * INTO a;
 result:=jsonb_build_object('status','awaiting_confirmation','approval_id',a.id,'expires_at',a.expires_at,'preview',a.preview,'reply','confirm '||a.id);
 INSERT INTO control_receipts(user_id,request_key,payload,result) VALUES(p_uid,p_key,ops,result);
 RETURN result;
END $$;
CREATE FUNCTION public.control_claim_workflow(p_uid uuid,p_chat text,p_message text,p_id uuid,p_key text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.control_approvals; prior public.control_receipts; result jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_uid::text,713));
 SELECT * INTO prior FROM control_receipts WHERE user_id=p_uid AND request_key=p_key;
 IF prior.user_id IS NOT NULL THEN
  IF prior.payload<>jsonb_build_object('workflow_confirmation',p_id) THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
  RETURN prior.result||jsonb_build_object('replayed',true);
 END IF;
 SELECT * INTO a FROM control_approvals WHERE id=p_id AND user_id=p_uid AND chat_ref=p_chat FOR UPDATE;
 IF a.id IS NULL OR a.consumed_at IS NOT NULL OR a.expires_at<=now() OR a.operations->0->>'action'<>'learning_workflow' OR
 NOT EXISTS(SELECT 1 FROM control_messages WHERE user_id=p_uid AND chat_ref=p_chat AND message_ref=p_message AND lower(trim(text))='confirm '||p_id AND created_at>now()-interval '30 minutes') THEN RAISE EXCEPTION 'invalid_confirmation'; END IF;
 IF a.preview->'preferences' IS DISTINCT FROM (SELECT to_jsonb(p)-'hermes_last_seen_at'-'telegram_status_at'-'telegram_status'-'updated_at' FROM learning_preferences p WHERE user_id=p_uid AND deleted_at IS NULL LIMIT 1) THEN RAISE EXCEPTION 'approval_stale_repreview'; END IF;
 UPDATE control_approvals SET consumed_at=now() WHERE id=p_id;
 result:=jsonb_build_object('status','running','operation',a.operations->0->>'operation','request_key',p_key,'recovery','If interrupted, re-read curriculum/source status and preview a new request; this approval is not automatically repeated.');
 INSERT INTO control_receipts(user_id,request_key,payload,result) VALUES(p_uid,p_key,jsonb_build_object('workflow_confirmation',p_id),result);
 INSERT INTO audit_events(user_id,actor,action,entity_type,detail,source) VALUES(p_uid,'agent','learning_workflow_claimed','learning',jsonb_build_object('request_key',p_key,'approval_id',p_id),'agent');
 RETURN result;
END $$;
CREATE FUNCTION public.control_finish_baseline(p_uid uuid,p_key text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE outcome jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_uid::text,713));
 IF NOT EXISTS(SELECT 1 FROM control_receipts WHERE user_id=p_uid AND request_key=p_key AND result->>'status'='running' AND result->>'operation'='finish_baseline') THEN RAISE EXCEPTION 'invalid_confirmation'; END IF;
 PERFORM set_config('career.control_key',p_key,true);
 UPDATE learning_preferences SET baseline_completed_at=coalesce(baseline_completed_at,now()),updated_at=now() WHERE user_id=p_uid AND deleted_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'preferences_unavailable'; END IF;
 outcome:=jsonb_build_object('status','completed','operation','finish_baseline','request_key',p_key);
 UPDATE control_receipts SET result=outcome WHERE user_id=p_uid AND request_key=p_key;
 RETURN outcome;
END $$;
CREATE FUNCTION public.control_finish_workflow(p_uid uuid,p_key text,p_result jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_result->>'status' NOT IN ('completed','failed') THEN RAISE EXCEPTION 'invalid_status'; END IF;
 UPDATE control_receipts SET result=p_result WHERE user_id=p_uid AND request_key=p_key AND result->>'status'='running' AND result->>'operation'='sync_guide';
 IF NOT FOUND THEN RAISE EXCEPTION 'workflow_not_claimed'; END IF;
 INSERT INTO audit_events(user_id,actor,action,entity_type,detail,source) VALUES(p_uid,'agent','learning_workflow_finished','learning',jsonb_build_object('request_key',p_key,'status',p_result->>'status'),'agent');
 RETURN p_result;
END $$;
REVOKE ALL ON FUNCTION control_prepare_workflow(uuid,text,text,text),control_claim_workflow(uuid,text,text,uuid,text),control_finish_baseline(uuid,text),control_finish_workflow(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION control_prepare_workflow(uuid,text,text,text),control_claim_workflow(uuid,text,text,uuid,text),control_finish_baseline(uuid,text),control_finish_workflow(uuid,text,jsonb) TO service_role;

CREATE FUNCTION public.control_practice_sync() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE latest public.interview_practice; n integer; lastdate date; q uuid;
BEGIN
 IF coalesce(current_setting('career.control_undo',true),'')='on' THEN RETURN NEW; END IF;
 FOR q IN SELECT DISTINCT id FROM unnest(ARRAY[NEW.question_id,CASE WHEN TG_OP='UPDATE' THEN OLD.question_id END]) id WHERE id IS NOT NULL LOOP
 SELECT count(*)::int,max((practiced_at AT TIME ZONE coalesce((SELECT timezone FROM learning_preferences WHERE user_id=NEW.user_id AND deleted_at IS NULL LIMIT 1),'Asia/Kolkata'))::date) INTO n,lastdate FROM interview_practice WHERE user_id=NEW.user_id AND question_id=q AND deleted_at IS NULL;
 SELECT * INTO latest FROM interview_practice WHERE user_id=NEW.user_id AND question_id=q AND deleted_at IS NULL ORDER BY practiced_at DESC,id DESC LIMIT 1;
 UPDATE interview_questions SET practice_count=n,last_practiced=lastdate,confidence=coalesce(latest.confidence,confidence),
 status=CASE WHEN n=0 THEN 'New' WHEN latest.confidence>=4 THEN 'Strong' ELSE 'Practiced' END,updated_at=now()
 WHERE id=q AND user_id=NEW.user_id;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER control_practice_effects AFTER INSERT OR UPDATE ON interview_practice FOR EACH ROW EXECUTE FUNCTION control_practice_sync();
CREATE FUNCTION public.control_network_sync() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c uuid;
BEGIN
 IF coalesce(current_setting('career.control_undo',true),'')='on' THEN RETURN NEW; END IF;
 FOR c IN SELECT DISTINCT id FROM unnest(ARRAY[NEW.contact_id,CASE WHEN TG_OP='UPDATE' THEN OLD.contact_id END]) id WHERE id IS NOT NULL LOOP
 UPDATE contacts SET last_interaction=(SELECT max((occurred_at AT TIME ZONE coalesce((SELECT timezone FROM learning_preferences WHERE user_id=NEW.user_id AND deleted_at IS NULL LIMIT 1),'Asia/Kolkata'))::date) FROM network_interactions WHERE contact_id=c AND user_id=NEW.user_id AND deleted_at IS NULL),
 relationship_stage=CASE WHEN relationship_stage='New' AND NEW.deleted_at IS NULL THEN 'Conversation Started' ELSE relationship_stage END,updated_at=now()
 WHERE id=c AND user_id=NEW.user_id;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER control_network_effects AFTER INSERT OR UPDATE ON network_interactions FOR EACH ROW EXECUTE FUNCTION control_network_sync();
CREATE FUNCTION public.control_application_dates() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.status='Applied' AND NEW.date_applied IS NULL THEN
  NEW.date_applied:=(now() AT TIME ZONE coalesce((SELECT timezone FROM learning_preferences WHERE user_id=NEW.user_id AND deleted_at IS NULL LIMIT 1),'Asia/Kolkata'))::date;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER control_application_effects BEFORE INSERT OR UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION control_application_dates();
CREATE FUNCTION public.control_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE k text:=current_setting('career.control_key',true); uid uuid;
BEGIN
 IF nullif(k,'') IS NULL OR TG_TABLE_NAME='activity_log' THEN RETURN NEW; END IF;
 uid:=coalesce(nullif(to_jsonb(NEW)->>'user_id','')::uuid,NEW.id);
 INSERT INTO activity_log(user_id,entity_type,entity_id,action,summary,metadata)
 VALUES(uid,TG_TABLE_NAME,NEW.id,lower(TG_OP),'Telegram '||lower(TG_OP)||': '||coalesce(to_jsonb(NEW)->>'title',to_jsonb(NEW)->>'name',to_jsonb(NEW)->>'question',TG_TABLE_NAME),jsonb_build_object('request_key',k));
 RETURN NEW;
END $$;
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT entity FROM control_registry WHERE (definition->>'writable')::boolean LOOP
  EXECUTE format('CREATE TRIGGER control_activity_log AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION control_activity()',t.entity);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION control_practice_sync(),control_network_sync(),control_application_dates(),control_activity() FROM PUBLIC,anon,authenticated;


