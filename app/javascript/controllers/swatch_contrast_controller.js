// app/javascript/controllers/swatch_contrast_controller.js

import { Controller } from "@hotwired/stimulus"

// Style definitions by mode: default | light | mid | dark
const MODE_STYLES = {
  swatchBorder: {
    default: "border-gray-300",
    light: "border-gray-900/20",
    mid: "border-white/40",
    dark: "border-white/15"
  },
  swatchCode: {
    default: "text-base-content",
    light: "text-gray-900",
    mid: "text-white",
    dark: "text-white"
  },
  swatchName: {
    default: "text-base-content/70",
    light: "text-gray-900/70",
    mid: "text-white/90",
    dark: "text-white/80"
  },
  inPaletteRing: {
    default: "ring-base-content/30",
    light: "ring-gray-900/30",
    mid: "ring-white/50",
    dark: "ring-white/30"
  },
  emptyMessage: {
    default: "text-base-content",
    light: "text-gray-900",
    mid: "text-white",
    dark: "text-white"
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
  static targets = [ "swatchCard", "swatchCode", "swatchName", "emptyMessage" ]
  static values = {
    hex: String,
    oklchL: Number,
    type: { type: String, default: "thread" }  // "thread" or "fabric"
  }

  connect() {
    this.currentMode = "default"

    // Listen for palette background changes (only relevant for thread type)
    this.backgroundHandler = this.handleBackgroundChange.bind(this)
    window.addEventListener("palette-editor:backgroundChanged", this.backgroundHandler)

    // Apply initial mode
    this.applyInitialMode()
  }

  disconnect() {
    window.removeEventListener("palette-editor:backgroundChanged", this.backgroundHandler)
  }

  applyInitialMode() {
    // Fabric swatches always use default mode (displayed on bg-base-200)
    if (this.typeValue === "fabric") {
      this.applyMode("default")
      return
    }

    // Thread swatches: use oklchL if available, then hex, else default
    if (this.hasOklchLValue && this.oklchLValue) {
      this.applyMode(this.calculateModeFromOklchL(this.oklchLValue))
    } else if (this.hasHexValue && this.hexValue) {
      this.applyMode(this.calculateModeFromHex(this.hexValue))
    } else {
      this.applyMode("default")
    }
  }

  handleBackgroundChange(event) {
    // Fabric swatches ignore background changes - they're always on bg-base-200
    if (this.typeValue === "fabric") {
      return
    }

    const { hex, oklchL } = event.detail

    if (!hex) {
      this.applyMode("default")
      return
    }

    // Prefer oklchL if available, fallback to hex calculation
    if (oklchL !== null && oklchL !== undefined && !isNaN(oklchL)) {
      this.applyMode(this.calculateModeFromOklchL(oklchL))
    } else {
      this.applyMode(this.calculateModeFromHex(hex))
    }
  }

  calculateModeFromOklchL(oklchL) {
    // Thresholds matching palette_editor_controller.js
    if (oklchL > 0.62) return "light"
    if (oklchL > 0.35) return "mid"
    return "dark"
  }

  calculateModeFromHex(hex) {
    // Fallback: Convert hex to perceived lightness using relative luminance
    const r = parseInt(hex.slice(0, 2), 16) / 255
    const g = parseInt(hex.slice(2, 4), 16) / 255
    const b = parseInt(hex.slice(4, 6), 16) / 255

    const luminance = 0.2126 * this.linearize(r) +
                      0.7152 * this.linearize(g) +
                      0.0722 * this.linearize(b)

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
    if (this.currentMode === mode) return
    this.currentMode = mode

    this.swatchCardTargets.forEach(el => {
      this.applyStyle(el, "swatchBorder", mode)
      if (el.classList.contains("ring-1")) {
        this.applyStyle(el, "inPaletteRing", mode)
      }
    })

    this.swatchCodeTargets.forEach(el => this.applyStyle(el, "swatchCode", mode))
    this.swatchNameTargets.forEach(el => this.applyStyle(el, "swatchName", mode))
    this.emptyMessageTargets.forEach(el => this.applyStyle(el, "emptyMessage", mode))
  }

  applyStyle(element, category, mode) {
    element.classList.remove(...ALL_VARIANTS[ category ])
    element.classList.add(...MODE_STYLES[ category ][ mode ].split(" "))
  }
}
