import importlib.util,json,os,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
MODULE=Path(__file__).parent/"hermes-career-control"/"__init__.py"
spec=importlib.util.spec_from_file_location("career_control",MODULE);plugin=importlib.util.module_from_spec(spec);spec.loader.exec_module(plugin)
class BoundaryTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory()
  self.env=patch.dict(os.environ,{"HERMES_HOME":self.temp.name,"TELEGRAM_ALLOWED_USERS":"123","CAREER_OS_BASE_URL":"https://career-os-manoj.lovable.app","CAREER_OS_AGENT_TOKEN":"x"*64});self.env.start()
 def tearDown(self):self.env.stop();self.temp.cleanup()
 def event(self,sender="123",chat="123",kind="dm",text="Show my projects",media=None,message="42"):
  return SimpleNamespace(source=SimpleNamespace(platform=SimpleNamespace(value="telegram"),user_id=sender,chat_id=chat,chat_type=kind,is_bot=False),message_id=message,internal=False,raw_message=SimpleNamespace(text=text,caption=None),text=text,media_urls=media or [],allow_gateway_control=True)
 def context(self):
  return patch.object(plugin,"get_session_env",side_effect=lambda k,d="":{"HERMES_SESSION_PLATFORM":"telegram","HERMES_SESSION_USER_ID":"123","HERMES_SESSION_CHAT_ID":"123","HERMES_SESSION_CHAT_TYPE":"dm","HERMES_SESSION_MESSAGE_ID":"42"}.get(k,d))
 def test_actual_reply_metadata_is_captured_at_ingress(self):
  with patch.object(plugin,"request",return_value={"status":"ready"}) as req:
   event=self.event(text="done");event.raw_message.reply_to_message=SimpleNamespace(message_id=40)
   plugin.ingress(event=event)
   self.assertEqual(req.call_args.args[2]["reply_to_message_ref"],"40")
 def test_sender_and_chat_authorization(self):
  with patch.object(plugin,"request") as req:
   for e in [self.event(sender="456"),self.event(chat="-99",kind="group"),self.event(chat="456")]:self.assertEqual(plugin.ingress(event=e)["action"],"skip")
   req.assert_not_called()
 def test_identity_is_not_a_model_argument(self):
  with patch.object(plugin,"request",return_value={"status":"ready"}) as req,self.context():
   plugin.ingress(event=self.event());result=json.loads(plugin.handler("query",{"entity":"projects","identity":{"sender":"456"}}))
   self.assertEqual(req.call_args.args[0]["sender"],"123")
   self.assertEqual(result["status"],"ready")
 def test_requires_real_ingress_and_recovers_after_module_restart(self):
  with self.context():
   self.assertIn("expired",json.loads(plugin.handler("query",{"entity":"tasks"}))["error"])
   with patch.object(plugin,"request",return_value={"status":"ready"}):plugin.ingress(event=self.event())
   reload_spec=importlib.util.spec_from_file_location('career_control_reloaded',MODULE)
   reloaded=importlib.util.module_from_spec(reload_spec);reload_spec.loader.exec_module(reloaded)
   with patch.object(reloaded,'get_session_env',side_effect=plugin.get_session_env):self.assertEqual(reloaded.identity()["message"],"42")
 def test_confirmation_requires_exact_raw_human_text(self):
  token="00000000-0000-4000-8000-000000000001"
  with patch.object(plugin,"request",return_value={"status":"ready"}) as req:
   e=self.event(text="Explain this document",media=["/tmp/file"])
   e.text="confirm "+token
   plugin.ingress(event=e)
   self.assertEqual(req.call_count,1)
   self.assertEqual(req.call_args.args[1],"begin")
   req.reset_mock()
   plugin.ingress(event=self.event(text="confirm "+token,message="43"))
   self.assertEqual(req.call_count,2);self.assertEqual(req.call_args.args[1],"confirm")
 def test_blocks_shell_and_arbitrary_file_path(self):
  with self.context():
   self.assertEqual(plugin.guard(tool_name="terminal")["action"],"block")
   self.assertIsNone(plugin.guard(tool_name="career_query"))
   with patch.object(plugin,"request",return_value={"status":"ready"}):plugin.ingress(event=self.event())
   self.assertIn("Attachment",json.loads(plugin.handler("upload",{"path":"C:/private/.env","title":"Bad"}))["error"])
 def test_no_redirect_or_unsafe_origin(self):
  with self.assertRaises(ValueError):plugin.NoRedirect().redirect_request(None,None,302,None,None,"https://evil.test")
  with patch.dict(os.environ,{"CAREER_OS_BASE_URL":"http://evil.test"}):
   with self.assertRaises(ValueError):plugin.request({},"query",{})
 def test_all_tools_registered_with_a_constrained_toolset(self):
  class Ctx:
   def __init__(self):self.tools=[];self.hooks=[]
   def register_tool(self,**kw):self.tools.append(kw)
   def register_hook(self,n,fn):self.hooks.append(n)
   def register_system_prompt_section(self,*a,**kw):pass
  c=Ctx();plugin.register(c);self.assertEqual(len(c.tools),15);self.assertTrue(all(t["toolset"]=="career-os-control" for t in c.tools));self.assertIn("pre_tool_call",c.hooks)
 def test_api_failure_does_not_fabricate_completion(self):
  with patch.object(plugin,"request",return_value={"error":"not_deployed","http_status":404}):
   self.assertIn("no changes were made",plugin.ingress(event=self.event())["text"])
 def test_duplicate_transport_message_never_starts_another_model_turn(self):
  with patch.object(plugin,'request',return_value={'status':'ready'}):
   self.assertIsNone(plugin.ingress(event=self.event()))
   self.assertEqual(plugin.ingress(event=self.event())['action'],'skip')
   with plugin._db() as db:db.execute('DELETE FROM inbound')
   self.assertEqual(plugin.ingress(event=self.event())['reason'],'duplicate_career_message_already_received')
 def test_real_installed_sdk_loads_tools_hooks_and_prompt_in_isolated_profile(self):
  self.assertLessEqual(len(plugin.PROMPT),4000)
  from hermes_cli.plugins import PluginManager,parse_manifest_file
  from tools.registry import registry
  manifest=parse_manifest_file(MODULE.parent/'plugin.yaml',MODULE.parent,'user','')
  self.assertIsNotNone(manifest)
  manager=PluginManager(scope_key=self.temp.name)
  try:
   manager._load_plugin(manifest)
   loaded=manager.list_plugins()[0]
   self.assertTrue(loaded['enabled'],loaded.get('error'))
   for action in plugin.ACTIONS:self.assertIsNotNone(registry.get_entry('career_'+action,scope=self.temp.name))
   self.assertIn('pre_gateway_dispatch',manager._hooks)
   self.assertIn('pre_tool_call',manager._hooks)
   self.assertIn('career-os.control',manager._system_prompt_sections)
  finally:manager.unload()
if __name__=="__main__":unittest.main()
