import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "fabricsList",
    "brandName",
    "lightnessSlider",
    "lightnessThumb"
  ]

  static values = {
    paletteId: Number,
    brandId: Number
  }

  connect() {
    this.debounceTimer = null
    this.updateThumbPosition()
  }

  // ===========================================================================
  // Brand selection
  // ===========================================================================

  selectBrand(event) {
    const brandId = event.currentTarget.dataset.brandId
    const brandName = event.currentTarget.dataset.brandName

    this.brandIdValue = parseInt(brandId, 10)

    // Update the button text
    if (this.hasBrandNameTarget) {
      this.brandNameTarget.textContent = brandName.length > 20
        ? brandName.substring(0, 20) + "..."
        : brandName
    }

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

    if (this.brandIdValue) {
      url.searchParams.set("brand_id", this.brandIdValue)
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
    if (this.hasLightnessSliderTarget) {
      this.lightnessSliderTarget.value = 50
      this.updateThumbPosition()
    }

    this.applyFilters()
  }
}
