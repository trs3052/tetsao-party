import { renderServices } from "./service-cards.js";

(() => {
  const themes = ["magic", "utah", "arcade", "trail"];
  const artwork = {
    magic: "/artwork/magic-library.webp",
    utah: "/artwork/utah-stadium.webp",
    arcade: "/artwork/retro-arcade.webp",
    trail: "/artwork/rc-trail.webp"
  };
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
      renderServices(body.services, serviceGrid);
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
