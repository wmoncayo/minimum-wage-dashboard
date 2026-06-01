const SVG_NS = "http://www.w3.org/2000/svg";

const FIPS_TO_ABBR = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  "10": "DE",
  "11": "DC",
  "12": "FL",
  "13": "GA",
  "15": "HI",
  "16": "ID",
  "17": "IL",
  "18": "IN",
  "19": "IA",
  "20": "KS",
  "21": "KY",
  "22": "LA",
  "23": "ME",
  "24": "MD",
  "25": "MA",
  "26": "MI",
  "27": "MN",
  "28": "MS",
  "29": "MO",
  "30": "MT",
  "31": "NE",
  "32": "NV",
  "33": "NH",
  "34": "NJ",
  "35": "NM",
  "36": "NY",
  "37": "NC",
  "38": "ND",
  "39": "OH",
  "40": "OK",
  "41": "OR",
  "42": "PA",
  "44": "RI",
  "45": "SC",
  "46": "SD",
  "47": "TN",
  "48": "TX",
  "49": "UT",
  "50": "VT",
  "51": "VA",
  "53": "WA",
  "54": "WV",
  "55": "WI",
  "56": "WY"
};

const WAGE_COLORS = ["#f4eadc", "#d6ddc7", "#9fbd86", "#578f5f", "#174f36"];
const GAP_COLORS = ["#2f4d67", "#8ba5ad", "#f7efe3", "#8dae70", "#174f36"];
const THRESHOLD_COLORS = ["#8da7b5", "#dec082", "#266d47"];

const appState = {
  data: null,
  topology: null,
  features: [],
  selectedState: null,
  hoveredState: null,
  view: "state",
  compareMode: "none",
  compareState: "CA",
  threshold: 15,
  search: "",
  exceptionsOnly: false,
  indexedOnly: false,
  tableScope: "all",
  sortKey: "rate",
  sortDirection: "desc"
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindEvents();
  loadUrlState();
  loadDashboard();
});

function cacheElements() {
  for (const id of [
    "lastUpdated",
    "sourceWorkbook",
    "loadError",
    "loadErrorText",
    "retryLoad",
    "loadingState",
    "dashboard",
    "summaryCards",
    "activeFilters",
    "searchInput",
    "exceptionsOnly",
    "indexedOnly",
    "compareMode",
    "selectedStateControl",
    "compareState",
    "thresholdControl",
    "thresholdInput",
    "resetFilters",
    "exportCsv",
    "exportPng",
    "mapTitle",
    "mapSubtitle",
    "legend",
    "usMap",
    "tooltip",
    "detailPanel",
    "rankCount",
    "rankedLocations",
    "changeCount",
    "changeList",
    "qualityStatus",
    "qualityList",
    "tableScope",
    "tableCount",
    "wageTableBody",
    "emptyTable"
  ]) {
    els[id] = document.getElementById(id);
  }
}

function bindEvents() {
  els.retryLoad.addEventListener("click", loadDashboard);
  els.searchInput.addEventListener("input", (event) => {
    appState.search = event.target.value.trim();
    updateUrlState();
    renderAll();
  });
  els.exceptionsOnly.addEventListener("change", (event) => {
    appState.exceptionsOnly = event.target.checked;
    updateUrlState();
    renderAll();
  });
  els.indexedOnly.addEventListener("change", (event) => {
    appState.indexedOnly = event.target.checked;
    updateUrlState();
    renderAll();
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      appState.view = button.dataset.view;
      updateControls();
      updateUrlState();
      renderAll();
    });
  });
  els.compareMode.addEventListener("change", (event) => {
    appState.compareMode = event.target.value;
    updateControls();
    updateUrlState();
    renderAll();
  });
  els.compareState.addEventListener("change", (event) => {
    appState.compareState = event.target.value;
    updateUrlState();
    renderAll();
  });
  els.thresholdInput.addEventListener("input", (event) => {
    appState.threshold = Number(event.target.value || 15);
    updateUrlState();
    renderAll();
  });
  els.tableScope.addEventListener("change", (event) => {
    appState.tableScope = event.target.value;
    renderTable();
  });
  document.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.sort;
      if (appState.sortKey === key) {
        appState.sortDirection = appState.sortDirection === "asc" ? "desc" : "asc";
      } else {
        appState.sortKey = key;
        appState.sortDirection = key === "name" ? "asc" : "desc";
      }
      renderTable();
    });
  });
  els.resetFilters.addEventListener("click", () => {
    appState.view = "state";
    appState.compareMode = "none";
    appState.search = "";
    appState.exceptionsOnly = false;
    appState.indexedOnly = false;
    appState.threshold = 15;
    appState.tableScope = "all";
    appState.selectedState = null;
    updateControls();
    updateUrlState();
    renderAll();
  });
  els.exportCsv.addEventListener("click", exportCsv);
  els.exportPng.addEventListener("click", exportMapPng);
}

