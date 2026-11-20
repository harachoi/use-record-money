const STORAGE_KEY = "use-record-money-v1";
const COLORS = ["#c46b4a", "#b5812f", "#2f7d68", "#3c6f8c", "#7b5b8c", "#a14d45", "#66724a", "#b8613d", "#3f6f78", "#8d5a3c"];

const els = {
  month: document.getElementById("month-label"),
  monthPanel: document.getElementById("month-panel"),
  yearSelect: document.getElementById("year-select"),
  monthGrid: document.getElementById("month-grid"),
  form: document.getElementById("entry-form"),
  title: document.getElementById("form-title"),
  hint: document.getElementById("form-hint"),
  date: document.getElementById("date"),
  category: document.getElementById("category"),
  categoryPicks: document.getElementById("category-picks"),
  categoryAdd: document.getElementById("category-add"),
  categoryNew: document.getElementById("category-new"),
  amount: document.getElementById("amount"),
  amountDisplay: document.getElementById("amount-display"),
  calcExpr: document.getElementById("calc-expr"),
  payLabel: document.getElementById("pay-label"),
  cardField: document.getElementById("card-field"),
  cardPicks: document.getElementById("card-picks"),
  cardAdd: document.getElementById("card-add"),
  cardNew: document.getElementById("card-new"),
  note: document.getElementById("note"),
  repeat: document.getElementById("repeat"),
  repeatField: document.getElementById("repeat-field"),
  repeatUntil: document.getElementById("repeat-until"),
  repeatUntilField: document.getElementById("repeat-until-field"),
  repeatHint: document.getElementById("repeat-hint"),
  recurring: document.getElementById("recurring"),
  goalForm: document.getElementById("goal-form"),
  goalDialog: document.getElementById("goal-dialog"),
  goalDialogTitle: document.getElementById("goal-dialog-title"),
  goalName: document.getElementById("goal-name"),
  goalStart: document.getElementById("goal-start"),
  goalEnd: document.getElementById("goal-end"),
  goalAmount: document.getElementById("goal-amount"),
  goalError: document.getElementById("goal-error"),
  goalSubmit: document.getElementById("goal-submit"),
  goalCancel: document.getElementById("goal-cancel"),
  goalList: document.getElementById("goal-list"),
  exportForm: document.getElementById("export-form"),
  exportStart: document.getElementById("export-start"),
  exportEnd: document.getElementById("export-end"),
  exportError: document.getElementById("export-error"),
  error: document.getElementById("form-error"),
  submit: document.getElementById("submit-btn"),
  cancel: document.getElementById("cancel-btn"),
  catalog: document.getElementById("catalog"),
  list: document.getElementById("tx-list"),
  count: document.getElementById("tx-count"),
  analysis: document.getElementById("analysis-body"),
  calendar: document.getElementById("calendar"),
  dayPanel: document.getElementById("day-panel"),
  toast: document.getElementById("toast"),
  datePopover: document.getElementById("date-popover"),
  datePopTitle: document.getElementById("date-pop-title"),
  datePopDays: document.getElementById("date-pop-days"),
  datePopMonths: document.getElementById("date-pop-months"),
  dateGrid: document.getElementById("date-grid"),
  dateYear: document.getElementById("date-year"),
  dateMonthGrid: document.getElementById("date-month-grid"),
};

const ui = { month: monthKey(new Date()), filter: "all", tab: "calendar", selectedDate: todayStr() };
let pickerYear = new Date().getFullYear();
let datePickerInput = null;
let datePickerCursor = "";
let datePickerMode = "days";
const DATE_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 9.5h17M8 3.5v4M16 3.5v4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
let editingId = null;
let editingGoalId = null;
const calc = { entry: "0", acc: null, op: null, fresh: true, error: "" };
const ACCOUNTS = { card: "카드", check: "체크카드", bank: "통장" };
const OP_LABEL = { "+": "+", "-": "−", "*": "×", "/": "÷" };
let preferCategoryId = null;
let preferPayId = null;
let payAccountShown = "";
const selectedPay = { card: "", check: "", bank: "" };
let lockUntil = 0;
let toastTimer = 0;
const pending = { type: null, id: null, timer: 0 };

const state = load();

function seed() {
  return {
    version: 1,
    categories: [
      { id: "food", name: "식비", type: "expense", color: "#c46b4a" },
      { id: "transport", name: "교통", type: "expense", color: "#3c6f8c" },
      { id: "living", name: "생활", type: "expense", color: "#66724a" },
      { id: "shopping", name: "쇼핑", type: "expense", color: "#b5812f" },
      { id: "health", name: "의료", type: "expense", color: "#a14d45" },
      { id: "culture", name: "문화", type: "expense", color: "#7b5b8c" },
      { id: "other-expense", name: "기타", type: "expense", color: "#8d5a3c" },
      { id: "salary", name: "급여", type: "income", color: "#2f7d68" },
      { id: "extra", name: "부수입", type: "income", color: "#3f6f78" },
      { id: "other-income", name: "기타 수입", type: "income", color: "#4e8c78" },
    ],
    transactions: [],
    recurring: [],
    goals: [],
    pays: [],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    return normalize(JSON.parse(raw));
  } catch {
    return seed();
  }
}

function normalize(data) {
  if (!data || !Array.isArray(data.categories) || !Array.isArray(data.transactions)) return seed();
  const pays = readPays(data);
  const paysById = new Map(pays.map((pay) => [pay.id, pay]));
  const payIdFor = (record) => {
    const account = ACCOUNTS[record.account] ? record.account : null;
    const raw = String(record.payId || record.cardId || "");
    const pay = paysById.get(raw);
    return account && pay && pay.account === account ? raw : null;
  };
  const categories = data.categories.filter(isCategory).map((category) => ({
    id: String(category.id),
    name: String(category.name).trim().slice(0, 20),
    type: category.type === "income" ? "income" : "expense",
    color: safeColor(category.color),
  }));
  const transactions = data.transactions.filter(isTransaction).map((tx) => ({
    id: String(tx.id),
    date: tx.date,
    kind: tx.kind === "income" ? "income" : "expense",
    categoryId: String(tx.categoryId),
    note: String(tx.note || "").trim().slice(0, 40),
    amount: Math.round(Number(tx.amount)),
    account: ACCOUNTS[tx.account] ? tx.account : null,
    payId: payIdFor(tx),
    createdAt: typeof tx.createdAt === "string" ? tx.createdAt : new Date().toISOString(),
    recurringId: typeof tx.recurringId === "string" ? tx.recurringId : null,
  }));
  const recurring = Array.isArray(data.recurring) ? data.recurring.filter(isRecurring).map((rule) => ({
    id: String(rule.id),
    kind: rule.kind === "income" ? "income" : "expense",
    categoryId: String(rule.categoryId),
    amount: Math.round(Number(rule.amount)),
    account: ACCOUNTS[rule.account] ? rule.account : null,
    payId: payIdFor(rule),
    note: String(rule.note || "").trim().slice(0, 40),
    frequency: rule.frequency === "weekly" ? "weekly" : "monthly",
    startDate: rule.startDate,
    endDate: isValidDate(rule.endDate) ? rule.endDate : null,
    active: rule.active !== false,
    createdAt: typeof rule.createdAt === "string" ? rule.createdAt : new Date().toISOString(),
  })) : [];
  const goals = Array.isArray(data.goals) ? data.goals.filter(isGoal).map((goal) => ({
    id: String(goal.id),
    name: String(goal.name || "").trim().slice(0, 20),
    startDate: goal.startDate,
    endDate: goal.endDate,
    amount: Math.round(Number(goal.amount)),
    createdAt: typeof goal.createdAt === "string" ? goal.createdAt : new Date().toISOString(),
  })) : [];
  return { version: 1, categories, transactions, recurring, goals, pays };
}

function isGoal(goal) {
  return goal && typeof goal.id === "string"
    && isValidDate(goal.startDate) && isValidDate(goal.endDate) && goal.endDate >= goal.startDate
    && Number.isInteger(Number(goal.amount)) && Number(goal.amount) > 0 && Number(goal.amount) <= 100000000000;
}

function isRecurring(rule) {
  return rule && typeof rule.id === "string"
    && (rule.frequency === "weekly" || rule.frequency === "monthly")
    && isValidDate(rule.startDate)
    && (rule.kind === "expense" || rule.kind === "income")
    && typeof rule.categoryId === "string"
    && Number.isInteger(Number(rule.amount)) && Number(rule.amount) > 0 && Number(rule.amount) <= 100000000000;
}

function isPay(pay) {
  return pay && typeof pay.id === "string" && typeof pay.name === "string" && pay.name.trim();
}

function readPays(data) {
  const source = Array.isArray(data.pays)
    ? data.pays
    : (Array.isArray(data.cards) ? data.cards.map((card) => ({ ...card, account: "card" })) : []);
  return source.filter(isPay).map((pay) => ({
    id: String(pay.id),
    name: String(pay.name).trim().slice(0, 20),
    account: ACCOUNTS[pay.account] ? pay.account : "card",
  }));
}

function isCategory(category) {
  return category && typeof category.id === "string" && typeof category.name === "string" && category.name.trim()
    && (category.type === "expense" || category.type === "income");
}

function isTransaction(tx) {
  return tx && typeof tx.id === "string" && isValidDate(tx.date)
    && (tx.kind === "expense" || tx.kind === "income")
    && typeof tx.categoryId === "string"
    && Number.isInteger(Number(tx.amount)) && Number(tx.amount) > 0 && Number(tx.amount) <= 100000000000;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    toast("저장 공간이 부족해 이 브라우저에 저장하지 못했습니다.");
  }
}

function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pad(n) { return String(n).padStart(2, "0"); }

