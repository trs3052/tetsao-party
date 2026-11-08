const icons = [
  '<svg viewBox="0 0 48 48"><rect x="7" y="8" width="34" height="12" rx="3"/><rect x="7" y="28" width="34" height="12" rx="3"/><path d="M14 14h.1M14 34h.1M23 14h14M23 34h14"/></svg>',
  '<svg viewBox="0 0 48 48"><path d="m24 5 18 10-18 10L6 15 24 5Z"/><path d="m6 24 18 10 18-10M6 33l18 10 18-10"/></svg>',
  '<svg viewBox="0 0 48 48"><path d="M9 6h30v36H9zM15 6l5 8M27 6l5 8"/><path d="m20 20 12 7-12 7V20Z"/></svg>',
  '<svg viewBox="0 0 48 48"><rect x="5" y="7" width="38" height="28" rx="3"/><path d="m20 14 13 7-13 7V14ZM15 42h18M24 35v7"/></svg>',
  '<svg viewBox="0 0 48 48"><path d="M24 12c-6-5-12-5-18-3v29c6-2 12-2 18 3 6-5 12-5 18-3V9c-6-2-12-2-18 3Z"/><path d="M24 12v29"/></svg>',
  '<svg viewBox="0 0 48 48"><rect x="5" y="7" width="38" height="34" rx="4"/><circle cx="17" cy="18" r="3"/><path d="m8 36 11-11 7 7 6-6 8 10"/></svg>',
  '<svg viewBox="0 0 48 48"><path d="M6 15h12v5h12v-5h12v19h-8v7H14v-7H6z"/><path d="M18 15V9h12v6M6 20h12v7h12v-7h12"/></svg>'
];
const cardKinds = ["admin", "vm", "requests", "jellyfin", "books", "photos", "minecraft"];

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

export function renderServices(services, serviceGrid, documentRef = document, navigatorRef = navigator) {
  serviceGrid.replaceChildren();
  services.forEach((service, index) => {
    const card = documentRef.createElement("article");
    card.className = `service-card service-card--${cardKinds[index] || "admin"}`;

    const icon = documentRef.createElement("span");
    icon.className = "service-card__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = icons[index] || icons[0];

    const copy = documentRef.createElement("span");
    copy.className = "service-card__copy";
    const name = documentRef.createElement("strong");
    name.textContent = service.name;
    const description = documentRef.createElement("small");
    description.textContent = service.description;
    copy.append(name, description);

    const status = documentRef.createElement("span");
    status.className = "service-card__status";
    status.textContent = service.address ? "Java server address" : service.href ? "Configured" : "Not configured";
    card.append(icon, copy, status);

    if (typeof service.address === "string" && service.address) {
      const address = documentRef.createElement("code");
      address.className = "service-card__address";
      address.textContent = service.address;
      copy.append(address);

      const action = documentRef.createElement("span");
      action.className = "service-card__action";
      const button = documentRef.createElement("button");
      button.className = "service-card__copy-button";
      button.type = "button";
      button.textContent = "Copy address";
      button.setAttribute("aria-label", `Copy ${service.name} server address`);
      const feedback = documentRef.createElement("span");
      feedback.className = "service-card__copy-feedback";
      feedback.setAttribute("role", "status");
      feedback.setAttribute("aria-live", "polite");
      button.addEventListener("click", async () => {
        try {
          if (navigatorRef.clipboard?.writeText) await navigatorRef.clipboard.writeText(service.address);
          else copyFallback(service.address, documentRef);
          button.textContent = "Copied!";
          feedback.textContent = "Address copied to clipboard.";
        } catch {
          button.textContent = "Copy failed";
          feedback.textContent = "Copy failed. Select the address to copy it manually.";
        }
      });
      action.append(button, feedback);
      card.append(action);
    }

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
