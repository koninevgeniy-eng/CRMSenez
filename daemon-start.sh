#!/bin/bash
# Double-fork to fully detach from the terminal
(
  cd /home/z/my-project
  while true; do
    > /home/z/my-project/dev.log
    node --max-old-space-size=512 node_modules/.bin/next start -p 3000 >> /home/z/my-project/dev.log 2>&1
    echo "[$(date)] Server exited, restarting in 3s..." >> /home/z/my-project/dev.log
    sleep 3
  done
) &
# Exit the parent immediately
exit 0
