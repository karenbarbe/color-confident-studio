import { Controller } from "@hotwired/stimulus"

/**
 * PaletteColorPickerController
 * 
 * Unified controller for selecting colors in the palette editor.
 * Handles both thread and fabric (background) color selection with
 * filtering by color family and lightness category.
 */
export default class extends Controller {
  static targets = [
    "colorList",
    "countBadge",
    "sourceName",
    "familyPills",
    "familyPill",
    "lightnessTabs",
    "lightnessTab"
  ]

  static values = {
    paletteId: Number,
    type: { type: String, default: "thread" },
    brandId: Number,
    family: String,
    lightnessCategory: { type: String, default: "all" },
    mode: { type: String, default: "add" },
    slotId: Number,
    pendingBackgroundHex: String
  }

  connect() {
    this.debounceTimer = null
  }

  // ===========================================================================
  // Source/Brand selection
  // ===========================================================================

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
  // Lightness category selection
  // ===========================================================================

  selectLightnessCategory(event) {
    const category = event.currentTarget.dataset.category

    this.lightnessCategoryValue = category

    // Update tab styling
    this.lightnessTabTargets.forEach(tab => {
      const tabCategory = tab.dataset.category
      const isSelected = tabCategory === category

      tab.dataset.selected = isSelected.toString()

      if (isSelected) {
        tab.classList.remove("bg-base-200", "hover:bg-base-300", "text-base-content")
        tab.classList.add("bg-base-content", "text-base-100")
      } else {
        tab.classList.add("bg-base-200", "hover:bg-base-300", "text-base-content")
        tab.classList.remove("bg-base-content", "text-base-100")
      }
    })

    this.applyFilters()
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

    if (this.lightnessCategoryValue && this.lightnessCategoryValue !== "all") {
      url.searchParams.set("lightness_category", this.lightnessCategoryValue)
    }

    if (this.modeValue) {
      url.searchParams.set("mode", this.modeValue)
    }

    if (this.slotIdValue) {
      url.searchParams.set("slot_id", this.slotIdValue)
    }

    if (this.pendingBackgroundHexValue) {
      url.searchParams.set("pending_background_hex", this.pendingBackgroundHexValue)
    }

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
}
