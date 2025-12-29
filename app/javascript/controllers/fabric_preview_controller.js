import { Controller } from "@hotwired/stimulus"

const STYLES = {
  button: {
    base: "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer",
    default: "bg-base-100 hover:bg-base-200 text-base-content ring-1 ring-base-content/20",
    active: "bg-base-200 text-base-content ring-1 ring-base-content/30 hover:ring-base-content/50"
  },

  indicator: {
    base: "w-4 h-4 rounded-full transition-all",
    default: "border-2 border-dashed border-base-content/70",
    active: "ring-1 ring-inset ring-white/30"
  },

  swatchLabel: {
    base: "px-2 py-1.5 rounded-t-lg transition-all duration-300",
    default: "backdrop-blur-[2px] bg-base-100",
    light: "backdrop-blur-[2px] bg-white/30",
    dark: "backdrop-blur-[2px] bg-white/10"
  },

  vendorCode: {
    base: "text-xl font-semibold truncate transition-colors duration-300",
    default: "text-base-content",
    light: "text-gray-900",
    dark: "text-white"
  },

  colorName: {
    base: "truncate leading-tight transition-colors duration-300",
    default: "text-base-content/80",
    light: "text-gray-800",
    dark: "text-white/90"
  },

  dividerText: {
    base: "text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors duration-300",
    default: "text-base-content/70",
    light: "text-gray-600",
    dark: "text-white/70"
  },

  dividerLine: {
    base: "h-px flex-1 transition-colors duration-300",
    default: "bg-base-content/20",
    light: "bg-gray-300",
    dark: "bg-white/20"
  }
}

// Collect all variant classes for a style category (for removal)
function getAllVariantClasses(category) {
  const style = STYLES[category]
  const classes = []

  Object.entries(style).forEach(([key, value]) => {
    if (key === "base") return

    if (typeof value === "string") {
      classes.push(...value.split(" ").filter(c => c))
    } else if (typeof value === "object") {
      Object.values(value).forEach(v => {
        classes.push(...v.split(" ").filter(c => c))
      })
    }
  })

  return [...new Set(classes)] // Remove duplicates
}

// =============================================================================

export default class extends Controller {
  static targets = [
    "background",
    "swatch",
    "divider",
    "defaultOption",
    "defaultDivider",
    "presetOption"
  ]

  static values = {
    fabricColor: { type: String, default: "" },
    fabricLightness: { type: Number, default: 0.96 }
  }

  // Fabric presets (used for label display)
  static presets = [
    { name: "Default", hex: "", oklch_l: 0.96 },
    { name: "White", hex: "#FFFFFF", oklch_l: 1.0 },
    { name: "Antique White", hex: "#FAF0E6", oklch_l: 0.95 },
    { name: "Natural Linen", hex: "#C4B69C", oklch_l: 0.74 },
    { name: "Black", hex: "#1a1a1a", oklch_l: 0.12 },
    { name: "Navy", hex: "#1a1a2e", oklch_l: 0.15 },
    { name: "Christmas Red", hex: "#6B1020", oklch_l: 0.28 }
  ]

  connect() {
    this.loadSavedPreference()
  }

  // ---------------------------------------------------------------------------
  // Style helpers
  // ---------------------------------------------------------------------------

  // Get the current mode based on fabric state
  get mode() {
    if (!this.fabricColorValue) return "default"
    return this.fabricLightnessValue <= 0.5 ? "dark" : "light"
  }

  // Check if current selection is a custom color (not a preset)
  get isCustomColor() {
    if (!this.fabricColorValue) return false
    return !this.constructor.presets.some(p => p.hex === this.fabricColorValue)
  }

