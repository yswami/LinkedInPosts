(function () {
  "use strict";
  var DURATION = 63;
  var query = new URLSearchParams(window.location.search);
  var captureMode = query.get("capture") === "1";
  var initialTime = Number(query.get("time")) || 0;
  var scenes = Array.prototype.slice.call(document.querySelectorAll(".scene"));
  var progressFill = document.getElementById("stage-progress-fill");
  var stageTime = document.getElementById("stage-time-value");
  var playToggle = document.getElementById("play-toggle");
  var restartButton = document.getElementById("restart");
  var scrubber = document.getElementById("scrubber");
  var playerStatus = document.getElementById("player-status");
  var storyAudio = document.getElementById("story-audio");
  var curtainLeft = document.querySelector(".curtain-left");
  var curtainRight = document.querySelector(".curtain-right");
  var spotlight = document.querySelector(".spotlight");
  var currentTime = 0, playing = false, startedAt = 0, startOffset = 0, rafId = null;
  if (captureMode) document.body.classList.add("capture");
  function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
  function easeOut(value){return 1-Math.pow(1-clamp(value,0,1),3);}
  function smooth(value){var point=clamp(value,0,1);return point*point*(3-2*point);}
  function formatTime(seconds){var whole=Math.max(0,Math.min(DURATION,Math.floor(seconds)));return String(Math.floor(whole/60)).padStart(2,"0")+":"+String(whole%60).padStart(2,"0");}
  function sceneOpacity(time,start,end){var fade=.5;if(time<start||time>end)return 0;return Math.min(start===0?1:smooth((time-start)/fade),end>=DURATION?1:smooth((end-time)/fade));}
  function setEntry(element,progress){var from=element.getAttribute("data-from")||"up";var distance=4.8*(1-progress);var x=from==="left"?-distance:from==="right"?distance:0;var y=from==="up"?distance:0;var scale=from==="scale"?.80+.20*progress:1;element.style.opacity=progress.toFixed(4);element.style.transform="translate("+x.toFixed(3)+"cqw,"+y.toFixed(3)+"cqw) scale("+scale.toFixed(4)+")";}
  function renderScene(scene,time){var start=Number(scene.dataset.start),end=Number(scene.dataset.end),opacity=sceneOpacity(time,start,end),zoom=Number(scene.dataset.zoom||1);scene.style.opacity=opacity.toFixed(4);scene.style.visibility=opacity>.001?"visible":"hidden";scene.style.pointerEvents=opacity>.55?"auto":"none";scene.style.transform="scale("+(1+(zoom-1)*(1-smooth((time-start)/1.6))).toFixed(4)+")";Array.prototype.forEach.call(scene.querySelectorAll(".enter"),function(element){var at=Number(element.dataset.at||0),duration=Number(element.dataset.duration||.62);setEntry(element,easeOut((time-start-at)/duration));});}
  function renderMotion(time){
    Array.prototype.forEach.call(document.querySelectorAll(".bob"),function(element,index){var y=Math.sin(time*2.2+index*.7)*.46,tilt=Math.sin(time*1.15+index)*1.15;element.style.transform="translateY("+y.toFixed(3)+"cqw) rotate("+tilt.toFixed(3)+"deg)";});
    Array.prototype.forEach.call(document.querySelectorAll(".sway-alt"),function(element,index){element.style.transform="rotate("+(Math.sin(time*1.45+index)*1.6).toFixed(3)+"deg)";});
    var opening=smooth(time/1.5);if(curtainLeft)curtainLeft.style.transform="translateX("+(-3.5*opening).toFixed(3)+"cqw)";if(curtainRight)curtainRight.style.transform="translateX("+(3.5*opening).toFixed(3)+"cqw)";if(spotlight)spotlight.style.opacity=(.30+.56*opening).toFixed(3);
    var action=document.querySelector(".payment-action");if(action){var move=smooth(clamp((time-23.3)/3.3,0,1));action.style.marginLeft=(5.8*move).toFixed(3)+"cqw";action.style.boxShadow="0 1.2cqw 2.5cqw rgba(199,93,69,"+(.10+.14*Math.abs(Math.sin(time*5))).toFixed(3)+")";}
  }
  function updateControls(time){var formatted=formatTime(time);progressFill.style.width=(clamp(time/DURATION,0,1)*100).toFixed(3)+"%";stageTime.textContent=formatted;if(scrubber)scrubber.value=String(time);if(playerStatus){var label=playing?"Playing":time>=DURATION?"Complete":time>0?"Paused":"Ready";playerStatus.value=label+" · "+formatted;playerStatus.textContent=label+" · "+formatted;}if(playToggle){playToggle.textContent=playing?"Pause":time>=DURATION?"Replay with sound":"Play with sound";playToggle.setAttribute("aria-pressed",String(playing));}}
  function renderAt(seconds){currentTime=clamp(Number(seconds)||0,0,DURATION);scenes.forEach(function(scene){renderScene(scene,currentTime);});renderMotion(currentTime);updateControls(currentTime);return currentTime;}
  function frame(now){if(!playing)return;var next=startOffset+(now-startedAt)/1000;if(next>=DURATION){playing=false;if(storyAudio)storyAudio.pause();renderAt(DURATION);rafId=null;return;}renderAt(next);rafId=window.requestAnimationFrame(frame);}
  function play(){if(playing)return;if(currentTime>=DURATION)currentTime=0;playing=true;startOffset=currentTime;startedAt=performance.now();if(storyAudio){if(Math.abs(storyAudio.currentTime-currentTime)>.16)storyAudio.currentTime=currentTime;storyAudio.play().catch(function(){});}updateControls(currentTime);rafId=window.requestAnimationFrame(frame);}
  function pause(){playing=false;if(storyAudio)storyAudio.pause();if(rafId)window.cancelAnimationFrame(rafId);rafId=null;updateControls(currentTime);}
  function restart(){pause();renderAt(0);play();}
  if(playToggle)playToggle.addEventListener("click",function(){if(playing)pause();else play();});
  if(restartButton)restartButton.addEventListener("click",restart);
  if(scrubber)scrubber.addEventListener("input",function(){var resume=playing;pause();renderAt(Number(scrubber.value));if(storyAudio)storyAudio.currentTime=currentTime;if(resume)play();});
  document.addEventListener("keydown",function(event){if(event.target&&event.target.matches("input, button, a"))return;if(event.code==="Space"){event.preventDefault();if(playing)pause();else play();}if(event.key==="ArrowRight"||event.key==="ArrowLeft"){event.preventDefault();pause();renderAt(currentTime+(event.key==="ArrowRight"?2:-2));}});
  window.storyAnimation={duration:DURATION,pause:pause,play:play,renderAt:renderAt,restart:restart,state:function(){return{currentTime:currentTime,playing:playing};}};
  renderAt(initialTime);document.documentElement.dataset.animationReady="true";
}());
