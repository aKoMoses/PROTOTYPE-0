let tooltipRoot = null;
let tooltipContent = null;
let activeTrigger = null;
let activeOptions = null;
let listenersBound = false;

const triggerState = new WeakMap();

function ensureTooltipNode() {
  if (tooltipRoot) {
    return tooltipRoot;
  }

  tooltipRoot = document.createElement("div");
  tooltipRoot.className = "p0-click-tooltip is-hidden";
  tooltipRoot.id = "p0-click-tooltip";
  tooltipRoot.setAttribute("role", "tooltip");
  tooltipRoot.setAttribute("aria-hidden", "true");
  tooltipRoot.dataset.placement = "bottom";

  tooltipContent = document.createElement("div");
  tooltipContent.className = "p0-click-tooltip__content";
  tooltipRoot.appendChild(tooltipContent);

  document.body.appendChild(tooltipRoot);
  return tooltipRoot;
}

function ensureGlobalListeners() {
  if (listenersBound) {
    return;
  }

  listenersBound = true;

  document.addEventListener("click", (event) => {
    if (!activeTrigger || !tooltipRoot) {
      return;
    }

    const target = event.target;
    if (target instanceof Node) {
      if (target === activeTrigger || activeTrigger.contains(target)) {
        return;
      }
      if (tooltipRoot.contains(target)) {
        return;
      }
    }

    hideClickTooltip();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideClickTooltip();
    }
  });

  window.addEventListener("resize", () => {
    if (activeTrigger) {
      positionTooltip(activeTrigger, activeOptions);
    }
  });

  window.addEventListener(
    "scroll",
    () => {
      if (activeTrigger) {
        hideClickTooltip();
      }
    },
    true,
  );
}

function isNaturallyFocusable(element) {
  const tag = element.tagName;
  return tag === "BUTTON"
    || tag === "A"
    || tag === "INPUT"
    || tag === "SELECT"
    || tag === "TEXTAREA";
}

function normalizeTooltipText(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  return text.replace(/\r\n?/g, "\n");
}

function positionTooltip(trigger, options = {}) {
  if (!tooltipRoot || !trigger) {
    return;
  }

  const margin = options.margin ?? 10;
  const gap = options.gap ?? 10;
  const maxWidth = options.maxWidth ?? 360;

  tooltipRoot.style.maxWidth = `${maxWidth}px`;
  tooltipRoot.style.left = "0px";
  tooltipRoot.style.top = "0px";

  const triggerRect = trigger.getBoundingClientRect();
  const tooltipRect = tooltipRoot.getBoundingClientRect();

  let top = triggerRect.bottom + gap;
  let placement = "bottom";

  if (top + tooltipRect.height > window.innerHeight - margin) {
    top = triggerRect.top - tooltipRect.height - gap;
    placement = "top";
  }

  if (top < margin) {
    top = Math.max(
      margin,
      Math.min(window.innerHeight - tooltipRect.height - margin, triggerRect.bottom + gap),
    );
    placement = "bottom";
  }

  let left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
  left = Math.max(margin, Math.min(window.innerWidth - tooltipRect.width - margin, left));

  tooltipRoot.style.left = `${Math.round(left)}px`;
  tooltipRoot.style.top = `${Math.round(top)}px`;
  tooltipRoot.dataset.placement = placement;
}

function showTooltip(trigger, text, options = {}) {
  const normalizedText = normalizeTooltipText(text);
  if (!normalizedText) {
    return;
  }

  ensureTooltipNode();
  ensureGlobalListeners();

  if (!tooltipRoot || !tooltipContent) {
    return;
  }

  if (activeTrigger && activeTrigger !== trigger) {
    activeTrigger.classList.remove("is-tooltip-open");
    activeTrigger.removeAttribute("aria-describedby");
  }

  tooltipContent.textContent = normalizedText;
  activeTrigger = trigger;
  activeOptions = options;

  tooltipRoot.classList.remove("is-hidden");
  tooltipRoot.classList.add("is-visible");
  tooltipRoot.setAttribute("aria-hidden", "false");

  trigger.classList.add("is-tooltip-open");
  trigger.setAttribute("aria-describedby", tooltipRoot.id);

  positionTooltip(trigger, options);
}

function onTriggerClick(event) {
  const trigger = event.currentTarget;
  if (!(trigger instanceof HTMLElement)) {
    return;
  }

  const state = triggerState.get(trigger);
  if (!state?.text) {
    return;
  }

  const isSameTrigger = activeTrigger === trigger;
  if (isSameTrigger) {
    hideClickTooltip();
  } else {
    showTooltip(trigger, state.text, state.options);
  }

  if (state.options?.stopClick) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function onTriggerKeydown(event) {
  const trigger = event.currentTarget;
  if (!(trigger instanceof HTMLElement)) {
    return;
  }

  const state = triggerState.get(trigger);
  if (!state?.text) {
    return;
  }

  if (event.key === "Escape") {
    hideClickTooltip();
    return;
  }

  if (isNaturallyFocusable(trigger)) {
    return;
  }

  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const isSameTrigger = activeTrigger === trigger;
  if (isSameTrigger) {
    hideClickTooltip();
  } else {
    showTooltip(trigger, state.text, state.options);
  }

  event.preventDefault();
  if (state.options?.stopClick) {
    event.stopPropagation();
  }
}

export function hideClickTooltip() {
  if (!tooltipRoot) {
    activeTrigger?.classList.remove("is-tooltip-open");
    activeTrigger?.removeAttribute("aria-describedby");
    activeTrigger = null;
    activeOptions = null;
    return;
  }

  if (activeTrigger) {
    activeTrigger.classList.remove("is-tooltip-open");
    activeTrigger.removeAttribute("aria-describedby");
  }

  tooltipRoot.classList.remove("is-visible");
  tooltipRoot.classList.add("is-hidden");
  tooltipRoot.setAttribute("aria-hidden", "true");

  activeTrigger = null;
  activeOptions = null;
}

export function registerClickTooltip(trigger, text, options = {}) {
  if (!(trigger instanceof HTMLElement)) {
    return;
  }

  const normalizedText = normalizeTooltipText(text);
  if (!normalizedText) {
    triggerState.delete(trigger);
    trigger.classList.remove("has-click-tooltip", "is-tooltip-open");
    trigger.removeAttribute("data-tooltip");
    trigger.removeAttribute("aria-describedby");
    return;
  }

  ensureGlobalListeners();

  trigger.dataset.tooltip = normalizedText;
  trigger.classList.add("has-click-tooltip");

  if (!isNaturallyFocusable(trigger) && !trigger.hasAttribute("tabindex")) {
    trigger.tabIndex = 0;
  }

  if (!trigger.dataset.tooltipBound) {
    trigger.dataset.tooltipBound = "1";
    trigger.addEventListener("click", onTriggerClick);
    trigger.addEventListener("keydown", onTriggerKeydown);
  }

  triggerState.set(trigger, {
    text: normalizedText,
    options,
  });
}
