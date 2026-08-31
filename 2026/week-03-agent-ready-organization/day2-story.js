(function () {
  "use strict";
  var DURATION = 71;
  var DECISION_TIME = 36.75;
  var params = new URLSearchParams(window.location.search);
  var captureMode = params.get("capture") === "1";
  var scenes = Array.prototype.slice.call(document.querySelectorAll(".scene"));
  var progressFill = document.getElementById("stage-progress-fill");
  var stageTime = document.getElementById("stage-time-value");
  var playToggle = document.getElementById("play-toggle");
  var restartButton = document.getElementById("restart");
  var scrubber = document.getElementById("scrubber");
  var playerStatus = document.getElementById("player-status");
  var storyAudio = document.getElementById("story-audio");
  var decisionButtons = Array.prototype.slice.call(document.querySelectorAll("[data-decision]"));
  var decisionFeedback = document.getElementById("decision-feedback");
  var curtainLeft = document.querySelector(".curtain-left");
  var curtainRight = document.querySelector(".curtain-right");
  var spotlight = document.querySelector(".spotlight");
  var currentTime = 0, playing = false, startedAt = 0, startOffset = 0, rafId = null;
  var decisionPrompted = false, decisionMade = false, decisionValue = "", resumeTimer = null;
  if (captureMode) document.body.classList.add("capture");
  function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
  function easeOut(value){return 1-Math.pow(1-clamp(value,0,1),3);}
  function smooth(value){var point=clamp(value,0,1);return point*point*(3-2*point);}
  function formatTime(seconds){var whole=Math.max(0,Math.min(DURATION,Math.floor(seconds)));return String(Math.floor(whole/60)).padStart(2,"0")+":"+String(whole%60).padStart(2,"0");}
  function sceneOpacity(time,start,end){var fade=.72;if(time<start||time>end)return 0;return Math.min(start===0?1:smooth((time-start)/fade),end>=DURATION?1:smooth((end-time)/fade));}
  function setEntry(element,progress){var from=element.getAttribute("data-from")||"up";var distance=4.4*(1-progress);var x=from==="left"?-distance:from==="right"?distance:0;var y=from==="up"?distance:0;var scale=from==="scale"?.82+.18*progress:1;element.style.opacity=progress.toFixed(4);element.style.transform="translate("+x.toFixed(3)+"cqw,"+y.toFixed(3)+"cqw) scale("+scale.toFixed(4)+")";}
  function renderScene(scene,time){var start=Number(scene.dataset.start),end=Number(scene.dataset.end),opacity=sceneOpacity(time,start,end);scene.style.opacity=opacity.toFixed(4);scene.style.visibility=opacity>.001?"visible":"hidden";scene.style.pointerEvents=opacity>.55?"auto":"none";Array.prototype.forEach.call(scene.querySelectorAll(".enter"),function(element){var at=Number(element.dataset.at||0),duration=Number(element.dataset.duration||.78);setEntry(element,easeOut((time-start-at)/duration));});}
  function renderMotion(time){Array.prototype.forEach.call(document.querySelectorAll(".bob"),function(element,index){var y=Math.sin(time*2.15+index*.8)*.45,tilt=Math.sin(time*1.15+index)*1.3;element.style.transform="translateY("+y.toFixed(3)+"cqw) rotate("+tilt.toFixed(3)+"deg)";});Array.prototype.forEach.call(document.querySelectorAll(".sway,.sway-alt"),function(element,index){element.style.transform="rotate("+(Math.sin(time*1.5+index)*1.8).toFixed(3)+"deg)";});var opening=smooth(time/2.2);if(curtainLeft)curtainLeft.style.transform="translateX("+(-3.5*opening).toFixed(3)+"cqw)";if(curtainRight)curtainRight.style.transform="translateX("+(3.5*opening).toFixed(3)+"cqw)";if(spotlight)spotlight.style.opacity=(.35+.5*opening).toFixed(3);}
  function setDecisionVisual(value,message){decisionValue=value||"";decisionButtons.forEach(function(button){var selected=button.dataset.decision===decisionValue;button.classList.toggle("is-selected",selected);button.classList.toggle("is-rejected",Boolean(decisionValue)&&!selected);button.setAttribute("aria-pressed",String(selected));});if(decisionFeedback)decisionFeedback.innerHTML=message||"Pick one to continue the play.";}
  function renderDecision(time){if(captureMode){if(time>=36.85&&time<=40.1)setDecisionVisual("contract","<strong>Write the decision contract.</strong> Keep the role map; expose the missing decision mechanics.");else setDecisionVisual("","Pick one to continue the play.");}}
  function updateControls(time){var formatted=formatTime(time);progressFill.style.width=(clamp(time/DURATION,0,1)*100).toFixed(3)+"%";stageTime.textContent=formatted;if(scrubber)scrubber.value=String(time);if(playerStatus){var label=decisionPrompted&&!decisionMade?"Waiting for your choice":playing?"Playing":time>=DURATION?"Complete":time>0?"Paused":"Ready";playerStatus.value=label+" · "+formatted;playerStatus.textContent=label+" · "+formatted;}if(playToggle){playToggle.textContent=playing?"Pause":time>=DURATION?"Replay with sound":decisionPrompted&&!decisionMade?"Choose above":"Play with sound";playToggle.setAttribute("aria-pressed",String(playing));playToggle.disabled=decisionPrompted&&!decisionMade;}}
  function renderAt(seconds){currentTime=clamp(Number(seconds)||0,0,DURATION);scenes.forEach(function(scene){renderScene(scene,currentTime);});renderMotion(currentTime);renderDecision(currentTime);updateControls(currentTime);return currentTime;}
  function stopAtDecision(){playing=false;decisionPrompted=true;if(storyAudio)storyAudio.pause();if(rafId)window.cancelAnimationFrame(rafId);rafId=null;renderAt(DECISION_TIME);setDecisionVisual("","Pick one to continue the play.");if(decisionButtons[0])decisionButtons[0].focus({preventScroll:true});}
  function frame(now){if(!playing)return;var next=startOffset+(now-startedAt)/1000;if(!captureMode&&!decisionMade&&!decisionPrompted&&next>=DECISION_TIME){stopAtDecision();return;}if(next>=DURATION){playing=false;if(storyAudio)storyAudio.pause();renderAt(DURATION);rafId=null;return;}renderAt(next);rafId=window.requestAnimationFrame(frame);}
  function play(){if(playing||(decisionPrompted&&!decisionMade))return;if(currentTime>=DURATION){currentTime=0;decisionMade=false;decisionPrompted=false;setDecisionVisual("","Pick one to continue the play.");}playing=true;startOffset=currentTime;startedAt=performance.now();if(storyAudio){if(Math.abs(storyAudio.currentTime-currentTime)>.18)storyAudio.currentTime=currentTime;storyAudio.play().catch(function(){});}updateControls(currentTime);rafId=window.requestAnimationFrame(frame);}
  function pause(){playing=false;if(storyAudio)storyAudio.pause();if(rafId)window.cancelAnimationFrame(rafId);rafId=null;updateControls(currentTime);}
  function restart(){pause();if(resumeTimer)window.clearTimeout(resumeTimer);decisionMade=false;decisionPrompted=false;setDecisionVisual("","Pick one to continue the play.");renderAt(0);play();}
  function chooseDecision(value){if(captureMode||decisionMade)return;decisionMade=true;var message=value==="contract"?"<strong>Exactly.</strong> Keep the RACI, then define the missing decision mechanics.":"<strong>Useful—but still incomplete.</strong> The agent needs explicit authority, limits, evidence, and escalation.";setDecisionVisual(value,message);updateControls(currentTime);resumeTimer=window.setTimeout(function(){if(value!=="contract")setDecisionVisual("contract","<strong>The reveal:</strong> add an executable decision contract.");currentTime=DECISION_TIME+.12;if(storyAudio)storyAudio.currentTime=currentTime;play();},1300);}
  decisionButtons.forEach(function(button){button.addEventListener("click",function(){chooseDecision(button.dataset.decision);});});
  if(playToggle)playToggle.addEventListener("click",function(){if(playing)pause();else play();});if(restartButton)restartButton.addEventListener("click",restart);if(scrubber)scrubber.addEventListener("input",function(){var resume=playing;pause();renderAt(Number(scrubber.value));if(storyAudio)storyAudio.currentTime=currentTime;if(resume)play();});
  document.addEventListener("keydown",function(event){if(event.target&&event.target.matches("input, button, a"))return;if(event.code==="Space"){event.preventDefault();if(playing)pause();else play();}if(event.key==="ArrowRight"||event.key==="ArrowLeft"){event.preventDefault();pause();renderAt(currentTime+(event.key==="ArrowRight"?2:-2));}});
  window.storyAnimation={duration:DURATION,decisionTime:DECISION_TIME,pause:pause,play:play,renderAt:renderAt,restart:restart,chooseDecision:chooseDecision,state:function(){return{currentTime:currentTime,playing:playing,decisionPrompted:decisionPrompted,decisionMade:decisionMade,decisionValue:decisionValue};}};
  renderAt(0);document.documentElement.dataset.animationReady="true";
})();
