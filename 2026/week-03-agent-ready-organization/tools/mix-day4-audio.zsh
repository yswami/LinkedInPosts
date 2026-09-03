#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")/.."
ffmpeg -y \
  -i media/day4-beat-01.mp3 -i media/day4-beat-02.mp3 -i media/day4-beat-03.mp3 -i media/day4-beat-04.mp3 \
  -i media/day4-beat-05.mp3 -i media/day4-beat-06.mp3 -i media/day4-beat-07.mp3 -i media/day4-beat-08.mp3 \
  -filter_complex "[0:a]adelay=0|0[a0];[1:a]adelay=5700|5700[a1];[2:a]adelay=12600|12600[a2];[3:a]adelay=17400|17400[a3];[4:a]adelay=29100|29100[a4];[5:a]adelay=35100|35100[a5];[6:a]adelay=44000|44000[a6];[7:a]adelay=55800|55800[a7];[a0][a1][a2][a3][a4][a5][a6][a7]amix=inputs=8:normalize=0,alimiter=limit=0.85,loudnorm=I=-16:TP=-1.5:LRA=7,apad=pad_dur=63[a]" \
  -map "[a]" -t 63 -c:a aac -b:a 192k media/agent-ready-organization-day4-audio-drama.m4a
