'use strict';

// ─── STATE ─────────────────────────────────────────────
const STATE = {
  totalSpots: 40,
  spots: [],
  activities: [],
  page: 'dashboard',
  chartMode: 'today',
  scanInterval: 5000,
  lastScan: Date.now(),
  imgsProcessed: 0,
  loadedMedia: null,   // { type:'image'|'video', file, url, el }
  lastResult: null,    // last detection result
  showAnnotated: true,
};

// ─── DOM HELPERS ───────────────────────────────────────
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ─── SPOT INIT ─────────────────────────────────────────
function initSpots() {
  const initial = [
    'occupied','free','free','occupied','occupied','free','occupied','free','free','occupied',
    'free','occupied','occupied','free','free','occupied','free','occupied','free','free',
    'occupied','free','occupied','occupied','free','free','occupied','free','occupied','free',
    'free','occupied','free','free','occupied','occupied','free','occupied','free','free',
  ];
  STATE.spots = initial.map((s, i) => ({ id: i + 1, state: s }));
}

// ─── NAVIGATION ────────────────────────────────────────
function initNav() {
  $$('.nav-item').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchPage(link.dataset.page);
    });
  });
  $('#sidebar-toggle').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
  });
}

function switchPage(page) {
  STATE.page = page;
  $$('.nav-item').forEach(l => l.classList.toggle('active', l.dataset.page === page));
  $$('.page').forEach(p => p.classList.toggle('active', p.id === `page-${page}`));

  const titles = {
    dashboard: ['Dashboard',        'Monitoramento em tempo real'],
    analysis:  ['Análise de Mídia', 'Upload de imagens e vídeos para detecção'],
    map:       ['Mapa Completo',    'Visualização do complexo'],
    history:   ['Histórico',        'Log de análises realizadas'],
    settings:  ['Configurações',    'Parâmetros do sistema'],
  };
  const [h, sub] = titles[page] || ['Dashboard', ''];
  $('#page-heading').textContent = h;
  $('.page-subtitle').textContent = sub;

  if (page === 'map')     initMapPage();
  if (page === 'history') initHistoryPage();
  if (page === 'dashboard') setTimeout(() => renderBarChart(STATE.chartMode), 80);
}

// ─── DATETIME ──────────────────────────────────────────
function updateDatetime() {
  const now = new Date();
  const time = now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const date = now.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
  const el = $('#datetime-display');
  if (el) el.textContent = `${date} · ${time}`;
}

// ─── KPI ───────────────────────────────────────────────
function updateKPIs() {
  const free = STATE.spots.filter(s => s.state === 'free').length;
  const occ  = STATE.spots.filter(s => s.state === 'occupied').length;
  const total = STATE.totalSpots;
  animateCount('#kpi-free', free);
  animateCount('#kpi-occ',  occ);
  $('#kpi-free-pct').textContent = `${Math.round(free/total*100)}%`;
  $('#kpi-occ-pct').textContent  = `${Math.round(occ/total*100)}%`;
  const ip = $('#imgs-processed');
  if (ip) ip.textContent = STATE.imgsProcessed;
  updateRingChart(free, occ);
  $('#ring-pct').textContent     = `${Math.round(occ/total*100)}%`;
  $('#ring-occ-num').textContent = occ;
  $('#ring-free-num').textContent= free;
}

function animateCount(sel, target) {
  const el = $(sel); if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const diff = target - start; if (diff === 0) return;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    el.textContent = Math.round(start + diff * step / 20);
    if (step >= 20) clearInterval(timer);
  }, 16);
}

// ─── RING CHART ────────────────────────────────────────
function updateRingChart(free, occ) {
  const total = STATE.totalSpots;
  const r = 50, circ = 2 * Math.PI * r;
  const occPct = occ / total, freePct = free / total;
  const ro = $('#ring-occ'), rf = $('#ring-free');
  ro.style.strokeDasharray  = `${circ*occPct} ${circ*(1-occPct)}`;
  ro.style.strokeDashoffset = '0';
  rf.style.strokeDasharray  = `${circ*freePct} ${circ*(1-freePct)}`;
  rf.style.strokeDashoffset = `${circ - circ*occPct}`;
}

