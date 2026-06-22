const fallbackData = {
  weeklyCloses: [
    16910, 17180, 17040, 17320, 17560, 17490, 17780, 17940, 18110, 18020,
    18320, 18580, 18740, 18630, 18890, 19120, 19310, 19240, 19490, 19720,
    19940, 19870, 20110, 20340, 20270, 20560, 20730, 20920, 20810, 21040,
  ],
  weeklyHighs: [],
  weeklyLows: [],
  dailyNdx: [],
  qqq: [],
  qqew: [],
  vxn: [],
  tlt: [],
  hyg: [],
  lqd: [],
  puts: 940000,
  calls: 1030000,
  source: "Fallback",
};

function buildDemoData() {
  const weeklyCloses = [
    18680, 18820, 18740, 18960, 19130, 19080, 19320, 19480, 19610, 19540,
    19780, 19960, 20120, 20040, 20280, 20410, 20560, 20490, 20720, 20860,
    21020, 20940, 21180, 21320, 21440, 21360, 21580, 21710, 21630, 21380,
    21090, 20840, 20620, 20910, 21260, 21540, 21780, 21920, 21840, 22060,
  ];
  const weeklyVxn = [
    18.6, 18.1, 18.4, 17.8, 17.2, 17.6, 16.9, 16.5, 16.2, 16.8,
    15.9, 15.6, 15.2, 15.8, 15.1, 14.8, 14.5, 15.0, 14.4, 14.1,
    13.9, 14.3, 13.8, 13.6, 13.4, 13.9, 13.5, 13.2, 13.8, 15.4,
    17.2, 19.6, 21.8, 19.2, 17.6, 16.3, 15.4, 14.8, 15.2, 14.6,
  ];
  const weeklyHighs = weeklyCloses.map((value, index) => value * (1.012 + (index % 4) * 0.002));
  const weeklyLows = weeklyCloses.map((value, index) => value * (0.988 - (index % 3) * 0.002));
  const weeklyVxnHighs = weeklyVxn.map((value, index) => value * (1.10 + (index % 3) * 0.02));
  const weeklyVxnLows = weeklyVxn.map((value, index) => value * (0.90 - (index % 2) * 0.02));

  return {
    ...fallbackData,
    weeklyCloses,
    weeklyHighs,
    weeklyLows,
    weeklyVxn,
    weeklyVxnHighs,
    weeklyVxnLows,
    puts: 910000,
    calls: 1000000,
    source: "Demo",
  };
}

const el = {
  dataStatus: document.querySelector("#dataStatus"),
  fearGauge: document.querySelector("#fearGauge"),
  fearScale: document.querySelector("#fearScale"),
  trendChart: document.querySelector("#trendChart"),
  fearValue: document.querySelector("#fearValue"),
  fearState: document.querySelector("#fearState"),
  trendState: document.querySelector("#trendState"),
  trendScore: document.querySelector("#trendScore"),
  trendSummary: document.querySelector("#trendSummary"),
  marketSignal: document.querySelector("#marketSignal"),
  competitionBar: document.querySelector(".competition-bar"),
  putCallRatio: document.querySelector("#putCallRatio"),
  optionsState: document.querySelector("#optionsState"),
  putBar: document.querySelector("#putBar"),
  callBar: document.querySelector("#callBar"),
  momentumBar: document.querySelector("#momentumBar"),
  momentumState: document.querySelector("#momentumState"),
  momentumValue: document.querySelector("#momentumValue"),
  volatilityBar: document.querySelector("#volatilityBar"),
  volatilityState: document.querySelector("#volatilityState"),
  volatilityValue: document.querySelector("#volatilityValue"),
};

const demoData = buildDemoData();
let currentData = demoData;

const SENTIMENT_THRESHOLDS = {
  extremeRangeUnits: 1.2,
};

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function simpleMovingAverage(values, size) {
  return values.map((_, index) => {
    if (index + 1 < size) return null;
    return average(values.slice(index + 1 - size, index + 1));
  });
}

function simpleMovingAverageValue(values, size) {
  if (values.length < size) return null;
  return average(values.slice(-size));
}

function latest(values) {
  return values.at(-1);
}