function todayStr() {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function formatNumber(value) {
  return Number(value).toLocaleString("ko-KR");
}

function formatWon(value) {
  return `${formatNumber(value)}원`;
}

function formatSignedWon(value) {
  if (value < 0) return `−${formatWon(Math.abs(value))}`;
  return formatWon(value);
}

function amountLine(kind, value) {
  const sign = kind === "income" ? "+" : "−";
  return `<span class="cal-amt ${kind}">${sign}${formatNumber(value)}</span>`;
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function safeColor(color) {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#8d5a3c";
}

function currentKind() {
  return els.form.querySelector('input[name="kind"]:checked')?.value || "expense";
}

function setKind(kind) {
  const input = els.form.querySelector(`input[name="kind"][value="${kind}"]`);
  if (input) input.checked = true;
}

function payById(id) {
  return state.pays.find((pay) => pay.id === id) || null;
}

function paysOf(account) {
  return state.pays.filter((pay) => pay.account === account);
}

function payNoun(account) {
  return ACCOUNTS[account] || "결제";
}

function withJosa(word, pair) {
  const last = word.charCodeAt(word.length - 1);
  const batchim = last >= 0xac00 && last <= 0xd7a3 ? (last - 0xac00) % 28 : 0;
  const [withBatchim, without] = pair;
  return `${word}${batchim && batchim !== 8 ? withBatchim : without}`;
}

function withTopic(word) {
  return withJosa(word, ["은", "는"]);
}

function accountLabel(account, payId) {
  const base = ACCOUNTS[account] || "";
  if (!base) return "";
  const pay = payById(payId);
  return pay && pay.account === account ? `${base} · ${pay.name}` : base;
}

function categoryById(id) {
  return state.categories.find((category) => category.id === id) || null;
}

function categoriesOf(type) {
  return state.categories.filter((category) => category.type === type);
}

function usageCount(id) {
  return state.transactions.reduce((count, tx) => count + (tx.categoryId === id ? 1 : 0), 0);
}

function monthTransactions(key = ui.month) {
  return state.transactions.filter((tx) => tx.date.startsWith(key));
}

function visibleTransactions() {
  const list = monthTransactions();
  if (ui.filter === "all") return list;
  return list.filter((tx) => tx.kind === ui.filter);
}

function sum(list, kind) {
  return list.filter((tx) => tx.kind === kind).reduce((total, tx) => total + tx.amount, 0);
}

function percentLabel(part, total) {
  if (!total || part <= 0) return "0%";
  const pct = (part / total) * 100;
  if (pct < 1) return "1% 미만";
  return `${Math.round(pct)}%`;
}

function percentWidth(part, total) {
  if (!total || part <= 0) return 0;
  const pct = (part / total) * 100;
  if (pct < 1) return 2;
  return Math.min(100, Math.round(pct));
}

function previousMonth(key) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  return monthKey(date);
}

function weekday(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return "일월화수목금토"[new Date(year, month - 1, day).getDay()];
}

function setFormError(message) {
  els.error.textContent = message || "";
  els.error.hidden = !message;
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, 2600);
}

function clearPendingDelete() {
  clearTimeout(pending.timer);
  pending.type = null;
  pending.id = null;
  document.querySelectorAll(".is-confirm").forEach((button) => {
    button.classList.remove("is-confirm");
    if (button.classList.contains("tx-icon")) {
      button.innerHTML = txGlyph("delete");
      button.setAttribute("aria-label", button.dataset.label || "삭제");
    }
    else {
      button.textContent = button.dataset.label || "삭제";
      if (button.dataset.cardDelete) button.setAttribute("aria-label", "삭제");
    }
  });
}

function renderMonth() {
  const [year, month] = ui.month.split("-").map(Number);
  els.month.textContent = `${year}년 ${month}월`;
  document.title = `${year}년 ${month}월 가계부`;
}

function fillYearSelect() {
  const todayYear = Number(todayStr().slice(0, 4));
  const start = Math.min(2000, pickerYear);
  const end = Math.max(todayYear + 20, pickerYear);
  els.yearSelect.innerHTML = Array.from({ length: end - start + 1 }, (_, index) => {
    const year = start + index;
    return `<option value="${year}">${year}년</option>`;
  }).join("");
  els.yearSelect.value = String(pickerYear);
}

function renderMonthPanel() {
  const [currentYear, currentMonth] = ui.month.split("-").map(Number);
  const [todayYear, todayMonth] = todayStr().split("-").map(Number);
  if (els.yearSelect.value !== String(pickerYear)) els.yearSelect.value = String(pickerYear);
  els.monthGrid.innerHTML = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const selected = pickerYear === currentYear && month === currentMonth;
    const today = pickerYear === todayYear && month === todayMonth;
    const classes = ["month-choice", selected ? "is-selected" : "", today ? "is-today" : ""].filter(Boolean).join(" ");
    return `<button type="button" class="${classes}" data-pick-month="${month}" aria-pressed="${selected}">${month}월</button>`;
  }).join("");
}

function openMonthPanel() {
  pickerYear = Number(ui.month.slice(0, 4));
  fillYearSelect();
  renderMonthPanel();
  els.monthPanel.hidden = false;
  els.month.setAttribute("aria-expanded", "true");
}

function closeMonthPanel() {
  els.monthPanel.hidden = true;
  els.month.setAttribute("aria-expanded", "false");
}

function mountDateFields() {
  document.querySelectorAll('input[type="date"]').forEach((input) => {
    if (input.closest(".date-shell")) return;
    const shell = document.createElement("div");
    shell.className = "date-shell";
    input.parentNode.insertBefore(shell, input);
    shell.appendChild(input);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "date-open";
    button.setAttribute("aria-label", "달력 열기");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = DATE_ICON;
    shell.appendChild(button);
    const toggle = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (datePickerInput === input && !els.datePopover.hidden) closeDatePopover();
      else openDatePopover(input);
    };
    button.addEventListener("click", toggle);
    input.addEventListener("mousedown", toggle);
    input.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        openDatePopover(input);
      }
    });
  });
}

function dateCursorParts() {
  return datePickerCursor.split("-").map(Number);
}

function setDateNavLabel() {
  const label = datePickerMode === "months" ? ["이전 해", "다음 해"] : ["이전 달", "다음 달"];
  els.datePopover.querySelector('[data-date-shift="-1"]').setAttribute("aria-label", label[0]);
  els.datePopover.querySelector('[data-date-shift="1"]').setAttribute("aria-label", label[1]);
}

function renderDateGrid() {
  const [year, month] = dateCursorParts();
  const selected = datePickerInput && isValidDate(datePickerInput.value) ? datePickerInput.value : "";
  const today = todayStr();
  const first = new Date(year, month - 1, 1);
  const start = new Date(year, month - 1, 1 - first.getDay());
  els.dateGrid.innerHTML = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const outside = date.getMonth() !== month - 1;
    const classes = [
      "date-day",
      outside ? "is-out" : "",
      iso === selected ? "is-selected" : "",
      iso === today ? "is-today" : "",
      date.getDay() === 0 ? "is-sun" : "",
      date.getDay() === 6 ? "is-sat" : "",
    ].filter(Boolean).join(" ");
    return `<button type="button" class="${classes}" data-pick-date="${iso}" aria-pressed="${iso === selected}" aria-label="${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일">${date.getDate()}</button>`;
  }).join("");
  els.datePopTitle.textContent = `${year}년 ${month}월`;
  els.datePopTitle.setAttribute("aria-expanded", "false");
  setDateNavLabel();
}

function renderDateMonths() {
  const [year, month] = dateCursorParts();
  const [todayYear, todayMonth] = todayStr().split("-").map(Number);
  const start = Math.min(2000, year);
  const end = Math.max(todayYear + 20, year);
  els.dateYear.innerHTML = Array.from({ length: end - start + 1 }, (_, index) => {
    const value = start + index;
    return `<option value="${value}">${value}년</option>`;
  }).join("");
  els.dateYear.value = String(year);
  els.dateMonthGrid.innerHTML = Array.from({ length: 12 }, (_, index) => {
    const value = index + 1;
    const selected = value === month;
    const today = year === todayYear && value === todayMonth;
    const classes = ["date-month", selected ? "is-selected" : "", today ? "is-today" : ""].filter(Boolean).join(" ");
    return `<button type="button" class="${classes}" data-pick-date-month="${value}" aria-pressed="${selected}">${value}월</button>`;
  }).join("");
  els.datePopTitle.textContent = `${year}년`;
  els.datePopTitle.setAttribute("aria-expanded", "true");
  setDateNavLabel();
}

function placeDatePopover() {
  const rect = datePickerInput.getBoundingClientRect();
  const pop = els.datePopover;
  const width = pop.offsetWidth;
  const height = pop.offsetHeight;
  let left = Math.min(rect.left, window.innerWidth - width - 12);
  left = Math.max(12, left);
  let top = rect.bottom + 8;
  if (top + height > window.innerHeight - 12) top = Math.max(12, rect.top - height - 8);
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}

function showDatePickerMode(mode) {
  datePickerMode = mode;
  const months = mode === "months";
  els.datePopDays.hidden = months;
  els.datePopMonths.hidden = !months;
  if (months) renderDateMonths();
  else renderDateGrid();
  placeDatePopover();
}

function openDatePopover(input) {
  closeMonthPanel();
  document.querySelectorAll(".date-open").forEach((button) => button.setAttribute("aria-expanded", "false"));
  datePickerInput = input;
  const value = isValidDate(input.value) ? input.value : todayStr();
  datePickerCursor = value.slice(0, 7);
  els.datePopover.hidden = false;
  input.parentElement.querySelector(".date-open").setAttribute("aria-expanded", "true");
  showDatePickerMode("days");
  els.datePopTitle.focus();
}

function closeDatePopover(restoreFocus) {
  if (els.datePopover.hidden) return;
  const input = datePickerInput;
  els.datePopover.hidden = true;
  datePickerMode = "days";
  document.querySelectorAll(".date-open").forEach((button) => button.setAttribute("aria-expanded", "false"));
  datePickerInput = null;
  if (restoreFocus && input) input.parentElement.querySelector(".date-open").focus();
}

function shiftDateCursor(delta) {
  const [year, month] = dateCursorParts();
  if (datePickerMode === "months") {
    const next = Math.min(2100, Math.max(1970, year + delta));
    datePickerCursor = `${next}-${pad(month)}`;
    renderDateMonths();
    return;
  }
  datePickerCursor = monthKey(new Date(year, month - 1 + delta, 1));
  renderDateGrid();
}

function applyPickedDate(iso) {
  if (!datePickerInput || !isValidDate(iso)) return;
  datePickerInput.value = iso;
  datePickerInput.dispatchEvent(new Event("input", { bubbles: true }));
  datePickerInput.dispatchEvent(new Event("change", { bubbles: true }));
  closeDatePopover();
}

function goToMonth(year, month) {
  ui.month = `${year}-${pad(month)}`;
  const days = new Date(year, month, 0).getDate();
  const wanted = ui.selectedDate ? Number(ui.selectedDate.slice(8, 10)) : 1;
  const today = todayStr();
  ui.selectedDate = today.startsWith(ui.month) ? today : `${ui.month}-${pad(Math.min(wanted, days))}`;
  closeMonthPanel();
  renderDataViews();
}

function totalsHtml(list) {
  const expense = sum(list, "expense");
  const income = sum(list, "income");
  const balance = income - expense;
  const expenseCount = list.filter((tx) => tx.kind === "expense").length;
  const incomeCount = list.filter((tx) => tx.kind === "income").length;
  let balanceClass = "";
  let balanceSub = "아직 기록이 없습니다";
  if (list.length && balance < 0) {
    balanceClass = "is-negative";
    balanceSub = "지출이 더 많습니다";
  } else if (list.length && balance > 0) {
    balanceClass = "is-positive";
    balanceSub = "수입이 더 많습니다";
  } else if (list.length) {
    balanceSub = "수입과 지출이 같습니다";
  }
  return `
    <section class="summary" aria-label="이번 달 합계">
      <article class="stat expense">
        <p class="stat-label">총 사용 금액</p>
        <p class="stat-value">${formatWon(expense)}</p>
        <p class="stat-sub">${expenseCount}건</p>
      </article>
      <article class="stat income">
        <p class="stat-label">수입</p>
        <p class="stat-value">${formatWon(income)}</p>
        <p class="stat-sub">${incomeCount}건</p>
      </article>
      <article class="stat balance ${balanceClass}">
        <p class="stat-label">남은 금액</p>
        <p class="stat-value">${formatSignedWon(balance)}</p>
        <p class="stat-sub">${balanceSub}</p>
      </article>
    </section>
  `;
}

