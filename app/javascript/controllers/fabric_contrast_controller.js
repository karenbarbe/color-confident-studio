import { Controller } from "@hotwired/stimulus"

// Style definitions by mode: default | light | mid | dark
const MODE_STYLES = {
  swatchLabel: {
    default: "bg-base-100",
    light: "backdrop-blur-[2px] bg-white/40",
    mid: "backdrop-blur-[2px] bg-black/15",
    dark: "backdrop-blur-[2px] bg-white/10"
  },
  vendorCode: {
    default: "text-base-content",
    light: "text-gray-900",
    mid: "text-white",
    dark: "text-white"
  },
  brandName: {
    default: "text-base-content/60",
    light: "text-gray-900/60",
    mid: "text-white/80",
    dark: "text-white/80"
  },
  colorName: {
    default: "text-base-content/80",
    light: "text-gray-800",
    mid: "text-white",
    dark: "text-white/90"
  },
  emptyState: {
    default: "text-base-content/70",
    light: "text-gray-900",
    mid: "text-white/90",
    dark: "text-white/90"
  },
  cardBg: {
    default: "bg-base-100",
    light: "bg-white/40",
    mid: "bg-black/30",
    dark: "bg-white/10"
  },
  cardText: {
    default: "text-base-content",
    light: "text-gray-900",
    mid: "text-white",
    dark: "text-white"
  },
  cardLine: {
    default: "bg-base-content/90",
    light: "bg-gray-900",
    mid: "bg-white/60",
    dark: "bg-white/50"
  },
  pill: {
    default: "border-base-content/50 text-base-content/70 hover:text-base-content hover:border-base-content/50",
    light: "border-gray-900/40 text-gray-900/80 hover:text-gray-900 hover:border-gray-900/70",
    mid: "border-white/70 text-white/90 hover:text-white hover:border-white",
    dark: "border-white/50 text-white/70 hover:text-white/90 hover:border-white/70"
  },
  pillActive: {
    default: "bg-base-content text-base-100 border-base-content hover:bg-base-content/80",
    light: "bg-gray-900 text-white border-gray-900 hover:bg-gray-800",
    mid: "bg-white text-gray-900 border-white/50 hover:bg-white/80",
    dark: "bg-white text-gray-900 border-white/50 hover:bg-white/80"
  }
}

// Pre-compute all variant classes for each category (for efficient removal)
const ALL_VARIANTS = Object.fromEntries(
  Object.entries(MODE_STYLES).map(([ category, modes ]) => [
    category,
    [ ...new Set(Object.values(modes).flatMap(v => v.split(" "))) ]
  ])
)

export default class extends Controller {
  static targets = [ "swatch", "emptyState", "card", "pillContainer" ]

  connect() {
    // Track the fabric picker's current mode (for restoring when switching back to grid)
    this.fabricPickerMode = "default"
    // Track the fabric picker's current hex color
    this.fabricPickerHex = ""
    // Track current view
    this.currentView = "grid"
    // Track stuck state
    this.isStuck = false

    // Listen for fabric picker changes
    this.styleHandler = this.handleStyleChange.bind(this)
    window.addEventListener("fabric-picker:styleChanged", this.styleHandler)

    // Listen for view changes (grid/list toggle)
    this.viewHandler = this.handleViewChange.bind(this)
    window.addEventListener("stash-view:changed", this.viewHandler)

    // Listen for sticky nav stuck state changes
    this.stuckHandler = this.handleStuckChange.bind(this)
    window.addEventListener("sticky-nav:stuckChanged", this.stuckHandler)

    // Listen for scroll-spy active pill changes
    this.pillActiveHandler = this.handlePillActiveChange.bind(this)
    window.addEventListener("scroll-spy:activeChanged", this.pillActiveHandler)

    // Re-apply styles when Turbo Stream updates the DOM
    this.turboStreamHandler = this.handleTurboStream.bind(this)
    document.addEventListener("turbo:before-stream-render", this.turboStreamHandler)
  }

  disconnect() {
    window.removeEventListener("fabric-picker:styleChanged", this.styleHandler)
    window.removeEventListener("stash-view:changed", this.viewHandler)
    window.removeEventListener("sticky-nav:stuckChanged", this.stuckHandler)
    window.removeEventListener("scroll-spy:activeChanged", this.pillActiveHandler)
    document.removeEventListener("turbo:before-stream-render", this.turboStreamHandler)
  }

