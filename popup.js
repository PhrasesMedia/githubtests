// ======================================
// popup.js (BabyPay v4.2)
// • Internal calculations are MONTHLY.
// • Display can be toggled: weekly / fortnightly / monthly.
// • Government Pay labelled "21 weeks" but NOT reduced.
// • After-tax includes income tax + 2% Medicare levy.
// ======================================

let lastAction = null;      // 'babyPay' or 'return'
let lastReturnDays = null;  // stores days for return-to-work

// ---------- Frequency helpers ----------

// Read current frequency from the dropdown
function getCurrentFrequency() {
  const sel = document.getElementById("payFrequency");
  if (!sel) return "monthly";
  const val = sel.value;
  if (val === "weekly" || val === "fortnightly" || val === "monthly") return val;
  return "monthly";
}

// Convert a monthly amount into the selected frequency
function convertMonthlyToDisplay(monthlyAmount) {
  if (!monthlyAmount) return 0;
  const freq = getCurrentFrequency();

  if (freq === "weekly") {
    return (monthlyAmount * 12) / 52;
  }
  if (freq === "fortnightly") {
    return (monthlyAmount * 12) / 26;
  }

  return monthlyAmount; // monthly
}

// Get suffix based on frequency
function getFrequencySuffix() {
  const freq = getCurrentFrequency();
  if (freq === "weekly") return "/week";
  if (freq === "fortnightly") return "/fortnight";
  return "/month";
}

// Format a MONTHLY base amount for display
function formatCurrency(monthlyAmount) {
  const converted = convertMonthlyToDisplay(monthlyAmount);
  return (
    "$" +
    converted.toLocaleString(undefined, { maximumFractionDigits: 0 }) +
    getFrequencySuffix()
  );
}

// ---------- Tax helpers ----------

// Australian income tax brackets (annual → income tax only)
function calculateIncomeTax(annualIncome) {
  if (annualIncome <= 18200)            return 0;
  if (annualIncome <= 45000)            return (annualIncome - 18200) * 0.16;
  if (annualIncome <= 135000)           return 4288 + (annualIncome - 45000) * 0.30;
  if (annualIncome <= 190000)           return 31288 + (annualIncome - 135000) * 0.37;
  return 51688 + (annualIncome - 190000) * 0.45;
}

// Compute net *per month*
function getDisplayIncome(monthlyGross, showAfterTax) {
  if (!showAfterTax) return monthlyGross;

  const annualGross       = monthlyGross * 12;
  const incomeTaxAnnual   = calculateIncomeTax(annualGross);
  const medicareAnnual    = annualGross * 0.02;
  const totalTaxAnnual    = incomeTaxAnnual + medicareAnnual;
  const annualNet         = annualGross - totalTaxAnnual;

  return annualNet / 12; // still monthly internally
}

// ---------- Render breakdown cards ----------

function renderBreakdown(
  title,
  nonPrimaryDisplayMonthly,
  primaryDisplayMonthly,
  totalDisplayMonthly,
  note = "",
  showAfterTax = false,
  hasInfo = false,
  nonPrimaryGrossMonthly = 0,
  primaryGrossMonthly = 0
) {
  const labelType  = showAfterTax ? "Net" : "Gross";

  const makeIcon = (grossAmtMonthly, tip) => `
    <img
      src="information.png"
      alt="Info"
      title="${tip}"
      class="info-icon"
      data-value="${grossAmtMonthly}"
      style="width:14px;height:14px;cursor:pointer;margin-left:4px;vertical-align:middle;"
    />
  `;

  return `
    <div style="border:1px solid #ddd;padding:8px;margin:8px 0;border-radius:4px;text-align:left;">
      <div style="font-weight:bold;margin-bottom:6px;">${title}</div>

      <div style="font-size:12px;margin-bottom:4px;">
        Non-Primary (${labelType}): ${formatCurrency(nonPrimaryDisplayMonthly)}
        ${hasInfo ? makeIcon(nonPrimaryGrossMonthly, `${labelType} Non-Primary`) : ""}
      </div>

      <div style="font-size:12px;margin-bottom:4px;">
        Primary (${labelType}): ${formatCurrency(primaryDisplayMonthly)}
        ${hasInfo ? makeIcon(primaryGrossMonthly, `${labelType} Primary`) : ""}
      </div>

      <div style="font-size:12px;font-weight:bold;margin-bottom:4px;">
        Total: ${formatCurrency(totalDisplayMonthly)}
      </div>

      ${note ? `<div style="font-size:11px;color:#555;">${note}</div>` : ""}
    </div>
  `;
}

// ---------- Info-icon handler ----------

