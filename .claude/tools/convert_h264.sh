#!/usr/bin/env bash
# Re-encode HEVC / 10-bit episodes to browser-native H.264 so they play
# direct instead of live HLS transcode. Same filename → watch progress kept.
# Original moved to /mnt/hdd/.hevc-originals/<same path> (dot dir = hidden
# from the library). Skips files already H.264 8-bit.
# Usage: convert_h264.sh FILE...   (processed in the order given)
# Run capped, or live HLS starves (nice does not cross systemd slices):
#   systemd-run --user -p CPUQuota=120% --unit=NAME convert_h264.sh FILE...
# PC=GAURAV@192.168.50.2 → ship each file to the Nitro, encode there, pull back
# (Pi only verifies + swaps; no cap needed).
set -u
ROOT=/mnt/hdd
BAK=$ROOT/.hevc-originals
PC=${PC:-}
KEY=(-i /home/gaurav/.ssh/id_nitro -o BatchMode=yes -o ConnectTimeout=15)
ARGS='-map 0:v:0 -map 0:a -map 0:s? -c:v libx264 -preset veryfast -crf 21 -pix_fmt yuv420p -c:a copy -c:s copy -movflags +faststart -f mp4'

encode() {  # $1 src  $2 out
  if [[ -z $PC ]]; then
    nice -n 19 ionice -c3 ffmpeg -hide_banner -loglevel error -nostdin -i "$1" $ARGS -y "$2"
    return
  fi
  /home/gaurav/Projects/daily-script/wol_pc.sh >/dev/null &&
  scp -q "${KEY[@]}" "$1" "$PC:D:/render/h264/in.mp4" &&
  ssh "${KEY[@]}" "$PC" "ffmpeg -hide_banner -loglevel error -nostdin -i D:/render/h264/in.mp4 $ARGS -y D:/render/h264/out.mp4" &&
  scp -q "${KEY[@]}" "$PC:D:/render/h264/out.mp4" "$2"
}

for f in "$@"; do
  name=$(basename "$f")
  v=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt -of csv=p=0 "$f")
  if [[ $v == "h264,yuv420p" ]]; then echo "skip (already h264) $name"; continue; fi

  tmp="$(dirname "$f")/.$name.part"
  echo "$(date +%H:%M) start $name ($v)"
  if ! encode "$f" "$tmp"; then
    echo "FAIL encode $name"; rm -f "$tmp"; continue
  fi

  # refuse to swap unless the new file is (near) full length
  d0=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  d1=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$tmp")
  if ! awk -v a="$d0" -v b="$d1" 'BEGIN{exit !(b>0 && (a-b)<2 && (b-a)<2)}'; then
    echo "FAIL duration $name ($d0 vs $d1)"; rm -f "$tmp"; continue
  fi

  dest="$BAK/${f#$ROOT/}"
  mkdir -p "$(dirname "$dest")" && mv -n "$f" "$dest" && mv "$tmp" "$f" \
    && echo "$(date +%H:%M) done $name — original at $dest" \
    || echo "FAIL swap $name (check $tmp / $dest)"
done
echo "$(date +%H:%M) queue finished"
