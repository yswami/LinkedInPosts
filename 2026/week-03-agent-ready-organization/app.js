(function () {
  "use strict";

  var dimensions = ["outcome", "owner", "threshold", "authority", "exception", "measure"];
  var gapCopy = {
    outcome: "Which outcome takes priority: control accuracy, payment speed, or supply continuity?",
    owner: "Which human role owns the final exception decision?",
    threshold: "What measurable rule defines a material discrepancy?",
    authority: "May the agent collect, recommend, route, approve, or release payment?",
    exception: "Who may override policy, using which evidence and approval?",
    measure: "How will correct routing, decision quality, and unauthorized action be measured?"
  };

  var form = document.getElementById("clarity-form");
  var resultPanel = document.getElementById("result-panel");
  var score = document.getElementById("score");
  var scoreFill = document.getElementById("score-fill");
  var scoreCopy = document.getElementById("score-copy");
  var resultStatus = document.getElementById("result-status");
  var resultTitle = document.getElementById("result-title");
  var agentResponse = document.getElementById("agent-response");
  var gaps = document.getElementById("gaps");
  var gapCount = document.getElementById("gap-count");
  var contract = document.getElementById("contract");
  var ambiguousButton = document.getElementById("load-ambiguous");
  var clarifiedButton = document.getElementById("load-clarified");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function stateFor(name) {
    var selected = form.querySelector('input[name="' + name + '"]:checked');
    return selected ? selected.value : "unclear";
  }

  function setState(name, value) {
    var input = form.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (input) input.checked = true;
  }

  function updatePresetButtons(active) {
    ambiguousButton.classList.toggle("active", active === "ambiguous");
    clarifiedButton.classList.toggle("active", active === "clarified");
    ambiguousButton.setAttribute("aria-pressed", String(active === "ambiguous"));
    clarifiedButton.setAttribute("aria-pressed", String(active === "clarified"));
  }

  function render(options) {
    var unresolved = dimensions.filter(function (name) { return stateFor(name) !== "defined"; });
    var definedCount = dimensions.length - unresolved.length;
    var percentage = Math.round((definedCount / dimensions.length) * 100);

    score.textContent = percentage + "%";
    scoreFill.style.width = percentage + "%";
    gaps.replaceChildren();
    unresolved.forEach(function (name) {
      var item = document.createElement("li");
      item.textContent = gapCopy[name];
      gaps.appendChild(item);
    });
    gapCount.textContent = unresolved.length + (unresolved.length === 1 ? " gap" : " gaps");
    contract.hidden = percentage < 100;

    if (percentage < 50) {
      resultStatus.textContent = "STOP AND CLARIFY";
      resultStatus.className = "result-status stop";
      resultTitle.textContent = "Do not ask the agent to choose between hidden priorities.";
      agentResponse.textContent = "“I found conflicting interpretations of the invoice exception. Please identify the accountable owner, materiality rule, permitted action, and exception path before I proceed.”";
      scoreCopy.textContent = "The instruction names an activity, but not an executable operating model.";
    } else if (percentage < 100) {
      resultStatus.textContent = "ASSIST ONLY";
      resultStatus.className = "result-status assist";
      resultTitle.textContent = "The agent can prepare evidence, but unresolved authority still requires a human.";
      agentResponse.textContent = "“I can assemble the purchase order, receipt, invoice variance, and supply-risk evidence. I will not select an approver or release payment until the remaining ownership and authority gaps are resolved.”";
      scoreCopy.textContent = "Some interfaces are usable, but the organization still depends on hidden judgement.";
    } else {
      resultStatus.textContent = "READY FOR CONTROLLED ASSISTANCE";
      resultStatus.className = "result-status ready";
      resultTitle.textContent = "The agent has a bounded role and a named human decision path.";
      agentResponse.textContent = "“The mismatch exceeds both illustrative routing thresholds. I assembled the supporting evidence and routed the commercial exception to the Procurement Manager. Payment remains blocked. A supply-continuity override requires Finance and business-owner approval.”";
      scoreCopy.textContent = "The work contract is legible enough to test controlled assistance—not autonomous payment.";
    }

    dimensions.forEach(function (name) {
      var fieldset = form.querySelector('[data-dimension="' + name + '"]');
      if (fieldset) fieldset.classList.toggle("defined", stateFor(name) === "defined");
    });

    if (options && options.focus) {
      resultPanel.focus({ preventScroll: true });
      resultPanel.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
    }
  }

  function loadPreset(value, options) {
    dimensions.forEach(function (name) { setState(name, value); });
    updatePresetButtons(value === "defined" ? "clarified" : "ambiguous");
    render(options);
  }

  form.addEventListener("input", function () {
    updatePresetButtons("custom");
    render();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    render({ focus: true });
  });

  form.addEventListener("reset", function () {
    window.setTimeout(function () { loadPreset("unclear"); }, 0);
  });

  ambiguousButton.addEventListener("click", function () { loadPreset("unclear", { focus: true }); });
  clarifiedButton.addEventListener("click", function () { loadPreset("defined", { focus: true }); });

  render();
})();
