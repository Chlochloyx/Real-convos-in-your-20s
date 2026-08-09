(function () {
  var toggle = document.querySelector(".nav-toggle");
  var panel = document.querySelector(".mobile-panel");

  if (toggle && panel) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      panel.classList.toggle("open", !open);
      document.body.style.overflow = !open ? "hidden" : "";
    });

    panel.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        toggle.setAttribute("aria-expanded", "false");
        panel.classList.remove("open");
        document.body.style.overflow = "";
      });
    });
  }

  var moodButtons = document.querySelectorAll(".mood-btn");
  var moodResponse = document.getElementById("mood-response");

  if (moodButtons.length && moodResponse) {
    moodButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        moodButtons.forEach(function (b) { b.classList.remove("picked"); });
        btn.classList.add("picked");
        moodResponse.textContent = btn.getAttribute("data-msg") || "";
      });
    });
  }

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!prefersReduced && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll(".reveal").forEach(function (el) {
      observer.observe(el);
    });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("in-view");
    });
  }

  /* -------------------------------------------------------------
     the shared roll (share.html): topic filter chips
     ------------------------------------------------------------- */

  var chips = document.querySelectorAll(".topic-chip");
  if (chips.length) {
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        var filter = chip.getAttribute("data-filter");
        document.querySelectorAll(".pin-card[data-topic]").forEach(function (card) {
          var show = filter === "all" || card.getAttribute("data-topic") === filter;
          card.style.display = show ? "" : "none";
        });
      });
    });
  }

  /* -------------------------------------------------------------
     the shared roll: pin-it form, saved locally on this device
     (no backend here — this is a client-only preview of the feature)
     ------------------------------------------------------------- */

  var STORAGE_KEY = "fnm-shared-stories";
  var pinGrid = document.getElementById("pin-grid");
  var pinForm = document.getElementById("pin-form");
  var pinToast = document.getElementById("pin-toast");
  var emptyCard = document.getElementById("pin-empty-cta");
  var rotations = ["-2deg", "1.5deg", "-1deg"];
  var topicLabels = {
    exchange: "🌱 exchange",
    travel: "🐢 travel abroad",
    pressure: "🐹 family pressure",
    career: "📔 career pressure",
    deep: "💭 late-night thoughts",
    random: "🍵 random"
  };

  function loadStoredPins() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveStoredPins(list) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      /* storage unavailable (private mode, etc.) — pin still renders this session */
    }
  }

  var petIcons = {
    matcha: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M20 6C29 6 35 14 35 22C35 30 28 34 20 34C12 34 5 30 5 22C5 14 11 6 20 6Z" fill="var(--matcha)" stroke="var(--matcha-deep)" stroke-width="2"/><path d="M20 6C20 6 18 2 22 0" stroke="var(--matcha-deep)" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="15" cy="20" r="2" fill="var(--ink)"/><circle cx="25" cy="20" r="2" fill="var(--ink)"/><path d="M15 26C17.5 28.5 22.5 28.5 25 26" stroke="var(--ink)" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    clay: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none"><circle cx="10" cy="8" r="5" fill="var(--clay)" stroke="var(--clay-deep)" stroke-width="2"/><circle cx="30" cy="8" r="5" fill="var(--clay)" stroke="var(--clay-deep)" stroke-width="2"/><path d="M20 8C29 8 35 15 35 22C35 30 28 34 20 34C12 34 5 30 5 22C5 15 11 8 20 8Z" fill="var(--clay)" stroke="var(--clay-deep)" stroke-width="2"/><circle cx="15" cy="21" r="2" fill="var(--ink)"/><circle cx="25" cy="21" r="2" fill="var(--ink)"/><path d="M17 27C18.5 28.5 21.5 28.5 23 27" stroke="var(--ink)" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    cream: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none"><circle cx="20" cy="20" r="15" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/><circle cx="15" cy="19" r="2" fill="var(--ink)"/><circle cx="25" cy="19" r="2" fill="var(--ink)"/><circle cx="11" cy="24" r="2.6" fill="var(--clay)" opacity="0.5"/><circle cx="29" cy="24" r="2.6" fill="var(--clay)" opacity="0.5"/><path d="M16 25C18 27 22 27 24 25" stroke="var(--ink)" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    house: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.5 12.5L12 5L20.5 12.5" fill="#D97A3F" stroke="#B85A28" stroke-width="1.6" stroke-linejoin="round"/><path d="M6.5 11V18.5C6.5 19.3 7.2 20 8 20H16C16.8 20 17.5 19.3 17.5 18.5V11" fill="#FFF8E9" stroke="#B85A28" stroke-width="1.6" stroke-linejoin="round"/><path d="M10.2 20V16C10.2 15.4 10.7 15 11.2 15H12.8C13.3 15 13.8 15.4 13.8 16V20" fill="#557123" stroke="#3D4A22" stroke-width="1.1" stroke-linejoin="round"/><circle cx="12.9" cy="17.5" r="0.5" fill="#FFF8E9"/></svg>',
    plant: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 13H15L14.2 20.5C14.1 20.8 13.9 21 13.6 21H10.4C10.1 21 9.9 20.8 9.8 20.5L9 13Z" fill="#D97A3F" stroke="#B85A28" stroke-width="1.5" stroke-linejoin="round"/><path d="M8.5 13H15.5" stroke="#B85A28" stroke-width="1.4" stroke-linecap="round"/><path d="M12 13C12 13 12.5 7 9.5 4.5C9.5 4.5 13.5 3.3 13.8 8" fill="#8CAF3E" stroke="#557123" stroke-width="1.3" stroke-linejoin="round"/><path d="M12 13C12 13 11.5 6.5 15.3 5C15.3 5 12 4 11 8" fill="#8CAF3E" stroke="#557123" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    cup: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 9H17L16 19C16 20 15 21 14 21H8C7 21 6 20 6 19L5 9Z" fill="#FFF8E9" stroke="#2B2114" stroke-width="1.6" stroke-linejoin="round"/><path d="M6.4 11H15.6L15 17.5C14.9 18.6 14.3 19.3 13.3 19.3H8.7C7.7 19.3 7.1 18.6 7 17.5L6.4 11Z" fill="#8CAF3E"/></svg>'
  };

  var petPicker = document.querySelector(".pet-picker");
  var pinPetInput = document.getElementById("pin-pet");
  if (petPicker && pinPetInput) {
    var petChoices = petPicker.querySelectorAll(".pet-choice");
    petChoices.forEach(function (choice) {
      choice.addEventListener("click", function () {
        petChoices.forEach(function (c) {
          c.classList.remove("selected");
          c.setAttribute("aria-pressed", "false");
        });
        choice.classList.add("selected");
        choice.setAttribute("aria-pressed", "true");
        pinPetInput.value = choice.getAttribute("data-pet") || "matcha";
      });
    });
  }

  function renderPin(entry, animate) {
    if (!pinGrid) return;
    var pinId = entry.id || ("user-" + Date.now() + "-" + Math.floor(Math.random() * 1000));
    var card = document.createElement("div");
    card.className = "pin-card";
    card.setAttribute("data-topic", entry.topic);
    card.setAttribute("data-pin-id", pinId);
    var rot = rotations[Math.floor(Math.random() * rotations.length)];
    card.style.transform = "rotate(" + rot + ")";

    var del = document.createElement("button");
    del.type = "button";
    del.className = "pin-delete";
    del.setAttribute("data-pin-id", pinId);
    del.setAttribute("aria-label", "delete this pin");
    del.innerHTML = "&times;";
    card.appendChild(del);

    var dot = document.createElement("span");
    dot.className = "pin-dot";

    var date = document.createElement("span");
    date.className = "pin-date";
    date.textContent = topicLabels[entry.topic] || entry.topic;

    var text = document.createElement("p");
    text.textContent = entry.text;

    var sign = document.createElement("span");
    sign.className = "pin-sign";
    sign.textContent = "\u00b7 " + (entry.sign || "anonymous");

    card.appendChild(dot);
    card.appendChild(date);
    if (entry.pet && petIcons[entry.pet]) {
      var icon = document.createElement("span");
      icon.className = "pin-icon";
      icon.innerHTML = petIcons[entry.pet];
      card.appendChild(icon);
    }
    card.appendChild(text);
    card.appendChild(sign);

    // only give it a thread button on pages that actually have the thread modal wired up
    if (document.getElementById("thread-modal")) {
      var threadBtn = document.createElement("button");
      threadBtn.type = "button";
      threadBtn.className = "thread-btn";
      threadBtn.setAttribute("data-pin-id", pinId);
      threadBtn.innerHTML = '💬 <span class="reply-count">0</span> replies';
      card.appendChild(threadBtn);
      wireThreadButton(threadBtn);
    }

    if (animate) {
      card.style.opacity = "0";
      card.style.transition = "opacity 0.4s ease";
    }

    if (emptyCard && emptyCard.parentNode === pinGrid) {
      pinGrid.insertBefore(card, emptyCard);
    } else {
      pinGrid.appendChild(card);
    }

    if (animate) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { card.style.opacity = "1"; });
      });
    }
    refreshReplyCounts();
  }

  if (pinGrid) {
    loadStoredPins().forEach(function (entry) { renderPin(entry, false); });
  }

  /* -------------------------------------------------------------
     admin: a lightweight, client-side way to hide inappropriate
     pins. there's no real server behind this site yet, so this
     only affects what this specific browser/device shows, not what
     other visitors see on theirs. once there's a real shared
     backend, moderation should move server-side.
     ------------------------------------------------------------- */

  var ADMIN_PASSCODE = "chloematcha";
  var ADMIN_KEY = "fnm-admin-mode";
  var HIDDEN_SEEDS_KEY = "fnm-hidden-seeds";
  var adminToggle = document.getElementById("admin-toggle");
  var adminExit = document.getElementById("admin-exit");
  var adminBar = document.getElementById("admin-bar");
  var adminForm = document.getElementById("admin-form");
  var adminActive = document.getElementById("admin-active");
  var adminPasscodeInput = document.getElementById("admin-passcode");
  var adminError = document.getElementById("admin-error");

  function loadHiddenSeeds() {
    try {
      var raw = window.localStorage.getItem(HIDDEN_SEEDS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function hideSeedPin(pinId) {
    try {
      var hidden = loadHiddenSeeds();
      if (hidden.indexOf(pinId) === -1) {
        hidden.push(pinId);
        window.localStorage.setItem(HIDDEN_SEEDS_KEY, JSON.stringify(hidden));
      }
    } catch (e) {
      /* storage unavailable, pin still disappears for this page view */
    }
  }

  function removeThreadFor(pinId) {
    try {
      var raw = window.localStorage.getItem(THREAD_KEY);
      var all = raw ? JSON.parse(raw) : {};
      if (all[pinId]) {
        delete all[pinId];
        window.localStorage.setItem(THREAD_KEY, JSON.stringify(all));
      }
    } catch (e) {
      /* ignore */
    }
  }

  // everything here is plain in-page UI on purpose. window.prompt/alert/confirm
  // get silently blocked inside a sandboxed preview iframe (like this one on
  // claude.ai), so relying on them made the whole feature look broken.
  function showAdminBar(view) {
    if (!adminBar) return;
    adminBar.classList.add("visible");
    if (adminForm) adminForm.hidden = view !== "form";
    if (adminActive) adminActive.hidden = view !== "active";
  }

  function hideAdminBar() {
    if (adminBar) adminBar.classList.remove("visible");
  }

  function setAdminMode(on) {
    document.body.classList.toggle("admin-mode", on);
    try {
      window.localStorage.setItem(ADMIN_KEY, on ? "1" : "");
    } catch (e) {
      /* ignore */
    }
    if (on) {
      showAdminBar("active");
    } else {
      hideAdminBar();
    }
  }

  if (pinGrid) {
    // hide any seed pins this admin already removed on this device
    loadHiddenSeeds().forEach(function (pinId) {
      var el = pinGrid.querySelector('.pin-card[data-pin-id="' + pinId + '"]');
      if (el) el.remove();
    });

    var alreadyAdmin = false;
    try { alreadyAdmin = window.localStorage.getItem(ADMIN_KEY) === "1"; } catch (e) { /* ignore */ }
    if (alreadyAdmin) setAdminMode(true);

    if (adminToggle) {
      adminToggle.addEventListener("click", function () {
        if (document.body.classList.contains("admin-mode")) return;
        if (adminError) adminError.textContent = "";
        if (adminPasscodeInput) adminPasscodeInput.value = "";
        showAdminBar("form");
        if (adminPasscodeInput) adminPasscodeInput.focus();
      });
    }

    if (adminForm) {
      adminForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var code = adminPasscodeInput ? adminPasscodeInput.value.trim() : "";
        if (code === ADMIN_PASSCODE) {
          setAdminMode(true);
        } else if (adminError) {
          adminError.textContent = "that's not it, try again";
          if (adminPasscodeInput) { adminPasscodeInput.value = ""; adminPasscodeInput.focus(); }
        }
      });
    }

    if (adminExit) {
      adminExit.addEventListener("click", function () { setAdminMode(false); });
    }

    pinGrid.addEventListener("click", function (e) {
      var btn = e.target.closest(".pin-delete");
      if (!btn) return;
      var pinId = btn.getAttribute("data-pin-id");
      if (!pinId) return;

      // first click arms it (so a stray click can't nuke a real post),
      // second click within a few seconds actually deletes it
      if (!btn.classList.contains("confirming")) {
        btn.classList.add("confirming");
        btn.innerHTML = "sure?";
        btn.setAttribute("aria-label", "click again to confirm delete");
        clearTimeout(btn._confirmTimer);
        btn._confirmTimer = setTimeout(function () {
          btn.classList.remove("confirming");
          btn.innerHTML = "&times;";
          btn.setAttribute("aria-label", "delete this pin");
        }, 3000);
        return;
      }

      if (pinId.indexOf("seed-") === 0) {
        hideSeedPin(pinId);
      } else {
        var stored = loadStoredPins().filter(function (entry) { return entry.id !== pinId; });
        saveStoredPins(stored);
      }
      removeThreadFor(pinId);
      var card = btn.closest(".pin-card");
      if (card) card.remove();
      refreshReplyCounts();
    });
  }

  if (pinForm) {
    pinForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var topicEl = document.getElementById("pin-topic");
      var textEl = document.getElementById("pin-text");
      var signEl = document.getElementById("pin-sign");
      var text = textEl ? textEl.value.trim() : "";
      if (!text) return;

      var entry = {
        id: "user-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        topic: topicEl ? topicEl.value : "random",
        text: text,
        sign: signEl ? signEl.value.trim() : "",
        pet: pinPetInput ? pinPetInput.value : "matcha"
      };

      var stored = loadStoredPins();
      stored.push(entry);
      saveStoredPins(stored);
      renderPin(entry, true);
      pinForm.reset();
      if (petPicker && pinPetInput) {
        pinPetInput.value = "matcha";
        petPicker.querySelectorAll(".pet-choice").forEach(function (c) {
          var isMatcha = c.getAttribute("data-pet") === "matcha";
          c.classList.toggle("selected", isMatcha);
          c.setAttribute("aria-pressed", isMatcha ? "true" : "false");
        });
      }

      if (pinToast) {
        pinToast.textContent = "pinned it up, saved on this device for now 🫂";
        setTimeout(function () { pinToast.textContent = ""; }, 4000);
      }
    });
  }

  if (emptyCard) {
    var focusStory = function () {
      var target = document.getElementById("pin-text");
      if (target) target.focus();
    };
    emptyCard.addEventListener("click", focusStory);
    emptyCard.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        focusStory();
      }
    });
  }

  /* -------------------------------------------------------------
     the corner nook: an in-browser photobooth built from the
     visitor's own photos. nothing is uploaded anywhere, the strip
     is just a canvas image put together on their own device.
     ------------------------------------------------------------- */

  var photoboothBtn = document.getElementById("photobooth-btn");
  var photoboothModal = document.getElementById("photobooth-modal");
  var photoboothClose = document.getElementById("photobooth-close");

  var pbViews = {
    start: document.getElementById("photobooth-start-view"),
    result: document.getElementById("photobooth-result-view")
  };
  var pbUploadBtn = document.getElementById("photobooth-upload-btn");
  var pbRetakeBtn = document.getElementById("photobooth-retake");
  var pbFileInput = document.getElementById("photobooth-file-input");
  var pbCanvas = document.getElementById("photobooth-canvas");
  var pbDownload = document.getElementById("photobooth-download");
  var pbErrorText = document.getElementById("photobooth-error-text");

  function pbShowView(name) {
    Object.keys(pbViews).forEach(function (key) {
      if (pbViews[key]) pbViews[key].hidden = key !== name;
    });
  }

  /* a tiny hand-drawn pet, matching the ones on the corner-nook beanbags,
     for decorating the corners of the printed strip */
  function pbDrawPet(ctx, cx, cy, r, type, rotationDeg) {
    var palette = {
      matcha: { body: "#8CAF3E", edge: "#557123" },
      clay: { body: "#D97A3F", edge: "#B85A28" },
      cream: { body: "#FFEFD3", edge: "#2B2114" }
    };
    var c = palette[type] || palette.matcha;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(((rotationDeg || 0) * Math.PI) / 180);

    if (type === "clay") {
      ctx.fillStyle = c.body;
      ctx.strokeStyle = c.edge;
      ctx.lineWidth = Math.max(1.2, r * 0.1);
      [-1, 1].forEach(function (side) {
        ctx.beginPath();
        ctx.arc(side * r * 0.6, -r * 0.75, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = c.body;
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.strokeStyle = c.edge;
    ctx.stroke();

    if (type === "matcha") {
      ctx.beginPath();
      ctx.strokeStyle = c.edge;
      ctx.lineWidth = Math.max(1.2, r * 0.1);
      ctx.lineCap = "round";
      ctx.moveTo(0, -r * 0.95);
      ctx.quadraticCurveTo(r * 0.28, -r * 1.35, r * 0.05, -r * 1.6);
      ctx.stroke();
    }

    if (type === "cream") {
      ctx.fillStyle = "rgba(217,122,63,0.45)";
      ctx.beginPath();
      ctx.arc(-r * 0.55, r * 0.18, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r * 0.55, r * 0.18, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }

    var eyeOffsetX = r * 0.32;
    var eyeR = Math.max(1.2, r * 0.11);
    ctx.fillStyle = "#2B2114";
    ctx.beginPath(); ctx.arc(-eyeOffsetX, -r * 0.05, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeOffsetX, -r * 0.05, eyeR, 0, Math.PI * 2); ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = "#2B2114";
    ctx.lineWidth = Math.max(1, r * 0.09);
    ctx.lineCap = "round";
    ctx.arc(0, r * 0.05, r * 0.35, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    ctx.restore();
  }

  /* strip geometry lives in one place so the camera path and the upload
     path (and the matcha decoration) all draw onto the exact same layout */
  function pbGeometry(shots) {
    var margin = 30, gap = 18, cellSize = 240, topMargin = 40, captionHeight = 86;
    var width = cellSize + margin * 2;
    var height = topMargin + cellSize * shots + gap * (shots - 1) + captionHeight;
    return { margin: margin, gap: gap, cellSize: cellSize, topMargin: topMargin, captionHeight: captionHeight, width: width, height: height, shots: shots };
  }

  function pbPaintBackground(ctx, geo) {
    var grad = ctx.createLinearGradient(0, 0, 0, geo.height);
    grad.addColorStop(0, "#F2F4DC");
    grad.addColorStop(1, "#FBF3E3");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, geo.width, geo.height);

    // little matcha bowl doodle up top, so it reads as "field notes & matcha" before you even hit the caption
    ctx.save();
    ctx.translate(geo.width / 2, geo.topMargin / 2 + 2);
    ctx.strokeStyle = "#557123";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.ellipse(0, 2, 13, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-11, 0); ctx.quadraticCurveTo(-13, 9, -6, 11);
    ctx.moveTo(11, 0); ctx.quadraticCurveTo(13, 9, 6, 11);
    ctx.stroke();
    ctx.restore();

    // pet stickers tucked into the side margins so they never sit on top of a photo
    pbDrawPet(ctx, geo.margin * 0.52, geo.topMargin + geo.cellSize * 0.5, 15, "matcha", -8);
    pbDrawPet(ctx, geo.width - geo.margin * 0.52, geo.topMargin + geo.cellSize * 1.5 + geo.gap, 14, "clay", 10);
    pbDrawPet(ctx, geo.margin * 0.52, geo.topMargin + geo.cellSize * 2.5 + geo.gap * 2, 13, "cream", -6);
  }

  function pbDrawFrame(ctx, geo, index) {
    var y = geo.topMargin + index * (geo.cellSize + geo.gap);
    var pad = 6;
    ctx.save();
    ctx.fillStyle = "#FFF8E9";
    ctx.strokeStyle = "#557123";
    ctx.lineWidth = 2;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(geo.margin - pad, y - pad, geo.cellSize + pad * 2, geo.cellSize + pad * 2, 10);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(geo.margin - pad, y - pad, geo.cellSize + pad * 2, geo.cellSize + pad * 2);
      ctx.strokeRect(geo.margin - pad, y - pad, geo.cellSize + pad * 2, geo.cellSize + pad * 2);
    }
    ctx.restore();
  }

  function pbDrawCell(ctx, geo, index, source, sw, sh, mirror) {
    var side = Math.min(sw, sh);
    var sx = (sw - side) / 2;
    var sy = (sh - side) / 2;
    var y = geo.topMargin + index * (geo.cellSize + geo.gap);
    ctx.save();
    if (mirror) {
      ctx.translate(geo.margin + geo.cellSize, y);
      ctx.scale(-1, 1);
      ctx.drawImage(source, sx, sy, side, side, 0, 0, geo.cellSize, geo.cellSize);
    } else {
      ctx.drawImage(source, sx, sy, side, side, geo.margin, y, geo.cellSize, geo.cellSize);
    }
    ctx.restore();
  }

  var pbDownloadUrl = null;

  function pbFinishStrip(ctx, geo) {
    var capY = geo.topMargin + geo.cellSize * geo.shots + geo.gap * (geo.shots - 1) + geo.captionHeight / 2;
    ctx.fillStyle = "#2B2114";
    ctx.textAlign = "center";
    ctx.font = "italic 20px Georgia, 'Times New Roman', serif";
    ctx.fillText("field notes & matcha", geo.width / 2, capY - 6);
    ctx.font = "13px 'Courier New', monospace";
    ctx.fillStyle = "#6b5f4c";
    var dateStr = new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    ctx.fillText(dateStr, geo.width / 2, capY + 16);

    pbShowView("result");

    // a blob: URL downloads far more reliably across browsers than a giant
    // base64 data: URI on an anchor's download attribute
    if (pbCanvas.toBlob) {
      pbCanvas.toBlob(function (blob) {
        if (!blob || !pbDownload) return;
        if (pbDownloadUrl) URL.revokeObjectURL(pbDownloadUrl);
        pbDownloadUrl = URL.createObjectURL(blob);
        pbDownload.href = pbDownloadUrl;
      }, "image/png");
    } else if (pbDownload) {
      pbDownload.href = pbCanvas.toDataURL("image/png");
    }
  }

  /* pick up to 3 photos from the device, drop them straight onto the
     matcha-themed strip layout */
  function pbHandleFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []).filter(function (f) {
      return f.type && f.type.indexOf("image/") === 0;
    }).slice(0, 3);

    if (!files.length) {
      if (pbErrorText) {
        pbErrorText.textContent = "That didn't look like a photo, try choosing an image file instead.";
        pbErrorText.hidden = false;
      }
      return;
    }
    if (pbErrorText) pbErrorText.hidden = true;
    if (!pbCanvas) return;

    var geo = pbGeometry(files.length);
    pbCanvas.width = geo.width;
    pbCanvas.height = geo.height;
    var ctx = pbCanvas.getContext("2d");
    pbPaintBackground(ctx, geo);
    for (var f = 0; f < geo.shots; f++) pbDrawFrame(ctx, geo, f);

    var images = new Array(files.length);
    var loaded = 0;
    files.forEach(function (file, i) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        images[i] = img;
        loaded++;
        if (loaded === files.length) {
          images.forEach(function (im, idx) {
            if (im) pbDrawCell(ctx, geo, idx, im, im.naturalWidth, im.naturalHeight, false);
          });
          pbFinishStrip(ctx, geo);
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = function () { loaded++; };
      img.src = url;
    });
  }

  if (photoboothBtn && photoboothModal) {
    photoboothBtn.addEventListener("click", function () {
      photoboothModal.classList.add("open");
      pbShowView("start");
      if (photoboothClose) photoboothClose.focus();
    });
  }

  if (photoboothModal) {
    var closePhotobooth = function () {
      photoboothModal.classList.remove("open");
    };
    if (photoboothClose) photoboothClose.addEventListener("click", closePhotobooth);
    photoboothModal.addEventListener("click", function (e) {
      if (e.target === photoboothModal) closePhotobooth();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && photoboothModal.classList.contains("open")) closePhotobooth();
    });
  }

  var pbTriggerUpload = function () { if (pbFileInput) pbFileInput.click(); };
  if (pbUploadBtn) pbUploadBtn.addEventListener("click", pbTriggerUpload);
  if (pbRetakeBtn) pbRetakeBtn.addEventListener("click", function () {
    pbShowView("start");
    pbTriggerUpload();
  });
  if (pbFileInput) {
    pbFileInput.addEventListener("change", function (e) {
      pbHandleFiles(e.target.files);
      pbFileInput.value = "";
    });
  }

  /* -------------------------------------------------------------
     the letterbox: pulls one random postcard each time, never the
     same one twice in a row
     ------------------------------------------------------------- */

  var postcards = [
    { text: "I still have a little impostor syndrome. It doesn't go away, that feeling that you shouldn't take me that seriously. What do I know?", sign: "Michelle Obama" },
    { text: "Nobody really knows what they're doing.", sign: "Michelle Obama" },
    { text: "You must do the thing you think you cannot do.", sign: "Eleanor Roosevelt" },
    { text: "There came a time when the risk to remain tight in a bud was more painful than the risk it took to blossom.", sign: "Anais Nin" },
    { text: "The beauty of impostor syndrome is you vacillate between extreme egomania and a complete feeling of, I'm a fraud, oh God, they're on to me.", sign: "Tina Fey" },
    { text: "When I was in my 20s, I really thought I had it much more figured out than I do now.", sign: "Ben Stiller" },
    { text: "I'm never so sure as I was in my mid-20s.", sign: "Meryl Streep" },
    { text: "You can't connect the dots looking forward. You can only connect them looking backwards, so you have to trust that the dots will somehow connect in your future.", sign: "Steve Jobs" },
    { text: "The thing that is really hard, and really amazing, is giving up on being perfect and beginning the work of becoming yourself.", sign: "Anna Quindlen" },
    { text: "If you're turning 30, and you're not in some incredibly secure, stable place in your career, or you're still figuring things out… there's just this incredible amount of anxiety.", sign: "Emma Watson" },
    { text: "It is impossible to live without failing at something, unless you live so cautiously that you might as well not have lived at all, in which case, you fail by default.", sign: "J.K. Rowling" }
  ];
  var lastPostcardIndex = -1;

  var letterboxBtn = document.getElementById("letterbox-btn");
  var letterboxModal = document.getElementById("letterbox-modal");
  var letterboxClose = document.getElementById("letterbox-close");
  var postcardSingle = document.getElementById("postcard-single");
  var postcardAnother = document.getElementById("postcard-another");

  function showRandomPostcard() {
    if (!postcardSingle || !postcards.length) return;
    var idx = lastPostcardIndex;
    if (postcards.length > 1) {
      while (idx === lastPostcardIndex) {
        idx = Math.floor(Math.random() * postcards.length);
      }
    } else {
      idx = 0;
    }
    lastPostcardIndex = idx;
    var pc = postcards[idx];

    var card = document.createElement("div");
    card.className = "postcard postcard-standalone";
    card.style.transform = "rotate(" + (Math.random() * 3 - 1.5).toFixed(1) + "deg)";

    var stamp = document.createElement("span");
    stamp.className = "postcard-stamp";
    stamp.setAttribute("aria-hidden", "true");

    var text = document.createElement("p");
    text.textContent = "“" + pc.text + "”";

    var sign = document.createElement("span");
    sign.className = "postcard-sign";
    sign.textContent = "· " + pc.sign;

    card.appendChild(stamp);
    card.appendChild(text);
    card.appendChild(sign);

    postcardSingle.innerHTML = "";
    postcardSingle.appendChild(card);
  }

  if (letterboxBtn && letterboxModal) {
    letterboxBtn.addEventListener("click", function () {
      showRandomPostcard();
      letterboxModal.classList.add("open");
      if (letterboxClose) letterboxClose.focus();
    });
  }

  if (postcardAnother) {
    postcardAnother.addEventListener("click", showRandomPostcard);
  }

  if (letterboxModal) {
    var closeLetterbox = function () { letterboxModal.classList.remove("open"); };
    if (letterboxClose) letterboxClose.addEventListener("click", closeLetterbox);
    letterboxModal.addEventListener("click", function (e) {
      if (e.target === letterboxModal) closeLetterbox();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeLetterbox();
    });
  }

  /* -------------------------------------------------------------
     about page: click a travel card for a longer version of that
     one place
     ------------------------------------------------------------- */

  var placeDetails = {
    vietnam: {
      eyebrow: "NOC · Ho Chi Minh City",
      title: "Vietnam",
      body: "The short version undersells it a bit. Mostly I was there to help run logistics for a group of eighty students on exchange, which meant a lot of spreadsheets, chasing people for passport details, and rebooking things last minute whenever plans changed. I hadn't lived away from home that long before, so most of the actual growth happened outside of work hours: figuring out a new city on my own, eating alone more than I expected to, and slowly getting more comfortable with that."
    },
    newyork: {
      eyebrow: "NOC · New York City",
      title: "New York",
      body: "NOC placed me in New York for a year, working at a small accelerator. Honestly, the city was the bigger adjustment, not the job. I lived in an apartment with a radiator that never fully turned off, which taught me how to sleep through almost anything. It also taught me how to budget properly for the first time, and how much I don't actually mind my own company, which surprised me more than it probably should have."
    },
    china: {
      eyebrow: "internship · Guangzhou",
      title: "China",
      body: "This one was separate from NOC, a brand marketing internship at a completely different company. A few things it actually taught me: how to disagree with someone more senior without shrinking, how to ask a basic question in a meeting when nobody else will, and how to still show up the next day even when the day before didn't go well."
    }
  };

  var placeModal = document.getElementById("place-modal");
  var placeClose = document.getElementById("place-close");
  var placeEyebrow = document.getElementById("place-eyebrow");
  var placeTitle = document.getElementById("place-title");
  var placeBody = document.getElementById("place-body");
  var storyCards = document.querySelectorAll(".story-card[data-place]");

  if (placeModal && storyCards.length) {
    storyCards.forEach(function (card) {
      card.addEventListener("click", function () {
        var detail = placeDetails[card.getAttribute("data-place")];
        if (!detail) return;
        if (placeEyebrow) placeEyebrow.textContent = detail.eyebrow;
        if (placeTitle) placeTitle.textContent = detail.title;
        if (placeBody) placeBody.textContent = detail.body;
        placeModal.classList.add("open");
        if (placeClose) placeClose.focus();
      });
    });

    var closePlace = function () { placeModal.classList.remove("open"); };
    if (placeClose) placeClose.addEventListener("click", closePlace);
    placeModal.addEventListener("click", function (e) {
      if (e.target === placeModal) closePlace();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closePlace();
    });
  }

  /* -------------------------------------------------------------
     hero bowl: tap to stir, instead of the foam spinning on its own
     ------------------------------------------------------------- */

  var stirBowl = document.getElementById("stir-bowl");
  var foamSwirl = document.getElementById("foam-swirl");

  if (stirBowl && foamSwirl) {
    stirBowl.addEventListener("click", function () {
      foamSwirl.classList.remove("stirring");
      void foamSwirl.getBBox(); // restart the animation even on rapid repeat clicks
      foamSwirl.classList.add("stirring");
    });
    foamSwirl.addEventListener("animationend", function () {
      foamSwirl.classList.remove("stirring");
    });
  }

  /* -------------------------------------------------------------
     the corner nook: little clickable pets, each with their own
     rotating pool of lines (mostly affirmations, one gives tips)
     ------------------------------------------------------------- */

  var petMessages = {
    matcha: [
      "ceremonial over culinary grade. this is not up for debate.",
      "started drinking this to survive internship season. no regrets.",
      "if you're reading this at 1am, hi, same."
    ],
    clay: [
      "the mood buttons below actually respond, by the way.",
      "there's a reply on the wall about eleven internship rejections. go read it.",
      "I was nervous pinning my first one too. turned out fine."
    ],
    cream: [
      "the wall's only a few weeks old and it already has a hot one.",
      "someone messaged after reading the Vietnam entry. that's why this page exists.",
      "no five-year plan here either, for what it's worth."
    ]
  };
  var petIndex = { matcha: 0, clay: 0, cream: 0 };
  var petBubble = document.getElementById("pet-bubble");
  var petHideTimer = null;

  document.querySelectorAll(".pet-btn[data-pet]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var pet = btn.getAttribute("data-pet");
      var pool = petMessages[pet];
      if (!pool || !pool.length || !petBubble) return;

      petBubble.textContent = pool[petIndex[pet] % pool.length];
      petIndex[pet] += 1;

      var scene = btn.closest(".corner-scene");
      if (scene) {
        var sceneRect = scene.getBoundingClientRect();
        var btnRect = btn.getBoundingClientRect();
        var left = btnRect.left - sceneRect.left + btnRect.width / 2;
        var top = btnRect.top - sceneRect.top - 68;
        petBubble.style.left = left + "px";
        petBubble.style.top = Math.max(top, 0) + "px";
        petBubble.style.transform = "translateX(-50%)";
      }

      petBubble.classList.add("show");

      btn.classList.remove("bounce");
      void btn.offsetWidth; // restart the bounce animation on repeat clicks
      btn.classList.add("bounce");

      clearTimeout(petHideTimer);
      petHideTimer = setTimeout(function () {
        petBubble.classList.remove("show");
      }, 4000);
    });
  });

  /* -------------------------------------------------------------
     the shared roll: threads (replies on a pin), still local-only
     seedReplies are baked-in examples; anything typed in gets
     saved to this device the same way pins do
     ------------------------------------------------------------- */

  var THREAD_KEY = "fnm-thread-replies";
  var seedReplies = {
    "seed-exchange": [
      { text: "I did the exact same thing but pretended to text someone instead", sign: "K." },
      { text: "the book as a prop thing is so real 😭", sign: "anonymous" }
    ],
    "seed-pressure": [
      { text: "mine keeps asking if I've \"found a proper job\" yet lol", sign: "anonymous" }
    ],
    "seed-deep": [
      { text: "this hit different at 1am, thank you for writing it", sign: "R." },
      { text: "opinions about our own future is a lot of pressure ngl", sign: "T." },
      { text: "saving this one", sign: "anonymous" }
    ]
  };

  function loadThreadReplies() {
    try {
      var raw = window.localStorage.getItem(THREAD_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveThreadReplies(obj) {
    try {
      window.localStorage.setItem(THREAD_KEY, JSON.stringify(obj));
    } catch (e) {
      /* storage unavailable — replies still render this session */
    }
  }

  function getAllReplies(pinId) {
    var seeds = seedReplies[pinId] || [];
    var stored = loadThreadReplies()[pinId] || [];
    return seeds.concat(stored);
  }

  function refreshReplyCounts() {
    document.querySelectorAll(".thread-btn[data-pin-id]").forEach(function (btn) {
      var id = btn.getAttribute("data-pin-id");
      var count = getAllReplies(id).length;
      var countEl = btn.querySelector(".reply-count");
      if (countEl) countEl.textContent = count;
      var card = btn.closest(".pin-card");
      if (card && count >= 2 && !card.querySelector(".hot-badge")) {
        var dateEl = card.querySelector(".pin-date");
        if (dateEl) {
          var badge = document.createElement("span");
          badge.className = "hot-badge";
          badge.textContent = "🔥 hot";
          dateEl.appendChild(badge);
        }
      }
    });
  }

  var threadModal = document.getElementById("thread-modal");
  var threadTopic = document.getElementById("thread-topic");
  var threadOriginal = document.getElementById("thread-original");
  var threadSignEl = document.getElementById("thread-sign");
  var threadList = document.getElementById("thread-list");
  var threadClose = document.getElementById("thread-close");
  var replyForm = document.getElementById("reply-form");
  var currentThreadId = null;

  function renderThread(pinId) {
    if (!threadList) return;
    threadList.innerHTML = "";
    var replies = getAllReplies(pinId);
    if (!replies.length) {
      var empty = document.createElement("p");
      empty.className = "thread-empty";
      empty.textContent = "no replies yet, be the first.";
      threadList.appendChild(empty);
      return;
    }
    replies.forEach(function (r) {
      var item = document.createElement("div");
      item.className = "thread-item";
      var p = document.createElement("p");
      p.style.margin = "0";
      p.textContent = r.text;
      var sign = document.createElement("span");
      sign.className = "thread-item-sign";
      sign.textContent = "\u00b7 " + (r.sign || "anonymous");
      item.appendChild(p);
      item.appendChild(sign);
      threadList.appendChild(item);
    });
  }

  function openThread(pinId, card) {
    currentThreadId = pinId;
    if (threadTopic && card) {
      var dateEl = card.querySelector(".pin-date");
      threadTopic.textContent = dateEl ? dateEl.firstChild.textContent : "";
    }
    if (threadOriginal && card) {
      var textEl = card.querySelector("p");
      threadOriginal.textContent = textEl ? textEl.textContent : "";
    }
    if (threadSignEl && card) {
      var signEl = card.querySelector(".pin-sign");
      threadSignEl.textContent = signEl ? signEl.textContent : "";
    }
    renderThread(pinId);
    if (threadModal) threadModal.classList.add("open");
  }

  function wireThreadButton(btn) {
    btn.addEventListener("click", function () {
      var id = btn.getAttribute("data-pin-id");
      var card = btn.closest(".pin-card");
      openThread(id, card);
    });
  }

  document.querySelectorAll(".thread-btn[data-pin-id]").forEach(wireThreadButton);

  if (threadClose && threadModal) {
    threadClose.addEventListener("click", function () { threadModal.classList.remove("open"); });
    threadModal.addEventListener("click", function (e) {
      if (e.target === threadModal) threadModal.classList.remove("open");
    });
  }

  if (replyForm) {
    replyForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!currentThreadId) return;
      var textEl = document.getElementById("reply-text");
      var signEl = document.getElementById("reply-sign");
      var text = textEl ? textEl.value.trim() : "";
      if (!text) return;

      var all = loadThreadReplies();
      if (!all[currentThreadId]) all[currentThreadId] = [];
      all[currentThreadId].push({ text: text, sign: signEl ? signEl.value.trim() : "" });
      saveThreadReplies(all);

      renderThread(currentThreadId);
      refreshReplyCounts();
      replyForm.reset();
    });
  }

  refreshReplyCounts();
})();
