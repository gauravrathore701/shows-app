#!/usr/bin/env bash
# One-off: wait for Good Will Hunting in library-h264-batch1b, stop the queue there, post result to Discord.
U=library-h264-batch1b; F="/mnt/hdd/Good Will Hunting (1997)/Good Will Hunting (1997).mkv"
until r=$(journalctl --user -u $U --no-pager -o cat | grep -E "(done|FAIL [a-z]+) Good Will Hunting" | tail -1) && [[ -n $r ]]; do
  systemctl --user is-active -q $U || { r="queue unit stopped before GWH finished"; break; }
  sleep 30
done
systemctl --user stop $U   # Gaurav: no batches, GWH only
info=$(ffprobe -v error -show_entries stream=codec_type,codec_name:format=duration -of csv=p=0 "$F" 2>&1 | tr '\n' ' ')
msg="**Good Will Hunting conversion finished** ($(date +%H:%M))
$r
\`$info\`
Queue stopped, batch 1 not run."
set -a; . /home/gaurav/Projects/discord-claude-bot/.env; set +a
curl -s -o /dev/null -w '%{http_code}\n' -X POST "https://discord.com/api/v10/channels/$DISCORD_CHANNEL_ID/messages" \
  -H "Authorization: Bot $DISCORD_TOKEN" -H "User-Agent: ClaudyRex (local, 1.0)" -H "Content-Type: application/json" \
  -d "$(python3 -c 'import json,sys;print(json.dumps({"content":sys.argv[1]}))' "$msg")"