async function loadDashboard() {
  showLoading();
  try {
    const [dataResponse, topologyResponse] = await Promise.all([
      fetch("./data/minimum-wage.json", { cache: "no-store" }),
      fetch("./data/us-states-albers-10m.json", { cache: "force-cache" })
    ]);
    if (!dataResponse.ok) {
      throw new Error(`minimum-wage.json returned ${dataResponse.status}`);
    }
    if (!topologyResponse.ok) {
      throw new Error(`map geometry returned ${topologyResponse.status}`);
    }
    appState.data = await dataResponse.json();
    appState.topology = await topologyResponse.json();
    prepareData();
    appState.features = topologyToFeatures(appState.topology);
    populateStateSelect();
    updateControls();
    els.loadingState.hidden = true;
    els.loadError.hidden = true;
    els.dashboard.hidden = false;
    renderAll();
  } catch (error) {
    els.loadingState.hidden = true;
    els.dashboard.hidden = true;
    els.loadError.hidden = false;
    els.loadErrorText.textContent = `${error.message}. Run the data refresh and build scripts, then reload the dashboard.`;
  }
}

function showLoading() {
  els.loadingState.hidden = false;
  els.dashboard.hidden = true;
  els.loadError.hidden = true;
}

function prepareData() {
  const data = appState.data;
  data.stateByAbbr = Object.fromEntries(data.states.map((state) => [state.abbr, state]));
  data.localsByState = data.locals.reduce((groups, item) => {
    groups[item.stateAbbr] ||= [];
    groups[item.stateAbbr].push(item);
    return groups;
  }, {});
  data.allRows = [
    ...data.states.map((state) => ({
      id: state.id,
      name: state.name,
      state: state.name,
      stateAbbr: state.abbr,
      scope: "state",
      rate: state.rate,
      previousRate: state.previousRate,
      effectiveDate: state.effectiveDate,
      indexed: state.indexed,
      notes: state.notes,
      source: state.source,
      gapFederal: state.gapFederal,
      hasLocalExceptions: state.hasLocalExceptions
    })),
    ...data.locals
  ];
}

function populateStateSelect() {
  els.compareState.innerHTML = "";
  for (const state of appState.data.states) {
    const option = document.createElement("option");
    option.value = state.abbr;
    option.textContent = `${state.name} (${formatMoney(state.rate)})`;
    els.compareState.append(option);
  }
  if (!appState.data.stateByAbbr[appState.compareState]) {
    appState.compareState = "CA";
  }
  els.compareState.value = appState.compareState;
}