function renderSelect() {
  const kind = currentKind();
  const categories = categoriesOf(kind);
  const previous = preferCategoryId || els.category.value;
  preferCategoryId = null;
  els.category.innerHTML = categories.map((category) => (
    `<option value="${esc(category.id)}">${esc(category.name)}</option>`
  )).join("");
  if (categories.some((category) => category.id === previous)) els.category.value = previous;
  const selected = els.category.value;
  els.categoryPicks.innerHTML = categories.length
    ? categories.map((category) => {
      const on = category.id === selected;
      return `<button type="button" class="category-pick${on ? " is-selected" : ""}" data-cat-pick="${esc(category.id)}" aria-pressed="${on}"><span class="dot" style="background:${safeColor(category.color)}"></span>${esc(category.name)}</button>`;
    }).join("")
    : `<p class="empty">품목을 추가해 주세요.</p>`;
}

function renderFormMode() {
  const editing = Boolean(editingId);
  const kind = currentKind();
  const repeat = els.repeat.value;
  els.title.textContent = editing ? "내역 수정" : "내역 입력";
  els.hint.textContent = editing
    ? "선택한 기록 한 건을 고치고 있습니다."
    : "날짜와 품목을 고르고, 결제 수단과 계산기로 금액을 넣으면 이 달에 바로 쌓입니다.";
  els.payLabel.textContent = kind === "income" ? "입금" : "결제";
  let label = editing ? "수정 저장" : (kind === "income" ? "수입 추가" : "지출 추가");
  if (!editing && repeat === "monthly") label = kind === "income" ? "매달 수입 추가" : "매달 지출 추가";
  if (!editing && repeat === "weekly") label = kind === "income" ? "매주 수입 추가" : "매주 지출 추가";
  els.submit.textContent = label;
  els.cancel.hidden = !editing;
  els.repeatField.hidden = editing;
  const repeating = !editing && repeat !== "none";
  els.repeatUntilField.hidden = !repeating;
  els.repeatHint.hidden = !repeating;
  els.form.closest(".card").classList.toggle("is-editing", editing);
  renderPays();
}

function renderPays() {
  const account = currentAccount();
  const noun = payNoun(account);
  const list = paysOf(account);
  els.cardField.hidden = !ACCOUNTS[account];
  document.getElementById("card-label").textContent = `${noun} 종류`;
  els.cardNew.placeholder = `새 ${noun}`;
  els.cardNew.setAttribute("aria-label", `새 ${noun}`);
  const previous = preferPayId || selectedPay[account];
  const switched = payAccountShown !== account;
  payAccountShown = account;
  preferPayId = null;
  selectedPay[account] = list.some((pay) => pay.id === previous) ? previous : "";
  els.cardPicks.innerHTML = list.length
    ? list.map((pay) => {
      const on = pay.id === selectedPay[account];
      return `<span class="card-chip"><button type="button" class="category-pick${on ? " is-selected" : ""}" data-card-pick="${esc(pay.id)}" aria-pressed="${on}">${esc(pay.name)}</button><button type="button" class="text-btn danger card-remove" data-card-delete="${esc(pay.id)}" data-label="×" aria-label="삭제">×</button></span>`;
    }).join("")
    : `<p class="empty">${noun} 종류를 추가해 주세요.</p>`;
  if (switched) els.cardNew.value = "";
  if (!list.length) els.cardAdd.hidden = false;
  else if (switched) els.cardAdd.hidden = true;
}

function renderCatalog() {
  if (pending.type === "cat") clearPendingDelete();
  els.catalog.innerHTML = `
    <div class="card-head">
      <h2>품목 설정</h2>
      <p>지출과 수입 품목을 추가하거나 이름을 고칩니다. 이름을 바꾸면 이전 기록에도 함께 적용됩니다.</p>
    </div>
    ${catalogGroup("expense", "지출 품목", "새 지출 품목")}
    ${catalogGroup("income", "수입 품목", "새 수입 품목")}
  `;
}

function catalogGroup(type, title, placeholder) {
  const rows = categoriesOf(type).map((category) => `
    <li class="cat-row">
      <input data-cat-id="${esc(category.id)}" value="${esc(category.name)}" maxlength="20" aria-label="${esc(category.name)} 이름" spellcheck="false">
      <span class="cat-count" title="전체 기록">${usageCount(category.id)}건</span>
      <button type="button" class="text-btn danger" data-cat-delete="${esc(category.id)}">삭제</button>
    </li>
  `).join("");
  const empty = rows ? "" : `<p class="empty">품목이 없습니다.</p>`;
  return `
    <section class="cat-group">
      <h3>${title}</h3>
      <ul class="cat-scroll">${rows}</ul>
      ${empty}
      <form class="cat-add" data-add-cat="${type}">
        <input name="name" maxlength="20" placeholder="${placeholder}" aria-label="${placeholder}" spellcheck="false">
        <button type="submit" class="secondary">추가</button>
      </form>
    </section>
  `;
}

function renderList() {
  if (pending.type === "tx") clearPendingDelete();
  const list = visibleTransactions().sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  els.count.textContent = list.length ? `${list.length}건` : "";
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.filter === ui.filter));
  });
  if (!list.length) {
    const message = monthTransactions().length
      ? "이 조건에 맞는 내역이 없습니다."
      : "이 달의 내역이 없습니다.";
    els.list.innerHTML = `<p class="empty">${message}</p>`;
    return;
  }
  const groups = new Map();
  list.forEach((tx) => {
    if (!groups.has(tx.date)) groups.set(tx.date, []);
    groups.get(tx.date).push(tx);
  });
  els.list.innerHTML = [...groups].map(([date, items]) => {
    const [, month, day] = date.split("-");
    const expense = sum(items, "expense");
    const income = sum(items, "income");
    const parts = [];
    if (expense) parts.push(`지출 ${formatWon(expense)}`);
    if (income) parts.push(`수입 ${formatWon(income)}`);
    return `
      <section>
        <div class="day-head">
          <strong>${Number(month)}월 ${Number(day)}일 ${weekday(date)}요일</strong>
          <span class="day-tools">
            <span class="day-sum">${parts.join(" · ")}</span>
            <button type="button" class="secondary" data-add-day="${date}">추가</button>
          </span>
        </div>
        <ul class="tx-list">
          ${items.map((tx) => txRow(tx, true)).join("")}
        </ul>
      </section>
    `;
  }).join("");
}

function txGlyph(kind) {
  const pencil = `<path d="M4 16.6V20h3.4L18.7 8.7a1.9 1.9 0 0 0-2.7-2.7L4.7 16.3 4 16.6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M13.6 6.4l4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
  const trash = `<path d="M5 7h14M9 7V5h6v2M7.5 7l.8 13h7.4l.8-13M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${kind === "edit" ? pencil : trash}</svg>`;
}

function txActions(tx) {
  return `
    <button type="button" class="tx-icon" data-edit="${esc(tx.id)}" aria-label="수정">${txGlyph("edit")}</button>
    <button type="button" class="tx-icon danger" data-delete="${esc(tx.id)}" data-label="삭제" aria-label="삭제">${txGlyph("delete")}</button>
  `;
}

function txRow(tx, inline) {
  const category = categoryById(tx.categoryId);
  const name = category ? category.name : "삭제된 품목";
  const color = category ? safeColor(category.color) : "#999999";
  const sign = tx.kind === "income" ? "+" : "−";
  const editing = tx.id === editingId ? " is-editing" : "";
  const note = tx.note ? `<span class="tx-note" title="${esc(tx.note)}">${esc(tx.note)}</span>` : `<span class="tx-note"></span>`;
  const accountName = accountLabel(tx.account, tx.payId);
  const account = accountName ? `<span class="pay-badge">${esc(accountName)}</span>` : "";
  const actions = txActions(tx);
  return `
    <li class="tx${editing}${inline ? " tx-static" : ""}" data-tx="${esc(tx.id)}">
      <div class="tx-swipe">
        ${inline ? "" : `<div class="tx-reveal" aria-hidden="true" inert>${actions}</div>`}
        <div class="tx-face">
          <span class="dot" style="background:${color}"></span>
          <span class="tx-cat">${esc(name)}${account}${tx.recurringId ? `<span class="repeat-badge">반복</span>` : ""}</span>
          ${note}
          <span class="tx-amt ${tx.kind}">${sign}${formatWon(tx.amount)}</span>
          ${inline ? `<span class="tx-inline">${actions}</span>` : ""}
        </div>
      </div>
    </li>
  `;
}

