const applicationIcons = [
  '<svg viewBox="0 0 48 48"><rect x="7" y="8" width="34" height="12" rx="3"/><rect x="7" y="28" width="34" height="12" rx="3"/><path d="M14 14h.1M14 34h.1M23 14h14M23 34h14"/></svg>',
  '<svg viewBox="0 0 48 48"><path d="m24 5 18 10-18 10L6 15 24 5Z"/><path d="m6 24 18 10 18-10M6 33l18 10 18-10"/></svg>',
  '<svg viewBox="0 0 48 48"><path d="M9 6h30v36H9zM15 6l5 8M27 6l5 8"/><path d="m20 20 12 7-12 7V20Z"/></svg>',
  '<svg viewBox="0 0 48 48"><rect x="5" y="7" width="38" height="28" rx="3"/><path d="m20 14 13 7-13 7V14ZM15 42h18M24 35v7"/></svg>',
  '<svg viewBox="0 0 48 48"><path d="M24 12c-6-5-12-5-18-3v29c6-2 12-2 18 3 6-5 12-5 18-3V9c-6-2-12-2-18 3Z"/><path d="M24 12v29"/></svg>',
  '<svg viewBox="0 0 48 48"><rect x="5" y="7" width="38" height="34" rx="4"/><circle cx="17" cy="18" r="3"/><path d="m8 36 11-11 7 7 6-6 8 10"/></svg>'
];
const applicationKinds = ["admin", "vm", "requests", "jellyfin", "books", "photos"];
const serverIcon = `<svg viewBox="0 0 64 64" focusable="false">
  <path class="grass-cube__left" d="M8 18 32 30v28L8 45Z"/>
  <path class="grass-cube__right" d="m56 18-24 12v28l24-13Z"/>
  <path class="grass-cube__top" d="M32 5 56 18 32 31 8 18Z"/>
  <path class="grass-cube__top-pixel" d="m12 17 7-4 5 3 5-3 4 3 7-4 11 6-19 11Z"/>
  <path class="grass-cube__top-highlight" d="m12 17 7-4 5 3-6 4Z M30 16l3-2 4 3-4 2Z M42 16l5-3 4 3-6 3Z"/>
  <path class="grass-cube__dirt-left" d="m11 30 5 2v7l-5-3Z M20 36l5 3v7l-5-3Z M11 43l6 3v5l-6-3Z M27 45l3 2v7l-3-2Z"/>
  <path class="grass-cube__dirt-right" d="m38 34 6-3v7l-6 3Z M48 39l5-3v7l-5 3Z M34 47l6-3v8l-6 3Z M45 48l5-3v5l-5 3Z"/>
  <path class="grass-cube__edge" d="M8 18 32 5l24 13v27L32 58 8 45Z M32 31v27M8 18l24 13 24-13"/>
</svg>`;
const channelIcons = {
  slime: `<svg viewBox="0 0 64 64" focusable="false">
    <path class="sloth-slime__ear" d="M12 27c-1-7 3-11 8-10 4 1 6 5 5 10M39 27c-1-6 2-10 7-10s8 5 7 11"/>
    <path class="sloth-slime__body" d="M10 43c-2-7 0-15 5-20l5-7c3-4 8-3 10 1l2 3 4-5c3-4 8-2 9 2l1 5c7 4 10 11 8 19l-2 7c-1 3-4 4-7 2l-1 6c-1 4-6 5-8 1l-2-6-7 1-2 6c-2 4-7 3-8-1l-1-6c-3 2-6 1-7-2Z"/>
    <path class="sloth-slime__mask" d="M15 29c2-5 7-7 11-5 3 2 4 7 2 11-2 4-7 5-11 3-3-2-4-6-2-9ZM37 27c3-4 8-4 11-1 3 3 3 8 0 11-3 3-8 3-11 0-3-3-3-7 0-10Z"/>
    <path class="sloth-slime__muzzle" d="M22 37c3-3 7-4 10-2 4-2 8-1 11 2 2 3 1 8-3 10-5 3-12 3-17 0-4-2-5-7-1-10Z"/>
    <path class="sloth-slime__eye" d="M21 31h.2M42 31h.2"/>
    <path class="sloth-slime__nose" d="m29 39 3-2 4 2-3 3Z"/>
    <path class="sloth-slime__smile" d="M30 43c1 2 4 2 5 0"/>
    <path class="sloth-slime__drip" d="M14 51c-1 4-1 6 1 8M49 49c2 3 2 5 1 7"/>
    <path class="sloth-slime__sparkle" d="m52 8 1.5 3.5L57 13l-3.5 1.5L52 18l-1.5-3.5L47 13l3.5-1.5Z"/>
  </svg>`,
  crawler: `<svg viewBox="0 0 64 64" focusable="false">
    <!-- Original hardbody illustration: rear tires, chassis, shell, near tires, camera. -->
    <g stroke="#292e31" stroke-width="2" stroke-linejoin="round">
      <path fill="#24292c" d="M8 39h43v10H14Z"/>
      <ellipse fill="#24292c" cx="10" cy="47" rx="5" ry="8"/>
      <path class="crawler__body" d="M5 33 18 28 24 19 49 16 56 19 60 33 60 42 29 49 5 42Z"/>
      <path fill="#f5f5ef" d="M29 36 35 31 42 22 56 19 60 33 60 42 29 49Z"/>
      <path fill="#fafaf5" d="M5 33 18 28 35 31 29 36Z"/>
      <path fill="#c4cdd0" stroke-width="1.4" d="M21 27 25 21 39 23 34 29Z"/>
      <path fill="#b7c3c7" stroke-width="1.4" d="M43 24 48 23 49 31 38 34Z M51 22 55 21 58 30 52 31Z"/>
      <path fill="none" stroke="#8c9597" stroke-width="1" d="M50 34v7"/>
      <path fill="#f6f6ef" d="m5 33 24 3v10L5 42Z"/>
      <path fill="#303639" stroke="none" d="m11 36 10 2v3l-10-2Z"/>
      <path fill="#e3e9e8" stroke="none" d="m6 34 4 1v3l-4-1Zm16 3 5 1v3l-5-1Z"/>
      <path fill="#24292c" d="m4 41 24 5 3-1v4l-4 1-19-5Z"/>
      <ellipse class="crawler__tire" cx="54" cy="43" rx="6" ry="9"/>
      <ellipse class="crawler__tire" cx="30" cy="50" rx="7" ry="10"/>
      <ellipse fill="#b9c0c0" cx="55" cy="43" rx="2.6" ry="4.7"/>
      <ellipse fill="#b9c0c0" cx="31" cy="50" rx="3" ry="5.3"/>
      <path fill="none" stroke-width="3" d="M35 15v5m-3 0 7-1"/>
      <path class="crawler__camera" style="fill:#394149" d="m28 4 5-2 9 2v10l-5 3-9-3Z"/>
      <path class="crawler__camera" style="fill:#191e23" d="m28 4 9 3v10l-9-3Z"/>
      <ellipse class="crawler__lens" style="fill:#68c9ef" cx="32.5" cy="10" rx="2.5" ry="3"/>
    </g>
  </svg>`
};