// ─── PARKING GRID ──────────────────────────────────────
function renderParkingGrid() {
  const grid = $('#parking-grid'); if (!grid) return;
  grid.innerHTML = '';
  STATE.spots.forEach(spot => {
    const el = document.createElement('div');
    el.className = `spot ${spot.state}`;
    el.setAttribute('role','gridcell');
    el.dataset.spotId = spot.id;
    el.innerHTML = `<div class="spot-icon">${spot.state==='free'?'🟢':spot.state==='occupied'?'🔴':'🟡'}</div><div class="spot-label">${spot.id}</div>`;
    el.addEventListener('click', () => toggleSpot(spot.id));
    grid.appendChild(el);
  });
}

function toggleSpot(id) {
  const spot = STATE.spots.find(s => s.id === id); if (!spot) return;
  const old = spot.state;
  spot.state = old === 'free' ? 'occupied' : 'free';
  renderParkingGrid(); updateKPIs();
  addActivity(`Vaga ${spot.id}`, spot.state==='occupied' ? 'marcada como ocupada' : 'marcada como livre', spot.state==='occupied'?'red':'green');
}

// ─── ACTIVITY ──────────────────────────────────────────
function addActivity(label, desc, color) {
  const now = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  STATE.activities.unshift({ label, desc, color, time: now });
  if (STATE.activities.length > 20) STATE.activities.pop();
  renderActivityList();
}

function renderActivityList() {
  const list = $('#activity-list'); if (!list) return;
  list.innerHTML = '';
  STATE.activities.slice(0, 8).forEach(a => {
    const li = document.createElement('li');
    li.className = 'activity-item';
    li.innerHTML = `
      <div class="act-dot ${a.color}"></div>
      <div class="act-body">
        <span class="act-spot">${a.label}</span>
        <span class="act-desc"> · ${a.desc}</span>
      </div>
      <span class="act-time">${a.time}</span>`;
    list.appendChild(li);
  });
}

// ─── BAR CHART ─────────────────────────────────────────
function renderBarChart(mode = 'today') {
  const canvas = $('#bar-chart'); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;
  const labels = mode==='today'
    ? ['06h','07h','08h','09h','10h','11h','12h','13h','14h','15h','16h','17h','18h','19h','20h','21h','22h']
    : ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const data = mode==='today'
    ? [5,12,28,60,75,82,78,65,70,80,85,88,72,55,40,25,10]
    : [72,68,80,75,85,55,30];
  ctx.clearRect(0,0,W,H);
  const pad={top:10,right:10,bottom:28,left:36};
  const chartW=W-pad.left-pad.right, chartH=H-pad.top-pad.bottom;
  const barW=(chartW/labels.length)*0.55, barGap=chartW/labels.length;
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
  [0,25,50,75,100].forEach(pct => {
    const y=pad.top+chartH*(1-pct/100);
    ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(W-pad.right,y); ctx.stroke();
    ctx.fillStyle='rgba(122,138,168,0.6)'; ctx.font='10px Inter'; ctx.textAlign='right';
    ctx.fillText(`${pct}%`,pad.left-4,y+4);
  });
  data.forEach((val,i)=>{
    const x=pad.left+i*barGap+(barGap-barW)/2;
    const barH=(val/100)*chartH, y=pad.top+chartH-barH;
    const grad=ctx.createLinearGradient(0,y,0,y+barH);
    if(val>80){grad.addColorStop(0,'rgba(247,95,111,0.9)');grad.addColorStop(1,'rgba(247,95,111,0.2)');}
    else if(val>50){grad.addColorStop(0,'rgba(247,179,79,0.9)');grad.addColorStop(1,'rgba(247,179,79,0.2)');}
    else{grad.addColorStop(0,'rgba(79,142,247,0.9)');grad.addColorStop(1,'rgba(79,142,247,0.2)');}
    ctx.fillStyle=grad;
    ctx.beginPath(); ctx.roundRect(x,y,barW,barH,[4,4,0,0]); ctx.fill();
    ctx.fillStyle='rgba(122,138,168,0.8)'; ctx.font='10px Inter'; ctx.textAlign='center';
    ctx.fillText(labels[i],x+barW/2,H-6);
  });
}

// ─── VIEW TOGGLE (Grid / Image) ────────────────────────
function initViewToggle() {
  $('#view-grid').addEventListener('click', () => {
    $('#lot-grid-view').classList.remove('hidden');
    $('#lot-image-view').classList.add('hidden');
    $('#view-grid').classList.add('active');
    $('#view-img').classList.remove('active');
  });

  $('#view-img').addEventListener('click', () => {
    $('#lot-image-view').classList.remove('hidden');
    $('#lot-grid-view').classList.add('hidden');
    $('#view-img').classList.add('active');
    $('#view-grid').classList.remove('active');

    if (STATE.lastResult) {
      drawDashResult(STATE.lastResult);
      $('#img-no-file').classList.add('hidden');
    } else {
      $('#img-no-file').classList.remove('hidden');
    }
  });
}

