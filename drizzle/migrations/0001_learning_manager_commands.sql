alter table public.agent_commands drop constraint if exists agent_commands_command_check;
alter table public.agent_commands add constraint agent_commands_command_check check (command in ('run_now','pause','resume','refresh_preferences','reprocess_document','ping_learning_manager','send_test_telegram'));
