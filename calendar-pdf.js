// calendar-pdf.js
// Generates a BabyPay income calendar with pay-day deposits and logo

// ---------- Helpers ----------

// format date as YYYY-MM-DD
function bpFormatYyyyMmDd(year, monthIndex1Based, day) {
  const m = String(monthIndex1Based).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

// Build HTML for a single month block
function bpBuildSingleMonthSection(year, monthIndex0, incomeByDay, payDay) {
  const firstOfMonth = new Date(year, monthIndex0, 1);
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  const monthName = firstOfMonth.toLocaleString("en-AU", { month: "long" });

  // Start the calendar on Monday (0 = Monday)
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;

  // 1) Work out the total income for this month
  let monthTotal = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = bpFormatYyyyMmDd(year, monthIndex0 + 1, day);
    monthTotal += incomeByDay[dateStr] || 0;
  }

  const cells = [];

  // Empty cells before the 1st
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ empty: true });
  }

  // 2) One cell per day
  for (let day = 1; day <= daysInMonth; day++) {
    const isPayDay = payDay && day === payDay;

    // If payDay is set, put full monthTotal on that day; others get 0.
    // If no payDay, just show daily accruals.
    let amount = 0;
    if (payDay) {
      amount = isPayDay ? monthTotal : 0;
    } else {
      const dateStr = bpFormatYyyyMmDd(year, monthIndex0 + 1, day);
      amount = incomeByDay[dateStr] || 0;
    }

    cells.push({ day, amount, isPayDay });
  }

  // Turn flat cells into rows of 7
  const rowsHtml = [];
  for (let i = 0; i < cells.length; i += 7) {
    const rowCells = cells.slice(i, i + 7);
    const tdHtml = rowCells
      .map((c) => {
        if (c.empty) {
          return `<td class="empty"></td>`;
        }
        const displayAmount =
          c.amount > 0
            ? `$${c.amount.toFixed(2)}`
            : `<span class="no-pay">–</span>`;

        const paydayClass = c.isPayDay ? " payday" : "";
        const paydayLabel = c.isPayDay
          ? `<div class="payday-label">
               <img src="icon.png" alt="BabyPay logo" class="payday-logo" />
               Pay day
             </div>`
          : "";

        return `
          <td class="${paydayClass}">
            <div class="day-number">${c.day}</div>
            <div class="day-amount">${displayAmount}</div>
            ${paydayLabel}
          </td>
        `;
      })
      .join("");
    rowsHtml.push(`<tr>${tdHtml}</tr>`);
  }

  return `
    <div class="month-block">
      <div class="month-title">${monthName} ${year}</div>
      <table>
        <thead>
          <tr>
            <th>Mon</th>
            <th>Tue</th>
            <th>Wed</th>
            <th>Thu</th>
            <th>Fri</th>
            <th>Sat</th>
            <th>Sun</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml.join("")}
        </tbody>
      </table>
    </div>
  `;
}

