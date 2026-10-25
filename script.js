// CherryBite - basic frontend (no backend, no database)
// Records are kept in the browser's localStorage. Sample data is synthetic.

var STORAGE_KEY = "cherrybite_records";
var records = [];

// ---------- helpers ----------
function $(id) { return document.getElementById(id); }

function escapeHtml(text) {
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function percent(part, whole) {
  return whole > 0 ? ((part / whole) * 100).toFixed(1) : "0.0";
}

// ---------- sample data (synthetic) ----------
function makeSampleData() {
  var items = {
    "Vada Pav": [0.45, 12], "Poha": [0.22, 15], "Idli": [0.30, 10],
    "Samosa": [0.25, 8], "Tea": [0.55, 5]
  };
  var attendance = [400, 450, 380, 420, 460, 410];
  var soldFactor = [0.98, 1.00, 0.95, 1.02, 0.97, 1.00];
  var wasteShare = [0.04, 0.06, 0.09, 0.03, 0.05, 0.07];
  var data = [], id = 1;
  for (var day = 0; day < 6; day++) {
    for (var name in items) {
      var ratio = items[name][0], cost = items[name][1];
      var prepared = Math.round(attendance[day] * ratio * 1.12);
      var sold = Math.min(Math.round(attendance[day] * ratio * soldFactor[day]), prepared);
      var wasted = Math.min(prepared - sold, Math.round(prepared * wasteShare[day]));
      data.push({ id: id++, date: "2026-10-" + (12 + day), item: name, attendance: attendance[day],
                  prepared: prepared, sold: sold, wasted: wasted, prep_cost: cost });
    }
  }
  return data;
}

// ---------- save / load ----------
function saveRecords() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch (e) { /* storage blocked: data lasts until refresh */ }
}

function loadRecords() {
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { records = JSON.parse(saved); return; }
  } catch (e) { /* ignore */ }
  records = makeSampleData();
  saveRecords();
}

function sortedRecords() {
  return records.slice().sort(function (a, b) {
    if (a.date !== b.date) { return a.date < b.date ? 1 : -1; }
    return b.id - a.id;
  });
}

// ---------- show everything ----------
function render() {
  showSummary();
  showTable();
  showItems();
}

function showSummary() {
  var prepared = 0, sold = 0, wasted = 0, cost = 0;
  records.forEach(function (r) {
    prepared += r.prepared;
    sold += r.sold;
    wasted += r.wasted;
    cost += r.wasted * r.prep_cost; // waste cost uses preparation cost, not selling price
  });
  $("c-prepared").textContent = prepared;
  $("c-sold").textContent = sold;
  $("c-wasted").textContent = wasted;
  $("c-waste-pct").textContent = percent(wasted, prepared) + "%";
  $("c-util").textContent = percent(sold, prepared) + "%";
  $("c-cost").textContent = "Rs. " + cost.toFixed(0);
}

function showTable() {
  var body = $("records-body");
  if (records.length === 0) {
    body.innerHTML = '<tr><td colspan="9">No records yet. Add your first record above.</td></tr>';
    return;
  }
  body.innerHTML = sortedRecords().map(function (r) {
    return "<tr>" +
      "<td>" + escapeHtml(r.date) + "</td>" +
      "<td>" + escapeHtml(r.item) + "</td>" +
      "<td>" + r.attendance + "</td>" +
      "<td>" + r.prepared + "</td>" +
      "<td>" + r.sold + "</td>" +
      "<td>" + r.wasted + "</td>" +
      "<td>" + percent(r.wasted, r.prepared) + "%</td>" +
      "<td>Rs. " + (r.wasted * r.prep_cost).toFixed(0) + "</td>" +
      '<td><button class="del-btn" onclick="deleteRecord(' + r.id + ')">Delete</button></td>' +
      "</tr>";
  }).join("");
}

function itemNames() {
  var names = [];
  records.forEach(function (r) { if (names.indexOf(r.item) === -1) { names.push(r.item); } });
  return names.sort();
}

function showItems() {
  var names = itemNames();
  $("item-list").innerHTML = names.map(function (n) { return '<option value="' + escapeHtml(n) + '">'; }).join("");
  var selected = $("f-item").value;
  $("f-item").innerHTML = names.map(function (n) {
    return '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + "</option>";
  }).join("");
  if (selected) { $("f-item").value = selected; }
}

