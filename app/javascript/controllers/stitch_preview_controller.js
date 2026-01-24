import { Controller } from "@hotwired/stimulus"

// Handles switching between solid color and stitch pattern previews
// Usage: data-controller="stitch-preview" on the container
//
// Targets:
//   - tabButton: The tab buttons for switching patterns
//   - swatch: The main SVG rect that displays the color/pattern
//   - patternStroke: The stroke elements inside pattern definitions (for color updates)
//
// Values:
//   - color: The hex color value (without #)
//   - pattern: Current pattern ("solid", "seed", "chain", "satin")

const STITCH_PATTERN_STORAGE_KEY = "stitchPreviewPattern"

export default class extends Controller {
  static targets = [ "tabButton", "swatch" ]
  static values = {
    color: String,
    pattern: { type: String, default: "solid" }
  }

  connect() {
    // Restore pattern from session storage if available
    const savedPattern = sessionStorage.getItem(STITCH_PATTERN_STORAGE_KEY)
    if (savedPattern) {
      this.patternValue = savedPattern
    }

    this.updateTabs()
    this.updateSwatch()
  }

  switchPattern(event) {
    const pattern = event.currentTarget.dataset.pattern
    this.patternValue = pattern

    // Persist to session storage
    sessionStorage.setItem(STITCH_PATTERN_STORAGE_KEY, pattern)

    this.updateTabs()
    this.updateSwatch()
  }

  updateTabs() {
    this.tabButtonTargets.forEach(button => {
      const isActive = button.dataset.pattern === this.patternValue

      // Update aria-selected
      button.setAttribute("aria-selected", isActive ? "true" : "false")

      // Update visual styling
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
    const swatch = this.swatchTarget

    switch (this.patternValue) {
      case "seed":
        swatch.setAttribute("fill", "url(#hatch-seed)")
        break
      case "chain":
        swatch.setAttribute("fill", "url(#hatch-chain)")
        break
      case "satin":
        swatch.setAttribute("fill", "url(#hatch-satin)")
        break
      default: // solid
        swatch.setAttribute("fill", `#${this.colorValue}`)
    }
  }
}
