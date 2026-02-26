"""Run this script to kill all old server processes and start fresh."""
import subprocess
import sys
import time
import os

print("Finding processes on port 8000...")
result = subprocess.run(
    'netstat -ano | findstr :8000',
    shell=True, capture_output=True, text=True
)

pids = set()
for line in result.stdout.splitlines():
    parts = line.strip().split()
    if parts:
        try:
            pids.add(int(parts[-1]))
        except ValueError:
            pass

if pids:
    print(f"Killing PIDs: {pids}")
    for pid in pids:
        subprocess.run(f'taskkill /PID {pid} /F', shell=True, capture_output=True)
    print("Killed. Waiting 2 seconds...")
    time.sleep(2)
else:
    print("No processes found on port 8000")

print("Starting uvicorn...")
os.chdir(os.path.dirname(os.path.abspath(__file__)))
subprocess.run([sys.executable, '-m', 'uvicorn', 'main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'])
