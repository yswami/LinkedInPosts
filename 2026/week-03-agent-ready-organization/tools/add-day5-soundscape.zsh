#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")/.."

ffmpeg -y \
  -i media/agent-ready-organization-day5-audio-drama.m4a \
  -f lavfi -t 63 -i "sine=frequency=110:sample_rate=48000" \
  -f lavfi -t 63 -i "sine=frequency=164.81:sample_rate=48000" \
  -f lavfi -t 63 -i "anoisesrc=color=pink:sample_rate=48000" \
  -f lavfi -t 1.15 -i "sine=frequency=392:sample_rate=48000" \
  -f lavfi -t 1.1 -i "sine=frequency=523.25:sample_rate=48000" \
  -filter_complex "\
    [1:a]volume=0.028,tremolo=f=0.10:d=0.25,lowpass=f=620[d1];\
    [2:a]volume=0.013,tremolo=f=0.11:d=0.30,lowpass=f=820[d2];\
    [3:a]lowpass=f=900,highpass=f=120,volume=0.0022[air];\
    [d1][d2][air]amix=inputs=3:normalize=0,afade=t=in:st=0:d=2.2,afade=t=out:st=59:d=4[bed];\
    [bed][0:a]sidechaincompress=threshold=0.014:ratio=7:attack=20:release=500:makeup=1[ducked];\
    [4:a]volume=0.03,afade=t=in:st=0:d=0.12,afade=t=out:st=0.35:d=0.8,asplit=3[c1][c2][c3];\
    [c1]adelay=9300|9300[ch1];[c2]adelay=31300|31300[ch2];[c3]adelay=44800|44800[ch3];\
    [ch1][ch2][ch3]amix=inputs=3:normalize=0[chapters];\
    [5:a]volume=0.035,afade=t=in:st=0:d=0.12,afade=t=out:st=0.35:d=0.75,adelay=54400|54400[finalchime];\
    [0:a][ducked][chapters][finalchime]amix=inputs=4:normalize=0,alimiter=limit=0.86,loudnorm=I=-16:TP=-1.5:LRA=7,apad=pad_dur=63[out]" \
  -map "[out]" -t 63 -c:a aac -b:a 192k media/agent-ready-organization-day5-audio-final.m4a

if [[ -f local-output/agent-ready-organization-day5-reel-silent.mp4 ]]; then
  ffmpeg -y \
    -i local-output/agent-ready-organization-day5-reel-silent.mp4 \
    -i media/agent-ready-organization-day5-audio-final.m4a \
    -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest \
    -movflags +faststart \
    local-output/agent-ready-organization-day5-reel.mp4
fi
