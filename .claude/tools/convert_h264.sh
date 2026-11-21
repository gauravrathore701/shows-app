#!/usr/bin/env bash
# Make episodes direct-play on the weakest client (Poco X4 Pro, Chrome Android;
# tested 2026-10-20 with codec-poc): it decodes H.264 8-bit, HEVC 8-bit, AV1
# and AAC/MP3/Opus, but NOT HEVC 10-bit (0 frames) or EAC3/AC3 (silent).
# HEVC 10-bit → re-encode to H.264; bad audio only → audio-only re-encode
# (video copied). Same filename → watch progress kept. Original moved to
# /mnt/hdd/.hevc-originals/<same path> (dot dir = hidden from the library).
# Usage: convert_h264.sh FILE...   (processed in the order given)
# Run capped, or live HLS starves (nice does not cross systemd slices):
#   systemd-run --user -p CPUQuota=120% --unit=NAME convert_h264.sh FILE...
# PC=GAURAV@192.168.1.29 (WiFi; cable parks at 10 Mb/s) → ship each file to the Nitro, encode there, pull back
# (Pi only verifies + swaps; no cap needed).
set -u
ROOT=/mnt/hdd
BAK=$ROOT/.hevc-originals
PC=${PC:-}
# HostKeyAlias: same Nitro host key whether reached by cable or WiFi IP
KEY=(-i /home/gaurav/.ssh/id_nitro -o BatchMode=yes -o ConnectTimeout=15 -o ServerAliveInterval=30 -o HostKeyAlias=192.168.50.2)
RD='D:/Claudy Rex Work Directory/render/h264'   # Nitro work dir (all Claude files live under that folder)
VENC='-c:v libx264 -preset veryfast -crf 21 -pix_fmt yuv420p'
AENC='-c:a aac -ac 2 -b:a 192k'   # Opus/AC3/EAC3/DTS → stereo AAC (browsers + phones)

encode() {  # $1 src  $2 out   (uses per-file $ARGS; with PC set every job runs on the Nitro)
  if [[ -z $PC ]]; then
    nice -n 19 ionice -c3 ffmpeg -hide_banner -loglevel error -nostdin -i "$1" $ARGS -y "$2"
    return
  fi
  /home/gaurav/Projects/daily-script/bash/wol_pc.sh >/dev/null &&
  scp -q "${KEY[@]}" "$1" "$PC:$RD/in.mp4" &&
  ssh "${KEY[@]}" "$PC" "ffmpeg -hide_banner -loglevel error -nostdin -i \"$RD/in.mp4\" $ARGS -y \"$RD/out.mp4\"" &&
  scp -q "${KEY[@]}" "$PC:$RD/out.mp4" "$2"
}