// ---------- validation ----------
function validateRecord(d) {
  if (!d.date || !d.item) { return "Date and food item are required."; }
  var nums = [d.attendance, d.prepared, d.sold, d.wasted, d.prep_cost];
  for (var i = 0; i < nums.length; i++) {
    if (isNaN(nums[i]) || nums[i] < 0) { return "All quantities must be numbers that are zero or more."; }
  }
  if (d.sold + d.wasted > d.prepared) { return "Sold + wasted cannot be more than prepared."; }
  return "";
}

// ---------- add record ----------
$("record-form").addEventListener("submit", function (event) {
  event.preventDefault();
  var d = {
    date: $("date").value,
    item: $("item").value.trim(),
    attendance: parseInt($("attendance").value, 10),
    prepared: parseInt($("prepared").value, 10),
    sold: parseInt($("sold").value, 10),
    wasted: parseInt($("wasted").value, 10),
    prep_cost: parseFloat($("prep_cost").value)
  };
  var message = $("form-message");
  var error = validateRecord(d);
  if (error) {
    message.textContent = error;
    message.className = "message error";
    return;
  }
  var maxId = records.reduce(function (m, r) { return Math.max(m, r.id); }, 0);
  d.id = maxId + 1;
  records.push(d);
  saveRecords();
  message.textContent = "Record saved successfully.";
  message.className = "message success";
  $("record-form").reset();
  $("date").valueAsDate = new Date();
  render();
});

// ---------- delete / reset ----------
function deleteRecord(id) {
  if (!confirm("Delete this record?")) { return; }
  records = records.filter(function (r) { return r.id !== id; });
  saveRecords();
  render();
}

$("reset-btn").addEventListener("click", function () {
  if (!confirm("Reset to the original sample data? Your added records will be removed.")) { return; }
  records = makeSampleData();
  saveRecords();
  render();
});

// ---------- forecast (baseline method) ----------
function forecast(item, attendance, bufferPct) {
  var history = records.filter(function (r) { return r.item === item; });
  if (history.length === 0) { return { error: "No history for this item." }; }

  var valid = history.filter(function (r) { return r.attendance > 0; });
  var base, method, note = "";
  if (valid.length >= 3 && attendance > 0) {
    var total = 0;
    valid.forEach(function (r) { total += r.sold / r.attendance; });
    base = (total / valid.length) * attendance;
    method = "Average sales per customer x expected attendance";
  } else {
    var sum = 0;
    history.forEach(function (r) { sum += r.sold; });
    base = sum / history.length;
    method = "Fallback: average daily sales";
    note = "Limited sample data: estimate is based on average sales only.";
  }
  var adjusted = base * (1 + bufferPct / 100);
  return {
    item: item,
    estimated: Math.round(base),
    recommended: Math.max(0, Math.round(adjusted)),
    used: history.length,
    method: method,
    note: note
  };
}

$("forecast-form").addEventListener("submit", function (event) {
  event.preventDefault();
  var attendance = parseInt($("f-attendance").value, 10);
  var buffer = parseFloat($("f-buffer").value);
  var box = $("forecast-result");
  box.hidden = false;
  if (isNaN(attendance) || isNaN(buffer) || attendance < 0 || buffer < 0) {
    box.innerHTML = "<p>Please enter valid, non-negative numbers.</p>";
    return;
  }
  var r = forecast($("f-item").value, attendance, buffer);
  if (r.error) { box.innerHTML = "<p>" + escapeHtml(r.error) + "</p>"; return; }
  box.innerHTML =
    '<p>Recommended preparation for <strong>' + escapeHtml(r.item) + "</strong></p>" +
    '<p class="big">' + r.recommended + " portions</p>" +
    "<p>Estimated demand: " + r.estimated + " | Records used: " + r.used + "</p>" +
    "<p>Method: " + escapeHtml(r.method) + "</p>" +
    (r.note ? '<p class="limited">' + escapeHtml(r.note) + "</p>" : "");
});

// ---------- mobile menu ----------
$("menu-btn").addEventListener("click", function () { $("nav-links").classList.toggle("open"); });
document.querySelectorAll("#nav-links a").forEach(function (link) {
  link.addEventListener("click", function () { $("nav-links").classList.remove("open"); });
});

// ---------- start ----------
$("date").valueAsDate = new Date();
loadRecords();
render();
