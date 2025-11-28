// ======================================
// popup.js (BabyPay v3.9 + Medicare levy)
// • Renders data on button click or live when inputs change.
// • Monthly-only tax breakdown in info-modals using original gross values.
// • “Government Pay (24 weeks)” & “Paid Leave (<n> weeks)” cards.
// • Government Pay card notes the $948.10/week gross rate.
// • After-tax includes income tax + 2% Medicare levy.
// ======================================

let lastAction = null;      // 'babyPay' or 'return'
let lastReturnDays = null;  // stores days for return-to-work

// ——— Utility functions ———

// Format a number into “$X,XXX/month”
function formatCurrency(amount) {
  return "$" + amount.toLocaleString(undefined, { maximumFractionDigits: 0 }) + "/month";
}

// Australian income tax brackets (annual → income tax only, no Medicare)
function calculateIncomeTax(annualIncome) {
  if (annualIncome <= 18200)            return 0;
  if (annualIncome <= 45000)            return (annualIncome - 18200) * 0.16;
  if (annualIncome <= 135000)           return 4288 + (annualIncome - 45000) * 0.30;
  if (annualIncome <= 190000)           return 31288 + (annualIncome - 135000) * 0.37;
  return 51688 + (annualIncome - 190000) * 0.45;
}

// Return gross or net/month based on checkbox
// Net = Gross - (Income tax + 2% Medicare levy)
function getDisplayIncome(monthlyGross, showAfterTax) {
  if (!showAfterTax) return monthlyGross;

  const annualGross       = monthlyGross * 12;
  const incomeTaxAnnual   = calculateIncomeTax(annualGross);
  const medicareAnnual    = annualGross * 0.02;          // 2% Medicare levy
  const totalTaxAnnual    = incomeTaxAnnual + medicareAnnual;
  const annualNet         = annualGross - totalTaxAnnual;

  return annualNet / 12;
}

// ——— Render breakdown cards ———

function renderBreakdown(
  title,
  nonPrimaryDisplay,
  primaryDisplay,
  totalDisplay,
  note = "",
  showAfterTax = false,
  hasInfo = false,
  nonPrimaryGross = 0,
  primaryGross = 0
) {
  const labelType  = showAfterTax ? "Net" : "Gross";

  const makeIcon = (grossAmt, tip) => `
    <img
      src="information.png"
      alt="Info"
      title="${tip}"
      class="info-icon"
      data-value="${grossAmt}"
      style="width:14px;height:14px;cursor:pointer;margin-left:4px;vertical-align:middle;"
    />
  `;

  return `
    <div style="border:1px solid #ddd;padding:8px;margin:8px 0;border-radius:4px;text-align:left;">

      <div style="font-weight:bold;margin-bottom:6px;">${title}</div>

      <div style="font-size:12px;margin-bottom:4px;">
        Non-Primary (${labelType}): ${formatCurrency(Math.round(nonPrimaryDisplay))}
        ${hasInfo ? makeIcon(nonPrimaryGross, `${labelType} Non-Primary`) : ""}
      </div>

      <div style="font-size:12px;margin-bottom:4px;">
        Primary (${labelType}): ${formatCurrency(Math.round(primaryDisplay))}
        ${hasInfo ? makeIcon(primaryGross, `${labelType} Primary`) : ""}
      </div>

      <div style="font-size:12px;font-weight:bold;margin-bottom:4px;">
        Total: ${formatCurrency(Math.round(totalDisplay))}
        <!-- TOTAL: info icon removed by user request -->
      </div>

      ${note ? `<div style="font-size:11px;color:#555;">${note}</div>` : ""}
    </div>
  `;
}

// ——— Info-icon handler ———

