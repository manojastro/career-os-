"""Hermes script gate. Loads secrets only inside the Node subprocess; prints a bounded due-work hint."""
import json
import os
from pathlib import Path
import subprocess

def main():
    home = Path(os.environ.get("HERMES_HOME", Path.home() / "AppData/Local/hermes"))
    client = home / "skills/career-os-learning/client.mjs"
    # Node's env-file parser handles quoted secret values without copying them into an agent prompt.
    node = os.environ.get("CAREER_OS_NODE_PATH", "C:/Program Files/nodejs/node.exe")
    result = subprocess.run([node, "--env-file=" + str(home / ".env"), str(client), "pulse"],
                            capture_output=True, timeout=40, text=True)
    if result.returncode:
        print(json.dumps({"wakeAgent": False, "reason": "learning_connection_unavailable"}))
        return
    pulse = json.loads(result.stdout)
    due = pulse.get("due_jobs", [])
    commands = pulse.get("pending_commands", [])
    if not due and not commands:
        print(json.dumps({"wakeAgent": False}))
    else:
        print(json.dumps({"wakeAgent": True, "due_jobs": due, "pending_commands": commands,
                          "timezone": pulse.get("timezone", "Asia/Kolkata")}))

if __name__ == "__main__":
    try:
        main()
    except Exception:
        print(json.dumps({"wakeAgent": False, "reason": "learning_connection_unavailable"}))