function updateControls() {
  els.searchInput.value = appState.search;
  els.exceptionsOnly.checked = appState.exceptionsOnly;
  els.indexedOnly.checked = appState.indexedOnly;
  els.compareMode.value = appState.compareMode;
  els.compareState.value = appState.compareState;
  els.thresholdInput.value = appState.threshold;
  els.tableScope.value = appState.tableScope;
  els.selectedStateControl.hidden = appState.compareMode !== "selected";
  els.thresholdControl.hidden = appState.compareMode !== "threshold";
  document.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === appState.view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderAll() {
  if (!appState.data) {
    return;
  }
  renderHeader();
  renderSummary();
  renderActiveFilters();
  renderMap();
  renderDetail();
  renderInsights();
  renderTable();
}

function renderHeader() {
  const summary = appState.data.summary;
  els.lastUpdated.textContent = formatDateTime(summary.generatedAt);
  els.sourceWorkbook.textContent = `Workbook modified ${formatDateTime(summary.sourceWorkbookModified)}`;
}

function renderSummary() {
  const summary = appState.data.summary;
  const cards = [
    {
      label: "Highest state minimum wage",
      value: formatMoney(summary.highestStateMinimumWage.rate),
      detail: summary.highestStateMinimumWage.name
    },
    {
      label: "Lowest state minimum wage",
      value: formatMoney(summary.lowestStateMinimumWage.rate),
      detail: summary.lowestStateMinimumWage.name
    },
    {
      label: "Highest local minimum wage",
      value: formatMoney(summary.highestLocalMinimumWage?.rate),
      detail: `${summary.highestLocalMinimumWage?.name || "None"} ${summary.highestLocalMinimumWage?.stateAbbr || ""}`
    },
    {
      label: "States above federal",
      value: String(summary.statesAboveFederalMinimumWage),
      detail: `${formatMoney(summary.federalMinimumWage)} federal floor`
    },
    {
      label: "Indexed locations",
      value: String(summary.locationsIndexedToInflation),
      detail: "State and local rows"
    },
    {
      label: "Local exceptions",
      value: String(summary.statesWithLocalExceptions),
      detail: `${summary.localCount} local records`
    }
  ];
  els.summaryCards.innerHTML = cards
    .map(
      (card) => `
        <article class="summary-card">
          <span>${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(card.value)}</strong>
          <small>${escapeHtml(card.detail)}</small>
        </article>`
    )
    .join("");
}

function renderActiveFilters() {
  const selected = appState.selectedState ? appState.data.stateByAbbr[appState.selectedState] : null;
  const viewLabel = appState.view === "local" ? "Local wage view" : "State wage view";
  const compareLabel = {
    none: "Wage amount",
    federal: "Compared with federal",
    average: "Compared with national average",
    selected: `Compared with ${appState.data.stateByAbbr[appState.compareState]?.name || "selected state"}`,
    threshold: `Threshold ${formatMoney(appState.threshold)}`
  }[appState.compareMode];
  const chips = [
    `<span class="active-chip strong-chip">${escapeHtml(viewLabel)}</span>`,
    selected
      ? `<span class="active-chip selected-chip">Selected: ${escapeHtml(selected.name)} (${escapeHtml(selected.abbr)})</span>`
      : `<span class="active-chip">No state selected</span>`,
    `<span class="active-chip">${escapeHtml(compareLabel)}</span>`
  ];
  if (appState.search) {
    chips.push(`<span class="active-chip">Search: ${escapeHtml(appState.search)}</span>`);
  }
  if (appState.exceptionsOnly) {
    chips.push(`<span class="active-chip">Local exceptions only</span>`);
  }
  if (appState.indexedOnly) {
    chips.push(`<span class="active-chip">Indexed only</span>`);
  }
  els.activeFilters.innerHTML = `
    <div>
      <span class="filters-label">Current view</span>
      <div class="active-chip-row">${chips.join("")}</div>
    </div>`;
}

function renderMap() {
  const svg = els.usMap;
  const bbox = appState.topology.bbox;
  svg.setAttribute("viewBox", `${bbox[0]} ${bbox[1]} ${bbox[2] - bbox[0]} ${bbox[3] - bbox[1]}`);
  svg.innerHTML = "";

  const fragment = document.createDocumentFragment();
  for (const feature of appState.features) {
    const abbr = FIPS_TO_ABBR[feature.id];
    const state = appState.data.stateByAbbr[abbr];
    if (!state) {
      continue;
    }
    const visible = statePassesFilters(state);
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", feature.path);
    path.setAttribute("fill", stateFill(state));
    path.setAttribute("tabindex", "0");
    path.setAttribute("role", "button");
    path.setAttribute("aria-label", stateAriaLabel(state));
    path.dataset.abbr = abbr;
    path.classList.add("state-path");
    path.classList.toggle("selected", appState.selectedState === abbr);
    path.classList.toggle("dimmed", !visible);
    path.classList.toggle("local-exception", state.hasLocalExceptions);
    path.addEventListener("pointerenter", (event) => showTooltip(event, state));
    path.addEventListener("pointermove", (event) => moveTooltip(event));
    path.addEventListener("pointerleave", hideTooltip);
    path.addEventListener("focus", (event) => showTooltipForFocus(event.currentTarget, state));
    path.addEventListener("blur", hideTooltip);
    path.addEventListener("click", () => selectState(abbr));
    path.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectState(abbr);
      }
    });
    fragment.append(path);
  }

  const markerLayer = document.createElementNS(SVG_NS, "g");
  markerLayer.setAttribute("aria-hidden", "true");
  for (const feature of appState.features) {
    const abbr = FIPS_TO_ABBR[feature.id];
    const state = appState.data.stateByAbbr[abbr];
    if (!state || !state.hasLocalExceptions || !statePassesFilters(state)) {
      continue;
    }
    const marker = document.createElementNS(SVG_NS, "g");
    marker.classList.add("local-marker");
    marker.setAttribute("transform", `translate(${feature.centroid[0]} ${feature.centroid[1]})`);
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("r", state.localCount > 9 ? "9" : "7");
    const text = document.createElementNS(SVG_NS, "text");
    text.textContent = String(Math.min(state.localCount, 99));
    marker.append(circle, text);
    markerLayer.append(marker);
  }

  svg.append(fragment, markerLayer);
  renderLegend();
  renderMapTitles();
}

