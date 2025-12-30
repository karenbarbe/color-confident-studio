import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "container",
    "slider",
    "panel",
    "recentSection",
    "recentList",
    // Charts path
    "chartsBrandsList",
    "chartsBrandTitle",
    "chartsFamiliesList",
    "chartsFamilyTitle",
    "chartsColorsList",
    // Stash path
    "stashFamiliesList",
    "stashFamilyTitle",
    "stashColorsList"
  ]

  static values = {
    currentPanel: { type: String, default: "root" },
    maxRecent: { type: Number, default: 3 }
  }

  // Track navigation history for back button
  panelHistory = ["root"]

  // Cache for loaded data
  cache = {
    chartsBrands: null,
    chartsFamilies: {},
    chartsColors: {}
  }

  connect() {
    this.resetToRoot()
    this.loadRecentlyUsed()
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  resetToRoot() {
    this.panelHistory = ["root"]
    this.currentPanelValue = "root"
    this.updateSliderPosition()
    this.loadRecentlyUsed()
  }

  goToPanel(event) {
    const targetPanel = event.currentTarget.dataset.targetPanel
    if (!targetPanel) return

    this.panelHistory.push(targetPanel)
    this.currentPanelValue = targetPanel
    this.updateSliderPosition()

    // Trigger data loading based on panel
    this.loadPanelData(targetPanel, event.currentTarget.dataset)
  }

  goBack() {
    if (this.panelHistory.length <= 1) {
      this.resetToRoot()
      return
    }

    this.panelHistory.pop()
    this.currentPanelValue = this.panelHistory[this.panelHistory.length - 1]
    this.updateSliderPosition()
  }

  updateSliderPosition() {
    const panelIndex = this.getPanelIndex(this.currentPanelValue)
    const offset = panelIndex * -100

    if (this.hasSliderTarget) {
      this.sliderTarget.style.transform = `translateX(${offset}%)`
    }
  }

  getPanelIndex(panelName) {
    const panelOrder = [
      "root",
      "presets",
      "charts-brands",
      "stash-families",
      "charts-families",
      "stash-colors",
      "charts-colors"
    ]
    return panelOrder.indexOf(panelName)
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  loadPanelData(panelName, dataset) {
    switch (panelName) {
      case "charts-brands":
        this.loadChartsBrands()
        break
      case "stash-families":
        this.loadStashFamilies()
        break
      case "charts-families":
        this.loadChartsFamilies(dataset.brandId, dataset.brandName)
        break
      case "stash-colors":
        this.loadStashColors(dataset.familyName)
        break
      case "charts-colors":
        this.loadChartsColors(dataset.brandId, dataset.familyName)
        break
    }
  }

  // ---------------------------------------------------------------------------
  // Color Charts path
  // ---------------------------------------------------------------------------

  async loadChartsBrands() {
    // Use cache if available
    if (this.cache.chartsBrands) {
      this.renderChartsBrands(this.cache.chartsBrands)
      return
    }

    this.chartsBrandsListTarget.innerHTML = this.loadingHTML()

    try {
      const response = await fetch("/api/fabric_picker/brands")
      const brands = await response.json()
      this.cache.chartsBrands = brands
      this.renderChartsBrands(brands)
    } catch (error) {
      this.chartsBrandsListTarget.innerHTML = this.errorHTML("Could not load brands")
    }
  }

  renderChartsBrands(brands) {
    if (brands.length === 0) {
      this.chartsBrandsListTarget.innerHTML = this.emptyHTML("No fabric brands available")
      return
    }

    const html = brands.map(brand => `
      <button type="button"
              data-action="click->fabric-picker-nav#goToPanel"
              data-target-panel="charts-families"
              data-brand-id="${brand.id}"
              data-brand-name="${brand.name}"
        class="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-base-200 cursor-pointer transition-colors">
        <span class="text-base-content">${brand.name}</span>
      </button>
    `).join("")

    this.chartsBrandsListTarget.innerHTML = html
  }

  async loadChartsFamilies(brandId, brandName) {
    // Update back button title
    if (this.hasChartsBrandTitleTarget) {
      this.chartsBrandTitleTarget.textContent = brandName || "Back"
    }

    // Use cache if available
    const cacheKey = `brand-${brandId}`
    if (this.cache.chartsFamilies[cacheKey]) {
      this.renderChartsFamilies(this.cache.chartsFamilies[cacheKey])
      return
    }

    this.chartsFamiliesListTarget.innerHTML = this.loadingHTML()

    try {
      const response = await fetch(`/api/fabric_picker/brands/${brandId}/families`)
      const data = await response.json()
      this.cache.chartsFamilies[cacheKey] = { ...data, brandId }
      this.renderChartsFamilies({ ...data, brandId })
    } catch (error) {
      this.chartsFamiliesListTarget.innerHTML = this.errorHTML("Could not load color families")
    }
  }

  renderChartsFamilies(data) {
    const { families, brandId } = data

    if (families.length === 0) {
      this.chartsFamiliesListTarget.innerHTML = this.emptyHTML("No color families available")
      return
    }

    const html = families.map(family => `
      <button type="button"
              data-action="click->fabric-picker-nav#goToPanel"
              data-target-panel="charts-colors"
              data-brand-id="${brandId}"
              data-family-name="${family.name}"
        class="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-base-200 cursor-pointer transition-colors">
        <span class="text-base-content">${family.name} <span class="text-base-content/50 text-xs">(${family.count})</span></span>
        
      </button>
    `).join("")

    this.chartsFamiliesListTarget.innerHTML = html
  }

  async loadChartsColors(brandId, familyName) {
    // Update back button title
    if (this.hasChartsFamilyTitleTarget) {
      this.chartsFamilyTitleTarget.textContent = familyName || "Back"
    }

    // Use cache if available
    const cacheKey = `brand-${brandId}-family-${familyName}`
    if (this.cache.chartsColors[cacheKey]) {
      this.renderChartsColors(this.cache.chartsColors[cacheKey])
      return
    }

    this.chartsColorsListTarget.innerHTML = this.loadingHTML()

    try {
      const response = await fetch(`/api/fabric_picker/brands/${brandId}/families/${encodeURIComponent(familyName)}/colors`)
      const data = await response.json()
      this.cache.chartsColors[cacheKey] = data
      this.renderChartsColors(data)
    } catch (error) {
      this.chartsColorsListTarget.innerHTML = this.errorHTML("Could not load colors")
    }
  }

  renderChartsColors(data) {
    const { colors } = data

    if (colors.length === 0) {
      this.chartsColorsListTarget.innerHTML = this.emptyHTML("No colors in this family")
      return
    }

    const html = colors.map(color => `
      <button type="button"
              data-action="click->fabric-picker-nav#selectColor"
              data-color-hex="#${color.hex}"
              data-color-lightness="${color.oklch_l || 0.5}"
              data-color-id="${color.id}"
              data-color-vendor-code="${color.vendor_code || ''}"
              data-color-name="${color.name}"
        class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-base-200 cursor-pointer transition-colors">
        <span class="w-5 h-5 rounded-full ring-1 ring-inset ring-base-content/20 shrink-0"
              style="background-color: #${color.hex};"></span>
        <span class="text-base-content truncate">
          ${color.vendor_code ? `<span class="font-medium">${color.vendor_code}</span> ` : ''}${color.name}
        </span>
      </button>
    `).join("")

    this.chartsColorsListTarget.innerHTML = html
  }

  // ---------------------------------------------------------------------------
  // Color Selection (bridges to fabric-preview controller)
  // ---------------------------------------------------------------------------

  selectColor(event) {
  const { colorHex, colorLightness, colorId, colorVendorCode, colorName } = event.currentTarget.dataset

  // Save to recently used
  this.saveToRecent({
    id: colorId,
    hex: colorHex,
    lightness: parseFloat(colorLightness) || 0.5,
    vendorCode: colorVendorCode,
    name: colorName
  })

  // Dispatch custom event for fabric-preview controller to handle
  this.dispatch("colorSelected", {
    detail: {
      hex: colorHex,
      lightness: parseFloat(colorLightness) || 0.5,
      id: colorId,
      vendorCode: colorVendorCode,
      name: colorName
    }
  })

  // Close dropdown
  this.closeDropdown()
}

// ---------------------------------------------------------------------------
// Recently Used
// ---------------------------------------------------------------------------

loadRecentlyUsed() {
  const recent = this.getRecentFromStorage()
  
  if (recent.length === 0) {
    this.hideRecentSection()
    return
  }

  this.showRecentSection()
  this.renderRecentList(recent)
}

getRecentFromStorage() {
  try {
    const stored = localStorage.getItem("fabricPickerRecent")
    return stored ? JSON.parse(stored) : []
  } catch (e) {
    console.warn("Could not load recent fabric colors:", e)
    return []
  }
}

saveToRecent(colorData) {
  let recent = this.getRecentFromStorage()

  // Remove if already exists
  recent = recent.filter(item => item.id !== colorData.id)

  // Add to front
  recent.unshift(colorData)

  // Limit to max
  recent = recent.slice(0, this.maxRecentValue)

  try {
    localStorage.setItem("fabricPickerRecent", JSON.stringify(recent))
  } catch (e) {
    console.warn("Could not save recent fabric colors:", e)
  }
}

showRecentSection() {
  if (this.hasRecentSectionTarget) {
    this.recentSectionTarget.classList.remove("hidden")
  }
}

hideRecentSection() {
  if (this.hasRecentSectionTarget) {
    this.recentSectionTarget.classList.add("hidden")
  }
}

renderRecentList(recent) {
  if (!this.hasRecentListTarget) return

  const html = recent.map(color => `
    <button type="button"
            data-action="click->fabric-picker-nav#selectRecentColor"
            data-color-hex="${color.hex}"
            data-color-lightness="${color.lightness}"
            data-color-id="${color.id}"
            data-color-vendor-code="${color.vendorCode || ''}"
            data-color-name="${color.name}"
      class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-base-200 cursor-pointer transition-colors">
      <span class="w-5 h-5 rounded-full ring-1 ring-inset ring-base-content/20 shrink-0"
            style="background-color: ${color.hex};"></span>
      <span class="text-base-content truncate">
        ${color.vendorCode ? `<span class="font-medium">${color.vendorCode}</span> ` : ''}${color.name}
      </span>
    </button>
  `).join("")

  this.recentListTarget.innerHTML = html
}

selectRecentColor(event) {
  // Same as selectColor
  const { colorHex, colorLightness, colorId, colorVendorCode, colorName } = event.currentTarget.dataset

  // Still save to bump it to the front
  this.saveToRecent({
    id: colorId,
    hex: colorHex,
    lightness: parseFloat(colorLightness) || 0.5,
    vendorCode: colorVendorCode,
    name: colorName
  })

  // Dispatch custom event for fabric-preview controller to handle
  this.dispatch("colorSelected", {
    detail: {
      hex: colorHex,
      lightness: parseFloat(colorLightness) || 0.5,
      id: colorId,
      vendorCode: colorVendorCode,
      name: colorName
    }
  })

  // Close dropdown
  this.closeDropdown()
}
  

// ---------------------------------------------------------------------------
// Stash Path
// ---------------------------------------------------------------------------

async loadStashFamilies() {
  // Check if user is authenticated
  this.stashFamiliesListTarget.innerHTML = this.loadingHTML()

  try {
    const response = await fetch("/api/fabric_picker/stash/families")
    
    if (response.status === 401) {
      this.stashFamiliesListTarget.innerHTML = this.emptyHTML("Please log in to browse your stash.")
      return
    }

    const data = await response.json()

    if (data.empty) {
      this.stashFamiliesListTarget.innerHTML = this.emptyHTML("You haven't added any fabric colors to your stash yet.")
      return
    }

    this.renderStashFamilies(data.families)
  } catch (error) {
    this.stashFamiliesListTarget.innerHTML = this.errorHTML("Could not load stash")
  }
}

renderStashFamilies(families) {
  const html = families.map(family => `
    <button type="button"
            data-action="click->fabric-picker-nav#goToPanel"
            data-target-panel="stash-colors"
            data-family-name="${family.name}"
      class="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-base-200 cursor-pointer transition-colors">
      <span class="text-base-content">${family.name} <span class="text-base-content/50 text-xs">(${family.count})</span></span>
    </button>
  `).join("")

  this.stashFamiliesListTarget.innerHTML = html
}

async loadStashColors(familyName) {
  // Update back button title
  if (this.hasStashFamilyTitleTarget) {
    this.stashFamilyTitleTarget.textContent = familyName || "Back"
  }

  this.stashColorsListTarget.innerHTML = this.loadingHTML()

  try {
    const response = await fetch(`/api/fabric_picker/stash/families/${encodeURIComponent(familyName)}/colors`)
    
    if (response.status === 401) {
      this.stashColorsListTarget.innerHTML = this.emptyHTML("Please log in to view colors.")
      return
    }

    const data = await response.json()
    this.renderStashColors(data)
  } catch (error) {
    this.stashColorsListTarget.innerHTML = this.errorHTML("Could not load colors")
  }
}

renderStashColors(data) {
  const { brands } = data

  if (!brands || brands.length === 0) {
    this.stashColorsListTarget.innerHTML = this.emptyHTML("No colors in this family")
    return
  }

  const html = brands.map(brand => `
    <div class="mb-2">
      <div class="px-4 py-1.5">
        <span class="text-xs font-medium text-left text-base-content/50 uppercase tracking-wider">${brand.name}</span>
      </div>
      ${brand.colors.map(color => `
        <button type="button"
                data-action="click->fabric-picker-nav#selectColor"
                data-color-hex="#${color.hex}"
                data-color-lightness="${color.oklch_l || 0.5}"
                data-color-id="${color.id}"
                data-color-vendor-code="${color.vendor_code || ''}"
                data-color-name="${color.name}"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-base-200 cursor-pointer transition-colors">
          <span class="w-5 h-5 rounded-full ring-1 ring-inset ring-base-content/20 shrink-0"
                style="background-color: #${color.hex};"></span>
          <span class="text-base-content truncate">
            ${color.vendor_code ? `<span class="font-medium">${color.vendor_code}</span> ` : ''}${color.name}
          </span>
        </button>
      `).join("")}
    </div>
  `).join("")

  this.stashColorsListTarget.innerHTML = html
}

  // ---------------------------------------------------------------------------
  // HTML Helpers
  // ---------------------------------------------------------------------------

  loadingHTML() {
    return `<div class="text-sm text-base-content/50 px-4 py-8 text-center">Loading...</div>`
  }

  errorHTML(message) {
    return `<div class="text-sm text-error/70 px-4 py-8 text-center">${message}</div>`
  }

  emptyHTML(message) {
    return `<div class="text-sm text-base-content/50 px-4 py-8 text-center">${message}</div>`
  }

  closeDropdown() {
  const dropdown = this.element.closest("[data-controller~='dropdown']")
  if (dropdown) {
    const dropdownController = this.application.getControllerForElementAndIdentifier(dropdown, "dropdown")
    if (dropdownController) dropdownController.close()
    }
  }
}
