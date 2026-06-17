#!/bin/bash
cd /home/z/my-project
# Reset log
> /home/z/my-project/dev.log
exec node --max-old-space-size=512 node_modules/.bin/next start -p 3000
