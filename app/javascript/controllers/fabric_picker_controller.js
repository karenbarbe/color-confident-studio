import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "button",      // Trigger button
    "indicator",   // Color indicator in button
    "label",       // Label text in button
    "chevron",     // Chevron icon in button
    "dropdown",    // Dropdown panel
    "header",      // Back button header
    "headerTitle", // Title in header
    "content",     // Turbo frame content area
    "background"   // External: elements to apply background color
  ]

  static values = {
    rootUrl: String,
    open: { type: Boolean, default: false },
    // Current fabric selection
    hex: { type: String, default: "" },
    lightness: { type: Number, default: 0.96 },
    name: { type: String, default: "" },
    colorId: { type: String, default: "" }
  }

  // Navigation history stack: [{ url, title }]
  history = []

  connect() {
    this.loadSavedPreference()
    this.applyPreviewStyles()
    
    // Close dropdown when clicking outside
    this.outsideClickHandler = this.handleOutsideClick.bind(this)
    document.addEventListener("click", this.outsideClickHandler)
  }

  disconnect() {
    document.removeEventListener("click", this.outsideClickHandler)
  }

  // ===========================================================================
  // Dropdown behavior
  // ===========================================================================

  toggle(event) {
    event.stopPropagation()
    this.openValue = !this.openValue
  }

  open() {
    this.openValue = true
  }

  close() {
    this.openValue = false
  }

  openValueChanged() {
    // Guard against being called before targets are connected
    if (!this.hasDropdownTarget) return
    
    if (this.openValue) {
      this.showDropdown()
    } else {
      this.hideDropdown()
    }
  }

  showDropdown() {
    // Reset navigation to root
    this.history = []
    this.updateHeader()
    
    // Load root content with current state
    if (this.hasContentTarget) {
      const url = this.buildRootUrl()
      this.contentTarget.src = url
    }
    
    // Show dropdown
    if (this.hasDropdownTarget) {
      this.dropdownTarget.classList.remove("hidden")
    }
    if (this.hasChevronTarget) {
      this.chevronTarget.classList.add("rotate-180")
    }
  }

  hideDropdown() {
    if (this.hasDropdownTarget) {
      this.dropdownTarget.classList.add("hidden")
    }
    if (this.hasChevronTarget) {
      this.chevronTarget.classList.remove("rotate-180")
    }
  }

  handleOutsideClick(event) {
    if (this.openValue && !this.element.contains(event.target)) {
      this.close()
    }
  }

  // ===========================================================================
  // Navigation
  // ===========================================================================

  navigate(event) {
    const title = event.currentTarget.dataset.title || "Back"
    const url = event.currentTarget.href
    
    // Push current state to history
    this.history.push({ url, title })
    this.updateHeader()
  }

  goBack(event) {
    event.preventDefault()
    
    if (this.history.length <= 1) {
      // Go to root
      this.history = []
      if (this.hasContentTarget) {
        this.contentTarget.src = this.buildRootUrl()
      }
    } else {
      // Go to previous panel
      this.history.pop()
      const previous = this.history[this.history.length - 1]
      if (this.hasContentTarget) {
        this.contentTarget.src = previous?.url || this.buildRootUrl()
      }
    }
    
    this.updateHeader()
  }

  updateHeader() {
    if (!this.hasHeaderTarget) return
    
    const showHeader = this.history.length > 0
    this.headerTarget.classList.toggle("hidden", !showHeader)
    
    if (showHeader && this.history.length > 0 && this.hasHeaderTitleTarget) {
      const current = this.history[this.history.length - 1]
      this.headerTitleTarget.textContent = current.title
    }
  }

  onFrameLoad() {
    // Frame loaded - could add loading states here if needed
  }

  buildRootUrl() {
    const url = new URL(this.rootUrlValue, window.location.origin)
    url.searchParams.set("show_reset", this.hexValue ? "true" : "false")
    
    // Pass recent color IDs
    const recentIds = this.getRecentIds()
    if (recentIds.length > 0) {
      url.searchParams.set("recent_ids", recentIds.join(","))
    }
    
    return url.toString()
  }

  // ===========================================================================
  // Color selection
  // ===========================================================================

  selectColor(event) {
    const button = event.currentTarget
    const { id, hex, lightness, vendorCode, name } = button.dataset

    this.hexValue = hex || ""
    this.lightnessValue = parseFloat(lightness) || 0.5
    this.colorIdValue = id || ""
    
    // Build display name
    if (vendorCode && name) {
      this.nameValue = `${vendorCode} ${name}`
    } else if (name) {
      this.nameValue = name
    } else {
      this.nameValue = ""
    }

    // Save to recently used (only for colors with IDs, not presets)
    if (id) {
      this.saveToRecent({ id, hex, lightness: this.lightnessValue, vendorCode, name })
    }

    this.applyPreviewStyles()
    this.savePreference()
    this.close()
  }

  selectCustomColor(event) {
    const hex = event.currentTarget.value
    
    this.hexValue = hex
    this.lightnessValue = this.approximateLightness(hex)
    this.nameValue = "Custom color"
    this.colorIdValue = ""

    this.applyPreviewStyles()
    this.savePreference()
    this.close()
  }

  reset() {
    this.hexValue = ""
    this.lightnessValue = 0.96
    this.nameValue = ""
    this.colorIdValue = ""

    this.applyPreviewStyles()
    this.savePreference()
    this.close()
  }

  // ===========================================================================
  // Preview styling
  // ===========================================================================

  get isActive() {
    return !!this.hexValue
  }

  get mode() {
    if (!this.hexValue) return "default"
    return this.lightnessValue <= 0.5 ? "dark" : "light"
  }

  applyPreviewStyles() {
    this.updateButton()
    this.updateBackgrounds()
    this.dispatchStyleUpdate()
  }

  updateButton() {
    // Update indicator
    if (this.hasIndicatorTarget) {
      if (this.isActive) {
        this.indicatorTarget.style.backgroundColor = this.hexValue
        this.indicatorTarget.classList.remove("border-2", "border-dashed", "border-base-content/50")
        this.indicatorTarget.classList.add("ring-1", "ring-inset", "ring-white/30")
      } else {
        this.indicatorTarget.style.backgroundColor = ""
        this.indicatorTarget.classList.add("border-2", "border-dashed", "border-base-content/50")
        this.indicatorTarget.classList.remove("ring-1", "ring-inset", "ring-white/30")
      }
    }

    // Update label
    if (this.hasLabelTarget) {
      if (this.isActive) {
        this.labelTarget.textContent = `On ${this.nameValue || "Custom"}`
      } else {
        this.labelTarget.textContent = "Preview on fabric"
      }
    }

    // Update button styling
    if (this.hasButtonTarget) {
      if (this.isActive) {
        this.buttonTarget.classList.add("ring-base-content/30", "bg-base-200")
        this.buttonTarget.classList.remove("ring-base-content/20")
      } else {
        this.buttonTarget.classList.remove("ring-base-content/30", "bg-base-200")
        this.buttonTarget.classList.add("ring-base-content/20")
      }
    }
  }

  updateBackgrounds() {
    this.backgroundTargets.forEach(el => {
      el.style.backgroundColor = this.hexValue || ""
    })
  }

  // Dispatch event so other controllers can respond to style changes
  dispatchStyleUpdate() {
    this.dispatch("styleChanged", {
      detail: {
        hex: this.hexValue,
        lightness: this.lightnessValue,
        mode: this.mode,
        isActive: this.isActive
      },
      bubbles: true,
      prefix: "fabric-picker"
    })
  
    // Also dispatch on window for elements outside this controller's DOM tree
    window.dispatchEvent(new CustomEvent("fabric-picker:styleChanged", {
      detail: {
        hex: this.hexValue,
        lightness: this.lightnessValue,
        mode: this.mode,
        isActive: this.isActive
      }
    }))
  }

  // ===========================================================================
  // Recently used (localStorage)
  // ===========================================================================

  getRecentIds() {
    try {
      const stored = localStorage.getItem("fabricPickerRecent")
      const recent = stored ? JSON.parse(stored) : []
      return recent.map(item => item.id).filter(Boolean)
    } catch {
      return []
    }
  }

  saveToRecent(colorData) {
    try {
      let recent = []
      const stored = localStorage.getItem("fabricPickerRecent")
      if (stored) recent = JSON.parse(stored)

      // Remove if already exists
      recent = recent.filter(item => item.id !== colorData.id)

      // Add to front, limit to 3
      recent.unshift(colorData)
      recent = recent.slice(0, 3)

      localStorage.setItem("fabricPickerRecent", JSON.stringify(recent))
    } catch (e) {
      console.warn("Could not save recent fabric colors:", e)
    }
  }

  // ===========================================================================
  // Persistence (localStorage)
  // ===========================================================================

  savePreference() {
    try {
      localStorage.setItem("fabricPreview", JSON.stringify({
        hex: this.hexValue,
        lightness: this.lightnessValue,
        name: this.nameValue,
        colorId: this.colorIdValue
      }))
    } catch (e) {
      console.warn("Could not save fabric preference:", e)
    }
  }

  loadSavedPreference() {
    try {
      const saved = localStorage.getItem("fabricPreview")
      if (saved) {
        const { hex, lightness, name, colorId } = JSON.parse(saved)
        this.hexValue = hex || ""
        this.lightnessValue = lightness || 0.96
        this.nameValue = name || ""
        this.colorIdValue = colorId || ""
      }
    } catch (e) {
      console.warn("Could not load fabric preference:", e)
    }
  }

  // ===========================================================================
  // Utilities
  // ===========================================================================

  approximateLightness(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
}