function renderAnalysis() {
  const list = monthTransactions();
  if (!list.length) {
    els.analysis.innerHTML = `
      ${totalsHtml(list)}
      <section class="card empty-block">
        <h2>아직 분석할 기록이 없습니다</h2>
        <p>내역에 수입이나 지출을 추가하면 품목 비중과 일별 지출을 보여 드립니다.</p>
        <button type="button" class="primary" id="goto-ledger">내역 입력하기</button>
      </section>
    `;
    return;
  }
  const expense = sum(list, "expense");
  const income = sum(list, "income");
  const balance = income - expense;
  const expenseCount = list.filter((tx) => tx.kind === "expense").length;
  const incomeCount = list.filter((tx) => tx.kind === "income").length;
  const rows = [
    ["총 사용 금액", formatWon(expense), `${expenseCount}건`, "expense"],
    ["수입", formatWon(income), `${incomeCount}건`, "income"],
    ["남은 금액", formatSignedWon(balance), balance < 0 ? "지출이 더 많습니다" : balance > 0 ? "수입이 더 많습니다" : "같습니다", balance < 0 ? "expense" : "income"],
  ];
  if (income > 0 && expense > 0) {
    rows.push(["지출 비율", percentLabel(expense, income), "수입 대비", ""]);
  }
  const topExpense = topCategory(list, "expense");
  const topIncome = topCategory(list, "income");
  if (topExpense) {
    rows.push(["많이 쓴 품목", formatWon(topExpense.amount), `${topExpense.name} · ${percentLabel(topExpense.amount, expense)}`, "expense"]);
  } else if (topIncome) {
    rows.push(["큰 수입 품목", formatWon(topIncome.amount), `${topIncome.name} · ${percentLabel(topIncome.amount, income)}`, "income"]);
  }
  const prev = monthTransactions(previousMonth(ui.month));
  const prevExpense = sum(prev, "expense");
  if (prev.length) {
    const diff = expense - prevExpense;
    let note = "지난달과 같습니다";
    if (diff > 0) note = `${formatWon(diff)} 늘었습니다`;
    else if (diff < 0) note = `${formatWon(Math.abs(diff))} 줄었습니다`;
    if (prevExpense > 0 && diff !== 0) note += ` · ${Math.round((Math.abs(diff) / prevExpense) * 100)}%`;
    rows.push(["지난달 지출", formatWon(prevExpense), note, diff > 0 ? "expense" : diff < 0 ? "income" : ""]);
  }

  const [year, month] = ui.month.split("-").map(Number);
  const daily = dailyExpenses(year, month, list);
  els.analysis.innerHTML = `
    ${totalsHtml(list)}
    <section class="card insights">
      <h2>이번 달 요약</h2>
      <table class="summary-table">
        <thead>
          <tr><th>항목</th><th>금액</th><th>비고</th></tr>
        </thead>
        <tbody>
          ${rows.map(([label, amount, note, tone]) => `
            <tr>
              <th scope="row">${esc(label)}</th>
              <td class="num ${tone}">${esc(amount)}</td>
              <td>${esc(note)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
    <div class="analysis-grid">
      ${breakdownCard("지출 품목", list, "expense")}
      ${breakdownCard("수입 품목", list, "income")}
    </div>
    <section class="card analysis-card">
      <h2>일별 지출</h2>
      ${daily.html}
    </section>
  `;
}

function topCategory(list, kind) {
  const totals = groupCategory(list, kind);
  return totals[0] || null;
}

function groupCategory(list, kind) {
  const map = new Map();
  list.forEach((tx) => {
    if (tx.kind !== kind) return;
    const current = map.get(tx.categoryId) || 0;
    map.set(tx.categoryId, current + tx.amount);
  });
  return [...map.entries()].map(([id, amount]) => {
    const category = categoryById(id);
    return {
      id,
      name: category ? category.name : "삭제된 품목",
      color: category ? safeColor(category.color) : "#999999",
      amount,
    };
  }).sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "ko"));
}

function breakdownCard(title, list, kind) {
  const rows = groupCategory(list, kind);
  const total = sum(list, kind);
  const body = rows.length ? rows.map((row) => {
    return `
      <div class="bar-row">
        <div class="bar-top">
          <span class="dot" style="background:${row.color}"></span>
          <span class="bar-name">${esc(row.name)}</span>
          <span class="bar-meta">${formatWon(row.amount)} · ${percentLabel(row.amount, total)}</span>
        </div>
        <div class="track"><div class="fill" style="width:${percentWidth(row.amount, total)}%; background:${row.color}"></div></div>
      </div>
    `;
  }).join("") : `<p class="empty">${kind === "expense" ? "이번 달 지출이 없습니다." : "이번 달 수입이 없습니다."}</p>`;
  return `<section class="card analysis-card"><h2>${title}</h2>${body}</section>`;
}

function dailyExpenses(year, month, list) {
  const count = new Date(year, month, 0).getDate();
  const totals = Array(count).fill(0);
  list.forEach((tx) => {
    if (tx.kind !== "expense") return;
    const day = Number(tx.date.slice(8, 10));
    if (day >= 1 && day <= count) totals[day - 1] += tx.amount;
  });
  const max = Math.max(...totals);
  if (!max) return { html: `<p class="empty">이번 달 지출이 없습니다.</p>` };
  const today = todayStr();
  let maxDay = 1;
  totals.forEach((value, index) => { if (value > totals[maxDay - 1]) maxDay = index + 1; });
  const activeDays = totals.filter((value) => value > 0).length;
  const bars = totals.map((value, index) => {
    const day = index + 1;
    const date = `${year}-${pad(month)}-${pad(day)}`;
    const height = value ? Math.max(4, Math.round((value / max) * 84)) : 0;
    const show = day === 1 || day === 10 || day === 20 || day === count || date === today;
    const classes = [date === today ? "is-today" : "", date > today ? "is-future" : ""].filter(Boolean).join(" ");
    return `
      <div class="day ${classes}" title="${month}월 ${day}일 지출 ${formatWon(value)}">
        <div class="bar-wrap"><span class="bar" style="height:${height}px"></span></div>
        <span class="num">${show ? day : ""}</span>
      </div>
    `;
  }).join("");
  return {
    html: `
      <p class="chart-note">지출이 있는 날은 ${activeDays}일이고, 가장 많이 쓴 날은 ${month}월 ${maxDay}일(${formatWon(totals[maxDay - 1])})입니다.</p>
      <div class="days" role="img" aria-label="${month}월 일별 지출. 가장 많이 쓴 날은 ${maxDay}일, ${formatWon(totals[maxDay - 1])}입니다.">${bars}</div>
    `,
  };
}

function dayTotals(date) {
  const list = state.transactions.filter((tx) => tx.date === date);
  return { list, expense: sum(list, "expense"), income: sum(list, "income") };
}

function renderCalendar() {
  const [year, month] = ui.month.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const days = new Date(year, month, 0).getDate();
  const cursor = new Date(year, month - 1, 1 - first.getDay());
  const today = todayStr();
  const cells = [];
  const cellCount = Math.ceil((first.getDay() + days) / 7) * 7;
  for (let index = 0; index < cellCount; index += 1) {
    const date = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
    const totals = dayTotals(date);
    const outside = cursor.getMonth() !== month - 1;
    const classes = [
      "cal-day",
      outside ? "is-outside" : "",
      date === today ? "is-today" : "",
      date === ui.selectedDate ? "is-selected" : "",
      cursor.getDay() === 0 ? "is-sun" : "",
      cursor.getDay() === 6 ? "is-sat" : "",
    ].filter(Boolean).join(" ");
    const amounts = [
      totals.expense ? amountLine("expense", totals.expense) : "",
      totals.income ? amountLine("income", totals.income) : "",
    ].join("");
    const spoken = [`${cursor.getMonth() + 1}월 ${cursor.getDate()}일`];
    if (totals.expense) spoken.push(`지출 ${formatWon(totals.expense)}`);
    if (totals.income) spoken.push(`수입 ${formatWon(totals.income)}`);
    if (!totals.expense && !totals.income) spoken.push("기록 없음");
    cells.push(`
      <button type="button" class="${classes}" data-day="${date}" aria-label="${esc(spoken.join(", "))}" aria-pressed="${date === ui.selectedDate}">
        <span class="cal-num">${cursor.getDate()}</span>
        ${amounts}
      </button>
    `);
    cursor.setDate(cursor.getDate() + 1);
  }
  els.calendar.innerHTML = `
    <div class="cal-week" aria-hidden="true">
      <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
    </div>
    <div class="cal-grid">${cells.join("")}</div>
  `;
  renderDayPanel();
}

function renderDayPanel() {
  const date = ui.selectedDate;
  if (!date) {
    els.dayPanel.innerHTML = "";
    return;
  }
  const totals = dayTotals(date);
  const rows = [...totals.list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const parts = [];
  if (totals.expense) parts.push(`지출 ${formatWon(totals.expense)}`);
  if (totals.income) parts.push(`수입 ${formatWon(totals.income)}`);
  const body = rows.length
    ? `<ul class="tx-list">${rows.map(txRow).join("")}</ul>`
    : "";
  els.dayPanel.classList.toggle("is-empty", rows.length === 0);
  els.dayPanel.innerHTML = `
    <div class="list-head">
      <button type="button" class="secondary" data-add-day="${date}">${rows.length ? "추가" : "이 날 입력"}</button>
    </div>
    <div class="day-scroll">
      ${rows.length ? `<p class="day-panel-sum">${parts.join(" · ")}</p>${body}` : ""}
    </div>
  `;
}

function addDays(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addMonthsClamped(iso, months) {
  const [year, month, day] = iso.split("-").map(Number);
  const target = new Date(year, month - 1 + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(Math.min(day, last))}`;
}

function occurrenceDates(start, frequency, end) {
  const cap = frequency === "weekly" ? 52 : 24;
  const fallback = frequency === "weekly" ? addDays(start, 7 * 11) : addMonthsClamped(start, 11);
  const until = end || fallback;
  const dates = [];
  for (let index = 0; dates.length < cap; index += 1) {
    const date = frequency === "weekly" ? addDays(start, 7 * index) : addMonthsClamped(start, index);
    if (date > until) break;
    dates.push(date);
  }
  const next = frequency === "weekly" ? addDays(start, 7 * dates.length) : addMonthsClamped(start, dates.length);
  return { dates, truncated: next <= until };
}

function renderRecurring() {
  if (pending.type === "rule") clearPendingDelete();
  const rules = state.recurring.filter((rule) => rule.active);
  if (!rules.length) {
    els.recurring.hidden = true;
    els.recurring.innerHTML = "";
    return;
  }
  const today = todayStr();
  els.recurring.hidden = false;
  els.recurring.innerHTML = `
    <div class="list-head">
      <h2>반복</h2>
    </div>
    <ul class="rule-list">
      ${rules.map((rule) => {
        const category = categoryById(rule.categoryId);
        const upcoming = state.transactions.filter((tx) => tx.recurringId === rule.id && tx.date >= today).length;
        const when = rule.frequency === "weekly" ? "매주" : "매달";
        const kind = rule.kind === "income" ? "수입" : "지출";
        return `
          <li class="rule">
            <span class="dot" style="background:${category ? safeColor(category.color) : "#999999"}"></span>
            <span class="rule-body">
              <span class="rule-title">${esc(category ? category.name : "삭제된 품목")} · ${when} ${kind}</span>
              <span class="rule-meta">${formatWon(rule.amount)}${accountLabel(rule.account, rule.payId) ? ` · ${esc(accountLabel(rule.account, rule.payId))}` : ""}${rule.note ? ` · ${esc(rule.note)}` : ""} · 앞으로 ${upcoming}건</span>
            </span>
            <button type="button" class="text-btn danger" data-label="중단" data-stop-recurring="${esc(rule.id)}">중단</button>
          </li>
        `;
      }).join("")}
    </ul>
  `;
}

function monthBounds(key) {
  const [year, month] = key.split("-").map(Number);
  const last = new Date(year, month, 0).getDate();
  return { start: `${key}-01`, end: `${key}-${pad(last)}` };
}

function daysBetween(start, end) {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  const diff = new Date(endYear, endMonth - 1, endDay) - new Date(startYear, startMonth - 1, startDay);
  return Math.round(diff / 86400000);
}

function overlapsMonth(goal, key) {
  const bounds = monthBounds(key);
  return goal.startDate <= bounds.end && goal.endDate >= bounds.start;
}

function spentInRange(start, end) {
  return state.transactions
    .filter((tx) => tx.kind === "expense" && tx.date >= start && tx.date <= end)
    .reduce((total, tx) => total + tx.amount, 0);
}

function formatRange(start, end) {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  const startText = `${startYear}년 ${startMonth}월 ${startDay}일`;
  const endText = startYear === endYear
    ? `${endMonth}월 ${endDay}일`
    : `${endYear}년 ${endMonth}월 ${endDay}일`;
  return `${startText} – ${endText}`;
}

function goalStatus(goal) {
  const spent = spentInRange(goal.startDate, goal.endDate);
  const remain = goal.amount - spent;
  const today = todayStr();
  const ratio = Math.min(100, Math.round((spent / goal.amount) * 100));
  let remainText = `${formatWon(remain)} 남음`;
  let remainClass = "ok";
  if (remain < 0) {
    remainText = `${formatWon(Math.abs(remain))} 초과`;
    remainClass = "over";
  } else if (remain === 0) {
    remainText = "목표 금액에 맞았습니다";
  }
  let when = "아직 시작 전입니다";
  if (today > goal.endDate) when = "기간이 끝났습니다";
  else if (today === goal.endDate) when = "오늘이 마지막 날입니다";
  else if (today >= goal.startDate) when = `${daysBetween(today, goal.endDate)}일 남았습니다`;
  let pace = "";
  if (today >= goal.startDate && today <= goal.endDate) {
    const totalDays = daysBetween(goal.startDate, goal.endDate) + 1;
    const elapsed = daysBetween(goal.startDate, today) + 1;
    const expected = Math.round((goal.amount * elapsed) / totalDays);
    if (spent > expected) pace = `이 시점에는 ${formatWon(spent - expected)} 더 썼습니다.`;
    else if (spent < expected) pace = `이 시점에는 ${formatWon(expected - spent)} 덜 썼습니다.`;
    else pace = "지금 속도면 목표에 맞습니다.";
  }
  return { spent, remain, remainText, remainClass, ratio, when, pace };
}

function goalSectionHtml(goals) {
  if (!goals.length) return "";
  return `
    <section class="card goal-progress">
      <h2>사용 목표</h2>
      <div class="goal-list">${goals.map((goal) => goalItemHtml(goal, false)).join("")}</div>
    </section>
  `;
}

function goalItemHtml(goal, actions) {
  const status = goalStatus(goal);
  const name = goal.name || "사용 목표";
  const width = status.spent > 0 ? Math.max(status.ratio, 2) : 0;
  const buttons = actions ? `
    <span class="tx-actions">
      <button type="button" data-goal-edit="${esc(goal.id)}">수정</button>
      <button type="button" class="danger" data-label="삭제" data-goal-delete="${esc(goal.id)}">삭제</button>
    </span>
  ` : "";
  return `
    <article class="goal-item${goal.id === editingGoalId ? " is-editing" : ""}">
      <div class="goal-top">
        <p class="goal-name">${esc(name)}</p>
        ${buttons}
      </div>
      <p class="goal-range">${formatRange(goal.startDate, goal.endDate)} · ${status.when}</p>
      <div class="goal-figures">
        <span>사용 ${formatWon(status.spent)}</span>
        <span class="goal-remain ${status.remainClass}">${status.remainText}</span>
      </div>
      <div class="track" aria-hidden="true"><div class="fill ${status.remain < 0 ? "over" : "ok"}" style="width:${width}%"></div></div>
      <p class="goal-pace">목표 ${formatWon(goal.amount)}${status.pace ? ` · ${status.pace}` : ""}</p>
    </article>
  `;
}

function renderGoalList() {
  if (pending.type === "goal") clearPendingDelete();
  const goals = [...state.goals].sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt));
  els.goalList.innerHTML = goals.length ? `<div class="goal-list">${goals.map((goal) => goalItemHtml(goal, true)).join("")}</div>` : "";
}