// Build full document HTML
function bpBuildCalendarDocument({
  incomeByDay,
  totalIncome,
  payDay,
  startDate,
  endDate
}) {
  // Collect unique (year, monthIndex) pairs between start and end
  const months = [];
  const cursor = new Date(startDate.getTime());
  cursor.setDate(1);

  while (cursor <= endDate) {
    months.push({ year: cursor.getFullYear(), monthIndex0: cursor.getMonth() });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const monthBlocks = months
    .map((m) =>
      bpBuildSingleMonthSection(m.year, m.monthIndex0, incomeByDay, payDay)
    )
    .join("");

  const startLabel = startDate.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const endLabel = endDate.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>BabyPay Income Calendar</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 24px;
      color: #222;
    }
    header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    header img {
      width: 40px;
      height: 40px;
    }
    header h1 {
      margin: 0;
      font-size: 22px;
    }
    header .tagline {
      font-size: 12px;
      color: #555;
    }
    .summary {
      font-size: 12px;
      margin-bottom: 16px;
    }
    .summary strong {
      font-weight: bold;
    }
    .month-block {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    .month-title {
      font-weight: bold;
      margin-bottom: 6px;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 11px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 4px;
      vertical-align: top;
      height: 48px;
    }
    th {
      background: #f5f5f5;
      text-align: center;
      font-weight: bold;
    }
    td.empty {
      background: #fafafa;
    }
    .day-number {
      font-weight: bold;
      margin-bottom: 2px;
    }
    .day-amount {
      font-size: 11px;
    }
    .no-pay {
      color: #aaa;
    }
    .payday {
      background: #fff9d7;
    }
    .payday-label {
      margin-top: 3px;
      font-size: 10px;
      color: #c28a00;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .payday-logo {
      width: 14px;
      height: 14px;
    }

    @media print {
      body {
        margin: 8mm;
      }
    }
  </style>
</head>
<body>
  <header>
    <img src="icon.png" alt="BabyPay logo" />
    <div>
      <h1>BabyPay Income Calendar</h1>
      <div class="tagline">
        Estimated income across your government + paid leave period
      </div>
    </div>
  </header>

  <div class="summary">
    <div>Total estimated income across this period: 
      <strong>$${totalIncome.toFixed(2)}</strong> (gross)</div>
    <div>Period: ${startLabel} – ${endLabel}</div>
    <div>Expected main pay date each month: day ${payDay}</div>
  </div>

  ${monthBlocks}
</body>
</html>
  `;
}

// ---------- Main handler ----------

function bpHandleDownloadCalendarClick() {
  try {
    const userGrossMonthly =
      parseFloat(document.getElementById("userIncome").value) || 0;
    const wifeGrossMonthly =
      parseFloat(document.getElementById("wifeIncome").value) || 0;
    const paidWeeks =
      parseFloat(document.getElementById("paidWeeks").value) || 0;

    const fullChecked = document.getElementById("fullPay").checked;
    const halfChecked = document.getElementById("halfPay").checked;

    if (!userGrossMonthly && !wifeGrossMonthly) {
      alert("Please enter at least one income before downloading the calendar.");
      return;
    }
    if (!paidWeeks || paidWeeks <= 0) {
      alert("Please enter the paid leave weeks for the primary caretaker.");
      return;
    }
    if (!fullChecked && !halfChecked) {
      alert("Please choose Full or Half pay for the paid leave period.");
      return;
    }

    const payRate = fullChecked ? 1 : 0.5;

    const startStr = prompt(
      "Enter the first day of your leave (YYYY-MM-DD), e.g. 2026-01-01:"
    );
    if (!startStr) {
      return;
    }
    const startDate = new Date(startStr);
    if (isNaN(startDate.getTime())) {
      alert("That leave start date didn't look valid. Please use YYYY-MM-DD.");
      return;
    }

    const payDayStr = prompt(
      "What day of the month do you expect pay to land? (1–28 is safest):",
      "14"
    );
    const payDay = parseInt(payDayStr, 10);
    if (!payDay || payDay < 1 || payDay > 31) {
      alert("Please enter a valid pay date between 1 and 31.");
      return;
    }

    // --- Compute total leave length (gov + paid) ---
    const govWeeks = 21; // labelled 21 weeks
    const totalWeeks = govWeeks + paidWeeks;
    const totalDays = totalWeeks * 7;

    // Non-primary income (always working)
    const userWeekly = (userGrossMonthly * 12) / 52;
    const userTotal = userWeekly * totalWeeks;

    // Government PPL income
    const govWeekly = 948.10; // update if you change the base rate
    const govTotal = govWeekly * govWeeks;

    // Paid leave income for primary
    const primaryWeekly = ((wifeGrossMonthly * 12) / 52) * payRate;
    const primaryTotal = primaryWeekly * paidWeeks;

    const totalIncome = userTotal + govTotal + primaryTotal;
    const dailyRate = totalIncome / totalDays;

    // Build incomeByDay map
    const incomeByDay = {};
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate.getTime());
      d.setDate(d.getDate() + i);
      const dateStr = bpFormatYyyyMmDd(
        d.getFullYear(),
        d.getMonth() + 1,
        d.getDate()
      );
      incomeByDay[dateStr] = dailyRate;
    }

    const endDate = new Date(startDate.getTime());
    endDate.setDate(endDate.getDate() + totalDays - 1);

    const docHtml = bpBuildCalendarDocument({
      incomeByDay,
      totalIncome,
      payDay,
      startDate,
      endDate
    });

    const win = window.open("", "_blank");
    if (!win) {
      alert("Pop-up blocked. Please allow pop-ups for this site.");
      return;
    }
    win.document.open();
    win.document.write(docHtml);
    win.document.close();
    win.focus();
    // win.print(); // optional
  } catch (err) {
    console.error("BabyPay calendar error", err);
    alert(
      "Sorry, something went wrong generating the calendar. Check the console for details."
    );
  }
}

// ---------- Wire up button once DOM is ready ----------

window.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("downloadCalendarBtn");
  if (!btn) {
    console.error("BabyPay: #downloadCalendarBtn button not found.");
    return;
  }
  btn.addEventListener("click", bpHandleDownloadCalendarClick);
});