function drawDashResult(result) {
  const canvas = $('#dash-img-canvas');
  if (!canvas || !result) return;
  const ctx = canvas.getContext('2d');
  const img = result.imageEl;
  canvas.width  = img.naturalWidth  || 640;
  canvas.height = img.naturalHeight || 360;
  ctx.drawImage(img, 0, 0);
  const scaleX = canvas.width  / result.origW;
  const scaleY = canvas.height / result.origH;
  result.detections.forEach(d => {
    ctx.strokeStyle = d.state === 'free' ? '#36e09a' : '#f75f6f';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(d.x*scaleX, d.y*scaleY, d.w*scaleX, d.h*scaleY);
    ctx.fillStyle = d.state === 'free' ? 'rgba(54,224,154,0.12)' : 'rgba(247,95,111,0.12)';
    ctx.fillRect(d.x*scaleX, d.y*scaleY, d.w*scaleX, d.h*scaleY);
    ctx.fillStyle = d.state === 'free' ? '#36e09a' : '#f75f6f';
    ctx.font = 'bold 11px JetBrains Mono,monospace';
    ctx.fillText(`${d.state === 'free' ? 'LIVRE' : 'OCUPADO'} ${(d.conf*100).toFixed(0)}%`, d.x*scaleX+4, d.y*scaleY-4);
  });
  const el = $('#dash-last-scan');
  if (el) el.textContent = new Date().toLocaleTimeString('pt-BR');
}