function renderGoalMode() {
  const editing = Boolean(editingGoalId);
  els.goalDialogTitle.textContent = editing ? "목표 수정" : "목표 추가";
  els.goalSubmit.textContent = editing ? "저장" : "추가하기";
}

function openGoalDialog() {
  closeMonthPanel();
  closeDatePopover();
  renderGoalMode();
  els.goalDialog.hidden = false;
  els.goalName.focus();
}

function setGoalError(message) {
  els.goalError.textContent = message || "";
  els.goalError.hidden = !message;
}

function resetGoalForm() {
  editingGoalId = null;
  const bounds = monthBounds(ui.month);
  els.goalName.value = "";
  els.goalStart.value = bounds.start;
  els.goalEnd.value = bounds.end;
  els.goalAmount.value = "";
  setGoalError("");
  renderGoalMode();
  els.goalDialog.hidden = true;
}

function readGoalForm() {
  const name = els.goalName.value.trim();
  const startDate = els.goalStart.value;
  const endDate = els.goalEnd.value;
  const digits = els.goalAmount.value.replace(/\D/g, "");
  const amount = Number(digits);
  if (name.length > 20) {
    setGoalError("이름은 20자까지 입력할 수 있습니다.");
    return null;
  }
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    setGoalError("시작일과 종료일을 확인해 주세요.");
    return null;
  }
  if (endDate < startDate) {
    setGoalError("종료일은 시작일과 같거나 이후여야 합니다.");
    els.goalEnd.focus();
    return null;
  }
  if (!digits || !Number.isInteger(amount) || amount <= 0 || amount > 100000000000) {
    setGoalError("목표 금액은 1원 이상 입력해 주세요.");
    els.goalAmount.focus();
    return null;
  }
  setGoalError("");
  return { name, startDate, endDate, amount };
}

function saveGoal(data) {
  if (editingGoalId) {
    const goal = state.goals.find((item) => item.id === editingGoalId);
    if (!goal) return;
    Object.assign(goal, data);
  } else {
    if (state.goals.length >= 20) {
      setGoalError("목표는 20개까지 넣을 수 있습니다.");
      return;
    }
    state.goals.push({ id: uid(), ...data, createdAt: new Date().toISOString() });
  }
  resetGoalForm();
  commit();
}

function deleteGoal(id) {
  if (editingGoalId === id) resetGoalForm();
  state.goals = state.goals.filter((goal) => goal.id !== id);
  commit();
}

function setExportError(message) {
  els.exportError.textContent = message || "";
  els.exportError.hidden = !message;
}

function exportRows(start, end) {
  return state.transactions
    .filter((tx) => tx.date >= start && tx.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

function sheetCell(value, type, style, formula, mergeAcross) {
  const styleAttr = style ? ` ss:StyleID="${style}"` : "";
  const formulaAttr = formula ? ` ss:Formula="${esc(formula)}"` : "";
  const mergeAttr = mergeAcross ? ` ss:MergeAcross="${mergeAcross}"` : "";
  const data = type === "Number" ? value : esc(value);
  return `<Cell${styleAttr}${formulaAttr}${mergeAttr}><Data ss:Type="${type}">${data}</Data></Cell>`;
}

function exportDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${year}. ${month}. ${day}. ${weekday(iso)}`;
}

function sheetStyle(id, { font, fill, align, format, border } = {}) {
  const fontXml = font ? `<Font ss:FontName="Malgun Gothic" ss:Size="${font.size || 11}" ss:Color="${font.color || "#1F1A17"}"${font.bold ? ` ss:Bold="1"` : ""}/>` : "";
  const fillXml = fill ? `<Interior ss:Color="${fill}" ss:Pattern="Solid"/>` : "";
  const alignXml = align ? `<Alignment ss:Horizontal="${align}" ss:Vertical="Center"/>` : `<Alignment ss:Vertical="Center"/>`;
  const formatXml = format ? `<NumberFormat ss:Format="${format}"/>` : "";
  const borderXml = border ? `<Borders>${["Left", "Right", "Top", "Bottom"].map((side) => `<Border ss:Position="${side}" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E4DCD0"/>`).join("")}</Borders>` : "";
  return `<Style ss:ID="${id}">${alignXml}${fontXml}${fillXml}${formatXml}${borderXml}</Style>`;
}

function categoryBreakdown(rows) {
  const groups = new Map();
  rows.forEach((tx) => {
    const category = categoryById(tx.categoryId);
    const name = category ? category.name : "삭제된 품목";
    const key = `${tx.kind}:${name}`;
    const current = groups.get(key) || { kind: tx.kind, name, count: 0, amount: 0 };
    current.count += 1;
    current.amount += tx.amount;
    groups.set(key, current);
  });
  const list = [...groups.values()];
  const totals = {
    expense: list.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0),
    income: list.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0),
  };
  return list
    .map((item) => ({ ...item, share: totals[item.kind] ? item.amount / totals[item.kind] : 0 }))
    .sort((a, b) => (a.kind === b.kind ? b.amount - a.amount || a.name.localeCompare(b.name, "ko") : (a.kind === "expense" ? -1 : 1)));
}

