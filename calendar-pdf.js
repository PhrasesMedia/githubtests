// calendar-pdf.js
// BabyPay Income Calendar
// - Uses REAL inputs from popup.js UI
// - Models government leave (21 weeks) + employer paid leave (paidWeeks)
// - Non-primary caretaker continues full salary during the whole leave period
// - Uses GROSS amounts in the calendar (ignores after-tax toggle for now)
// - Calendar runs from the start of leave to the end of gov + paid leave
// - One or more month-grids, with BabyPay logo at the top
// - Asks for an "expected pay date" (day-of-month) and highlights it as Pay day

(function () {
  const btn = document.getElementById("downloadCalendarBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const incomeEntries = buildIncomeTimelineFromInputs();

    if (!incomeEntries || !incomeEntries.length) {
      alert("Please enter your incomes and leave details before generating the calendar.");
      return;
    }

    // Ask for expected pay date (day-of-month, e.g. 14)
    let payDay = null;
    const input = prompt(
      "What day of the month is your main pay date? (1–31)",
      "14"
    );
    if (input !== null && input.trim() !== "") {
      const n = parseInt(input.trim(), 10);
      if (!isNaN(n) && n >= 1 && n <= 31) {
        payDay = n;
      }
    }
    // If user cancels or types something invalid, we just skip highlighting.

    openIncomeCalendarWindow(incomeEntries, payDay);
  });

  // -----------------------------
  // 1. Build income timeline
  // -----------------------------

  function buildIncomeTimelineFromInputs() {
    const userGrossMonthly =
      parseFloat(document.getElementById("userIncome")?.value) || 0;
    const wifeGrossMonthly =
      parseFloat(document.getElementById("wifeIncome")?.value) || 0;
    const paidWeeks =
      parseFloat(document.getElementById("paidWeeks")?.value) || 0;
    const fullPayChecked = document.getElementById("fullPay")?.checked;
    const halfPayChecked = document.getElementById("halfPay")?.checked;

    // Need at least basic inputs
    if (!userGrossMonthly && !wifeGrossMonthly) return [];

    // Pay rate for employer paid leave (primary caretaker)
    let payRate = 0.5;
    if (fullPayChecked) payRate = 1;
    if (halfPayChecked && !fullPayChecked) payRate = 0.5;

    // Convert monthly gross → weekly gross (approx)
    const userWeeklyGross = (userGrossMonthly * 12) / 52;
    const wifeLeaveWeeklyGross = (wifeGrossMonthly * payRate * 12) / 52;

    // Government Paid Parental Leave (weekly gross already)
    const govWeeklyGross = 948.10;

    // Periods (in weeks)
    const GOV_WEEKS = 21; // matches label in BabyPay
    const employerWeeks = Math.max(0, paidWeeks || 0);

    const totalWeeks = GOV_WEEKS + employerWeeks;
    if (totalWeeks <= 0) return [];

    // Default start date: first day of NEXT month from today
    const leaveStartDate = getDefaultLeaveStartDate();

    // Build daily timeline: one entry per day with summed gross
    const entries = [];
    const totalDays = totalWeeks * 7;

    for (let i = 0; i < totalDays; i++) {
      const date = new Date(leaveStartDate);
      date.setDate(leaveStartDate.getDate() + i);

      let amount = 0;

      // Non-primary caretaker full salary across entire leave period
      if (userWeeklyGross > 0) {
        amount += userWeeklyGross / 7;
      }

      // Government PPL: first GOV_WEEKS weeks only
      if (i < GOV_WEEKS * 7) {
        amount += govWeeklyGross / 7;
      }

      // Employer paid leave: AFTER gov leave, for employerWeeks
      const employerStartDay = GOV_WEEKS * 7;
      const employerEndDay = (GOV_WEEKS + employerWeeks) * 7;
      if (i >= employerStartDay && i < employerEndDay && wifeLeaveWeeklyGross > 0) {
        amount += wifeLeaveWeeklyGross / 7;
      }

      entries.push({
        date: formatYyyyMmDd(
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate()
        ),
        amount,
      });
    }

    return entries;
  }

  function getDefaultLeaveStartDate() {
    const today = new Date();
    // First day of next month
    return new Date(today.getFullYear(), today.getMonth() + 1, 1);
  }

  // -----------------------------
  // 2. Multi-month calendar core
  // -----------------------------

  function openIncomeCalendarWindow(incomeEntries, payDay) {
    const { minDate, maxDate } = getMinMaxDates(incomeEntries);
    const incomeByDay = groupIncomeByDay(incomeEntries);
    const baseHref = getBaseHref();

    const html = buildMultiMonthCalendarHtml(
      minDate,
      maxDate,
      incomeByDay,
      baseHref,
      payDay
    );

    const win = window.open("", "_blank");
    if (!win) {
      alert("Pop-up blocked. Please allow pop-ups to generate the calendar.");
      return;
    }

    win.document.open();
    win.document.write(html);
    win.document.close();

    win.focus();
    setTimeout(() => {
      win.print(); // User can choose "Save as PDF"
    }, 300);
  }

  function getMinMaxDates(entries) {
    let minDate = null;
    let maxDate = null;

    entries.forEach((e) => {
      const d = new Date(e.date);
      if (!minDate || d < minDate) minDate = d;
      if (!maxDate || d > maxDate) maxDate = d;
    });

    return { minDate, maxDate };
  }

  function groupIncomeByDay(entries) {
    const map = {}; // key: yyyy-mm-dd, value: total amount
    entries.forEach((e) => {
      const key = e.date; // expecting yyyy-mm-dd
      if (!map[key]) map[key] = 0;
      map[key] += Number(e.amount) || 0;
    });
    return map;
  }

  function getBaseHref() {
    // Use the current page URL as a base so relative paths like "icon.png" work in the new window.
    let href = window.location.href;
    href = href.replace(/[#?].*$/, ""); // strip query/hash
    if (!href.endsWith("/")) {
      href = href.replace(/[^\/]*$/, ""); // drop file name
    }
    return href;
  }

  function buildMultiMonthCalendarHtml(minDate, maxDate, incomeByDay, baseHref, payDay) {
    const startYear = minDate.getFullYear();
    const startMonth = minDate.getMonth(); // 0–11
    const endYear = maxDate.getFullYear();
    const endMonth = maxDate.getMonth();

    const sections = [];
    let y = startYear;
    let m = startMonth;

    while (y < endYear || (y === endYear && m <= endMonth)) {
      const sectionHtml = buildSingleMonthSection(y, m, incomeByDay, payDay);
      sections.push(sectionHtml);

      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }

    const totalIncome = Object.values(incomeByDay).reduce(
      (sum, v) => sum + v,
      0
    );
    const totalIncomeStr = totalIncome.toFixed(2);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>BabyPay Income Calendar</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <base href="${baseHref}">
  <style>
    * { box-sizing: border-box; }

    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: #222;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }

    .header img {
      height: 40px;
      width: auto;
    }

    .header-text h1 {
      font-size: 22px;
      margin: 0;
    }

    .header-text .subtitle {
      font-size: 13px;
      margin-top: 2px;
      color: #555;
    }

    .summary-banner {
      font-size: 13px;
      margin: 10px 0 18px 0;
    }

    .month-block {
      page-break-inside: avoid;
      margin-bottom: 24px;
    }

    .month-title {
      font-size: 16px;
      font-weight: bold;
      margin: 8px 0;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      table-layout: fixed;
    }

    th, td {
      border: 1px solid #ccc;
      padding: 4px;
      vertical-align: top;
      height: 70px;
    }

    th {
      background: #f3f3f3;
      font-size: 12px;
    }

    td {
      font-size: 11px;
      position: relative;
    }

    .day-number {
      font-weight: bold;
      margin-bottom: 4px;
    }

    .day-amount {
      font-size: 11px;
    }

    .no-pay {
      opacity: 0.5;
    }

    td.empty {
      background: #fafafa;
    }

    /* Pay day highlight */
    td.payday {
      background: #fff9c4;
    }

    .payday-label {
      font-size: 9px;
      color: #c49000;
      margin-top: 3px;
    }

    .footer-note {
      margin-top: 16px;
      font-size: 10px;
      color: #777;
    }

    @page {
      margin: 15mm;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="icon.png" alt="BabyPay logo" />
    <div class="header-text">
      <h1>BabyPay Income Calendar</h1>
      <div class="subtitle">Estimated income across your government + paid leave period</div>
    </div>
  </div>

  <div class="summary-banner">
    Total estimated income across this period: <strong>$${totalIncomeStr}</strong> (gross)
    ${payDay ? `<br/>Expected main pay date each month: day ${payDay}` : ""}
  </div>

  ${sections.join("")}

  <div class="footer-note">
    BabyPay is for planning only. Actual payment dates and amounts may differ;
    please confirm with your employer, your payslips, and Services Australia.
  </div>
</body>
</html>
    `;
  }

  function buildSingleMonthSection(year, monthIndex, incomeByDay, payDay) {
    const firstOfMonth = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const monthName = firstOfMonth.toLocaleString("en-AU", { month: "long" });

    // Start the calendar on Monday
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = Monday

    const cells = [];

    // Empty cells before 1st day
    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ empty: true });
    }

    // One cell per day
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatYyyyMmDd(year, monthIndex + 1, day);
      const amount = incomeByDay[dateStr] || 0;
      const isPayDay = payDay && day === payDay;
      cells.push({ day, amount, isPayDay });
    }

    // Break into weeks of 7
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
            ? `<div class="payday-label">Pay day</div>`
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

  function formatYyyyMmDd(year, monthNumber1Based, day) {
    const m = monthNumber1Based.toString().padStart(2, "0");
    const d = day.toString().padStart(2, "0");
    return `${year}-${m}-${d}`;
  }
})();
