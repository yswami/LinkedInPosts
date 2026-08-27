(function () {
  "use strict";

  var form = document.getElementById("explanation-form");
  var rangeInput = document.getElementById("include-range");
  var driversInput = document.getElementById("include-drivers");
  var decisionInput = document.getElementById("include-decision");
  var status = document.getElementById("decision-status");
  var title = document.getElementById("decision-title");
  var completeness = document.getElementById("completeness");
  var confidence = document.getElementById("confidence-value");
  var alertText = document.getElementById("alert-text");
  var missingList = document.getElementById("missing-list");
  var panel = document.getElementById("explanation-decision");
  var copyButton = document.getElementById("copy-alert");
  var copyStatus = document.getElementById("copy-status");

  function selectedFraming() {
    var input = form.querySelector('input[name="framing"]:checked');
    return input ? input.value : "exact";
  }

  function setFraming(value) {
    var input = form.querySelector('input[name="framing"][value="' + value + '"]');
    if (input) input.checked = true;
  }

  function appendSentence(parts, sentence) {
    parts.push(sentence);
  }

  function buildAlert(framing) {
    var parts = [];

    if (framing === "forecast") {
      appendSentence(parts, "Current EAC is $88.0M against an $80.0M budget—a forecast variance of +$8.0M.");
    } else if (framing === "vague") {
      appendSentence(parts, "Project Meridian may possibly overrun by around $8.0M, but the result is uncertain.");
    } else {
      appendSentence(parts, "Project Meridian will overrun by exactly $8.0M.");
    }

    if (rangeInput.checked) {
      appendSentence(parts, "Supported planning scenarios currently span $85.0M–$92.0M; this is a scenario range, not a statistical confidence interval.");
    }

    if (driversInput.checked) {
      appendSentence(parts, "Confidence is medium. Actuals are current through 24 Aug; the main sensitivities are pending change treatment and the remaining-work estimate.");
    }

    if (decisionInput.checked) {
      appendSentence(parts, "The governed classification remains ESCALATE. Finance review is required by Friday before any recovery action.");
    }

    return parts.join(" ");
  }

  function addAssessment(text, complete) {
    var item = document.createElement("li");
    item.textContent = text;
    if (complete) item.className = "complete";
    missingList.appendChild(item);
  }

  function evaluate() {
    var framing = selectedFraming();
    var framedAsForecast = framing === "forecast";
    var score = Number(framedAsForecast) + Number(rangeInput.checked) + Number(driversInput.checked) + Number(decisionInput.checked);

    completeness.textContent = score + " / 4";
    confidence.textContent = driversInput.checked ? "Medium" : "No";
    alertText.textContent = buildAlert(framing);

    if (framing === "exact") {
      status.textContent = "FALSE PRECISION";
      status.className = "decision-status false-precision";
      title.textContent = "The wording claims more certainty than the evidence supports.";
    } else if (framing === "vague") {
      status.textContent = "VAGUE";
      status.className = "decision-status vague";
      title.textContent = "Caution without structure is still difficult to act on.";
    } else if (score === 4) {
      status.textContent = "DECISION-READY";
      status.className = "decision-status ready";
      title.textContent = "The uncertainty is visible, bounded, and connected to a decision.";
    } else {
      status.textContent = "INCOMPLETE";
      status.className = "decision-status incomplete";
      title.textContent = "The forecast is labeled correctly, but important decision context is missing.";
    }

    missingList.replaceChildren();
    addAssessment(framedAsForecast ? "The EAC is identified as a forecast." : "Label the EAC as a current forecast, not a certain outcome.", framedAsForecast);
    addAssessment(rangeInput.checked ? "The supported scenario range is disclosed." : "Show a governed scenario range—or state that none exists.", rangeInput.checked);
    addAssessment(driversInput.checked ? "Confidence drivers and evidence freshness are disclosed." : "Name evidence freshness and the assumptions that can move EAC.", driversInput.checked);
    addAssessment(decisionInput.checked ? "The stable policy status and next decision are stated." : "State the governed status, decision owner, and timing.", decisionInput.checked);
  }

  function render(options) {
    evaluate();
    copyStatus.textContent = "";
    if (options && options.focus) {
      panel.focus({ preventScroll: true });
      panel.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }

  function applyPreset(values) {
    setFraming(values.framing);
    rangeInput.checked = values.range;
    driversInput.checked = values.drivers;
    decisionInput.checked = values.decision;
    render({ focus: true });
  }

  function fallbackCopy(text) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    var copied = document.execCommand("copy");
    textarea.remove();
    return copied ? Promise.resolve() : Promise.reject(new Error("Copy failed"));
  }

  function copyAlert() {
    var text = alertText.textContent;
    var operation = navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(text) : fallbackCopy(text);
    operation.then(function () {
      copyStatus.textContent = "Copied";
    }).catch(function () {
      copyStatus.textContent = "Copy unavailable—select the alert text manually";
    });
  }

  form.addEventListener("input", function () { render(); });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    render({ focus: true });
  });
  form.addEventListener("reset", function () {
    window.setTimeout(function () { render(); }, 0);
  });

  document.getElementById("point-preset").addEventListener("click", function () {
    applyPreset({ framing: "exact", range: false, drivers: false, decision: false });
  });
  document.getElementById("vague-preset").addEventListener("click", function () {
    applyPreset({ framing: "vague", range: false, drivers: false, decision: false });
  });
  document.getElementById("ready-preset").addEventListener("click", function () {
    applyPreset({ framing: "forecast", range: true, drivers: true, decision: true });
  });
  copyButton.addEventListener("click", copyAlert);

  render();
})();
