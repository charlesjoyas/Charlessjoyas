// ============================================================================
// NEXUS POS SAAS - CINEMATIC SHOWCASE ENGINE (VIDEO-STYLE WALKTHROUGH)
// Interactive Scene Director, Audio Synthesizer & Hardware Simulators
// ============================================================================

class ShowcaseEngine {
  constructor() {
    this.currentScene = 0;
    this.totalScenes = 7;
    this.isPlaying = true;
    this.sceneDurationSec = 15; // 15s per scene in autoplay mode
    this.elapsedInScene = 0;
    this.intervalId = null;
    this.soundEnabled = false;
    this.audioCtx = null;

    // Chapter metadata
    this.chapters = [
      { id: 0, title: "01. Overview General del SaaS", timeStr: "00:00" },
      { id: 1, title: "02. Pesaje & Gramaje Real (g)", timeStr: "00:15" },
      { id: 2, title: "03. POS con Utilidad en Vivo", timeStr: "00:30" },
      { id: 3, title: "04. Ticket Térmico 80mm ESC/POS", timeStr: "00:45" },
      { id: 4, title: "05. Arqueo Ciego de Caja", timeStr: "01:00" },
      { id: 5, title: "06. Cartera & Cobranza WhatsApp", timeStr: "01:15" },
      { id: 6, title: "07. Nexus AI Copilot (DeepSeek)", timeStr: "01:30" }
    ];

    // Scale State
    this.scaleMetal = 'oro18k';
    this.metalRates = {
      oro18k: { cost: 444000, rate: 580000, label: 'ORO 18K (750)', icon: '💍' },
      oro14k: { cost: 380000, rate: 510000, label: 'ORO 14K ESPECIAL', icon: '✨' },
      plata925: { cost: 28000, rate: 38000, label: 'PLATA 925 FINA', icon: '🥈' }
    };

    // POS Simulator State
    this.simProductCostPerGram = 444000;

    // Blind Cash Count Expected
    this.expectedDrawerCash = 3845000;

    this.init();
  }

  init() {
    this.initCanvasParticles();
    this.setupKeyboard();
    this.startAutoplayTimer();
    this.updateTimelineUI();
    this.recalculateScale();
    this.recalculateSimPos();
  }

  // ==========================================================================
  // WEB AUDIO SYNTHESIZER (ZERO EXTERNAL ASSETS)
  // ==========================================================================
  ensureAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleSound() {
    this.ensureAudio();
    this.soundEnabled = !this.soundEnabled;
    const btn = document.getElementById('audio-toggle-btn');
    const icon = document.getElementById('audio-icon');
    const text = document.getElementById('audio-text');

    if (this.soundEnabled) {
      if (btn) btn.classList.add('on');
      if (icon) icon.textContent = '🔊';
      if (text) text.textContent = 'FX ON';
      this.playSynthSound('beep', 800, 0.1);
      this.showToast('Efectos de sonido futuristas ACTIVADOS');
    } else {
      if (btn) btn.classList.remove('on');
      if (icon) icon.textContent = '🔇';
      if (text) text.textContent = 'FX OFF';
      this.showToast('Efectos de sonido silenciados');
    }
  }