function copyFallback(text, documentRef) {
  const field = documentRef.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  documentRef.body.append(field);
  field.select();
  const copied = documentRef.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Clipboard copy failed");
}

function makeSectionHeading(title, id, documentRef) {
  const wrapper = documentRef.createElement("div");
  wrapper.className = "section-heading";
  const lineBefore = documentRef.createElement("span");
  lineBefore.className = "section-heading__line";
  lineBefore.setAttribute("aria-hidden", "true");
  const heading = documentRef.createElement("h2");
  heading.id = id;
  heading.textContent = title;
  const lineAfter = documentRef.createElement("span");
  lineAfter.className = "section-heading__line";
  lineAfter.setAttribute("aria-hidden", "true");
  wrapper.append(lineBefore, heading, lineAfter);
  return { wrapper, heading };
}

export function renderServices(services, serviceGrid, documentRef = document) {
  serviceGrid.replaceChildren();
  services.forEach((service, index) => {
    const card = documentRef.createElement("article");
    card.className = `service-card service-card--${applicationKinds[index] || "admin"}`;

    const icon = documentRef.createElement("span");
    icon.className = "service-card__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = applicationIcons[index] || applicationIcons[0];

    const copy = documentRef.createElement("span");
    copy.className = "service-card__copy";
    const name = documentRef.createElement("strong");
    name.textContent = service.name;
    const description = documentRef.createElement("small");
    description.textContent = service.description;
    copy.append(name, description);

    const status = documentRef.createElement("span");
    status.className = "service-card__status";
    status.textContent = service.href ? "Configured" : "Not configured";
    card.append(icon, copy, status);

    if (typeof service.href === "string" && service.href) {
      const link = documentRef.createElement("a");
      link.className = "service-card__link";
      link.href = service.href;
      link.setAttribute("aria-label", `Open ${service.name}`);
      card.append(link);
      card.classList.add("service-card--configured");
    }
    serviceGrid.append(card);
  });
}

