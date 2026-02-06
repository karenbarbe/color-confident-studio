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
    "familyButton",
    "familyButtonLabel",
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

    // Update pill styling within the dropdown
    this.familyPillTargets.forEach(pill => {
      const pillFamily = pill.dataset.family
      const isSelected = pillFamily === this.familyValue

      pill.dataset.selected = isSelected.toString()

      if (isSelected) {
        pill.classList.remove("bg-base-100", "border", "border-base-content", "text-base-content/70", "hover:bg-base-200")
        pill.classList.add("bg-base-content", "hover:bg-base-content/80", "text-base-100")
      } else {
        pill.classList.add("bg-base-100", "text-base-content/70", "hover:bg-base-200")
        pill.classList.remove("bg-base-content", "hover:bg-base-content/80", "text-base-100")
      }
    })

    // Update the family dropdown button appearance
    this.updateFamilyButton()

    this.applyFilters()
  }

  clearFamily(event) {
    event.stopPropagation()

    this.familyValue = ""

    // Reset all pill styling
    this.familyPillTargets.forEach(pill => {
      pill.dataset.selected = "false"
      pill.classList.add("bg-base-100", "text-base-content/70", "hover:bg-base-200")
      pill.classList.remove("bg-base-content", "hover:bg-base-content/80", "text-base-100")
    })

    // Update the family dropdown button appearance
    this.updateFamilyButton()

    this.applyFilters()
  }

  /**
   * Rebuilds the family dropdown button to reflect the current selection.
   *
   * When a family is selected: dark filled pill with dot + name + ✕ clear button.
   * When no family is selected: plain "Hue ▾" button matching the brand dropdown.
   */
  updateFamilyButton() {
    if (!this.hasFamilyButtonTarget) return

    const buttonContainer = this.familyButtonTarget
    // Walk up to the dropdown controller wrapper
    const dropdownWrap = buttonContainer.closest("[data-controller='dropdown']")
    if (!dropdownWrap) return

    // Find the selected pill to grab its dot color class
    const selectedPill = this.familyPillTargets.find(
      pill => pill.dataset.selected === "true"
    )

    if (this.familyValue && selectedPill) {
      // Extract the color class from the dot inside the selected pill
      const dot = selectedPill.querySelector(".rounded-full")
      const colorClasses = dot
        ? [ ...dot.classList ].filter(c => c.startsWith("bg-")).join(" ")
        : ""

      // Build selected state: filled pill with dot + name + ✕
      const html = `
        <div class="inline-flex items-center rounded-full bg-base-content text-base-100"
             data-palette-color-picker-target="familyButton">
          <button type="button"
                  class="inline-flex items-center gap-2 pl-3 pr-1 py-2 text-sm font-medium cursor-pointer"
                  data-action="click->dropdown#toggle">
            <span class="shrink-0 size-2.5 rounded-full ${colorClasses} ring-1 ring-inset ring-white/30"></span>
            <span data-palette-color-picker-target="familyButtonLabel">${this.familyValue}</span>
          </button>
          <button type="button"
                  class="inline-flex items-center justify-center size-7 mr-0.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                  data-action="click->palette-color-picker#clearFamily"
                  title="Clear hue filter">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      `

      buttonContainer.replaceWith(
        document.createRange().createContextualFragment(html.trim())
      )
    } else {
      // Build empty state: plain "Hue ▾" button
      const html = `
        <button type="button"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm bg-base-200 border border-base-content rounded-full hover:bg-base-300 transition-colors cursor-pointer"
                data-action="click->dropdown#toggle"
                data-palette-color-picker-target="familyButton">
          <span data-palette-color-picker-target="familyButtonLabel">Hue</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-4 opacity-60">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      `

      buttonContainer.replaceWith(
        document.createRange().createContextualFragment(html.trim())
      )
    }
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