  playSynthSound(type = 'blip', freq = 600, duration = 0.08) {
    if (!this.soundEnabled) return;
    try {
      this.ensureAudio();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;

      if (type === 'blip') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + duration);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      } else if (type === 'whoosh') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + duration * 0.7);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      } else if (type === 'cash') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.06); // E6
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      } else if (type === 'printer') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(120, now + duration);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.001, now + duration);
      }

      osc.start(now);
      osc.stop(now + duration);
    } catch (_) {}
  }

  // ==========================================================================
  // SCENE NAVIGATION & CINEMATIC CONTROLS
  // ==========================================================================
  goToScene(index) {
    if (index < 0 || index >= this.totalScenes) return;
    this.playSynthSound('whoosh', 400, 0.2);

    const prevIndex = this.currentScene;
    this.currentScene = index;
    this.elapsedInScene = 0;

    // Update panels
    document.querySelectorAll('.scene-panel').forEach(panel => {
      const idx = parseInt(panel.getAttribute('data-index'), 10);
      panel.classList.remove('active', 'prev');
      if (idx === index) {
        panel.classList.add('active');
      } else if (idx < index) {
        panel.classList.add('prev');
      }
    });

    // Update chapter tabs in top nav
    document.querySelectorAll('.chapter-tab').forEach(tab => {
      const idx = parseInt(tab.getAttribute('data-scene'), 10);
      tab.classList.toggle('active', idx === index);
    });

    // Update bottom markers
    document.querySelectorAll('.t-mark').forEach(mark => {
      const idx = parseInt(mark.getAttribute('data-scene'), 10);
      mark.classList.toggle('active', idx === index);
    });

    this.updateTimelineUI();
  }

  nextScene() {
    const next = (this.currentScene + 1) % this.totalScenes;
    this.goToScene(next);
  }

  prevScene() {
    const prev = (this.currentScene - 1 + this.totalScenes) % this.totalScenes;
    this.goToScene(prev);
  }

  toggleAutoplay() {
    this.isPlaying = !this.isPlaying;
    const icon = document.getElementById('v-play-icon');
    if (icon) icon.textContent = this.isPlaying ? '⏸' : '▶';
    this.showToast(this.isPlaying ? 'Reproducción automática REANUDADA' : 'Reproducción en PAUSA');
    this.playSynthSound('blip', 600, 0.08);
  }

  startTour() {
    this.goToScene(1);
    this.isPlaying = true;
    const icon = document.getElementById('v-play-icon');
    if (icon) icon.textContent = '⏸';
  }

  startAutoplayTimer() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      if (!this.isPlaying) return;

      this.elapsedInScene += 0.25;
      if (this.elapsedInScene >= this.sceneDurationSec) {
        this.nextScene();
      } else {
        this.updateProgressBar();
      }
    }, 250);
  }

  updateProgressBar() {
    const fill = document.getElementById('v-progress-fill');
    if (!fill) return;
    const sceneFraction = this.elapsedInScene / this.sceneDurationSec;
    const totalProgress = ((this.currentScene + sceneFraction) / this.totalScenes) * 100;
    fill.style.width = `${Math.min(100, Math.max(0, totalProgress))}%`;

    const totalSeconds = Math.round(this.currentScene * this.sceneDurationSec + this.elapsedInScene);
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    const curTimeEl = document.getElementById('v-current-time');
    if (curTimeEl) curTimeEl.textContent = `${mins}:${secs}`;
  }

  updateTimelineUI() {
    const chapter = this.chapters[this.currentScene];
    const nameEl = document.getElementById('v-chapter-name');
    if (nameEl && chapter) nameEl.textContent = chapter.title;

    this.updateProgressBar();
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.toggleAutoplay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.nextScene();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.prevScene();
      }
    });

    // Scrub bar click handling
    const track = document.getElementById('timeline-track');
    if (track) {
      track.addEventListener('click', (e) => {
        const rect = track.getBoundingClientRect();
        const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const targetScene = Math.min(this.totalScenes - 1, Math.floor(clickRatio * this.totalScenes));
        this.goToScene(targetScene);
      });
    }
  }

  showToast(message) {
    const toast = document.getElementById('showcase-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // ==========================================================================
  // HARDWARE SIMULATOR 1: DIGITAL JEWELRY SCALE
  // ==========================================================================
  setScaleMetal(metalKey) {
    if (!this.metalRates[metalKey]) return;
    this.scaleMetal = metalKey;
    this.playSynthSound('blip', 750, 0.08);

    document.querySelectorAll('.chip-metal').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(metalKey));
    });

    const meta = this.metalRates[metalKey];
    const tag = document.getElementById('scale-metal-tag');
    if (tag) tag.textContent = meta.label;

    const baseEl = document.getElementById('scale-cost-base');
    if (baseEl) baseEl.textContent = `$ ${meta.cost.toLocaleString('es-CO')} / g`;

    const rateEl = document.getElementById('scale-rate-day');
    if (rateEl) rateEl.textContent = `$ ${meta.rate.toLocaleString('es-CO')} / g`;

    const jewelIcon = document.getElementById('scale-jewel-icon');
    if (jewelIcon) jewelIcon.textContent = meta.icon;

    this.recalculateScale();
  }

  onScaleSlider(val) {
    const grams = parseFloat(val) || 0;
    const read = document.getElementById('scale-slider-val');
    if (read) read.textContent = `${grams.toFixed(2)} g`;
    this.recalculateScale();
  }

  recalculateScale() {
    const slider = document.getElementById('scale-slider');
    const grams = slider ? (parseFloat(slider.value) || 12.5) : 12.5;

    const meta = this.metalRates[this.scaleMetal] || this.metalRates.oro18k;
    const totalCost = Math.round(grams * meta.cost);
    const totalSale = Math.round(grams * meta.rate);
    const totalProfit = totalSale - totalCost;

    const disp = document.getElementById('scale-grams-display');
    if (disp) disp.textContent = grams.toFixed(2);

    const costVal = document.getElementById('sr-cost-val');
    if (costVal) costVal.textContent = `$ ${totalCost.toLocaleString('es-CO')}`;

    const saleVal = document.getElementById('sr-sale-val');
    if (saleVal) saleVal.textContent = `$ ${totalSale.toLocaleString('es-CO')}`;

    const profitVal = document.getElementById('sr-profit-val');
    if (profitVal) profitVal.textContent = `+ $ ${totalProfit.toLocaleString('es-CO')}`;
  }

  // ==========================================================================
  // HARDWARE SIMULATOR 2: POS LIVE PROFIT & DUAL INPUT
  // ==========================================================================
  cleanNumber(str) {
    if (typeof str === 'number') return str;
    return parseFloat(String(str || '0').replace(/,/g, '').replace(/\$/g, '').trim()) || 0;
  }

  formatCommas(num) {
    return Math.round(num).toLocaleString('es-CO');
  }

  stepGrams(delta) {
    const input = document.getElementById('sim-grams-input');
    if (!input) return;
    let val = parseFloat(input.value) || 1;
    val = Math.max(0.1, Math.round((val + delta * 0.5) * 100) / 100);
    input.value = val.toFixed(2);
    this.onSimGramsInput(input.value);
  }

  onSimGramsInput(val) {
    const grams = parseFloat(val) || 0;
    const pricePerGram = this.cleanNumber(document.getElementById('sim-price-gram-input')?.value);
    const totalSale = Math.round(grams * pricePerGram);

    const totalInput = document.getElementById('sim-total-sale-input');
    if (totalInput) totalInput.value = this.formatCommas(totalSale);

    this.recalculateSimPos();
  }

  // When seller writes $/g -> update Total
  onSimPriceGramInput(val) {
    const pricePerGram = this.cleanNumber(val);
    const grams = parseFloat(document.getElementById('sim-grams-input')?.value) || 0;
    const totalSale = Math.round(grams * pricePerGram);

    const totalInput = document.getElementById('sim-total-sale-input');
    if (totalInput) totalInput.value = this.formatCommas(totalSale);

    this.recalculateSimPos();
  }

  // BIDIRECTIONAL: When seller writes Total negotiated with customer -> update $/g
  onSimTotalSaleInput(val) {
    const totalSale = this.cleanNumber(val);
    const grams = parseFloat(document.getElementById('sim-grams-input')?.value) || 1;
    const pricePerGram = grams > 0 ? Math.round(totalSale / grams) : 0;

    const priceGramInput = document.getElementById('sim-price-gram-input');
    if (priceGramInput) priceGramInput.value = this.formatCommas(pricePerGram);

    this.recalculateSimPos();
  }

  recalculateSimPos() {
    const grams = parseFloat(document.getElementById('sim-grams-input')?.value) || 0;
    const totalSale = this.cleanNumber(document.getElementById('sim-total-sale-input')?.value);
    const costPerGram = this.simProductCostPerGram;
    const totalCost = Math.round(grams * costPerGram);
    const profit = totalSale - totalCost;
    const marginPct = totalSale > 0 ? ((profit / totalSale) * 100).toFixed(1) : '0.0';

    // Update live summaries
    const costStrip = document.getElementById('sim-total-cost-line');
    if (costStrip) costStrip.textContent = `$ ${this.formatCommas(totalCost)} COP`;

    const saleEl = document.getElementById('sim-summary-sale');
    if (saleEl) saleEl.textContent = `$ ${this.formatCommas(totalSale)} COP`;

    const costEl = document.getElementById('sim-summary-cost');
    if (costEl) costEl.textContent = `-$ ${this.formatCommas(totalCost)} COP`;

    const profitEl = document.getElementById('sim-summary-profit');
    const marginEl = document.getElementById('sim-summary-margin');
    const cardEl = document.getElementById('sim-profit-card');

    if (profitEl) {
      if (profit >= 0) {
        profitEl.textContent = `+ $ ${this.formatCommas(profit)} COP`;
        profitEl.style.color = '#34D399';
      } else {
        profitEl.textContent = `- $ ${this.formatCommas(Math.abs(profit))} COP (PÉRDIDA)`;
        profitEl.style.color = '#F87171';
      }
    }

    if (marginEl) {
      if (profit >= 0) {
        marginEl.textContent = `+${marginPct}% Margen`;
        marginEl.style.background = 'rgba(16, 185, 129, 0.25)';
        marginEl.style.borderColor = '#10B981';
        marginEl.style.color = '#A7F3D0';
      } else {
        marginEl.textContent = `ALERTA: ${marginPct}% BAJO COSTO`;
        marginEl.style.background = 'rgba(239, 68, 68, 0.25)';
        marginEl.style.borderColor = '#EF4444';
        marginEl.style.color = '#FECDD3';
      }
    }

    if (cardEl) {
      if (profit < 0) {
        cardEl.style.boxShadow = '0 0 30px rgba(239, 68, 68, 0.4)';
        cardEl.style.borderColor = 'rgba(239, 68, 68, 0.5)';
      } else {
        cardEl.style.boxShadow = '0 0 30px rgba(16, 185, 129, 0.25)';
        cardEl.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      }
    }
  }

  triggerSimulateSale() {
    this.playSynthSound('cash', 980, 0.35);
    const totalSale = this.cleanNumber(document.getElementById('sim-total-sale-input')?.value);
    this.showToast(`¡Venta procesada por $ ${this.formatCommas(totalSale)} COP! Emitiendo ticket...`);

    setTimeout(() => {
      this.goToScene(3); // Jump to thermal printer scene
      this.feedThermalPrinter();
    }, 700);
  }

  // ==========================================================================
  // HARDWARE SIMULATOR 3: 80MM THERMAL PRINTER
  // ==========================================================================
  feedThermalPrinter() {
    this.playSynthSound('printer', 160, 0.4);
    const receipt = document.getElementById('demo-receipt');
    if (!receipt) return;

    receipt.style.animation = 'none';
    void receipt.offsetHeight; // trigger reflow
    receipt.style.animation = 'feedPaper 1.1s cubic-bezier(0.16, 1, 0.3, 1)';

    const randomTx = Math.floor(89200 + Math.random() * 800);
    const idEl = document.getElementById('t-ticket-id');
    if (idEl) idEl.textContent = `Venta #TX-${randomTx}`;

    const now = new Date();
    const timeEl = document.getElementById('t-ticket-time');
    if (timeEl) timeEl.textContent = `${now.toLocaleDateString('es-CO')} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    this.showToast(`Ticket #TX-${randomTx} expulsado por ranura térmica 80mm`);
  }

  // ==========================================================================
  // HARDWARE SIMULATOR 4: ARQUEO CIEGO & RECONCILIATION
  // ==========================================================================
  setBlindCash(amount) {
    const input = document.getElementById('blind-count-input');
    if (input) input.value = this.formatCommas(amount);
    this.onBlindCountChange(input.value);
  }

  onBlindCountChange(val) {
    const actual = this.cleanNumber(val);
    const expected = this.expectedDrawerCash;
    const diff = actual - expected;

    const actualEl = document.getElementById('rec-actual-val');
    if (actualEl) actualEl.textContent = `$ ${this.formatCommas(actual)} COP`;

    const card = document.getElementById('discrepancy-card');
    const icon = document.getElementById('disc-icon');
    const status = document.getElementById('disc-status');
    const detail = document.getElementById('disc-detail');

    if (!card || !icon || !status || !detail) return;

    card.classList.remove('exact', 'faltante', 'sobrante');

    if (Math.abs(diff) === 0) {
      card.classList.add('exact');
      icon.textContent = '✅';
      status.textContent = '¡CUADRE PERFECTO EXACTO (0 DESCUADRE)!';
      detail.textContent = 'El dinero físico coincide con exactitud matemática frente al libro diario.';
      this.playSynthSound('blip', 900, 0.1);
    } else if (diff < 0) {
      card.classList.add('faltante');
      icon.textContent = '🚨';
      status.textContent = `FALTANTE DE CAJA DETECTADO: -$ ${this.formatCommas(Math.abs(diff))} COP`;
      detail.textContent = 'El cajero tiene menos efectivo del esperado. Se registra alerta en bitácora.';
      this.playSynthSound('blip', 280, 0.15);
    } else {
      card.classList.add('sobrante');
      icon.textContent = '⚠️';
      status.textContent = `SOBRANTE EN CAJA REPORTADO: +$ ${this.formatCommas(diff)} COP`;
      detail.textContent = 'Existe mayor efectivo físico que el registrado en ventas y abonos.';
      this.playSynthSound('blip', 650, 0.1);
    }
  }

  // ==========================================================================
  // HARDWARE SIMULATOR 5: WHATSAPP COBRANZA
  // ==========================================================================
  generateWaMessage(tone) {
    this.playSynthSound('blip', 700, 0.08);
    const textEl = document.getElementById('wa-text-content');
    if (!textEl) return;

    if (tone === 'amigable') {
      textEl.innerHTML = `Hola estimado <b>Alejandro Morales</b>, te saludamos con mucho aprecio de parte de <b>Charles Joyas SAS</b>. 👋✨<br><br>Esperamos que estés disfrutando tu joya. Nos ponemos en contacto para recordarte tu saldo de <b>$ 1.850.000 COP</b>.<br><br>¿Nos confirmas si te queda bien realizar un abono el día de hoy? ¡Agradecemos mucho tu lealtad! 🙏💎`;
    } else if (tone === 'formal') {
      textEl.innerHTML = `Estimado(a) <b>Alejandro Morales</b>, reciba un cordial saludo de <b>Inversiones Charles Joyas S.A.S</b>.<br><br>Le notificamos formalmente que su estado de cuenta presenta un saldo pendiente de <b>$ 1.850.000 COP</b> con vencimiento próximo.<br><br>Agradecemos enviar su comprobante de transferencia bancaria para aplicar su descargo contable.`;
    } else if (tone === 'urgente') {
      textEl.innerHTML = `⚠️ <b>AVISO DE CARTERA VENCIDA:</b> Estimado <b>Alejandro Morales</b>, le informamos que su crédito presenta <b>14 días en mora</b> por valor de <b>$ 1.850.000 COP</b>.<br><br>Le solicitamos comunicarse con urgencia con nuestra administración para coordinar su acuerdo de pago y evitar el bloqueo de cupo.`;
    }
  }

  openRealWhatsApp() {
    this.playSynthSound('blip', 850, 0.1);
    const text = document.getElementById('wa-text-content')?.innerText || 'Recordatorio de pago Charles Joyas';
    const url = `https://wa.me/573234913454?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    this.showToast('Abriendo enlace de WhatsApp con mensaje listo para enviar');
  }

  // ==========================================================================
  // HARDWARE SIMULATOR 6: NEXUS AI COPILOT (DEEPSEEK)
  // ==========================================================================
  triggerAiPrompt(type) {
    this.playSynthSound('blip', 800, 0.1);
    const box = document.getElementById('ai-bot-reply');
    if (!box) return;

    box.style.opacity = '0.4';

    setTimeout(() => {
      box.style.opacity = '1';

      if (type === 'caja') {
        box.innerHTML = `
          <div class="ai-bot-header"><span>🚨 AUDITORÍA FORENSE DE CAJA CHICA</span><span>EN VIVO</span></div>
          <p>• <b>Estado:</b> Turno Mañana Activo (Carlos Mendoza).<br>
          • <b>Efectivo Físico Esperado:</b> <b>$ 3.845.000 COP</b>.<br>
          • <b>Ventas Contadas:</b> 100% coincidentes con vouchers bancarios.<br>
          • 💡 <i>Recomendación:</i> El cierre ciego previene cualquier fuga hormiga antes del cambio de turno de las 02:00 PM.</p>
        `;
      } else if (type === 'hueso') {
        box.innerHTML = `
          <div class="ai-bot-header"><span>📦 AUDITORÍA DE STOCK DE BAJA ROTACIÓN</span><span>EN VIVO</span></div>
          <p>• <b>Total Referencias Analizadas:</b> 849 SKUs.<br>
          • <b>Lenta Salida:</b> 4 dijes de Plata 925 y 2 cadenas con más de 65 días en vitrina ($ 4.200.000 COP en costo inmovilizado).<br>
          • 💡 <i>Estrategia CFO:</i> Crear un combo de obsequio de cadena por compras superiores a $ 3M de Oro 18K para dinamizar liquidez inmediata.</p>
        `;
      } else if (type === 'balance') {
        box.innerHTML = `
          <div class="ai-bot-header"><span>⚖️ INTERPRETACIÓN PATRIMONIAL DEL BALANCE</span><span>EN VIVO</span></div>
          <p>• <b>Total Activos:</b> <b>$ 204.760.000 COP</b> (Inventario + Caja + Cartera + Maquinaria Taller).<br>
          • <b>Total Pasivos:</b> <b>$ 18.200.000 COP</b> (Obligaciones con talleres y proveedores).<br>
          • <b>Patrimonio Neto Solvente:</b> <b>$ 186.560.000 COP</b>.<br>
          • 💡 <i>Diagnóstico:</i> Excelente índice de solvencia (Razón de liquidez: 11.2x). El negocio tiene capacidad sólida de apalancamiento.</p>
        `;
      } else {
        box.innerHTML = `
          <div class="ai-bot-header"><span>💎 DIAGNÓSTICO EJECUTIVO CONSOLIDADO</span><span>14 OCT • 12:55 PM</span></div>
          <ul class="ai-bullet-list">
            <li>💰 <b>Ventas Facturadas Hoy:</b> <b>$ 28.450.000 COP</b> (14 transacciones, ticket promedio: $ 2.032.140 COP).</li>
            <li>💵 <b>Efectivo Físico en Caja:</b> <b>$ 8.210.000 COP</b> (0 descuadres en turno actual).</li>
            <li>📉 <b>Cartera Pendiente por Cobrar:</b> <b>$ 12.350.000 COP</b> (84% al día, 16% con mora menor a 30 días).</li>
            <li>📦 <b>Inventario Activo Valorizado:</b> <b>$ 184.200.000 COP</b> (540g equivalentes de oro base).</li>
          </ul>
        `;
      }
    }, 350);
  }

  // ==========================================================================
  // BACKGROUND PARTICLES CANVAS
  // ==========================================================================
  initCanvasParticles() {
    const canvas = document.getElementById('ambient-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = 45;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2.2 + 0.6,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        color: Math.random() > 0.6 ? '#F59E0B' : (Math.random() > 0.3 ? '#8B5CF6' : '#06B6D4'),
        alpha: Math.random() * 0.6 + 0.2
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();
  }
}

// Global engine instance
let showcase = null;
document.addEventListener('DOMContentLoaded', () => {
  showcase = new ShowcaseEngine();
});
