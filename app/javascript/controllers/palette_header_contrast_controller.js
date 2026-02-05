// app/javascript/controllers/palette_header_contrast_controller.js

import { Controller } from "@hotwired/stimulus"

// Style definitions by mode: default | light | mid | dark
const MODE_STYLES = {
  headerBg: {
    default: "bg-base-100",
    light: "bg-white/40",
    mid: "bg-black/30",
    dark: "bg-white/10"
  },
  headerText: {
    default: "text-base-content",
    light: "text-gray-900",
    mid: "text-white",
    dark: "text-white"
  },
  headerTextMuted: {
    default: "text-base-content/70",
    light: "text-gray-900/70",
    mid: "text-white/80",
    dark: "text-white/80"
  },
  buttonGhost: {
    default: "btn-ghost",
    light: "btn-ghost text-gray-900 hover:bg-gray-900/10",
    mid: "btn-ghost text-white hover:bg-white/10",
    dark: "btn-ghost text-white hover:bg-white/10"
  },
  saveButton: {
    default: "btn-neutral",
    light: "bg-gray-900 text-white border-gray-900 hover:bg-gray-800",
    mid: "bg-white text-gray-900 border-white hover:bg-gray-100",
    dark: "bg-white text-gray-900 border-white hover:bg-gray-100"
  },
  indicator: {
    default: "bg-base-content",
    light: "bg-gray-900",
    mid: "bg-white",
    dark: "bg-white"
  },
  selectorButton: {
    default: "bg-base-100 text-base-content border-base-content hover:bg-base-200",
    light: "bg-white/50 text-gray-900 border-gray-900/50 hover:bg-white/70",
    mid: "bg-black/30 text-white border-white/50 hover:bg-black/40",
    dark: "bg-white/10 text-white border-white/50 hover:bg-white/20"
  },
  selectorTextMuted: {
    default: "text-base-content/70",
    light: "text-gray-900/70",
    mid: "text-white/70",
    dark: "text-white/70"
  },
  selectorIcon: {
    default: "text-base-content",
    light: "text-gray-900",
    mid: "text-white",
    dark: "text-white"
  },
  addButtonBorder: {
    default: "border-base-content/30 hover:border-base-content/50 hover:bg-base-content/5",
    light: "border-gray-900/30 hover:border-gray-900/50 hover:bg-gray-900/5",
    mid: "border-white/30 hover:border-white/50 hover:bg-white/5",
    dark: "border-white/30 hover:border-white/50 hover:bg-white/5"
  }
}

// Pre-compute all variant classes for each category (for efficient removal)
const ALL_VARIANTS = Object.fromEntries(
  Object.entries(MODE_STYLES).map(([ category, modes ]) => [
    category,
    [ ...new Set(Object.values(modes).flatMap(v => v.split(" "))) ]
  ])
)

export default class extends Controller {
  static targets = [
    "card", "text", "textMuted", "buttonGhost", "saveButton",
    "indicator", "selectorButton", "selectorTextMuted", "selectorIcon", "addButtonBorder"
  ]

  connect() {
    this.currentMode = "default"

    // Listen for palette background changes
    this.backgroundHandler = this.handleBackgroundChange.bind(this)
    window.addEventListener("palette-editor:backgroundChanged", this.backgroundHandler)
  }

  disconnect() {
    window.removeEventListener("palette-editor:backgroundChanged", this.backgroundHandler)
  }

  handleBackgroundChange(event) {
    const { hex } = event.detail

    if (!hex) {
      this.applyMode("default")
      return
    }

    const mode = this.calculateMode(hex)
    this.applyMode(mode)
  }

  calculateMode(hex) {
    // Convert hex to perceived lightness using relative luminance
    const r = parseInt(hex.slice(0, 2), 16) / 255
    const g = parseInt(hex.slice(2, 4), 16) / 255
    const b = parseInt(hex.slice(4, 6), 16) / 255

    // Calculate relative luminance (standard formula)
    const luminance = 0.2126 * this.linearize(r) +
                      0.7152 * this.linearize(g) +
                      0.0722 * this.linearize(b)

    // Thresholds based on fabric_contrast_controller patterns
    if (luminance > 0.5) return "light"
    if (luminance > 0.2) return "mid"
    return "dark"
  }

  linearize(value) {
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4)
  }

  applyMode(mode) {
    this.currentMode = mode

    // Header elements
    this.cardTargets.forEach(el => this.applyStyle(el, "headerBg", mode))
    this.textTargets.forEach(el => this.applyStyle(el, "headerText", mode))
    this.textMutedTargets.forEach(el => this.applyStyle(el, "headerTextMuted", mode))
    this.buttonGhostTargets.forEach(el => this.applyStyle(el, "buttonGhost", mode))
    this.saveButtonTargets.forEach(el => this.applyStyle(el, "saveButton", mode))

    // Pill indicators
    this.indicatorTargets.forEach(el => this.applyStyle(el, "indicator", mode))

    // Background selector
    this.selectorButtonTargets.forEach(el => this.applyStyle(el, "selectorButton", mode))
    this.selectorTextMutedTargets.forEach(el => this.applyStyle(el, "selectorTextMuted", mode))
    this.selectorIconTargets.forEach(el => this.applyStyle(el, "selectorIcon", mode))

    // Add button
    this.addButtonBorderTargets.forEach(el => this.applyStyle(el, "addButtonBorder", mode))
  }

  applyStyle(element, category, mode) {
    element.classList.remove(...ALL_VARIANTS[ category ])
    element.classList.add(...MODE_STYLES[ category ][ mode ].split(" "))
  }
}
