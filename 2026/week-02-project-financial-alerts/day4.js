(function () {
  "use strict";

  var form = document.getElementById("blast-form");
  var beaconInput = document.getElementById("include-beacon");
  var netInput = document.getElementById("include-net-eac");
  var cashInput = document.getElementById("include-cash");
  var alternativeInput = document.getElementById("include-alternative");
  var status = document.getElementById("decision-status");
  var title = document.getElementById("decision-title");
  var netEac = document.getElementById("net-eac");
  var cashImpact = document.getElementById("cash-impact");
  var assessmentText = document.getElementById("assessment-text");
  var missingList = document.getElementById("missing-list");
  var panel = document.getElementById("blast-decision");
  var copyButton = document.getElementById("copy-assessment");
  var copyStatus = document.getElementById("copy-status");

  function addSentence(parts, sentence) {
    parts.push(sentence);
  }

  function buildAssessment() {
    var parts = ["Move two shared architects from Beacon to Meridian. Meridian EAC improves from $88.0M to $84.0M and forecast delay falls from 21 days to 8 days."];

    if (beaconInput.checked) {
      addSentence(parts, "Beacon EAC rises from $72.0M to $74.5M and go-live slips by 18 days.");
    }
    if (netInput.checked) {
      addSentence(parts, beaconInput.checked ? "Net portfolio EAC improves by $1.5M, not the $4.0M shown by the Meridian-only view." : "Net portfolio EAC cannot be calculated until affected projects are included.");
    }
    if (cashInput.checked) {
      addSentence(parts, "Beacon’s $12.0M acceptance milestone moves from the current quarter into the next.");
    }
    if (alternativeInput.checked) {
      addSentence(parts, "Compare a phased-scope option: Meridian EAC becomes $85.5M and 12 days late while Beacon and cash timing remain unchanged. Portfolio review is required; do not reallocate resources automatically.");
    }

    return parts.join(" ");
  }

  function addCheck(text, complete) {
    var item = document.createElement("li");
    item.textContent = text;
    if (complete) item.className = "complete";
    missingList.appendChild(item);
  }

  function evaluate() {
    var score = Number(beaconInput.checked) + Number(netInput.checked) + Number(cashInput.checked) + Number(alternativeInput.checked);
    var netIsValid = beaconInput.checked && netInput.checked;

    assessmentText.textContent = buildAssessment();
    netEac.textContent = netIsValid ? "–$1.5M" : netInput.checked ? "Cannot calculate" : "–$4.0M*";
    cashImpact.textContent = cashInput.checked ? "$12M next quarter" : "Not assessed";

    if (score === 0) {
      status.textContent = "LOCAL OPTIMUM";
      status.className = "decision-status local-optimum";
      title.textContent = "The recommendation improves Meridian by ignoring the rest of the portfolio.";
    } else if (score === 4 && netIsValid) {
      status.textContent = "PORTFOLIO REVIEW READY";
      status.className = "decision-status review-ready";
      title.textContent = "The trade-offs are visible enough for a governed portfolio decision.";
    } else if (beaconInput.checked && netIsValid) {
      status.textContent = "TRADE-OFF VISIBLE";
      status.className = "decision-status tradeoff-visible";
      title.textContent = "The direct cost trade-off is visible, but the decision context is incomplete.";
    } else {
      status.textContent = "INCOMPLETE SIMULATION";
      status.className = "decision-status incomplete-simulation";
      title.textContent = "Some consequences are visible, but the portfolio calculation is not decision-ready.";
    }

    missingList.replaceChildren();
    addCheck(beaconInput.checked ? "The dependent project’s cost and schedule effects are included." : "Include affected projects and shared-resource dependencies.", beaconInput.checked);
    addCheck(netIsValid ? "Local savings are recalculated as a net portfolio EAC effect." : "Calculate net portfolio EAC after all affected projects are included.", netIsValid);
    addCheck(cashInput.checked ? "Milestone cash timing is disclosed." : "Show whether recovery shifts billing, revenue, or cash milestones.", cashInput.checked);
    addCheck(alternativeInput.checked ? "An alternative is compared and approval is preserved." : "Compare an alternative and identify the decision authority.", alternativeInput.checked);
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
    beaconInput.checked = values.beacon;
    netInput.checked = values.net;
    cashInput.checked = values.cash;
    alternativeInput.checked = values.alternative;
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

  function copyAssessment() {
    var text = assessmentText.textContent;
    var operation = navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(text) : fallbackCopy(text);
    operation.then(function () {
      copyStatus.textContent = "Copied";
    }).catch(function () {
      copyStatus.textContent = "Copy unavailable—select the assessment text manually";
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

  document.getElementById("local-preset").addEventListener("click", function () {
    applyPreset({ beacon: false, net: false, cash: false, alternative: false });
  });
  document.getElementById("dependency-preset").addEventListener("click", function () {
    applyPreset({ beacon: true, net: true, cash: false, alternative: false });
  });
  document.getElementById("portfolio-preset").addEventListener("click", function () {
    applyPreset({ beacon: true, net: true, cash: true, alternative: true });
  });
  copyButton.addEventListener("click", copyAssessment);

  render();
})();
