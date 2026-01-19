import { Controller } from "@hotwired/stimulus"

/**
 * PaletteColorPickerController
 * 
 * Unified controller for selecting colors in the palette editor.
 * Handles both thread and fabric (background) color selection with
 * consistent filtering controls and distribution visualization.
 */
export default class extends Controller {
  static targets = [
    "colorList",
    "countBadge",
    "sourceName",
    "familyPills",
    "familyPill",
    "saturationSlider",
    "saturationThumb",
    "lightnessSlider",
    "lightnessThumb",
    "saturationDistribution",
    "lightnessDistribution"
  ]

  static values = {
    paletteId: Number,
    type: { type: String, default: "thread" },
    brandId: Number,
    source: { type: String, default: "brand" },
    family: String,
    saturation: { type: Number, default: 50 },
    lightness: { type: Number, default: 50 },
    mode: { type: String, default: "add" },
    slotId: Number,
    saturationDistribution: { type: Array, default: [] },
    lightnessDistribution: { type: Array, default: [] }
  }

  connect() {
    this.debounceTimer = null
    this.updateThumbPositions()
  }

  // ===========================================================================
  // Source/Brand selection
  // ===========================================================================

  selectSource(event) {
    const source = event.currentTarget.dataset.source
    const sourceName = event.currentTarget.dataset.sourceName
    const brandId = event.currentTarget.dataset.brandId

    this.sourceValue = source

    if (brandId) {
      this.brandIdValue = parseInt(brandId, 10)
    }

    if (this.hasSourceNameTarget) {
      this.sourceNameTarget.textContent = sourceName.length > 20
        ? sourceName.substring(0, 20) + "..."
        : sourceName
    }

    this.applyFilters()
  }

  selectBrand(event) {
    const brandId = event.currentTarget.dataset.brandId
    const brandName = event.currentTarget.dataset.brandName

    this.brandIdValue = parseInt(brandId, 10)

    if (this.hasSourceNameTarget) {
      this.sourceNameTarget.textContent = brandName.length > 20
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

    this.familyValue = isCurrentlySelected ? "" : family

    this.familyPillTargets.forEach(pill => {
      const pillFamily = pill.dataset.family
      const isSelected = pillFamily === this.familyValue

      pill.dataset.selected = isSelected.toString()

      if (isSelected) {
        pill.classList.remove("bg-base-100", "border", "border-base-content", "text-base-content/70", "hover:bg-base-200")
        pill.classList.add("bg-base-content", "hover:bg-base-content/80", "text-base-100")
      } else {
        pill.classList.add("bg-base-100", "border", "border-base-content", "text-base-content/70", "hover:bg-base-200")
        pill.classList.remove("bg-base-content", "hover:bg-base-content/80", "text-base-100")
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
    if (!thumb) return
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
    clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.fetchColors()
    }, 150)
  }

  fetchColors() {
    const endpoint = this.typeValue === "fabric" 
      ? "matching_colors?type=fabric" 
      : "matching_colors?type=thread"
    
    const url = new URL(`/palettes/${this.paletteIdValue}/${endpoint}`, window.location.origin)

    if (this.brandIdValue) {
      url.searchParams.set("brand_id", this.brandIdValue)
    }

    if (this.familyValue) {
      url.searchParams.set("color_family", this.familyValue)
    }

    if (this.hasSaturationSliderTarget) {
      url.searchParams.set("saturation", this.saturationSliderTarget.value)
    }

    if (this.hasLightnessSliderTarget) {
      url.searchParams.set("lightness", this.lightnessSliderTarget.value)
    }

    if (this.modeValue) {
      url.searchParams.set("mode", this.modeValue)
    }

    if (this.slotIdValue) {
      url.searchParams.set("slot_id", this.slotIdValue)
    }

    if (this.typeValue === "fabric" && this.sourceValue) {
      url.searchParams.set("source", this.sourceValue)
    }

    // Request distribution data as well
    url.searchParams.set("include_distribution", "true")

    fetch(url, {
      headers: {
        "Accept": "text/vnd.turbo-stream.html, text/html, application/json",
        "X-Requested-With": "XMLHttpRequest"
      }
    })
      .then(response => response.text())
      .then(html => {
        if (this.hasColorListTarget) {
          this.colorListTarget.innerHTML = html
        }
        this.updateCountBadge(html)
        this.updateDistributionFromResponse(html)
      })
      .catch(error => {
        console.error(`Error fetching ${this.typeValue} colors:`, error)
      })
  }

  updateCountBadge(html) {
    if (!this.hasCountBadgeTarget) return

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")
    const countEl = doc.querySelector("[data-total-count]")
    
    if (countEl) {
      this.countBadgeTarget.textContent = countEl.dataset.totalCount
    }
  }

  updateDistributionFromResponse(html) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")
    
    const satDistEl = doc.querySelector("[data-saturation-distribution]")
    const lightDistEl = doc.querySelector("[data-lightness-distribution]")

    if (satDistEl && this.hasSaturationDistributionTarget) {
      try {
        const distribution = JSON.parse(satDistEl.dataset.saturationDistribution)
        this.renderDistribution(this.saturationDistributionTarget, distribution)
      } catch (e) {
        console.error("Error parsing saturation distribution:", e)
      }
    }

    if (lightDistEl && this.hasLightnessDistributionTarget) {
      try {
        const distribution = JSON.parse(lightDistEl.dataset.lightnessDistribution)
        this.renderDistribution(this.lightnessDistributionTarget, distribution)
      } catch (e) {
        console.error("Error parsing lightness distribution:", e)
      }
    }
  }

  renderDistribution(container, distribution) {
    if (!container || !distribution || distribution.length === 0) return

    const dots = container.querySelectorAll("div")
    distribution.forEach((density, i) => {
      if (dots[i]) {
        const opacity = density > 0 ? Math.min(density * 0.8 + 0.2, 1) : 0
        const height = density > 0 ? Math.min(density * 8 + 2, 8) : 0
        
        dots[i].style.opacity = opacity
        dots[i].style.height = `${height}px`
        dots[i].classList.toggle("bg-base-content", density > 0)
        dots[i].classList.toggle("bg-transparent", density === 0)
      }
    })
  }

  // ===========================================================================
  // Reset
  // ===========================================================================

  resetFilters() {
    this.familyValue = ""
    this.familyPillTargets.forEach(pill => {
      pill.dataset.selected = "false"
      pill.classList.add("bg-base-100", "border", "border-base-content", "text-base-content/70", "hover:bg-base-200")
      pill.classList.remove("bg-base-content", "hover:bg-base-content/80", "text-base-100")
    })

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
