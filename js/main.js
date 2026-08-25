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

  // night mode: the actual light/dark decision for first paint already
  // happened in the inline <script> at the top of <head> (localStorage, or
  // the visitor's local time of day if they've never chosen), so this just
  // wires the toggle button to flip + remember the choice from here on.
  var themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(document.documentElement.getAttribute("data-theme") === "dark"));

    themeToggle.addEventListener("click", function () {
      var goingDark = document.documentElement.getAttribute("data-theme") !== "dark";
      if (goingDark) {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      themeToggle.setAttribute("aria-pressed", String(goingDark));
      try { localStorage.setItem("mm-theme", goingDark ? "dark" : "light"); } catch (e) {}
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
     the shared roll: pin-it form, backed by a real shared server (see
     api/pins.js) so every visitor's pins show up for everyone else too
     ------------------------------------------------------------- */

  // these need to exist before any pin renders (including stored pins
  // re-rendered on load below), since rendering wires up each pin's
  // reply count against them
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
    money: "💸 money stress",
    relationships: "💔 relationships",
    burnout: "😴 burnout",
    adulting: "🏠 adulting",
    random: "🍵 random"
  };

  // the shared wall itself lives on a real server now (see api/pins.js),
  // so every visitor sees the same pins instead of each browser having
  // its own copy. these three just wrap that API.
  function fetchSharedPins() {
    return fetch("/api/pins")
      .then(function (res) { return res.json(); })
      .then(function (data) { return (data && data.pins) || []; })
      .catch(function () { return null; }); // null = couldn't load, not "empty"
  }

  function postSharedPin(entry) {
    return fetch("/api/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry)
    }).then(function (res) {
      if (!res.ok) throw new Error("post failed");
      return res.json();
    }).then(function (data) { return data.pin; });
  }

  function deleteSharedPin(id) {
    return fetch("/api/pins?id=" + encodeURIComponent(id) + "&passcode=" + encodeURIComponent(ADMIN_PASSCODE), {
      method: "DELETE"
    }).then(function (res) { return res.ok; }).catch(function () { return false; });
  }

  var petIcons = {
    matcha: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M20 6C29 6 35 14 35 22C35 30 28 34 20 34C12 34 5 30 5 22C5 14 11 6 20 6Z" fill="var(--matcha)" stroke="var(--matcha-deep)" stroke-width="2"/><path d="M20 6C20 6 18 2 22 0" stroke="var(--matcha-deep)" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="15" cy="20" r="2" fill="var(--ink)"/><circle cx="25" cy="20" r="2" fill="var(--ink)"/><path d="M15 26C17.5 28.5 22.5 28.5 25 26" stroke="var(--ink)" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    clay: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none"><circle cx="10" cy="8" r="5" fill="var(--clay)" stroke="var(--clay-deep)" stroke-width="2"/><circle cx="30" cy="8" r="5" fill="var(--clay)" stroke="var(--clay-deep)" stroke-width="2"/><path d="M20 8C29 8 35 15 35 22C35 30 28 34 20 34C12 34 5 30 5 22C5 15 11 8 20 8Z" fill="var(--clay)" stroke="var(--clay-deep)" stroke-width="2"/><circle cx="15" cy="21" r="2" fill="var(--ink)"/><circle cx="25" cy="21" r="2" fill="var(--ink)"/><path d="M17 27C18.5 28.5 21.5 28.5 23 27" stroke="var(--ink)" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    cream: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none"><circle cx="20" cy="20" r="15" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/><circle cx="15" cy="19" r="2" fill="var(--ink)"/><circle cx="25" cy="19" r="2" fill="var(--ink)"/><circle cx="11" cy="24" r="2.6" fill="var(--clay)" opacity="0.5"/><circle cx="29" cy="24" r="2.6" fill="var(--clay)" opacity="0.5"/><path d="M16 25C18 27 22 27 24 25" stroke="var(--ink)" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    house: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.5 12.5L12 5L20.5 12.5" fill="#D97A3F" stroke="#B85A28" stroke-width="1.6" stroke-linejoin="round"/><path d="M6.5 11V18.5C6.5 19.3 7.2 20 8 20H16C16.8 20 17.5 19.3 17.5 18.5V11" fill="#FFF8E9" stroke="#B85A28" stroke-width="1.6" stroke-linejoin="round"/><path d="M10.2 20V16C10.2 15.4 10.7 15 11.2 15H12.8C13.3 15 13.8 15.4 13.8 16V20" fill="#557123" stroke="#3D4A22" stroke-width="1.1" stroke-linejoin="round"/><circle cx="12.9" cy="17.5" r="0.5" fill="#FFF8E9"/></svg>',
    plant: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 13H15L14.2 20.5C14.1 20.8 13.9 21 13.6 21H10.4C10.1 21 9.9 20.8 9.8 20.5L9 13Z" fill="#D97A3F" stroke="#B85A28" stroke-width="1.5" stroke-linejoin="round"/><path d="M8.5 13H15.5" stroke="#B85A28" stroke-width="1.4" stroke-linecap="round"/><path d="M12 13C12 13 12.5 7 9.5 4.5C9.5 4.5 13.5 3.3 13.8 8" fill="#8CAF3E" stroke="#557123" stroke-width="1.3" stroke-linejoin="round"/><path d="M12 13C12 13 11.5 6.5 15.3 5C15.3 5 12 4 11 8" fill="#8CAF3E" stroke="#557123" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    cup: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 9H17L16 19C16 20 15 21 14 21H8C7 21 6 20 6 19L5 9Z" fill="#FFF8E9" stroke="#2B2114" stroke-width="1.6" stroke-linejoin="round"/><path d="M6.4 11H15.6L15 17.5C14.9 18.6 14.3 19.3 13.3 19.3H8.7C7.7 19.3 7.1 18.6 7 17.5L6.4 11Z" fill="#8CAF3E"/></svg>',
    sky: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M13 10L8 3M27 10L32 3" stroke="var(--sky-deep)" stroke-width="2" stroke-linecap="round"/><path d="M20 6C29 6 35 14 35 22C35 30 28 34 20 34C12 34 5 30 5 22C5 14 11 6 20 6Z" fill="var(--sky-pale)" stroke="var(--sky-deep)" stroke-width="2"/><circle cx="15" cy="20" r="2" fill="var(--ink)"/><circle cx="25" cy="20" r="2" fill="var(--ink)"/><path d="M15 26C17.5 28.5 22.5 28.5 25 26" stroke="var(--ink)" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    berry: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none"><circle cx="20" cy="2" r="2.2" fill="var(--clay)" stroke="var(--clay-deep)" stroke-width="1.2"/><circle cx="16.5" cy="4" r="2.2" fill="var(--clay)" stroke="var(--clay-deep)" stroke-width="1.2"/><circle cx="23.5" cy="4" r="2.2" fill="var(--clay)" stroke="var(--clay-deep)" stroke-width="1.2"/><circle cx="20" cy="4.5" r="1.6" fill="var(--matcha)"/><path d="M20 6C29 6 35 14 35 22C35 30 28 34 20 34C12 34 5 30 5 22C5 14 11 6 20 6Z" fill="var(--clay-pale)" stroke="var(--clay-deep)" stroke-width="2"/><circle cx="15" cy="20" r="2" fill="var(--ink)"/><circle cx="25" cy="20" r="2" fill="var(--ink)"/><path d="M15 26C17.5 28.5 22.5 28.5 25 26" stroke="var(--ink)" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    cat: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M11 10L7.5 1.5L15.5 8Z" fill="#C7C2E8" stroke="#8B84C4" stroke-width="1.6" stroke-linejoin="round"/><path d="M29 10L32.5 1.5L24.5 8Z" fill="#C7C2E8" stroke="#8B84C4" stroke-width="1.6" stroke-linejoin="round"/><circle cx="20" cy="21" r="15" fill="#C7C2E8" stroke="#8B84C4" stroke-width="2"/><path d="M7.5 22H12.5M27.5 22H32.5" stroke="#8B84C4" stroke-width="1.2" stroke-linecap="round" opacity="0.75"/><circle cx="15" cy="20" r="2" fill="var(--ink)"/><circle cx="25" cy="20" r="2" fill="var(--ink)"/><path d="M17.5 25.5C18.5 27 21.5 27 22.5 25.5" stroke="var(--ink)" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>'
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
    fetchSharedPins().then(function (pins) {
      if (pins === null) {
        if (pinToast) pinToast.textContent = "couldn't load the wall right now, try refreshing in a bit";
        return;
      }
      // oldest first, so newest ends up at the bottom next to the "+ yours" card
      pins.slice().reverse().forEach(function (entry) { renderPin(entry, false); });
    });
  }

  /* -------------------------------------------------------------
     admin: a lightweight, client-side way for Chloe to manage her
     own site (hide pins, edit journal entries, edit travel stories).
     there's no real server behind this site yet, so unlocking admin
     mode only affects what this specific browser/device shows, not
     what other visitors see on theirs. once there's a real shared
     backend, this should move server-side.

     there is no visible "manage" button anywhere on the site. admin
     mode is unlocked by clicking the small copyright line in the
     footer five times quickly, which reveals a passcode box. this
     keeps it out of the way for ordinary visitors, but it's "hidden"
     rather than truly secure: the passcode still lives in this file,
     so anyone who reads the page source could find it.
     ------------------------------------------------------------- */

  var ADMIN_PASSCODE = "onlyyxcanaccess";
  var ADMIN_KEY = "fnm-admin-mode";
  var HIDDEN_SEEDS_KEY = "fnm-hidden-seeds";
  var HIDDEN_JOURNAL_KEY = "fnm-hidden-journal";
  var JOURNAL_ENTRIES_KEY = "fnm-journal-entries";
  var TRAVEL_OVERRIDES_KEY = "fnm-travel-overrides";

  function isAdminOn() {
    try {
      return window.localStorage.getItem(ADMIN_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function setAdminMode(on) {
    document.body.classList.toggle("admin-mode", on);
    try {
      window.localStorage.setItem(ADMIN_KEY, on ? "1" : "");
    } catch (e) {
      /* ignore */
    }
    adminBars.forEach(function (bar) { bar.refresh(); });
    // journal-form only has the "hidden" attribute set in markup; the
    // hidden attribute always wins over CSS display now (by design), so
    // it needs to be explicitly cleared here rather than left to the
    // body.admin-mode CSS rule alone.
    if (journalForm) journalForm.hidden = !on;
  }

  // everything here is plain in-page UI on purpose. window.prompt/alert/confirm
  // get silently blocked inside a sandboxed preview iframe (like this one on
  // claude.ai), so relying on them made the whole feature look broken.
  function setupAdminBar(suffix) {
    var bar = document.getElementById("admin-bar-" + suffix);
    if (!bar) return null;
    var form = document.getElementById("admin-form-" + suffix);
    var active = document.getElementById("admin-active-" + suffix);
    var passInput = document.getElementById("admin-passcode-" + suffix);
    var errorEl = document.getElementById("admin-error-" + suffix);
    var exitBtn = document.getElementById("admin-exit-" + suffix);

    function refresh() {
      var on = isAdminOn();
      bar.classList.toggle("visible", on);
      if (form) form.hidden = on;
      if (active) active.hidden = !on;
    }

    function reveal() {
      bar.classList.add("visible");
      if (!isAdminOn()) {
        if (errorEl) errorEl.textContent = "";
        if (passInput) { passInput.value = ""; passInput.focus(); }
      }
    }

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var code = passInput ? passInput.value.trim() : "";
        if (code === ADMIN_PASSCODE) {
          setAdminMode(true);
        } else if (errorEl) {
          errorEl.textContent = "that's not it, try again";
          if (passInput) { passInput.value = ""; passInput.focus(); }
        }
      });
    }

    if (exitBtn) {
      exitBtn.addEventListener("click", function () { setAdminMode(false); });
    }

    refresh();
    return { reveal: reveal, refresh: refresh };
  }

  var adminBars = [
    setupAdminBar("pins"),
    setupAdminBar("journal"),
    setupAdminBar("about")
  ].filter(Boolean);

  if (isAdminOn()) document.body.classList.add("admin-mode");

  // secret unlock: click the footer's copyright line 5 times within
  // 2 seconds. nothing about it looks clickable on purpose, so it
  // stays out of the way for everyone else.
  (function () {
    var trigger = document.querySelector(".footer-fine");
    if (!trigger || !adminBars.length) return;
    var clicks = 0;
    var resetTimer = null;
    trigger.style.cursor = "default";
    trigger.addEventListener("click", function () {
      clicks += 1;
      clearTimeout(resetTimer);
      resetTimer = setTimeout(function () { clicks = 0; }, 2000);
      if (clicks >= 5) {
        clicks = 0;
        adminBars.forEach(function (bar) { bar.reveal(); });
      }
    });
  })();

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

  if (pinGrid) {
    // hide any seed pins this admin already removed on this device
    loadHiddenSeeds().forEach(function (pinId) {
      var el = pinGrid.querySelector('.pin-card[data-pin-id="' + pinId + '"]');
      if (el) el.remove();
    });

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

      var card = btn.closest(".pin-card");

      if (pinId.indexOf("seed-") === 0) {
        // seed pins are baked into the HTML on every visitor's page, not
        // in the shared database, so hiding one is still just local to
        // this device
        hideSeedPin(pinId);
        removeThreadFor(pinId);
        if (card) card.remove();
        refreshReplyCounts();
      } else {
        // real pins live on the server now, so removing one has to go
        // through it too, otherwise it'd just come right back for
        // everyone (including this device) on the next reload
        btn.disabled = true;
        deleteSharedPin(pinId).then(function (ok) {
          if (!ok) {
            btn.disabled = false;
            btn.classList.remove("confirming");
            btn.innerHTML = "&times;";
            btn.setAttribute("aria-label", "delete this pin");
            if (pinToast) {
              pinToast.textContent = "couldn't delete that, try again in a moment";
              setTimeout(function () { pinToast.textContent = ""; }, 4000);
            }
            return;
          }
          removeThreadFor(pinId);
          if (card) card.remove();
          refreshReplyCounts();
        });
      }
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

      var submitBtn = pinForm.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = true;

      var draft = {
        topic: topicEl ? topicEl.value : "random",
        text: text,
        sign: signEl ? signEl.value.trim() : "",
        pet: pinPetInput ? pinPetInput.value : "matcha"
      };

      postSharedPin(draft).then(function (entry) {
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
          pinToast.textContent = "pinned it up, everyone can see it 🫂";
          setTimeout(function () { pinToast.textContent = ""; }, 4000);
        }
      }).catch(function () {
        if (pinToast) {
          pinToast.textContent = "couldn't post that right now, try again in a moment";
          setTimeout(function () { pinToast.textContent = ""; }, 5000);
        }
      }).finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
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
     journal (journal.html): Chloe can add new entries and remove
     any entry (seed or her own) while admin mode is unlocked. same
     local-only storage story as the shared roll above.
     ------------------------------------------------------------- */

  var journalList = document.getElementById("journal-list");
  var journalForm = document.getElementById("journal-form");
  if (journalForm) journalForm.hidden = !isAdminOn();

  function loadHiddenJournal() {
    try {
      var raw = window.localStorage.getItem(HIDDEN_JOURNAL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function hideJournalEntry(entryId) {
    try {
      var hidden = loadHiddenJournal();
      if (hidden.indexOf(entryId) === -1) {
        hidden.push(entryId);
        window.localStorage.setItem(HIDDEN_JOURNAL_KEY, JSON.stringify(hidden));
      }
    } catch (e) {
      /* storage unavailable, entry still disappears for this page view */
    }
  }

  function loadJournalEntries() {
    try {
      var raw = window.localStorage.getItem(JOURNAL_ENTRIES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveJournalEntries(list) {
    try {
      window.localStorage.setItem(JOURNAL_ENTRIES_KEY, JSON.stringify(list));
    } catch (e) {
      /* ignore */
    }
  }

  function journalDateLabel(timestamp) {
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var d = new Date(timestamp);
    return months[d.getMonth()] + " " + d.getDate();
  }

  function renderJournalEntry(entry, animate) {
    if (!journalList) return;
    var row = document.createElement("div");
    row.className = "journal-row";
    row.setAttribute("data-entry-id", entry.id);
    if (animate) row.style.opacity = "0";

    var del = document.createElement("button");
    del.type = "button";
    del.className = "journal-delete text-link";
    del.setAttribute("data-entry-id", entry.id);
    del.setAttribute("aria-label", "delete this entry");
    del.textContent = "remove";

    var dateEl = document.createElement("div");
    dateEl.className = "journal-date";
    dateEl.textContent = journalDateLabel(entry.created || Date.now());

    var body = document.createElement("div");
    body.className = "journal-entry";
    if (entry.tag) {
      var tagEl = document.createElement("span");
      tagEl.className = "journal-tag";
      tagEl.textContent = entry.tag;
      body.appendChild(tagEl);
    }
    var h3 = document.createElement("h3");
    h3.textContent = entry.title;
    var p = document.createElement("p");
    p.textContent = entry.body;
    body.appendChild(h3);
    body.appendChild(p);

    row.appendChild(del);
    row.appendChild(dateEl);
    row.appendChild(body);
    journalList.insertBefore(row, journalList.firstChild);

    if (animate) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { row.style.opacity = "1"; });
      });
    }
  }

  if (journalList) {
    // hide any seed entries this admin already removed on this device
    loadHiddenJournal().forEach(function (entryId) {
      var el = journalList.querySelector('.journal-row[data-entry-id="' + entryId + '"]');
      if (el) el.remove();
    });

    // newest-first, so entries she's added just now show at the top
    loadJournalEntries().slice().reverse().forEach(function (entry) {
      renderJournalEntry(entry, false);
    });

    journalList.addEventListener("click", function (e) {
      var btn = e.target.closest(".journal-delete");
      if (!btn) return;
      var entryId = btn.getAttribute("data-entry-id");
      if (!entryId) return;

      // same two-click "sure?" pattern as the shared roll: first click
      // arms it, second click within a few seconds actually deletes it
      if (!btn.classList.contains("confirming")) {
        btn.classList.add("confirming");
        btn.textContent = "sure?";
        btn.setAttribute("aria-label", "click again to confirm delete");
        clearTimeout(btn._confirmTimer);
        btn._confirmTimer = setTimeout(function () {
          btn.classList.remove("confirming");
          btn.textContent = "remove";
          btn.setAttribute("aria-label", "delete this entry");
        }, 3000);
        return;
      }

      if (entryId.indexOf("seed-") === 0) {
        hideJournalEntry(entryId);
      } else {
        var stored = loadJournalEntries().filter(function (entry) { return entry.id !== entryId; });
        saveJournalEntries(stored);
      }
      var row = btn.closest(".journal-row");
      if (row) row.remove();
    });
  }

  if (journalForm) {
    journalForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var titleEl = document.getElementById("journal-title-input");
      var tagEl = document.getElementById("journal-tag-input");
      var bodyEl = document.getElementById("journal-body-input");
      var title = titleEl ? titleEl.value.trim() : "";
      var body = bodyEl ? bodyEl.value.trim() : "";
      if (!title || !body) return;

      var entry = {
        id: "journal-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        title: title,
        tag: tagEl ? tagEl.value.trim() : "",
        body: body,
        created: Date.now()
      };

      var stored = loadJournalEntries();
      stored.push(entry);
      saveJournalEntries(stored);
      renderJournalEntry(entry, true);
      journalForm.reset();
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
    live: document.getElementById("photobooth-live-view"),
    result: document.getElementById("photobooth-result-view")
  };
  var pbUploadBtn = document.getElementById("photobooth-upload-btn");
  var pbRetakeBtn = document.getElementById("photobooth-retake");
  var pbFileInput = document.getElementById("photobooth-file-input");
  var pbCanvas = document.getElementById("photobooth-canvas");
  var pbDownload = document.getElementById("photobooth-download");
  var pbDownloadHint = document.getElementById("photobooth-download-hint");
  var pbErrorText = document.getElementById("photobooth-error-text");
  var pbThemePicker = document.getElementById("pb-theme-picker");

  // camera path (laptop-friendly alternative to the upload button)
  var pbCameraBtn = document.getElementById("photobooth-camera-btn");
  var pbVideo = document.getElementById("photobooth-video");
  var pbCaptureBtn = document.getElementById("photobooth-capture-btn");
  var pbCameraDoneBtn = document.getElementById("photobooth-camera-done");
  var pbCameraCancelBtn = document.getElementById("photobooth-camera-cancel");
  var pbShotCountEl = document.getElementById("photobooth-shot-count");
  var pbCameraErrorEl = document.getElementById("photobooth-camera-error");
  var pbStream = null;
  var pbShots = [];
  var pbLastSource = "upload";

  // three strip colorways someone can switch between once the strip's
  // already made, reusing the same green/orange accents as the rest of
  // the site plus a plainer cream one for a more classic photobooth look
  var PB_THEMES = {
    matcha: { bgTop: "#F2F4DC", bgBottom: "#FBF3E3", frameFill: "#FFF8E9", frameStroke: "#6B8F52" },
    clay: { bgTop: "#FBE2C8", bgBottom: "#FFF3E3", frameFill: "#FFF8E9", frameStroke: "#B85A28" },
    cream: { bgTop: "#FFF8E9", bgBottom: "#FFEFD3", frameFill: "#FFFFFF", frameStroke: "#2B2114" }
  };
  var pbTheme = "matcha";
  var pbLastShots = null;

  function pbShowView(name) {
    Object.keys(pbViews).forEach(function (key) {
      if (pbViews[key]) pbViews[key].hidden = key !== name;
    });
  }

  /* a tiny hand-drawn pet, matching the ones on the corner-nook beanbags,
     for decorating the corners of the printed strip */
  function pbDrawPet(ctx, cx, cy, r, type, rotationDeg) {
    var palette = {
      matcha: { body: "#A8CC7E", edge: "#6B8F52" },
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
    var theme = PB_THEMES[pbTheme] || PB_THEMES.matcha;
    var grad = ctx.createLinearGradient(0, 0, 0, geo.height);
    grad.addColorStop(0, theme.bgTop);
    grad.addColorStop(1, theme.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, geo.width, geo.height);

    // little matcha bowl doodle up top, so it reads as "midnight matcha" before you even hit the caption
    ctx.save();
    ctx.translate(geo.width / 2, geo.topMargin / 2 + 2);
    ctx.strokeStyle = theme.frameStroke;
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
    var theme = PB_THEMES[pbTheme] || PB_THEMES.matcha;
    var y = geo.topMargin + index * (geo.cellSize + geo.gap);
    var pad = 6;
    ctx.save();
    ctx.fillStyle = theme.frameFill;
    ctx.strokeStyle = theme.frameStroke;
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
  // set once a strip is ready, only on browsers that can actually hand a
  // file to the native share sheet (see pbSetupDownload below)
  var pbShareFile = null;

  // most phone browsers (iOS Safari especially) just ignore the anchor
  // "download" attribute on a blob: URL and open the image in a new tab
  // instead of saving it, so there's no reliable one-tap "save to my
  // gallery" through a plain link there. the actual fix is the native
  // share sheet, since "save image"/"save to photos" is a built-in option
  // there. desktop browsers don't need this, the plain download already
  // works fine, so this only switches the button over when sharing files
  // is actually supported.
  function pbSetupDownload(blob) {
    if (!pbDownload) return;
    if (pbDownloadUrl) URL.revokeObjectURL(pbDownloadUrl);
    pbDownloadUrl = URL.createObjectURL(blob);
    pbDownload.href = pbDownloadUrl;

    var file = null;
    try {
      file = new File([blob], "field-notes-and-matcha-photobooth.png", { type: "image/png" });
    } catch (e) {
      file = null;
    }
    var canShareFile = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
    pbShareFile = canShareFile ? file : null;
    pbDownload.textContent = canShareFile ? "save to photos" : "download the strip";
    if (pbDownloadHint) {
      pbDownloadHint.textContent = canShareFile
        ? "Tap “save to photos”, then choose Save Image from the share sheet."
        : "If the download doesn't start on its own, the strip opens in a new tab, just save the image from there.";
    }
  }

  if (pbDownload) {
    pbDownload.addEventListener("click", function (e) {
      if (!pbShareFile) return; // no share support here, let the normal download link happen
      e.preventDefault();
      navigator.share({ files: [pbShareFile], title: "midnight matcha" }).catch(function () {
        // user backed out of the share sheet, or it failed silently, either
        // way there's nothing useful to show them for that
      });
    });
  }

  function pbFinishStrip(ctx, geo) {
    var capY = geo.topMargin + geo.cellSize * geo.shots + geo.gap * (geo.shots - 1) + geo.captionHeight / 2;
    ctx.fillStyle = "#2B2114";
    ctx.textAlign = "center";
    ctx.font = "italic 20px Georgia, 'Times New Roman', serif";
    ctx.fillText("midnight matcha", geo.width / 2, capY - 6);
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
        pbSetupDownload(blob);
      }, "image/png");
    } else if (pbDownload) {
      pbDownload.href = pbCanvas.toDataURL("image/png");
    }
  }

  /* shared by both the upload path and the camera path: given a list of
     { source, width, height, mirror } shots, draw them onto the strip */
  function pbBuildStrip(shots) {
    if (!pbCanvas || !shots.length) return;
    pbLastShots = shots; // kept around so switching the color theme can redraw without retaking anything
    var geo = pbGeometry(shots.length);
    pbCanvas.width = geo.width;
    pbCanvas.height = geo.height;
    var ctx = pbCanvas.getContext("2d");
    pbPaintBackground(ctx, geo);
    for (var f = 0; f < geo.shots; f++) pbDrawFrame(ctx, geo, f);
    shots.forEach(function (shot, idx) {
      pbDrawCell(ctx, geo, idx, shot.source, shot.width, shot.height, !!shot.mirror);
    });
    pbFinishStrip(ctx, geo);
  }

  if (pbThemePicker) {
    pbThemePicker.addEventListener("click", function (e) {
      var btn = e.target.closest(".pb-theme-btn");
      if (!btn || !pbLastShots) return;
      var theme = btn.getAttribute("data-theme");
      if (!PB_THEMES[theme] || theme === pbTheme) return;
      pbTheme = theme;
      pbThemePicker.querySelectorAll(".pb-theme-btn").forEach(function (b) {
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      pbBuildStrip(pbLastShots);
    });
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
    pbLastSource = "upload";

    var images = new Array(files.length);
    var loaded = 0;
    files.forEach(function (file, i) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        images[i] = img;
        loaded++;
        if (loaded === files.length) {
          pbBuildStrip(images.filter(Boolean).map(function (im) {
            return { source: im, width: im.naturalWidth, height: im.naturalHeight, mirror: false };
          }));
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = function () { loaded++; };
      img.src = url;
    });
  }

  /* camera path: a laptop-friendly alternative to picking files. only
     offered when the browser actually supports it over a secure origin,
     since getUserMedia silently fails (or isn't available at all) inside
     a sandboxed preview iframe, over plain http, or on older browsers */
  var pbCameraSupported = !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  if (pbCameraBtn) pbCameraBtn.hidden = !pbCameraSupported;

  function pbUpdateShotCount() {
    if (pbShotCountEl) pbShotCountEl.textContent = String(pbShots.length);
    if (pbCameraDoneBtn) pbCameraDoneBtn.hidden = pbShots.length === 0;
    if (pbCaptureBtn) pbCaptureBtn.disabled = pbShots.length >= 3;
  }

  function pbStopCamera() {
    if (pbStream) {
      pbStream.getTracks().forEach(function (t) { t.stop(); });
      pbStream = null;
    }
    if (pbVideo) pbVideo.srcObject = null;
  }

  function pbStartCamera() {
    if (!pbCameraSupported) return;
    pbShots = [];
    pbUpdateShotCount();
    if (pbCameraErrorEl) pbCameraErrorEl.hidden = true;
    pbShowView("live");
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then(function (stream) {
        pbStream = stream;
        if (pbVideo) {
          pbVideo.srcObject = stream;
          pbVideo.play().catch(function () { /* autoplay quirks, ignore */ });
        }
      })
      .catch(function () {
        pbStopCamera();
        if (pbCameraErrorEl) {
          pbCameraErrorEl.textContent = "Couldn't get to your camera, maybe permission was blocked. You can allow camera access and try again, or just upload photos instead.";
          pbCameraErrorEl.hidden = false;
        }
      });
  }

  function pbCaptureShot() {
    if (!pbVideo || !pbVideo.videoWidth || pbShots.length >= 3) return;
    var shotCanvas = document.createElement("canvas");
    shotCanvas.width = pbVideo.videoWidth;
    shotCanvas.height = pbVideo.videoHeight;
    shotCanvas.getContext("2d").drawImage(pbVideo, 0, 0);
    pbShots.push(shotCanvas);
    pbUpdateShotCount();
    if (pbShots.length >= 3) pbFinishCamera();
  }

  function pbFinishCamera() {
    if (!pbShots.length) return;
    pbStopCamera();
    pbLastSource = "camera";
    pbBuildStrip(pbShots.map(function (canvas) {
      return { source: canvas, width: canvas.width, height: canvas.height, mirror: true };
    }));
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
      pbStopCamera();
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
  if (pbCameraBtn) pbCameraBtn.addEventListener("click", pbStartCamera);
  if (pbCaptureBtn) pbCaptureBtn.addEventListener("click", pbCaptureShot);
  if (pbCameraDoneBtn) pbCameraDoneBtn.addEventListener("click", pbFinishCamera);
  if (pbCameraCancelBtn) pbCameraCancelBtn.addEventListener("click", function () {
    pbStopCamera();
    pbShowView("start");
  });
  if (pbRetakeBtn) pbRetakeBtn.addEventListener("click", function () {
    // starting fresh, so the color picker shouldn't carry over from the last strip
    pbTheme = "matcha";
    pbLastShots = null;
    if (pbThemePicker) {
      pbThemePicker.querySelectorAll(".pb-theme-btn").forEach(function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-theme") === "matcha" ? "true" : "false");
      });
    }
    if (pbLastSource === "camera" && pbCameraSupported) {
      pbStartCamera();
    } else {
      pbShowView("start");
      pbTriggerUpload();
    }
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

  // quotes other people add (see api/letters.js) get folded in alongside
  // the curated ones above, so "read another" can land on either. these
  // have an id, the curated ones above don't, that's how the rest of this
  // tells them apart (for the delete control, mainly).
  var communityLetters = [];

  function currentPostcardPool() {
    return postcards.concat(communityLetters);
  }

  var letterboxBtn = document.getElementById("letterbox-btn");
  var letterboxModal = document.getElementById("letterbox-modal");
  var letterboxClose = document.getElementById("letterbox-close");
  var postcardSingle = document.getElementById("postcard-single");
  var postcardAnother = document.getElementById("postcard-another");
  var letterAddToggle = document.getElementById("letter-add-toggle");
  var letterAddForm = document.getElementById("letter-add-form");
  var letterTextInput = document.getElementById("letter-text-input");
  var letterSignInput = document.getElementById("letter-sign-input");
  var letterAddStatus = document.getElementById("letter-add-status");

  function renderPostcard(pc) {
    if (!postcardSingle) return;
    var card = document.createElement("div");
    card.className = "postcard postcard-standalone";
    card.style.transform = "rotate(" + (Math.random() * 3 - 1.5).toFixed(1) + "deg)";

    var stamp = document.createElement("span");
    stamp.className = "postcard-stamp";
    stamp.setAttribute("aria-hidden", "true");

    var text = document.createElement("p");
    text.textContent = "“" + pc.text + "”";

    card.appendChild(stamp);
    card.appendChild(text);

    if (pc.sign) {
      var sign = document.createElement("span");
      sign.className = "postcard-sign";
      sign.textContent = "· " + pc.sign;
      card.appendChild(sign);
    } else if (pc.id) {
      // a community quote with nobody's name on it, still worth a little
      // attribution line instead of just trailing off after the text
      var unsigned = document.createElement("span");
      unsigned.className = "postcard-sign";
      unsigned.textContent = "· shared here, unsigned";
      card.appendChild(unsigned);
    }

    // only ever shown for quotes people actually added (pc.id), never the
    // curated ones, and only once admin mode is unlocked, same gate as
    // every other delete control on the site
    if (pc.id && document.body.classList.contains("admin-mode")) {
      var del = document.createElement("button");
      del.type = "button";
      del.className = "text-link postcard-delete";
      del.textContent = "remove this one";
      del.addEventListener("click", function () {
        del.disabled = true;
        del.textContent = "removing…";
        fetch("/api/letters?id=" + encodeURIComponent(pc.id) + "&passcode=" + encodeURIComponent(ADMIN_PASSCODE), {
          method: "DELETE"
        }).then(function (res) { return res.ok; }).catch(function () { return false; }).then(function (ok) {
          if (!ok) {
            del.disabled = false;
            del.textContent = "remove this one";
            return;
          }
          communityLetters = communityLetters.filter(function (l) { return l.id !== pc.id; });
          showRandomPostcard();
        });
      });
      card.appendChild(del);
    }

    postcardSingle.innerHTML = "";
    postcardSingle.appendChild(card);
  }

  function showRandomPostcard() {
    var pool = currentPostcardPool();
    if (!postcardSingle || !pool.length) return;
    var idx = lastPostcardIndex;
    if (pool.length > 1) {
      while (idx === lastPostcardIndex) {
        idx = Math.floor(Math.random() * pool.length);
      }
    } else {
      idx = 0;
    }
    lastPostcardIndex = idx;
    renderPostcard(pool[idx]);
  }

  // pick up anything other visitors have added since the curated list was
  // written, so it's in the rotation the first time someone opens the
  // letterbox, not just after they've clicked "read another" a few times
  fetch("/api/letters")
    .then(function (res) { return res.json(); })
    .then(function (data) { communityLetters = (data && data.letters) || []; })
    .catch(function () { /* curated quotes still work fine without this */ });

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

  if (letterAddToggle && letterAddForm) {
    letterAddToggle.addEventListener("click", function () {
      var showing = letterAddForm.hidden;
      letterAddForm.hidden = !showing;
      letterAddToggle.setAttribute("aria-expanded", showing ? "true" : "false");
      letterAddToggle.textContent = showing ? "never mind" : "add your own quote";
      if (showing && letterTextInput) letterTextInput.focus();
    });
  }

  if (letterAddForm) {
    letterAddForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = letterTextInput ? letterTextInput.value.trim() : "";
      if (!text) return;
      var sign = letterSignInput ? letterSignInput.value.trim() : "";

      var submitBtn = letterAddForm.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = true;
      if (letterAddStatus) letterAddStatus.textContent = "";

      fetch("/api/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text, sign: sign })
      }).then(function (res) {
        if (!res.ok) throw new Error("post failed");
        return res.json();
      }).then(function (data) {
        communityLetters.push(data.letter);
        letterAddForm.reset();
        letterAddForm.hidden = true;
        if (letterAddToggle) {
          letterAddToggle.setAttribute("aria-expanded", "false");
          letterAddToggle.textContent = "add your own quote";
        }
        lastPostcardIndex = -1; // so it's not skipped as "the one we just showed"
        var pool = currentPostcardPool();
        lastPostcardIndex = pool.indexOf(data.letter);
        renderPostcard(data.letter);
        if (letterAddStatus) letterAddStatus.textContent = "added, thank you for that 🫂";
      }).catch(function () {
        if (letterAddStatus) letterAddStatus.textContent = "couldn't add that right now, try again in a moment";
      }).finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  /* -------------------------------------------------------------
     about page: click a travel card for a longer version of that
     one place. while admin mode is unlocked, Chloe can also edit
     both the short card text and the full story from right here,
     saved to this device via localStorage.
     ------------------------------------------------------------- */

  var placeDetails = {
    vietnam: {
      eyebrow: "NOC · Ho Chi Minh City",
      title: "Vietnam",
      short: "A stint in Ho Chi Minh City with a small startup, building the partnerships that brought over 80 Singaporean students out to see Vietnam's business landscape and startup scene firsthand.",
      body: "I think it's fair to say this was my first time overseas for that long. And yeah, I was scared. Of course I was. Everything was different all at once: the language, the motorbikes everywhere, the food, learning to do my own laundry for the first time. Just getting through an ordinary day took some getting used to, before I even got to the actual work.\n\nI was interning at a small startup, and most of the actual work was partnerships, not paperwork. I helped build relationships with over 30 universities and corporate partners across Vietnam, all so we could bring Singaporean students out to see the business landscape and startup ecosystem there firsthand instead of just hearing about it secondhand. We ran four immersion trips back to back, over 80 students altogether."
    },
    newyork: {
      eyebrow: "NOC · New York City",
      title: "New York",
      short: "A year in New York through NOC, working at a small accelerator that supported early-stage founders: pitch meetings, day-to-day operations, a lot of it new to me.",
      body: "NOC placed me in New York for a year, working at a small accelerator that supported early-stage founders. I sat in on pitch meetings, helped with day-to-day operations, and got a much clearer sense of how much unglamorous work sits underneath a \"startup job.\"\n\nThe city itself took more adjusting to than the job did. I lived in a walk-up with a radiator that never fully turned off, and living alone there meant learning to budget properly for the first time."
    },
    china: {
      eyebrow: "internship · Guangzhou",
      title: "China",
      short: "A separate internship in Guangzhou doing brand marketing, in a completely different company and industry from the accelerator work.",
      body: "This one was separate from NOC: a brand marketing internship in Guangzhou, at a company in a completely different industry from the accelerator work. Day to day that meant campaign work, sitting in on client meetings, and adjusting to a different pace and working style than what I was used to.\n\nIt was also the first time I had to get comfortable speaking up in a meeting with people more senior than me, in a language and culture that wasn't fully mine either."
    }
  };

  // apply any edits Chloe has saved on this device before anything renders
  (function () {
    try {
      var raw = window.localStorage.getItem(TRAVEL_OVERRIDES_KEY);
      var overrides = raw ? JSON.parse(raw) : {};
      Object.keys(overrides).forEach(function (place) {
        if (!placeDetails[place]) return;
        if (overrides[place].short) placeDetails[place].short = overrides[place].short;
        if (overrides[place].body) placeDetails[place].body = overrides[place].body;
        var cardEl = document.getElementById("card-body-" + place);
        if (cardEl) cardEl.textContent = placeDetails[place].short;
      });
    } catch (e) {
      /* ignore */
    }
  })();

  function saveTravelOverride(place, short, body) {
    try {
      var raw = window.localStorage.getItem(TRAVEL_OVERRIDES_KEY);
      var overrides = raw ? JSON.parse(raw) : {};
      overrides[place] = { short: short, body: body };
      window.localStorage.setItem(TRAVEL_OVERRIDES_KEY, JSON.stringify(overrides));
    } catch (e) {
      /* ignore */
    }
  }

  var placeModal = document.getElementById("place-modal");
  var placeClose = document.getElementById("place-close");
  var placeView = document.getElementById("place-view");
  var placeEyebrow = document.getElementById("place-eyebrow");
  var placeTitle = document.getElementById("place-title");
  var placeBody = document.getElementById("place-body");
  var storyCards = document.querySelectorAll(".story-card[data-place]");
  var placeEditForm = document.getElementById("place-edit-form");
  var placeEditEyebrow = document.getElementById("place-edit-eyebrow");
  var placeEditTitle = document.getElementById("place-edit-title");
  var placeEditShort = document.getElementById("place-edit-short");
  var placeEditBody = document.getElementById("place-edit-body");
  var placeEditCancel = document.getElementById("place-edit-cancel");
  var editPlaceButtons = document.querySelectorAll(".admin-edit-place");
  var currentEditPlace = null;

  function fillPlaceBody(text) {
    if (!placeBody) return;
    placeBody.innerHTML = "";
    (text || "").split("\n\n").forEach(function (para) {
      var p = document.createElement("p");
      p.textContent = para;
      placeBody.appendChild(p);
    });
  }

  function showPlaceView(place) {
    var detail = placeDetails[place];
    if (!detail) return;
    currentEditPlace = null;
    if (placeEyebrow) placeEyebrow.textContent = detail.eyebrow;
    if (placeTitle) placeTitle.textContent = detail.title;
    fillPlaceBody(detail.body);
    if (placeView) placeView.hidden = false;
    if (placeEditForm) placeEditForm.hidden = true;
  }

  function showPlaceEdit(place) {
    var detail = placeDetails[place];
    if (!detail) return;
    currentEditPlace = place;
    if (placeEditEyebrow) placeEditEyebrow.textContent = detail.eyebrow;
    if (placeEditTitle) placeEditTitle.textContent = detail.title;
    if (placeEditShort) placeEditShort.value = detail.short || "";
    if (placeEditBody) placeEditBody.value = detail.body || "";
    if (placeView) placeView.hidden = true;
    if (placeEditForm) placeEditForm.hidden = false;
    placeModal.classList.add("open");
    if (placeEditShort) placeEditShort.focus();
  }

  if (placeModal && storyCards.length) {
    storyCards.forEach(function (card) {
      card.addEventListener("click", function () {
        showPlaceView(card.getAttribute("data-place"));
        placeModal.classList.add("open");
        if (placeClose) placeClose.focus();
      });
    });

    editPlaceButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        showPlaceEdit(btn.getAttribute("data-place"));
      });
    });

    if (placeEditForm) {
      placeEditForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!currentEditPlace || !placeDetails[currentEditPlace]) return;
        var short = placeEditShort ? placeEditShort.value.trim() : "";
        var body = placeEditBody ? placeEditBody.value.trim() : "";
        if (!short || !body) return;
        placeDetails[currentEditPlace].short = short;
        placeDetails[currentEditPlace].body = body;
        saveTravelOverride(currentEditPlace, short, body);
        var cardEl = document.getElementById("card-body-" + currentEditPlace);
        if (cardEl) cardEl.textContent = short;
        showPlaceView(currentEditPlace);
      });
    }

    if (placeEditCancel) {
      placeEditCancel.addEventListener("click", function () {
        if (currentEditPlace) showPlaceView(currentEditPlace);
      });
    }

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
  var matchaSurface = document.getElementById("matcha-surface");
  var stirCleanupTimer = null;
  var flashCleanupTimer = null;

  if (stirBowl && foamSwirl) {
    stirBowl.addEventListener("click", function () {
      foamSwirl.classList.remove("stirring");
      void foamSwirl.getBBox(); // restart the animation even on rapid repeat clicks
      foamSwirl.classList.add("stirring");
      blendMixinsIn();

      // a timeout (matching the spin's own 1.1s) cleans this up instead of
      // waiting on the spin's animationend event, which never fires when
      // "reduce motion" is on and the spin is disabled, that used to leave
      // the swirl stuck dimmed at 50% opacity after the very first tap
      clearTimeout(stirCleanupTimer);
      stirCleanupTimer = setTimeout(function () {
        foamSwirl.classList.remove("stirring");
      }, 1150);

      // and a quick brightness flash on the matcha itself, a second, more
      // obvious cue for phones where the spin barely reads (see the
      // reduced-motion note on #matcha-surface in style.css)
      if (matchaSurface) {
        matchaSurface.classList.remove("stirring");
        void matchaSurface.getBoundingClientRect();
        matchaSurface.classList.add("stirring");
        clearTimeout(flashCleanupTimer);
        flashCleanupTimer = setTimeout(function () {
          matchaSurface.classList.remove("stirring");
        }, 550);
      }
    });
  }

  /* -------------------------------------------------------------
     hero bowl: add-ins. purely cosmetic toggles, nothing saved,
     just something to fiddle with while the tab loads
     ------------------------------------------------------------- */

  var mixinLabels = { ice: "ice", strawberry: "strawberry", boba: "boba", honey: "honey" };
  var mixinButtons = document.querySelectorAll(".mixin-btn[data-mixin]");
  var mixinSummary = document.getElementById("mixin-summary");

  function updateMixinSummary() {
    if (!mixinSummary) return;
    var active = Array.prototype.filter.call(mixinButtons, function (btn) {
      return btn.getAttribute("aria-pressed") === "true";
    }).map(function (btn) {
      return mixinLabels[btn.getAttribute("data-mixin")];
    });
    if (active.length) {
      mixinSummary.textContent = "with " + active.join(", ");
      mixinSummary.hidden = false;
    } else {
      mixinSummary.textContent = "";
      mixinSummary.hidden = true;
    }
  }

  mixinButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var name = btn.getAttribute("data-mixin");
      var layer = document.getElementById("mixin-" + name);
      var on = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      if (layer) {
        layer.classList.remove("blending");
        layer.classList.toggle("on", on);
      }
      updateMixinSummary();
    });
  });

  // stirring mixes in whatever's currently added: it fades out instead of
  // sitting on the surface forever, and the picker resets so you can add
  // something fresh
  function blendMixinsIn() {
    var blended = false;
    mixinButtons.forEach(function (btn) {
      if (btn.getAttribute("aria-pressed") !== "true") return;
      blended = true;
      btn.setAttribute("aria-pressed", "false");
      var layer = document.getElementById("mixin-" + btn.getAttribute("data-mixin"));
      if (!layer) return;
      layer.classList.add("blending");
      layer.addEventListener("animationend", function onDone() {
        layer.classList.remove("on", "blending");
        layer.removeEventListener("animationend", onDone);
      });
    });
    if (blended) updateMixinSummary();
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
      "there's no wrong way to use this page, read, write, or just lurk.",
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
