#!/usr/bin/env bash
# Run convert_h264.sh over a queue file (one path per line), after an optional unit finishes.
# Usage: run_queue.sh QUEUE_FILE [WAIT_FOR_UNIT]   (set PC= to encode on the Nitro)
[[ -n ${2:-} ]] && while systemctl --user is-active -q "$2"; do sleep 60; done
mapfile -t F < "$1"
exec "$(dirname "$0")/convert_h264.sh" "${F[@]}"