  handleStyleChange(event) {
    const { mode, hex } = event.detail
    // Store the fabric picker's mode and hex
    this.fabricPickerMode = mode
    this.fabricPickerHex = hex || ""

    // Only apply if we're in grid view
    if (this.currentView === "grid") {
      this.applyMode(mode)
      // Re-apply stuck state background if currently stuck
      if (this.isStuck) {
        this.applyStuckBackground(true)
      }
    }
  }

  handleViewChange(event) {
    const { view } = event.detail
    this.currentView = view

    if (view === "list") {
      // Reset to default styling for readability in list view
      this.applyMode("default")
      // Clear any stuck backgrounds
      this.applyStuckBackground(false)
    } else {
      // Restore the fabric picker's mode when switching back to grid
      this.applyMode(this.fabricPickerMode)
      // Re-apply stuck background if currently stuck
      if (this.isStuck) {
        this.applyStuckBackground(true)
      }
    }
  }

  handleStuckChange(event) {
    const { isStuck } = event.detail
    this.isStuck = isStuck

    // Only apply solid background if in grid view and fabric picker is active
    if (this.currentView === "grid" && this.fabricPickerMode !== "default") {
      this.applyStuckBackground(isStuck)
    }
  }

  handlePillActiveChange(event) {
    // Re-apply current mode to update active/inactive pill states
    const mode = this.currentView === "grid" ? this.fabricPickerMode : "default"
    this.updatePills(mode)
  }

  handleTurboStream(event) {
    const fallbackToDefaultRender = event.detail.render

    event.detail.render = (streamElement) => {
      fallbackToDefaultRender(streamElement)

      // After the default render completes, re-apply styles
      const mode = this.currentView === "grid" ? this.fabricPickerMode : "default"
      this.applyMode(mode)
    }
  }

  applyMode(mode) {
    this.updateSwatches(mode)
    this.updateEmptyStates(mode)
    this.updateCards(mode)
    this.updatePills(mode)
  }

  applyStuckBackground(isStuck) {
    // Find cards that are inside the sticky nav (have a sticky-nav ancestor)
    this.cardTargets.forEach(card => {
      const isInStickyNav = card.closest(".sticky-nav") !== null
      if (!isInStickyNav) return

      const background = card.hasAttribute("data-card-background")
        ? card
        : card.querySelector("[data-card-background]")

      if (!background) return

      if (isStuck && this.fabricPickerHex) {
        // Apply solid fabric color as inline style (overrides class-based bg)
        background.style.backgroundColor = this.fabricPickerHex
      } else {
        // Remove inline style to let class-based styles take over
        background.style.backgroundColor = ""
      }
    })
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

  updateEmptyStates(mode) {
    this.emptyStateTargets.forEach(element => {
      this.applyStyle(element, "emptyState", mode)
    })
  }

  updateCards(mode) {
    this.cardTargets.forEach(card => {
      const background = card.hasAttribute("data-card-background")
        ? card
        : card.querySelector("[data-card-background]")
      const line = card.querySelector("[data-card-line]")
      const texts = card.querySelectorAll("[data-card-text]")

      if (background) this.applyStyle(background, "cardBg", mode)
      if (line) this.applyStyle(line, "cardLine", mode)
      texts.forEach(text => this.applyStyle(text, "cardText", mode))
    })
  }

  updatePills(mode) {
    this.pillContainerTargets.forEach(container => {
      const pills = container.querySelectorAll("[data-fabric-contrast-pill]")

      pills.forEach(pill => {
        const isActive = pill.dataset.active === "true"

        // Remove all pill variant classes (both inactive and active)
        pill.classList.remove(...ALL_VARIANTS.pill, ...ALL_VARIANTS.pillActive)

        if (isActive) {
          // Active pills get the pillActive styles
          pill.classList.add(...MODE_STYLES.pillActive[mode].split(" "))
        } else {
          // Inactive pills get the pill styles
          pill.classList.add(...MODE_STYLES.pill[mode].split(" "))
        }
      })
    })
  }

  applyStyle(element, category, mode) {
    // Remove all possible variant classes
    element.classList.remove(...ALL_VARIANTS[category])
    // Add classes for current mode
    element.classList.add(...MODE_STYLES[category][mode].split(" "))
  }
}