fails=0
for f in "$@"; do
  name=$(basename "$f")
  v=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt -of csv=p=0 "$f")
  # every audio track, not just a:0 (Ben Gen 10: a:0 aac but eng = ac3 → silent when picked)
  a=$(ffprobe -v error -select_streams a -show_entries stream=codec_name -of csv=p=0 "$f" | sort -u | tr '\n' ' '); a=${a% }
  s=$(ffprobe -v error -select_streams s -show_entries stream=codec_name -of csv=p=0 "$f" | sort -u | tr '\n' ' ')
  vok=0; [[ $v == h264,yuv420p || $v == hevc,yuv420p || $v == av1,* ]] && vok=1
  aok=0; [[ -z $(tr ' ' '\n' <<<"$a" | grep -vxE '(aac|mp3|opus)?') ]] && aok=1
  if (( vok && aok )); then echo "skip (already direct-play) $name"; continue; fi
  # originals are kept, so every file needs room for its copy; stop the queue before the HDD fills
  free=$(df --output=avail -B1 "$ROOT" | tail -1); need=$(( $(stat -c %s "$f") * 3 / 2 + 20 * 1024**3 ))
  if (( free < need )); then echo "$(date +%H:%M) STOP low disk ($((free / 1024**3))G free) at $name"; break; fi
  ARGS="-map 0:v:0 -map 0:a? $( ((vok)) && echo '-c:v copy' || echo "$VENC")$([[ $v == hevc,* ]] && ((vok)) && echo ' -tag:v hvc1') $( ((aok)) && echo '-c:a copy' || echo "$AENC")"
  # MP4 holds text subs only as mov_text; image subs (PGS/VobSub) can't go in → dropped.
  # Per stream (2026-11-17): Bebop 01/17/24 = 3 ASS + 1 PGS; all-or-nothing dropped the ASS too.
  tsub=(); tabs=(); i=0   # tsub = s:N index, tabs = absolute stream index (for packet filter)
  while IFS=, read -r idx codec; do
    [[ $codec =~ ^(subrip|ass|ssa|mov_text|webvtt|text)$ ]] && { tsub+=($i); tabs+=($idx); }
    ((i++))
  done < <(ffprobe -v error -select_streams s -show_entries stream=index,codec_name -of csv=p=0 "$f")
  smap=''; for i in "${tsub[@]}"; do smap+=" -map 0:s:$i"; done
  (( ${#tsub[@]} )) && ARGS+="$smap -c:s mov_text"
  ARGS+=' -movflags +faststart -f mp4'
  v="$v a=${a:-none} s=${s:-none}"

  tmp="$(dirname "$f")/.$name.part"
  echo "$(date +%H:%M) start $name ($v)"
  # mov_text caps one subtitle event at 64 KB; ASS typesetting drawings can exceed it
  # (Dororo ep13: 71 KB) → ffmpeg "Result too large". Drop only those events on a
  # stream-copied temp; the app strips vector drawings anyway, so nothing visible lost.
  src=$f; clean="$(dirname "$f")/.$name.subfix.mkv"
  # size check on text sub packets only (PGS packets are big but never reach mov_text)
  if [[ $ARGS == *mov_text* ]] && (( $(ffprobe -v error -select_streams s -show_entries packet=stream_index,size -of csv=p=0 "$f" |
       awk -F, -v ok=" ${tabs[*]} " 'index(ok, " " $1 " ") {print $2}' | sort -n | tail -1) > 60000 )); then
    n=${#tsub[@]}
    in=(); map=()
    for ((k = 0; k < n; k++)); do
      i=${tsub[k]}
      ffmpeg -hide_banner -loglevel error -nostdin -i "$f" -map 0:s:$i -c copy -y "$clean.$k.ass" &&
        awk 'length($0) < 60000' "$clean.$k.ass" > "$clean.$k.small.ass"
      in+=(-i "$clean.$k.small.ass"); map+=(-map $((k + 1)):0 -map_metadata:s:s:$k 0:s:s:$i)
    done
    # temp holds only the text subs, renumbered s:0..n-1 → remap
    ffmpeg -hide_banner -loglevel error -nostdin -i "$f" "${in[@]}" -map 0:v -map 0:a? "${map[@]}" -c copy -y "$clean" &&
      src=$clean && ARGS=${ARGS/"$smap"/$(for ((k = 0; k < n; k++)); do printf ' -map 0:s:%d' $k; done)} &&
      echo "  subs: dropped ASS events >60 KB"
    for ((k = 0; k < n; k++)); do rm -f "$clean.$k.ass" "$clean.$k.small.ass"; done
  fi
  if ! encode "$src" "$tmp"; then
    echo "FAIL encode $name"; rm -f "$tmp" "$clean"
    # 3 in a row = PC gone/asleep or work dir locked; stop instead of burning the queue
    (( ++fails >= 3 )) && { echo "$(date +%H:%M) STOP 3 encode fails in a row"; break; }
    continue
  fi
  fails=0; rm -f "$clean"

  # refuse to swap unless the new file is (near) full length
  # source length = video end, not container: AT S05E03 mkv says 702 s from a trailing PGS sub, v+a end 693.5
  d0=$(ffprobe -v error -select_streams v:0 -show_entries packet=pts_time -of csv=p=0 "$f" | sort -n | tail -1)
  # new file = video end too: Oppenheimer 2026-11-20 video stopped at 4202 s, audio ran 10822 → container said full length
  d1=$(ffprobe -v error -select_streams v:0 -show_entries packet=pts_time -of csv=p=0 "$tmp" | sort -n | tail -1)
  if ! awk -v a="$d0" -v b="$d1" 'BEGIN{exit !(b>0 && (a-b)<2 && (b-a)<2)}'; then
    echo "FAIL duration $name ($d0 vs $d1)"; rm -f "$tmp"; continue
  fi
  # container length alone missed GWH 2026-10-20: video 2h06m, audio cut at 1h18m → check the audio track too
  if [[ -n $a ]]; then
    # every track, not a:0: Puss in Boots 2026-11-20 a:1 (eng) stopped at 2853 of 6141 s on the Nitro
    abad=''
    for ((k = 0; k < $(wc -w <<<"$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$tmp")"); k++)); do
      a1=$(ffprobe -v error -select_streams a:$k -show_entries packet=pts_time -of csv=p=0 "$tmp" | sort -n | tail -1)
      awk -v a="$d0" -v b="$a1" 'BEGIN{exit !(b>0 && (a-b)<5)}' || abad+=" a:$k=${a1}s"
    done
    if [[ -n $abad ]]; then
      echo "FAIL audio $name (of ${d0}s:$abad)"; rm -f "$tmp"; continue
    fi
  fi

  dest="$BAK/${f#$ROOT/}"
  # chmod: scp from Windows lands as -rw----r-x
  mkdir -p "$(dirname "$dest")" && mv -n "$f" "$dest" && mv "$tmp" "$f" && chmod 644 "$f" \
    && echo "$(date +%H:%M) done $name — original at $dest" \
    || echo "FAIL swap $name (check $tmp / $dest)"
done
echo "$(date +%H:%M) queue finished"
