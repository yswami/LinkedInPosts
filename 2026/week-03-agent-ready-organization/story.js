(function () {
  "use strict";

  var DURATION = 60;
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
  var currentTime = 0;
  var playing = false;
  var startedAt = 0;
  var startOffset = 0;
  var rafId = null;

  if (captureMode) document.body.classList.add("capture");

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function easeOut(value) { return 1 - Math.pow(1 - clamp(value, 0, 1), 3); }
  function smooth(value) { var point = clamp(value, 0, 1); return point * point * (3 - 2 * point); }
  function formatTime(seconds) {
    var whole = Math.max(0, Math.min(DURATION, Math.floor(seconds)));
    return String(Math.floor(whole / 60)).padStart(2, "0") + ":" + String(whole % 60).padStart(2, "0");
  }
  function sceneOpacity(time, start, end) {
    var fade = 0.7;
    if (time < start || time > end) return 0;
    return Math.min(start === 0 ? 1 : smooth((time - start) / fade), end > DURATION ? 1 : smooth((end - time) / fade));
  }
  function setEntry(element, progress) {
    var from = element.getAttribute("data-from") || "up";
    var distance = 3.4 * (1 - progress);
    var x = from === "left" ? -distance : from === "right" ? distance : 0;
    var y = from === "up" ? distance : 0;
    var scale = from === "scale" ? 0.88 + 0.12 * progress : 1;
    element.style.opacity = progress.toFixed(4);
    element.style.transform = "translate(" + x.toFixed(3) + "cqw," + y.toFixed(3) + "cqw) scale(" + scale.toFixed(4) + ")";
  }
  function renderScene(scene, time) {
    var start = Number(scene.dataset.start);
    var end = Number(scene.dataset.end);
    var opacity = sceneOpacity(time, start, end);
    scene.style.opacity = opacity.toFixed(4);
    scene.style.visibility = opacity > 0.001 ? "visible" : "hidden";
    Array.prototype.forEach.call(scene.querySelectorAll(".enter"), function (element) {
      var at = Number(element.dataset.at || 0);
      var duration = Number(element.dataset.duration || 0.8);
      setEntry(element, easeOut((time - start - at) / duration));
    });
  }
  function updateControls(time) {
    var formatted = formatTime(time);
    progressFill.style.width = (clamp(time / DURATION, 0, 1) * 100).toFixed(3) + "%";
    stageTime.textContent = formatted;
    if (scrubber) scrubber.value = String(time);
    if (playerStatus) {
      var label = playing ? "Playing" : time >= DURATION ? "Complete" : time > 0 ? "Paused" : "Ready";
      playerStatus.value = label + " · " + formatted;
      playerStatus.textContent = label + " · " + formatted;
    }
    if (playToggle) {
      playToggle.textContent = playing ? "Pause" : time >= DURATION ? "Replay with sound" : "Play with sound";
      playToggle.setAttribute("aria-pressed", String(playing));
    }
  }
  function renderAt(seconds) {
    currentTime = clamp(Number(seconds) || 0, 0, DURATION);
    scenes.forEach(function (scene) { renderScene(scene, currentTime); });
    updateControls(currentTime);
    return currentTime;
  }
  function frame(now) {
    if (!playing) return;
    var next = startOffset + (now - startedAt) / 1000;
    if (next >= DURATION) {
      playing = false;
      if (storyAudio) storyAudio.pause();
      renderAt(DURATION);
      rafId = null;
      return;
    }
    renderAt(next);
    rafId = window.requestAnimationFrame(frame);
  }
  function play() {
    if (playing) return;
    if (currentTime >= DURATION) currentTime = 0;
    playing = true;
    startOffset = currentTime;
    startedAt = performance.now();
    if (storyAudio) {
      if (Math.abs(storyAudio.currentTime - currentTime) > 0.18) storyAudio.currentTime = currentTime;
      storyAudio.play().catch(function () {});
    }
    updateControls(currentTime);
    rafId = window.requestAnimationFrame(frame);
  }
  function pause() {
    playing = false;
    if (storyAudio) storyAudio.pause();
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = null;
    updateControls(currentTime);
  }
  function restart() { pause(); renderAt(0); play(); }

  if (playToggle) playToggle.addEventListener("click", function () { if (playing) pause(); else play(); });
  if (restartButton) restartButton.addEventListener("click", restart);
  if (scrubber) scrubber.addEventListener("input", function () {
    var resume = playing;
    pause();
    renderAt(Number(scrubber.value));
    if (storyAudio) storyAudio.currentTime = currentTime;
    if (resume) play();
  });
  document.addEventListener("keydown", function (event) {
    if (event.target && event.target.matches("input, button, a")) return;
    if (event.code === "Space") { event.preventDefault(); if (playing) pause(); else play(); }
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); pause(); renderAt(currentTime + (event.key === "ArrowRight" ? 2 : -2)); }
  });

  window.storyAnimation = { duration: DURATION, pause: pause, play: play, renderAt: renderAt, restart: restart };
  renderAt(0);
  document.documentElement.dataset.animationReady = "true";
})();
