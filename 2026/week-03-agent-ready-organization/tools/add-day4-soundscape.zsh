#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")/.."

ffmpeg -y \
  -i media/agent-ready-organization-day4-audio-drama.m4a \
  -f lavfi -t 63 -i "sine=frequency=110:sample_rate=48000" \
  -f lavfi -t 63 -i "sine=frequency=164.81:sample_rate=48000" \
  -f lavfi -t 63 -i "anoisesrc=color=pink:sample_rate=48000" \
  -f lavfi -t 0.07 -i "sine=frequency=1250:sample_rate=48000" \
  -f lavfi -t 0.9 -i "sine=frequency=73.42:sample_rate=48000" \
  -f lavfi -t 1.3 -i "sine=frequency=440:sample_rate=48000" \
  -filter_complex "\
    [1:a]volume=0.030,tremolo=f=0.10:d=0.28,lowpass=f=620[d1];\
    [2:a]volume=0.014,tremolo=f=0.12:d=0.34,lowpass=f=820[d2];\
    [3:a]lowpass=f=950,highpass=f=120,volume=0.0025[air];\
    [d1][d2][air]amix=inputs=3:normalize=0,afade=t=in:st=0:d=2.5,afade=t=out:st=59.5:d=3.5[bed];\
    [bed][0:a]sidechaincompress=threshold=0.015:ratio=7:attack=18:release=520:makeup=1[ducked];\
    [4:a]volume=0.11,afade=t=out:st=0:d=0.065,asplit=9[t1][t2][t3][t4][t5][t6][t7][t8][t9];\
    [t1]adelay=12600|12600[a1];[t2]adelay=13600|13600[a2];[t3]adelay=14600|14600[a3];\
    [t4]adelay=15600|15600[a4];[t5]adelay=16600|16600[a5];[t6]adelay=17600|17600[a6];\
    [t7]adelay=18600|18600[a7];[t8]adelay=19600|19600[a8];[t9]adelay=20600|20600[a9];\
    [a1][a2][a3][a4][a5][a6][a7][a8][a9]amix=inputs=9:normalize=0[ticks];\
    [5:a]volume=0.08,afade=t=in:st=0:d=0.08,afade=t=out:st=0.15:d=0.75,adelay=29100|29100[impact];\
    [6:a]volume=0.035,afade=t=in:st=0:d=0.12,afade=t=out:st=0.35:d=0.95,adelay=40000|40000[chime];\
    [0:a][ducked][ticks][impact][chime]amix=inputs=5:normalize=0,alimiter=limit=0.86,loudnorm=I=-16:TP=-1.5:LRA=7,apad=pad_dur=63[out]" \
  -map "[out]" -t 63 -c:a aac -b:a 192k \
  media/agent-ready-organization-day4-audio-final.m4a

ffmpeg -y \
  -i local-output/agent-ready-organization-day4-reel-silent.mp4 \
  -i media/agent-ready-organization-day4-audio-final.m4a \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest \
  -movflags +faststart \
  local-output/agent-ready-organization-day4-reel.mp4