export function renderServer(server, section, documentRef = document, navigatorRef = navigator) {
  section.replaceChildren();
  if (!server) return;

  const { wrapper: heading, heading: title } = makeSectionHeading(server.sectionTitle, "server-title", documentRef);
  section.setAttribute("aria-labelledby", title.id);
  const showcase = documentRef.createElement("div");
  showcase.className = "server-showcase";

  const identity = documentRef.createElement("div");
  identity.className = "server-showcase__identity";
  const icon = documentRef.createElement("span");
  icon.className = "server-showcase__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = serverIcon;
  const introduction = documentRef.createElement("div");
  introduction.className = "server-showcase__introduction";
  const edition = documentRef.createElement("p");
  edition.className = "server-showcase__eyebrow";
  edition.textContent = server.name;
  const subtitle = documentRef.createElement("p");
  subtitle.className = "server-showcase__subtitle";
  subtitle.textContent = server.subtitle;
  introduction.append(edition, subtitle);
  identity.append(icon, introduction);

  const endpoint = documentRef.createElement("div");
  endpoint.className = "server-showcase__endpoint";
  const label = documentRef.createElement("p");
  label.className = "server-showcase__address-label";
  label.textContent = "Server Address";
  const endpointLine = documentRef.createElement("div");
  endpointLine.className = "server-showcase__endpoint-line";
  const address = documentRef.createElement("code");
  address.className = "server-showcase__address";
  address.textContent = server.address;
  const copyButton = documentRef.createElement("button");
  copyButton.className = "server-showcase__copy-button";
  copyButton.type = "button";
  copyButton.textContent = "Copy Server Address";
  copyButton.setAttribute("aria-label", "Copy Server Address");
  const feedback = documentRef.createElement("span");
  feedback.className = "server-showcase__feedback";
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  copyButton.addEventListener("click", async () => {
    try {
      if (navigatorRef.clipboard?.writeText) await navigatorRef.clipboard.writeText(server.address);
      else copyFallback(server.address, documentRef);
      copyButton.textContent = "Copied!";
      feedback.textContent = "Server address copied to clipboard.";
    } catch {
      copyButton.textContent = "Copy failed";
      feedback.textContent = "Copy failed. Select the address to copy it manually.";
    }
  });
  endpointLine.append(address, copyButton);
  endpoint.append(label, endpointLine, feedback);

  showcase.append(identity, endpoint);
  section.append(heading, showcase);
}

export function renderChannels(channels, section, documentRef = document) {
  section.replaceChildren();
  const { wrapper: heading, heading: title } = makeSectionHeading("Our YouTube Channels", "channels-title", documentRef);
  section.setAttribute("aria-labelledby", title.id);
  const grid = documentRef.createElement("div");
  grid.className = "channel-grid";

  (Array.isArray(channels) ? channels : []).forEach((channel, index) => {
    const card = documentRef.createElement("article");
    card.className = `channel-card channel-card--${channel.icon || "default"}`;
    const icon = documentRef.createElement("span");
    icon.className = "channel-card__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = channelIcons[channel.icon] || channelIcons[index === 0 ? "slime" : "crawler"];

    const copy = documentRef.createElement("div");
    copy.className = "channel-card__copy";
    const name = documentRef.createElement("h3");
    name.textContent = channel.name;
    const description = documentRef.createElement("p");
    description.textContent = channel.description;
    const link = documentRef.createElement("a");
    link.className = "channel-card__link";
    link.href = channel.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open Channel";
    copy.append(name, description, link);
    card.append(icon, copy);
    grid.append(card);
  });

  section.append(heading, grid);
}
