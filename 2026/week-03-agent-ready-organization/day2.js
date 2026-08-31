(function () {
  "use strict";

  var dimensions = ["trigger", "evidence", "recommend", "decide", "execute", "limit", "escalate", "record"];
  var gapCopy = {
    trigger: "What precise event starts this decision process?",
    evidence: "Which records and risk signals must be present and current?",
    recommend: "Who prepares the evidence and recommends an action?",
    decide: "Who has the formal right to choose the action?",
    execute: "Who or what system may perform the approved action?",
    limit: "What monetary, percentage, policy, and risk boundaries constrain authority?",
    escalate: "Who decides when the normal rule conflicts with the required outcome?",
    record: "What evidence, reason, approver, action, outcome, and rule version are retained?"
  };
  var form = document.getElementById("decision-form");
  var resultPanel = document.getElementById("result-panel");
  var score = document.getElementById("score");
  var scoreFill = document.getElementById("score-fill");
  var scoreCopy = document.getElementById("score-copy");
  var heroScore = document.getElementById("hero-decision-score");
  var heroCopy = document.getElementById("hero-decision-copy");
  var resultStatus = document.getElementById("result-status");
  var resultTitle = document.getElementById("result-title");
  var agentResponse = document.getElementById("agent-response");
  var gaps = document.getElementById("gaps");
  var gapCount = document.getElementById("gap-count");
  var ledger = document.getElementById("decision-ledger");
  var raciButton = document.getElementById("load-raci");
  var contractButton = document.getElementById("load-contract");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function stateFor(name) { var selected = form.querySelector('input[name="' + name + '"]:checked'); return selected ? selected.value : "missing"; }
  function setState(name, value) { var input = form.querySelector('input[name="' + name + '"][value="' + value + '"]'); if (input) input.checked = true; }
  function updatePreset(active) {
    raciButton.classList.toggle("active", active === "raci");
    contractButton.classList.toggle("active", active === "contract");
    raciButton.setAttribute("aria-pressed", String(active === "raci"));
    contractButton.setAttribute("aria-pressed", String(active === "contract"));
  }
  function render(options) {
    var missing = dimensions.filter(function (name) { return stateFor(name) !== "defined"; });
    var percentage = Math.round(((dimensions.length - missing.length) / dimensions.length) * 100);
    score.textContent = percentage + "%";
    heroScore.textContent = percentage + "%";
    scoreFill.style.width = percentage + "%";
    gaps.replaceChildren();
    missing.forEach(function (name) { var item = document.createElement("li"); item.textContent = gapCopy[name]; gaps.appendChild(item); });
    gapCount.textContent = missing.length + (missing.length === 1 ? " gap" : " gaps");
    ledger.hidden = percentage < 100;
    dimensions.forEach(function (name) { var fieldset = form.querySelector('[data-dimension="' + name + '"]'); if (fieldset) fieldset.classList.toggle("defined", stateFor(name) === "defined"); });

    if (percentage < 50) {
      resultStatus.textContent = "ROLE MAP ONLY"; resultStatus.className = "result-status stop";
      resultTitle.textContent = "Do not let the agent infer authority from a letter.";
      agentResponse.textContent = "“Procurement is marked Accountable, but the matrix does not establish who may accept the variance or release payment. Please provide the decision rule and authority boundary.”";
      scoreCopy.textContent = "The RACI identifies participants, not the operating rule.";
      heroCopy.textContent = "The operating rule is missing";
    } else if (percentage < 100) {
      resultStatus.textContent = "ASSIST AND ESCALATE"; resultStatus.className = "result-status assist";
      resultTitle.textContent = "The agent can prepare the defined parts, but must stop at the remaining gap.";
      agentResponse.textContent = "“I can follow the defined steps and assemble the available evidence. I will not infer the missing authority, limit, escalation, or record requirement.”";
      scoreCopy.textContent = "Part of the decision is executable; hidden judgement remains.";
      heroCopy.textContent = "Some decision mechanics remain hidden";
    } else {
      resultStatus.textContent = "READY TO TEST"; resultStatus.className = "result-status ready";
      resultTitle.textContent = "The decision has named interfaces, limits, and a retained record.";
      agentResponse.textContent = "“The variance crosses the routing threshold. I assembled the required evidence and routed a recommendation to the Procurement Manager. Payment remains blocked; any control override requires Finance and business-owner approval.”";
      scoreCopy.textContent = "The contract is complete enough for controlled scenario testing—not autonomous release.";
      heroCopy.textContent = "Complete enough for controlled testing";
    }
    if (options && options.focus) { resultPanel.focus({ preventScroll: true }); resultPanel.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" }); }
  }
  function loadPreset(value, options) { dimensions.forEach(function (name) { setState(name, value); }); updatePreset(value === "defined" ? "contract" : "raci"); render(options); }
  form.addEventListener("input", function () { updatePreset("custom"); render(); });
  form.addEventListener("submit", function (event) { event.preventDefault(); render({ focus: true }); });
  form.addEventListener("reset", function () { window.setTimeout(function () { loadPreset("missing"); }, 0); });
  raciButton.addEventListener("click", function () { loadPreset("missing", { focus: true }); });
  contractButton.addEventListener("click", function () { loadPreset("defined", { focus: true }); });
  render();
})();