// ─── UPLOAD / ANALYSIS PAGE ────────────────────────────
function initAnalysisPage() {
  const dropZone  = $('#drop-zone');
  const fileInput = $('#file-input');

  // Click to open file dialog
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' ') fileInput.click(); });

  // Drag & drop
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragging'); });
  dropZone.addEventListener('dragleave',() => dropZone.classList.remove('dragging'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('dragging');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  $('#btn-clear-media').addEventListener('click', clearMedia);
  $('#btn-analyze').addEventListener('click', runAnalysis);

  // Result view toggle
  $('#toggle-original').addEventListener('click', () => {
    $('#toggle-original').classList.add('active');
    $('#toggle-annotated').classList.remove('active');
    if (STATE.lastResult) drawResultOriginal(STATE.lastResult);
  });
  $('#toggle-annotated').addEventListener('click', () => {
    $('#toggle-annotated').classList.add('active');
    $('#toggle-original').classList.remove('active');
    if (STATE.lastResult) drawResultAnnotated(STATE.lastResult);
  });

  // Save result
  $('#btn-save-result').addEventListener('click', () => {
    const canvas = $('#result-canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `parkvision_resultado_${Date.now()}.png`;
    a.click();
    showToast('Imagem salva com sucesso!', 'success', '✓');
  });

  // Video frame scrubber
  const scrubber = $('#frame-scrubber');
  if (scrubber) {
    scrubber.addEventListener('input', () => {
      if (!STATE.loadedMedia || STATE.loadedMedia.type !== 'video') return;
      const vid = STATE.loadedMedia.el;
      vid.currentTime = (scrubber.value / 100) * vid.duration;
      const mm = String(Math.floor(vid.currentTime/60)).padStart(2,'0');
      const ss = String(Math.floor(vid.currentTime%60)).padStart(2,'0');
      $('#frame-time-label').textContent = `${mm}:${ss}`;
    });
  }

  $('#btn-capture-frame').addEventListener('click', () => {
    if (!STATE.loadedMedia || STATE.loadedMedia.type !== 'video') return;
    captureVideoFrame(STATE.loadedMedia.el);
  });

  $('#btn-prev-frame').addEventListener('click', () => seekFrame(-1/30));
  $('#btn-next-frame').addEventListener('click', () => seekFrame(1/30));
}

function seekFrame(delta) {
  if (!STATE.loadedMedia || STATE.loadedMedia.type !== 'video') return;
  const vid = STATE.loadedMedia.el;
  vid.currentTime = Math.max(0, Math.min(vid.duration, vid.currentTime + delta));
}

function handleFile(file) {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  if (!isImage && !isVideo) { showToast('Formato não suportado. Use imagens ou vídeos.', 'warning', '⚠'); return; }

  const url = URL.createObjectURL(file);
  STATE.loadedMedia = { type: isImage ? 'image' : 'video', file, url, el: null };

  // Show preview
  const previewWrap = $('#preview-wrap');
  previewWrap.innerHTML = '';

  let el;
  if (isImage) {
    el = document.createElement('img');
    el.src = url;
    el.alt = file.name;
    $('#frame-card').classList.add('hidden');
    $('#media-type-badge').textContent = '🖼 Imagem';
  } else {
    el = document.createElement('video');
    el.src = url; el.controls = true; el.muted = true;
    el.addEventListener('loadedmetadata', () => {
      $('#frame-card').classList.remove('hidden');
      const dur = el.duration;
      const mm = String(Math.floor(dur/60)).padStart(2,'0');
      const ss = String(Math.floor(dur%60)).padStart(2,'0');
      $('#preview-meta').textContent += `  ·  Duração: ${mm}:${ss}`;
    });
    $('#media-type-badge').textContent = '🎬 Vídeo';
  }

  STATE.loadedMedia.el = el;
  previewWrap.appendChild(el);

  const kb = (file.size/1024).toFixed(1);
  const mb = (file.size/1024/1024).toFixed(2);
  $('#preview-filename').textContent = file.name;
  $('#preview-meta').textContent = `${file.type}  ·  ${kb > 1024 ? mb+' MB' : kb+' KB'}`;

  $('#drop-zone').classList.add('hidden');
  $('#media-preview').classList.remove('hidden');

  // Reset result area
  showEmptyResult();
}

function clearMedia() {
  if (STATE.loadedMedia?.url) URL.revokeObjectURL(STATE.loadedMedia.url);
  STATE.loadedMedia = null;
  $('#media-preview').classList.add('hidden');
  $('#drop-zone').classList.remove('hidden');
  $('#frame-card').classList.add('hidden');
  $('#media-type-badge').textContent = 'Imagem / Vídeo';
  $('#file-input').value = '';
  showEmptyResult();
}

function showEmptyResult() {
  $('#result-empty').classList.remove('hidden');
  $('#result-processing').classList.add('hidden');
  $('#result-canvas-wrap').classList.add('hidden');
  $('#detection-summary').classList.add('hidden');
  $('#result-actions').style.display = 'none';
}

// ─── ANALYSIS SIMULATION ──────────────────────────────
async function runAnalysis() {
  if (!STATE.loadedMedia) return;
  const isVideo = STATE.loadedMedia.type === 'video';

  // Show processing
  $('#result-empty').classList.add('hidden');
  $('#result-canvas-wrap').classList.add('hidden');
  $('#detection-summary').classList.add('hidden');
  $('#result-actions').style.display = 'none';
  $('#result-processing').classList.remove('hidden');

  // Steps
  const stepsEl = $('#processing-steps');
  const steps = isVideo
    ? ['Extraindo frame selecionado...', 'Pré-processando imagem...', 'Executando modelo YOLO...', 'Pós-processando detecções...', 'Gerando mapa de vagas...']
    : ['Carregando imagem...', 'Pré-processando...', 'Executando modelo YOLO...', 'Pós-processando detecções...', 'Gerando mapa de vagas...'];

  stepsEl.innerHTML = '';
  const stepEls = steps.map(s => {
    const d = document.createElement('div');
    d.className = 'proc-step';
    d.innerHTML = `<span style="font-size:16px">○</span> ${s}`;
    stepsEl.appendChild(d);
    return d;
  });

  // Animate steps
  for (let i = 0; i < stepEls.length; i++) {
    stepEls[i].className = 'proc-step active';
    stepEls[i].querySelector('span').textContent = '◉';
    $('#processing-label').textContent = steps[i];
    await sleep(380 + Math.random() * 200);
    stepEls[i].className = 'proc-step done';
    stepEls[i].querySelector('span').textContent = '✓';
  }

  await sleep(200);

  // Build result
  let sourceEl;
  if (isVideo) {
    sourceEl = await captureFrameToImg(STATE.loadedMedia.el);
  } else {
    sourceEl = STATE.loadedMedia.el;
    await new Promise(r => { if(sourceEl.complete) r(); else sourceEl.addEventListener('load', r); });
  }

  const result = buildDetectionResult(sourceEl);
  STATE.lastResult = result;
  STATE.imgsProcessed++;

  // Apply result to spots
  applyDetectionToSpots(result.detections);

  // Show result canvas
  $('#result-processing').classList.add('hidden');
  $('#result-canvas-wrap').classList.remove('hidden');
  $('#detection-summary').classList.remove('hidden');
  $('#result-actions').style.display = 'flex';

  drawResultAnnotated(result);
  showDetectionSummary(result);
  updateKPIs();

  // Log to activity & history
  const freeCount = result.detections.filter(d=>d.state==='free').length;
  const occCount  = result.detections.filter(d=>d.state==='occupied').length;
  addActivity(
    STATE.loadedMedia.file.name.substring(0, 20),
    `→ ${freeCount} livres, ${occCount} ocupadas`,
    'blue'
  );
  appendHistoryRow(STATE.loadedMedia.file, freeCount, occCount, result.avgConf);

  // Also update dashboard image view
  if ($('#lot-image-view') && !$('#lot-image-view').classList.contains('hidden')) {
    drawDashResult(result);
    $('#img-no-file').classList.add('hidden');
  }

  showToast(`Análise concluída! ${freeCount} livres · ${occCount} ocupadas`, 'success', '🔍');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function captureFrameToImg(videoEl) {
  const c = document.createElement('canvas');
  c.width = videoEl.videoWidth || 640;
  c.height = videoEl.videoHeight || 360;
  c.getContext('2d').drawImage(videoEl, 0, 0);
  const img = new Image();
  img.src = c.toDataURL();
  await new Promise(r => img.addEventListener('load', r));
  return img;
}

function captureVideoFrame(videoEl) {
  captureFrameToImg(videoEl).then(img => {
    const previewWrap = $('#preview-wrap');
    previewWrap.innerHTML = '';
    previewWrap.appendChild(img);
    img.style.width = '100%';
    STATE.loadedMedia.type = 'image';
    STATE.loadedMedia.el   = img;
    $('#frame-card').classList.add('hidden');
    showToast('Frame capturado! Clique em Analisar com IA.', 'info', '📸');
  });
}

// ─── SIMULATED DETECTION ──────────────────────────────
function buildDetectionResult(imgEl) {
  const W = imgEl.naturalWidth  || imgEl.width  || 640;
  const H = imgEl.naturalHeight || imgEl.height || 360;

  // Simulate a grid of parking spots over the image
  const cols = 5, rows = 4;
  const marginX = W * 0.08, marginY = H * 0.10;
  const spotW = (W - marginX * 2) / cols;
  const spotH = (H - marginY * 2) / rows;
  const detections = [];
  const totalSpots = cols * rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const state = STATE.spots[idx]?.state === 'occupied' ? 'occupied' : 'free';
      const conf  = 0.80 + Math.random() * 0.19;
      detections.push({
        id:    idx + 1,
        state,
        conf,
        x: marginX + c * spotW + spotW * 0.05,
        y: marginY + r * spotH + spotH * 0.05,
        w: spotW * 0.90,
        h: spotH * 0.85,
      });
    }
  }

  const avgConf = detections.reduce((a,d) => a+d.conf, 0) / detections.length;

  return { imageEl: imgEl, origW: W, origH: H, detections, avgConf };
}

function applyDetectionToSpots(detections) {
  detections.forEach(d => {
    const spot = STATE.spots[d.id - 1];
    if (spot) spot.state = d.state;
  });
  renderParkingGrid();
}

// ─── DRAW ON RESULT CANVAS ─────────────────────────────
function drawResultAnnotated(result) {
  const canvas = $('#result-canvas'); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const img = result.imageEl;
  canvas.width  = img.naturalWidth  || 640;
  canvas.height = img.naturalHeight || 360;

  ctx.drawImage(img, 0, 0);

  result.detections.forEach(d => {
    const x=d.x, y=d.y, w=d.w, h=d.h;
    const color = d.state==='free' ? '#36e09a' : '#f75f6f';
    const bgColor = d.state==='free' ? 'rgba(54,224,154,0.12)' : 'rgba(247,95,111,0.12)';

    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5;
    ctx.strokeRect(x, y, w, h);

    // Label background
    const label = `${d.state==='free'?'LIVRE':'OCUPADO'} ${(d.conf*100).toFixed(0)}%`;
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(x, y-18, tw+8, 16);

    ctx.fillStyle = color;
    ctx.fillText(label, x+4, y-5);
  });
}

function drawResultOriginal(result) {
  const canvas = $('#result-canvas'); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const img = result.imageEl;
  canvas.width  = img.naturalWidth  || 640;
  canvas.height = img.naturalHeight || 360;
  ctx.drawImage(img, 0, 0);
}

// ─── DETECTION SUMMARY ─────────────────────────────────
function showDetectionSummary(result) {
  const free = result.detections.filter(d=>d.state==='free').length;
  const occ  = result.detections.filter(d=>d.state==='occupied').length;
  $('#det-free').textContent  = free;
  $('#det-occ').textContent   = occ;
  $('#det-total').textContent = result.detections.length;
  $('#det-conf').textContent  = `${(result.avgConf*100).toFixed(1)}%`;
  $('#detection-timestamp').textContent = new Date().toLocaleString('pt-BR');

  const tbody = $('#det-list-body');
  tbody.innerHTML = '';
  result.detections.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.id}</td>
      <td><span class="status-pill ${d.state}">${d.state==='free'?'Livre':'Ocupada'}</span></td>
      <td style="color:${d.conf>0.9?'var(--accent-green)':'var(--accent-amber)'}">${(d.conf*100).toFixed(1)}%</td>
      <td>${Math.round(d.x)}, ${Math.round(d.y)}</td>`;
    tbody.appendChild(tr);
  });
}

// ─── MAP PAGE ──────────────────────────────────────────
function initMapPage() {
  const container = $('#full-map');
  if (!container || container.children.length > 0) return;
  const sectors = [
    { name:'SETOR A', count:20 },
    { name:'SETOR B', count:20 },
    { name:'SETOR C (Deficiente)', count:5, type:'disabled' },
  ];
  sectors.forEach(sector => {
    const sec = document.createElement('div');
    sec.className = 'map-sector';
    sec.innerHTML = `<div class="map-sector-title">${sector.name}</div><div class="map-sector-grid"></div>`;
    const grid = sec.querySelector('.map-sector-grid');
    for (let i = 0; i < sector.count; i++) {
      const spot = document.createElement('div');
      let cls;
      if (sector.type==='disabled') { cls = i<2?'occupied':'disabled'; }
      else { const r=Math.random(); cls=r<0.5?'occupied':r<0.65?'reserved':'free'; }
      spot.className = `map-spot ${cls}`;
      spot.title = `Vaga ${i+1} · ${cls}`;
      grid.appendChild(spot);
    }
    container.appendChild(sec);
  });
}

// ─── HISTORY PAGE ──────────────────────────────────────
function initHistoryPage() {
  renderHistoryChart();
  if ($('#event-table-body') && !$('#event-table-body').children.length) renderEventTable();
}

function renderHistoryChart() {
  const canvas = $('#history-chart'); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width*dpr; canvas.height = rect.height*dpr;
  ctx.scale(dpr, dpr);
  const W=rect.width, H=rect.height;
  const hours = [];
  for (let d=0; d<7; d++) {
    for (let h=0; h<24; h++) {
      const date=new Date(); date.setDate(date.getDate()-(6-d)); date.setHours(h);
      const dow=date.getDay();
      let occ = (dow>=1&&dow<=5) ? (h>=8&&h<=18?40+Math.random()*50:Math.random()*20) : (h>=10&&h<=16?20+Math.random()*40:Math.random()*15);
      hours.push(Math.min(100, occ+(Math.random()-0.5)*10));
    }
  }
  ctx.clearRect(0,0,W,H);
  const pad={top:20,right:10,bottom:30,left:42};
  const chartW=W-pad.left-pad.right, chartH=H-pad.top-pad.bottom;
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
  [0,25,50,75,100].forEach(pct=>{
    const y=pad.top+chartH*(1-pct/100);
    ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(W-pad.right,y); ctx.stroke();
    ctx.fillStyle='rgba(122,138,168,0.6)'; ctx.font='10px Inter'; ctx.textAlign='right';
    ctx.fillText(`${pct}%`,pad.left-4,y+4);
  });
  for(let d=0;d<7;d++){
    const x=pad.left+(d/7+1/14)*chartW;
    const date=new Date(); date.setDate(date.getDate()-(6-d));
    ctx.fillStyle='rgba(122,138,168,0.7)'; ctx.font='10px Inter'; ctx.textAlign='center';
    ctx.fillText(date.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit'}),x,H-6);
  }
  const grad=ctx.createLinearGradient(0,pad.top,0,pad.top+chartH);
  grad.addColorStop(0,'rgba(79,142,247,0.35)'); grad.addColorStop(1,'rgba(79,142,247,0.02)');
  ctx.beginPath(); ctx.moveTo(pad.left,pad.top+chartH);
  hours.forEach((val,i)=>{ const x=pad.left+(i/hours.length)*chartW; const y=pad.top+chartH*(1-val/100); i===0?ctx.lineTo(x,y):ctx.lineTo(x,y); });
  ctx.lineTo(pad.left+chartW,pad.top+chartH); ctx.closePath();
  ctx.fillStyle=grad; ctx.fill();
  ctx.beginPath(); ctx.strokeStyle='rgba(79,142,247,0.9)'; ctx.lineWidth=2;
  hours.forEach((val,i)=>{ const x=pad.left+(i/hours.length)*chartW; const y=pad.top+chartH*(1-val/100); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
  ctx.stroke();
}

function renderEventTable() {
  const tbody = $('#event-table-body'); if (!tbody) return;
  tbody.innerHTML = '';
  for (let i=0; i<8; i++) {
    const d = new Date(Date.now()-Math.random()*3600000*8);
    const free=Math.floor(Math.random()*20)+5;
    const occ=40-free;
    const type = Math.random()>0.5 ? 'img' : 'video';
    const names = ['estacionamento_manhã.jpg','lote_B_tarde.mp4','entrada_principal.png','setor_a_frame.jpg','gravacao_noite.mp4'];
    const tr = document.createElement('tr');
    tr.innerHTML=`
      <td class="mono">${d.toLocaleTimeString('pt-BR')}</td>
      <td style="color:var(--text-primary)">${names[i%names.length]}</td>
      <td><span class="ev-tag ${type}">${type==='img'?'🖼 Imagem':'🎬 Vídeo'}</span></td>
      <td style="color:var(--accent-green);font-weight:600">${free}</td>
      <td style="color:var(--accent-red);font-weight:600">${occ}</td>
      <td class="mono" style="color:var(--accent-amber)">${(0.82+Math.random()*0.17).toFixed(2)}</td>`;
    tbody.appendChild(tr);
  }
}

function appendHistoryRow(file, free, occ, conf) {
  const tbody = $('#event-table-body'); if (!tbody) return;
  const now = new Date();
  const type = file.type.startsWith('video/') ? 'video' : 'img';
  const tr = document.createElement('tr');
  tr.innerHTML=`
    <td class="mono">${now.toLocaleTimeString('pt-BR')}</td>
    <td style="color:var(--text-primary)">${file.name.substring(0,28)}</td>
    <td><span class="ev-tag ${type}">${type==='img'?'🖼 Imagem':'🎬 Vídeo'}</span></td>
    <td style="color:var(--accent-green);font-weight:600">${free}</td>
    <td style="color:var(--accent-red);font-weight:600">${occ}</td>
    <td class="mono" style="color:var(--accent-amber)">${(conf*100).toFixed(2)}%</td>`;
  tbody.insertBefore(tr, tbody.firstChild);
}

// ─── CHART TOGGLE ─────────────────────────────────────
function initChartToggle() {
  $('#chart-today').addEventListener('click', () => {
    STATE.chartMode='today';
    $('#chart-today').classList.add('active');
    $('#chart-week').classList.remove('active');
    renderBarChart('today');
  });
  $('#chart-week').addEventListener('click', () => {
    STATE.chartMode='week';
    $('#chart-week').classList.add('active');
    $('#chart-today').classList.remove('active');
    renderBarChart('week');
  });
}

// ─── SETTINGS ─────────────────────────────────────────
function initSettings() {
  const confSlider=$('#conf-threshold'), confVal=$('#conf-threshold-val');
  if(confSlider) confSlider.addEventListener('input',()=>{ confVal.textContent=`${confSlider.value}%`; });
  const scanSlider=$('#scan-interval'), scanVal=$('#scan-interval-val');
  if(scanSlider) scanSlider.addEventListener('input',()=>{
    STATE.scanInterval=parseInt(scanSlider.value)*1000;
    scanVal.textContent=`${scanSlider.value}s`;
  });
  const saveBtn=$('#btn-save-settings');
  if(saveBtn) saveBtn.addEventListener('click',()=>showToast('Configurações salvas!','success','✓'));
}

// ─── REFRESH BUTTON ───────────────────────────────────
function initRefreshButton() {
  const btn=$('#btn-refresh'); if (!btn) return;
  btn.addEventListener('click',()=>{
    btn.classList.add('spinning');
    simulateScan();
    setTimeout(()=>btn.classList.remove('spinning'),700);
  });
}

// ─── AUTO-SIMULATION ──────────────────────────────────
function simulateScan() {
  const numChanges = Math.floor(Math.random()*2)+1;
  for (let i=0; i<numChanges; i++) {
    const idx = Math.floor(Math.random()*STATE.totalSpots);
    const spot = STATE.spots[idx];
    if (spot.state==='detecting') continue;
    const old = spot.state;
    spot.state = 'detecting';
    renderParkingGrid();
    setTimeout(()=>{
      if (Math.random()>0.45) {
        spot.state = old==='free'?'occupied':'free';
        addActivity(`Vaga ${spot.id}`, spot.state==='occupied'?'veículo detectado':'vaga liberada', spot.state==='occupied'?'red':'green');
      } else { spot.state = old; }
      renderParkingGrid(); updateKPIs();
    }, 800+Math.random()*400);
  }
  const it=$('#infer-time'); if(it) it.textContent=`${8+Math.floor(Math.random()*10)}ms`;
  STATE.lastScan = Date.now();
}

// ─── NOTIFICATIONS ────────────────────────────────────
function initNotifButton() {
  const btn=$('#notif-btn'); if (!btn) return;
  btn.addEventListener('click',()=>{
    showToast('Estacionamento com 87.5% de ocupação!','warning','⚠');
    setTimeout(()=>showToast('Nova análise disponível no histórico','info','ℹ'),800);
    setTimeout(()=>showToast('Vaga A-14 disponível há mais de 2h','success','✓'),1600);
    const badge=$('#notif-badge'); if(badge) badge.style.display='none';
  });
}

// ─── TOAST ────────────────────────────────────────────
function createToastContainer() {
  const c=document.createElement('div');
  c.className='toast-container'; c.id='toast-container';
  document.body.appendChild(c);
}
function showToast(msg,type='info',icon='ℹ') {
  const container=$('#toast-container'); if (!container) return;
  const toast=document.createElement('div');
  toast.className=`toast ${type}`;
  const colors={success:'var(--accent-green)',info:'var(--accent-blue)',warning:'var(--accent-amber)'};
  toast.innerHTML=`<span style="color:${colors[type]};font-size:18px">${icon}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(()=>toast.remove(),4500);
}

