#!/usr/bin/env bash
# Re-encode the 56 HEVC-10bit anime episodes (Your Lie in April, Anohana, Given,
# Given The Movie, The Promised Neverland) to browser-friendly H.264 MKV on the
# Nitro, keeping Japanese + English audio and every ASS subtitle track.
# Encodes straight from the ORIGINALS on the PC (E:\Anime\...), pulls the result
# back, verifies, then swaps it in under the SAME filename (watch progress kept).
# Library original -> /mnt/hdd/Copy To Pi/anime_orig/<Show>/<name> (backup, never deleted).
#
# Manifest: anime_h264_manifest.txt   "PC path|Pi path" per line
# State:    anime_h264_done.txt       Pi paths already swapped (skip on rerun)
# Log:      anime_h264_batch.log
# Usage:    anime_h264_batch.sh [FILTER]   FILTER = substring of the Pi path (optional)
# Detached: systemd-run --user --unit=anime-h264 --property=Restart=on-failure \
#             --property=RestartSec=60 <this script>
#
# Output contract (the player's audio/sub switching depends on it):
#   v: libx264 veryfast crf21 yuv420p
#   a: Japanese first + default, then English dub; commentary dropped; aac 2ch 192k
#   s: every ASS track copied, titled, full English dialogue default, signs not default
#   t: font attachments copied
set -u
TOOLS=$(cd "$(dirname "$0")" && pwd)
MAN=$TOOLS/anime_h264_manifest.txt
DONE=$TOOLS/anime_h264_done.txt
LOG=$TOOLS/anime_h264_batch.log
TMP="/mnt/hdd/Copy To Pi/anime_h264_tmp"
BAK="/mnt/hdd/Copy To Pi/anime_orig"
KEY=(-i /home/gaurav/.ssh/id_nitro -o BatchMode=yes -o ConnectTimeout=15
     -o ServerAliveInterval=30 -o ServerAliveCountMax=4 -o HostKeyAlias=192.168.50.2)
RD='D:\Claudy Rex Work Directory\render\anime'
RDS='D:/Claudy Rex Work Directory/render/anime'
FILTER=${1:-}

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"; }
touch "$DONE"

exec 9>"$TOOLS/.anime_h264.lock"
flock -n 9 || { log "another instance holds the lock - exiting"; exit 0; }

PCHOST=""
pc_up() {  # wake if needed, pick cable or WiFi; returns 1 if unreachable, 2 if powered off
  if [[ $(cat /sys/class/net/eth0/carrier 2>/dev/null) == 0 ]]; then
    timeout 5 bash -c 'echo >/dev/tcp/192.168.1.22/22' 2>/dev/null && { PCHOST=GAURAV@192.168.1.22; return 0; }
    return 2
  fi
  timeout 120 /home/gaurav/Projects/daily-script/wol_pc.sh >/dev/null 2>&1 < /dev/null
  for h in 192.168.50.2 192.168.1.22; do
    if ssh -n "${KEY[@]}" GAURAV@$h 'echo ok' 2>/dev/null | grep -q ok; then PCHOST=GAURAV@$h; return 0; fi
  done
  return 1
}

pcps() {  # run a local .ps1 on the PC via -EncodedCommand; $1 = file, $2 = timeout s
  local enc; enc=$(iconv -f UTF-8 -t UTF-16LE "$1" | base64 -w0)
  timeout "$2" ssh -n "${KEY[@]}" "$PCHOST" "powershell -NoProfile -EncodedCommand $enc" 2>&1 \
    | grep -viE 'clixml|<Objs|progress'
  return "${PIPESTATUS[0]}"
}

psq() { printf "'%s'" "${1//\'/\'\'}"; }   # PowerShell single-quoted literal

