// ======================================
// popup.js (BabyPay v4.1)
// • Internal calculations are MONTHLY.
// • Display can be toggled: weekly / fortnightly / monthly.
// • Government Pay = 21 weeks of PPL.
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
    // annual = monthly * 12, weekly = annual / 52
    return (monthlyAmount * 12) / 52;
  }
  if (freq === "fortnightly") {
    // fortnightly = annual / 26
    return (monthlyAmount * 12) / 26;
  }
  // default: monthly
  return monthlyAmount;
}

// Get suffix based on frequency
function getFrequencySuffix() {
  const freq = getCurrentFrequency();
  if (freq === "weekly") return "/week";
  if (freq === "fortnightly") return "/fortnight";
  return "/month";
}

// Format a MONTHLY base amount into a string at the current frequency
function formatCurrency(monthlyAmount) {
  const converted = convertMonthlyToDisplay(monthlyAmount);
  return (
    "$" +
    converted.toLocaleString(undefined, { maximumFractionDigits: 0 }) +
    getFrequencySuffix()
  );
}

// ---------- Tax helpers ----------

// Australian income tax brackets (annual → income tax only, no Medicare)
function calculateIncomeTax(annualIncome) {
  if (annualIncome <= 18200)            return 0;
  if (annualIncome <= 45000)            return (annualIncome - 18200) * 0.16;
  if (annualIncome <= 135000)           return 4288 + (annualIncome - 45000) * 0.30;
  if (annualIncome <= 190000)           return 31288 + (annualIncome - 135000) * 0.37;
  return 51688 + (annualIncome - 190000) * 0.45;
}

// Return gross or net *per month* based on checkbox
// Net = Gross - (Income tax + 2% Medicare levy)
function getDisplayIncome(monthlyGross, showAfterTax) {
  if (!showAfterTax) return monthlyGross;

  const annualGross       = monthlyGross * 12;
  const incomeTaxAnnual   = calculateIncomeTax(annualGross);
  const medicareAnnual    = annualGross * 0.02;          // 2% Medicare levy
  const totalTaxAnnual    = incomeTaxAnnual + medicareAnnual;
  const annualNet         = annualGross - totalTaxAnnual;

  return annualNet / 12;  // still monthly base, converted only at display time
}

// ---------- Render breakdown cards ----------

function renderBreakdown(
  title,
  nonPrimaryDisplayMonthly, // monthly base
  primaryDisplayMonthly,    // monthly base
  totalDisplayMonthly,      // monthly base
  note = "",
  showAfterTax = false,
  hasInfo = false,
  nonPrimaryGrossMonthly = 0, // monthly gross
  primaryGrossMonthly = 0     // monthly gross
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
        <!-- TOTAL: info icon removed by user request -->
      </div>

      ${note ? `<div style="font-size:11px;color:#555;">${note}</div>` : ""}
    </div>
  `;
}

// ---------- Info-icon handler ----------

function attachInfoListeners() {
  document.querySelectorAll(".info-icon").forEach(icon => {
    icon.addEventListener("click", () => {
      const grossMonthly   = parseFloat(icon.dataset.value) || 0;  // monthly gross base
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
      if (e.target.id === "userTaxModal") {
        e.target.style.display = "none";
      }
    });
  }
}

// ---------- Product reveal (3 second delay) ----------

function revealProductSection() {
  const productSection = document.querySelector(".product-section");
  if (!productSection) return;

  setTimeout(() => {
    if (productSection.style.display === "none") {
      productSection.style.display = "inline-block";
      requestAnimationFrame(() => {
        productSection.classList.add("visible");
      });
    } else {
      productSection.classList.add("visible");
    }
  }, 3000);
}

// ---------- Main calculators ----------

function calculateBabyPay() {
  lastAction = 'babyPay';
  revealProductSection();

  const userGrossMonthly  = parseFloat(document.getElementById("userIncome").value) || 0;
  const wifeGrossMonthly  = parseFloat(document.getElementById("wifeIncome").value)  || 0;
  const paidWeeks         = parseFloat(document.getElementById("paidWeeks").value)   || 0;
  const showAfter         = document.getElementById("showAfterTax").checked;
  const payRate           = document.getElementById("fullPay").checked ? 1 : 0.5;

  // Government PPL monthly gross
  // Previously based on 24 weeks; now scaled down so that it reflects 21 weeks instead.
  const govGrossMonthly   = (948.10 * 52 / 12) * (21 / 24);

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
      "Government payment rate: $948.10 per week (gross)",
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
  lastAction = 'return';
  lastReturnDays = days;

  revealProductSection();

  const userGrossMonthly   = parseFloat(document.getElementById("userIncome").value) || 0;
  const wifeGrossMonthly   = parseFloat(document.getElementById("wifeIncome").value)  || 0;
  const showAfter          = document.getElementById("showAfterTax").checked;

  // Pro-rata based on days per week (5 days = full time)
  const dayGrossMonthly    = (wifeGrossMonthly * days) / 5;

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
    if (lastAction === 'babyPay')      calculateBabyPay();
    else if (lastAction === 'return')  calculateReturnWork(lastReturnDays);
  });

  ["userIncome","wifeIncome","paidWeeks"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      if (lastAction === 'babyPay')      calculateBabyPay();
      else if (lastAction === 'return')  calculateReturnWork(lastReturnDays);
    });
  });

  ["fullPay","halfPay"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      if (lastAction === 'babyPay')      calculateBabyPay();
      else if (lastAction === 'return')  calculateReturnWork(lastReturnDays);
    });
  });

  // Frequency dropdown – just triggers re-render using the new frequency
  const payFrequencySelect = document.getElementById("payFrequency");
  if (payFrequencySelect) {
    payFrequencySelect.addEventListener("change", () => {
      if (lastAction === 'babyPay')      calculateBabyPay();
      else if (lastAction === 'return')  calculateReturnWork(lastReturnDays);
    });
  }

  // Safe legacy infoModal listener (if it exists)
  const infoModal = document.getElementById("infoModal");
  if (infoModal) {
    infoModal.addEventListener("click", e => {
      if (e.target.id === "infoModal") closeInfoModal();
    });
  }
})();
