const form = document.querySelector("#countdown-form");
const titleInput = document.querySelector("#title-input");
const subtitleInput = document.querySelector("#subtitle-input");
const dateInput = document.querySelector("#date-input");
const timeInput = document.querySelector("#time-input");
const themeInput = document.querySelector("#theme-input");
const copyLink = document.querySelector("#copy-link");
const renderGraphic = document.querySelector("#render-graphic");
const shareStatus = document.querySelector("#share-status");
const countdownTitle = document.querySelector("#countdown-title");
const countdownSubtitle = document.querySelector("#countdown-subtitle");
const countdownKicker = document.querySelector("#countdown-kicker");
const targetLabel = document.querySelector("#target-label");
const daysEl = document.querySelector("#days");
const hoursEl = document.querySelector("#hours");
const minutesEl = document.querySelector("#minutes");
const secondsEl = document.querySelector("#seconds");
const renderCanvas = document.querySelector("#render-canvas");

const themes = {
  void: "#e9ff70",
  birthday: "#ff8fd4",
  exam: "#ffcf5c",
  trip: "#7fb7ff",
  release: "#54ff84",
};

let state = {
  title: "Jakub's Birthday",
  subtitle: "time until the moment",
  target: "",
  theme: "void",
};
let sharedView = false;

function pad(value, length = 2) {
  return String(value).padStart(length, "0");
}

function localDateValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function defaultTarget() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  date.setHours(18, 0, 0, 0);
  return date;
}

function readQuery() {
  const params = new URLSearchParams(window.location.search);
  const fallback = defaultTarget();
  sharedView = params.get("view") === "1";
  state = {
    title: params.get("title") || state.title,
    subtitle: params.get("subtitle") || state.subtitle,
    target: params.get("target") || fallback.toISOString(),
    theme: params.get("theme") || state.theme,
  };
}

function targetDate() {
  return new Date(state.target);
}

function syncInputs() {
  const target = targetDate();
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  dateInput.value = localDateValue(target);
  timeInput.value = `${pad(target.getHours())}:${pad(target.getMinutes())}`;
  themeInput.value = state.theme;
}

function updateClass() {
  document.body.classList.remove("theme-void", "theme-birthday", "theme-exam", "theme-trip", "theme-release");
  document.body.classList.add(`theme-${state.theme}`);
}

function updateUrl(replace = true) {
  const params = new URLSearchParams({
    title: state.title,
    subtitle: state.subtitle,
    target: state.target,
    theme: state.theme,
  });
  if (sharedView) params.set("view", "1");
  const url = `${window.location.pathname}?${params.toString()}`;
  window.history[replace ? "replaceState" : "pushState"](null, "", url);
}

function buildShareUrl() {
  const params = new URLSearchParams({
    title: state.title,
    subtitle: state.subtitle,
    target: state.target,
    theme: state.theme,
    view: "1",
  });
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

function readForm() {
  const date = dateInput.value;
  const time = timeInput.value || "00:00";
  const target = new Date(`${date}T${time}`);
  state = {
    title: titleInput.value.trim() || "Untitled Countdown",
    subtitle: subtitleInput.value.trim() || "time until the moment",
    target: target.toISOString(),
    theme: themeInput.value,
  };
}

function updateDisplay() {
  updateClass();
  document.body.classList.toggle("share-view", sharedView);
  const target = targetDate();
  countdownTitle.textContent = state.title;
  countdownSubtitle.textContent = state.subtitle;
  countdownKicker.textContent = state.theme === "void" ? "countdown" : state.theme;
  targetLabel.textContent = target.toLocaleString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRemaining() {
  const diff = targetDate().getTime() - Date.now();
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  return {
    expired: diff <= 0,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function tick() {
  const remaining = getRemaining();
  daysEl.textContent = String(remaining.days);
  hoursEl.textContent = pad(remaining.hours);
  minutesEl.textContent = pad(remaining.minutes);
  secondsEl.textContent = pad(remaining.seconds);
  if (remaining.expired) {
    countdownSubtitle.textContent = "the moment has arrived";
  }
}

async function copyShareLink() {
  readForm();
  updateDisplay();
  const shareUrl = buildShareUrl();
  try {
    await navigator.clipboard.writeText(shareUrl);
    shareStatus.textContent = "Share link copied.";
  } catch {
    shareStatus.textContent = shareUrl;
  }
}

function fitText(ctx, text, maxWidth, startSize, minSize, weight = 900) {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px Inter, Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  } while (size >= minSize);
  return minSize;
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/);
  let line = "";
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
      return;
    }
    ctx.fillText(line, x, y);
    y += lineHeight;
    line = word;
  });
  if (line) ctx.fillText(line, x, y);
  return y + lineHeight;
}

