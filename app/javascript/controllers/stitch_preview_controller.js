import { Controller } from "@hotwired/stimulus"

const STITCH_PATTERN_STORAGE_KEY = "stitchPreviewPattern"

export default class extends Controller {
  static targets = [ "tabButton", "solidSwatch", "seedSwatch", "longShortSwatch" ]
  static values = {
    color: String,
    pattern: { type: String, default: "solid" }
  }

  connect() {
    // Restore pattern from session storage if available (only for thread products with tabs)
    if (this.hasTabButtonTarget) {
      const savedPattern = sessionStorage.getItem(STITCH_PATTERN_STORAGE_KEY)
      if (savedPattern) {
        this.patternValue = savedPattern
      }
    }

    this.updateTabs()
    this.updateSwatch()
  }

  switchPattern(event) {
    const pattern = event.currentTarget.dataset.pattern
    this.patternValue = pattern

    sessionStorage.setItem(STITCH_PATTERN_STORAGE_KEY, pattern)

    this.updateTabs()
    this.updateSwatch()
  }

  updateTabs() {
    this.tabButtonTargets.forEach(button => {
      const isActive = button.dataset.pattern === this.patternValue

      button.setAttribute("aria-selected", isActive ? "true" : "false")

      if (isActive) {
        button.classList.add("bg-base-100", "shadow-sm")
        button.classList.remove("text-base-content/60")
      } else {
        button.classList.remove("bg-base-100", "shadow-sm")
        button.classList.add("text-base-content/60")
      }
    })
  }

  updateSwatch() {
    // Hide all available swatches first
    if (this.hasSolidSwatchTarget) this.solidSwatchTarget.classList.add("hidden")
    if (this.hasSeedSwatchTarget) this.seedSwatchTarget.classList.add("hidden")
    if (this.hasLongShortSwatchTarget) this.longShortSwatchTarget.classList.add("hidden")

    // Show the selected swatch
    switch (this.patternValue) {
      case "seed":
        if (this.hasSeedSwatchTarget) this.seedSwatchTarget.classList.remove("hidden")
        break
      case "longshort":
        if (this.hasLongShortSwatchTarget) this.longShortSwatchTarget.classList.remove("hidden")
        break
      default: // solid
        if (this.hasSolidSwatchTarget) this.solidSwatchTarget.classList.remove("hidden")
    }
  }
}