function renderMapTitles() {
  const titles = {
    none: appState.view === "local" ? "Highest local minimum wage" : "State minimum wage",
    federal: "Gap above federal minimum wage",
    average: "Gap above national state average",
    selected: `Gap above ${appState.data.stateByAbbr[appState.compareState]?.name || "selected state"}`,
    threshold: `Above or below ${formatMoney(appState.threshold)}`
  };
  els.mapTitle.textContent = titles[appState.compareMode];
  const visible = filteredRows().length;
  els.mapSubtitle.textContent = `${visible} matching records. Local badges show the number of local exceptions in each state.`;
}

function renderLegend() {
  const values = appState.data.states.map((state) => stateMetric(state)).filter((value) => value !== null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const colors = appState.compareMode === "threshold" ? THRESHOLD_COLORS : appState.compareMode === "none" ? WAGE_COLORS : GAP_COLORS;
  const labels = appState.compareMode === "threshold"
    ? [`Below ${formatMoney(appState.threshold)}`, "At threshold", "Above threshold"]
    : [formatMetric(min), formatMetric(max)];
  els.legend.innerHTML = `
    <div class="legend-ramp">
      ${colors.map((color) => `<span style="background:${color}"></span>`).join("")}
    </div>
    <div class="legend-labels">
      <span>${escapeHtml(labels[0])}</span>
      <span>${escapeHtml(labels[labels.length - 1])}</span>
    </div>`;
}

function statePassesFilters(state) {
  if (appState.exceptionsOnly && !state.hasLocalExceptions) {
    return false;
  }
  if (appState.indexedOnly && !state.indexed && !stateLocalRows(state).some((item) => item.indexed)) {
    return false;
  }
  if (!appState.search) {
    return true;
  }
  const query = appState.search.toLowerCase();
  return (
    state.name.toLowerCase().includes(query) ||
    state.abbr.toLowerCase().includes(query) ||
    stateLocalRows(state).some((item) => `${item.name} ${item.scope}`.toLowerCase().includes(query))
  );
}

function stateLocalRows(state) {
  return appState.data.localsByState[state.abbr] || [];
}

function selectedBaseRate(state) {
  if (appState.view === "local") {
    return state.highestLocalRate ?? state.rate;
  }
  return state.rate;
}

function stateMetric(state) {
  const base = selectedBaseRate(state);
  if (base === null || base === undefined) {
    return null;
  }
  if (appState.compareMode === "federal") {
    return roundMoney(base - appState.data.summary.federalMinimumWage);
  }
  if (appState.compareMode === "average") {
    return roundMoney(base - appState.data.summary.nationalAverageStateRate);
  }
  if (appState.compareMode === "selected") {
    const selected = appState.data.stateByAbbr[appState.compareState];
    return selected ? roundMoney(base - selectedBaseRate(selected)) : base;
  }
  return base;
}

function stateFill(state) {
  const value = stateMetric(state);
  if (value === null || value === undefined) {
    return "#e5ebe8";
  }
  if (appState.compareMode === "threshold") {
    const base = selectedBaseRate(state);
    if (base < appState.threshold) {
      return THRESHOLD_COLORS[0];
    }
    if (base === appState.threshold) {
      return THRESHOLD_COLORS[1];
    }
    return THRESHOLD_COLORS[2];
  }
  const values = appState.data.states.map((item) => stateMetric(item)).filter((item) => item !== null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return colorScale(value, min, max, appState.compareMode === "none" ? WAGE_COLORS : GAP_COLORS);
}

function selectState(abbr) {
  appState.selectedState = abbr;
  updateUrlState();
  renderMap();
  renderDetail();
}

function stateAriaLabel(state) {
  const parts = [
    state.name,
    `minimum wage ${formatMoney(state.rate)}`,
    `effective ${formatDate(state.effectiveDate)}`,
    state.indexed ? "indexed to inflation" : "not indexed to inflation"
  ];
  if (state.hasLocalExceptions) {
    parts.push(`${state.localCount} local exceptions`);
  }
  return parts.join(", ");
}

function showTooltip(event, state) {
  appState.hoveredState = state.abbr;
  els.tooltip.innerHTML = tooltipHtml(state);
  els.tooltip.hidden = false;
  moveTooltip(event);
}

function showTooltipForFocus(target, state) {
  const rect = target.getBoundingClientRect();
  els.tooltip.innerHTML = tooltipHtml(state);
  els.tooltip.hidden = false;
  els.tooltip.style.left = `${Math.min(window.innerWidth - 340, rect.left + rect.width / 2)}px`;
  els.tooltip.style.top = `${Math.max(12, rect.top + window.scrollY - 20)}px`;
}

function moveTooltip(event) {
  const x = Math.min(window.innerWidth - 340, event.clientX + 16);
  const y = Math.min(window.innerHeight - 180, event.clientY + 16);
  els.tooltip.style.left = `${Math.max(12, x)}px`;
  els.tooltip.style.top = `${Math.max(12, y)}px`;
}

function hideTooltip() {
  appState.hoveredState = null;
  els.tooltip.hidden = true;
}

function tooltipHtml(state) {
  const localRows = stateLocalRows(state);
  const localSummary = localRows.length
    ? `${localRows.length}; highest ${formatMoney(state.highestLocalRate)}`
    : "None listed";
  return `
    <strong>${escapeHtml(state.name)}</strong>
    <dl>
      <dt>State wage</dt><dd>${formatMoney(state.rate)}</dd>
      <dt>Effective</dt><dd>${escapeHtml(formatDate(state.effectiveDate))}</dd>
      <dt>Indexed</dt><dd>${state.indexed ? "Yes" : "No"}</dd>
      <dt>Local exceptions</dt><dd>${escapeHtml(localSummary)}</dd>
      <dt>Source</dt><dd>${escapeHtml(sourceLabel(state))}</dd>
    </dl>`;
}

function renderDetail() {
  const state = appState.selectedState ? appState.data.stateByAbbr[appState.selectedState] : null;
  if (!state) {
    els.detailPanel.innerHTML = `
      <div class="empty-detail">
        <span class="panel-kicker">State detail</span>
        <h2>Select a state</h2>
        <p>Hover for a quick read. Click or press Enter on a state for details, local exceptions, and source notes.</p>
      </div>`;
    return;
  }
  const localRows = stateLocalRows(state).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
  els.detailPanel.innerHTML = `
    <div class="detail-heading">
      <div>
        <span class="panel-kicker">Selected market</span>
        <h2>${escapeHtml(state.name)}</h2>
        <span class="pill">${escapeHtml(state.abbr)}</span>
      </div>
      <span class="pill ${state.hasLocalExceptions ? "warn" : ""}">${state.localCount} local</span>
    </div>
    <div class="wage-hero">
      <span>State minimum wage</span>
      <strong>${formatMoney(state.rate)}</strong>
      <small>${state.changeFromPreviousRate === null ? "" : `${formatSignedMoney(state.changeFromPreviousRate)} since previous workbook rate`}</small>
    </div>
    ${
      appState.view === "local"
        ? `<div class="wage-hero local-wage-hero">
            <span>Highest local wage in ${escapeHtml(state.abbr)}</span>
            <strong>${formatMoney(state.highestLocalRate ?? state.rate)}</strong>
            <small>${state.localCount ? `${state.localCount} local exceptions listed` : "No local exceptions listed"}</small>
          </div>`
        : ""
    }
    <dl>
      <dt>Effective date</dt><dd>${escapeHtml(formatDate(state.effectiveDate))}</dd>
      <dt>Federal gap</dt><dd>${formatSignedMoney(state.gapFederal)}</dd>
      <dt>Indexed</dt><dd>${state.indexed ? "Yes" : "No"}</dd>
      <dt>Source</dt><dd>${sourceLink(state)}</dd>
      <dt>Source update</dt><dd>${escapeHtml(state.sourceUpdated || "Not listed")}</dd>
    </dl>
    ${state.indexing ? `<div class="notes-box"><strong>Indexing</strong><br>${escapeHtml(state.indexing)}</div>` : ""}
    ${state.notes ? `<div class="notes-box"><strong>Notes</strong><br>${escapeHtml(state.notes)}</div>` : ""}
    <h2 style="margin-top:18px">Local Exceptions</h2>
    <div class="local-list">
      ${
        localRows.length
          ? localRows
              .map(
                (item) => `
          <div class="local-item">
            <strong>${escapeHtml(item.name)} <span class="pill">${escapeHtml(item.scope)}</span></strong>
            <small>${formatMoney(item.rate)} effective ${escapeHtml(formatDate(item.effectiveDate))}; ${item.indexed ? "indexed" : "not indexed"}</small>
            ${item.notes ? `<div class="notes-box">${escapeHtml(item.notes)}</div>` : ""}
          </div>`
              )
              .join("")
          : `<div class="empty-state">No local exceptions listed for ${escapeHtml(state.name)}.</div>`
      }
    </div>`;
}

function renderInsights() {
  const rows = filteredRows();
  const ranked = [...rows].filter((item) => item.rate !== null && item.rate !== undefined).sort((a, b) => b.rate - a.rate);
  const high = ranked.slice(0, 5);
  const low = ranked.slice(-5).reverse();
  els.rankCount.textContent = `${ranked.length} rows`;
  els.rankedLocations.innerHTML = [
    `<h3>Highest</h3>`,
    ...high.map(rankItemHtml),
    `<h3>Lowest</h3>`,
    ...low.map(rankItemHtml)
  ].join("");

  const changes = appState.data.changes;
  const changeItems = changes.items || [];
  els.changeCount.textContent = changes.available ? String(changeItems.length) : "New baseline";
  els.changeList.innerHTML = changes.available
    ? changeItems.length
      ? changeItems.slice(0, 8).map(changeItemHtml).join("")
      : `<div class="empty-state">No differences from the prior generated data file.</div>`
    : `<div class="empty-state">A previous data file will be kept after the next refresh.</div>`;

  const quality = appState.data.quality;
  const issueCount = quality.missingFields.length + quality.suspiciousValues.length + quality.duplicatesResolved.length + quality.warnings.length;
  els.qualityStatus.textContent = issueCount ? `${issueCount} signals` : "OK";
  els.qualityStatus.classList.toggle("warn", issueCount > 0);
  els.qualityList.innerHTML = qualityHtml(quality);
}

function rankItemHtml(item) {
  return `
    <div class="rank-item">
      <strong>${escapeHtml(item.name)} ${item.stateAbbr ? `<span class="pill">${escapeHtml(item.stateAbbr)}</span>` : ""}</strong>
      <small>${formatMoney(item.rate)}; effective ${escapeHtml(formatDate(item.effectiveDate))}</small>
    </div>`;
}

function changeItemHtml(item) {
  return `
    <div class="change-item">
      <strong>${escapeHtml(item.name || item.id)} <span class="pill">${escapeHtml(item.type)}</span></strong>
      <small>${formatMoney(item.previousRate)} to ${formatMoney(item.currentRate)}${item.rateChange ? ` (${formatSignedMoney(item.rateChange)})` : ""}</small>
    </div>`;
}

function qualityHtml(quality) {
  const items = [];
  for (const item of quality.missingFields.slice(0, 6)) {
    items.push(`<div class="quality-item"><strong>${escapeHtml(item.location)}</strong><small>Missing ${escapeHtml(item.field)}</small></div>`);
  }
  for (const item of quality.duplicatesResolved.slice(0, 4)) {
    items.push(`<div class="quality-item"><strong>${escapeHtml(item.location)}</strong><small>Duplicate rows resolved; using ${formatMoney(item.chosenRate)}</small></div>`);
  }
  for (const item of quality.suspiciousValues.slice(0, 4)) {
    items.push(`<div class="quality-item"><strong>${escapeHtml(item.location)}</strong><small>${escapeHtml(item.reason)}</small></div>`);
  }
  for (const warning of quality.warnings.slice(0, 4)) {
    items.push(`<div class="quality-item"><strong>Import warning</strong><small>${escapeHtml(warning)}</small></div>`);
  }
  return items.length ? items.join("") : `<div class="empty-state">No data-quality signals in the generated file.</div>`;
}

function renderTable() {
  const rows = filteredRows().filter((row) => {
    if (appState.tableScope === "states") {
      return row.scope === "state";
    }
    if (appState.tableScope === "locals") {
      return row.scope !== "state";
    }
    return true;
  });
  rows.sort(tableSort);
  els.tableCount.textContent = `${rows.length} rows match the current filters`;
  els.emptyTable.hidden = rows.length > 0;
  els.wageTableBody.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td><strong>${escapeHtml(row.name)}</strong></td>
        <td>${escapeHtml(row.stateAbbr || "")}</td>
        <td>${escapeHtml(row.scope)}</td>
        <td class="number">${formatMoney(row.rate)}</td>
        <td class="number">${formatSignedMoney(row.gapFederal)}</td>
        <td>${escapeHtml(formatDate(row.effectiveDate))}</td>
        <td>${row.indexed ? "Yes" : "No"}</td>
      </tr>`
    )
    .join("");
}

function filteredRows() {
  const query = appState.search.toLowerCase();
  return appState.data.allRows.filter((row) => {
    const parentState = appState.data.stateByAbbr[row.stateAbbr || row.abbr];
    if (appState.exceptionsOnly && !(row.hasLocalExceptions || row.scope !== "state" || parentState?.hasLocalExceptions)) {
      return false;
    }
    if (appState.indexedOnly && !row.indexed) {
      return false;
    }
    if (!query) {
      return true;
    }
    return `${row.name} ${row.state} ${row.stateAbbr} ${row.scope} ${row.notes || ""}`.toLowerCase().includes(query);
  });
}

function tableSort(a, b) {
  const direction = appState.sortDirection === "asc" ? 1 : -1;
  const av = a[appState.sortKey];
  const bv = b[appState.sortKey];
  if (typeof av === "number" || typeof bv === "number") {
    return ((av ?? -Infinity) - (bv ?? -Infinity)) * direction;
  }
  return String(av ?? "").localeCompare(String(bv ?? "")) * direction;
}

function exportCsv() {
  const rows = filteredRows();
  const headers = ["Location", "State", "Scope", "Wage", "Previous Wage", "Federal Gap", "Effective Date", "Indexed", "Source", "Notes"];
  const lines = [
    headers,
    ...rows.map((row) => [
      row.name,
      row.stateAbbr,
      row.scope,
      row.rate,
      row.previousRate,
      row.gapFederal,
      row.effectiveDate,
      row.indexed ? "Yes" : "No",
      row.source,
      row.notes
    ])
  ];
  const csv = lines.map((line) => line.map(csvCell).join(",")).join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "minimum-wage-filtered.csv");
}

function exportMapPng() {
  const svgText = new XMLSerializer().serializeToString(els.usMap);
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 960;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((png) => {
      if (png) {
        downloadBlob(png, "minimum-wage-map.png");
      }
    });
  };
  image.src = url;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function topologyToFeatures(topology) {
  const transform = topology.transform;
  const arcs = topology.arcs.map((arc) => transformArc(arc, transform));
  return topology.objects.states.geometries.map((geometry) => geometryToFeature(geometry, arcs));
}

function transformArc(arc, transform) {
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [
      x * transform.scale[0] + transform.translate[0],
      y * transform.scale[1] + transform.translate[1]
    ];
  });
}

function geometryToFeature(geometry, arcs) {
  const rings = [];
  if (geometry.type === "Polygon") {
    for (const ring of geometry.arcs) {
      rings.push(stitchRing(ring, arcs));
    }
  } else if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.arcs) {
      for (const ring of polygon) {
        rings.push(stitchRing(ring, arcs));
      }
    }
  }
  const points = rings.flat();
  const centroid = bboxCenter(points);
  return {
    id: geometry.id,
    name: geometry.properties?.name,
    path: rings.map(ringToPath).join(" "),
    centroid
  };
}

function stitchRing(indexes, arcs) {
  const points = [];
  indexes.forEach((index, position) => {
    const arc = index < 0 ? [...arcs[~index]].reverse() : arcs[index];
    points.push(...(position === 0 ? arc : arc.slice(1)));
  });
  return points;
}

function ringToPath(ring) {
  if (!ring.length) {
    return "";
  }
  const [first, ...rest] = ring;
  return `M${first[0]},${first[1]}${rest.map((point) => `L${point[0]},${point[1]}`).join("")}Z`;
}

function bboxCenter(points) {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  return [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2
  ];
}

function colorScale(value, min, max, colors) {
  if (max <= min) {
    return colors[Math.floor(colors.length / 2)];
  }
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const scaled = t * (colors.length - 1);
  const lower = Math.floor(scaled);
  const upper = Math.min(colors.length - 1, lower + 1);
  const localT = scaled - lower;
  return mix(colors[lower], colors[upper], localT);
}

function mix(a, b, t) {
  const ar = hexToRgb(a);
  const br = hexToRgb(b);
  return `rgb(${Math.round(ar[0] + (br[0] - ar[0]) * t)}, ${Math.round(ar[1] + (br[1] - ar[1]) * t)}, ${Math.round(ar[2] + (br[2] - ar[2]) * t)})`;
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16)
  ];
}

function sourceLabel(item) {
  if (!item.source) {
    return "Not listed";
  }
  if (item.source.includes("epi.org")) {
    return "EPI Minimum Wage Tracker";
  }
  if (item.source.includes("oregon.gov")) {
    return "Oregon BOLI";
  }
  return item.authority || "Source";
}

function sourceLink(item) {
  if (!item.source) {
    return "Not listed";
  }
  return `<a href="${escapeAttribute(item.source)}" target="_blank" rel="noreferrer">${escapeHtml(sourceLabel(item))}</a>`;
}

function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Not listed";
  }
  return `$${Number(value).toFixed(2)}`;
}

function formatSignedMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Not listed";
  }
  const number = Number(value);
  return `${number >= 0 ? "+" : "-"}$${Math.abs(number).toFixed(2)}`;
}

function formatMetric(value) {
  if (appState.compareMode === "none" || appState.compareMode === "threshold") {
    return formatMoney(value);
  }
  return formatSignedMoney(value);
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function formatDate(value) {
  if (!value) {
    return "Not listed";
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatDateTime(value) {
  if (!value) {
    return "Not listed";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function loadUrlState() {
  const params = new URLSearchParams(window.location.search);
  appState.view = params.get("view") || appState.view;
  appState.compareMode = params.get("compare") || appState.compareMode;
  appState.compareState = params.get("compareState") || appState.compareState;
  appState.search = params.get("q") || "";
  appState.selectedState = params.get("state") || null;
  appState.exceptionsOnly = params.get("exceptions") === "1";
  appState.indexedOnly = params.get("indexed") === "1";
  appState.threshold = Number(params.get("threshold") || appState.threshold);
}

function updateUrlState() {
  const params = new URLSearchParams();
  if (appState.view !== "state") {
    params.set("view", appState.view);
  }
  if (appState.compareMode !== "none") {
    params.set("compare", appState.compareMode);
  }
  if (appState.compareMode === "selected") {
    params.set("compareState", appState.compareState);
  }
  if (appState.compareMode === "threshold") {
    params.set("threshold", String(appState.threshold));
  }
  if (appState.search) {
    params.set("q", appState.search);
  }
  if (appState.selectedState) {
    params.set("state", appState.selectedState);
  }
  if (appState.exceptionsOnly) {
    params.set("exceptions", "1");
  }
  if (appState.indexedOnly) {
    params.set("indexed", "1");
  }
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.replaceState({}, "", nextUrl);
}