function drawUnit(ctx, value, label, x, y, w, h) {
  ctx.fillStyle = "rgba(255,255,255,0.045)";
  roundRect(ctx, x, y, w, h, 22);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.stroke();
  ctx.fillStyle = "#f5f5f0";
  fitText(ctx, value, w - 30, 76, 38, 900);
  ctx.fillText(value, x + 20, y + 92);
  ctx.fillStyle = "#a6a6a0";
  ctx.font = "900 22px Inter, Arial, sans-serif";
  ctx.fillText(label.toUpperCase(), x + 20, y + 130);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function renderPng() {
  readForm();
  updateDisplay();
  const ctx = renderCanvas.getContext("2d");
  const accent = themes[state.theme] || themes.void;
  const remaining = getRemaining();
  ctx.fillStyle = "#030303";
  ctx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);

  const gradient = ctx.createRadialGradient(150, 130, 20, 420, 420, 1100);
  gradient.addColorStop(0, `${accent}38`);
  gradient.addColorStop(0.45, "rgba(255,255,255,0.04)");
  gradient.addColorStop(1, "#030303");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.055)";
  for (let x = 0; x <= renderCanvas.width; x += 72) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, renderCanvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= renderCanvas.height; y += 72) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(renderCanvas.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = accent;
  ctx.font = "900 28px Inter, Arial, sans-serif";
  ctx.fillText("COUNTDOWN", 72, 96);
  ctx.fillStyle = "#f5f5f0";
  fitText(ctx, state.title, 1050, 96, 46, 900);
  const y = drawWrappedText(ctx, state.title, 72, 198, 1050, 88);
  ctx.fillStyle = "#a6a6a0";
  ctx.font = "750 34px Inter, Arial, sans-serif";
  drawWrappedText(ctx, state.subtitle, 72, y + 8, 920, 42);

  const units = [
    [String(remaining.days), "days"],
    [pad(remaining.hours), "hours"],
    [pad(remaining.minutes), "mins"],
    [pad(remaining.seconds), "secs"],
  ];
  units.forEach((unit, index) => drawUnit(ctx, unit[0], unit[1], 72 + index * 270, 620, 240, 160));

  ctx.fillStyle = accent;
  ctx.font = "900 30px Inter, Arial, sans-serif";
  ctx.fillText(targetLabel.textContent, 72, 870);
  ctx.fillStyle = "#f5f5f0";
  ctx.font = "900 42px Inter, Arial, sans-serif";
  ctx.fillText("jakublabs.xyz", 72, 1490);

  const link = document.createElement("a");
  link.href = renderCanvas.toDataURL("image/png");
  link.download = "countdown-graphic.png";
  link.click();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  readForm();
  updateDisplay();
  updateUrl(false);
});

[titleInput, subtitleInput, dateInput, timeInput, themeInput].forEach((input) => {
  input.addEventListener("input", () => {
    readForm();
    updateDisplay();
    updateUrl(true);
  });
});

copyLink.addEventListener("click", copyShareLink);
renderGraphic.addEventListener("click", renderPng);

readQuery();
syncInputs();
updateDisplay();
if (!sharedView) updateUrl(true);
tick();
setInterval(tick, 1000);