# Per-file mapping. Built from ffprobe of the Pi copy (same content as the PC original,
# durations verified identical 2026-10-25). Sets MAPARGS (array) + EXP_A / EXP_S.
plan() {
  local f=$1 show=$2 i lang title ja=-1 en=-1
  local n
  n=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$f" | wc -l)
  for ((i=0; i<n; i++)); do
    lang=$(ffprobe -v error -select_streams a:$i -show_entries stream_tags=language -of csv=p=0 "$f")
    title=$(ffprobe -v error -select_streams a:$i -show_entries stream_tags=title -of csv=p=0 "$f")
    [[ $title == *[Cc]ommentary* ]] && continue
    [[ $lang == jpn && $ja -lt 0 ]] && ja=$i
    [[ $lang == eng && $en -lt 0 ]] && en=$i
  done
  (( ja < 0 )) && { echo "no japanese audio"; return 1; }
  MAPARGS=(-map 0:v:0 -map "0:a:$ja")
  (( en >= 0 )) && MAPARGS+=(-map "0:a:$en")
  MAPARGS+=(-map '0:s?' -map '0:t?'
    -c:v libx264 -preset veryfast -crf 21 -pix_fmt yuv420p
    -c:a aac -ac 2 -b:a 192k -c:s copy -c:t copy
    -metadata:s:v:0 title= -disposition:v:0 default
    -metadata:s:a:0 language=jpn -metadata:s:a:0 title=Japanese -disposition:a:0 default)
  EXP_A=jpn
  if (( en >= 0 )); then
    MAPARGS+=(-metadata:s:a:1 language=eng -metadata:s:a:1 title=English -disposition:a:1 0)
    EXP_A=jpn,eng
  fi
  # subtitles: "lang:title:default" per output sub index
  local -a subs
  case $show in
    "Your Lie in April") subs=("eng:English (Signs/Songs):0" "eng:English (Full):1") ;;  # s1 tagged jpn, text is English
    "Anohana")           subs=("eng:English (Signs/Songs):0" "eng:English (Full):1") ;;  # s1 tagged jpn, text is English
    "The Promised Neverland") subs=("eng:English (Signs/Songs):0" "eng:English:1" "spa:Spanish:0" "por:Portuguese:0") ;;
    "Given"|"Given The Movie (2020)") subs=("eng:English:1") ;;
    *) echo "unknown show $show"; return 1 ;;
  esac
  EXP_S=$(ffprobe -v error -select_streams s -show_entries stream=codec_name -of csv=p=0 "$f" \
          | grep -cxE 'ass|ssa|subrip|webvtt|mov_text|text')
  (( EXP_S == ${#subs[@]} )) || { echo "sub count $EXP_S != plan ${#subs[@]}"; return 1; }
  for ((i=0; i<${#subs[@]}; i++)); do
    IFS=: read -r lang title d <<<"${subs[i]}"
    MAPARGS+=(-metadata:s:s:$i "language=$lang" -metadata:s:s:$i "title=$title")
    (( d )) && MAPARGS+=(-disposition:s:$i default) || MAPARGS+=(-disposition:s:$i 0)
  done
}

verify() {  # $1 original  $2 new  -> echo reason on failure
  local o=$1 n=$2 d0 d1 v a sc vc a1
  d0=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$o")
  d1=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$n")
  awk -v a="$d0" -v b="$d1" 'BEGIN{exit !(b>0 && (a-b)<=1 && (b-a)<=1)}' || { echo "duration $d0 vs $d1"; return 1; }
  vc=$(ffprobe -v error -select_streams v -show_entries stream=codec_name -of csv=p=0 "$n" | wc -l)
  v=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt -of csv=p=0 "$n")
  [[ $v == h264,yuv420p && $vc == 1 ]] || { echo "video $v x$vc"; return 1; }
  a=$(ffprobe -v error -select_streams a -show_entries stream=codec_name:stream_tags=language -of csv=p=0 "$n" | tr '\n' ' ')
  local want="aac,jpn "; [[ $EXP_A == jpn,eng ]] && want="aac,jpn aac,eng "
  [[ $a == "$want" ]] || { echo "audio '$a' want '$want'"; return 1; }
  [[ $(ffprobe -v error -select_streams a:0 -show_entries stream_disposition=default -of csv=p=0 "$n") == 1 ]] \
    || { echo "a:0 not default"; return 1; }
  sc=$(ffprobe -v error -select_streams s -show_entries stream=codec_name -of csv=p=0 "$n" | wc -l)
  (( sc == EXP_S )) || { echo "subs $sc want $EXP_S"; return 1; }
  a1=$(ffprobe -v error -select_streams a:0 -show_entries packet=pts_time -of csv=p=0 "$n" | tail -1)
  awk -v a="$d0" -v b="$a1" 'BEGIN{exit !(b>0 && (a-b)<5)}' || { echo "audio ends ${a1}s of ${d0}s"; return 1; }
}

do_one() {  # $1 pc path  $2 pi path ; returns 0 ok, 1 fail (counted), 3 encode/transfer fail
  local pcsrc=$1 pi=$2 show name tmp t0 ps reason out
  show=$(basename "$(dirname "$pi")"); name=$(basename "$pi")
  [[ -f $pi ]] || { log "FAIL $show/$name - library file missing"; return 1; }
  if ! reason=$(plan "$pi" "$show"); then log "FAIL $show/$name - plan: $reason"; return 1; fi
  plan "$pi" "$show" >/dev/null
  t0=$(date +%s)
  ps=$(mktemp /tmp/anime_h264_XXXX.ps1)
  {
    echo '$ErrorActionPreference = "Continue"'
    echo "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class PwrKA { [DllImport(\"kernel32.dll\")] public static extern uint SetThreadExecutionState(uint f); }'"
    echo '[PwrKA]::SetThreadExecutionState([uint32]2147483649) | Out-Null'
    echo "\$rd = $(psq "$RD")"
    echo 'New-Item -ItemType Directory -Force -Path $rd | Out-Null'
    echo 'Remove-Item -LiteralPath "$rd\out.mkv" -Force -ErrorAction SilentlyContinue'
    # guard: the PC original must have the same audio+sub layout as the Pi copy the plan was built from
    echo "\$want = $(psq "$(ffprobe -v error -show_entries stream=codec_type:stream_tags=language -of csv=p=0 "$pi" | grep -E '^(audio|subtitle)' | tr '\n' ' ')")"
    echo "\$have = ((& ffprobe -v error -show_entries stream=codec_type:stream_tags=language -of csv=p=0 $(psq "$pcsrc")) | Where-Object { \$_ -match '^(audio|subtitle)' }) -join ' '"
    echo 'if (($have + " ") -ne $want) { "LAYOUT_MISMATCH pc=[$have] pi=[$want]"; exit 1 }'
    printf '$fa = @('
    local first=1 x
    for x in -hide_banner -loglevel error -nostdin -i "$pcsrc" "${MAPARGS[@]}" -y "$RD\\out.mkv"; do
      ((first)) || printf ','; first=0; psq "$x"
    done
    echo ')'
    echo '& ffmpeg @fa > "$rd\ffmpeg.log" 2>&1'
    echo '$rc = $LASTEXITCODE'
    echo 'if ($rc -eq 0 -and (Test-Path -LiteralPath "$rd\out.mkv")) { "ENC_OK" } else { "ENC_FAIL rc=$rc"; Get-Content "$rd\ffmpeg.log" -Tail 3 }'
  } > "$ps"
  out=$(pcps "$ps" 7200); rm -f "$ps"
  if ! grep -q ENC_OK <<<"$out"; then
    log "FAIL $show/$name - encode: $(tr '\n\r' '  ' <<<"$out" | cut -c1-300)"; return 3
  fi
  tmp="$TMP/$name"
  rm -f "$tmp"
  if ! timeout 3600 scp -q "${KEY[@]}" "$PCHOST:$RDS/out.mkv" "$tmp" < /dev/null; then
    log "FAIL $show/$name - scp back"; rm -f "$tmp"; return 3
  fi
  if ! reason=$(verify "$pi" "$tmp"); then
    log "FAIL $show/$name - verify: $reason (original left in place, new file at $tmp)"; return 1
  fi
  mkdir -p "$BAK/$show"
  if [[ -e "$BAK/$show/$name" ]]; then log "FAIL $show/$name - backup already exists, not overwriting"; return 1; fi
  if mv -n "$pi" "$BAK/$show/$name" && mv "$tmp" "$pi" && chmod 777 "$pi"; then
    echo "$pi" >> "$DONE"
    log "OK   $show/$name ($(( $(date +%s) - t0 ))s, $(du -m "$pi" | cut -f1) MB, a=$EXP_A s=$EXP_S)"
    local rm_ps; rm_ps=$(mktemp /tmp/anime_h264_XXXX.ps1)
    echo "Remove-Item -LiteralPath $(psq "$RD\\out.mkv") -Force -ErrorAction SilentlyContinue" > "$rm_ps"
    pcps "$rm_ps" 60 >/dev/null; rm -f "$rm_ps"
    return 0
  fi
  log "FAIL $show/$name - swap (check $pi / $BAK/$show/$name / $tmp)"; return 1
}

log "start (filter='${FILTER}')"
ok=0; fail=0; streak=0
for pass in 1 2; do
  pending=0
  while IFS='|' read -r -u 3 pcsrc pi; do
    [[ -z $pi ]] && continue
    [[ -n $FILTER && $pi != *"$FILTER"* ]] && continue
    grep -qxF "$pi" "$DONE" && continue
    pending=1
    pc_up < /dev/null; rc=$?
    if (( rc == 2 )); then log "STOP PC powered off (eth0 carrier 0, WiFi silent) - WoL cannot help; press the power button and rerun"; exit 0; fi
    if (( rc == 1 )); then
      log "PC unreachable after WoL (${pi##*/})"; streak=$((streak+1))
      (( streak >= 3 )) && { log "STOP PC unreachable 3x in a row"; exit 0; }
      continue
    fi
    do_one "$pcsrc" "$pi" < /dev/null; rc=$?
    case $rc in
      0) ok=$((ok+1)); streak=0 ;;
      3) fail=$((fail+1)); streak=$((streak+1))
         (( streak >= 3 )) && { log "STOP 3 encode/transfer failures in a row"; exit 0; } ;;
      *) fail=$((fail+1)); streak=0 ;;
    esac
  done 3< "$MAN"
  (( pending )) || break
done
left=$(while IFS='|' read -r _ pi; do [[ -n $pi && ( -z $FILTER || $pi == *"$FILTER"* ) ]] && ! grep -qxF "$pi" "$DONE" && echo x; done < "$MAN" | wc -l)
log "finished: ok=$ok fail=$fail still-pending=$left"
exit 0