function attachInfoListeners() {
  document.querySelectorAll(".info-icon").forEach(icon => {
    icon.addEventListener("click", () => {
      const gross   = parseFloat(icon.dataset.value) || 0;  // monthly gross
      const annual  = gross * 12;

      const incomeTaxAnnual = calculateIncomeTax(annual);
      const medicareAnnual  = annual * 0.02;
      const totalTaxAnnual  = incomeTaxAnnual + medicareAnnual;

      const incomeTaxMon = incomeTaxAnnual / 12;
      const medicareMon  = medicareAnnual / 12;
      const totalTaxMon  = totalTaxAnnual / 12;
      const netMon       = gross - totalTaxMon;

      const modal   = document.getElementById("userTaxModal");
      const content = document.getElementById("userTaxModalContent");

      if (!modal || !content) return;

      content.innerHTML = `
        <h3 style="margin:0 0 8px;font-size:15px;">Tax Breakdown (Estimate)</h3>
        <p style="margin:0;font-size:13px;line-height:1.4;">
          Gross: ${formatCurrency(Math.round(gross))}<br>
          Income tax: ${formatCurrency(Math.round(incomeTaxMon))}<br>
          Medicare (2%): ${formatCurrency(Math.round(medicareMon))}<br>
          Total tax: ${formatCurrency(Math.round(totalTaxMon))}<br>
          Net: ${formatCurrency(Math.round(netMon))}
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

// ——— Product reveal (now delayed 3 seconds) ———

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
  }, 3000); // 3 second delay
}

// ——— Main calculators ———

function calculateBabyPay() {
  lastAction = 'babyPay';
  revealProductSection();

  const userGross  = parseFloat(document.getElementById("userIncome").value) || 0;
  const wifeGross  = parseFloat(document.getElementById("wifeIncome").value)  || 0;
  const paidWeeks  = parseFloat(document.getElementById("paidWeeks").value)   || 0;
  const showAfter  = document.getElementById("showAfterTax").checked;
  const payRate    = document.getElementById("fullPay").checked ? 1 : 0.5;

  const govGross   = 948.10 * 52 / 12;   // Government PPL monthly gross
  const leaveGross = wifeGross * payRate;

  const displayUser  = getDisplayIncome(userGross, showAfter);
  const displayGov   = getDisplayIncome(govGross, showAfter);
  const displayLeave = getDisplayIncome(leaveGross, showAfter);

  document.getElementById("result").innerHTML =
    renderBreakdown(
      "Government Pay (24 weeks)",
      displayUser,
      displayGov,
      displayUser + displayGov,
      "Government payment rate: $948.10 per week (gross)",
      showAfter,
      true,
      userGross,
      govGross
    ) +
    renderBreakdown(
      `Paid Leave (${paidWeeks} weeks)`,
      displayUser,
      displayLeave,
      displayUser + displayLeave,
      "Non-primary caretaker remains at work; salary is unchanged.",
      showAfter,
      true,
      userGross,
      leaveGross
    );

  attachInfoListeners();
}

function calculateReturnWork(days) {
  lastAction = 'return';
  lastReturnDays = days;

  revealProductSection();

  const userGross   = parseFloat(document.getElementById("userIncome").value) || 0;
  const wifeMonthly = parseFloat(document.getElementById("wifeIncome").value)  || 0;
  const showAfter   = document.getElementById("showAfterTax").checked;
  const dayGross    = (wifeMonthly * days) / 5;   // pro-rata based on days per week

  const displayUser = getDisplayIncome(userGross, showAfter);
  const displayWife = getDisplayIncome(dayGross, showAfter);

  document.getElementById("result").innerHTML =
    renderBreakdown(
      `Return to Work (${days} Days/Week)`,
      displayUser,
      displayWife,
      displayUser + displayWife,
      "(Non-primary caretaker continues full salary.)",
      showAfter,
      true,
      userGross,
      dayGross
    );

  attachInfoListeners();
}

// ——— Initialization ———

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

  ['userIncome','wifeIncome','paidWeeks'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      if (lastAction === 'babyPay')      calculateBabyPay();
      else if (lastAction === 'return')  calculateReturnWork(lastReturnDays);
    });
  });

  ['fullPay','halfPay'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      if (lastAction === 'babyPay')      calculateBabyPay();
      else if (lastAction === 'return')  calculateReturnWork(lastReturnDays);
    });
  });

  // Safe legacy infoModal listener (if it exists)
  const infoModal = document.getElementById("infoModal");
  if (infoModal) {
    infoModal.addEventListener("click", e => {
      if (e.target.id === "infoModal") closeInfoModal();
    });
  }
})();