// ─── SEED ACTIVITIES ──────────────────────────────────
function seedActivities() {
  [
    { label:'estacionamento_dia.jpg', desc:'→ 15 livres, 25 ocupadas', color:'blue' },
    { label:'Vaga 7',  desc:'veículo detectado',  color:'red' },
    { label:'Vaga 23', desc:'vaga liberada',       color:'green' },
    { label:'lote_b.mp4', desc:'→ 22 livres, 18 ocupadas', color:'blue' },
    { label:'Vaga 15', desc:'veículo detectado',  color:'red' },
  ].reverse().forEach((a,i)=>{
    const t=new Date(Date.now()-(5-i)*120000);
    STATE.activities.push({...a, time:t.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})});
  });
  renderActivityList();
}

// ─── MAIN LOOP ────────────────────────────────────────
let lastBarDraw = 0;
function mainLoop(ts) {
  updateDatetime();
  if (Date.now()-STATE.lastScan > STATE.scanInterval) simulateScan();
  if (ts-lastBarDraw > 30000) { renderBarChart(STATE.chartMode); lastBarDraw=ts; }
  requestAnimationFrame(mainLoop);
}

// ─── BOOTSTRAP ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSpots();
  initNav();
  initViewToggle();
  initChartToggle();
  initSettings();
  initRefreshButton();
  initNotifButton();
  initAnalysisPage();
  createToastContainer();
  seedActivities();

  renderParkingGrid();
  updateKPIs();
  setTimeout(()=>renderBarChart('today'),100);
  requestAnimationFrame(mainLoop);

  setTimeout(()=>showToast('ParkVision AI iniciado — pronto para análise de imagens e vídeos 🚗','success','✓'),600);
});

window.addEventListener('resize',()=>{
  if(STATE.page==='dashboard') renderBarChart(STATE.chartMode);
  if(STATE.page==='history')   renderHistoryChart();
});