function scoreFromRangeDistance(distancePct, rangePct, inverse = false, unitsToExtreme = 2.5) {
  if (!Number.isFinite(distancePct) || !Number.isFinite(rangePct) || rangePct <= 0) {
    return 50;
  }

  const rangeUnits = distancePct / rangePct;
  const score = clamp(50 + rangeUnits * (50 / unitsToExtreme), 0, 100);
  return inverse ? 100 - score : score;
}

function averageRangePercent(highs, lows, closes, periods = 20) {
  if (highs?.length >= periods && lows?.length >= periods && closes?.length >= periods) {
    const start = closes.length - periods;
    const ranges = closes.slice(start).map((close, index) => {
      const high = highs[start + index];
      const low = lows[start + index];
      if (!Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close) || close <= 0) {
        return null;
      }
      return ((high - low) / close) * 100;
    });
    return average(ranges);
  }

  const closesWindow = closes.slice(-periods - 1);
  const ranges = closesWindow.slice(1).map((close, index) => {
    const prior = closesWindow[index];
    if (!Number.isFinite(close) || !Number.isFinite(prior) || prior <= 0) return null;
    return Math.abs((close - prior) / prior) * 100;
  });
  return average(ranges);
}

function putCallToFearGreedScore(ratio) {
  if (!Number.isFinite(ratio)) return 50;
  if (ratio <= 0.60) return 100;
  if (ratio <= 0.70) return 80 - ((ratio - 0.60) / 0.10) * 20;
  if (ratio <= 0.80) return 60 - ((ratio - 0.70) / 0.10) * 20;
  if (ratio <= 0.90) return 40 - ((ratio - 0.80) / 0.10) * 20;
  return clamp(20 - ((ratio - 0.90) / 0.10) * 20, 0, 20);
}

function pickComponents(components, keys) {
  return Object.fromEntries(keys.map((key) => [key, components[key]]));
}

function getFearGreedComponents(data) {
  const weeklyNdx = data.weeklyCloses.length >= 20 ? data.weeklyCloses : fallbackData.weeklyCloses;
  const weeklyVxn = data.weeklyVxn?.length >= 20 ? data.weeklyVxn : data.vxn;
  const ndx5Wsma = simpleMovingAverageValue(weeklyNdx, 5);
  const ndxMomentum = ((latest(weeklyNdx) - ndx5Wsma) / ndx5Wsma) * 100;
  const ndxAwr20 = averageRangePercent(data.weeklyHighs, data.weeklyLows, weeklyNdx, 20);
  const vxnCurrent = latest(weeklyVxn);
  const vxn5Wsma = simpleMovingAverageValue(weeklyVxn, 5);
  const vxnDistance = ((vxnCurrent - vxn5Wsma) / vxn5Wsma) * 100;
  const vxnAwr20 = averageRangePercent(data.weeklyVxnHighs, data.weeklyVxnLows, weeklyVxn, 20);
  const putCallRatio = data.puts / data.calls;

  return {
    momentum: scoreFromRangeDistance(
      ndxMomentum,
      ndxAwr20,
      false,
      SENTIMENT_THRESHOLDS.extremeRangeUnits
    ),
    putCall: putCallToFearGreedScore(putCallRatio),
    volatility: scoreFromRangeDistance(
      vxnDistance,
      vxnAwr20,
      true,
      SENTIMENT_THRESHOLDS.extremeRangeUnits
    ),
  };
}

function getMetrics(data) {
  const price = data.weeklyCloses.slice(-40);
  const ma5 = simpleMovingAverage(price, 5);
  const ma10 = simpleMovingAverage(price, 10);
  const ma20 = simpleMovingAverage(price, 20);
  const last5 = latest(ma5);
  const last10 = latest(ma10);
  const last20 = latest(ma20);
  const qqqPutCall = data.puts / data.calls;
  const avgPutCall = qqqPutCall;
  const components = getFearGreedComponents(data);
  const visibleComponents = pickComponents(components, ["momentum", "volatility", "putCall"]);
  const fearGreed = Math.round(average(Object.values(visibleComponents)));
  const momentum = Math.round(components.momentum);
  const volatility = Math.round(components.volatility);
  const trend =
    last5 > last10 && last10 > last20
      ? "up"
      : last5 < last10 && last10 < last20
        ? "down"
        : "sideways";

  return {
    avgPutCall,
    components: visibleComponents,
    fearGreed,
    momentum,
    qqqPutCall,
    volatility,
    ma5,
    ma10,
    ma20,
    price,
    trend,
    wsmaStack: `${Math.round(last5).toLocaleString("de-DE")} / ${Math.round(last10).toLocaleString("de-DE")} / ${Math.round(last20).toLocaleString("de-DE")}`,
  };
}