function workbookXml(rows, start, end) {
  const expense = rows.filter((tx) => tx.kind === "expense").reduce((total, tx) => total + tx.amount, 0);
  const income = rows.filter((tx) => tx.kind === "income").reduce((total, tx) => total + tx.amount, 0);
  const balance = income - expense;
  const first = 7;
  const last = rows.length + 6;
  const headers = ["날짜", "구분", "품목", "내용", "결제", "반복", "금액"];
  const body = rows.map((tx, index) => {
    const alt = index % 2 === 1;
    const base = alt ? "cellAlt" : "cell";
    const center = alt ? "centerAlt" : "center";
    const incomeRow = tx.kind === "income";
    const category = categoryById(tx.categoryId);
    return `<Row ss:Height="22" ss:AutoFitHeight="0">${[
      sheetCell(exportDate(tx.date), "String", base),
      sheetCell(incomeRow ? "수입" : "지출", "String", incomeRow ? "incomeKind" : "expenseKind"),
      sheetCell(category ? category.name : "삭제된 품목", "String", base),
      sheetCell(tx.note, "String", base),
      sheetCell(accountLabel(tx.account, tx.payId), "String", center),
      sheetCell(tx.recurringId ? "반복" : "", "String", center),
      sheetCell(tx.amount, "Number", incomeRow ? "incomeMoney" : "expenseMoney"),
      sheetCell(incomeRow ? 0 : tx.amount, "Number", "hiddenNumber"),
      sheetCell(incomeRow ? tx.amount : 0, "Number", "hiddenNumber"),
    ].join("")}</Row>`;
  }).join("");
  const expenseFormula = `SUBTOTAL(109,H${first}:H${last})`;
  const incomeFormula = `SUBTOTAL(109,I${first}:I${last})`;
  const balanceFormula = `(${incomeFormula})-(${expenseFormula})`;
  const groups = categoryBreakdown(rows);
  const categoryLast = groups.length + 4;
  const categoryBody = groups.map((item, index) => {
    const alt = index % 2 === 1;
    const incomeRow = item.kind === "income";
    return `<Row ss:Height="22" ss:AutoFitHeight="0">${[
      sheetCell(incomeRow ? "수입" : "지출", "String", incomeRow ? "incomeKind" : "expenseKind"),
      sheetCell(item.name, "String", alt ? "cellAlt" : "cell"),
      sheetCell(item.count, "Number", alt ? "countAlt" : "count"),
      sheetCell(item.amount, "Number", incomeRow ? "incomeMoney" : "expenseMoney"),
      sheetCell(item.share, "Number", alt ? "shareAlt" : "share"),
    ].join("")}</Row>`;
  }).join("");
  const styles = [
    sheetStyle("title", { font: { size: 18, color: "#F6F1E8", bold: true }, fill: "#1F3D36", align: "Left" }),
    sheetStyle("period", { font: { size: 11, color: "#5E574F" }, fill: "#F3EEE6", align: "Left" }),
    sheetStyle("expenseLabel", { font: { size: 11, color: "#9A3412", bold: true }, fill: "#F8E8E1", align: "Center" }),
    sheetStyle("expenseValue", { font: { size: 13, color: "#9A3412", bold: true }, fill: "#F8E8E1", align: "Right", format: "#,##0" }),
    sheetStyle("incomeLabel", { font: { size: 11, color: "#0F6B56", bold: true }, fill: "#E5F2ED", align: "Center" }),
    sheetStyle("incomeValue", { font: { size: 13, color: "#0F6B56", bold: true }, fill: "#E5F2ED", align: "Right", format: "#,##0" }),
    sheetStyle("balanceLabel", { font: { size: 11, color: "#1F3D36", bold: true }, fill: "#E7EEE9", align: "Center" }),
    sheetStyle("balanceValue", { font: { size: 13, color: balance < 0 ? "#9A3412" : "#0F6B56", bold: true }, fill: "#E7EEE9", align: "Right", format: "#,##0" }),
    sheetStyle("header", { font: { size: 11, color: "#F6F1E8", bold: true }, fill: "#1F3D36", align: "Center", border: true }),
    sheetStyle("cell", { font: { size: 11, color: "#1F1A17" }, fill: "#FFFFFF", align: "Left", border: true }),
    sheetStyle("cellAlt", { font: { size: 11, color: "#1F1A17" }, fill: "#F7F3EC", align: "Left", border: true }),
    sheetStyle("center", { font: { size: 11, color: "#1F1A17" }, fill: "#FFFFFF", align: "Center", border: true }),
    sheetStyle("centerAlt", { font: { size: 11, color: "#1F1A17" }, fill: "#F7F3EC", align: "Center", border: true }),
    sheetStyle("count", { font: { size: 11, color: "#1F1A17" }, fill: "#FFFFFF", align: "Center", format: "#,##0", border: true }),
    sheetStyle("countAlt", { font: { size: 11, color: "#1F1A17" }, fill: "#F7F3EC", align: "Center", format: "#,##0", border: true }),
    sheetStyle("share", { font: { size: 11, color: "#1F1A17" }, fill: "#FFFFFF", align: "Right", format: "0.0%", border: true }),
    sheetStyle("shareAlt", { font: { size: 11, color: "#1F1A17" }, fill: "#F7F3EC", align: "Right", format: "0.0%", border: true }),
    sheetStyle("expenseKind", { font: { size: 11, color: "#9A3412", bold: true }, fill: "#F8E8E1", align: "Center", border: true }),
    sheetStyle("incomeKind", { font: { size: 11, color: "#0F6B56", bold: true }, fill: "#E5F2ED", align: "Center", border: true }),
    sheetStyle("expenseMoney", { font: { size: 11, color: "#9A3412", bold: true }, fill: "#F8E8E1", align: "Right", format: "#,##0", border: true }),
    sheetStyle("incomeMoney", { font: { size: 11, color: "#0F6B56", bold: true }, fill: "#E5F2ED", align: "Right", format: "#,##0", border: true }),
    sheetStyle("hiddenNumber", { format: "#,##0" }),
  ].join("");
  const period = `${formatRange(start, end)} · ${rows.length}건`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel">
<Styles>
<Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Malgun Gothic" ss:Size="11" ss:Color="#1F1A17"/></Style>
${styles}
</Styles>
<Worksheet ss:Name="내역">
<Table ss:DefaultRowHeight="22">
<Column ss:Width="118"/><Column ss:Width="62"/><Column ss:Width="96"/><Column ss:Width="180"/><Column ss:Width="78"/><Column ss:Width="58"/><Column ss:Width="110"/>
<Column ss:Index="8" ss:Hidden="1" ss:Width="0"/><Column ss:Index="9" ss:Hidden="1" ss:Width="0"/>
<Row ss:Height="36" ss:AutoFitHeight="0">${sheetCell("가계부", "String", "title", null, 6)}</Row>
<Row ss:Height="24" ss:AutoFitHeight="0">${sheetCell(`${period} · 머리글 필터로 품목을 고르면 위 합계가 바뀝니다`, "String", "period", null, 6)}</Row>
<Row ss:Height="10" ss:AutoFitHeight="0"></Row>
<Row ss:Height="28" ss:AutoFitHeight="0">${[
    sheetCell("지출 합계", "String", "expenseLabel"),
    sheetCell(expense, "Number", "expenseValue", expenseFormula),
    sheetCell("수입 합계", "String", "incomeLabel"),
    sheetCell(income, "Number", "incomeValue", incomeFormula),
    sheetCell("남은 금액", "String", "balanceLabel"),
    sheetCell(balance, "Number", "balanceValue", balanceFormula, 1),
  ].join("")}</Row>
<Row ss:Height="10" ss:AutoFitHeight="0"></Row>
<Row ss:Height="24" ss:AutoFitHeight="0">${headers.map((name) => sheetCell(name, "String", "header")).join("")}${sheetCell("지출액", "String", "header")}${sheetCell("수입액", "String", "header")}</Row>
${body}
</Table>
<AutoFilter x:Range="R6C1:R${last}C7"/>
<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
<FreezePanes/>
<FrozenNoSplit/>
<SplitHorizontal>6</SplitHorizontal>
<TopRowBottomPane>7</TopRowBottomPane>
<ActivePane>2</ActivePane>
</WorksheetOptions>
</Worksheet>
<Worksheet ss:Name="품목별">
<Table ss:DefaultRowHeight="22">
<Column ss:Width="62"/><Column ss:Width="120"/><Column ss:Width="64"/><Column ss:Width="110"/><Column ss:Width="72"/>
<Row ss:Height="36" ss:AutoFitHeight="0">${sheetCell("품목별", "String", "title", null, 4)}</Row>
<Row ss:Height="24" ss:AutoFitHeight="0">${sheetCell(`${period} · 비중은 같은 구분 안에서의 비율입니다`, "String", "period", null, 4)}</Row>
<Row ss:Height="10" ss:AutoFitHeight="0"></Row>
<Row ss:Height="24" ss:AutoFitHeight="0">${["구분", "품목", "건수", "금액", "비중"].map((name) => sheetCell(name, "String", "header")).join("")}</Row>
${categoryBody}
</Table>
<AutoFilter x:Range="R4C1:R${categoryLast}C5"/>
<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
<FreezePanes/>
<FrozenNoSplit/>
<SplitHorizontal>4</SplitHorizontal>
<TopRowBottomPane>5</TopRowBottomPane>
<ActivePane>2</ActivePane>
</WorksheetOptions>
</Worksheet>
</Workbook>`;
}

function exportExcel(start, end) {
  const rows = exportRows(start, end);
  const xml = `\uFEFF${workbookXml(rows, start, end)}`;
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `가계부_${start}_${end}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast(`${rows.length}건을 엑셀 파일로 받았습니다.`);
}

function startGoalEdit(id) {
  const goal = state.goals.find((item) => item.id === id);
  if (!goal) return;
  editingGoalId = id;
  els.goalName.value = goal.name;
  els.goalStart.value = goal.startDate;
  els.goalEnd.value = goal.endDate;
  els.goalAmount.value = formatNumber(goal.amount);
  setGoalError("");
  renderGoalList();
  setTab("analysis");
  openGoalDialog();
  els.goalAmount.focus();
}

function renderDataViews() {
  renderMonth();
  renderCalendar();
  renderSelect();
  renderList();
  renderAnalysis();
  renderRecurring();
  renderGoalList();
  renderFormMode();
  renderGoalMode();
}

function commit(options = {}) {
  persist();
  renderDataViews();
  renderCatalog();
  if (!options.focusId) return;
  const row = document.querySelector(`[data-tx="${CSS.escape(options.focusId)}"]`);
  if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
}

function currentAccount() {
  return els.form.querySelector('input[name="account"]:checked')?.value || "card";
}

function setAccount(value) {
  const input = els.form.querySelector(`input[name="account"][value="${value}"]`);
  if (input) input.checked = true;
}

function resetCalc() {
  calc.entry = "0";
  calc.acc = null;
  calc.op = null;
  calc.fresh = true;
  calc.error = "";
  renderCalc();
}

function setCalcAmount(amount) {
  calc.entry = String(Math.round(Number(amount)) || 0);
  calc.acc = null;
  calc.op = null;
  calc.fresh = true;
  calc.error = "";
  renderCalc();
}

function renderCalc() {
  if (calc.error) {
    els.amountDisplay.textContent = calc.error;
    els.amountDisplay.classList.add("is-error");
    els.calcExpr.textContent = "";
    els.amount.value = "";
    return;
  }
  els.amountDisplay.classList.remove("is-error");
  const value = Number(calc.entry);
  els.amountDisplay.textContent = formatSignedWon(value).replace(/원$/, "");
  els.calcExpr.textContent = calc.acc !== null && calc.op
    ? `${formatNumber(calc.acc)} ${OP_LABEL[calc.op]}`
    : "";
  els.amount.value = value > 0 ? String(value) : "";
}

function applyOp(left, op, right) {
  if (op === "+") return left + right;
  if (op === "-") return left - right;
  if (op === "*") return left * right;
  if (right === 0) return null;
  return Math.round(left / right);
}

function commitOp(nextOp) {
  const current = Number(calc.entry);
  if (!Number.isFinite(current)) return false;
  if (calc.acc === null || !calc.op || calc.fresh) {
    calc.acc = current;
  } else {
    const result = applyOp(calc.acc, calc.op, current);
    if (result === null) {
      calc.error = "0으로 나눌 수 없습니다.";
      renderCalc();
      return false;
    }
    if (!Number.isSafeInteger(result) || Math.abs(result) > 100000000000) {
      calc.error = "계산 결과가 너무 큽니다.";
      renderCalc();
      return false;
    }
    calc.acc = result;
    calc.entry = String(result);
  }
  calc.op = nextOp;
  calc.fresh = true;
  calc.error = "";
  renderCalc();
  return true;
}

function pressCalc(key) {
  if (key === "clear") {
    resetCalc();
    return;
  }
  if (calc.error) {
    if (!/^\d+$/.test(key)) return;
    resetCalc();
  }
  if (key === "back") {
    if (calc.fresh && calc.op) {
      calc.op = null;
      calc.entry = String(calc.acc ?? 0);
      calc.acc = null;
      calc.fresh = true;
    } else if (!calc.fresh) {
      const next = calc.entry.replace(/^-/, "").slice(0, -1);
      calc.entry = next ? (calc.entry.startsWith("-") ? `-${next}` : next) : "0";
      if (calc.entry === "-") calc.entry = "0";
    }
    renderCalc();
    return;
  }
  if (key === "=") {
    if (calc.op) commitOp(null);
    return;
  }
  if (key === "+" || key === "-" || key === "*" || key === "/") {
    commitOp(key);
    return;
  }
  const digits = key === "00" ? "00" : key;
  if (!/^\d+$/.test(digits)) return;
  if (calc.fresh || calc.entry === "0") {
    calc.entry = String(Number(digits));
    calc.fresh = false;
  } else if (calc.entry.replace("-", "").length + digits.length <= 12) {
    calc.entry += digits;
  }
  renderCalc();
}

