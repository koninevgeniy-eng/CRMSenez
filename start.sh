#!/bin/bash
cd /home/z/my-project
exec node node_modules/.bin/next start -p 3000 >> /home/z/my-project/dev.log 2>&1
