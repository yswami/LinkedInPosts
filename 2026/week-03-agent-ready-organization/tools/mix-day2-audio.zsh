#!/bin/zsh
set -euo pipefail

ROOT="${0:A:h:h}"
MEDIA="$ROOT/media"
OUTPUT="$MEDIA/agent-ready-organization-day2-audio-drama.m4a"

ffmpeg -y \
  -i "$MEDIA/day2-beat-01-system.mp3" \
  -i "$MEDIA/day2-beat-01-leadership.mp3" \
  -i "$MEDIA/day2-beat-02.mp3" \
  -i "$MEDIA/day2-beat-03-agent.mp3" \
  -i "$MEDIA/day2-beat-03-procurement.mp3" \
  -i "$MEDIA/day2-beat-04.mp3" \
  -i "$MEDIA/day2-beat-05.mp3" \
  -i "$MEDIA/day2-beat-06.mp3" \
  -i "$MEDIA/day2-beat-07.mp3" \
  -f lavfi -i "anoisesrc=color=pink:amplitude=0.045:d=63" \
  -f lavfi -i "sine=frequency=1046:duration=0.30:sample_rate=48000" \
  -f lavfi -i "sine=frequency=1568:duration=0.22:sample_rate=48000" \
  -f lavfi -i "anoisesrc=color=brown:amplitude=0.72:d=0.20" \
  -f lavfi -i "sine=frequency=105:duration=0.28:sample_rate=48000" \
  -f lavfi -i "sine=frequency=720:duration=0.11:sample_rate=48000" \
  -f lavfi -i "sine=frequency=980:duration=0.11:sample_rate=48000" \
  -f lavfi -i "sine=frequency=1320:duration=0.13:sample_rate=48000" \
  -f lavfi -i "sine=frequency=58:duration=0.55:sample_rate=48000" \
  -f lavfi -i "anoisesrc=color=white:amplitude=0.30:d=0.70" \
  -f lavfi -i "aevalsrc=0.018*sin(2*PI*130.81*t)+0.012*sin(2*PI*164.81*t)+0.010*sin(2*PI*196*t):d=25:s=48000" \
  -f lavfi -i "sine=frequency=880:duration=0.50:sample_rate=48000" \
  -filter_complex "\
    [0:a]loudnorm=I=-15:TP=-2:LRA=6,highpass=f=260,lowpass=f=3400,aecho=0.75:0.32:38:0.10,pan=stereo|c0=0.68*c0|c1=0.68*c0,adelay=600|600[v0];\
    [1:a]loudnorm=I=-16:TP=-2:LRA=7,pan=stereo|c0=0.84*c0|c1=0.48*c0,adelay=2400|2400[v1];\
    [2:a]loudnorm=I=-16:TP=-2:LRA=7,pan=stereo|c0=0.68*c0|c1=0.68*c0,adelay=6900|6900[v2];\
    [3:a]loudnorm=I=-15:TP=-2:LRA=6,highpass=f=240,lowpass=f=3600,aecho=0.75:0.28:34:0.08,pan=stereo|c0=0.66*c0|c1=0.66*c0,adelay=15400|15400[v3];\
    [4:a]loudnorm=I=-16:TP=-2:LRA=7,pan=stereo|c0=0.44*c0|c1=0.90*c0,adelay=19450|19450[v4];\
    [5:a]loudnorm=I=-16:TP=-2:LRA=7,pan=stereo|c0=0.68*c0|c1=0.68*c0,adelay=25400|25400[v5];\
    [6:a]loudnorm=I=-15:TP=-2:LRA=6,pan=stereo|c0=0.68*c0|c1=0.68*c0,adelay=33500|33500[v6];\
    [7:a]loudnorm=I=-16:TP=-2:LRA=7,pan=stereo|c0=0.68*c0|c1=0.68*c0,adelay=38200|38200[v7];\
    [8:a]loudnorm=I=-16:TP=-2:LRA=7,pan=stereo|c0=0.68*c0|c1=0.68*c0,adelay=45600|45600[v8];\
    [9:a]highpass=f=190,lowpass=f=3100,volume=0.055,afade=t=out:st=22:d=3,pan=stereo|c0=c0|c1=0.92*c0[amb];\
    [10:a]volume=0.12,afade=t=out:st=0:d=0.30,pan=stereo|c0=0.64*c0|c1=0.64*c0[ch1];\
    [11:a]volume=0.08,afade=t=out:st=0:d=0.22,adelay=55|55,pan=stereo|c0=0.64*c0|c1=0.64*c0[ch2];\
    [12:a]lowpass=f=950,volume=0.27,afade=t=out:st=0:d=0.20,adelay=2400|2400,pan=stereo|c0=0.72*c0|c1=0.48*c0[stamp];\
    [13:a]volume=0.17,afade=t=out:st=0:d=0.28,adelay=2400|2400,pan=stereo|c0=0.72*c0|c1=0.48*c0[thud];\
    [14:a]volume=0.06,adelay=15110|15110,pan=stereo|c0=0.55*c0|c1=0.65*c0[r1];\
    [15:a]volume=0.06,adelay=15295|15295,pan=stereo|c0=0.60*c0|c1=0.70*c0[r2];\
    [16:a]volume=0.06,adelay=15480|15480,pan=stereo|c0=0.65*c0|c1=0.75*c0[r3];\
    [17:a]volume=0.15,afade=t=out:st=0:d=0.55,adelay=25200|25200,pan=stereo|c0=0.72*c0|c1=0.72*c0[drop];\
    [18:a]highpass=f=700,lowpass=f=6000,volume=0.055,afade=t=out:st=0:d=0.70,adelay=37700|37700,pan=stereo|c0=0.45*c0|c1=0.75*c0[swish];\
    [19:a]lowpass=f=700,volume=0.50,tremolo=f=0.18:d=0.28,aecho=0.75:0.38:90:0.16,afade=t=in:st=0:d=2.2,afade=t=out:st=20:d=5,adelay=38000|38000,pan=stereo|c0=0.58*c0|c1=0.62*c0[pad];\
    [20:a]volume=0.07,afade=t=out:st=0:d=0.50,adelay=61500|61500,pan=stereo|c0=0.60*c0|c1=0.60*c0[end];\
    [v0][v1][v2][v3][v4][v5][v6][v7][v8][amb][ch1][ch2][stamp][thud][r1][r2][r3][drop][swish][pad][end]amix=inputs=21:duration=longest:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=6,alimiter=limit=0.94[out]" \
  -map "[out]" -t 63 -c:a aac -b:a 192k "$OUTPUT"

ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 "$OUTPUT"