function readForm() {
  const date = els.date.value;
  const kind = currentKind();
  const categoryId = els.category.value;
  const account = currentAccount();
  if (calc.error) {
    setFormError(calc.error);
    return null;
  }
  if (calc.op) pressCalc("=");
  if (calc.error) {
    setFormError(calc.error);
    return null;
  }
  const digits = calc.entry.replace(/\D/g, "");
  const amount = Number(calc.entry);
  const note = els.note.value.trim();
  if (!isValidDate(date)) {
    setFormError("날짜를 확인해 주세요.");
    els.date.focus();
    return null;
  }
  const category = state.categories.find((item) => item.id === categoryId && item.type === kind);
  if (!category) {
    setFormError("품목을 선택하거나 추가해 주세요.");
    return null;
  }
  if (!ACCOUNTS[account]) {
    setFormError("카드, 체크카드, 통장 중 하나를 선택해 주세요.");
    return null;
  }
  const list = paysOf(account);
  const pay = payById(selectedPay[account]);
  if (!pay || pay.account !== account) {
    setFormError(list.length ? `${payNoun(account)} 종류를 골라 주세요.` : `${payNoun(account)} 종류를 추가해 주세요.`);
    return null;
  }
  const payId = pay.id;
  if (!digits || !Number.isInteger(amount) || amount <= 0 || amount > 100000000000) {
    setFormError("금액은 1원 이상 입력해 주세요.");
    els.amountDisplay.focus();
    return null;
  }
  if (note.length > 40) {
    setFormError("내용은 40자까지 입력할 수 있습니다.");
    return null;
  }
  const repeat = editingId ? "none" : els.repeat.value;
  const repeatUntil = repeat === "none" ? "" : els.repeatUntil.value;
  if (repeat !== "none" && repeatUntil && !isValidDate(repeatUntil)) {
    setFormError("종료일을 확인해 주세요.");
    return null;
  }
  if (repeat !== "none" && repeatUntil && repeatUntil < date) {
    setFormError("종료일은 시작일과 같거나 이후여야 합니다.");
    els.repeatUntil.focus();
    return null;
  }
  setFormError("");
  return { date, kind, categoryId, account, payId, amount, note, repeat, repeatUntil: repeatUntil || null };
}

function resetForm() {
  editingId = null;
  els.date.value = todayStr();
  els.note.value = "";
  els.repeat.value = "none";
  els.repeatUntil.value = "";
  setKind("expense");
  setAccount("card");
  selectedPay.card = "";
  selectedPay.check = "";
  selectedPay.bank = "";
  resetCalc();
  setFormError("");
  renderSelect();
  renderFormMode();
}

function setTab(tab) {
  const leavingEntry = ui.tab === "entry" && tab !== "entry";
  if (leavingEntry) resetForm();
  ui.tab = tab;
  document.getElementById("view-calendar").hidden = tab !== "calendar";
  document.getElementById("view-ledger").hidden = tab !== "ledger";
  document.getElementById("view-entry").hidden = tab !== "entry";
  document.getElementById("view-analysis").hidden = tab !== "analysis";
  document.getElementById("view-settings").hidden = tab !== "settings";
  document.body.classList.toggle("is-calendar", tab === "calendar");
  document.getElementById("tab-calendar").setAttribute("aria-selected", String(tab === "calendar"));
  document.getElementById("tab-ledger").setAttribute("aria-selected", String(tab === "ledger"));
  document.getElementById("tab-analysis").setAttribute("aria-selected", String(tab === "analysis"));
  document.getElementById("tab-settings").setAttribute("aria-selected", String(tab === "settings"));
  if (leavingEntry) {
    renderList();
    renderDayPanel();
  }
}

function selectDay(date) {
  ui.selectedDate = date;
  ui.month = date.slice(0, 7);
  renderDataViews();
}

