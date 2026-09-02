#!/bin/zsh
set -euo pipefail

ROOT="${0:A:h:h}"
MEDIA="$ROOT/media"
OUTPUT="$MEDIA/agent-ready-organization-day3-audio-drama.m4a"

ffmpeg -y \
  -i "$MEDIA/day3-beat-01.mp3" \
  -i "$MEDIA/day3-beat-02.mp3" \
  -i "$MEDIA/day3-beat-03.mp3" \
  -i "$MEDIA/day3-beat-04.mp3" \
  -i "$MEDIA/day3-beat-05.mp3" \
  -i "$MEDIA/day3-beat-06.mp3" \
  -i "$MEDIA/day3-beat-07.mp3" \
  -i "$MEDIA/day3-beat-08.mp3" \
  -i "$MEDIA/day3-beat-09.mp3" \
  -i "$MEDIA/day3-beat-10.mp3" \
  -i "$MEDIA/day3-beat-11.mp3" \
  -f lavfi -i "anoisesrc=color=pink:amplitude=0.032:d=63" \
  -f lavfi -i "sine=frequency=784:duration=0.16:sample_rate=48000" \
  -f lavfi -i "sine=frequency=1047:duration=0.20:sample_rate=48000" \
  -f lavfi -i "anoisesrc=color=brown:amplitude=0.62:d=0.20" \
  -f lavfi -i "sine=frequency=82:duration=0.34:sample_rate=48000" \
  -f lavfi -i "sine=frequency=640:duration=0.08:sample_rate=48000" \
  -f lavfi -i "sine=frequency=820:duration=0.08:sample_rate=48000" \
  -f lavfi -i "sine=frequency=1040:duration=0.09:sample_rate=48000" \
  -f lavfi -i "sine=frequency=52:duration=0.65:sample_rate=48000" \
  -f lavfi -i "anoisesrc=color=white:amplitude=0.26:d=0.72" \
  -f lavfi -i "aevalsrc=0.016*sin(2*PI*130.81*t)+0.011*sin(2*PI*164.81*t)+0.009*sin(2*PI*196*t):d=31:s=48000" \
  -f lavfi -i "sine=frequency=900:duration=0.44:sample_rate=48000" \
  -filter_complex "\
    [0:a]loudnorm=I=-16:TP=-2:LRA=7,pan=stereo|c0=0.68*c0|c1=0.68*c0,adelay=600|600[v0];\
    [1:a]loudnorm=I=-16:TP=-2:LRA=7,pan=stereo|c0=0.72*c0|c1=0.60*c0,adelay=4500|4500[v1];\
    [2:a]loudnorm=I=-16:TP=-2:LRA=7,pan=stereo|c0=0.68*c0|c1=0.68*c0,adelay=10000|10000[v2];\
    [3:a]loudnorm=I=-16:TP=-2:LRA=7,pan=stereo|c0=0.68*c0|c1=0.68*c0,adelay=17000|17000[v3];\
    [4:a]loudnorm=I=-15:TP=-2:LRA=6,pan=stereo|c0=0.46*c0|c1=0.88*c0,adelay=21000|21000[v4];\
    [5:a]loudnorm=I=-16:TP=-2:LRA=7,pan=stereo|c0=0.68*c0|c1=0.68*c0,adelay=25500|25500[v5];\
    [6:a]loudnorm=I=-15:TP=-2:LRA=6,pan=stereo|c0=0.68*c0|c1=0.68*c0,adelay=33000|33000[v6];\
    [7:a]loudnorm=I=-16:TP=-2:LRA=7,pan=stereo|c0=0.68*c0|c1=0.68*c0,adelay=38000|38000[v7];\
    [8:a]loudnorm=I=-16:TP=-2:LRA=7,pan=stereo|c0=0.68*c0|c1=0.68*c0,adelay=49000|49000[v8];\
    [9:a]loudnorm=I=-16:TP=-2:LRA=7,pan=stereo|c0=0.68*c0|c1=0.68*c0,adelay=56500|56500[v9];\
    [10:a]loudnorm=I=-15:TP=-2:LRA=6,pan=stereo|c0=0.68*c0|c1=0.68*c0,adelay=60000|60000[v10];\
    [11:a]highpass=f=190,lowpass=f=3000,volume=0.045,afade=t=out:st=23:d=2.5,pan=stereo|c0=c0|c1=0.92*c0[amb];\
    [12:a]volume=0.065,afade=t=out:st=0:d=0.16,adelay=650|650,pan=stereo|c0=0.64*c0|c1=0.64*c0[confirm1];\
    [13:a]volume=0.055,afade=t=out:st=0:d=0.20,adelay=770|770,pan=stereo|c0=0.64*c0|c1=0.64*c0[confirm2];\
    [14:a]lowpass=f=900,volume=0.24,afade=t=out:st=0:d=0.20,adelay=4450|4450,pan=stereo|c0=0.72*c0|c1=0.48*c0[stamp];\
    [15:a]volume=0.14,afade=t=out:st=0:d=0.34,adelay=4450|4450,pan=stereo|c0=0.72*c0|c1=0.48*c0[thud];\
    [16:a]volume=0.05,adelay=10300|10300,pan=stereo|c0=0.55*c0|c1=0.68*c0[tick1];\
    [17:a]volume=0.05,adelay=11150|11150,pan=stereo|c0=0.60*c0|c1=0.72*c0[tick2];\
    [18:a]volume=0.05,adelay=12000|12000,pan=stereo|c0=0.66*c0|c1=0.76*c0[tick3];\
    [19:a]volume=0.18,afade=t=out:st=0:d=0.65,adelay=20800|20800,pan=stereo|c0=0.72*c0|c1=0.72*c0[stop];\
    [20:a]highpass=f=700,lowpass=f=6000,volume=0.05,afade=t=out:st=0:d=0.72,adelay=32200|32200,pan=stereo|c0=0.42*c0|c1=0.76*c0[reveal];\
    [21:a]lowpass=f=720,volume=0.48,tremolo=f=0.16:d=0.25,aecho=0.75:0.35:90:0.14,afade=t=in:st=0:d=2.2,afade=t=out:st=26:d=5,adelay=33000|33000,pan=stereo|c0=0.58*c0|c1=0.62*c0[pad];\
    [22:a]volume=0.065,afade=t=out:st=0:d=0.44,adelay=61500|61500,pan=stereo|c0=0.60*c0|c1=0.60*c0[end];\
    [v0][v1][v2][v3][v4][v5][v6][v7][v8][v9][v10][amb][confirm1][confirm2][stamp][thud][tick1][tick2][tick3][stop][reveal][pad][end]amix=inputs=23:duration=longest:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=7,alimiter=limit=0.94,volume=-0.8dB[out]" \
  -map "[out]" -t 63 -c:a aac -b:a 192k "$OUTPUT"

ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 "$OUTPUT"
