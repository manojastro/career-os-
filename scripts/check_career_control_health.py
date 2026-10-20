"""Read-only health checks and tiny approved-model fixture inference. Never prints credentials."""
import json,os,hashlib,sys
import argparse
parser=argparse.ArgumentParser(description='Read-only health; optional paid synthetic inference fixture.')
parser.add_argument('--inference',action='store_true',help='Run the explicitly approved small model/tool-call fixture.')
args=parser.parse_args()
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from dotenv import dotenv_values,load_dotenv
import yaml
home=Path(os.environ.get('HERMES_HOME',Path.home()/'AppData/Local/hermes'))
values={**dotenv_values(home/'.env'),**os.environ}
os.environ['HERMES_HOME']=str(home)
load_dotenv(home/'.env',override=False)
sys.path.insert(0,str(home/'hermes-agent'))
config=yaml.safe_load((home/'config.yaml').read_text()) or {}
result={'model':config.get('model',{}).get('default'),'provider':config.get('model',{}).get('provider')}
def call(url,method='GET',body=None,token=None):
 headers={'Content-Type':'application/json','Accept':'application/json','User-Agent':'CareerOS-Control-Health/1.0'}
 if token:headers['Authorization']='Bearer '+token
 try:
  with urlopen(Request(url,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method),timeout=30) as resp:
   return resp.status,json.loads(resp.read())
 except HTTPError as e:
  try:return e.code,json.loads(e.read(4096))
  except Exception:return e.code,{'non_json':True}
 except Exception:return 'unavailable',{}
token=values.get('TELEGRAM_BOT_TOKEN')
if token:
 code,data=call('https://api.telegram.org/bot'+token+'/getMe');result['telegram_getMe']={'http':code,'ok':data.get('ok',False),'is_bot':data.get('result',{}).get('is_bot',False)}
else:result['telegram_getMe']={'configured':False}
origin=values.get('CAREER_OS_BASE_URL','').rstrip('/')
agent=values.get('CAREER_OS_AGENT_TOKEN')
if origin and agent:
 code,data=call(origin+'/api/agent/context?sections=projects&limit=1',token=agent);result['existing_api']={'http':code,'authenticated':code==200,'non_json':data.get('non_json',False),'error_code':data.get('error') if isinstance(data.get('error'),str) and len(data.get('error'))<100 else None}
 code,data=call(origin+'/api/agent/control','POST',{},token=agent);result['new_control_api']={'http':code,'verified_route':data.get('error') in ('invalid_request','telegram_sender_or_chat_rejected'),'non_json':data.get('non_json',False)}
try:
 from hermes_cli.runtime_provider import resolve_runtime_provider
 runtime=resolve_runtime_provider(requested='openrouter',target_model='meta/muse-spark-1.3-contributor')
 key=runtime.get('api_key')
 result['credential_source']=runtime.get('source','runtime')
except Exception:key=None
model='meta/muse-spark-1.3-contributor'
if args.inference and key and result['model']==model and result['provider']=='openrouter':
 body={'model':model,'messages':[{'role':'system','content':'Use the provided fixture_echo tool to return the test result. Do not answer in prose.'},{'role':'user','content':'Controlled connectivity fixture. Call fixture_echo with value 42. No private account data is involved.'}],'tools':[{'type':'function','function':{'name':'fixture_echo','description':'Return a fixed test value','parameters':{'type':'object','properties':{'value':{'type':'integer'}},'required':['value'],'additionalProperties':False}}}],'tool_choice':'auto','max_tokens':2048,'reasoning':{'effort':'low'}}
 code,data=call('https://openrouter.ai/api/v1/chat/completions','POST',body,key)
 choice=(data.get('choices') or [{}])[0];calls=choice.get('message',{}).get('tool_calls') or []
 valid=False
 for c in calls:
  try:valid|=c.get('function',{}).get('name')=='fixture_echo' and json.loads(c['function']['arguments']).get('value')==42
  except Exception:pass
 error=data.get('error',{})
 msg=error.get('message','') if isinstance(error,dict) else str(error)
 raw=error.get('metadata',{}).get('raw','') if isinstance(error,dict) else ''
 if isinstance(raw,str):
  try:
   details=json.loads(raw);raw=details.get('error',{}).get('message','') if isinstance(details.get('error'),dict) else details.get('message','')
  except Exception:raw=raw[:400]
 msg+=' '+str(raw)[:400]
 for secret in [key,agent,token]:
  if secret:msg=msg.replace(secret,'[redacted]')
 result['openrouter_fixture']={'http':code,'inference':code==200,'tool_call':valid,'finish_reason':choice.get('finish_reason'),'tokens':data.get('usage',{}).get('total_tokens'),'error':msg.strip()[:400]}
 code,catalog=call('https://openrouter.ai/api/v1/models')
 matches=[m for m in catalog.get('data',[]) if m.get('id')==model]
 result['approved_model_catalog']={'http':code,'present':bool(matches),'tool_parameters':matches[0].get('supported_parameters',[]) if matches else []}
else:result['openrouter_fixture']={'configured':bool(key),'run':False}
jobs_path=home/'cron/jobs.json'
jobs=json.loads(jobs_path.read_text())
entries=jobs.get('jobs',[]) if isinstance(jobs,dict) else jobs
target=next((j for j in entries if j.get('id')=='46a628bb9ae9'),None)
result['learning_job']={'present':target is not None,'enabled':target.get('enabled') if target else None,'schedule_digest':hashlib.sha256(json.dumps(target.get('schedule'),sort_keys=True).encode()).hexdigest() if target else None,'model':target.get('model') if target else None}
print(json.dumps(result))