function attachInfoListeners() {
  document.querySelectorAll(".info-icon").forEach(icon => {
    icon.addEventListener("click", () => {
      const grossMonthly   = parseFloat(icon.dataset.value) || 0;
      const annual         = grossMonthly * 12;

      const incomeTaxAnnual = calculateIncomeTax(annual);
      const medicareAnnual  = annual * 0.02;
      const totalTaxAnnual  = incomeTaxAnnual + medicareAnnual;

      const incomeTaxMon = incomeTaxAnnual / 12;
      const medicareMon  = medicareAnnual / 12;
      const totalTaxMon  = totalTaxAnnual / 12;
      const netMon       = grossMonthly - totalTaxMon;

      const modal   = document.getElementById("userTaxModal");
      const content = document.getElementById("userTaxModalContent");

      if (!modal || !content) return;

      content.innerHTML = `
        <h3 style="margin:0 0 8px;font-size:15px;">Tax Breakdown (Estimate)</h3>
        <p style="margin:0;font-size:13px;line-height:1.4;">
          Gross: ${formatCurrency(grossMonthly)}<br>
          Income tax: ${formatCurrency(incomeTaxMon)}<br>
          Medicare (2%): ${formatCurrency(medicareMon)}<br>
          Total tax: ${formatCurrency(totalTaxMon)}<br>
          Net: ${formatCurrency(netMon)}
        </p>
      `;
      modal.style.display = "flex";
    });
  });

  const utm = document.getElementById("userTaxModal");
  if (utm) {
    utm.addEventListener("click", e => {
      if (e.target.id === "userTaxModal") utm.style.display = "none";
    });
  }
}

// ---------- Product reveal ----------

function revealProductSection() {
  const section = document.querySelector(".product-section");
  if (!section) return;

  setTimeout(() => {
    if (section.style.display === "none") {
      section.style.display = "inline-block";
      requestAnimationFrame(() => section.classList.add("visible"));
    } else {
      section.classList.add("visible");
    }
  }, 3000);
}

// ---------- Main calculators ----------

function calculateBabyPay() {
  lastAction = "babyPay";
  revealProductSection();

  const userGrossMonthly = parseFloat(document.getElementById("userIncome").value) || 0;
  const wifeGrossMonthly = parseFloat(document.getElementById("wifeIncome").value) || 0;
  const paidWeeks        = parseFloat(document.getElementById("paidWeeks").value) || 0;
  const showAfter        = document.getElementById("showAfterTax").checked;
  const payRate          = document.getElementById("fullPay").checked ? 1 : 0.5;

  // Government PPL monthly gross (CORRECT, unscaled)
  const govGrossMonthly = 948.10 * 52 / 12;

  // Paid leave (primary caretaker)
  const leaveGrossMonthly = wifeGrossMonthly * payRate;

  const displayUserMonthly  = getDisplayIncome(userGrossMonthly, showAfter);
  const displayGovMonthly   = getDisplayIncome(govGrossMonthly, showAfter);
  const displayLeaveMonthly = getDisplayIncome(leaveGrossMonthly, showAfter);

  document.getElementById("result").innerHTML =
    renderBreakdown(
      "Government Pay (21 weeks)",
      displayUserMonthly,
      displayGovMonthly,
      displayUserMonthly + displayGovMonthly,
      "Government payment rate: $948.10 per week (gross).<br>Non-primary caretaker remains at work; salary is unchanged.",
      showAfter,
      true,
      userGrossMonthly,
      govGrossMonthly
    ) +
    renderBreakdown(
      `Paid Leave (${paidWeeks} weeks)`,
      displayUserMonthly,
      displayLeaveMonthly,
      displayUserMonthly + displayLeaveMonthly,
      "Non-primary caretaker remains at work; salary is unchanged.",
      showAfter,
      true,
      userGrossMonthly,
      leaveGrossMonthly
    );

  attachInfoListeners();
}

function calculateReturnWork(days) {
  lastAction = "return";
  lastReturnDays = days;

  revealProductSection();

  const userGrossMonthly = parseFloat(document.getElementById("userIncome").value) || 0;
  const wifeGrossMonthly = parseFloat(document.getElementById("wifeIncome").value) || 0;
  const showAfter        = document.getElementById("showAfterTax").checked;

  const dayGrossMonthly = (wifeGrossMonthly * days) / 5;

  const displayUserMonthly = getDisplayIncome(userGrossMonthly, showAfter);
  const displayWifeMonthly = getDisplayIncome(dayGrossMonthly, showAfter);

  document.getElementById("result").innerHTML =
    renderBreakdown(
      `Return to Work (${days} Days/Week)`,
      displayUserMonthly,
      displayWifeMonthly,
      displayUserMonthly + displayWifeMonthly,
      "(Non-primary caretaker continues full salary.)",
      showAfter,
      true,
      userGrossMonthly,
      dayGrossMonthly
    );

  attachInfoListeners();
}

// ---------- Initialization ----------

(function init() {
  document.getElementById("result").innerHTML = "";

  document.getElementById("calculate").addEventListener("click", calculateBabyPay);
  document.getElementById("return2").addEventListener("click", () => calculateReturnWork(2));
  document.getElementById("return3").addEventListener("click", () => calculateReturnWork(3));
  document.getElementById("return4").addEventListener("click", () => calculateReturnWork(4));

  document.getElementById("showAfterTax").addEventListener("change", () => {
    if (lastAction === "babyPay")      calculateBabyPay();
    if (lastAction === "return")       calculateReturnWork(lastReturnDays);
  });

  ["userIncome","wifeIncome","paidWeeks"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      if (lastAction === "babyPay")      calculateBabyPay();
      if (lastAction === "return")       calculateReturnWork(lastReturnDays);
    });
  });

  ["fullPay","halfPay"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      if (lastAction === "babyPay")      calculateBabyPay();
      if (lastAction === "return")       calculateReturnWork(lastReturnDays);
    });
  });

  // Frequency dropdown
  const freq = document.getElementById("payFrequency");
  if (freq) {
    freq.addEventListener("change", () => {
      if (lastAction === "babyPay")      calculateBabyPay();
      if (lastAction === "return")       calculateReturnWork(lastReturnDays);
    });
  }
})();
