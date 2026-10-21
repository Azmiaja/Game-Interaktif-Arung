(() => {
  "use strict";

  const CONTENT = window.GAME_CONTENT;
  const STORAGE_KEY = "ekspedisi-persahabatan-v1";
  const root = document.getElementById("game");
  const musicToggle = document.getElementById("music-toggle");
  const musicStatus = document.getElementById("music-status");
  const musicSourceUrl = "assets/sailing-puzzle.mp3";
  const musicVolume = 0.35;
  const storyAssetVersion = "20261019-1323";
  const islandAssetVersion = "20261019-1408";
  const shipAssetVersion = "20261019-1430";
  const loaderAssetVersion = "20261019-1517";
  const gameMedia = [
    "assets/Peta-Perjalanan-Konflik_1.webp", "assets/harbor-home.webp", "assets/map-sea.webp",
    "assets/wood-frame.png", "assets/ship.webp", "assets/captain.webp", "assets/loader.webp",
    "assets/harta.png", "assets/music-off.png", "assets/music-on.png", "assets/btn-mulai.png",
    "assets/btn-cara-bermain.png", "assets/btn-homeldpi.png", "assets/pin-karakter.png",
    "assets/dengarkan-lock.png", "assets/dengarkan-unlock.png", "assets/pahami-lock.png",
    "assets/pahami-unlock.png", "assets/pikirkan-lock.png", "assets/pikirkan-unlock.png",
    "assets/temukansolusi-lock.png", "assets/temukansolusi-unlock.png",
    "assets/island1.png", "assets/island2.png", "assets/island3.png", "assets/island4.png",
    "assets/story-1.webp", "assets/story-2.webp", "assets/story-3.webp", "assets/story-4.webp",
    "assets/reward-compass.png", "assets/reward-heart.png", "assets/reward-crystal.png",
    "assets/reward-chest.png", musicSourceUrl
  ];
  const islandAssets = ["dengarkan", "pahami", "pikirkan", "temukansolusi"];
  const islandPositions = [["14%", "50%"], ["32%", "55%"], ["53%", "58%"], ["74%", "60%"]];
  let musicEnabled = true;
  let musicContext = null;
  let musicBuffer = null;
  let musicBufferPromise = null;
  let musicSource = null;
  let musicGain = null;
  let musicStartedAt = 0;
  let musicOffset = 0;
  let musicLoading = false;
  let musicAttempt = 0;
  const preloadedImages = new Set();
  const musicIcon = musicToggle.querySelector("img");
  const defaultState = () => ({
    version: 1,
    storyDone: false,
    captainName: "",
    unlocked: 1,
    completed: [false, false, false, false],
    rewards: [],
    turningPointDone: false,
    answers: {
      l1: ["", "", ""],
      l2: { salsa: ["", "", ""], rani: ["", "", ""] },
      turningPoint: { choice: null, reason: "" },
      l3: { cards: { A: ["", "", "", ""], B: ["", "", "", ""], C: ["", "", "", ""] }, captainNote: "" },
      l4: { q: ["", "", "", ""], plan: { action: "", how: "", when: "" } },
      final: ["", "", ""]
    },
    ui: {
      screen: "home", step: 0, person: "salsa", card: "A",
      storyStep: 0, storyReturnTo: "", storyReview: false,
      hintOpen: false, toast: "", modal: null, sailTarget: "", resumeScreen: ""
    }
  });

  let state = loadState();
  let saveTimer = 0;
  let sailTimer = 0;
  let toastTimer = 0;

  function updateMusicControl(isEnabled, status) {
    musicToggle.setAttribute("aria-pressed", String(isEnabled));
    musicToggle.setAttribute("aria-label", isEnabled ? "Matikan musik latar" : "Nyalakan musik latar");
    musicIcon.src = isEnabled ? "assets/music-on.png" : "assets/music-off.png";
    musicStatus.textContent = status;
  }

  function stopBackgroundMusic(status) {
    musicEnabled = false;
    musicAttempt += 1;
    musicLoading = false;
    if (musicSource && musicContext && musicBuffer) {
      musicOffset = (musicOffset + musicContext.currentTime - musicStartedAt) % musicBuffer.duration;
      musicSource.onended = null;
      musicSource.stop();
      musicSource.disconnect();
      musicGain.disconnect();
      musicSource = null;
      musicGain = null;
    }
    updateMusicControl(false, status);
  }

  async function startBackgroundMusic() {
    if (!musicEnabled || musicLoading || musicSource) return;

    const attempt = ++musicAttempt;
    musicLoading = true;
    updateMusicControl(true, "Musik latar sedang dimuat.");

    try {
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextConstructor) throw new Error("Web Audio API tidak tersedia di browser ini.");
      if (!musicContext) musicContext = new AudioContextConstructor();
      const resumeContext = musicContext.resume().catch(() => null);

      if (!musicBufferPromise) {
        musicBufferPromise = fetch(musicSourceUrl)
          .then((response) => {
            if (!response.ok) throw new Error(`Gagal memuat musik (HTTP ${response.status}).`);
            return response.arrayBuffer();
          })
          .then((audioData) => musicContext.decodeAudioData(audioData))
          .then((buffer) => {
            musicBuffer = buffer;
            return buffer;
          })
          .catch((error) => {
            musicBufferPromise = null;
            throw error;
          });
      }

      const buffer = await musicBufferPromise;
      if (!musicEnabled || attempt !== musicAttempt) return;

      musicSource = musicContext.createBufferSource();
      musicGain = musicContext.createGain();
      musicSource.buffer = buffer;
      musicSource.loop = true;
      musicGain.gain.value = musicVolume;
      musicSource.connect(musicGain);
      musicGain.connect(musicContext.destination);
      musicStartedAt = musicContext.currentTime;
      musicSource.start(0, musicOffset % buffer.duration);
      if (musicContext.state === "running") {
        updateMusicControl(true, "Musik latar sedang diputar dan akan berulang.");
      } else {
        updateMusicControl(false, "Musik siap diputar. Jika belum terdengar, sentuh layar atau klik tombol musik.");
      }
      resumeContext.then(() => {
        if (musicEnabled && musicSource && musicContext.state === "running") {
          updateMusicControl(true, "Musik latar sedang diputar dan akan berulang.");
        }
      });
    } catch (error) {
      if (attempt === musicAttempt) {
        musicEnabled = false;
        const status = window.location.protocol === "file:"
          ? "Browser memblokir audio saat game dibuka langsung sebagai file. Jalankan game melalui server lokal seperti Live Server."
          : "Musik tidak dapat diputar. Pastikan berkas assets/sailing-puzzle.mp3 tersedia lalu coba lagi.";
        updateMusicControl(false, status);
        console.error("Musik latar tidak dapat diputar.", error);
      }
    } finally {
      if (attempt === musicAttempt) musicLoading = false;
    }
  }

  async function resumeBackgroundMusic() {
    if (!musicEnabled || !musicContext || musicContext.state === "running") return;

    try {
      await musicContext.resume();
      if (musicContext.state !== "running") throw new Error("Browser belum melanjutkan pemutaran musik.");
      if (musicSource) updateMusicControl(true, "Musik latar sedang diputar dan akan berulang.");
    } catch (error) {
      updateMusicControl(true, "Musik terjeda oleh browser. Klik tombol musik untuk melanjutkan.");
      console.error("Musik latar tidak dapat dilanjutkan.", error);
    }
  }

  musicToggle.addEventListener("click", () => {
    if (musicLoading) {
      stopBackgroundMusic("Musik latar dijeda.");
      return;
    }
    if (musicSource) {
      if (musicContext?.state === "running") {
        stopBackgroundMusic("Musik latar dijeda.");
      } else {
        musicEnabled = true;
        resumeBackgroundMusic();
      }
      return;
    }
    musicEnabled = true;
    startBackgroundMusic();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && musicSource) resumeBackgroundMusic();
  });

  window.addEventListener("focus", () => {
    if (musicSource) resumeBackgroundMusic();
  });

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return defaultState();
      const parsed = JSON.parse(saved);
      const fresh = defaultState();
      const isTextArray = (value, length) => Array.isArray(value) && value.length === length && value.every((item) => typeof item === "string");
      const validScreens = ["home", "map", "story", "mission", "l1-intro", "l1-q", "l1-reward", "l2-intro", "l2-q", "l2-feedback", "l2-reward", "turning", "l3-intro", "l3-cards", "l3-q", "l3-note", "l3-reward", "l4-intro", "l4-q", "l4-plan", "l4-feedback", "l4-reward", "sail", "final-overview", "final-q", "final-done", "summary"];
      if (!parsed || parsed.version !== 1 || !parsed.answers || !parsed.ui ||
          (parsed.captainName !== undefined && typeof parsed.captainName !== "string") ||
          typeof parsed.storyDone !== "boolean" || !Number.isInteger(parsed.unlocked) || parsed.unlocked < 1 || parsed.unlocked > 5 ||
          !Array.isArray(parsed.completed) || parsed.completed.length !== 4 || !parsed.completed.every((item) => typeof item === "boolean") ||
          !Array.isArray(parsed.rewards) || !parsed.rewards.every((item) => ["compass", "heart", "crystal", "chest"].includes(item)) ||
          typeof parsed.turningPointDone !== "boolean" ||
          !isTextArray(parsed.answers.l1, 3) ||
          !parsed.answers.l2 || !isTextArray(parsed.answers.l2.salsa, 3) || !isTextArray(parsed.answers.l2.rani, 3) ||
          !parsed.answers.turningPoint || ![null, "A", "B", "C"].includes(parsed.answers.turningPoint.choice) || typeof parsed.answers.turningPoint.reason !== "string" ||
          !parsed.answers.l3 || !parsed.answers.l3.cards ||
          !["A", "B", "C"].every((card) => isTextArray(parsed.answers.l3.cards[card], 4)) || typeof parsed.answers.l3.captainNote !== "string" ||
          !parsed.answers.l4 || !isTextArray(parsed.answers.l4.q, 4) || !parsed.answers.l4.plan ||
          !["action", "how", "when"].every((key) => typeof parsed.answers.l4.plan[key] === "string") ||
          !isTextArray(parsed.answers.final, 3) || !validScreens.includes(parsed.ui.screen) ||
          !Number.isInteger(parsed.ui.step) || parsed.ui.step < 0 || parsed.ui.step > 3 ||
          !["salsa", "rani"].includes(parsed.ui.person) || !["A", "B", "C"].includes(parsed.ui.card) ||
          !Number.isInteger(parsed.ui.storyStep) || parsed.ui.storyStep < 0 || parsed.ui.storyStep > 3) return fresh;
      return {
        ...fresh,
        ...parsed,
        captainName: parsed.captainName || "",
        completed: parsed.completed,
        rewards: parsed.rewards,
        answers: {
          ...fresh.answers,
          ...parsed.answers,
          l2: { ...fresh.answers.l2, ...parsed.answers.l2 },
          turningPoint: { ...fresh.answers.turningPoint, ...parsed.answers.turningPoint },
          l3: { ...fresh.answers.l3, ...parsed.answers.l3, cards: { ...fresh.answers.l3.cards, ...(parsed.answers.l3.cards || {}) } },
          l4: { ...fresh.answers.l4, ...parsed.answers.l4, plan: { ...fresh.answers.l4.plan, ...(parsed.answers.l4.plan || {}) } }
        },
        ui: { ...fresh.ui, ...parsed.ui, modal: null, toast: "" }
      };
    } catch (error) {
      console.warn("Progres lokal tidak dapat dibaca; petualangan dimulai dari awal.", error);
      return defaultState();
    }
  }

  function save() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.warn("Progres tidak dapat disimpan pada perangkat ini.", error);
      }
    }, 300);
  }

  function saveNow() {
    window.clearTimeout(saveTimer);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Progres tidak dapat disimpan pada perangkat ini.", error);
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function setScreen(screen) {
    state.ui.screen = screen;
    state.ui.hintOpen = false;
    state.ui.toast = "";
    save();
    render();
  }

  function hasProgress() {
    return (state.ui.resumeScreen && !["home", "map"].includes(state.ui.resumeScreen)) ||
      Boolean(state.captainName) || state.ui.storyStep > 0 || state.storyDone || state.completed.some(Boolean) ||
      Object.values(state.answers.l1).some(Boolean) ||
      Object.values(state.answers.l2).some((answers) => answers.some(Boolean)) ||
      state.answers.turningPoint.reason || state.answers.l3.captainNote ||
      state.answers.l4.q.some(Boolean) || state.answers.l4.plan.action ||
      state.answers.final.some(Boolean);
  }

  function completedCount() {
    return state.completed.filter(Boolean).length;
  }

  function shell(title, theme, content) {
    return `<section class="screen level-screen ${theme || ""}">
      <header class="topbar">
        <button class="back-link" data-action="map-back" aria-label="Kembali ke peta">Peta</button>
        <p class="topbar-title">${escapeHtml(title)}</p>
        <button class="back-link" data-action="read-story">📜 Baca ulang cerita</button>
      </header>${content}</section>`;
  }

  function paper(title, body, buttons = "", extraClass = "") {
    return `<article class="paper ${extraClass}"><h1>${title}</h1>${body}${buttons}</article>`;
  }

  function btn(action, label, style = "button-primary", extra = "") {
    return `<button class="button ${style}" data-action="${action}" ${extra}>${label}</button>`;
  }

  function questionData() {
    const i = state.ui.step;
    const person = state.ui.person;
    const card = state.ui.card;
    if (state.ui.screen === "l1-q") {
      return { title: "LEVEL 1 — DENGARKAN", theme: "theme-green", questions: CONTENT.questions.l1, answers: state.answers.l1, path: `answers.l1.${i}`, hint: CONTENT.starters.l1[i], back: i === 0 ? "l1-intro" : null, nextLabel: i === 2 ? "SELESAI TANTANGAN" : "LANJUTKAN" };
    }
    if (state.ui.screen === "l2-q") {
      const name = person === "salsa" ? "Salsa" : "Rani";
      const questions = CONTENT.questions.l2[person];
      const starters = [CONTENT.starters.l2.thought, CONTENT.starters.l2.feeling, CONTENT.starters.l2.need];
      return { title: `LEVEL 2 — PAHAMI · MISI ${name.toUpperCase()}`, theme: "theme-orange", questions, answers: state.answers.l2[person], path: `answers.l2.${person}.${i}`, hint: starters[i].replace("{name}", name), back: i === 0 ? (person === "rani" ? "l2-salsa-last" : "l2-intro") : null, nextLabel: i === 2 && person === "salsa" ? "LANJUT KE MISI RANI" : i === 2 ? "SELESAIKAN MISI" : "LANJUTKAN", reminder: "Perasaan dan pikiran tokoh merupakan dugaan berdasarkan cerita, bukan fakta yang sudah pasti." };
    }
    if (state.ui.screen === "l3-q") {
      return { title: `LEVEL 3 — PILIHAN ${card}`, theme: "theme-purple", questions: CONTENT.questions.l3, answers: state.answers.l3.cards[card], path: `answers.l3.cards.${card}.${i}`, hint: "Menurutku, akibat yang mungkin terjadi adalah ...", back: i === 0 ? "l3-cards" : null, nextLabel: i === 3 ? "SIMPAN JAWABAN KARTU" : "LANJUTKAN" };
    }
    if (state.ui.screen === "l4-q") {
      return { title: "LEVEL 4 — TEMUKAN SOLUSI", theme: "theme-blue", questions: CONTENT.questions.l4, answers: state.answers.l4.q, path: `answers.l4.q.${i}`, hint: CONTENT.starters.l4, back: i === 0 ? "l4-intro" : null, nextLabel: i === 3 ? "SUSUN RENCANA AKSI" : "LANJUTKAN" };
    }
    return { title: "TELUK HARTA KARUN · REFLEKSI", theme: "theme-blue", questions: CONTENT.questions.final, answers: state.answers.final, path: `answers.final.${i}`, hint: "Pelajaran yang akan kuingat adalah ...", back: i === 0 ? "final-overview" : null, nextLabel: i === 2 ? "SELESAI & LIHAT RANGKUMAN" : "LANJUTKAN" };
  }

  function renderQuestion() {
    const data = questionData();
    const value = data.answers[state.ui.step] || "";
    const reminder = data.reminder ? `<p class="character-reminder">🧭 ${data.reminder}</p>` : "";
    const hint = state.ui.hintOpen ? `<div class="hint-box" role="status"><strong>Contoh awal kalimat:</strong><br>${escapeHtml(data.hint)}</div>` : "";
    const body = `${data.reminder ? "" : ""}<span class="step-badge">PERTANYAAN ${state.ui.step + 1} / ${data.questions.length}</span>
      ${reminder}<p class="question-text">${escapeHtml(data.questions[state.ui.step])}</p>
      <label class="visually-hidden" for="answer">Tulis jawabanmu</label>
      <textarea id="answer" class="answer-box" data-bind="${data.path}" minlength="${CONTENT.minChars}" placeholder="Tulis jawabanmu dengan kalimat sendiri..." rows="4">${escapeHtml(value)}</textarea>
      <p class="inline-error" id="answer-error" aria-live="polite"></p>
      <div class="button-row question-tools">${btn("hint", "🦜 Petunjuk Beo", "button-quiet button-small")}${btn("noop", `${value.length} karakter`, "button-quiet button-small", "disabled")}</div>${hint}`;
    const buttons = `<div class="button-row">${btn("question-back", "KEMBALI", "button-quiet")}${btn("question-next", data.nextLabel)}</div>`;
    return shell(data.title, data.theme, paper("Catat Petunjukmu", body, buttons, "question-paper"));
  }

  function mapIsland(island, index) {
    const locked = island.id > state.unlocked;
    const done = state.completed[index];
    const image = `assets/${islandAssets[index]}-${locked ? "lock" : "unlock"}.png`;
    const label = locked ? `Bagian ${island.id}: ${island.name}, terkunci` : `Bagian ${island.id}: ${island.name}${done ? ", selesai" : ""}`;
    const [x, y] = islandPositions[index];
    return `<button class="island island-${island.id}" style="--island-x:${x};--island-y:${y}" data-action="island" data-island="${island.id}" aria-label="${escapeHtml(label)}"${locked ? ' aria-disabled="true"' : ""}>
      <img src="${image}" alt=""></button>`;
  }

  function mapScreen() {
    const rewards = { compass: "🧭", heart: "💛", crystal: "💎", chest: "🏆" };
    const activeIndex = state.completed.findIndex((done, index) => !done && index < state.unlocked);
    const playerPin = activeIndex < 0 ? "" :
      `<img class="player-pin" src="assets/pin-karakter.png" style="--island-x:${islandPositions[activeIndex][0]};--island-y:${islandPositions[activeIndex][1]}" alt="Posisi pemain: ${escapeHtml(CONTENT.islands[activeIndex].name)}">`;
    return `<section class="screen map-screen" aria-labelledby="map-title">
      <button class="map-home-button" data-action="home" aria-label="Kembali ke beranda"><img src="assets/btn-homeldpi.png" alt="Kembali ke Beranda"></button>
      <header class="map-head"><h1 id="map-title" class="display-title visually-hidden">Peta Ekspedisi</h1><div class="progress-badge">🗺️ ${completedCount()} / 4 petunjuk</div></header>
      <div class="map-world">
        ${CONTENT.islands.map(mapIsland).join("")}
        ${playerPin}
      </div>
      <footer class="map-footer"><span class="reward-collection" aria-label="Koleksi petunjuk">${state.rewards.map((reward) => rewards[reward] || "").join(" ") || "🎒"}</span></footer>
      </section>`;
  }

  function storyScreen() {
    const index = state.ui.storyStep;
    const isReview = state.ui.storyReview;
    const copy = `<div class="story-art"><img class="story-illustration" src="assets/story-${index + 1}.webp?v=${storyAssetVersion}" alt="Ilustrasi adegan ${index + 1}: cerita Salsa dan Rani"></div>
      <div class="story-dots" aria-label="Adegan ${index + 1} dari 4">${CONTENT.story.map((_, i) => `<span class="story-dot${i === index ? " active" : ""}"></span>`).join("")}</div>
      <p class="story-copy">${escapeHtml(CONTENT.story[index])}</p>`;
    const buttons = `<div class="button-row">${index > 0 ? btn("story-prev", "SEBELUMNYA", "button-quiet") : `<span></span>`}
      ${index < 3 ? btn("story-next", "LANJUTKAN CERITA") : btn(isReview ? "story-return" : "story-finish", isReview ? "KEMBALI KE PETUALANGAN" : "LANJUTKAN →")}</div>`;
    return `<section class="screen story-screen"><header class="topbar"><button class="back-link" data-action="${isReview ? "story-return" : "map-back"}">${isReview ? "Kembali" : "Peta"}</button><p class="topbar-title">Gulungan Cerita · Adegan ${index + 1} / 4</p><span></span></header>${paper("Salsa & Rani", copy, buttons)}</section>`;
  }

  function introScreen(level, title, subtitle, action, label, theme) {
    const body = `<div class="level-intro-content"><div class="level-intro-art"><img class="illustration-emblem" src="assets/island${level}.png?v=${islandAssetVersion}" alt="Ilustrasi Pulau ${escapeHtml(CONTENT.islands[level - 1].name)}"></div><div class="level-intro-copy"><p class="lead">${escapeHtml(subtitle)}</p><p>Jelajahi cerita dengan pikiran terbuka. Tidak ada jawaban benar atau salah—yang penting, pikirkan dengan sungguh-sungguh.</p></div></div>`;
    return shell(title, theme, paper(escapeHtml(CONTENT.islands[level - 1].skill), body, `<div class="button-row center">${btn(action, label)}</div>`, "level-intro-paper"));
  }

  function cardsScreen() {
    const cards = ["A", "B", "C"];
    const done = (card) => state.answers.l3.cards[card].every((answer) => validAnswer(answer));
    const choices = cards.map((card) => `<button class="choice-card" data-action="l3-card" data-card="${card}"><span class="choice-letter">${card}</span>${escapeHtml(CONTENT.actions[card])}<span style="float:right">${done(card) ? "✅" : "↗️"}</span></button>`).join("");
    const allDone = cards.every(done);
    const body = `<p class="lead">Pertimbangkan satu per satu tindakan berikut. Jawab empat pertanyaan untuk setiap kartu.</p><div class="choice-grid">${choices}</div><p class="gentle-note">Kartu selesai: ${cards.filter(done).length} / 3</p>`;
    const buttons = `<div class="button-row">${btn("level-intro-back", "KEMBALI", "button-quiet")}${btn("l3-captain", "PERTIMBANGAN KAPTEN", "button-primary", allDone ? "" : "disabled")}</div>`;
    return shell("LEVEL 3 — PIKIRKAN", "theme-purple", paper("Tiga Pilihan Tindakan", body, buttons, "question-paper choice-question-paper"));
  }

  function captainNoteScreen() {
    const body = `<p class="lead">Bandingkan ketiga pilihan. Mana langkah yang paling tepat menurutmu, dan mengapa?</p><textarea class="answer-box" data-bind="answers.l3.captainNote" minlength="${CONTENT.minChars}" rows="5" placeholder="Menurutku pilihan yang paling tepat adalah ...">${escapeHtml(state.answers.l3.captainNote)}</textarea><p class="inline-error" id="note-error" aria-live="polite"></p>`;
    return shell("LEVEL 3 — PERTIMBANGAN KAPTEN", "theme-purple", paper("Tentukan Arah Kapal", body, `<div class="button-row">${btn("captain-back", "KEMBALI", "button-quiet")}${btn("captain-next", "TEMUKAN PETUNJUK")}</div>`, "question-paper"));
  }

  function planScreen() {
    const plan = state.answers.l4.plan;
    const body = `<p class="lead">Buat rencana yang aman, adil, dan mungkin dilakukan. Kamu boleh memperbaikinya setelah melihat petunjuk.</p>
      <div class="plan-fields">
        <label>Tindakan yang akan dilakukan<textarea class="answer-box" data-bind="answers.l4.plan.action" rows="3" placeholder="Aku akan ...">${escapeHtml(plan.action)}</textarea></label>
        <label>Cara melaksanakan tindakan<textarea class="answer-box" data-bind="answers.l4.plan.how" rows="3" placeholder="Caranya dengan ...">${escapeHtml(plan.how)}</textarea></label>
        <label>Waktu pelaksanaan<textarea class="answer-box short-box" data-bind="answers.l4.plan.when" rows="2" placeholder="Aku akan melakukannya ...">${escapeHtml(plan.when)}</textarea></label>
      </div><p class="inline-error" id="plan-error" aria-live="polite"></p>`;
    return shell("LEVEL 4 — RENCANA AKSI", "theme-blue", paper("Rencana Aksi Kapten", body, `<div class="button-row">${btn("l4-questions-back", "KEMBALI", "button-quiet")}${btn("plan-review", "PERIKSA RENCANA")}</div>`, "question-paper plan-question-paper"));
  }

  function keywordFound(text, keywords) {
    return keywords.some((word) => text.includes(word));
  }

  function planFeedback() {
    const plan = state.answers.l4.plan;
    const combined = `${plan.action} ${plan.how} ${plan.when}`.toLowerCase();
    const criteria = [
      ["Aman", keywordFound(combined, CONTENT.feedback.keywords.safe), "Bagaimana agar percakapan berlangsung dengan tenang dan aman?"],
      ["Adil bagi kedua pihak", keywordFound(combined, CONTENT.feedback.keywords.fair), "Apakah rencana ini adil bagi Salsa dan Rani?"],
      ["Realistis dilakukan", keywordFound(combined, CONTENT.feedback.keywords.realistic), "Apakah rencana ini bisa dilakukan dalam waktu dekat?"],
      ["Komunikasi dan tanggung jawab", keywordFound(combined, CONTENT.feedback.keywords.responsibility), "Bagian mana yang menunjukkan komunikasi dan tanggung jawab?"],
      ["Tanpa mempermalukan", !keywordFound(combined, CONTENT.feedback.keywords.humiliating), "Coba pikirkan lagi: adakah yang bisa membuat seseorang merasa malu?"]
    ];
    const timeMissing = !plan.when.trim() || !keywordFound(plan.when.toLowerCase(), CONTENT.feedback.keywords.time);
    const list = criteria.map(([name, passed, hint]) => `<li><span class="feedback-icon">${passed ? "⭐" : "💡"}</span><span><strong>${name}</strong>${passed ? " — sudah terpikirkan." : ` — ${hint}`}</span></li>`).join("");
    const time = timeMissing ? `<p class="gentle-note">⏰ Rencanamu belum menyebut waktu. Kapan kira-kira dilakukan?</p>` : "";
    const body = `<div class="plan-feedback-content"><p class="lead">Rencanamu adalah langkah awal yang baik. Periksa beberapa hal ini sebelum berlayar lagi:</p><ul class="feedback-list">${list}</ul>${time}<p class="gentle-note">Setiap konflik berbeda. Kamu boleh menyempurnakan rencana dengan cara yang terasa aman dan adil.</p></div>`;
    return shell("LEVEL 4 — UMPAN BALIK", "theme-blue", paper("Petunjuk untuk Rencanamu", body, `<div class="button-row">${btn("plan-edit", "PERBAIKI RENCANA", "button-quiet")}${btn("plan-continue", "LANJUTKAN")}</div>`, "plan-feedback-paper"));
  }

  function rewardScreen(level) {
    const details = {
      1: { icon: "🧭", title: "Petunjuk Pertama: Mengenali Masalah", message: "Hebat! Kamu telah menemukan Petunjuk Pertama: Mengenali Masalah.", action: "claim-1", label: "KLAIM PETUNJUK" },
      2: { icon: "💛", title: "Petunjuk Kedua: Empati", message: "Kamu berhasil melihat dua sudut pandang. Memahami seseorang bukan berarti membenarkan semua tindakannya.", action: "claim-2", label: "KLAIM PETUNJUK DAN BERLAYAR" },
      3: { icon: "💎", title: "Petunjuk Ketiga: Berpikir Sebelum Bertindak", message: "Kamu telah mempertimbangkan akibat dari setiap pilihan. Petunjuk Ketiga ditemukan!", action: "claim-3", label: "KLAIM PETUNJUK DAN LANJUTKAN" },
      4: { icon: "🏆", title: "Petunjuk Keempat: Solusi Bijak", message: "Peti harta karun terbuka! Kamu telah menyusun rencana solusi yang bijak.", action: "claim-4", label: "BUKA JALAN MENUJU HARTA KARUN" }
    }[level];
    const rewardAsset = level === 4 ? "harta.png" : `reward-${["compass", "heart", "crystal"][level - 1]}.png`;
    const body = `<div class="reward-emblem-stage"><img class="reward-emblem${level === 4 ? " reward-treasure" : ""}" src="assets/${rewardAsset}" alt="${escapeHtml(details.title)}"></div><p class="lead reward-message">${escapeHtml(details.message)}</p>`;
    return shell(`LEVEL ${level} — HADIAH`, `theme-${CONTENT.islands[level - 1].color}`, paper(escapeHtml(details.title), body, `<div class="button-row center">${btn(details.action, details.label)}</div>`, "reward-paper"));
  }

  function feedbackLevel2() {
    const body = `<div class="level2-feedback-art"><img class="story-illustration" src="assets/story-1.webp?v=${storyAssetVersion}" alt="Salsa dan Rani bersama di kelas"></div><div class="level2-feedback-copy"><p class="lead">Kamu berhasil melihat dua sudut pandang. Memahami seseorang bukan berarti membenarkan semua tindakannya.</p><p>Pikiran dan perasaan mereka adalah dugaan yang membantu kita berempati. Kita tetap bisa membicarakan dampak tindakan dengan jujur.</p></div>`;
    return shell("LEVEL 2 — EMPATI", "theme-orange", paper("Dua Sudut Pandang", body, `<div class="button-row center">${btn("l2-feedback-next", "LANJUT KE PETUNJUK")}</div>`, "level2-feedback-paper"));
  }

  function turningScreen() {
    const selected = state.answers.turningPoint.choice;
    const options = [
      ["A", "Terus diam dan menghindar."],
      ["B", "Membalas dengan sindiran."],
      ["C", "Berbicara secara pribadi dan asertif."]
    ].map(([letter, text]) => `<button class="choice-card${selected === letter ? " selected" : ""}" data-action="turn-choice" data-choice="${letter}" aria-pressed="${selected === letter}"><span class="choice-letter">${letter}</span>${text}</button>`).join("");
    const body = `<p class="lead">Badai menghadang perjalananmu! Sebelum melanjutkan, pikirkan arah tindakan yang akan membantu menyelesaikan konflik.</p><div class="choice-grid">${options}</div><p class="question-text">Menurutmu, apa kemungkinan akibat dari setiap pilihan tersebut?</p>
      <textarea class="answer-box" data-bind="answers.turningPoint.reason" rows="4" placeholder="Jika memilih A, mungkin ... Jika memilih B ...">${escapeHtml(state.answers.turningPoint.reason)}</textarea><p class="inline-error" id="turn-error" aria-live="polite"></p>`;
    return `<section class="screen turn-screen">${paper("⚡ Titik Balik — Persimpangan Badai", body, `<div class="button-row">${btn("map-back", "PETA", "button-quiet")}${btn("turn-next", "LANJUT KE PULAU PIKIRKAN")}</div>`, "question-paper turning-question-paper")}</section>`;
  }

  function transitionScreen() {
    const target = state.ui.sailTarget;
    const message = target === "turning" ? "Petunjuk kedua berhasil dikumpulkan. Badai menghadang di persimpangan!" :
      target === "final-overview" ? "Semua petunjuk terkumpul! Kapalmu menuju Teluk Harta Karun." :
      target === "l1-intro" ? "Angkat layar! Pulau Dengarkan menanti petunjuk pertamamu." :
      `Petunjuk berhasil dikumpulkan! Kapalmu siap menuju ${target === "l2-intro" ? "Pulau Pahami" : target === "l3-intro" ? "Pulau Pikirkan" : "Pulau Temukan Solusi"}.`;
    return `<section class="screen sail-screen"><p class="eyebrow">⛵ PELAYARAN</p><div class="sail-ship" aria-hidden="true"><img src="assets/loader.webp?v=${loaderAssetVersion}" alt=""></div><h1 class="display-title">${escapeHtml(message)}</h1><p>Ombak membawa kapalmu ke petualangan berikutnya...</p><div class="button-row">${btn("sail-skip", "LEWATI", "button-primary")}</div></section>`;
  }

  function finalOverview() {
    const skills = [
      ["🔭", "Dengarkan", "Kenali masalah."],
      ["💛", "Pahami", "Lihat sudut pandang dan perasaan."],
      ["💡", "Pikirkan", "Pertimbangkan konsekuensi."],
      ["⚓", "Temukan solusi", "Pilih tindakan yang aman, adil, dan realistis."]
    ];
    const cards = skills.map(([icon, name, detail]) => `<div class="skill-card"><span class="skill-icon">${icon}</span><strong>${name}</strong><span>${detail}</span></div>`).join("");
    const body = `<img class="treasure" src="assets/harta.png" alt="Harta karun berisi permata dan koin"><p class="eyebrow">MISI BERHASIL!</p><h1 class="display-title">HARTA KARUN PERSAHABATAN DITEMUKAN!</h1><p>Empat petunjuk telah membantumu memetakan jalan menuju solusi.</p><div class="skill-grid">${cards}</div>`;
    const buttons = `<div class="button-row center">${btn("final-reflections", "MULAI REFLEKSI", "button-primary")}</div>`;
    return `<section class="screen final-screen">${paper("", body, buttons, "final-overview-paper")}</section>`;
  }

  function finalDone() {
    const body = `<img class="treasure" src="assets/harta.png" alt="Harta karun berisi permata dan koin"><p class="eyebrow">PERJALANANMU SELESAI</p><h1 class="display-title">KAMU TELAH MENEMUKAN HARTA KARUN SOLUSI!</h1><p>Terima kasih sudah mendengarkan, memahami, berpikir, dan menyusun langkah yang bijak.</p>`;
    const buttons = `<div class="button-row">${btn("review-answers", "LIHAT RANGKUMAN JAWABAN")}${btn("restart", "ULANGI PETUALANGAN", "button-secondary")}</div>`;
    return `<section class="screen final-screen">${paper("", body, buttons, "final-done-paper")}</section>`;
  }

  function answerEntry(label, value) {
    return `<div class="summary-entry"><strong>${escapeHtml(label)}</strong><br>${value && value.trim() ? escapeHtml(value) : "<em>(belum diisi)</em>"}</div>`;
  }

  function summaryScreen() {
    const sections = [];
    sections.push(["Kapten", answerEntry("Nama kapten", state.captainName)]);
    sections.push(["Level 1 — Dengarkan", CONTENT.questions.l1.map((question, i) => answerEntry(question, state.answers.l1[i])).join("")]);
    sections.push(["Level 2 — Pahami · Salsa", CONTENT.questions.l2.salsa.map((question, i) => answerEntry(question, state.answers.l2.salsa[i])).join("")]);
    sections.push(["Level 2 — Pahami · Rani", CONTENT.questions.l2.rani.map((question, i) => answerEntry(question, state.answers.l2.rani[i])).join("")]);
    sections.push(["Titik Balik", answerEntry("Pilihan", state.answers.turningPoint.choice ? `${state.answers.turningPoint.choice}. ${state.answers.turningPoint.choice === "A" ? "Terus diam dan menghindar." : state.answers.turningPoint.choice === "B" ? "Membalas dengan sindiran." : "Berbicara secara pribadi dan asertif."}` : "") + answerEntry("Kemungkinan akibat", state.answers.turningPoint.reason)]);
    const actionTitles = { A: "Terus menghindari dan mengerjakan sendiri", B: "Membalas dengan sindiran", C: "Berbicara pribadi dan menyepakati tugas" };
    sections.push(["Level 3 — Pikirkan", ["A", "B", "C"].map((card) => `<h3>Kartu ${card}: ${actionTitles[card]}</h3>${CONTENT.questions.l3.map((question, i) => answerEntry(question, state.answers.l3.cards[card][i])).join("")}`).join("") + answerEntry("Pertimbangan Kapten", state.answers.l3.captainNote)]);
    sections.push(["Level 4 — Temukan Solusi", CONTENT.questions.l4.map((question, i) => answerEntry(question, state.answers.l4.q[i])).join("") + answerEntry("Tindakan", state.answers.l4.plan.action) + answerEntry("Cara", state.answers.l4.plan.how) + answerEntry("Waktu", state.answers.l4.plan.when)]);
    sections.push(["Refleksi Akhir", CONTENT.questions.final.map((question, i) => answerEntry(question, state.answers.final[i])).join("")]);
    const body = `<div class="summary-content"><p class="lead">Perjalanan dan jawaban yang sudah kamu tulis.</p>${sections.map(([title, entries]) => `<section class="summary-section"><h3>${title}</h3>${entries}</section>`).join("")}</div>`;
    return `<section class="screen level-screen summary-screen"><header class="topbar"><button class="back-link" data-action="summary-back">Kembali</button><p class="topbar-title">Ekspedisi Persahabatan</p><span></span></header>${paper("Rangkuman Jawaban", body, `<div class="button-row">${btn("print", "🖨️ CETAK / SIMPAN PDF", "button-primary")}${btn("summary-back", "KEMBALI", "button-quiet")}</div>`, "summary-paper")}</section>`;
  }

  function modalMarkup() {
    if (!state.ui.modal) return "";
    const modal = state.ui.modal;
    if (modal === "help") return `<div class="modal-backdrop" data-action="backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">Cara Bermain</h2><ol><li>Jelajahi pulau satu demi satu. Pulau baru terbuka setelah tantangan sebelumnya selesai.</li><li>Baca cerita Salsa dan Rani, lalu tulis jawaban dengan kalimatmu sendiri.</li><li>Gunakan Petunjuk Beo jika butuh awal kalimat. Jawaban tersimpan di perangkat ini.</li><li>Tidak ada nilai benar atau salah. Pikirkan solusi yang aman, adil, dan realistis.</li></ol><p><strong>Gunakan nama tokoh dalam ceritamu. Jika ada masalah nyata yang membuatmu tidak nyaman, ceritakan kepada guru BK.</strong></p><div class="button-row center">${btn("modal-close", "MENGERTI", "button-primary")}</div></section></div>`;
    if (modal === "captain-intro") return `<div class="modal-backdrop captain-backdrop"><form class="modal captain-name-modal" role="dialog" aria-modal="true" aria-labelledby="captain-modal-title"><h2 id="captain-modal-title">Perkenalkan dirimu, Kapten:</h2><label for="captain-name">Namamu</label><input id="captain-name" name="captainName" type="text" maxlength="40" autocomplete="name" placeholder="Tulis namamu di sini" required><p class="captain-name-error" id="captain-name-error" aria-live="polite"></p><div class="button-row center"><button class="button button-primary" type="submit">LANJUTKAN PELAYARAN</button></div></form></div>`;
    if (modal === "start") return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">Petualanganmu menunggu!</h2><p>Kami menemukan perjalanan yang tersimpan di perangkat ini.</p><div class="button-row">${btn("continue", "LANJUTKAN PERJALANAN", "button-primary")}${btn("fresh", "MULAI BARU", "button-quiet")}</div></section></div>`;
    if (modal === "restart") return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">Ulangi petualangan?</h2><p>Semua jawaban dan petunjuk yang tersimpan di perangkat ini akan dihapus.</p><div class="button-row">${btn("restart-cancel", "BATAL", "button-quiet")}${btn("restart-confirm", "YA, MULAI LAGI", "button-primary")}</div></section></div>`;
    return "";
  }

  function render() {
    const screens = {
      home: () => `<section class="screen home-screen"><h1 class="home-title"><img src="assets/Peta-Perjalanan-Konflik_1.webp" alt="Peta Perjalanan Konflik — Mari Selamatkan Persahabatan, Temukan Solusinya!"></h1><button class="captain-trigger" data-action="captain-dialog" aria-label="Ajak bicara kapten" aria-controls="captain-dialog" aria-expanded="false"><img class="captain-portrait" src="assets/captain.webp" alt=""></button><p class="captain-dialog" id="captain-dialog">Ayo ikuti petualangan<br>menyelesaikan konflik<br>Salsa dan Rani!</p><div class="button-row"><button class="button button-start-image" data-action="home-start" aria-label="Mulai petualangan"><img src="assets/btn-mulai.png" alt="Mulai Petualangan"></button><button class="button button-help-image" data-action="help" aria-label="Cara bermain"><img src="assets/btn-cara-bermain.png" alt="Cara Bermain"></button></div><p class="safety-note">Gunakan nama tokoh dalam ceritamu. Jika ada masalah nyata yang membuatmu tidak nyaman, ceritakan kepada guru BK.</p></section>`,
      map: mapScreen,
      story: storyScreen,
      mission: () => `<section class="screen mission-screen"><article class="paper level-intro-paper mission-paper"><h1>Misi: Berburu Harta Karun Solusi</h1><div class="level-intro-content mission-content"><div class="level-intro-art mission-art"><img class="illustration-emblem ship-large" src="assets/ship.webp?v=${shipAssetVersion}" alt="Kapten mengarungi laut dengan perahu"></div><div class="level-intro-copy mission-copy"><p class="lead">Kapten, persahabatan Salsa dan Rani sedang menghadapi badai konflik.</p><p>Kumpulkan empat petunjuk dan temukan harta karun berupa solusi yang adil!</p></div></div><div class="button-row mission-actions">${btn("mission-back", "KEMBALI", "button-quiet")}${btn("mission-go", "BERLAYAR KE PULAU 1")}</div></article></section>`,
      "l1-intro": () => introScreen(1, "LEVEL 1 — DENGARKAN", "Cari petunjuk untuk memahami apa yang sebenarnya terjadi.", "start-l1", "MULAI TANTANGAN", "theme-green"),
      "l1-q": renderQuestion,
      "l1-reward": () => rewardScreen(1),
      "l2-intro": () => introScreen(2, "LEVEL 2 — PAHAMI", "Untuk menemukan solusi, pahami perasaan kedua tokoh.", "start-l2", "MULAI TANTANGAN", "theme-orange"),
      "l2-q": renderQuestion,
      "l2-feedback": feedbackLevel2,
      "l2-reward": () => rewardScreen(2),
      turning: turningScreen,
      "l3-intro": () => introScreen(3, "LEVEL 3 — PIKIRKAN", "Gunakan kebijaksanaan kapten untuk menilai setiap pilihan.", "start-l3", "MULAI TANTANGAN", "theme-purple"),
      "l3-cards": cardsScreen,
      "l3-q": renderQuestion,
      "l3-note": captainNoteScreen,
      "l3-reward": () => rewardScreen(3),
      "l4-intro": () => introScreen(4, "LEVEL 4 — TEMUKAN SOLUSI", "Ini tantangan terakhir! Susun rencana untuk meredakan konflik dan memulihkan kerja sama.", "start-l4", "MULAI MISI FINAL", "theme-blue"),
      "l4-q": renderQuestion,
      "l4-plan": planScreen,
      "l4-feedback": planFeedback,
      "l4-reward": () => rewardScreen(4),
      sail: transitionScreen,
      "final-overview": finalOverview,
      "final-q": renderQuestion,
      "final-done": finalDone,
      summary: summaryScreen
    };
    root.innerHTML = `${(screens[state.ui.screen] || screens.home)()}${modalMarkup()}`;
    if (state.ui.toast) {
      root.insertAdjacentHTML("beforeend", `<div class="toast" role="status">${escapeHtml(state.ui.toast)}</div>`);
    }
    if (state.ui.screen === "home") {
      scheduleImagePreload("assets/map-sea.webp");
    } else if (state.ui.screen === "story") {
      const nextScene = state.ui.storyStep + 2;
      scheduleImagePreload(nextScene <= CONTENT.story.length
        ? `assets/story-${nextScene}.webp?v=${storyAssetVersion}`
        : `assets/ship.webp?v=${shipAssetVersion}`);
    }
  }

  function preloadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => image.decode().then(resolve, reject);
      image.onerror = () => reject(new Error(`Gagal memuat media: ${source}`));
      image.src = source;
      if (image.complete && image.naturalWidth > 0) image.decode().then(resolve, reject);
    });
  }

  async function preloadGameMedia() {
    const loader = document.getElementById("asset-loader");
    const progress = document.getElementById("asset-loader-progress");
    const percent = document.getElementById("asset-loader-percent");
    const message = document.getElementById("asset-loader-message");
    let loaded = 0;
    const tasks = gameMedia.map((source) => {
      const task = source.endsWith(".mp3")
        ? fetch(source).then((response) => {
          if (!response.ok) throw new Error(`Gagal memuat media (HTTP ${response.status}): ${source}`);
        })
        : preloadImage(source);
      return task.catch((error) => {
        console.error("Media game gagal dimuat.", error);
      }).finally(() => {
        loaded += 1;
        const value = Math.round((loaded / gameMedia.length) * 100);
        progress.value = value;
        percent.textContent = `${value}%`;
      });
    });
    await Promise.all(tasks);
    message.textContent = "Petualangan siap dimulai!";
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    loader.hidden = true;
  }

  function scheduleImagePreload(source) {
    if (preloadedImages.has(source)) return;
    preloadedImages.add(source);
    const preload = () => {
      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = "low";
      image.src = source;
    };
    if ("requestIdleCallback" in window) window.requestIdleCallback(preload, { timeout: 1500 });
    else window.setTimeout(preload, 300);
  }

  function updateCanvasScale() {
    const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    document.documentElement.style.setProperty("--game-scale", String(scale));
  }

  function validAnswer(text) {
    const value = String(text || "").trim();
    if (value.length < CONTENT.minChars) return false;
    const words = value.toLowerCase().match(/[a-zA-ZÀ-ÿ]+/g) || [];
    if (words.length >= 3 && new Set(words).size === 1) return false;
    if (value.length >= 10 && /^[^aeiouy\W\d_]+$/i.test(value)) return false;
    return true;
  }

  function showValidation(message, id) {
    const error = document.getElementById(id);
    if (error) error.textContent = message;
  }

  function setPath(path, value) {
    const parts = path.split(".");
    let target = state;
    for (let i = 0; i < parts.length - 1; i += 1) target = target[parts[i]];
    target[parts[parts.length - 1]] = value;
    save();
  }

  function goBackQuestion() {
    if (state.ui.step > 0) {
      state.ui.step -= 1;
      state.ui.hintOpen = false;
      save();
      render();
      return;
    }
    const data = questionData();
    if (data.back === "l2-salsa-last") {
      state.ui.person = "salsa";
      state.ui.step = 2;
      save();
      render();
    } else if (data.back === "final-overview") {
      setScreen("final-overview");
    } else {
      setScreen(data.back || "map");
    }
  }

  function nextQuestion() {
    const data = questionData();
    const answer = data.answers[state.ui.step];
    if (!validAnswer(answer)) {
      showValidation((answer || "").trim().length < CONTENT.minChars ? "Ceritakan sedikit lebih banyak, Kapten." : "Coba tulis dengan kalimatmu sendiri, ya.");
      return;
    }
    if (state.ui.step < data.questions.length - 1) {
      state.ui.step += 1;
      state.ui.hintOpen = false;
      save();
      render();
      return;
    }
    state.ui.step = 0;
    if (state.ui.screen === "l1-q") setScreen("l1-reward");
    else if (state.ui.screen === "l2-q" && state.ui.person === "salsa") {
      state.ui.person = "rani";
      setScreen("l2-q");
    } else if (state.ui.screen === "l2-q") setScreen("l2-feedback");
    else if (state.ui.screen === "l3-q") setScreen("l3-cards");
    else if (state.ui.screen === "l4-q") setScreen("l4-plan");
    else if (state.ui.screen === "final-q") setScreen("final-done");
  }

  function sailTo(target) {
    state.ui.sailTarget = target;
    setScreen("sail");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.clearTimeout(sailTimer);
      sailTimer = window.setTimeout(finishSail, 30);
    } else {
      window.clearTimeout(sailTimer);
      sailTimer = window.setTimeout(finishSail, 5000);
    }
  }

  function finishSail() {
    window.clearTimeout(sailTimer);
    const target = state.ui.sailTarget;
    state.ui.sailTarget = "";
    setScreen(target === "turning" ? "turning" : target === "final-overview" ? "final-overview" : target === "l1-intro" ? "l1-intro" : "map");
  }

  function openStory(review) {
    state.ui.storyReturnTo = state.ui.screen;
    state.ui.storyReview = review;
    state.ui.storyStep = 0;
    setScreen("story");
  }

  function finishStory() {
    if (state.ui.storyReview) {
      setScreen(state.ui.storyReturnTo || "map");
      state.ui.storyReview = false;
      return;
    }
    state.storyDone = true;
    setScreen("mission");
  }

  function showToast(message) {
    state.ui.toast = message;
    render();
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      state.ui.toast = "";
      render();
    }, 3200);
  }

  function rewardClaim(level) {
    const reward = ["compass", "heart", "crystal", "chest"][level - 1];
    state.completed[level - 1] = true;
    state.unlocked = Math.max(state.unlocked, level === 2 ? 2 : level + 1);
    if (!state.rewards.includes(reward)) state.rewards.push(reward);
    saveNow();
    const target = level === 1 ? "l2-intro" : level === 2 ? "turning" : level === 3 ? "l4-intro" : "final-overview";
    sailTo(target);
  }

  function startFresh() {
    window.clearTimeout(saveTimer);
    state = defaultState();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Simpanan lama tidak dapat dihapus pada perangkat ini.", error);
    }
    state.ui.screen = "home";
    saveNow();
    render();
  }

  root.addEventListener("input", (event) => {
    const target = event.target;
    if (target instanceof HTMLTextAreaElement && target.dataset.bind) {
      setPath(target.dataset.bind, target.value);
      const counter = target.parentElement.querySelector(".character-counter");
      if (counter) counter.textContent = `${target.value.length} karakter`;
    }
  });

  root.addEventListener("pointerleave", (event) => {
    if (event.target.matches(".captain-trigger")) {
      event.target.closest(".home-screen").classList.remove("captain-dialog-dismissed");
    }
  }, true);

  root.addEventListener("focusout", (event) => {
    if (event.target.matches(".captain-trigger")) {
      event.target.closest(".home-screen").classList.remove("captain-dialog-dismissed");
    }
  }, true);

  root.addEventListener("submit", (event) => {
    const form = event.target.closest(".captain-name-modal");
    if (!form) return;
    event.preventDefault();
    const input = form.elements.namedItem("captainName");
    const name = input.value.trim();
    const error = form.querySelector("#captain-name-error");
    if (!name) {
      error.textContent = "Tulis namamu dulu sebelum melanjutkan pelayaran.";
      input.focus();
      return;
    }
    state.captainName = name;
    state.ui.modal = null;
    saveNow();
    render();
    startBackgroundMusic();
  });

  root.addEventListener("input", (event) => {
    if (event.target.matches("#captain-name")) {
      const error = event.target.form.querySelector("#captain-name-error");
      if (event.target.value.trim()) error.textContent = "";
    }
  });

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    switch (action) {
      case "captain-dialog": {
        const isOpen = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!isOpen));
        const homeScreen = button.closest(".home-screen");
        homeScreen.classList.toggle("captain-dialog-open", !isOpen);
        homeScreen.classList.toggle("captain-dialog-dismissed", isOpen);
        break;
      }
      case "help": state.ui.modal = "help"; render(); break;
      case "modal-close": state.ui.modal = null; render(); break;
      case "home-start":
        if (hasProgress()) { state.ui.modal = "start"; render(); }
        else {
          setScreen("map");
          state.ui.modal = "captain-intro";
          render();
          root.querySelector("#captain-name")?.focus();
        }
        break;
      case "continue":
        state.ui.modal = null;
        setScreen(state.ui.resumeScreen || "map");
        if (state.ui.screen === "map" && !state.captainName) {
          state.ui.modal = "captain-intro";
          render();
          root.querySelector("#captain-name")?.focus();
        }
        break;
      case "fresh": startFresh(); break;
      case "home": state.ui.resumeScreen = state.ui.screen; setScreen("home"); break;
      case "map-back": setScreen("map"); break;
      case "island": {
        const island = Number(button.dataset.island);
        if (island > state.unlocked) {
          showToast("Selesaikan tantangan sebelumnya agar kapalmu dapat berlayar lebih jauh!");
        } else if (island === 5) {
          setScreen("final-overview");
        } else if (island === 1 && !state.storyDone) {
          state.ui.storyReview = false;
          state.ui.storyStep = 0;
          setScreen("story");
        } else {
          setScreen(`l${island}-intro`);
        }
        break;
      }
      case "story-prev": state.ui.storyStep = Math.max(0, state.ui.storyStep - 1); save(); render(); break;
      case "story-next": state.ui.storyStep = Math.min(3, state.ui.storyStep + 1); save(); render(); break;
      case "story-finish": finishStory(); break;
      case "story-return":
        if (state.ui.storyReview) finishStory();
        else setScreen("map");
        break;
      case "mission-back": setScreen("map"); break;
      case "mission-go": sailTo("l1-intro"); break;
      case "read-story": openStory(true); break;
      case "start-l1": state.ui.step = 0; setScreen("l1-q"); break;
      case "start-l2": state.ui.person = "salsa"; state.ui.step = 0; setScreen("l2-q"); break;
      case "start-l3": setScreen("l3-cards"); break;
      case "start-l4": state.ui.step = 0; setScreen("l4-q"); break;
      case "level-intro-back": setScreen("l3-intro"); break;
      case "l3-card": state.ui.card = button.dataset.card; state.ui.step = 0; setScreen("l3-q"); break;
      case "l3-captain": setScreen("l3-note"); break;
      case "captain-back": setScreen("l3-cards"); break;
      case "captain-next":
        if (!validAnswer(state.answers.l3.captainNote)) showValidation("Ceritakan sedikit lebih banyak, Kapten.", "note-error");
        else setScreen("l3-reward");
        break;
      case "hint": state.ui.hintOpen = !state.ui.hintOpen; render(); break;
      case "question-back": goBackQuestion(); break;
      case "question-next": nextQuestion(); break;
      case "l2-salsa-last": break;
      case "l2-feedback-next": setScreen("l2-reward"); break;
      case "claim-1": rewardClaim(1); break;
      case "claim-2": rewardClaim(2); break;
      case "claim-3": rewardClaim(3); break;
      case "claim-4": rewardClaim(4); break;
      case "sail-skip": finishSail(); break;
      case "turn-choice": state.answers.turningPoint.choice = button.dataset.choice; save(); render(); break;
      case "turn-next":
        if (!state.answers.turningPoint.choice || !validAnswer(state.answers.turningPoint.reason)) {
          showValidation(!state.answers.turningPoint.choice ? "Pilih satu arah tindakan, Kapten." : "Ceritakan sedikit lebih banyak tentang akibat pilihanmu.", "turn-error");
          break;
        }
        state.turningPointDone = true;
        state.unlocked = Math.max(state.unlocked, 3);
        saveNow();
        setScreen("map");
        break;
      case "l4-questions-back": state.ui.step = 3; setScreen("l4-q"); break;
      case "plan-review": {
        const plan = state.answers.l4.plan;
        if (![plan.action, plan.how, plan.when].every(validAnswer)) {
          showValidation("Lengkapi sedikit lagi ketiga bagian rencana aksimu, Kapten.", "plan-error");
          break;
        }
        setScreen("l4-feedback");
        break;
      }
      case "plan-edit": setScreen("l4-plan"); break;
      case "plan-continue": setScreen("l4-reward"); break;
      case "final-reflections": state.ui.step = 0; setScreen("final-q"); break;
      case "review-answers": setScreen("summary"); break;
      case "summary-back": setScreen("final-done"); break;
      case "print": window.print(); break;
      case "restart": state.ui.modal = "restart"; render(); break;
      case "restart-cancel": state.ui.modal = null; render(); break;
      case "restart-confirm": startFresh(); break;
      case "backdrop":
        if (event.target === button && state.ui.modal === "help") { state.ui.modal = null; render(); }
        break;
      default: break;
    }
  });

  root.addEventListener("pointerdown", (event) => {
    if (event.target.closest("#music-toggle")) return;
    if (event.target.closest('[data-action="home-start"], .captain-name-modal')) return;
    if (!musicEnabled) return;
    if (musicSource || musicLoading) resumeBackgroundMusic();
    else startBackgroundMusic();
  });

  musicToggle.addEventListener("error", () => {
    console.error("Ikon musik tidak dapat dimuat.", musicIcon.src);
  }, true);

  window.addEventListener("beforeunload", saveNow);
  window.addEventListener("resize", updateCanvasScale);
  window.addEventListener("orientationchange", updateCanvasScale);
  preloadGameMedia().then(() => {
    updateCanvasScale();
    if (state.ui.screen === "map" && !state.captainName) state.ui.modal = "captain-intro";
    render();
    root.querySelector("#captain-name")?.focus();
    if (state.ui.screen === "sail") {
      sailTimer = window.setTimeout(finishSail, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 30 : 2400);
    }
  });
})();
