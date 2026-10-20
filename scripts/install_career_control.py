"""Reviewable installation for the existing Windows profile. Default is a read-only dry run."""
import argparse,hashlib,json,os,shutil,subprocess,sys
from datetime import datetime,timezone
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from urllib.parse import urlsplit
import yaml
from dotenv import dotenv_values
parser=argparse.ArgumentParser()
parser.add_argument('--apply',action='store_true')
parser.add_argument('--owner-approved',action='store_true')
parser.add_argument('--home',type=Path,default=Path(os.environ.get('HERMES_HOME',Path.home()/'AppData/Local/hermes')))
args=parser.parse_args();home=args.home.resolve();cfg_path=home/'config.yaml';before=cfg_path.read_bytes();config=yaml.safe_load(before) or {}
model=config.get('model',{})
if model.get('default')!='meta/muse-spark-1.3-contributor' or model.get('provider')!='openrouter':sys.exit('Approved model/provider differ; no changes made.')
cron=home/'cron/jobs.json';cron_digest=hashlib.sha256(cron.read_bytes()).hexdigest();jobs=json.loads(cron.read_text())
entries=jobs.get('jobs',[]) if isinstance(jobs,dict) else jobs
job=next((j for j in entries if j.get('id')=='46a628bb9ae9'),None)
if not job or job.get('enabled') is not False:sys.exit('Expected disabled learning job is not present; no changes made.')
env={**dotenv_values(home/'.env'),**os.environ};allowed=[v.strip() for v in env.get('TELEGRAM_ALLOWED_USERS','').split(',') if v.strip()]
if len(allowed)!=1 or not allowed[0].isdigit():sys.exit('A single existing Telegram owner is required; no changes made.')
origin=env.get('CAREER_OS_BASE_URL','').rstrip('/');url=urlsplit(origin);token=env.get('CAREER_OS_AGENT_TOKEN','')
if url.scheme!='https' or url.username or url.password or url.path not in ('','/') or url.query or url.fragment or len(token)<32:sys.exit('Secure Career OS connection is not configured; no changes made.')
api_ready=False
req=Request(origin+'/api/agent/control',data=b'{}',method='POST',headers={'Authorization':'Bearer '+token,'Accept':'application/json','Content-Type':'application/json','User-Agent':'CareerOS-Control-Install/1.0'})
try:
 with urlopen(req,timeout=20) as response:pass
except HTTPError as e:
 try:api_ready=e.code==400 and json.loads(e.read(4096)).get('error')=='invalid_request'
 except Exception:pass
except Exception:pass
print(json.dumps({'mode':'apply' if args.apply else 'dry_run','control_api_auth_preflight':api_ready,'telegram_toolset_before':config.get('platform_toolsets',{}).get('telegram'),'telegram_toolset_after':['career-os-control'],'approved_provider_preserved':True,'approved_model_preserved':True,'learning_job_stays_disabled':True,'cron_file_will_not_be_written':True}))
if not args.apply:sys.exit(0)
if not args.owner_approved:sys.exit('Production approval is required: --apply --owner-approved. No changes made.')
if not api_ready:sys.exit('Deploy the approved migration and control route first. No changes made.')
source=Path(__file__).resolve().parent/'hermes-career-control';destination=home/'plugins/career-os-control'
if destination.is_symlink() or destination.resolve().parent!=(home/'plugins').resolve():sys.exit('Unsafe plugin destination; no changes made.')
backup=home/'state'/('control-install-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
backup.mkdir(parents=True);shutil.copy2(cfg_path,backup/'config.yaml')
for name in ['__init__.py','plugin.yaml']:
 if (destination/name).exists():shutil.copy2(destination/name,backup/name)
binary=home/'bin/hermes.exe';runtime_env={**os.environ,'HERMES_HOME':str(home)}
def gateway(action):
 result=subprocess.run([str(binary),'gateway',action],env=runtime_env,capture_output=True,text=True,timeout=45)
 if result.returncode!=0:raise RuntimeError('Gateway '+action+' failed; inspect its protected local logs.')
try:
 gateway('stop')
 destination.mkdir(parents=True,exist_ok=True)
 for name in ['__init__.py','plugin.yaml']:shutil.copy2(source/name,destination/name)
 config.setdefault('platform_toolsets',{})['telegram']=['career-os-control']
 if config.get('plugins') is None:config['plugins']={}
 plugins=config['plugins'];enabled=plugins.get('enabled',[])
 if not isinstance(enabled,list):raise RuntimeError('Plugin enable list needs review.')
 plugins['enabled']=list(dict.fromkeys([*enabled,'career-os-control']))
 disabled=plugins.get('disabled',[])
 if 'career-os-control' in disabled:plugins['disabled']=[v for v in disabled if v!='career-os-control']
 cfg_path.write_text(yaml.safe_dump(config,sort_keys=False),encoding='utf-8')
 if hashlib.sha256(cron.read_bytes()).hexdigest()!=cron_digest:raise RuntimeError('Cron changed during installation; inspect before continuing.')
 gateway('start')
 print(json.dumps({'installed':True,'backup_directory':str(backup),'next':'Check gateway status, loaded tools, and actual owner Telegram read/fixture/write/confirmation flows. Startup does not prove end-to-end success.'}))
except Exception as e:
 shutil.copy2(backup/'config.yaml',cfg_path)
 for name in ['__init__.py','plugin.yaml']:
  if (backup/name).exists():shutil.copy2(backup/name,destination/name)
  elif (destination/name).exists():
   target=(destination/name).resolve()
   if target.parent==destination.resolve():target.unlink()
 try:gateway('start')
 except Exception:pass
 sys.exit(str(e)+' Previous configuration restored; confirm gateway status.')
