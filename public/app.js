(() => {
  const themes = ["magic", "utah", "arcade", "trail"];
  const artwork = {
    magic: "/artwork/magic-library.webp",
    utah: "/artwork/utah-stadium.webp",
    arcade: "/artwork/retro-arcade.webp",
    trail: "/artwork/rc-trail.webp"
  };
  const icons = [
    '<svg viewBox="0 0 48 48"><rect x="7" y="8" width="34" height="12" rx="3"/><rect x="7" y="28" width="34" height="12" rx="3"/><path d="M14 14h.1M14 34h.1M23 14h14M23 34h14"/></svg>',
    '<svg viewBox="0 0 48 48"><path d="m24 5 18 10-18 10L6 15 24 5Z"/><path d="m6 24 18 10 18-10M6 33l18 10 18-10"/></svg>',
    '<svg viewBox="0 0 48 48"><path d="M9 6h30v36H9zM15 6l5 8M27 6l5 8"/><path d="m20 20 12 7-12 7V20Z"/></svg>',
    '<svg viewBox="0 0 48 48"><rect x="5" y="7" width="38" height="28" rx="3"/><path d="m20 14 13 7-13 7V14ZM15 42h18M24 35v7"/></svg>',
    '<svg viewBox="0 0 48 48"><path d="M24 12c-6-5-12-5-18-3v29c6-2 12-2 18 3 6-5 12-5 18-3V9c-6-2-12-2-18 3Z"/><path d="M24 12v29"/></svg>',
    '<svg viewBox="0 0 48 48"><rect x="5" y="7" width="38" height="34" rx="4"/><circle cx="17" cy="18" r="3"/><path d="m8 36 11-11 7 7 6-6 8 10"/></svg>'
  ];
  const cardKinds = ["admin", "vm", "requests", "jellyfin", "books", "photos"];
  const themeSelect = document.querySelector("#theme-select");
  const sceneArt = document.querySelector("#scene-art");
  const challengePanel = document.querySelector("#challenge-panel");
  const destinations = document.querySelector("#destinations");
  const serviceGrid = document.querySelector("#service-grid");
  const questionPrompt = document.querySelector("#question-prompt");
  const answerInput = document.querySelector("#answer-input");
  const answerForm = document.querySelector("#answer-form");
  const submitButton = document.querySelector("#answer-submit");
  const newQuestionButton = document.querySelector("#new-question");
  const message = document.querySelector("#feedback-message");
  let challengeToken = "";

  const savedTheme = localStorage.getItem("tetsao-theme");
  const initialTheme = themes.includes(savedTheme)
    ? savedTheme
    : themes[Math.floor(Math.random() * themes.length)];

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const labels = { magic: "Magic", utah: "Utah Game Day", arcade: "Retro Arcade", trail: "RC Trail" };
    const colors = { magic: "#281810", utah: "#64101d", arcade: "#120b3d", trail: "#26332d" };
    document.title = `Tetsao Party — ${labels[theme]}`;
    document.querySelector('meta[name="theme-color"]').content = colors[theme];
    const nextArtwork = artwork[theme];
    if (sceneArt.getAttribute("src") !== nextArtwork) sceneArt.src = nextArtwork;
  }

  applyTheme(initialTheme);
  themeSelect.value = savedTheme && themes.includes(savedTheme) ? savedTheme : "random";
  themeSelect.addEventListener("change", (event) => {
    const selection = event.currentTarget.value;
    if (selection === "random") {
      localStorage.removeItem("tetsao-theme");
      applyTheme(themes[Math.floor(Math.random() * themes.length)]);
      return;
    }
    localStorage.setItem("tetsao-theme", selection);
    applyTheme(selection);
  });

  function setMessage(text) {
    message.textContent = text;
  }

  function setBusy(busy) {
    answerInput.disabled = busy || !challengeToken;
    submitButton.disabled = busy || !challengeToken;
    newQuestionButton.disabled = busy;
  }

  async function readJson(response) {
    let body;
    try {
      body = await response.json();
    } catch {
      throw new Error("The portal couldn't read that response. Please try again.");
    }
    return { response, body };
  }

  async function requestQuestion({ clearMessage = true } = {}) {
    setBusy(true);
    if (clearMessage) setMessage("");
    questionPrompt.textContent = "Finding a question…";
    try {
      const { response, body } = await readJson(await fetch("/api/challenge", { headers: { Accept: "application/json" } }));
      if (!response.ok) throw new Error(body.error || "The portal couldn't load a question.");
      if (body.authenticated) {
        await loadDashboard();
        return;
      }
      challengeToken = body.challenge;
      questionPrompt.textContent = body.question;
      answerInput.value = "";
      setBusy(false);
      answerInput.focus();
    } catch (error) {
      challengeToken = "";
      setBusy(true);
      questionPrompt.textContent = "The question is taking a little longer than usual.";
      setMessage(error.message || "Please refresh the page and try again.");
      newQuestionButton.disabled = false;
    }
  }

  function renderServices(services) {
    serviceGrid.replaceChildren();
    services.forEach((service, index) => {
      const card = document.createElement("article");
      card.className = `service-card service-card--${cardKinds[index] || "admin"}`;

      const icon = document.createElement("span");
      icon.className = "service-card__icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = icons[index] || icons[0];

      const copy = document.createElement("span");
      copy.className = "service-card__copy";
      const name = document.createElement("strong");
      name.textContent = service.name;
      const description = document.createElement("small");
      description.textContent = service.description;
      copy.append(name, description);

      const status = document.createElement("span");
      status.className = "service-card__status";
      status.textContent = service.href ? "Configured" : "Not configured";
      card.append(icon, copy, status);

      if (typeof service.href === "string" && service.href) {
        const link = document.createElement("a");
        link.className = "service-card__link";
        link.href = service.href;
        link.setAttribute("aria-label", `Open ${service.name}`);
        card.append(link);
        card.classList.add("service-card--configured");
      }
      serviceGrid.append(card);
    });
  }

  async function loadDashboard() {
    setBusy(true);
    setMessage("");
    try {
      const { response, body } = await readJson(await fetch("/api/dashboard", { headers: { Accept: "application/json" } }));
      if (response.status === 401) {
        challengePanel.hidden = false;
        destinations.hidden = true;
        await requestQuestion({ clearMessage: false });
        return;
      }
      if (!response.ok) throw new Error(body.error || "The dashboard couldn't be loaded.");
      renderServices(body.services);
      challengePanel.hidden = true;
      destinations.hidden = false;
      destinations.focus?.();
    } catch (error) {
      challengePanel.hidden = false;
      destinations.hidden = true;
      setMessage(error.message || "The dashboard couldn't be loaded. Please try again.");
    }
  }

  answerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!challengeToken || answerInput.disabled) return;
    setBusy(true);
    setMessage("");
    try {
      const { response, body } = await readJson(await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ answer: answerInput.value, challenge: challengeToken })
      }));
      if (!response.ok) throw new Error(body.error || "We couldn't check that answer. Please try again.");
      challengeToken = "";
      await loadDashboard();
    } catch (error) {
      setMessage(error.message || "We couldn't check that answer. Please try again.");
      setBusy(false);
      answerInput.focus();
    }
  });

  newQuestionButton.addEventListener("click", () => requestQuestion());

  (async function initialize() {
    if (savedTheme && themes.includes(savedTheme)) themeSelect.value = savedTheme;
    else themeSelect.value = "random";
    await requestQuestion();
  })();
})();
