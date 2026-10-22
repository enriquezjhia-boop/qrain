
"use strict";

const stations = [
  { name: "CIHTM Building", image: "cihtm.jpg", stock: 12 },
  { name: "Gate 1", image: "gate1.jpg", stock: 10 },
  { name: "Gate 2", image: "gate2.jpg", stock: 10 },
  { name: "Gate 3", image: "gate3.jpg", stock: 10 },
  { name: "CCMS Building", image: "ccms.jpg", stock: 8 },
  { name: "University Library", image: "library.jpg", stock: 8 },
  { name: "CNAHS Building", image: "cnahs.jpg", stock: 8 },
  { name: "University Canteen", image: "canteen.jpg", stock: 10 },
  { name: "CET Building", image: "cba.jpg", stock: 8 },
  { name: "CAFA Building", image: "ceng.jpg", stock: 8 },
  { name: "CAS Building", image: "cas.jpg", stock: 8 },
  { name: "CCJC Building", image: "ccjc.jpg", stock: 8 }
];

const RENTAL_PRICE = 15;
const RENTAL_HOURS = 11;
const OVERDUE_HOURLY_RATE = 5;
const STORAGE_KEY = "qrain_rentals_v2";
const STOCK_KEY = "qrain_station_stock_v2";

const $ = id => document.getElementById(id);

let selectedStation = null;
let timerInterval = null;

function loadData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    showToast("Your browser could not save this update.");
    return false;
  }
}

function getStock() {
  let stock = loadData(STOCK_KEY, null);

  if (!stock || typeof stock !== "object" || Array.isArray(stock)) {
    stock = {};
    stations.forEach(station => {
      stock[station.name] = station.stock;
    });
  }

  if (stock["CBA Building"] !== undefined) {
    if (stock["CET Building"] === undefined) {
      stock["CET Building"] = stock["CBA Building"];
    }
    delete stock["CBA Building"];
  }

  if (stock["CENG Building"] !== undefined) {
    if (stock["CAFA Building"] === undefined) {
      stock["CAFA Building"] = stock["CENG Building"];
    }
    delete stock["CENG Building"];
  }

  stations.forEach(station => {
    if (!Number.isFinite(Number(stock[station.name]))) {
      stock[station.name] = station.stock;
    }
  });

  saveData(STOCK_KEY, stock);
  return stock;
}

function getRentals() {
  const rentals = loadData(STORAGE_KEY, []);
  return Array.isArray(rentals) ? rentals : [];
}

function saveRentals(rentals) {
  return saveData(STORAGE_KEY, rentals);
}

function money(amount) {
  return "₱" + Number(amount).toFixed(2);
}

function makeReference(prefix) {
  return prefix + "-" +
    Date.now().toString(36).toUpperCase() + "-" +
    Math.random().toString(36).slice(2, 7).toUpperCase();
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function getOverdueFee(dueTime, currentTime = Date.now()) {
  if (currentTime <= dueTime) return 0;
  return Math.ceil((currentTime - dueTime) / 3600000) * OVERDUE_HOURLY_RATE;
}

function formatRemaining(milliseconds) {
  if (milliseconds <= 0) return "00:00:00";

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0")
  ].join(":");
}

