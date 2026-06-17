#!/bin/bash
cd /home/z/my-project
exec node --max-old-space-size=512 node_modules/.bin/next start -p 3000