function classifyFear(value) {
  if (value <= 20) return ["Extreme Fear", "is-negative"];
  if (value < 40) return ["Fear", "is-negative"];
  if (value <= 60) return ["Neutral", ""];
  if (value < 80) return ["Greed", "is-positive"];
  return ["Extreme Greed", "is-positive"];
}

function classFromLabel(label) {
  const normalized = String(label || "").toLowerCase();
  if (normalized.includes("fear") || normalized.includes("down")) return "is-negative";
  if (normalized.includes("greed") || normalized.includes("up")) return "is-positive";
  return "";
}

function classifyTrend(trend) {
  if (trend === "up") return ["Uptrend", "is-positive", "5 > 10 > 20"];
  if (trend === "down") return ["Downtrend", "is-negative", "5 < 10 < 20"];
  return ["Sideways", "", "Not aligned"];
}

function setPill(node, label, className) {
  node.textContent = label;
  node.className = `pill ${className}`.trim();
}

function setStatus(label, mode = "") {
  el.dataStatus.textContent = label;
  el.dataStatus.parentElement.className = `market-status ${mode}`.trim();
}

function prepareCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(window.devicePixelRatio || 1, 1);
  const width = Math.round(rect.width || canvas.width);
  const height = Math.round(rect.height || canvas.height);

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  return { ctx, width, height };
}

function drawFearGauge(value) {
  const { ctx, width, height } = prepareCanvas(el.fearGauge);
  const css = getComputedStyle(document.documentElement);
  const cx = width / 2;
  const cy = height * 0.9;
  const radius = width * 0.38;
  const start = Math.PI;
  const progress = start + (clamp(value, 0, 100) / 100) * Math.PI;
  const zones = [
    css.getPropertyValue("--zone-1").trim(),
    css.getPropertyValue("--zone-2").trim(),
    css.getPropertyValue("--zone-3").trim(),
    css.getPropertyValue("--zone-4").trim(),
    css.getPropertyValue("--zone-5").trim(),
  ];

  ctx.lineCap = "round";
  ctx.lineWidth = 22;

  zones.forEach((color, index) => {
    const gap = 2 / radius;
    const zoneStart = start + (index / zones.length) * Math.PI + gap;
    const zoneEnd = start + ((index + 1) / zones.length) * Math.PI - gap;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, zoneStart, zoneEnd);
    ctx.strokeStyle = color;
    ctx.stroke();
  });

  ctx.beginPath();
  ctx.arc(cx, cy, radius, start, progress);
  ctx.strokeStyle = css.getPropertyValue("--ink").trim();
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.lineWidth = 4;
  for (let i = 1; i < zones.length; i += 1) {
    const angle = start + (i / zones.length) * Math.PI;
    const inner = radius - 18;
    const outer = radius + 17;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.strokeStyle = css.getPropertyValue("--bg").trim();
    ctx.stroke();
  }

  const markerRadius = radius + 24;
  const markerX = cx + Math.cos(progress) * markerRadius;
  const markerY = cy + Math.sin(progress) * markerRadius;
  ctx.fillStyle = css.getPropertyValue("--ink").trim();
  ctx.beginPath();
  ctx.arc(markerX, markerY, 5, 0, Math.PI * 2);
  ctx.fill();
}

function fearBandIndex(value) {
  if (value <= 20) return 0;
  if (value < 40) return 1;
  if (value <= 60) return 2;
  if (value < 80) return 3;
  return 4;
}

function updateFearScale(value) {
  const activeIndex = fearBandIndex(value);
  [...el.fearScale.querySelectorAll("span")].forEach((node, index) => {
    node.classList.toggle("is-active", index === activeIndex);
  });
}

