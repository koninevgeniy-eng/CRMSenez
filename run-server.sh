#!/bin/bash
trap "" SIGHUP SIGTERM SIGINT
cd /home/z/my-project
while true; do
  > /home/z/my-project/dev.log
  node --max-old-space-size=512 node_modules/.bin/next start -p 3000 >> /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Server exited with code $?, restarting in 5s..." >> /home/z/my-project/dev.log
  sleep 5
done
