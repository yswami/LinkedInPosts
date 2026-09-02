(function () {
  "use strict";

  var stages = ["gather", "recommend", "decide", "execute", "monitor"];
  var stageLabels = {
    gather: "Gather evidence",
    recommend: "Analyse and recommend",
    decide: "Decide the exception",
    execute: "Execute the decision",
    monitor: "Monitor the outcome"
  };
  var actorLabels = { human: "Human", agent: "Agent", joint: "Shared review", gated: "Agent after approval" };
  var presets = {
    full: { gather: "agent", recommend: "agent", decide: "agent", execute: "agent", monitor: "agent" },
    human: { gather: "human", recommend: "human", decide: "human", execute: "human", monitor: "human" },
    bounded: { gather: "agent", recommend: "agent", decide: "human", execute: "gated", monitor: "joint" }
  };

  var form = document.getElementById("autonomy-form");
  var result = document.getElementById("envelope-result");
  var resultStatus = document.getElementById("result-status");
  var resultTitle = document.getElementById("result-title");
  var resultCopy = document.getElementById("result-copy");
  var fitScore = document.getElementById("fit-score");
  var mismatchCount = document.getElementById("mismatch-count");
  var recommendedList = document.getElementById("recommended-list");
  var envelopeOutput = document.getElementById("envelope-output");
  var copyButton = document.getElementById("copy-envelope");
  var copyStatus = document.getElementById("copy-status");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var buttons = {
    full: document.getElementById("load-full"),
    human: document.getElementById("load-human"),
    bounded: document.getElementById("load-bounded")
  };

  function value(name) {
    var checked = form.querySelector('[name="' + name + '"]:checked');
    return checked ? checked.value : "";
  }

  function selectedStage(name) {
    return form.elements[name].value;
  }

  function recommendation() {
    var evidence = value("evidence");
    var requiresHuman = value("impact") === "high" || value("reversible") !== "yes" || value("policy") !== "covered" || value("novelty") !== "familiar";
    return {
      gather: evidence === "complete" ? "agent" : "human",
      recommend: evidence === "complete" ? "agent" : "joint",
      decide: requiresHuman ? "human" : "agent",
      execute: requiresHuman ? "gated" : "agent",
      monitor: "joint"
    };
  }

  function updateButtons(active) {
    Object.keys(buttons).forEach(function (key) {
      buttons[key].classList.toggle("active", key === active);
      buttons[key].setAttribute("aria-pressed", String(key === active));
    });
  }

  function setPreset(name, focus) {
    stages.forEach(function (stage) { form.elements[stage].value = presets[name][stage]; });
    updateButtons(name);
    render(focus);
  }

  function render(focus) {
    var rec = recommendation();
    var mismatches = stages.filter(function (stage) { return selectedStage(stage) !== rec[stage]; });
    var score = Math.round(((stages.length - mismatches.length) / stages.length) * 100);
    var allHuman = stages.every(function (stage) { return selectedStage(stage) === "human"; });
    var allAgent = stages.every(function (stage) { return selectedStage(stage) === "agent"; });
    var incomplete = value("evidence") === "incomplete";

    fitScore.textContent = score + "% fit";
    mismatchCount.textContent = mismatches.length + (mismatches.length === 1 ? " change" : " changes");
    recommendedList.replaceChildren();

    stages.forEach(function (stage) {
      var row = form.querySelector('[data-stage-row="' + stage + '"]');
      var matched = selectedStage(stage) === rec[stage];
      row.classList.toggle("match", matched);
      row.classList.toggle("mismatch", !matched);
      var item = document.createElement("li");
      var label = document.createElement("strong");
      var actor = document.createElement("span");
      label.textContent = stageLabels[stage];
      actor.textContent = actorLabels[rec[stage]];
      item.append(label, actor);
      recommendedList.appendChild(item);
    });

    if (incomplete) {
      resultStatus.textContent = "STOP — EVIDENCE GAP";
      resultStatus.className = "result-status stop";
      resultTitle.textContent = "Autonomy cannot compensate for missing decision evidence.";
      resultCopy.textContent = "The agent may retrieve or request evidence, but recommendation, decision and execution should pause until the required facts are available.";
    } else if (allAgent && mismatches.length) {
      resultStatus.textContent = "OVER-DELEGATED";
      resultStatus.className = "result-status stop";
      resultTitle.textContent = "The agent has more authority than this decision context supports.";
      resultCopy.textContent = "Evidence gathering and recommendation can be automated. The high-impact exception still needs a named human decision and a gated execution.";
    } else if (allHuman) {
      resultStatus.textContent = "UNDER-DELEGATED";
      resultStatus.className = "result-status assist";
      resultTitle.textContent = "The control is conservative, but the allocation leaves useful automation on the table.";
      resultCopy.textContent = "The agent can reduce coordination load by gathering evidence, analysing the exception and monitoring the outcome without owning the material decision.";
    } else if (mismatches.length === 0) {
      resultStatus.textContent = "READY TO TEST";
      resultStatus.className = "result-status ready";
      resultTitle.textContent = "The allocation matches the current consequence and exception profile.";
      resultCopy.textContent = "Test the envelope with realistic errors, time pressure, override cases and human response times before expanding autonomy.";
    } else {
      resultStatus.textContent = "REDESIGN THE BOUNDARY";
      resultStatus.className = "result-status assist";
      resultTitle.textContent = "The allocation is partly bounded, but some stages still exceed—or underuse—the available authority.";
      resultCopy.textContent = "Compare the highlighted stages with the recommended envelope and document why any intentional exception is acceptable.";
    }

    envelopeOutput.value = [
      "AUTONOMY ENVELOPE — INVOICE EXCEPTION",
      "Context: impact=" + value("impact") + "; reversibility=" + value("reversible") + "; evidence=" + value("evidence") + "; policy=" + value("policy") + "; novelty=" + value("novelty") + ".",
      "",
      stages.map(function (stage) { return stageLabels[stage] + ": " + actorLabels[rec[stage]] + "."; }).join("\n"),
      "",
      "Control: the agent must stop and escalate when evidence is incomplete, the authority threshold is exceeded, policy conflicts, or the exception is novel.",
      "Record: retain the evidence used, recommendation, human decision, executed action, timestamp, and override reason."
    ].join("\n");

    if (focus) {
      result.focus({ preventScroll: true });
      result.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
    }
  }

  Object.keys(buttons).forEach(function (key) { buttons[key].addEventListener("click", function () { setPreset(key, true); }); });
  form.addEventListener("input", function () { updateButtons(""); render(false); });
  form.addEventListener("submit", function (event) { event.preventDefault(); render(true); });
  form.addEventListener("reset", function () {
    window.setTimeout(function () {
      ["impact", "reversible", "evidence", "policy", "novelty"].forEach(function (name) {
        var preferred = { impact: "high", reversible: "partial", evidence: "complete", policy: "exception", novelty: "novel" }[name];
        form.querySelector('[name="' + name + '"][value="' + preferred + '"]').checked = true;
      });
      setPreset("full", false);
    }, 0);
  });

  copyButton.addEventListener("click", function () {
    navigator.clipboard.writeText(envelopeOutput.value).then(function () {
      copyStatus.textContent = "Copied";
      window.setTimeout(function () { copyStatus.textContent = ""; }, 2200);
    }).catch(function () {
      envelopeOutput.select();
      document.execCommand("copy");
      copyStatus.textContent = "Copied";
    });
  });

  render(false);
}());
