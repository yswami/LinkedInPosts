(function () {
  "use strict";

  var DURATION = 60;
  var params = new URLSearchParams(window.location.search);
  var captureMode = params.get("capture") === "1";
  var autoplay = params.get("autoplay") === "1";
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var scenes = Array.prototype.slice.call(document.querySelectorAll(".scene"));
  var progressFill = document.getElementById("stage-progress-fill");
  var stageTime = document.getElementById("stage-time-value");
  var playToggle = document.getElementById("play-toggle");
  var restartButton = document.getElementById("restart");
  var scrubber = document.getElementById("scrubber");
  var playerStatus = document.getElementById("player-status");
  var seriesAudio = document.getElementById("series-audio");

  var currentTime = 0;
  var playing = false;
  var startedAt = 0;
  var startOffset = 0;
  var rafId = null;

  if (captureMode) {
    document.body.classList.add("capture");
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - clamp(value, 0, 1), 3);
  }

  function smoothStep(value) {
    var point = clamp(value, 0, 1);
    return point * point * (3 - 2 * point);
  }

  function formatTime(seconds) {
    var whole = Math.max(0, Math.min(DURATION, Math.floor(seconds)));
    var minutes = String(Math.floor(whole / 60)).padStart(2, "0");
    var remaining = String(whole % 60).padStart(2, "0");
    return minutes + ":" + remaining;
  }

  function sceneOpacity(time, start, end) {
    var fade = 0.72;
    if (time < start || time > end) {
      return 0;
    }

    var fadeIn = start === 0 ? 1 : smoothStep((time - start) / fade);
    var fadeOut = end > DURATION ? 1 : smoothStep((end - time) / fade);
    return Math.min(fadeIn, fadeOut);
  }

  function entryState(localTime, at, duration) {
    return easeOutCubic((localTime - at) / duration);
  }

  function setEntryStyle(element, progress) {
    var from = element.getAttribute("data-from") || "up";
    var x = 0;
    var y = 0;
    var scale = 1;
    var distance = 3.2 * (1 - progress);

    if (from === "left") {
      x = -distance;
    } else if (from === "right") {
      x = distance;
    } else if (from === "scale") {
      scale = 0.88 + 0.12 * progress;
    } else {
      y = distance;
    }

    element.style.opacity = progress.toFixed(4);
    element.style.transform = "translate(" + x.toFixed(3) + "cqw, " + y.toFixed(3) + "cqw) scale(" + scale.toFixed(4) + ")";
  }

  function renderScene(scene, time) {
    var start = Number(scene.getAttribute("data-start"));
    var end = Number(scene.getAttribute("data-end"));
    var localTime = time - start;
    var opacity = sceneOpacity(time, start, end);

    scene.style.opacity = opacity.toFixed(4);
    scene.style.visibility = opacity > 0.001 ? "visible" : "hidden";

    Array.prototype.forEach.call(scene.querySelectorAll(".enter"), function (element) {
      var at = Number(element.getAttribute("data-at") || 0);
      var duration = Number(element.getAttribute("data-duration") || 0.8);
      setEntryStyle(element, entryState(localTime, at, duration));
    });

    var confidence = scene.querySelector("[data-confidence]");
    if (confidence) {
      var confidenceProgress = smoothStep((localTime - 1.1) / 1.6);
      confidence.textContent = Math.round(78 * confidenceProgress) + "%";
    }

    var pipeline = scene.querySelector("[data-grow]");
    if (pipeline) {
      var pipelineProgress = smoothStep((localTime - 1.4) / 5.2);
      pipeline.style.width = (80 * pipelineProgress).toFixed(2) + "%";
    }

    Array.prototype.forEach.call(scene.querySelectorAll("[data-slider]"), function (slider, index) {
      var values = slider.getAttribute("data-slider").split(",").map(Number);
      var sliderProgress = smoothStep((localTime - 2 - index * 0.12) / 4.2);
      var value = values[0] + (values[1] - values[0]) * sliderProgress;
      slider.style.setProperty("--slider-fill", (value * 100).toFixed(2) + "%");
    });
  }

  function updateControls(time) {
    var formatted = formatTime(time);
    progressFill.style.width = (clamp(time / DURATION, 0, 1) * 100).toFixed(3) + "%";
    stageTime.textContent = formatted;

    if (scrubber) {
      scrubber.value = String(clamp(time, 0, DURATION));
    }

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
    scenes.forEach(function (scene) {
      renderScene(scene, currentTime);
    });
    updateControls(currentTime);
    document.body.classList.toggle("animation-complete", currentTime >= DURATION);
    return currentTime;
  }

  function frame(now) {
    if (!playing) {
      return;
    }

    var elapsed = (now - startedAt) / 1000;
    var nextTime = startOffset + elapsed;

    if (nextTime >= DURATION) {
      playing = false;
      if (seriesAudio) {
        seriesAudio.pause();
      }
      renderAt(DURATION);
      rafId = null;
      window.dispatchEvent(new CustomEvent("series-animation-complete"));
      return;
    }

    renderAt(nextTime);
    rafId = window.requestAnimationFrame(frame);
  }

  function play() {
    if (playing) {
      return;
    }
    if (currentTime >= DURATION) {
      currentTime = 0;
    }
    playing = true;
    startOffset = currentTime;
    startedAt = performance.now();
    if (seriesAudio) {
      if (Math.abs(seriesAudio.currentTime - currentTime) > 0.18) {
        seriesAudio.currentTime = currentTime;
      }
      seriesAudio.play().catch(function () {
        // The visual animation remains usable if the browser blocks autoplay.
      });
    }
    updateControls(currentTime);
    rafId = window.requestAnimationFrame(frame);
  }

  function pause() {
    if (!playing) {
      return;
    }
    playing = false;
    if (seriesAudio) {
      seriesAudio.pause();
    }
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    updateControls(currentTime);
  }

  function restart(options) {
    pause();
    renderAt(0);
    if (!options || options.play !== false) {
      play();
    }
  }

  if (playToggle) {
    playToggle.addEventListener("click", function () {
      if (playing) {
        pause();
      } else {
        play();
      }
    });
  }

  if (restartButton) {
    restartButton.addEventListener("click", function () {
      restart();
    });
  }

  if (scrubber) {
    scrubber.addEventListener("input", function () {
      var resume = playing;
      pause();
      renderAt(Number(scrubber.value));
      if (seriesAudio) {
        seriesAudio.currentTime = currentTime;
      }
      if (resume) {
        play();
      }
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.target && event.target.matches("input, button, a")) {
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      if (playing) {
        pause();
      } else {
        play();
      }
    }

    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      pause();
      renderAt(currentTime + (event.key === "ArrowRight" ? 2 : -2));
    }
  });

  window.seriesAnimation = {
    duration: DURATION,
    pause: pause,
    play: play,
    renderAt: renderAt,
    restart: restart
  };

  renderAt(0);
  document.documentElement.setAttribute("data-animation-ready", "true");

  if (autoplay && (!reducedMotion || captureMode)) {
    window.setTimeout(function () {
      restart();
    }, 120);
  }
})();
