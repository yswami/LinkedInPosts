(function () {
  "use strict";

  var gates = [
    {
      kicker: "Is the +$8M signal real?",
      title: "Validate the evidence before naming the overrun.",
      body: "Reconcile actual-cost freshness, 900 pending contractor hours, a $6M commitment, currency treatment, and forecast version.",
      result: "VALIDATED SIGNAL · EAC $88M · +10%",
      evidence: [
        ["Input", "Budget $80M · Actuals $46M · ETC $42M"],
        ["Control", "Deterministic reconciliation"],
        ["Agent role", "Surface gaps; do not invent missing records"]
      ]
    },
    {
      kicker: "Should the validated signal interrupt someone?",
      title: "Apply governed materiality and routing policy.",
      body: "Combine the +10% variance with cash timing, strategic priority, forecast persistence, and the accountable role. A percentage alone is not an escalation policy.",
      result: "ESCALATE · Portfolio finance + sponsor review",
      evidence: [
        ["Signal", "+$8M · +10% validated variance"],
        ["Policy", "Materiality + timing + priority + persistence"],
        ["Agent role", "Classify using approved rules; preserve policy version"]
      ]
    },
    {
      kicker: "Can the agent explain the forecast honestly?",
      title: "Separate observed facts from planning scenarios.",
      body: "Keep the working EAC visible, show the supported scenario range, name confidence drivers and evidence freshness, and state the next decision—without presenting a scenario as a statistical promise.",
      result: "DECISION-READY EXPLANATION · No false precision",
      evidence: [
        ["Observed", "Actuals $46M · governed source timestamp"],
        ["Scenario", "Working EAC $88M with supported alternatives"],
        ["Agent role", "Explain assumptions, range drivers and next decision"]
      ]
    },
    {
      kicker: "What happens outside Project Meridian?",
      title: "Simulate the portfolio blast radius.",
      body: "Moving two shared architects improves Meridian by $4M, but raises Beacon EAC by $2.5M, delays it 18 days, and moves a $12M milestone into the next quarter. Compare the phased-scope alternative on the same metrics.",
      result: "PORTFOLIO REVIEW READY · Alternative compared",
      evidence: [
        ["Local view", "Meridian $84M · 8 days late"],
        ["Portfolio view", "Net EAC –$1.5M · $12M timing shift"],
        ["Alternative", "Net EAC –$2.5M · Beacon unchanged"]
      ]
    },
    {
      kicker: "Who gets to press Apply?",
      title: "Define authority for each consequential action.",
      body: "Let the agent prepare the evidence, recommendation and approval packet. Require authorized approval and transaction controls before it changes forecasts, resources, milestones, or committed communications.",
      result: "PREPARE FOR APPROVAL · Action-specific authority",
      evidence: [
        ["Advisory", "Read, calculate, explain, simulate and draft"],
        ["Consequential", "Forecast, resource, milestone and decision writes"],
        ["Execution", "Approve · validate again · audit · recover"]
      ]
    }
  ];

  var gateIndex = 0;
  var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-gate]"));
  var gatePanel = document.getElementById("gate-panel");
  var previousGate = document.getElementById("previous-gate");
  var nextGate = document.getElementById("next-gate");

  function renderGate(index, options) {
    gateIndex = Math.max(0, Math.min(gates.length - 1, index));
    var gate = gates[gateIndex];
    document.getElementById("gate-number").textContent = "Gate " + (gateIndex + 1);
    document.getElementById("gate-kicker").textContent = gate.kicker;
    document.getElementById("gate-title").textContent = gate.title;
    document.getElementById("gate-body").textContent = gate.body;
    document.querySelector("#gate-result strong").textContent = gate.result;
    document.getElementById("gate-evidence").innerHTML = gate.evidence.map(function (item) {
      return "<div><dt>" + item[0] + "</dt><dd>" + item[1] + "</dd></div>";
    }).join("");

    tabs.forEach(function (tab, tabIndex) {
      tab.setAttribute("aria-selected", String(tabIndex === gateIndex));
      tab.tabIndex = tabIndex === gateIndex ? 0 : -1;
    });
    previousGate.disabled = gateIndex === 0;
    nextGate.textContent = gateIndex === gates.length - 1 ? "Set the action boundary" : "Continue to " + tabs[gateIndex + 1].textContent.trim().replace(/^\d/, "").trim().toLowerCase();

    if (options && options.focus) gatePanel.focus();
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () { renderGate(index, { focus: true }); });
    tab.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      var direction = event.key === "ArrowRight" ? 1 : -1;
      var target = (index + direction + tabs.length) % tabs.length;
      renderGate(target);
      tabs[target].focus();
    });
  });

  previousGate.addEventListener("click", function () { renderGate(gateIndex - 1, { focus: true }); });
  nextGate.addEventListener("click", function () {
    if (gateIndex === gates.length - 1) {
      document.getElementById("boundary").scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("advisory-preset").focus({ preventScroll: true });
    } else {
      renderGate(gateIndex + 1, { focus: true });
    }
  });

  var authorityForm = document.getElementById("authority-form");
  var authorityDecision = document.getElementById("authority-decision");
  var writeIds = ["update-forecast", "move-resources", "change-milestone"];

  function checked(id) { return document.getElementById(id).checked; }
  function setChecked(id, value) { document.getElementById(id).checked = value; }

  function selectedWriteLabels() {
    var labels = {
      "update-forecast": "update the working forecast",
      "move-resources": "reassign the shared architects",
      "change-milestone": "change milestone and cash-timing dates"
    };
    return writeIds.filter(checked).map(function (id) { return labels[id]; });
  }

  function renderAuthority(options) {
    var writes = selectedWriteLabels();
    var approval = checked("approval-recorded");
    var controls = checked("transaction-controls");
    var packet = checked("prepare-packet");
    var status = document.getElementById("authority-status");
    var title = document.getElementById("authority-result-title");
    var text = document.getElementById("authority-text");
    var reasons = document.getElementById("authority-reasons");
    var ladder = Array.prototype.slice.call(document.querySelectorAll(".action-ladder span"));

    status.className = "decision-status";
    ladder.forEach(function (item, index) {
      item.className = index < 4 ? "complete" : "";
    });

    if (writes.length === 0) {
      status.textContent = "PREPARE FOR APPROVAL";
      status.classList.add("approval-ready");
      title.textContent = "The agent may complete the analysis, but it must not commit the decision.";
      text.textContent = packet
        ? "The agent may reconcile evidence, apply the approved materiality policy, explain uncertainty, compare portfolio scenarios, recommend an option, and prepare an approval packet. It may not update forecasts, reassign resources, change milestones, or communicate a committed portfolio decision."
        : "No consequential writes are selected. Enable the approval packet so the agent can turn the completed analysis into a reviewable next step.";
      reasons.innerHTML = "<li>Keep the current mode read-only.</li><li>Route the recommended option to the authorized portfolio decision owner.</li><li>Grant any later execution permission only for the approved action and scope.</li>";
      ladder[4].className = "current";
    } else if (!approval || !controls) {
      status.textContent = "STOP EXECUTION";
      status.classList.add("stop-execution");
      title.textContent = "The selected write actions cross the agent’s current authority boundary.";
      text.textContent = "The agent is attempting to " + writes.join(", ") + ". Do not execute: " + (!approval ? "authorized portfolio approval is missing" : "transaction validation, audit, and recovery controls are missing") + ". Preserve the recommendation as a draft and route it for control completion.";
      reasons.innerHTML = (!approval ? "<li>Record approval from an owner with authority across every affected project and financial action.</li>" : "") + (!controls ? "<li>Revalidate current records, restrict the transaction scope, record an audit trail, and provide correction or rollback.</li>" : "") + "<li>Do not infer permission from model confidence or a persuasive recommendation.</li>";
      ladder[4].className = "current";
    } else {
      status.textContent = "GOVERNED EXECUTION";
      status.classList.add("governed-execution");
      title.textContent = "The approved actions may execute within the recorded scope.";
      text.textContent = "Authorized portfolio approval and transaction controls are present. The agent may " + writes.join(", ") + " within the approved project, amount, resource, date, and time limits. Revalidate immediately before commit, log every change, report exceptions, and stop if the approved scope no longer matches current data.";
      reasons.innerHTML = "<li>Bind execution to the exact approved action, values, projects and validity period.</li><li>Revalidate immediately before commit and stop on changed assumptions.</li><li>Log the actor, policy, approval, before/after values and recovery outcome.</li>";
      ladder[4].className = "complete";
      ladder[5].className = "current";
    }

    if (options && options.focus) authorityDecision.focus();
  }

  authorityForm.addEventListener("submit", function (event) {
    event.preventDefault();
    renderAuthority({ focus: true });
  });
  authorityForm.addEventListener("change", function () { renderAuthority(); });
  authorityForm.addEventListener("reset", function () { window.setTimeout(renderAuthority, 0); });

  document.getElementById("advisory-preset").addEventListener("click", function () {
    setChecked("prepare-packet", true);
    writeIds.forEach(function (id) { setChecked(id, false); });
    setChecked("approval-recorded", false);
    setChecked("transaction-controls", false);
    renderAuthority({ focus: true });
  });

  document.getElementById("unsafe-preset").addEventListener("click", function () {
    setChecked("prepare-packet", true);
    setChecked("update-forecast", true);
    setChecked("move-resources", true);
    setChecked("change-milestone", true);
    setChecked("approval-recorded", false);
    setChecked("transaction-controls", false);
    renderAuthority({ focus: true });
  });

  document.getElementById("governed-preset").addEventListener("click", function () {
    setChecked("prepare-packet", true);
    setChecked("update-forecast", true);
    setChecked("move-resources", true);
    setChecked("change-milestone", true);
    setChecked("approval-recorded", true);
    setChecked("transaction-controls", true);
    renderAuthority({ focus: true });
  });

  document.getElementById("copy-authority").addEventListener("click", function () {
    var copyStatus = document.getElementById("copy-status");
    var value = document.getElementById("authority-status").textContent + "\n\n" + document.getElementById("authority-text").textContent;
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      copyStatus.textContent = "Copy is unavailable in this browser.";
      return;
    }
    navigator.clipboard.writeText(value).then(function () {
      copyStatus.textContent = "Authority statement copied.";
    }).catch(function () {
      copyStatus.textContent = "Copy failed. Select the statement manually.";
    });
  });

  renderGate(0);
  renderAuthority();
}());
