import { Controller } from "@hotwired/stimulus"

// Style definitions by mode: default | light | dark
const MODE_STYLES = {
  swatchLabel: {
    default: "bg-base-100",
    light: "backdrop-blur-[2px] bg-white/30",
    dark: "backdrop-blur-[2px] bg-white/10"
  },
  vendorCode: {
    default: "text-base-content",
    light: "text-gray-900",
    dark: "text-white"
  },
  brandName: {
    default: "text-base-content/60",
    light: "text-gray-900/60",
    dark: "text-white/60"
  },
  colorName: {
    default: "text-base-content/80",
    light: "text-gray-800",
    dark: "text-white/90"
  },
  dividerText: {
    default: "text-base-content/70",
    light: "text-gray-700",
    dark: "text-white/90"
  },
  dividerLine: {
    default: "bg-base-content/20",
    light: "bg-gray-500",
    dark: "bg-white/50"
  }
}

// Pre-compute all variant classes for each category (for efficient removal)
const ALL_VARIANTS = Object.fromEntries(
  Object.entries(MODE_STYLES).map(([category, modes]) => [
    category,
    [...new Set(Object.values(modes).flatMap(v => v.split(" ")))]
  ])
)

export default class extends Controller {
  static targets = ["swatch", "divider"]

  connect() {
    // Listen for fabric picker changes (window event for cross-DOM communication)
    this.styleHandler = this.handleStyleChange.bind(this)
    window.addEventListener("fabric-picker:styleChanged", this.styleHandler)
  }

  disconnect() {
    window.removeEventListener("fabric-picker:styleChanged", this.styleHandler)
  }

  handleStyleChange(event) {
    const { mode } = event.detail
    this.applyMode(mode)
  }

  applyMode(mode) {
    this.updateSwatches(mode)
    this.updateDividers(mode)
  }

  updateSwatches(mode) {
    this.swatchTargets.forEach(swatch => {
      const label = swatch.querySelector("[data-fabric-contrast-label]")
      if (!label) return

      this.applyStyle(label, "swatchLabel", mode)
      
      const vendorCode = label.querySelector("[data-vendor-code]")
      const brandName = label.querySelector("[data-brand-name]")
      const colorName = label.querySelector("[data-color-name]")
      
      if (vendorCode) this.applyStyle(vendorCode, "vendorCode", mode)
      if (brandName) this.applyStyle(brandName, "brandName", mode)
      if (colorName) this.applyStyle(colorName, "colorName", mode)
    })
  }

  updateDividers(mode) {
    this.dividerTargets.forEach(divider => {
      const text = divider.querySelector("[data-divider-text]")
      const lines = divider.querySelectorAll("[data-divider-line]")

      if (text) this.applyStyle(text, "dividerText", mode)
      lines.forEach(line => this.applyStyle(line, "dividerLine", mode))
    })
  }

  applyStyle(element, category, mode) {
    // Remove all possible variant classes
    element.classList.remove(...ALL_VARIANTS[category])
    // Add classes for current mode
    element.classList.add(...MODE_STYLES[category][mode].split(" "))
  }
}