function drawTrendChart(metrics) {
  const { ctx, width, height } = prepareCanvas(el.trendChart);
  const css = getComputedStyle(document.documentElement);
  const pad = 26;
  const series = [metrics.price, metrics.ma5, metrics.ma10, metrics.ma20];
  const values = series.flat().filter(Boolean);
  const min = Math.min(...values) * 0.998;
  const max = Math.max(...values) * 1.002;
  const xStep = (width - pad * 2) / (metrics.price.length - 1);
  const y = (value) => height - pad - ((value - min) / (max - min)) * (height - pad * 2);

  ctx.strokeStyle = css.getPropertyValue("--soft-2").trim();
  ctx.lineWidth = 1;

  for (let i = 0; i < 5; i += 1) {
    const yLine = pad + ((height - pad * 2) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad, yLine);
    ctx.lineTo(width - pad, yLine);
    ctx.stroke();
  }

  drawLine(ctx, metrics.ma20, xStep, y, pad, css.getPropertyValue("--zone-2").trim(), 2.2);
  drawLine(ctx, metrics.ma10, xStep, y, pad, css.getPropertyValue("--zone-3").trim(), 2.4);
  drawLine(ctx, metrics.ma5, xStep, y, pad, css.getPropertyValue("--zone-4").trim(), 2.8);
  drawLine(ctx, metrics.price, xStep, y, pad, css.getPropertyValue("--ink").trim(), 3.6);

  const lastX = pad + xStep * (metrics.price.length - 1);
  const lastY = y(latest(metrics.price));
  ctx.beginPath();
  ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
  ctx.fillStyle = css.getPropertyValue("--ink").trim();
  ctx.fill();
}

function drawLine(ctx, values, xStep, y, pad, color, width) {
  const firstValidIndex = values.findIndex((value) => Number.isFinite(value));
  ctx.beginPath();
  values.forEach((value, index) => {
    if (!Number.isFinite(value)) return;
    const x = pad + xStep * index;
    const nextY = y(value);
    if (index === firstValidIndex) ctx.moveTo(x, nextY);
    else ctx.lineTo(x, nextY);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

function render(data = currentData) {
  const metrics = getMetrics(data);
  const [fearLabel, fearClass] = classifyFear(metrics.fearGreed);
  const [trendLabel, trendClass, trendStack] = classifyTrend(metrics.trend);
  const [optionsLabel] = classifyFear(metrics.components.putCall);
  const [momentumLabel] = classifyFear(metrics.momentum);
  const [volatilityLabel] = classifyFear(metrics.volatility);
  const putShare = metrics.avgPutCall / (1 + metrics.avgPutCall);
  const callShare = 1 / (1 + metrics.avgPutCall);

  el.fearValue.textContent = metrics.fearGreed;
  el.momentumValue.textContent = metrics.momentum ?? "—";
  el.trendScore.textContent = trendStack;
  el.trendScore.title = `Current WSMAs: ${metrics.wsmaStack}`;
  el.putCallRatio.textContent = metrics.avgPutCall.toFixed(2);
  el.volatilityValue.textContent = metrics.volatility ?? "—";
  el.marketSignal.textContent = `${fearLabel} ${metrics.fearGreed}`;
  el.trendSummary.textContent = trendLabel;
  el.momentumBar.style.width = `${clamp(metrics.momentum ?? 0, 0, 100)}%`;
  el.putBar.style.width = `${putShare * 100}%`;
  el.callBar.style.width = `${callShare * 100}%`;
  el.competitionBar.className =
    `competition-bar ${
      Math.abs(putShare - callShare) < 0.02
        ? "is-balanced"
        : putShare > callShare
          ? "is-put-dominant"
          : "is-call-dominant"
    }`;
  el.volatilityBar.style.width = `${clamp(metrics.volatility ?? 0, 0, 100)}%`;

  setPill(el.fearState, fearLabel, fearClass);
  setPill(el.momentumState, momentumLabel, classFromLabel(momentumLabel));
  setPill(el.trendState, trendLabel, trendClass);
  setPill(el.optionsState, optionsLabel, classFromLabel(optionsLabel));
  setPill(el.volatilityState, volatilityLabel, classFromLabel(volatilityLabel));
  updateFearScale(metrics.fearGreed);
  drawFearGauge(metrics.fearGreed);
  drawTrendChart(metrics);
}

async function boot() {
  currentData = demoData;
  render(currentData);
  setStatus("Demo data", "is-live");
}

window.addEventListener("resize", () => render(currentData));
boot();