function showToast(message) {
  let toast = $("qrainToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "qrainToast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.remove("toast-visible");
  void toast.offsetWidth;
  toast.classList.add("toast-visible");

  clearTimeout(toast.hideTimeout);
  toast.hideTimeout = setTimeout(() => {
    toast.classList.remove("toast-visible");
  }, 3200);
}

function installStyles() {
  if ($("qrainModernStyles")) return;

  const style = document.createElement("style");
  style.id = "qrainModernStyles";

  style.textContent = `
    .qr-flow-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9998;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(3, 12, 30, .76);
      backdrop-filter: blur(12px);
      overflow-y: auto;
    }

    .qr-flow-backdrop.open {
      display: flex;
      animation: qrainFadeIn .22s ease;
    }

    .qr-flow-panel {
      width: 100%;
      max-width: 510px;
      max-height: 92vh;
      overflow-y: auto;
      position: relative;
      padding: 30px;
      box-sizing: border-box;
      border: 1px solid rgba(255,255,255,.7);
      border-radius: 25px;
      color: #10213d;
      background: #fff;
      box-shadow: 0 30px 90px rgba(0,0,0,.3);
      animation: qrainPanelIn .35s cubic-bezier(.2,.8,.2,1);
    }

    @keyframes qrainFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes qrainPanelIn {
      from { opacity: 0; transform: translateY(22px) scale(.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes qrainFloat {
      0%,100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }

    @keyframes qrainShine {
      from { background-position: 180% center; }
      to { background-position: -180% center; }
    }

    @keyframes qrainSuccess {
      from { opacity: 0; transform: scale(.8); }
      to { opacity: 1; transform: scale(1); }
    }

    .qr-flow-close {
      position: absolute;
      top: 17px;
      right: 18px;
      width: 38px;
      height: 38px;
      border: 0;
      border-radius: 12px;
      background: #edf2f8;
      color: #172d4d;
      font-size: 25px;
      cursor: pointer;
      transition: .2s ease;
    }

    .qr-flow-close:hover {
      background: #dce8f7;
      transform: rotate(90deg);
    }

    .qr-flow-kicker {
      display: inline-block;
      color: #2768e8;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }

    .qr-flow-panel h2 {
      margin: 7px 40px 9px 0;
      font-size: clamp(24px, 5vw, 32px);
      line-height: 1.2;
      letter-spacing: -.8px;
    }

    .qr-flow-panel p {
      color: #6c7b91;
      line-height: 1.65;
      font-size: 14px;
    }

    .qr-flow-summary {
      padding: 18px;
      margin: 20px 0;
      border: 1px solid #e3eaf5;
      border-radius: 18px;
      background: linear-gradient(135deg, #f7faff, #edf4ff);
    }

    .qr-flow-line {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
      padding: 10px 0;
      color: #6a7890;
      font-size: 13px;
    }

    .qr-flow-line + .qr-flow-line {
      border-top: 1px solid rgba(202,216,236,.65);
    }

    .qr-flow-line strong {
      color: #142844;
      text-align: right;
      overflow-wrap: anywhere;
    }

    .qr-flow-total {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 15px;
      padding-top: 16px;
      border-top: 1px dashed #b9c9e0;
    }

    .qr-flow-total span {
      color: #52647e;
      font-size: 13px;
    }

    .qr-flow-total strong {
      color: #1c63e9;
      font-size: 26px;
      letter-spacing: -.8px;
    }

    .qr-flow-panel label {
      display: block;
      margin: 15px 0 7px;
      color: #263b59;
      font-size: 13px;
      font-weight: 700;
    }

    .qr-flow-field,
    .qr-flow-select {
      display: block;
      width: 100%;
      min-height: 47px;
      padding: 12px 14px;
      box-sizing: border-box;
      border: 1px solid #d8e2f0;
      border-radius: 12px;
      outline: none;
      background: #f9fbff;
      color: #172d4d;
      font: inherit;
      font-size: 14px;
      transition: border-color .2s, box-shadow .2s, background .2s;
    }

    .qr-flow-field:focus,
    .qr-flow-select:focus {
      border-color: #3778f5;
      background: #fff;
      box-shadow: 0 0 0 4px rgba(55,120,245,.12);
    }

    .qr-flow-field.invalid,
    .qr-flow-select.invalid {
      border-color: #e04f59;
      box-shadow: 0 0 0 3px rgba(224,79,89,.1);
    }

    .qr-payment-options {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin: 12px 0 18px;
    }

    .qr-payment-option {
      position: relative;
      display: flex !important;
      align-items: center;
      gap: 12px;
      min-width: 0;
      margin: 0 !important;
      padding: 15px 12px;
      border: 1px solid #dce5f2;
      border-radius: 16px;
      background: #fff;
      cursor: pointer;
      transition: transform .2s, border-color .2s, box-shadow .2s, background .2s;
    }

    .qr-payment-option:hover {
      transform: translateY(-3px);
      border-color: #9bbafa;
      box-shadow: 0 8px 22px rgba(31,80,150,.09);
    }

    .qr-payment-option.selected {
      border-color: #3778f5;
      background: linear-gradient(145deg, #eff5ff, #fff);
      box-shadow: 0 0 0 2px rgba(55,120,245,.12);
    }

    .qr-payment-option input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .qr-payment-symbol {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 43px;
      height: 43px;
      border-radius: 13px;
      color: #2465e8;
      background: #e7efff;
      font-size: 22px;
      font-weight: 800;
    }

    .qr-payment-option[data-method="cash"] .qr-payment-symbol {
      color: #14865c;
      background: #e1f7ed;
    }

    .qr-payment-copy {
      display: block;
      min-width: 0;
    }

    .qr-payment-copy strong {
      display: block;
      color: #142844;
      font-size: 13px;
    }

    .qr-payment-copy small {
      display: block;
      margin-top: 4px;
      color: #77869b;
      font-size: 11px;
      font-weight: 400;
    }

    .qr-card-preview {
      position: relative;
      overflow: hidden;
      padding: 20px;
      margin: 17px 0;
      border-radius: 19px;
      color: #fff;
      background: linear-gradient(125deg, #0d1b37, #174ba4 58%, #5987f8);
      box-shadow: 0 14px 30px rgba(18,57,126,.2);
      animation: qrainFloat 4s ease-in-out infinite;
    }

    .qr-card-preview::after {
      content: "";
      position: absolute;
      top: -70px;
      right: -35px;
      width: 180px;
      height: 180px;
      border: 1px solid rgba(255,255,255,.2);
      border-radius: 50%;
      box-shadow: 0 0 0 22px rgba(255,255,255,.04),
                  0 0 0 45px rgba(255,255,255,.03);
    }

    .qr-card-top,
    .qr-card-bottom {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }

    .qr-card-label {
      color: #c7d9ff;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 2px;
    }

    .qr-card-chip {
      width: 34px;
      height: 26px;
      border: 1px solid rgba(255,255,255,.5);
      border-radius: 7px;
      background: linear-gradient(135deg, #dce7fa, #8399c6);
    }

    .qr-card-number {
      position: relative;
      z-index: 1;
      margin: 27px 0 23px;
      font-size: clamp(16px, 4vw, 21px);
      letter-spacing: 2px;
      overflow-wrap: anywhere;
    }

    .qr-card-bottom small {
      display: block;
      color: #c7d9ff;
      font-size: 9px;
      letter-spacing: 1px;
    }

    .qr-card-bottom strong {
      display: block;
      margin-top: 5px;
      font-size: 12px;
      text-transform: uppercase;
      overflow-wrap: anywhere;
    }

    .qr-flow-btn {
      display: block;
      width: 100%;
      min-height: 49px;
      margin-top: 12px;
      padding: 14px 18px;
      border: 0;
      border-radius: 13px;
      color: white;
      background: linear-gradient(110deg, #1763e9, #4785ff, #1763e9);
      background-size: 200% auto;
      box-shadow: 0 8px 20px rgba(30,98,224,.2);
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      transition: transform .2s, box-shadow .2s, opacity .2s;
    }

    .qr-flow-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 12px 25px rgba(30,98,224,.3);
      animation: qrainShine 1.4s linear infinite;
    }

    .qr-flow-btn:disabled {
      cursor: not-allowed;
      opacity: .65;
    }

    .qr-flow-btn.secondary {
      color: #29415f;
      background: #edf2f9;
      box-shadow: none;
    }

    .qr-flow-btn.secondary:hover:not(:disabled) {
      background: #dfe9f7;
    }

    .qr-flow-btn.danger {
      color: #b52b3c;
      background: #fff0f1;
      box-shadow: none;
    }

    .qr-flow-status {
      padding: 13px 15px;
      margin: 14px 0;
      border: 1px solid #bdebd6;
      border-radius: 13px;
      color: #13724e;
      background: #e9faf2;
      font-size: 13px;
      line-height: 1.5;
    }

    .qr-flow-danger {
      border-color: #ffc9c9 !important;
      color: #a52a36 !important;
      background: #fff0f1 !important;
    }

    .qr-flow-error {
      display: none;
      margin: 12px 0;
      padding: 12px 14px;
      border: 1px solid #ffc9c9;
      border-radius: 12px;
      color: #a52a36;
      background: #fff0f1;
      font-size: 13px;
      line-height: 1.5;
    }

    .qr-flow-error.visible {
      display: block;
      animation: qrainPanelIn .2s ease;
    }

    .qr-flow-pass {
      padding: 20px;
      margin: 18px 0;
      border: 1px solid #dce6f3;
      border-radius: 18px;
      background: linear-gradient(145deg, #f8fbff, #eef5ff);
    }

    .qr-pass-mark {
      display: grid;
      place-items: center;
      width: 58px;
      height: 58px;
      margin-bottom: 15px;
      border-radius: 18px;
      color: #fff;
      background: linear-gradient(135deg, #0da86f, #36d69c);
      font-size: 28px;
      font-weight: 800;
      box-shadow: 0 8px 20px rgba(13,168,111,.2);
      animation: qrainSuccess .35s ease;
    }

    .qr-flow-timer {
      color: #205fdf;
      font-size: clamp(24px, 6vw, 33px);
      font-weight: 800;
      letter-spacing: 1px;
      font-variant-numeric: tabular-nums;
    }

    .qr-flow-ref {
      display: block;
      margin: 9px 0;
      padding: 12px;
      border: 1px dashed #9db7e4;
      border-radius: 10px;
      color: #205fdf;
      background: #fff;
      text-align: center;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 1px;
      overflow-wrap: anywhere;
    }

    #qrainToast {
      position: fixed;
      z-index: 10001;
      left: 50%;
      bottom: 24px;
      max-width: calc(100% - 36px);
      box-sizing: border-box;
      padding: 14px 20px;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 14px;
      color: #fff;
      background: #10213d;
      box-shadow: 0 12px 35px rgba(0,0,0,.25);
      font-size: 13px;
      line-height: 1.5;
      opacity: 0;
      pointer-events: none;
      transform: translate(-50%, 15px);
      transition: opacity .25s, transform .25s;
    }

    #qrainToast.toast-visible {
      opacity: 1;
      transform: translate(-50%, 0);
    }

    .station-card {
      transition: transform .25s ease, box-shadow .25s ease;
    }

    .station-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 35px rgba(15,48,91,.12);
    }

    .station-rent {
      transition: transform .2s ease, filter .2s ease;
    }

    .station-rent:hover:not(:disabled) {
      transform: translateY(-2px);
      filter: brightness(1.08);
    }

    @media(max-width: 480px) {
      .qr-flow-backdrop {
        padding: 10px;
        align-items: center;
      }

      .qr-flow-panel {
        padding: 23px 18px;
        border-radius: 21px;
      }

      .qr-payment-options {
        gap: 8px;
      }

      .qr-payment-option {
        padding: 12px 8px;
        gap: 8px;
      }

      .qr-payment-symbol {
        width: 35px;
        height: 35px;
        font-size: 18px;
      }

      .qr-payment-copy strong {
        font-size: 12px;
      }

      .qr-payment-copy small {
        font-size: 10px;
      }
    }

    @media(prefers-reduced-motion: reduce) {
      .qr-flow-panel,
      .qr-card-preview,
      .qr-pass-mark {
        animation: none !important;
      }

      .qr-flow-btn,
      .qr-payment-option,
      .station-card {
        transition: none !important;
      }
    }
  `;

  document.head.appendChild(style);
}

function ensureModal() {
  if ($("qrFlowModal")) return;

  const modal = document.createElement("div");
  modal.id = "qrFlowModal";
  modal.className = "qr-flow-backdrop";
  modal.setAttribute("aria-hidden", "true");

  modal.innerHTML = `
    <div class="qr-flow-panel" role="dialog" aria-modal="true" aria-labelledby="qrFlowHeading">
      <button class="qr-flow-close" type="button" aria-label="Close window">×</button>
      <div id="qrFlowContent"></div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".qr-flow-close").addEventListener("click", closeModal);

  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal();
  });
}

function openFlow(content) {
  ensureModal();
  stopTimer();

  $("qrFlowContent").innerHTML = content;
  $("qrFlowModal").classList.add("open");
  $("qrFlowModal").setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  const panel = $("qrFlowModal").querySelector(".qr-flow-panel");
  panel.scrollTop = 0;

  $("qrFlowModal").querySelector(".qr-flow-close").focus();
}

function closeModal() {
  stopTimer();

  const modal = $("qrFlowModal");

  if (modal) {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  document.body.style.overflow = "";
  renderStations($("stationSearch")?.value || "");
}

function renderStations(search = "") {
  const grid = $("stationGrid");
  if (!grid) return;

  const stock = getStock();
  const query = search.toLowerCase().trim();

  const filteredStations = stations.filter(station =>
    station.name.toLowerCase().includes(query)
  );

  grid.innerHTML = "";

  filteredStations.forEach(station => {
    const available = Math.max(0, Number(stock[station.name]) || 0);

    const card = document.createElement("article");
    card.className = "station-card";

    const photo = document.createElement("div");
    photo.className = "station-photo";

    const image = document.createElement("img");
    image.src = "images/" + station.image;
    image.alt = station.name;
    image.loading = "lazy";

    image.onerror = () => {
      image.style.display = "none";

      if (!photo.querySelector(".photo-placeholder")) {
        const placeholder = document.createElement("div");
        placeholder.className = "photo-placeholder";
        placeholder.textContent = "☂";
        photo.appendChild(placeholder);
      }
    };

    photo.appendChild(image);

    const info = document.createElement("div");
    info.className = "station-info";

    const title = document.createElement("h3");
    title.textContent = station.name;

    const price = document.createElement("p");
    price.textContent = money(RENTAL_PRICE) + " · " + RENTAL_HOURS + " hours";

    const availability = document.createElement("p");
    availability.textContent = available +
      (available === 1 ? " umbrella available" : " umbrellas available");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "station-rent";
    button.textContent = available > 0
      ? "Rent an Umbrella →"
      : "Currently Unavailable";
    button.disabled = available <= 0;

    button.addEventListener("click", () => {
      selectedStation = station;
      showRentalDetails();
    });

    info.append(title, price, availability, button);
    card.append(photo, info);
    grid.appendChild(card);
  });

  if ($("stationCount")) {
    $("stationCount").textContent =
      "Showing " + filteredStations.length +
      " of " + stations.length + " stations";
  }

  if (filteredStations.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No stations match your search.";
    empty.className = "station-empty";
    grid.appendChild(empty);
  }
}

function showRentalDetails() {
  if (!selectedStation) return;

  const stock = getStock();
  const available = Number(stock[selectedStation.name]) || 0;

  if (available <= 0) {
    showToast("No umbrellas are available at this station.");
    return;
  }

  openFlow(`
    <span class="qr-flow-kicker">YOUR RENTAL</span>
    <h2 id="qrFlowHeading">Let's get you covered.</h2>
    <p>Choose your payment method and review your rental details.</p>

    <div class="qr-flow-summary">
      <div class="qr-flow-line"><span>Pickup station</span><strong>${selectedStation.name}</strong></div>
      <div class="qr-flow-line"><span>Available umbrellas</span><strong>${available}</strong></div>
      <div class="qr-flow-line"><span>Rental duration</span><strong>${RENTAL_HOURS} hours</strong></div>
      <div class="qr-flow-line"><span>Overdue charge</span><strong>${money(OVERDUE_HOURLY_RATE)} / hour</strong></div>
      <div class="qr-flow-total"><span>Total rental fee</span><strong>${money(RENTAL_PRICE)}</strong></div>
    </div>

    <label>Choose payment method</label>

    <div class="qr-payment-options">
      <label class="qr-payment-option" data-method="cash">
        <input type="radio" name="qrPaymentMethod" value="cash">
        <span class="qr-payment-symbol">₱</span>
        <span class="qr-payment-copy"><strong>Cash</strong><small>Pay in person</small></span>
      </label>

      <label class="qr-payment-option" data-method="card">
        <input type="radio" name="qrPaymentMethod" value="card">
        <span class="qr-payment-symbol">▰</span>
        <span class="qr-payment-copy"><strong>Card</strong><small>Enter card details</small></span>
      </label>
    </div>

    <div id="qrCardFields" hidden>
      <div class="qr-card-preview">
        <div class="qr-card-top">
          <span class="qr-card-label">PAYMENT CARD</span>
          <span class="qr-card-chip"></span>
        </div>
        <div class="qr-card-number" id="qrCardPreviewNumber">•••• •••• •••• ••••</div>
        <div class="qr-card-bottom">
          <div><small>CARDHOLDER</small><strong id="qrCardPreviewName">YOUR NAME</strong></div>
          <div><small>EXPIRES</small><strong id="qrCardPreviewExpiry">MM/YY</strong></div>
        </div>
      </div>

      <label for="qrCardName">Cardholder name</label>
      <input class="qr-flow-field" id="qrCardName" type="text" autocomplete="cc-name" placeholder="Name on card" maxlength="80">

      <label for="qrCardNumber">Card number</label>
      <input class="qr-flow-field" id="qrCardNumber" type="text" inputmode="numeric" autocomplete="cc-number" placeholder="1234 5678 9012 3456" maxlength="23">

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label for="qrCardExpiry">Expiry date</label>
          <input class="qr-flow-field" id="qrCardExpiry" type="text" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" maxlength="5">
        </div>
        <div>
          <label for="qrCardCvv">Security code</label>
          <input class="qr-flow-field" id="qrCardCvv" type="password" inputmode="numeric" autocomplete="cc-csc" placeholder="CVV" maxlength="4">
        </div>
      </div>
      <p>Your card details are used only for in-browser validation. They are not saved. No actual card charge is made.</p>
    </div>

    <div id="qrPaymentError" class="qr-flow-error" role="alert" aria-live="polite"></div>

    <button class="qr-flow-btn" id="qrConfirmPayment">Continue · ${money(RENTAL_PRICE)}</button>
    <button class="qr-flow-btn secondary" id="qrCancel">Cancel</button>
  `);

  const paymentOptions = document.querySelectorAll(".qr-payment-option");
  const cardFields = $("qrCardFields");
  const confirmButton = $("qrConfirmPayment");
  const error = $("qrPaymentError");

  function showError(message, field) {
    error.textContent = message;
    error.classList.add("visible");

    document.querySelectorAll(".qr-flow-field, .qr-flow-select").forEach(input => {
      input.classList.remove("invalid");
      input.removeAttribute("aria-invalid");
    });

    if (field) {
      field.classList.add("invalid");
      field.setAttribute("aria-invalid", "true");
      field.focus();
    }
  }

  function clearError() {
    error.textContent = "";
    error.classList.remove("visible");

    document.querySelectorAll(".qr-flow-field, .qr-flow-select").forEach(input => {
      input.classList.remove("invalid");
      input.removeAttribute("aria-invalid");
    });
  }

  paymentOptions.forEach(option => {
    option.addEventListener("click", () => {
      paymentOptions.forEach(item => item.classList.remove("selected"));
      option.classList.add("selected");
      option.querySelector("input").checked = true;
      cardFields.hidden = option.dataset.method !== "card";
      confirmButton.textContent = option.dataset.method === "cash"
        ? "Confirm Rental · " + money(RENTAL_PRICE)
        : "Continue to Card Details · " + money(RENTAL_PRICE);
      clearError();
    });
  });

  $("qrCardName").addEventListener("input", event => {
    $("qrCardPreviewName").textContent =
      event.target.value.trim().toUpperCase() || "YOUR NAME";
    clearError();
  });

  $("qrCardNumber").addEventListener("input", event => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 19);
    event.target.value = digits.replace(/(.{4})/g, "$1 ").trim();
    $("qrCardPreviewNumber").textContent =
      event.target.value || "•••• •••• •••• ••••";
    clearError();
  });

  $("qrCardExpiry").addEventListener("input", event => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
    event.target.value = digits.length > 2
      ? digits.slice(0, 2) + "/" + digits.slice(2)
      : digits;
    $("qrCardPreviewExpiry").textContent = event.target.value || "MM/YY";
    clearError();
  });

  $("qrCardCvv").addEventListener("input", event => {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 4);
    clearError();
  });

  confirmButton.addEventListener("click", () => {
    clearError();

    const selected = document.querySelector('input[name="qrPaymentMethod"]:checked');

    if (!selected) {
      showError("Please choose Cash or Card before continuing.");
      return;
    }

    const method = selected.value;

    if (method === "card") {
      const name = $("qrCardName").value.trim();
      const number = $("qrCardNumber").value.replace(/\D/g, "");
      const expiry = $("qrCardExpiry").value.trim();
      const cvv = $("qrCardCvv").value.trim();

      if (name.length < 2 || !/^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u.test(name)) {
        showError("Enter a valid cardholder name.", $("qrCardName"));
        return;
      }

      if (!/^\d{13,19}$/.test(number) || !isValidCardNumber(number)) {
        showError("Your card number is incomplete or invalid. Please check it.", $("qrCardNumber"));
        return;
      }

      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
        showError("Enter the expiry date in MM/YY format.", $("qrCardExpiry"));
        return;
      }

      const [monthText, yearText] = expiry.split("/");
      const month = Number(monthText);
      const year = 2000 + Number(yearText);
      const now = new Date();

      if (new Date(year, month, 1) <= new Date(now.getFullYear(), now.getMonth(), 1)) {
        showError("This card has expired. Check the expiry date.", $("qrCardExpiry"));
        return;
      }

      if (!/^\d{3,4}$/.test(cvv)) {
        showError("Enter a valid 3- or 4-digit security code.", $("qrCardCvv"));
        return;
      }
    }

    confirmButton.disabled = true;
    confirmButton.textContent = "Confirming rental...";

    createRental(method);
  });

  $("qrCancel").addEventListener("click", closeModal);
}

function isValidCardNumber(number) {
  let sum = 0;
  let doubleDigit = false;

  for (let i = number.length - 1; i >= 0; i--) {
    let digit = Number(number[i]);

    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    doubleDigit = !doubleDigit;
  }

  return sum % 10 === 0;
}

function createRental(paymentMethod = "cash") {
  if (!selectedStation) return;

  const stock = getStock();
  const available = Number(stock[selectedStation.name]) || 0;

  if (available <= 0) {
    showToast("No umbrellas are available at this station.");
    closeModal();
    return;
  }

  const now = Date.now();

  const rental = {
    reference: makeReference("RN"),
    umbrellaId: makeReference("UMB"),
    station: selectedStation.name,
    returnStation: "",
    paymentMethod,
    paymentStatus: paymentMethod === "cash" ? "Pay in person" : "Not processed",
    price: RENTAL_PRICE,
    startTime: now,
    dueTime: now + RENTAL_HOURS * 3600000,
    returnTime: null,
    overdueFee: 0,
    totalFee: RENTAL_PRICE,
    status: "active"
  };

  const rentals = getRentals();
  rentals.push(rental);

  stock[selectedStation.name] = available - 1;

  const rentalsSaved = saveRentals(rentals);
  const stockSaved = saveData(STOCK_KEY, stock);

  if (!rentalsSaved || !stockSaved) {
    stock[selectedStation.name] = available;
    saveData(STOCK_KEY, stock);
    saveRentals(rentals.filter(item => item.reference !== rental.reference));
    showToast("The rental could not be saved. Please try again.");
    showRentalDetails();
    return;
  }

  showRentalPass(rental);
  renderStations($("stationSearch")?.value || "");
}

function startTimer(rental) {
  stopTimer();

  function updateTimer() {
    const timer = $("qrRentalTimer");
    if (!timer) return;

    const remaining = rental.dueTime - Date.now();
    const overdueFee = rental.status === "returned"
      ? getOverdueFee(rental.dueTime, rental.returnTime)
      : getOverdueFee(rental.dueTime);

    timer.textContent = remaining <= 0 && rental.status !== "returned"
      ? "OVERDUE"
      : rental.status === "returned"
        ? "RETURNED"
        : formatRemaining(remaining);

    const feeElement = $("qrOverdueFee");
    const totalElement = $("qrTotalFee");
    const statusElement = $("qrRentalStatus");

    if (feeElement) feeElement.textContent = money(overdueFee);
    if (totalElement) totalElement.textContent = money(rental.price + overdueFee);

    if (statusElement) {
      if (rental.status === "returned") {
        statusElement.textContent = "Umbrella returned";
        statusElement.classList.remove("qr-flow-danger");
      } else if (remaining <= 0) {
        statusElement.textContent = "Rental overdue";
        statusElement.classList.add("qr-flow-danger");
      } else {
        statusElement.textContent = "Currently rented";
        statusElement.classList.remove("qr-flow-danger");
      }
    }
  }

  updateTimer();

  if (rental.status !== "returned") {
    timerInterval = setInterval(updateTimer, 1000);
  }
}

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function showRentalPass(rental) {
  const overdueFee = rental.status === "returned"
    ? getOverdueFee(rental.dueTime, rental.returnTime)
    : getOverdueFee(rental.dueTime);

  const isReturned = rental.status === "returned";
  const paymentLabel = rental.paymentMethod === "card"
    ? "Card selected"
    : "Cash selected";

  openFlow(`
    <span class="qr-flow-kicker">${isReturned ? "RETURN COMPLETED" : "RENTAL CONFIRMED"}</span>
    <div class="qr-flow-pass">
      <div class="qr-pass-mark">${isReturned ? "✓" : "✓"}</div>
      <h2 id="qrFlowHeading">${isReturned ? "Thank you for returning!" : "Your rental is ready."}</h2>
      <p>${isReturned ? "Your umbrella return has been recorded." : "Keep your reference number and check your return timer below."}</p>

      <label>Rental reference</label>
      <span class="qr-flow-ref" id="qrReference">${rental.reference}</span>
      <button class="qr-flow-btn secondary" id="qrCopyReference">Copy Reference</button>

      <div class="qr-flow-summary">
        <div class="qr-flow-line"><span>Umbrella ID</span><strong>${rental.umbrellaId}</strong></div>
        <div class="qr-flow-line"><span>Pickup station</span><strong>${rental.station}</strong></div>
        <div class="qr-flow-line"><span>Payment choice</span><strong>${paymentLabel}</strong></div>
        <div class="qr-flow-line"><span>Payment status</span><strong>${rental.paymentStatus}</strong></div>
        <div class="qr-flow-line"><span>Start time</span><strong>${formatDate(rental.startTime)}</strong></div>
        <div class="qr-flow-line"><span>Due time</span><strong>${formatDate(rental.dueTime)}</strong></div>
        ${isReturned ? `<div class="qr-flow-line"><span>Return station</span><strong>${rental.returnStation}</strong></div><div class="qr-flow-line"><span>Returned at</span><strong>${formatDate(rental.returnTime)}</strong></div>` : ""}
      </div>

      <div class="qr-flow-pass">
        <p id="qrRentalStatus">${isReturned ? "Umbrella returned" : "Currently rented"}</p>
        <div class="qr-flow-timer" id="qrRentalTimer">${isReturned ? "RETURNED" : formatRemaining(rental.dueTime - Date.now())}</div>
        <p>${isReturned ? "Your final rental charges are shown below." : "Time remaining until your rental is due"}</p>
        <div class="qr-flow-line"><span>Rental fee</span><strong>${money(rental.price)}</strong></div>
        <div class="qr-flow-line"><span>Overdue fee</span><strong id="qrOverdueFee">${money(overdueFee)}</strong></div>
        <div class="qr-flow-total"><span>Total fee</span><strong id="qrTotalFee">${money(rental.price + overdueFee)}</strong></div>
      </div>
    </div>

    ${!isReturned ? `<button class="qr-flow-btn" id="qrReturnUmbrella">Return Umbrella</button>` : ""}
    <button class="qr-flow-btn secondary" id="qrRentalHistory">View My Rentals</button>
    <button class="qr-flow-btn secondary" id="qrPassClose">Close</button>
  `);

  $("qrCopyReference").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(rental.reference);
      showToast("Rental reference copied.");
    } catch {
      const range = document.createRange();
      range.selectNodeContents($("qrReference"));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      showToast("Select and copy your rental reference.");
    }
  });

  if (!isReturned) {
    $("qrReturnUmbrella").addEventListener("click", () => showReturnStep(rental));
  }

  $("qrRentalHistory").addEventListener("click", showMyRental);
  $("qrPassClose").addEventListener("click", closeModal);

  if (!isReturned) startTimer(rental);
}

function showReturnStep(rental) {
  const options = stations.map(station =>
    `<option value="${station.name}">${station.name}</option>`
  ).join("");

  openFlow(`
    <span class="qr-flow-kicker">RETURN UMBRELLA</span>
    <h2 id="qrFlowHeading">Return your umbrella.</h2>
    <p>Select the station where you are returning your umbrella.</p>

    <div class="qr-flow-summary">
      <div class="qr-flow-line"><span>Rental reference</span><strong>${rental.reference}</strong></div>
      <div class="qr-flow-line"><span>Pickup station</span><strong>${rental.station}</strong></div>
    </div>

    <label for="qrReturnStation">Return station</label>
    <select class="qr-flow-select" id="qrReturnStation">
      <option value="">Select return station</option>
      ${options}
    </select>

    <div id="qrReturnError" class="qr-flow-error" role="alert" aria-live="polite"></div>

    <button class="qr-flow-btn" id="qrConfirmReturn">Confirm Return</button>
    <button class="qr-flow-btn secondary" id="qrCancelReturn">Go Back</button>
  `);

  $("qrReturnStation").value = rental.station;

  $("qrConfirmReturn").addEventListener("click", () => {
    const returnStation = $("qrReturnStation").value;

    if (!stations.some(station => station.name === returnStation)) {
      const error = $("qrReturnError");
      error.textContent = "Please select a valid return station.";
      error.classList.add("visible");
      $("qrReturnStation").classList.add("invalid");
      return;
    }

    if (rental.status === "returned") {
      showToast("This umbrella has already been returned.");
      showRentalPass(rental);
      return;
    }

    showReturnConfirmation(rental, returnStation);
  });

  $("qrReturnStation").addEventListener("change", () => {
    $("qrReturnStation").classList.remove("invalid");
    $("qrReturnError").classList.remove("visible");
  });

  $("qrCancelReturn").addEventListener("click", () => showRentalPass(rental));
}


function showReturnConfirmation(rental, returnStation) {
  openFlow(`
    <span class="qr-flow-kicker">QRain · RETURN CONFIRMATION</span>

    <div style="text-align:center;padding:18px 0 10px">
      <div style="
        width:82px;
        height:82px;
        margin:0 auto 22px;
        display:grid;
        place-items:center;
        border-radius:26px;
        background:linear-gradient(135deg,#e5efff,#c7dcff);
        color:#2465e8;
        font-size:38px;
        box-shadow:0 12px 28px rgba(36,101,232,.15);
      ">✓</div>

      <h2 id="qrFlowHeading" style="margin:0 0 12px">
        Ready to return?
      </h2>

      <p>
        You're about to complete your umbrella return.
        Please review the details below.
      </p>
    </div>

    <div class="qr-flow-summary">
      <div class="qr-flow-line">
        <span>Rental reference</span>
        <strong>${rental.reference}</strong>
      </div>

      <div class="qr-flow-line">
        <span>Pickup station</span>
        <strong>${rental.station}</strong>
      </div>

      <div class="qr-flow-line">
        <span>Return station</span>
        <strong>${returnStation}</strong>
      </div>

      <div class="qr-flow-line">
        <span>Rental fee</span>
        <strong>${money(rental.price)}</strong>
      </div>
    </div>

    <div class="qr-flow-status">
      Confirm only if you have physically returned the umbrella
      to the selected station.
    </div>

    <button class="qr-flow-btn" id="qrFinishReturn">
      Confirm Return
    </button>

    <button class="qr-flow-btn secondary" id="qrBackReturn">
      Go Back
    </button>
  `);

  $("qrFinishReturn").addEventListener("click", () => {
    $("qrFinishReturn").disabled = true;
    completeReturn(rental.reference, returnStation);
  });

  $("qrBackReturn").addEventListener("click", () => {
    showReturnStep(rental);
  });
}


function completeReturn(reference, returnStation) {
  const rentals = getRentals();
  const index = rentals.findIndex(item => item.reference === reference);

  if (index < 0) {
    showToast("Rental not found. Please check your rental history.");
    return;
  }

  const rental = rentals[index];

  if (rental.status === "returned") {
    showToast("This umbrella has already been returned.");
    showRentalPass(rental);
    return;
  }

  const stock = getStock();
  const previousStock = Number(stock[returnStation]) || 0;

  rental.status = "returned";
  rental.returnStation = returnStation;
  rental.returnTime = Date.now();
  rental.overdueFee = getOverdueFee(rental.dueTime, rental.returnTime);
  rental.totalFee = rental.price + rental.overdueFee;

  rentals[index] = rental;
  stock[returnStation] = previousStock + 1;

  const rentalsSaved = saveRentals(rentals);
  const stockSaved = saveData(STOCK_KEY, stock);

  if (!rentalsSaved || !stockSaved) {
    rental.status = "active";
    rental.returnStation = "";
    rental.returnTime = null;
    rental.overdueFee = 0;
    rental.totalFee = rental.price;
    stock[returnStation] = previousStock;

    saveRentals(rentals);
    saveData(STOCK_KEY, stock);

    showToast("We couldn't save your return. Please try again.");
    return;
  }

  showRentalPass(rental);
  renderStations($("stationSearch")?.value || "");
}

function showMyRental() {
  const rentals = getRentals().slice().reverse();

  if (rentals.length === 0) {
    openFlow(`
      <span class="qr-flow-kicker">RENTAL HISTORY</span>
      <h2 id="qrFlowHeading">No rentals yet.</h2>
      <p>Your rental records will appear here after you rent an umbrella.</p>
      <button class="qr-flow-btn secondary" id="qrCloseHistory">Close</button>
    `);

    $("qrCloseHistory").addEventListener("click", closeModal);
    return;
  }

  const wrapper = document.createElement("div");

  wrapper.innerHTML = `
    <span class="qr-flow-kicker">YOUR ACTIVITY</span>
    <h2 id="qrFlowHeading">My Rentals</h2>
    <p>View your rental references, due times, and return status.</p>
    <div id="qrRentalRows"></div>
    <button class="qr-flow-btn secondary" id="qrCloseHistory">Close</button>
  `;

  openFlow(wrapper.innerHTML);

  const rows = $("qrRentalRows");

  rentals.forEach(rental => {
    const returned = rental.status === "returned";
    const fee = returned
      ? getOverdueFee(rental.dueTime, rental.returnTime)
      : getOverdueFee(rental.dueTime);

    const status = returned
      ? "Returned"
      : Date.now() >= rental.dueTime
        ? "Overdue"
        : "Active";

    const card = document.createElement("div");
    card.className = "qr-flow-summary";

    const heading = document.createElement("h3");
    heading.textContent = rental.station;
    heading.style.margin = "0 0 10px";
    heading.style.fontSize = "17px";

    const details = [
      ["Reference", rental.reference],
      ["Started", formatDate(rental.startTime)],
      ["Due", formatDate(rental.dueTime)],
      ["Status", status],
      ["Total fee", money(rental.price + fee)]
    ];

    card.appendChild(heading);

    details.forEach(([label, value]) => {
      const line = document.createElement("div");
      line.className = "qr-flow-line";

      const labelElement = document.createElement("span");
      labelElement.textContent = label;

      const valueElement = document.createElement("strong");
      valueElement.textContent = value;

      line.append(labelElement, valueElement);
      card.appendChild(line);
    });

    const button = document.createElement("button");
    button.type = "button";
    button.className = "qr-flow-btn secondary";
    button.textContent = "View Rental Details";

    button.addEventListener("click", () => {
      const latest = getRentals().find(item => item.reference === rental.reference);
      if (latest) showRentalPass(latest);
    });

    card.appendChild(button);
    rows.appendChild(card);
  });

  $("qrCloseHistory").addEventListener("click", closeModal);
}

 
function setupLogin() {
  const loginButton = $("loginBtn");
  const modal = $("loginModal");
  const closeButton = $("closeModal");
  const form = $("loginForm");
  const message = $("loginMessage");

  if (!loginButton || !modal || !form) return;

  const originalText = loginButton.textContent.trim();
  const getSession = () => {
    try {
      return JSON.parse(localStorage.getItem("qrain_demo_session") || "null");
    } catch {
      return null;
    }
  };

  function updateLoginButton() {
    const session = getSession();

    if (session) {
      loginButton.textContent = "Logged in";
      loginButton.setAttribute("aria-label", "Log out");
    } else {
      loginButton.textContent = originalText || "Log In";
      loginButton.removeAttribute("aria-label");
    }
  }

  function closeLogin() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  function showMessage(text, success = false) {
    if (!message) return;

    message.textContent = text;
    message.style.color = success ? "#14865c" : "#d92d3a";
  }

  loginButton.addEventListener("click", () => {
    if (getSession()) {
      localStorage.removeItem("qrain_demo_session");
      updateLoginButton();
      showToast("You have logged out successfully.");
      return;
    }

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  });

  closeButton?.addEventListener("click", closeLogin);

  modal.addEventListener("click", event => {
    if (event.target === modal) closeLogin();
  });

  form.addEventListener("submit", event => {
    event.preventDefault();

    const emailInput = form.querySelector(
      'input[type="email"], input[name*="email" i], input[id*="email" i]'
    );

    const passwordInput = form.querySelector(
      'input[type="password"]'
    );

    if (!emailInput || !passwordInput) {
      showMessage("Email or password field is missing.");
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showMessage("Please enter your email and password.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage("Please enter a valid email address.");
      emailInput.focus();
      return;
    }

    try {
      localStorage.setItem(
        "qrain_demo_session",
        JSON.stringify({
          email: email,
          loggedInAt: Date.now()
        })
      );
    } catch {
      showMessage("Your browser could not save the login session.");
      return;
    }

    updateLoginButton();
    showMessage("Login successful! Welcome to QRain.", true);

    setTimeout(() => {
      closeLogin();
      showToast("Welcome to QRain!");
    }, 800);
  });

  updateLoginButton();
}


installStyles();
renderStations();
setupLogin();
