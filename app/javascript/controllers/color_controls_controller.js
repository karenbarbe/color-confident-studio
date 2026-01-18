import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "threadsList",
    "countBadge",
    "brandName",
    "familyPills",
    "familyPill",
    "saturationSlider",
    "saturationThumb",
    "lightnessSlider",
    "lightnessThumb"
  ]

  static values = {
    paletteId: Number,
    brandId: Number,
    family: String,
    saturation: Number,
    lightness: Number,
    mode: { type: String, default: "add" },
    slotId: Number
  }

  connect() {
    this.debounceTimer = null
    this.updateThumbPositions()
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
        pill.classList.remove("bg-white", "border", "border-base-content", "text-base-content/70", "hover:bg-zinc-100")
        pill.classList.add("bg-base-content", "text-white")
      } else {
        pill.classList.add("bg-white", "border", "border-base-content", "text-base-content/70", "hover:bg-zinc-100")
        pill.classList.remove("bg-base-content", "text-white")
      }
    })

    this.applyFilters()
  }

  // ===========================================================================
  // Slider controls
  // ===========================================================================

  updateSaturation(event) {
    const value = parseInt(event.target.value, 10)
    this.saturationValue = value
    this.updateThumbPosition(this.saturationThumbTarget, value)
  }

  updateLightness(event) {
    const value = parseInt(event.target.value, 10)
    this.lightnessValue = value
    this.updateThumbPosition(this.lightnessThumbTarget, value)
  }

  updateThumbPosition(thumb, value) {
    // Account for thumb width (20px = size-5)
    const thumbWidth = 20
    const trackWidth = thumb.parentElement.offsetWidth - thumbWidth
    const position = (value / 100) * trackWidth
    thumb.style.left = `${position}px`
  }

  updateThumbPositions() {
    if (this.hasSaturationThumbTarget && this.hasSaturationSliderTarget) {
      this.updateThumbPosition(this.saturationThumbTarget, this.saturationSliderTarget.value)
    }
    if (this.hasLightnessThumbTarget && this.hasLightnessSliderTarget) {
      this.updateThumbPosition(this.lightnessThumbTarget, this.lightnessSliderTarget.value)
    }
  }

  // ===========================================================================
  // Filter application
  // ===========================================================================

  applyFilters() {
    // Debounce to avoid too many requests while sliding
    clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.fetchMatchingThreads()
    }, 150)
  }

  fetchMatchingThreads() {
    const url = new URL(`/palettes/${this.paletteIdValue}/matching_threads`, window.location.origin)

    url.searchParams.set("brand_id", this.brandIdValue)

    if (this.familyValue) {
      url.searchParams.set("color_family", this.familyValue)
    }

    if (this.hasSaturationSliderTarget) {
      url.searchParams.set("saturation", this.saturationSliderTarget.value)
    }

    if (this.hasLightnessSliderTarget) {
      url.searchParams.set("lightness", this.lightnessSliderTarget.value)
    }

    // Pass mode and slot_id for edit mode support
    if (this.modeValue) {
      url.searchParams.set("mode", this.modeValue)
    }

    if (this.slotIdValue) {
      url.searchParams.set("slot_id", this.slotIdValue)
    }

    // Fetch and update the threads list via Turbo
    fetch(url, {
      headers: {
        "Accept": "text/vnd.turbo-stream.html, text/html",
        "X-Requested-With": "XMLHttpRequest"
      }
    })
      .then(response => response.text())
      .then(html => {
        if (this.hasThreadsListTarget) {
          this.threadsListTarget.innerHTML = html
        }
        // Update count badge from response if available
        this.updateCountFromHtml(html)
      })
      .catch(error => {
        console.error("Error fetching matching threads:", error)
      })
  }

  updateCountFromHtml(html) {
    // Try to extract count from the HTML (look for the +N more indicator)
    const match = html.match(/\+(\d+) more/)
    if (match && this.hasCountBadgeTarget) {
      const visibleCount = (html.match(/button_to/g) || []).length
      // This is approximate; ideally the server returns the count
    }
  }

  // ===========================================================================
  // Reset
  // ===========================================================================

  resetFilters() {
    // Reset family
    this.familyValue = ""
    this.familyPillTargets.forEach(pill => {
      pill.dataset.selected = "false"
      pill.classList.add("bg-white", "border", "border-base-content", "text-base-content/70", "hover:bg-zinc-100")
      pill.classList.remove("bg-base-content", "text-white")
    })

    // Reset sliders to middle
    if (this.hasSaturationSliderTarget) {
      this.saturationSliderTarget.value = 50
      this.saturationValue = 50
      this.updateThumbPosition(this.saturationThumbTarget, 50)
    }

    if (this.hasLightnessSliderTarget) {
      this.lightnessSliderTarget.value = 50
      this.lightnessValue = 50
      this.updateThumbPosition(this.lightnessThumbTarget, 50)
    }

    this.applyFilters()
  }
}
