(function () {
  "use strict";

  var VALIDATED_VARIANCE = 8;
  var form = document.getElementById("materiality-form");
  var contingencyInput = document.getElementById("contingency");
  var contingencyOutput = document.getElementById("contingency-value");
  var monthsInput = document.getElementById("months");
  var monthsOutput = document.getElementById("months-value");
  var status = document.getElementById("decision-status");
  var title = document.getElementById("decision-title");
  var residualOutput = document.getElementById("residual-exposure");
  var scoreOutput = document.getElementById("policy-score");
  var routeOutput = document.getElementById("route-text");
  var reasons = document.getElementById("decision-reasons");
  var panel = document.getElementById("materiality-decision");

  function selected(name) {
    var input = form.querySelector('input[name="' + name + '"]:checked');
    return input ? input.value : "";
  }

  function setSelected(name, value) {
    var input = form.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (input) input.checked = true;
  }

  function money(value) {
    return "$" + value.toFixed(1) + "M";
  }

  function classify() {
    var contingency = Number(contingencyInput.value);
    var cycles = Number(selected("cycles"));
    var months = Number(monthsInput.value);
    var consequence = selected("consequence");
    var residual = Math.max(0, VALIDATED_VARIANCE - contingency);
    var score = 0;
    var explanation = [];

    if (residual >= 5) score += 2;
    else if (residual > 0) score += 1;

    if (cycles >= 3) score += 2;
    else if (cycles === 2) score += 1;

    if (months <= 3) score += 2;
    else if (months <= 6) score += 1;

    if (consequence === "contractual") score += 2;
    else if (consequence === "critical") score += 1;

    contingencyOutput.textContent = money(contingency);
    monthsOutput.textContent = months + (months === 1 ? " month" : " months");
    residualOutput.textContent = money(residual);
    scoreOutput.textContent = score + " / 8";

    if (residual === 0) explanation.push("The fictional policy-recognized contingency covers the validated variance.");
    else explanation.push(money(residual) + " remains after the policy-recognized contingency.");

    explanation.push(cycles === 1 ? "This is the first affected forecast cycle." : "The variance has persisted for " + (cycles >= 3 ? "three or more" : "two") + " forecast cycles.");
    explanation.push(months <= 3 ? "Only " + months + (months === 1 ? " month remains" : " months remain") + " in the decision window." : months + " months remain in the decision window.");

    if (consequence === "contractual") explanation.push("A contractual or regulated commitment may be affected.");
    else if (consequence === "critical") explanation.push("The consequence is classified as business-critical.");
    else explanation.push("No critical, contractual, or regulatory consequence is identified in this scenario.");

    if (consequence === "contractual" || score >= 5) {
      status.textContent = "ESCALATE";
      status.className = "decision-status escalate";
      title.textContent = "Interrupt the policy-defined decision makers now.";
      routeOutput.textContent = "Notify the project manager and the policy-defined sponsor, portfolio, finance, or control roles.";
    } else if (score >= 2) {
      status.textContent = "REVIEW";
      status.className = "decision-status review";
      title.textContent = "Request a focused financial review.";
      routeOutput.textContent = "Route to the project manager and project financial controller before broader escalation.";
    } else {
      status.textContent = "MONITOR";
      status.className = "decision-status monitor";
      title.textContent = "Record the signal without a broad interruption.";
      routeOutput.textContent = "Record and re-evaluate in the next forecast cycle.";
    }

    reasons.replaceChildren();
    explanation.forEach(function (text) {
      var item = document.createElement("li");
      item.textContent = text;
      reasons.appendChild(item);
    });
  }

  function render(options) {
    classify();
    if (options && options.focus) {
      panel.focus({ preventScroll: true });
      panel.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }

  function applyPreset(values) {
    contingencyInput.value = String(values.contingency);
    monthsInput.value = String(values.months);
    setSelected("cycles", String(values.cycles));
    setSelected("consequence", values.consequence);
    render({ focus: true });
  }

  form.addEventListener("input", function () { render(); });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    render({ focus: true });
  });
  form.addEventListener("reset", function () {
    window.setTimeout(function () { render(); }, 0);
  });

  document.getElementById("monitor-preset").addEventListener("click", function () {
    applyPreset({ contingency: 8.5, cycles: 1, months: 12, consequence: "standard" });
  });
  document.getElementById("review-preset").addEventListener("click", function () {
    applyPreset({ contingency: 5, cycles: 2, months: 8, consequence: "critical" });
  });
  document.getElementById("escalate-preset").addEventListener("click", function () {
    applyPreset({ contingency: 1, cycles: 3, months: 2, consequence: "contractual" });
  });

  render();
})();