function showEntry() {
  if (ui.tab !== "entry") ui.returnTab = ui.tab;
  setTab("entry");
  els.form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openLedgerForDate(date) {
  ui.selectedDate = date;
  ui.month = date.slice(0, 7);
  if (!editingId) els.date.value = date;
  renderDataViews();
  showEntry();
}

function startEdit(id) {
  const tx = state.transactions.find((item) => item.id === id);
  if (!tx) return;
  editingId = id;
  els.date.value = tx.date;
  els.note.value = tx.note || "";
  setCalcAmount(tx.amount);
  setKind(tx.kind);
  setAccount(ACCOUNTS[tx.account] ? tx.account : "bank");
  if (ACCOUNTS[tx.account]) selectedPay[tx.account] = tx.payId || "";
  preferCategoryId = tx.categoryId;
  setFormError("");
  ui.selectedDate = tx.date;
  ui.month = tx.date.slice(0, 7);
  renderDataViews();
  showEntry();
}

function saveTransaction(data) {
  let focusId = null;
  let toastMessage = "";
  if (editingId) {
    const tx = state.transactions.find((item) => item.id === editingId);
    if (!tx) return;
    tx.date = data.date;
    tx.kind = data.kind;
    tx.categoryId = data.categoryId;
    tx.amount = data.amount;
    tx.account = data.account;
    tx.payId = data.payId;
    tx.note = data.note;
    tx.recurringId = null;
    focusId = tx.id;
  } else if (data.repeat === "weekly" || data.repeat === "monthly") {
    const { dates, truncated } = occurrenceDates(data.date, data.repeat, data.repeatUntil);
    const recurringId = uid();
    const createdAt = new Date().toISOString();
    state.recurring.push({
      id: recurringId,
      kind: data.kind,
      categoryId: data.categoryId,
      amount: data.amount,
      account: data.account,
      payId: data.payId,
      note: data.note,
      frequency: data.repeat,
      startDate: data.date,
      endDate: data.repeatUntil,
      active: true,
      createdAt,
    });
    dates.forEach((date) => {
      const id = uid();
      if (!focusId && date.startsWith(ui.month)) focusId = id;
      state.transactions.push({
        id,
        date,
        kind: data.kind,
        categoryId: data.categoryId,
        amount: data.amount,
        account: data.account,
        payId: data.payId,
        note: data.note,
        recurringId,
        createdAt,
      });
    });
    const when = data.repeat === "weekly" ? "매주" : "매달";
    const kind = data.kind === "income" ? "수입" : "지출";
    toastMessage = `${when} ${kind} ${dates.length}건을 넣었습니다.`;
    if (truncated) toastMessage += " 한 번에 넣을 수 있는 횟수까지만 만들었습니다.";
  } else {
    focusId = uid();
    state.transactions.push({
      id: focusId,
      date: data.date,
      kind: data.kind,
      categoryId: data.categoryId,
      amount: data.amount,
      account: data.account,
      payId: data.payId,
      note: data.note,
      recurringId: null,
      createdAt: new Date().toISOString(),
    });
  }
  const moved = !data.date.startsWith(ui.month) && !toastMessage;
  const back = ui.returnTab || "ledger";
  resetForm();
  setTab(back);
  commit({ focusId });
  if (toastMessage) toast(toastMessage);
  else if (moved) toast("저장했습니다. 선택한 달이 아니라 목록에는 보이지 않습니다.");
}

function stopRecurring(id) {
  const rule = state.recurring.find((item) => item.id === id);
  if (!rule) return;
  rule.active = false;
  const today = todayStr();
  state.transactions = state.transactions.filter((tx) => tx.recurringId !== id || tx.date <= today);
  commit();
  toast("오늘 다음의 반복 기록을 지웠습니다. 오늘까지의 기록은 남아 있습니다.");
}

function deleteTransaction(id) {
  if (editingId === id) resetForm();
  state.transactions = state.transactions.filter((tx) => tx.id !== id);
  commit();
}

function addPay(raw) {
  const account = currentAccount();
  const noun = payNoun(account);
  const name = raw.trim();
  if (!name) {
    toast(`${noun} 이름을 입력해 주세요.`);
    return false;
  }
  if (name.length > 20) {
    toast(`${noun} 이름은 20자까지 입력할 수 있습니다.`);
    return false;
  }
  if (paysOf(account).some((pay) => pay.name === name)) {
    toast(`이미 있는 ${noun}입니다.`);
    return false;
  }
  if (paysOf(account).length >= 30) {
    toast(`${withTopic(noun)} 30개까지 넣을 수 있습니다.`);
    return false;
  }
  const pay = { id: uid(), name, account };
  state.pays.push(pay);
  preferPayId = pay.id;
  commit();
  return true;
}

function deletePay(id) {
  const pay = payById(id);
  const noun = payNoun(pay ? pay.account : currentAccount());
  const used = state.transactions.some((tx) => tx.payId === id)
    || state.recurring.some((rule) => rule.active && rule.payId === id);
  if (used) {
    toast(`이 ${withJosa(noun, ["으로", "로"])} 적힌 내역이 있어 삭제할 수 없습니다.`);
    return;
  }
  state.pays = state.pays.filter((item) => item.id !== id);
  if (pay && selectedPay[pay.account] === id) selectedPay[pay.account] = "";
  commit();
}

function addCategory(type, raw) {
  const name = raw.trim();
  if (!name) {
    toast("품목 이름을 입력해 주세요.");
    return false;
  }
  if (name.length > 20) {
    toast("품목 이름은 20자까지 입력할 수 있습니다.");
    return false;
  }
  if (categoriesOf(type).some((category) => category.name === name)) {
    toast("이미 있는 품목입니다.");
    return false;
  }
  if (categoriesOf(type).length >= 30) {
    toast("품목은 한 종류에 30개까지 넣을 수 있습니다.");
    return false;
  }
  const category = { id: uid(), name, type, color: COLORS[state.categories.length % COLORS.length] };
  state.categories.push(category);
  if (currentKind() === type) preferCategoryId = category.id;
  commit();
  return true;
}

function renameCategory(input) {
  const category = categoryById(input.dataset.catId);
  if (!category) return;
  const name = input.value.trim();
  if (name === category.name) return;
  if (!name) {
    input.value = category.name;
    toast("품목 이름을 입력해 주세요.");
    return;
  }
  if (name.length > 20) {
    input.value = category.name;
    toast("품목 이름은 20자까지 입력할 수 있습니다.");
    return;
  }
  if (categoriesOf(category.type).some((item) => item.id !== category.id && item.name === name)) {
    input.value = category.name;
    toast("이미 있는 품목입니다.");
    return;
  }
  category.name = name;
  input.setAttribute("aria-label", `${name} 이름`);
  persist();
  setTimeout(() => {
    renderSelect();
    renderCalendar();
    renderList();
    renderAnalysis();
  }, 0);
}

function deleteCategory(id) {
  if (state.transactions.some((tx) => tx.categoryId === id)) {
    toast("이 품목으로 적힌 내역이 있어 삭제할 수 없습니다.");
    return;
  }
  state.categories = state.categories.filter((category) => category.id !== id);
  commit();
}

function armDelete(type, id, button) {
  if (pending.type === type && pending.id === id) {
    clearPendingDelete();
    if (type === "tx") deleteTransaction(id);
    else if (type === "rule") stopRecurring(id);
    else if (type === "goal") deleteGoal(id);
    else if (type === "card") deletePay(id);
    else deleteCategory(id);
    return;
  }
  clearPendingDelete();
  pending.type = type;
  pending.id = id;
    if (button.classList.contains("tx-icon")) {
      button.textContent = "확인";
      button.setAttribute("aria-label", "확인");
    }
    else if (type === "card") {
      button.textContent = "×";
      button.setAttribute("aria-label", "삭제 확인");
    } else button.textContent = type === "rule" ? "중단 확인" : "삭제 확인";
  button.classList.add("is-confirm");
  pending.timer = setTimeout(clearPendingDelete, 2500);
}

const TX_SWIPE = 112;
let txDrag = null;
let txSwipeMoved = false;

function settleTx(row, open) {
  if (!row) return;
  row.classList.toggle("is-open", open);
  row.classList.remove("is-dragging");
  const face = row.querySelector(".tx-face");
  if (face) face.style.transform = open ? `translateX(-${TX_SWIPE}px)` : "";
  const reveal = row.querySelector(".tx-reveal");
  if (reveal) {
    reveal.setAttribute("aria-hidden", open ? "false" : "true");
    reveal.inert = !open;
  }
}

function closeOpenTx(except) {
  document.querySelectorAll(".tx.is-open").forEach((row) => {
    if (row !== except) settleTx(row, false);
  });
}

function bindTxSwipe() {
  document.addEventListener("pointerdown", (event) => {
    if (txDrag) return;
    if (event.target.closest("button")) return;
    const face = event.target.closest(".tx-face");
    if (!face || face.closest(".tx-static")) {
      closeOpenTx();
      return;
    }
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const row = face.closest(".tx");
    txDrag = {
      pointerId: event.pointerId,
      row,
      face,
      startX: event.clientX,
      startY: event.clientY,
      base: row.classList.contains("is-open") ? -TX_SWIPE : 0,
      axis: "",
      x: row.classList.contains("is-open") ? -TX_SWIPE : 0,
    };
  });
  document.addEventListener("pointermove", (event) => {
    if (!txDrag || event.pointerId !== txDrag.pointerId) return;
    const dx = event.clientX - txDrag.startX;
    const dy = event.clientY - txDrag.startY;
    if (!txDrag.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      txDrag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (txDrag.axis === "y") {
        txDrag = null;
        return;
      }
      txDrag.row.classList.add("is-dragging");
      closeOpenTx(txDrag.row);
    }
    const next = Math.max(-TX_SWIPE, Math.min(0, txDrag.base + dx));
    txDrag.x = next;
    txDrag.face.style.transform = `translateX(${next}px)`;
  }, { passive: true });
  function endTxDrag(event) {
    if (!txDrag || event.pointerId !== txDrag.pointerId) return;
    const current = txDrag;
    txDrag = null;
    if (current.axis !== "x") {
      if (current.base < 0) settleTx(current.row, false);
      else closeOpenTx();
      return;
    }
    txSwipeMoved = true;
    settleTx(current.row, current.x < -TX_SWIPE / 2);
  }
  document.addEventListener("pointerup", endTxDrag);
  document.addEventListener("pointercancel", endTxDrag);
  document.addEventListener("click", (event) => {
    if (!txSwipeMoved || !event.target.closest(".tx")) return;
    txSwipeMoved = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);
}

function bind() {
  mountDateFields();
  els.month.addEventListener("click", (event) => {
    event.stopPropagation();
    if (els.monthPanel.hidden) openMonthPanel();
    else closeMonthPanel();
  });
  els.yearSelect.addEventListener("mousedown", (event) => event.stopPropagation());
  els.yearSelect.addEventListener("click", (event) => event.stopPropagation());
  els.yearSelect.addEventListener("change", () => {
    pickerYear = Number(els.yearSelect.value);
    const month = Number(ui.month.slice(5, 7));
    goToMonth(pickerYear, month);
    openMonthPanel();
  });
  els.monthPanel.addEventListener("click", (event) => {
    event.stopPropagation();
    const choice = event.target.closest("[data-pick-month]");
    if (choice) goToMonth(pickerYear, Number(choice.dataset.pickMonth));
  });
  document.addEventListener("click", () => {
    if (!els.monthPanel.hidden) closeMonthPanel();
    if (!els.datePopover.hidden) closeDatePopover();
  });
  els.datePopover.addEventListener("click", (event) => {
    event.stopPropagation();
    const shift = event.target.closest("[data-date-shift]");
    const day = event.target.closest("[data-pick-date]");
    const month = event.target.closest("[data-pick-date-month]");
    if (shift) shiftDateCursor(Number(shift.dataset.dateShift));
    else if (day) applyPickedDate(day.dataset.pickDate);
    else if (month) {
      datePickerCursor = `${dateCursorParts()[0]}-${pad(Number(month.dataset.pickDateMonth))}`;
      showDatePickerMode("days");
    } else if (event.target.closest("#date-pop-title")) {
      showDatePickerMode(datePickerMode === "days" ? "months" : "days");
    } else if (event.target.closest("#date-today")) applyPickedDate(todayStr());
  });
  els.dateYear.addEventListener("mousedown", (event) => event.stopPropagation());
  els.dateYear.addEventListener("click", (event) => event.stopPropagation());
  els.dateYear.addEventListener("change", () => {
    const month = dateCursorParts()[1];
    datePickerCursor = `${els.dateYear.value}-${pad(month)}`;
    renderDateMonths();
  });
  document.addEventListener("scroll", () => {
    if (!els.datePopover.hidden) placeDatePopover();
  }, true);
  document.getElementById("tab-calendar").addEventListener("click", () => setTab("calendar"));
  document.getElementById("tab-ledger").addEventListener("click", () => setTab("ledger"));
  document.getElementById("tab-analysis").addEventListener("click", () => setTab("analysis"));
  document.getElementById("tab-settings").addEventListener("click", () => setTab("settings"));
  els.categoryPicks.addEventListener("click", (event) => {
    const pick = event.target.closest("[data-cat-pick]");
    if (!pick) return;
    els.category.value = pick.dataset.catPick;
    renderSelect();
  });
  document.getElementById("category-add-toggle").addEventListener("click", () => {
    els.categoryAdd.hidden = !els.categoryAdd.hidden;
    if (!els.categoryAdd.hidden) els.categoryNew.focus();
  });
  document.getElementById("category-add-submit").addEventListener("click", () => {
    if (addCategory(currentKind(), els.categoryNew.value)) {
      els.categoryNew.value = "";
      els.categoryAdd.hidden = true;
    }
  });
  els.categoryNew.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    document.getElementById("category-add-submit").click();
  });
  els.form.querySelectorAll('input[name="kind"]').forEach((input) => {
    input.addEventListener("change", () => {
      renderSelect();
      if (!editingId) setAccount(currentKind() === "income" ? "bank" : "card");
      renderFormMode();
    });
  });
  els.form.querySelectorAll('input[name="account"]').forEach((input) => {
    input.addEventListener("change", () => renderPays());
  });
  els.cardPicks.addEventListener("click", (event) => {
    const pick = event.target.closest("[data-card-pick]");
    if (!pick) return;
    selectedPay[currentAccount()] = pick.dataset.cardPick;
    renderPays();
  });
  document.getElementById("card-add-toggle").addEventListener("click", () => {
    els.cardAdd.hidden = !els.cardAdd.hidden;
    if (!els.cardAdd.hidden) els.cardNew.focus();
  });
  document.getElementById("card-add-submit").addEventListener("click", () => {
    if (addPay(els.cardNew.value)) {
      els.cardNew.value = "";
      els.cardAdd.hidden = true;
    }
  });
  els.cardNew.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    document.getElementById("card-add-submit").click();
  });
  els.form.addEventListener("click", (event) => {
    const key = event.target.closest("[data-key]");
    if (key) pressCalc(key.dataset.key);
  });
  els.goalAmount.addEventListener("input", () => {
    const digits = els.goalAmount.value.replace(/\D/g, "").slice(0, 12);
    els.goalAmount.value = digits ? formatNumber(digits) : "";
  });
  document.getElementById("goal-open").addEventListener("click", () => {
    resetGoalForm();
    openGoalDialog();
  });
  els.goalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = readGoalForm();
    if (data) saveGoal(data);
  });
  els.goalCancel.addEventListener("click", () => {
    resetGoalForm();
    renderGoalList();
  });
  document.getElementById("goal-backdrop").addEventListener("click", () => {
    resetGoalForm();
    renderGoalList();
  });
  els.exportForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const start = els.exportStart.value;
    const end = els.exportEnd.value;
    if (!isValidDate(start) || !isValidDate(end)) {
      setExportError("시작일과 종료일을 확인해 주세요.");
      return;
    }
    if (end < start) {
      setExportError("종료일은 시작일과 같거나 이후여야 합니다.");
      els.exportEnd.focus();
      return;
    }
    if (!exportRows(start, end).length) {
      setExportError("이 기간의 내역이 없습니다.");
      return;
    }
    setExportError("");
    exportExcel(start, end);
  });
  els.repeat.addEventListener("change", renderFormMode);
  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (Date.now() < lockUntil) return;
    const data = readForm();
    if (!data) return;
    lockUntil = Date.now() + 500;
    saveTransaction(data);
  });
  els.cancel.addEventListener("click", () => {
    setTab(ui.returnTab || "ledger");
  });
  els.catalog.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-add-cat]");
    if (!form) return;
    event.preventDefault();
    const input = form.querySelector("input");
    addCategory(form.dataset.addCat, input.value);
  });
  els.catalog.addEventListener("focusout", (event) => {
    const input = event.target.closest("[data-cat-id]");
    if (input) renameCategory(input);
  });
  els.catalog.addEventListener("keydown", (event) => {
    const input = event.target.closest("[data-cat-id]");
    if (!input || event.key !== "Enter") return;
    event.preventDefault();
    input.blur();
  });
  bindTxSwipe();
  document.body.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-edit]");
    const remove = event.target.closest("[data-delete]");
    const removeCategory = event.target.closest("[data-cat-delete]");
    const removeCard = event.target.closest("[data-card-delete]");
    const filter = event.target.closest("[data-filter]");
    const day = event.target.closest("[data-day]");
    const addDay = event.target.closest("[data-add-day]");
    const stopRule = event.target.closest("[data-stop-recurring]");
    const goalEdit = event.target.closest("[data-goal-edit]");
    const goalDelete = event.target.closest("[data-goal-delete]");
    if (edit) startEdit(edit.dataset.edit);
    else if (remove) armDelete("tx", remove.dataset.delete, remove);
    else if (removeCategory) armDelete("cat", removeCategory.dataset.catDelete, removeCategory);
    else if (removeCard) armDelete("card", removeCard.dataset.cardDelete, removeCard);
    else if (filter) {
      ui.filter = filter.dataset.filter;
      renderList();
    } else if (goalEdit) startGoalEdit(goalEdit.dataset.goalEdit);
    else if (goalDelete) armDelete("goal", goalDelete.dataset.goalDelete, goalDelete);
    else if (stopRule) armDelete("rule", stopRule.dataset.stopRecurring, stopRule);
    else if (addDay) openLedgerForDate(addDay.dataset.addDay);
    else if (day) selectDay(day.dataset.day);
    else if (event.target.closest("#goto-ledger")) setTab("ledger");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!els.goalDialog.hidden && els.datePopover.hidden) {
      resetGoalForm();
      renderGoalList();
      return;
    }
    if (!els.datePopover.hidden) {
      closeDatePopover(true);
      return;
    }
    if (!els.monthPanel.hidden) {
      closeMonthPanel();
      return;
    }
    if (editingId) {
      resetForm();
      renderList();
    }
    if (editingGoalId) {
      resetGoalForm();
      renderGoalList();
    }
  });
}

bind();
els.date.value = todayStr();
resetGoalForm();
{
  const bounds = monthBounds(ui.month);
  els.exportStart.value = bounds.start;
  els.exportEnd.value = bounds.end;
}
renderDataViews();
renderCatalog();
