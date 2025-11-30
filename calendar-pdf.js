// calendar-pdf.js
// Generate a multi-month income calendar and open a print dialog so the user can save as PDF.

(function () {
  const btn = document.getElementById("downloadCalendarBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    // TODO: Replace this with real BabyPay data once we wire it up.
    const incomeEntries = getExampleIncomeData();

    if (!incomeEntries.length) {
      alert("No income data available yet.");
      return;
    }

    openIncomeCalendarWindow(incomeEntries);
  });

  // ---- Demo data for now (covers multiple months so you can see it working) ----
  function getExampleIncomeData() {
    // Example: income over three months
    return [
      { date: "2026-01-02", amount: 3200 },
      { date: "2026-01-16", amount: 3200 },
      { date: "2026-01-23", amount: 948.10 },
      { date: "2026-02-06", amount: 3200 },
      { date: "2026-02-20", amount: 3200 },
      { date: "2026-03-06", amount: 3200 },
    ];
  }

  // ---- Core logic ----

  function openIncomeCalendarWindow(incomeEntries) {
    const { minDate, maxDate } = getMinMaxDates(incomeEntries);
    const incomeByDay = groupIncomeByDay(incomeEntries);

    const baseHref = getBaseHref();
    const html = buildMultiMonthCalendarHtml(minDate, maxDate, incomeByDay, baseHref);

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
      win.print(); // user can choose "Save as PDF"
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
    // Strip query/hash
    href = href.replace(/[#?].*$/, "");
    // If it ends with a file name (no trailing slash), drop everything after the last "/"
    if (!href.endsWith("/")) {
      href = href.replace(/[^\/]*$/, "");
    }
    return href;
  }

  function buildMultiMonthCalendarHtml(minDate, maxDate, incomeByDay, baseHref) {
    const startYear = minDate.getFullYear();
    const startMonth = minDate.getMonth(); // 0–11
    const endYear = maxDate.getFullYear();
    const endMonth = maxDate.getMonth();

    const sections = [];
    let y = startYear;
    let m = startMonth;

    while (y < endYear || (y === endYear && m <= endMonth)) {
      const sectionHtml = buildSingleMonthSection(y, m, incomeByDay);
      sections.push(sectionHtml);

      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }

    const totalIncome = Object.values(incomeByDay).reduce((sum, v) => sum + v, 0);
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
      <div class="subtitle">Estimated income across your leave period</div>
    </div>
  </div>

  <div class="summary-banner">
    Total estimated income across this period: <strong>$${totalIncomeStr}</strong>
  </div>

  ${sections.join("")}

  <div class="footer-note">
    BabyPay is for planning only. Actual payment dates and amounts may differ;
    please confirm with your employer and Services Australia.
  </div>
</body>
</html>
    `;
  }

  function buildSingleMonthSection(year, monthIndex, incomeByDay) {
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
      cells.push({ day, amount });
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
          return `
            <td>
              <div class="day-number">${c.day}</div>
              <div class="day-amount">${displayAmount}</div>
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
