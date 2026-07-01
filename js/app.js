/* Stewy — application logic
   Reactive state: mutate `state`, then call recompute(), which re-renders the
   brew sheet, the cauldron, the harmony engine and every ingredient's fit. */
(function () {
  'use strict';

  // ---------------------------------------------------------------- config
  const CAP = 320;              // ml that visually "fills" the cauldron
  const CAULDRON_TOP = 96;      // interior top y (SVG units)
  const CAULDRON_BOT = 250;     // interior bottom y

  const UNITS = {
    ml:    { label: 'ml',    toMl: 1,  step: 5,    dec: 0, chips: [15, 22, 30, 45, 60, 90] },
    cl:    { label: 'cl',    toMl: 10, step: 0.5,  dec: 1, chips: [1, 1.5, 3, 4.5, 6, 9] },
    oz:    { label: 'oz',    toMl: 30, step: 0.25, dec: 2, chips: [0.5, 0.75, 1, 1.5, 2, 3] },
    parts: { label: 'parts', toMl: 30, step: 0.5,  dec: 1, chips: [0.5, 1, 1.5, 2, 3] },
  };
  const UNIT_ORDER = ['ml', 'cl', 'oz', 'parts'];

  // ml per single piece / dash for count-based ingredients
  const PER = { angostura: 0.9, orange_bitters: 0.9, mint: 1, cucumber: 2, sugar_cube: 4, salt: 1, cherry: 3, orange_slice: 3, olive: 3 };
  const NOUN = { angostura: 'dash', orange_bitters: 'dash', mint: 'leaf', cucumber: 'slice', sugar_cube: 'cube', salt: 'rim', cherry: 'cherry', orange_slice: 'slice', olive: 'olive' };
  const isCounted = (ing) => ing.unit === 'dash' || ing.unit === 'piece';

  // ---------------------------------------------------------- flavor engine
  const AFF = {
    'bitter|sweet': 0.85, 'citrus|sweet': 0.7, 'boozy|sweet': 0.55, 'spicy|sweet': 0.7,
    'creamy|sweet': 0.6, 'coffee|sweet': 0.8, 'nutty|sweet': 0.75, 'fruity|sweet': 0.55,
    'floral|sweet': 0.5, 'herbal|sweet': 0.4, 'fresh|sweet': 0.45, 'smoky|sweet': 0.4,
    'aromatic|sweet': 0.4, 'sour|sweet': 0.9,
    'boozy|sour': 0.7, 'herbal|sour': 0.55, 'fruity|sour': 0.6, 'floral|sour': 0.5,
    'citrus|sour': 0.4, 'fresh|sour': 0.6, 'aromatic|sour': 0.4, 'sour|spicy': 0.5,
    'creamy|sour': -0.35, 'coffee|sour': -0.45, 'smoky|sour': 0.2, 'nutty|sour': 0.2,
    'bitter|citrus': 0.6, 'bitter|herbal': 0.6, 'bitter|boozy': 0.45, 'aromatic|bitter': 0.55,
    'bitter|fruity': 0.35, 'bitter|floral': 0.3, 'bitter|coffee': 0.6, 'bitter|fresh': 0.4,
    'bitter|spicy': 0.4, 'bitter|smoky': 0.5, 'bitter|nutty': 0.4, 'bitter|creamy': 0.25,
    'citrus|herbal': 0.7, 'fresh|herbal': 0.8, 'fruity|herbal': 0.5, 'floral|herbal': 0.6,
    'aromatic|herbal': 0.6, 'boozy|herbal': 0.4, 'herbal|spicy': 0.45, 'herbal|smoky': 0.35,
    'coffee|herbal': -0.2, 'herbal|nutty': 0.35, 'creamy|herbal': 0.1,
    'citrus|fruity': 0.55, 'floral|fruity': 0.6, 'fresh|fruity': 0.6, 'fruity|spicy': 0.6,
    'aromatic|fruity': 0.45, 'boozy|fruity': 0.4, 'fruity|nutty': 0.5, 'fruity|smoky': 0.1,
    'coffee|fruity': -0.3, 'creamy|fruity': 0.35,
    'citrus|fresh': 0.8, 'citrus|floral': 0.6, 'aromatic|citrus': 0.5, 'boozy|citrus': 0.4,
    'citrus|spicy': 0.6, 'citrus|smoky': 0.5, 'citrus|nutty': 0.3, 'citrus|coffee': -0.4,
    'citrus|creamy': -0.45,
    'aromatic|smoky': 0.4, 'boozy|smoky': 0.3, 'smoky|spicy': 0.4, 'floral|smoky': 0.2,
    'nutty|smoky': 0.4, 'coffee|smoky': 0.4, 'creamy|smoky': -0.35, 'fresh|smoky': 0.2,
    'aromatic|spicy': 0.5, 'boozy|spicy': 0.4, 'floral|spicy': 0.3, 'fresh|spicy': 0.4,
    'nutty|spicy': 0.4, 'coffee|spicy': 0.4, 'creamy|spicy': 0.3,
    'aromatic|floral': 0.55, 'boozy|floral': 0.3, 'floral|fresh': 0.6, 'floral|nutty': 0.3,
    'coffee|floral': 0.1, 'creamy|floral': 0.35,
    'coffee|creamy': 0.9, 'creamy|nutty': 0.8, 'boozy|creamy': 0.3, 'aromatic|creamy': 0.35,
    'aromatic|boozy': 0.45, 'aromatic|nutty': 0.4, 'aromatic|coffee': 0.5, 'aromatic|fresh': 0.45,
    'fresh|nutty': 0.2, 'boozy|fresh': 0.35, 'coffee|fresh': -0.2,
    'coffee|nutty': 0.7, 'boozy|nutty': 0.4, 'boozy|coffee': 0.5,
  };
  function aff(a, b) {
    if (a === b) return 0.1;
    const k = a < b ? a + '|' + b : b + '|' + a;
    return k in AFF ? AFF[k] : 0.12;
  }

  // ------------------------------------------------------------- utilities
  const $ = (id) => document.getElementById(id);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const trim = (v, d) => {
    const n = parseFloat(v.toFixed(d));
    return Number.isNaN(n) ? 0 : String(n);
  };
  const ING = window.ING_BY_ID;

  // ------------------------------------------------------------------ state
  const state = { unit: 'oz', brew: [], name: 'Untitled Brew' };
  const LS = 'stewy.v1';
  function save() {
    try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(LS));
      if (s && Array.isArray(s.brew)) {
        state.brew = s.brew.filter((e) => ING[e.id]).map((e) => ({ id: e.id, ml: +e.ml || 0 }));
        if (UNITS[s.unit]) state.unit = s.unit;
        if (typeof s.name === 'string') state.name = s.name;
      }
    } catch (e) { /* ignore */ }
  }

  const els = {};
  let popState = null; // { id, ml }

  // =====================================================================
  //  PROFILE / SCORING
  // =====================================================================
  function profile(brew) {
    const F = {}; let tot = 0;
    for (const e of brew) {
      const ing = ING[e.id];
      for (const d in ing.tags) {
        const v = ing.tags[d] * e.ml;
        F[d] = (F[d] || 0) + v; tot += v;
      }
    }
    return { F, tot };
  }

  function harmony(brew) {
    if (!brew.length) return null;
    const { F, tot } = profile(brew);
    const n = brew.length;
    if (tot <= 0) {
      // only flavorless items (soda, salt, ice)
      return { score: 35, tier: 'poor', p: {} };
    }
    const dims = Object.keys(F);
    const p = {}; for (const d of dims) p[d] = F[d] / tot;

    let pair = 0;
    for (let i = 0; i < dims.length; i++)
      for (let j = i + 1; j < dims.length; j++)
        pair += aff(dims[i], dims[j]) * p[dims[i]] * p[dims[j]];

    let score = 55 + pair * 80;

    const sw = F.sweet || 0, so = F.sour || 0, bi = F.bitter || 0;
    if (sw > 0 && (so > 0 || bi > 0)) {
      const bal = 1 - Math.abs(sw - (so + bi)) / (sw + so + bi);
      score += bal * 10;
    }

    const hasBase = (F.boozy || 0) > 0;
    const hasBalancer = so > 0 || bi > 0;
    if (hasBase) score += 5;
    if (hasBase && hasBalancer) score += 4;

    // too sweet / too sour without a counterweight
    const psw = sw / tot, pso = so / tot, pbi = bi / tot;
    if (psw > 0.45 && pso + pbi < 0.1) score -= 14;
    else if (psw > 0.32 && pso + pbi < 0.08) score -= 8;
    if (pso > 0.5 && psw < 0.1 && pbi < 0.1) score -= 12;

    // one-note (dominated by a single dimension)
    let sumsq = 0; for (const d of dims) sumsq += p[d] * p[d];
    if (sumsq > 0.55) score -= (sumsq - 0.55) * 34;

    // structural clashes (curdling / muddy pairings) beyond pairwise affinity.
    // Gated on meaningful cream (p>0.10) so egg-white sours & coconut pass.
    const pc = (F.creamy || 0) / tot;
    const pacid = ((F.sour || 0) + (F.citrus || 0)) / tot;
    const psmk = (F.smoky || 0) / tot;
    const pcof = (F.coffee || 0) / tot;
    let clash = 0;
    if (pc > 0.10) {
      clash += Math.min(pc, pacid);        // cream + acid → curdle
      clash += Math.min(pc, psmk) * 0.7;   // cream + smoke → muddy
    }
    clash += Math.min(pcof, pacid) * 0.8;  // coffee + citrus/acid
    score -= clash * 95;

    // crowd / lonely
    if (n > 6) score -= (n - 6) * 4;
    if (n === 1) score -= 6;

    score = clamp(Math.round(score), 3, 99);
    return { score, tier: tierFor(score), p, F, tot };
  }

  function tierFor(s) {
    if (s >= 90) return 'legendary';
    if (s >= 80) return 'great';
    if (s >= 70) return 'good';
    if (s >= 56) return 'ok';
    if (s >= 42) return 'poor';
    return 'bad';
  }
  const VERDICT = {
    legendary: 'Legendary Elixir', great: 'Masterful Brew', good: 'A Fine Potion',
    ok: 'Drinkable Draught', poor: 'Murky Concoction', bad: 'Cursed Sludge', none: 'Awaiting reagents',
  };

  // fit of a candidate ingredient against the current mix profile → 0..1
  function fit(ing, p, hasProfile) {
    if (!hasProfile) return null;
    let ct = 0; const c = {};
    for (const d in ing.tags) { c[d] = ing.tags[d]; ct += ing.tags[d]; }
    if (ct === 0) return 0.5; // flavorless → neutral
    for (const d in c) c[d] /= ct;
    let s = 0;
    for (const dm in p) for (const dc in c) s += aff(dm, dc) * p[dm] * c[dc];
    return clamp((s + 0.3) / 0.8, 0, 1);
  }

  function fitColor(t) {
    if (t == null) return 'rgba(255,255,255,0.14)';
    const red = [229, 72, 77], amber = [245, 166, 35], green = [61, 220, 151];
    let a, b, k;
    if (t < 0.5) { a = red; b = amber; k = t * 2; }
    else { a = amber; b = green; k = (t - 0.5) * 2; }
    const r = a[0] + (b[0] - a[0]) * k, g = a[1] + (b[1] - a[1]) * k, bl = a[2] + (b[2] - a[2]) * k;
    return `rgb(${r | 0}, ${g | 0}, ${bl | 0})`;
  }

  function suggestions(h, brew) {
    if (!brew.length) return [{ t: 'Drag a reagent into the cauldron to begin the brew.', c: '' }];
    const F = h.F || {}, tot = h.tot || 1, out = [];
    const p = (d) => (F[d] || 0) / tot;
    const has = (d) => (F[d] || 0) > 0;
    const n = brew.length;

    if (!has('boozy') && brew.some((e) => ING[e.id].abv === 0))
      out.push({ t: 'No base spirit yet — add a spirit for backbone (or keep it a mocktail).', c: 'warn' });
    if (p('sweet') > 0.32 && p('sour') + p('bitter') < 0.1)
      out.push({ t: 'Reads sweet — a splash of citrus or bitters would balance it.', c: 'warn' });
    if (p('sour') > 0.45 && p('sweet') < 0.1)
      out.push({ t: 'Sharp and sour — sweeten with a little syrup.', c: 'warn' });
    if (p('bitter') > 0.4 && p('sweet') < 0.08)
      out.push({ t: 'Quite bitter — a touch of sweetness rounds it out.', c: 'warn' });
    if (has('creamy') && (has('citrus') || has('sour')) && (F.creamy > tot * 0.12))
      out.push({ t: 'Cream + citrus can curdle — pick one lane.', c: 'bad' });
    if (n === 1)
      out.push({ t: 'Add a modifier — citrus, something sweet, or bitters — to build a cocktail.', c: '' });
    if (n > 7)
      out.push({ t: 'That is a lot of ingredients — try removing one or two for clarity.', c: 'warn' });

    if (!out.length || h.score >= 80)
      out.unshift({ t: h.score >= 90 ? 'A masterwork — pour it into a goblet and take a bow.' : 'Beautifully balanced — ready to pour.', c: 'good' });

    return out.slice(0, 3);
  }

  // =====================================================================
  //  COLOR MIXING
  // =====================================================================
  function mixColor(brew) {
    let r = 0, g = 0, b = 0, w = 0, opv = 0, vol = 0;
    for (const e of brew) {
      const ing = ING[e.id];
      const [ir, ig, ib] = window.hexToRgb(ing.color);
      const cw = e.ml * (0.25 + (ing.opacity || 0.4)); // pigment weight
      r += ir * cw; g += ig * cw; b += ib * cw; w += cw;
      opv += (ing.opacity || 0.4) * e.ml; vol += e.ml;
    }
    if (w === 0 || vol === 0) return null;
    r /= w; g /= w; b /= w;
    const avgOp = opv / vol;
    const a = clamp(0.34 + avgOp * 0.58, 0.34, 0.94);
    return { css: `rgb(${r | 0}, ${g | 0}, ${b | 0})`, r, g, b, a };
  }

  // =====================================================================
  //  RENDER
  // =====================================================================
  function amountLabel(e) {
    const ing = ING[e.id];
    if (isCounted(ing)) {
      const per = PER[e.id] || 1;
      const cnt = Math.max(1, Math.round(e.ml / per));
      const noun = NOUN[e.id] || 'pc';
      if (e.id === 'salt') return 'rim';
      return `${cnt} ${noun}${cnt > 1 ? 's' : ''}`;
    }
    const u = UNITS[state.unit];
    return `${trim(e.ml / u.toMl, u.dec)} ${u.label}`;
  }

  function renderBrew() {
    const list = els.brewList;
    list.innerHTML = '';
    for (const e of state.brew) {
      const ing = ING[e.id];
      const row = document.createElement('li');
      row.className = 'brew-row';
      row.innerHTML =
        `<span class="br-icon">${window.iconFor(ing)}</span>` +
        `<span class="br-mid"><span class="br-name">${ing.name}</span>` +
        `<span class="br-amt">${amountLabel(e)}</span></span>` +
        `<span class="br-ctrls">` +
        `<button class="br-btn" data-act="minus" title="Less">−</button>` +
        `<button class="br-btn" data-act="plus" title="More">+</button>` +
        `<button class="br-btn br-del" data-act="del" title="Remove">×</button>` +
        `</span>`;
      row.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => nudge(e.id, btn.dataset.act));
      });
      list.appendChild(row);
    }
    els.brewEmpty.style.display = state.brew.length ? 'none' : '';
    els.ingCount.textContent = `${state.brew.length} reagent${state.brew.length === 1 ? '' : 's'}`;

    const totalMl = state.brew.reduce((s, e) => s + e.ml, 0);
    const alc = state.brew.reduce((s, e) => s + e.ml * (ING[e.id].abv || 0), 0);
    const abv = totalMl > 0 ? alc / totalMl : 0;
    const u = UNITS[state.unit];
    els.totalVol.textContent = state.unit === 'parts'
      ? `${Math.round(totalMl)} ml`
      : `${trim(totalMl / u.toMl, u.dec)} ${u.label}`;
    els.totalAbv.textContent = `${Math.round(abv)}% ABV`;
  }

  function updateCauldron() {
    const totalMl = state.brew.reduce((s, e) => s + e.ml, 0);
    const mix = mixColor(state.brew);
    let frac = clamp(totalMl / CAP, 0, 1);
    if (totalMl > 0 && frac < 0.08) frac = 0.08;

    const fillY = CAULDRON_BOT - frac * (CAULDRON_BOT - CAULDRON_TOP);
    const rx = 52 + frac * 52;

    els.liquid.setAttribute('y', fillY.toFixed(1));
    els.liquid.setAttribute('height', (CAULDRON_BOT + 6 - fillY).toFixed(1));
    els.liquidSurface.setAttribute('cy', fillY.toFixed(1));
    els.liquidSurface.setAttribute('rx', rx.toFixed(1));
    els.liquidShine.setAttribute('cy', (fillY - 1).toFixed(1));
    els.liquidShine.setAttribute('rx', (rx * 0.6).toFixed(1));

    if (mix) {
      els.liquid.setAttribute('fill', mix.css);
      els.liquid.setAttribute('fill-opacity', mix.a.toFixed(2));
      els.liquidSurface.setAttribute('fill', window.shade([mix.r, mix.g, mix.b], 0.18));
      els.liquidSurface.setAttribute('fill-opacity', Math.min(1, mix.a + 0.1).toFixed(2));
      els.liquidShine.setAttribute('fill-opacity', (frac > 0 ? 0.4 : 0).toFixed(2));
      els.bubbles.setAttribute('opacity', '0.85');
      els.bubbles.setAttribute('fill', window.shade([mix.r, mix.g, mix.b], 0.55));
      els.cauldron.style.setProperty('--brew', mix.css);
      els.cauldron.style.setProperty('--glow', `rgba(${mix.r | 0}, ${mix.g | 0}, ${mix.b | 0}, ${(0.28 + mix.a * 0.4).toFixed(2)})`);
    } else {
      els.liquid.setAttribute('fill-opacity', '0');
      els.liquidSurface.setAttribute('fill-opacity', '0');
      els.liquidShine.setAttribute('fill-opacity', '0');
      els.bubbles.setAttribute('opacity', '0');
      els.cauldron.style.setProperty('--glow', 'rgba(55,176,230,0.0)');
    }
  }

  function updateHarmony() {
    const h = harmony(state.brew);
    const circ = 169.6;
    if (!h) {
      els.scoreValue.textContent = '—';
      els.ringFg.style.strokeDashoffset = circ;
      els.ringFg.style.stroke = 'rgba(255,255,255,0.2)';
      els.verdictText.textContent = VERDICT.none;
      els.verdictPill.textContent = 'Awaiting reagents';
      els.verdictPill.dataset.tier = 'none';
    } else {
      const col = fitColor(clamp(h.score / 100, 0, 1));
      els.scoreValue.textContent = h.score;
      els.ringFg.style.strokeDashoffset = (circ * (1 - h.score / 100)).toFixed(1);
      els.ringFg.style.stroke = col;
      els.verdictText.textContent = VERDICT[h.tier];
      els.verdictPill.textContent = `${VERDICT[h.tier]} · ${h.score}`;
      els.verdictPill.dataset.tier = h.tier;
    }

    const sug = suggestions(h || {}, state.brew);
    els.suggestions.innerHTML = '';
    for (const s of sug) {
      const li = document.createElement('li');
      li.textContent = s.t; if (s.c) li.className = s.c;
      els.suggestions.appendChild(li);
    }
  }

  function updateFits() {
    const h = state.brew.length ? harmony(state.brew) : null;
    const hasProfile = !!(h && h.p && Object.keys(h.p).length);
    for (const card of els.cards) {
      const ing = ING[card.dataset.id];
      const t = fit(ing, hasProfile ? h.p : null, hasProfile);
      card.style.setProperty('--fit', fitColor(t));
      card.classList.toggle('scored', t != null);
    }
  }

  function recompute() {
    renderBrew();
    updateCauldron();
    updateHarmony();
    updateFits();
    save();
  }

  // =====================================================================
  //  MUTATIONS
  // =====================================================================
  function addBrew(id, ml) {
    const ex = state.brew.find((e) => e.id === id);
    if (ex) ex.ml = Math.round((ex.ml + ml) * 10) / 10;
    else state.brew.push({ id, ml: Math.round(ml * 10) / 10 });
    recompute();
  }
  function nudge(id, act) {
    const e = state.brew.find((x) => x.id === id);
    if (!e) return;
    const ing = ING[e.id];
    if (act === 'del') { state.brew = state.brew.filter((x) => x.id !== id); recompute(); return; }
    const stepMl = isCounted(ing) ? (PER[id] || 1) : UNITS[state.unit].step * UNITS[state.unit].toMl;
    e.ml = act === 'plus' ? e.ml + stepMl : e.ml - stepMl;
    e.ml = Math.round(e.ml * 10) / 10;
    if (e.ml <= 0) state.brew = state.brew.filter((x) => x.id !== id);
    recompute();
  }
  function clearBrew() {
    state.brew = [];
    state.name = 'Untitled Brew';
    els.name.value = state.name;
    recompute();
    toast('Cauldron emptied');
  }
  function loadRecipe(rid) {
    const r = window.RECIPE_BY_ID[rid];
    if (!r) return;
    state.brew = r.build.filter(([id]) => ING[id]).map(([id, ml]) => ({ id, ml }));
    state.name = r.name;
    els.name.value = r.name;
    recompute();
    els.recipesMenu.hidden = true;
    els.recipesBtn.setAttribute('aria-expanded', 'false');
    toast(`Loaded ${r.name}`);
  }

  // =====================================================================
  //  POPUP (amount picker)
  // =====================================================================
  function popUnitInfo(ing) {
    if (isCounted(ing)) {
      const per = PER[ing.id] || 1;
      const noun = NOUN[ing.id] || 'pc';
      return { counted: true, per, label: noun, chips: [1, 2, 3, 4, 6, 8], dec: 0 };
    }
    const u = UNITS[state.unit];
    return { counted: false, per: u.toMl, label: u.label, chips: u.chips, dec: u.dec, step: u.step };
  }

  function openPopup(id) {
    const ing = ING[id];
    popState = { id, ml: ing.amt };
    els.popIcon.innerHTML = window.iconFor(ing);
    els.popName.textContent = ing.name;
    els.popDesc.textContent = describe(ing);

    const info = popUnitInfo(ing);
    els.popChips.innerHTML = '';
    info.chips.forEach((v) => {
      const chip = document.createElement('button');
      chip.className = 'pop-chip';
      chip.textContent = info.counted ? `${v}` : `${v} ${info.label}`;
      chip.addEventListener('click', () => { popState.ml = v * info.per; renderPop(); });
      els.popChips.appendChild(chip);
    });

    renderPop();
    els.popBackdrop.hidden = false;
    els.popup.hidden = false;
    els.popAdd.focus();
  }

  function renderPop() {
    const ing = ING[popState.id];
    const info = popUnitInfo(ing);
    const val = popState.ml / info.per;
    els.popValue.textContent = trim(val, info.dec);
    els.popUnit.textContent = info.counted ? (Math.round(val) === 1 ? info.label : info.label + 's') : info.label;
    // highlight matching chip
    els.popChips.querySelectorAll('.pop-chip').forEach((chip, i) => {
      chip.classList.toggle('active', Math.abs(info.chips[i] - val) < 1e-6);
    });
  }

  function popStep(dir) {
    const ing = ING[popState.id];
    const info = popUnitInfo(ing);
    const stepMl = info.counted ? info.per : info.step * info.per;
    popState.ml = Math.max(info.per, Math.round((popState.ml + dir * stepMl) * 100) / 100);
    renderPop();
  }

  function closePopup() {
    els.popup.hidden = true;
    els.popBackdrop.hidden = true;
    popState = null;
  }
  function confirmPopup() {
    if (!popState) return;
    const ing = ING[popState.id];
    addBrew(popState.id, popState.ml);
    addSplash(ing.color);
    toast(`Added ${ing.name}`);
    closePopup();
  }

  function describe(ing) {
    const parts = [];
    const g = { boozy: 'boozy', sweet: 'sweet', sour: 'sour', bitter: 'bitter', herbal: 'herbal', fruity: 'fruity', citrus: 'citrus', smoky: 'smoky', spicy: 'spicy', floral: 'floral', creamy: 'creamy', aromatic: 'aromatic', fresh: 'fresh', nutty: 'nutty', coffee: 'coffee' };
    const sorted = Object.keys(ing.tags).sort((a, b) => ing.tags[b] - ing.tags[a]);
    for (const d of sorted.slice(0, 3)) if (ing.tags[d] >= 1) parts.push(g[d]);
    const flavor = parts.length ? parts.join(' · ') : 'neutral';
    return ing.abv ? `${flavor} · ${ing.abv}% ABV` : flavor;
  }

  // =====================================================================
  //  CAULDRON FX
  // =====================================================================
  function addSplash(color) {
    const fx = els.fx;
    const drop = document.createElement('span');
    drop.className = 'droplet'; drop.style.setProperty('--c', color);
    fx.appendChild(drop);
    const rip = document.createElement('span');
    rip.className = 'ripple'; rip.style.setProperty('--c', window.shade(color, 0.2));
    fx.appendChild(rip);
    const sparks = [];
    for (let i = 0; i < 7; i++) {
      const sp = document.createElement('span');
      sp.className = 'sparkle';
      sp.style.setProperty('--c', i % 2 ? '#f2d68c' : window.shade(color, 0.45));
      const ang = Math.random() * Math.PI * 2, dist = 26 + Math.random() * 44;
      sp.style.setProperty('--sx', `${(Math.cos(ang) * dist).toFixed(1)}px`);
      sp.style.setProperty('--sy', `${(Math.sin(ang) * dist - 22).toFixed(1)}px`);
      sp.style.top = '50%';
      sp.style.animationDelay = `${(0.18 + Math.random() * 0.22).toFixed(2)}s`;
      fx.appendChild(sp); sparks.push(sp);
    }
    els.cauldron.classList.add('pulse');
    setTimeout(() => {
      drop.remove(); rip.remove(); sparks.forEach((s) => s.remove());
      els.cauldron.classList.remove('pulse');
    }, 1200);
  }

  let toastTimer = null;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    requestAnimationFrame(() => els.toast.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.classList.remove('show');
      setTimeout(() => { els.toast.hidden = true; }, 300);
    }, 1600);
  }

  // =====================================================================
  //  BUILD STATIC UI
  // =====================================================================
  function buildUnitToggle() {
    els.unitToggle.innerHTML = '';
    UNIT_ORDER.forEach((u) => {
      const b = document.createElement('button');
      b.textContent = UNITS[u].label;
      b.dataset.unit = u;
      b.classList.toggle('active', u === state.unit);
      b.addEventListener('click', () => {
        state.unit = u;
        els.unitToggle.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x.dataset.unit === u));
        recompute();
      });
      els.unitToggle.appendChild(b);
    });
  }

  function buildRecipes() {
    els.recipesMenu.innerHTML = '';
    window.RECIPES.forEach((r) => {
      const item = document.createElement('button');
      item.className = 'recipe-item';
      item.innerHTML = `<span class="r-name">${r.emoji} ${r.name}</span><span class="r-note">${r.note}</span>`;
      item.addEventListener('click', () => loadRecipe(r.id));
      els.recipesMenu.appendChild(item);
    });
  }

  function buildTabs() {
    const groups = ['All', ...window.INGREDIENT_GROUPS];
    els.groupTabs.innerHTML = '';
    groups.forEach((g, i) => {
      const b = document.createElement('button');
      b.className = 'group-tab' + (i === 0 ? ' active' : '');
      b.textContent = g; b.dataset.group = g;
      b.addEventListener('click', () => {
        els.groupTabs.querySelectorAll('.group-tab').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        state.activeGroup = g;
        els.ingList.scrollTop = 0;
        filterCards();
      });
      els.groupTabs.appendChild(b);
    });
    state.activeGroup = 'All';
  }

  function makeCard(ing) {
    const card = document.createElement('button');
    card.className = 'ing-card';
    card.dataset.id = ing.id;
    card.dataset.group = ing.group;
    card.setAttribute('draggable', 'true');
    card.title = `${ing.name} — ${describe(ing)}`;
    card.innerHTML =
      `<span class="fit-dot"></span>` +
      `<span class="ing-icon">${window.iconFor(ing)}</span>` +
      `<span class="ing-name">${ing.name}</span>`;
    card.addEventListener('click', () => openPopup(ing.id));
    card.addEventListener('dragstart', (ev) => {
      ev.dataTransfer.setData('text/plain', ing.id);
      ev.dataTransfer.effectAllowed = 'copy';
      card.classList.add('dragging');
      document.body.classList.add('is-dragging'); // pause heavy fx while dragging
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.body.classList.remove('is-dragging');
      els.cauldron.classList.remove('drag-over');
    });
    return card;
  }

  // Render reagents grouped into labelled, alphabetically-sorted sections.
  function buildIngredients() {
    els.ingList.innerHTML = '';
    els.cards = [];
    els.sections = {};
    window.INGREDIENT_GROUPS.forEach((group) => {
      const items = window.INGREDIENTS
        .filter((i) => i.group === group)
        .sort((a, b) => a.name.localeCompare(b.name));
      if (!items.length) return;
      const section = document.createElement('div');
      section.className = 'ing-section';
      section.dataset.group = group;
      const head = document.createElement('div');
      head.className = 'ing-section-head';
      head.innerHTML = `<span>${group}</span><span class="sec-count">${items.length}</span>`;
      const grid = document.createElement('div');
      grid.className = 'ing-grid';
      items.forEach((ing) => { const c = makeCard(ing); grid.appendChild(c); els.cards.push(c); });
      section.appendChild(head);
      section.appendChild(grid);
      els.ingList.appendChild(section);
      els.sections[group] = section;
    });
  }

  function filterCards() {
    const q = (els.search.value || '').trim().toLowerCase();
    const g = state.activeGroup || 'All';
    els.ingList.classList.toggle('single', g !== 'All');
    for (const card of els.cards) {
      const ing = ING[card.dataset.id];
      const okG = g === 'All' || ing.group === g;
      const okQ = !q || ing.name.toLowerCase().includes(q);
      card.classList.toggle('hidden', !(okG && okQ));
    }
    for (const group in els.sections) {
      const sec = els.sections[group];
      sec.classList.toggle('hidden', !sec.querySelector('.ing-card:not(.hidden)'));
    }
  }

  // =====================================================================
  //  DRAG & DROP onto cauldron
  // =====================================================================
  function wireCauldronDnD() {
    const c = els.cauldron;
    c.addEventListener('dragover', (ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; c.classList.add('drag-over'); });
    c.addEventListener('dragleave', (ev) => { if (!c.contains(ev.relatedTarget)) c.classList.remove('drag-over'); });
    c.addEventListener('drop', (ev) => {
      ev.preventDefault();
      c.classList.remove('drag-over');
      const id = ev.dataTransfer.getData('text/plain');
      if (id && ING[id]) openPopup(id);
    });
  }

  // =====================================================================
  //  INIT
  // =====================================================================
  function init() {
    // grab refs
    [
      'brandMark', 'unitToggle', 'recipesBtn', 'recipesMenu', 'clearBtn',
      'brewList', 'brewEmpty', 'ingCount', 'totalVol', 'totalAbv',
      'ringFg', 'scoreValue', 'verdictText', 'suggestions', 'verdictPill',
      'cauldron', 'cauldronFx', 'magicCircle', 'liquid', 'liquidSurface', 'liquidShine', 'bubbles',
      'cocktailName', 'ingSearch', 'groupTabs', 'ingList',
      'popup', 'popBackdrop', 'popClose', 'popIcon', 'popName', 'popDesc',
      'popValue', 'popUnit', 'popMinus', 'popPlus', 'popChips', 'popAdd', 'toast', 'dropHint',
    ].forEach((id) => { els[id] = $(id); });
    // aliases
    els.fx = els.cauldronFx; els.name = els.cocktailName; els.search = els.ingSearch;

    els.brandMark.innerHTML = window.brandMark();
    els.magicCircle.innerHTML = window.magicCircle();

    load();
    els.name.value = state.name;

    buildUnitToggle();
    buildRecipes();
    buildTabs();
    buildIngredients();
    wireCauldronDnD();

    // header events
    els.recipesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = els.recipesMenu.hidden;
      els.recipesMenu.hidden = !open;
      els.recipesBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (e) => {
      if (!els.recipesMenu.hidden && !els.recipesMenu.contains(e.target) && e.target !== els.recipesBtn)
        els.recipesMenu.hidden = true;
    });
    els.clearBtn.addEventListener('click', clearBrew);

    // name editing
    els.name.addEventListener('input', () => { state.name = els.name.value; save(); });
    els.name.addEventListener('focus', () => els.name.select());

    // search
    els.search.addEventListener('input', filterCards);

    // popup events
    els.popMinus.addEventListener('click', () => popStep(-1));
    els.popPlus.addEventListener('click', () => popStep(1));
    els.popAdd.addEventListener('click', confirmPopup);
    els.popClose.addEventListener('click', closePopup);
    els.popBackdrop.addEventListener('click', closePopup);
    document.addEventListener('keydown', (e) => {
      if (els.popup.hidden) return;
      if (e.key === 'Escape') closePopup();
      else if (e.key === 'Enter') confirmPopup();
      else if (e.key === 'ArrowUp' || e.key === '+') { e.preventDefault(); popStep(1); }
      else if (e.key === 'ArrowDown' || e.key === '-') { e.preventDefault(); popStep(-1); }
    });

    recompute();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
