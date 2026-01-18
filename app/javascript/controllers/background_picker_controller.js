import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "fabricsList",
    "sourceName",
    "lightnessSlider",
    "lightnessThumb",
    "familyPills",
    "familyPill"
  ]

  static values = {
    paletteId: Number,
    brandId: Number,
    source: { type: String, default: "brand" },
    family: String
  }

  connect() {
    this.debounceTimer = null
    this.updateThumbPosition()
  }

  // ===========================================================================
  // Source selection (Stash or Brand)
  // ===========================================================================

  selectSource(event) {
    const source = event.currentTarget.dataset.source
    const sourceName = event.currentTarget.dataset.sourceName
    const brandId = event.currentTarget.dataset.brandId

    this.sourceValue = source

    if (source === "brand" && brandId) {
      this.brandIdValue = parseInt(brandId, 10)
    }

    // Update the button text
    if (this.hasSourceNameTarget) {
      this.sourceNameTarget.textContent = sourceName.length > 20
        ? sourceName.substring(0, 20) + "..."
        : sourceName
    }

    this.applyFilters()
  }

  // ===========================================================================
  // Color family selection
  // ===========================================================================

  selectFamily(event) {
    const family = event.currentTarget.dataset.family
    const isCurrentlySelected = event.currentTarget.dataset.selected === "true"

    // Toggle selection
    if (isCurrentlySelected) {
      this.familyValue = ""
    } else {
      this.familyValue = family
    }

    // Update pill styles
    this.familyPillTargets.forEach(pill => {
      const pillFamily = pill.dataset.family
      const isSelected = pillFamily === this.familyValue

      pill.dataset.selected = isSelected.toString()

      if (isSelected) {
        pill.classList.remove("bg-base-100", "border", "border-base-content", "text-base-content/70", "hover:bg-base-100")
        pill.classList.add("bg-base-content", "hover:bg-base-content/80", "text-base-100")
      } else {
        pill.classList.add("bg-base-100", "border", "border-base-content", "text-base-content/70", "hover:bg-base-100")
        pill.classList.remove("bg-base-content", "hover:bg-base-content/80", "text-base-100")
      }
    })

    this.applyFilters()
  }

  // ===========================================================================
  // Lightness slider
  // ===========================================================================

  updateLightness(event) {
    const value = parseInt(event.target.value, 10)
    this.updateThumbPosition()
  }

  updateThumbPosition() {
    if (!this.hasLightnessThumbTarget || !this.hasLightnessSliderTarget) return

    const value = parseInt(this.lightnessSliderTarget.value, 10)
    const thumbWidth = 20
    const trackWidth = this.lightnessThumbTarget.parentElement.offsetWidth - thumbWidth
    const position = (value / 100) * trackWidth
    this.lightnessThumbTarget.style.left = `${position}px`
  }

  // ===========================================================================
  // Filter application
  // ===========================================================================

  applyFilters() {
    clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.fetchFabrics()
    }, 150)
  }

  fetchFabrics() {
    const url = new URL(`/palettes/${this.paletteIdValue}/background_picker`, window.location.origin)

    // Set source parameter
    url.searchParams.set("source", this.sourceValue)

    if (this.sourceValue === "brand" && this.brandIdValue) {
      url.searchParams.set("brand_id", this.brandIdValue)
    }

    if (this.familyValue) {
      url.searchParams.set("color_family", this.familyValue)
    }

    if (this.hasLightnessSliderTarget) {
      url.searchParams.set("lightness", this.lightnessSliderTarget.value)
    }

    // Fetch the entire panel content
    fetch(url, {
      headers: {
        "Accept": "text/vnd.turbo-stream.html, text/html",
        "X-Requested-With": "XMLHttpRequest"
      }
    })
      .then(response => response.text())
      .then(html => {
        // Update just the fabrics list portion
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, "text/html")
        const newList = doc.querySelector("#brand-fabrics-list")

        if (newList && this.hasFabricsListTarget) {
          this.fabricsListTarget.innerHTML = newList.innerHTML
        }
      })
      .catch(error => {
        console.error("Error fetching fabrics:", error)
      })
  }

  // ===========================================================================
  // Reset
  // ===========================================================================

  resetFilters() {
    // Reset family
    this.familyValue = ""
    this.familyPillTargets.forEach(pill => {
      pill.dataset.selected = "false"
      pill.classList.add("bg-base-100", "border", "border-base-content", "text-base-content/70", "hover:bg-base-100")
      pill.classList.remove("bg-base-content", "hover:bg-base-content/80", "text-base-100")
    })

    // Reset lightness slider to middle
    if (this.hasLightnessSliderTarget) {
      this.lightnessSliderTarget.value = 50
      this.updateThumbPosition()
    }

    this.applyFilters()
  }
}
