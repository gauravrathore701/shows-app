#!/usr/bin/env bash
# Re-encode HEVC / 10-bit episodes to browser-native H.264 so they play
# direct instead of live HLS transcode. Same filename → watch progress kept.
# Original moved to /mnt/hdd/.hevc-originals/<same path> (dot dir = hidden
# from the library). Skips files already H.264 8-bit.
# Usage: convert_h264.sh FILE...   (processed in the order given)
set -u
ROOT=/mnt/hdd
BAK=$ROOT/.hevc-originals

for f in "$@"; do
  name=$(basename "$f")
  v=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt -of csv=p=0 "$f")
  if [[ $v == "h264,yuv420p" ]]; then echo "skip (already h264) $name"; continue; fi

  tmp="$(dirname "$f")/.$name.part"
  echo "$(date +%H:%M) start $name ($v)"
  if ! nice -n 19 ionice -c3 ffmpeg -hide_banner -loglevel error -nostdin -i "$f" \
      -map 0:v:0 -map 0:a -map '0:s?' \
      -c:v libx264 -preset veryfast -crf 21 -pix_fmt yuv420p \
      -c:a copy -c:s copy -movflags +faststart -f mp4 -y "$tmp"; then
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