  // Apply styles to an element from a style category
  applyStyle(element, category) {
    const style = STYLES[category]
    if (!style || !element) return

    // Remove all variant classes
    const allVariants = getAllVariantClasses(category)
    element.classList.remove(...allVariants)

    // Get the variant for current mode
    const variant = style[this.mode]

    if (typeof variant === "string") {
      element.classList.add(...variant.split(" ").filter(c => c))
    }
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  selectFabric(event) {
    const button = event.currentTarget
    this.fabricColorValue = button.dataset.fabricHex || ""
    this.fabricLightnessValue = parseFloat(button.dataset.fabricLightness) || 0.96

    this.applyAllStyles()
    this.savePreference()
  }

  applyCustomColor(event) {
    const hex = event.currentTarget.value
    this.fabricColorValue = hex
    this.fabricLightnessValue = this.approximateLightness(hex)

    this.applyAllStyles()
    this.savePreference()
  }

  reset() {
    this.fabricColorValue = ""
    this.fabricLightnessValue = 0.96

    this.applyAllStyles()
    this.savePreference()
  }

  // ---------------------------------------------------------------------------
  // Main update methods
  // ---------------------------------------------------------------------------

  applyAllStyles() {
    this.applyBackground()
    this.updateSwatches()
    this.updateDividers()
    this.updatePickerButton()
    this.updateDropdownOptions()
  }

  applyBackground() {
    if (this.hasBackgroundTarget) {
      this.backgroundTarget.style.backgroundColor = this.fabricColorValue || ""
    }
  }

  updateSwatches() {
    this.swatchTargets.forEach(swatch => {
      const label = swatch.querySelector("[data-fabric-preview-label]")
      if (!label) return

      this.applyStyle(label, "swatchLabel")

      const vendorCode = label.querySelector("[data-vendor-code]")
      const colorName = label.querySelector("[data-color-name]")

      if (vendorCode) this.applyStyle(vendorCode, "vendorCode")
      if (colorName) this.applyStyle(colorName, "colorName")
    })
  }

  updateDividers() {
    this.dividerTargets.forEach(divider => {
      const text = divider.querySelector("[data-divider-text]")
      const lines = divider.querySelectorAll("[data-divider-line]")

      if (text) this.applyStyle(text, "dividerText")
      lines.forEach(line => this.applyStyle(line, "dividerLine"))
    })
  }

  updatePickerButton() {
    const button = this.element.querySelector("[data-fabric-picker-button]")
    if (!button) return

    const indicator = button.querySelector("[data-fabric-indicator]")
    const label = button.querySelector("[data-fabric-label]")
    const isActive = !!this.fabricColorValue

    // Apply button styles
    const buttonVariants = getAllVariantClasses("button")
    button.classList.remove(...buttonVariants)
    button.classList.add(...STYLES.button[isActive ? "active" : "default"].split(" "))

    // Apply indicator styles
    if (indicator) {
      const indicatorVariants = getAllVariantClasses("indicator")
      indicator.classList.remove(...indicatorVariants)
      indicator.classList.add(...STYLES.indicator[isActive ? "active" : "default"].split(" "))
      indicator.style.backgroundColor = this.fabricColorValue || ""
    }

    // Update label text
    if (label) {
      if (isActive) {
        const preset = this.constructor.presets.find(p => p.hex === this.fabricColorValue)
        label.textContent = preset ? `On ${preset.name}` : "Custom fabric"
      } else {
        label.textContent = "Preview on fabric"
      }
    }
  }

  updateDropdownOptions() {
    const isDefault = !this.fabricColorValue
    const currentHex = this.fabricColorValue

    // Show/hide default option (hidden when no fabric is selected)
    if (this.hasDefaultOptionTarget) {
      this.defaultOptionTarget.classList.toggle("hidden", isDefault)
    }

    // Show/hide divider after default option
    if (this.hasDefaultDividerTarget) {
      this.defaultDividerTarget.classList.toggle("hidden", isDefault)
    }

    // Show/hide preset options based on current selection
    this.presetOptionTargets.forEach(option => {
      const optionHex = option.dataset.fabricHex || ""
      const isCurrentSelection = optionHex === currentHex && !this.isCustomColor
      option.classList.toggle("hidden", isCurrentSelection)
    })
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  approximateLightness(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  savePreference() {
    localStorage.setItem("fabricPreview", JSON.stringify({
      hex: this.fabricColorValue,
      lightness: this.fabricLightnessValue
    }))
  }

  loadSavedPreference() {
    try {
      const saved = localStorage.getItem("fabricPreview")
      if (saved) {
        const { hex, lightness } = JSON.parse(saved)
        this.fabricColorValue = hex || ""
        this.fabricLightnessValue = lightness || 0.96
        this.applyAllStyles()
      }
    } catch (e) {
      console.warn("Could not load fabric preference:", e)
    }
  }
}
