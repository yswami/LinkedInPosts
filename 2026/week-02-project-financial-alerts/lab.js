(function () {
  "use strict";

  var BUDGET = 80;
  var REPORTED_EAC = 88;
  var EVIDENCE = {
    timecards: 0.171,
    commitments: 6,
    currency: 1.2
  };

  var form = document.getElementById("evidence-form");
  var ageInput = document.getElementById("actuals-age");
  var ageOutput = document.getElementById("actuals-age-value");
  var status = document.getElementById("decision-status");
  var title = document.getElementById("decision-title");
  var eacRange = document.getElementById("eac-range");
  var varianceRange = document.getElementById("variance-range");
  var readinessCount = document.getElementById("readiness-count");
  var reasons = document.getElementById("decision-reasons");
  var panel = document.getElementById("decision-panel");
  var reconcileButton = document.getElementById("reconcile");

  function selected(name) {
    var input = form.querySelector('input[name="' + name + '"]:checked');
    return input ? input.value : "unknown";
  }

  function setSelected(name, value) {
    var input = form.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (input) input.checked = true;
  }

  function money(value, includeSign) {
    var sign = includeSign && value > 0 ? "+" : "";
    return sign + "$" + value.toFixed(1) + "M";
  }

  function rangeText(low, high, includeSign) {
    if (Math.abs(low - high) < 0.005) return money(low, includeSign);
    return money(low, includeSign) + "–" + money(high, includeSign);
  }

  function contribution(state, amount) {
    if (state === "included") return { low: 0, high: 0 };
    if (state === "not-included") return { low: amount, high: amount };
    return { low: 0, high: amount };
  }

  function markCheck(name, resolved) {
    var item = document.querySelector('[data-check="' + name + '"]');
    if (!item) return;
    item.classList.toggle("resolved", resolved);
    item.querySelector("span").textContent = resolved ? "✓" : "○";
  }

  function render(options) {
    var age = Number(ageInput.value);
    var states = {
      timecards: selected("timecards"),
      commitments: selected("commitments"),
      currency: selected("currency")
    };
    var additions = Object.keys(EVIDENCE).map(function (key) {
      return contribution(states[key], EVIDENCE[key]);
    });
    var lowEac = REPORTED_EAC + additions.reduce(function (sum, item) { return sum + item.low; }, 0);
    var highEac = REPORTED_EAC + additions.reduce(function (sum, item) { return sum + item.high; }, 0);
    var readiness = {
      freshness: age <= 24,
      timecards: states.timecards !== "unknown",
      commitments: states.commitments !== "unknown",
      currency: states.currency !== "unknown"
    };
    var resolved = Object.keys(readiness).filter(function (key) { return readiness[key]; }).length;
    var needsValidation = resolved < 4;
    var explanation = [];

    ageOutput.textContent = age + (age === 1 ? " hour" : " hours");
    eacRange.textContent = rangeText(lowEac, highEac, false);
    varianceRange.textContent = rangeText(lowEac - BUDGET, highEac - BUDGET, true);
    readinessCount.textContent = resolved + " of 4 resolved";
    Object.keys(readiness).forEach(function (key) { markCheck(key, readiness[key]); });

    if (!readiness.freshness) explanation.push("Actual costs are " + age + " hours old, beyond this experiment’s 24-hour readiness rule.");
    if (!readiness.timecards) explanation.push("The treatment of 900 pending contractor hours is unknown.");
    if (!readiness.commitments) explanation.push("The $6M commitment may be included in ETC or may represent additional exposure.");
    if (!readiness.currency) explanation.push("The $1.2M currency impact has not been reconciled with the forecast.");

    if (needsValidation) {
      status.textContent = "VALIDATE DATA";
      status.className = "decision-status provisional";
      title.textContent = "Do not call this a confirmed $8M overrun.";
      explanation.push("Issue a data-validation request with the financial range and unresolved evidence.");
    } else {
      status.textContent = "VALIDATED SIGNAL";
      status.className = "decision-status validated";
      title.textContent = "The financial signal is ready for policy evaluation.";
      explanation.push("The reconciled EAC is " + money(lowEac, false) + ", or " + money(lowEac - BUDGET, true) + " against budget.");
      explanation.push("Day 2 must determine whether that validated variance is material enough to alert.");
    }

    reasons.replaceChildren();
    explanation.forEach(function (text) {
      var item = document.createElement("li");
      item.textContent = text;
      reasons.appendChild(item);
    });

    if (options && options.focus) {
      panel.focus({ preventScroll: true });
      panel.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }

  form.addEventListener("input", function () { render(); });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    render({ focus: true });
  });
  form.addEventListener("reset", function () {
    window.setTimeout(function () { render(); }, 0);
  });

  reconcileButton.addEventListener("click", function () {
    ageInput.value = "8";
    setSelected("timecards", "not-included");
    setSelected("commitments", "included");
    setSelected("currency", "included");
    render({ focus: true });
  });

  render();
})();
