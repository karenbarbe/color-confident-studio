// app/javascript/controllers/palette_editor_controller.js

import { Controller } from "@hotwired/stimulus"

/**
 * PaletteEditorController
 *
 * Manages client-side state for palette editing, allowing users to experiment
 * with color combinations before persisting changes to the server.
 *
 * Architecture:
 * - initialState: Snapshot of server state when editing begins
 * - pendingState: Current working state (what user sees)
 * - Changes are tracked by comparing pendingState to initialState
 * - Only "Save palette" triggers server sync via batch update
 *
 * Panel Integration:
 * - Uses the shared slide-panel controller for the color picker panel
 * - Communicates via events and direct controller references
 */
export default class extends Controller {
  static targets = [
    // Background
    "backgroundLayer",
    // Pills
    "pillsContainer", "colorPill", "addButton", "indicator",
    // Panel header elements (inside slide panel)
    "panelHeader",
    "addHeader", "addHeaderTitle",
    "editHeader", "editSwatch", "editCode", "editBrand", "editName",
    // Save/status
    "saveButton", "unsavedIndicator",
    "editColorInfo",
    "editColorInfoSection",
    "editHeaderTitle", 
    "panelFooter"    
  ]

  static values = {
    paletteId: Number,
    mode: { type: String, default: "add" },        // "add" or "edit"
    colorType: { type: String, default: "thread" }, // "thread" or "fabric"
    selectedSlotId: { type: Number, default: 0 },
    maxThreadSlots: { type: Number, default: 12 },
    isNewPalette: { type: Boolean, default: true }
  }

  connect() {
    this.handleFrameLoad = this.handleFrameLoad.bind(this)

    // Initialize state management
    this.initializeState()

    // Generate unique IDs for new slots (negative to distinguish from server IDs)
    this.nextTempId = -1

    // Listen for turbo frame loads to mark pending colors
    document.addEventListener("turbo:frame-load", this.handleFrameLoad)

    this.handleColorsUpdated = this.handleColorsUpdated.bind(this)
    document.addEventListener("palette-color-picker:colorsUpdated", this.handleColorsUpdated)

    // Cache reference to the slide panel element
    this.slidePanelElement = document.getElementById("editor-panel-container")

    // After initializeState(), dispatch initial background state
    // Use setTimeout to ensure other controllers have connected
    if (this.pendingState.background) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("palette-editor:backgroundChanged", {
          detail: { 
            hex: this.pendingState.background.productColor.hex,
            oklchL: this.pendingState.background.productColor.oklchL || null }
        }))
      }, 0)
    }
  }

  disconnect() {
    document.removeEventListener("turbo:frame-load", this.handleFrameLoad)
    document.removeEventListener("palette-color-picker:colorsUpdated", this.handleColorsUpdated)
  }

  // ===========================================================================
  // Slide Panel Integration
  // ===========================================================================

  /**
   * Get the slide panel controller instance
   */
  get slidePanelController() {
    if (!this.slidePanelElement) return null
    return this.application.getControllerForElementAndIdentifier(
      this.slidePanelElement,
      "slide-panel"
    )
  }

  /**
   * Open the slide panel
   */
  openPanel() {
    const panel = this.slidePanelController
    if (panel) {
      panel.open()
    }
  }

  /**
   * Close the slide panel
   */
  closePanel() {
    const panel = this.slidePanelController
    if (panel) {
      panel.close()
    }
    this.clearSelectionIndicators()
    this.selectedSlotIdValue = 0
  }

  /**
   * Called when the slide panel closes (via close_callback)
   */
  onPanelClose() {
    this.clearSelectionIndicators()
    this.selectedSlotIdValue = 0
  }

  // ===========================================================================
  // State Management
  // ===========================================================================

  /**
   * Initialize state from current DOM
   * Called on connect to capture the "saved" state
   */
  initializeState() {
    // Capture initial state from DOM
    this.initialState = this.captureStateFromDOM()

    // Working state starts as a copy of initial
    this.pendingState = JSON.parse(JSON.stringify(this.initialState))

    this.updateUnsavedIndicator()
  }

  /**
   * Read current palette state from the DOM
   */
  captureStateFromDOM() {
    const threadSlots = []

    this.colorPillTargets.forEach((pill, index) => {
      threadSlots.push({
        id: parseInt(pill.dataset.slotId, 10),
        position: index,
        slotType: "thread",
        productColor: this.extractColorDataFromElement(pill)
      })
    })

    // Capture background from the background selector
    const backgroundSelector = document.getElementById("background-selector")
    let background = null

    if (backgroundSelector) {
      const colorSwatch = backgroundSelector.querySelector("[style*='background-color']")
      if (colorSwatch && backgroundSelector.dataset.slotId) {
        background = {
          id: parseInt(backgroundSelector.dataset.slotId, 10),
          slotType: "background",
          productColor: this.extractColorDataFromElement(backgroundSelector)
        }
      }
    }

    return {
      threadSlots,
      background
    }
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges() {
    return JSON.stringify(this.initialState) !== JSON.stringify(this.pendingState)
  }

  /**
   * Calculate the diff between initial and pending state
   * Returns { additions, updates, deletions }
   */
  calculateChanges() {
    const changes = {
      additions: [],    // New slots to create (have temp IDs < 0)
      updates: [],      // Existing slots with changed product_color_id
      deletions: []     // Slot IDs that were removed
    }

    // Build lookup maps
    const initialThreadMap = new Map(
      this.initialState.threadSlots.map(s => [ s.id, s ])
    )
    const pendingThreadMap = new Map(
      this.pendingState.threadSlots.map(s => [ s.id, s ])
    )

    // Find additions and updates in thread slots
    this.pendingState.threadSlots.forEach((slot, index) => {
      if (slot.id < 0) {
        // New slot (temp ID)
        changes.additions.push({
          product_color_id: slot.productColor.id,
          slot_type: "thread",
          position: index
        })
      } else {
        const initial = initialThreadMap.get(slot.id)
        if (initial && initial.productColor.id !== slot.productColor.id) {
          // Color changed
          changes.updates.push({
            id: slot.id,
            product_color_id: slot.productColor.id
          })
        }
      }
    })

    // Find deletions in thread slots
    this.initialState.threadSlots.forEach(slot => {
      if (!pendingThreadMap.has(slot.id)) {
        changes.deletions.push(slot.id)
      }
    })

    // Handle background changes
    const initialBg = this.initialState.background
    const pendingBg = this.pendingState.background

    if (pendingBg && !initialBg) {
      // Added background
      changes.additions.push({
        product_color_id: pendingBg.productColor.id,
        slot_type: "background",
        position: 0
      })
    } else if (!pendingBg && initialBg) {
      // Removed background
      changes.deletions.push(initialBg.id)
    } else if (pendingBg && initialBg) {
      if (pendingBg.id < 0) {
        // Background was replaced (delete old, add new)
        changes.deletions.push(initialBg.id)
        changes.additions.push({
          product_color_id: pendingBg.productColor.id,
          slot_type: "background",
          position: 0
        })
      } else if (pendingBg.productColor.id !== initialBg.productColor.id) {
        // Background color changed
        changes.updates.push({
          id: pendingBg.id,
          product_color_id: pendingBg.productColor.id
        })
      }
    }

    return changes
  }

  // ===========================================================================
  // Client-side mutations (update pending state + DOM, no server calls)
  // ===========================================================================

  /**
   * Add a new thread color to the pending state
   */
  addThreadColor(colorData) {
    if (this.pendingState.threadSlots.length >= this.maxThreadSlotsValue) {
      this.showFlash("Thread colors section is full", "alert")
      return false
    }

    // Check for duplicate
    const isDuplicate = this.pendingState.threadSlots.some(
      slot => slot.productColor.id === colorData.id
    ) || (this.pendingState.background?.productColor.id === colorData.id)

    if (isDuplicate) {
      this.showFlash("This color is already in the palette", "alert")
      return false
    }

    const newSlot = {
      id: this.nextTempId--,
      position: this.pendingState.threadSlots.length,
      slotType: "thread",
      productColor: {
        id: colorData.id,
        hex: colorData.hex,
        vendorCode: colorData.vendorCode,
        name: colorData.name,
        brandName: colorData.brandName,
        oklchL: colorData.oklchL,
        colorFamily: colorData.colorFamily
      }
    }

    this.pendingState.threadSlots.push(newSlot)
    this.renderThreadPills()
    this.updateHeaderStats()
    this.updateSaveButton()
    this.updateUnsavedIndicator()
    this.closePanel()

    return true
  }

  /**
   * Update an existing thread color
   */
  updateThreadColor(slotId, colorData) {
    const slot = this.pendingState.threadSlots.find(s => s.id === slotId)
    if (!slot) return false

    // Check for duplicate (excluding current slot)
    const isDuplicate = this.pendingState.threadSlots.some(
      s => s.id !== slotId && s.productColor.id === colorData.id
    ) || (this.pendingState.background?.productColor.id === colorData.id)

    if (isDuplicate) {
      this.showFlash("This color is already in the palette", "alert")
      return false
    }

    slot.productColor = {
      id: colorData.id,
      hex: colorData.hex,
      vendorCode: colorData.vendorCode,
      name: colorData.name,
      brandName: colorData.brandName,
      oklchL: colorData.oklchL,
      colorFamily: colorData.colorFamily
    }

    this.renderThreadPills()
    this.updateSaveButton()
    this.updateUnsavedIndicator()
    this.closePanel()

    return true
  }

  /**
   * Remove a thread color
   */
  removeThreadColor(slotId) {
    const index = this.pendingState.threadSlots.findIndex(s => s.id === slotId)
    if (index === -1) return false

    this.pendingState.threadSlots.splice(index, 1)

    // Update positions
    this.pendingState.threadSlots.forEach((slot, i) => {
      slot.position = i
    })

    this.renderThreadPills()
    this.updateHeaderStats()
    this.updateSaveButton()
    this.updateUnsavedIndicator()
    this.closePanel()

    return true
  }

  /**
   * Set or update the background color
   */
  setBackgroundColor(colorData) {
    // Check for duplicate in thread slots
    const isDuplicate = this.pendingState.threadSlots.some(
      slot => slot.productColor.id === colorData.id
    )

    if (isDuplicate) {
      this.showFlash("This color is already used as a thread color", "alert")
      return false
    }

    this.pendingState.background = {
      id: this.nextTempId--,
      slotType: "background",
      productColor: {
        id: colorData.id,
        hex: colorData.hex,
        vendorCode: colorData.vendorCode,
        name: colorData.name,
        brandName: colorData.brandName,
        oklchL: colorData.oklchL,
        colorFamily: colorData.colorFamily
      }
    }

    this.renderBackgroundSelector()
    this.renderBackgroundLayer()
    this.updateSaveButton()
    this.updateUnsavedIndicator()
    this.closePanel()

    return true
  }

  /**
   * Remove the background color
   */
  removeBackgroundColor() {
    this.pendingState.background = null
    this.renderBackgroundSelector()
    this.renderBackgroundLayer()
    this.updateSaveButton()
    this.updateUnsavedIndicator()
    this.closePanel()

    return true
  }

  // ===========================================================================
  // DOM Rendering (client-side updates)
  // ===========================================================================

  /**
   * Re-render the thread pills container from pending state
   */
  renderThreadPills() {
    if (!this.hasPillsContainerTarget) return

    const isFull = this.pendingState.threadSlots.length >= this.maxThreadSlotsValue

    // Stitched circle SVG path (matches the helper)
    const stitchedCirclePath = 'M49.001,122.917c-2.773,0-5.023-2.251-5.023-5.025V6.108c0-2.774,2.25-5.025,5.023-5.025s5.023,2.25,5.023,5.025v111.784c0,2.774-2.25,5.025-5.023,5.025ZM65.023,118.975V5.025c0-2.774-2.25-5.025-5.027-5.025s-5.023,2.251-5.023,5.025v113.95c0,2.774,2.25,5.025,5.023,5.025s5.027-2.251,5.027-5.025ZM43.029,114.562V9.438c0-2.774-2.25-5.025-5.023-5.025s-5.02,2.251-5.02,5.025v105.124c0,2.774,2.25,5.025,5.02,5.025s5.023-2.251,5.023-5.025ZM21.039,98.202V25.798c0-2.774-2.25-5.025-5.023-5.025s-5.023,2.251-5.023,5.025v72.403c0,2.774,2.247,5.025,5.023,5.025s5.023-2.251,5.023-5.025ZM32.038,108.392V15.608c0-2.774-2.25-5.025-5.027-5.025s-5.023,2.251-5.023,5.025v92.784c0,2.774,2.25,5.025,5.023,5.025s5.027-2.251,5.027-5.025ZM10.044,83.385v-42.771c0-2.774-2.25-5.025-5.023-5.025s-5.02,2.251-5.02,5.025v42.771c0,2.774,2.247,5.025,5.02,5.025s5.023-2.25,5.023-5.025ZM120,83.379v-42.758c0-2.774-2.247-5.025-5.023-5.025s-5.023,2.251-5.023,5.025v42.758c0,2.774,2.247,5.025,5.023,5.025s5.023-2.251,5.023-5.025ZM109.005,98.198V25.802c0-2.774-2.247-5.025-5.023-5.025s-5.023,2.25-5.023,5.025v72.396c0,2.774,2.247,5.025,5.023,5.025s5.023-2.251,5.023-5.025ZM98.006,108.392V15.608c0-2.774-2.247-5.025-5.023-5.025s-5.023,2.251-5.023,5.025v92.784c0,2.774,2.25,5.025,5.023,5.025s5.023-2.251,5.023-5.025ZM87.011,114.562V9.438c0-2.774-2.247-5.025-5.023-5.025s-5.023,2.251-5.023,5.025v105.124c0,2.774,2.25,5.025,5.023,5.025s5.023-2.251,5.023-5.025ZM76.015,117.892V6.108c0-2.774-2.247-5.025-5.023-5.025s-5.02,2.25-5.02,5.025v111.784c0,2.774,2.25,5.025,5.02,5.025s5.023-2.251,5.023-5.025Z'

    let html = ""

    // Render existing pills
    this.pendingState.threadSlots.forEach(slot => {

      html += `
        <div class="flex flex-col items-center gap-2 w-32 md:w-36">
          <button type="button"
                  class="w-full aspect-120/124 transition-all hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-base-content/40 cursor-pointer"
                  data-action="click->palette-editor#editColor"
                  data-slot-id="${slot.id}"
                  data-color-id="${slot.productColor.id}"
                  data-hex="${slot.productColor.hex}"
                  data-vendor-code="${slot.productColor.vendorCode}"
                  data-name="${slot.productColor.name}"
                  data-brand-name="${slot.productColor.brandName}"
                  data-oklch-l="${slot.productColor.oklchL || ''}"
                  data-color-family="${slot.productColor.colorFamily || ''}"
                  data-palette-editor-target="colorPill"
                  title="${slot.productColor.vendorCode} - ${slot.productColor.name}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 124" fill="#${slot.productColor.hex}" class="w-full h-full">
              <path d="${stitchedCirclePath}"/>
            </svg>
          </button>
          <div class="h-2 w-3/4 rounded-full bg-base-content opacity-0 transition-all duration-300"
              data-palette-editor-target="indicator"
              data-palette-header-contrast-target="indicator"
              data-slot-id="${slot.id}">
          </div>
        </div>
      `
    })

    // Render add button if not full
    if (!isFull) {
      html += `
        <div class="flex flex-col items-center gap-2 w-32 md:w-36">
          <button type="button"
                  class="w-full aspect-square border-2 border-dashed border-base-content/30 rounded-full flex items-center justify-center hover:border-base-content/50 hover:bg-base-content/5 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-base-content/60"
                  data-action="click->palette-editor#addColor"
                  data-palette-editor-target="addButton"
                  data-palette-header-contrast-target="addButtonBorder"
                  data-onboarding-coach-target="addColorTrigger">
            <div class="size-8 md:size-10 rounded-full bg-white text-gray-900 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="size-4 md:size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </button>
          <div class="h-2 w-3/4"></div>
        </div>
      `
    }

    this.pillsContainerTarget.innerHTML = html
  }

  /**
   * Update the header stats display
   */
  updateHeaderStats() {
    const statsEl = document.getElementById("header-stats")
    if (!statsEl) return

    const count = this.pendingState.threadSlots.length
    const label = count === 1 ? "color thread" : "color threads"
    statsEl.innerHTML = `
      <span>${count}/${this.maxThreadSlotsValue} ${label}</span>
    `
  }

  /**
   * Update the background selector display
   */
  renderBackgroundSelector() {
    const selector = document.getElementById("background-selector")
    if (!selector) return

    const bg = this.pendingState.background

    if (bg) {
      selector.innerHTML = `
        <span class="size-4 rounded-full ring-1 ring-inset ring-white/30"
              style="background-color: #${bg.productColor.hex};"></span>
        <span class="truncate">On ${bg.productColor.vendorCode} ${bg.productColor.name}</span>
      `
      selector.dataset.slotId = bg.id
      selector.dataset.colorId = bg.productColor.id
      selector.dataset.hex = bg.productColor.hex
      selector.dataset.vendorCode = bg.productColor.vendorCode
      selector.dataset.name = bg.productColor.name
      selector.dataset.brandName = bg.productColor.brandName
      selector.dataset.colorFamily = bg.productColor.colorFamily || ''
      selector.dataset.oklchL = bg.productColor.oklchL || ''
    } else {
      selector.innerHTML = `
        <span class="size-4 rounded-full border-2 border-dashed border-zinc-400"></span>
        <span class="text-base-content/70">Select background fabric</span>
      `
      delete selector.dataset.slotId
      delete selector.dataset.colorId
      delete selector.dataset.hex
      delete selector.dataset.vendorCode
      delete selector.dataset.name
      delete selector.dataset.brandName
      delete selector.dataset.colorFamily
    }
  }

  /**
   * Update the background layer color
   */

  renderBackgroundLayer() {
    const styleEl = document.getElementById("background-layer-style")
    if (!styleEl) return

    const bg = this.pendingState.background
    const color = bg ? `#${bg.productColor.hex}` : "var(--color-base-200)"

    styleEl.innerHTML = `
      <style>
        [data-palette-editor-target="backgroundLayer"] {
          background-color: ${color};
        }
      </style>
    `

    // Dispatch event for contrast controllers - include oklchL
    window.dispatchEvent(new CustomEvent("palette-editor:backgroundChanged", {
      detail: {
        hex: bg?.productColor.hex || null,
        oklchL: bg?.productColor.oklchL || null
      }
    }))
  }

 /**
   * Update the save button state
   */
  updateSaveButton() {
    const saveButtonContainer = document.getElementById("save-button")
    if (!saveButtonContainer) return

    const isComplete = this.pendingState.background && this.pendingState.threadSlots.length > 0
    const hasChanges = this.hasUnsavedChanges()

    // Determine button text based on palette state
    const buttonText = this.isNewPaletteValue ? "Save palette" : "Save changes"

    // Show button when:
    // - New palette: when complete (needs initial save)
    // - Existing palette: when there are unsaved changes AND complete
    const showButton = isComplete && (this.isNewPaletteValue || hasChanges)

    if (showButton) {
      saveButtonContainer.innerHTML = `
        <div>
          <button type="button"
                  class="btn btn-neutral transition-colors duration-300"
                  data-action="click->palette-editor#savePalette"
                  data-palette-header-contrast-target="saveButton">
            ${buttonText}
          </button>
        </div>
      `
      // Re-apply contrast styles to the new button
      this.reapplyContrastStyles()
    } else {
      // Hide button when no action is available
      saveButtonContainer.innerHTML = `<div class="hidden"></div>`
    }
  }

  /**
   * Trigger contrast controller to re-apply styles after DOM updates
   */
  reapplyContrastStyles() {
    const bg = this.pendingState.background
    window.dispatchEvent(new CustomEvent("palette-editor:backgroundChanged", {
        detail: {
            hex: bg?.productColor.hex || null,
            oklchL: bg?.productColor.oklchL || null
        }
    }))
  }

  /**
   * Update the unsaved changes indicator
   */
  updateUnsavedIndicator() {
    const hasChanges = this.hasUnsavedChanges()

    if (hasChanges) {
      window.onbeforeunload = () => true
    } else {
      window.onbeforeunload = null
    }
  }

  // ===========================================================================
  // Color actions
  // ===========================================================================

  addColor(event) {
    event.preventDefault()
    this.modeValue = "add"
    this.colorTypeValue = "thread"
    this.selectedSlotIdValue = 0
    this.pendingEditColorData = null  // Clear any pending edit data
    this.loadPanelContent("add", "thread")
    this.openPanel()
  }

  editColor(event) {
    event.preventDefault()
    const button = event.currentTarget

    this.modeValue = "edit"
    this.colorTypeValue = "thread"
    this.selectedSlotIdValue = parseInt(button.dataset.slotId, 10)

    // Store color data for populating after frame load
    this.pendingEditColorData = this.extractColorDataFromElement(button)

    this.updateSelectionIndicator(this.selectedSlotIdValue)
    this.loadPanelContent("edit", "thread", {
      slot_id: this.selectedSlotIdValue,
      color_id: button.dataset.colorId,
      color_family: button.dataset.colorFamily
    })
    this.openPanel()
  }

  deleteColor() {
    if (this.colorTypeValue === "fabric") {
      this.removeBackgroundColor()
    } else if (this.selectedSlotIdValue) {
      this.removeThreadColor(this.selectedSlotIdValue)
    }
  }

  // ===========================================================================
  // Thread color selection
  // ===========================================================================

  selectThreadColor(event) {
    event.preventDefault()
    const button = event.currentTarget

    const colorData = this.extractColorDataFromElement(button)
    const mode = button.dataset.mode
    // Use the controller's selectedSlotIdValue for edit mode
    // This handles temp IDs (negative) that don't exist in the database
    const slotId = mode === "edit" ? this.selectedSlotIdValue : parseInt(button.dataset.slotId, 10)

    if (mode === "edit" && slotId) {
      this.updateThreadColor(slotId, colorData)
    } else {
      this.addThreadColor(colorData)
    }
  }

  // ===========================================================================
  // Background color selection
  // ===========================================================================

  selectBackgroundColor(event) {
    event.preventDefault()
    const button = event.currentTarget

    if (button.disabled) return

    const colorData = this.extractColorDataFromElement(button)
    this.setBackgroundColor(colorData)
  }

  // ===========================================================================
  // Background picker
  // ===========================================================================

  openBackgroundPicker(event) {
    event.preventDefault()

    const selector = document.getElementById("background-selector")
    const hasBackground = selector?.dataset.slotId

    this.modeValue = hasBackground ? "edit" : "add"
    this.colorTypeValue = "fabric"
    this.selectedSlotIdValue = hasBackground ? parseInt(selector.dataset.slotId, 10) : 0

    // Store color data for populating after frame load
    if (hasBackground) {
      this.pendingEditColorData = this.extractColorDataFromElement(selector)
    } else {
      this.pendingEditColorData = null
    }

    // Pass color_family when editing existing background
    const params = hasBackground && selector.dataset.colorFamily
      ? { color_family: selector.dataset.colorFamily }
      : {}

    this.loadPanelContent(this.modeValue, "fabric", params)
    this.openPanel()
  }

  // ===========================================================================
  // Panel content
  // ===========================================================================

  updatePanelMode() {
    const isEdit = this.modeValue === "edit"
    const isFabric = this.colorTypeValue === "fabric"

    // Hide both headers first
    if (this.hasAddHeaderTarget) {
      this.addHeaderTarget.classList.add("hidden")
    }
    if (this.hasEditHeaderTarget) {
      this.editHeaderTarget.classList.add("hidden")
    }

    // Hide color info and footer by default
    if (this.hasEditColorInfoSectionTarget) {
      this.editColorInfoSectionTarget.classList.add("hidden")
    }
    if (this.hasPanelFooterTarget) {
      this.panelFooterTarget.classList.add("hidden")
    }

    if (isEdit) {
      // Show edit header with appropriate title
      if (this.hasEditHeaderTarget) {
        this.editHeaderTarget.classList.remove("hidden")
      }
      if (this.hasEditHeaderTitleTarget) {
        this.editHeaderTitleTarget.textContent = isFabric
          ? "Edit background color"
          : "Edit color"
      }
      // Show color info card
      if (this.hasEditColorInfoSectionTarget) {
        this.editColorInfoSectionTarget.classList.remove("hidden")
      }
      // Show footer with delete button
      if (this.hasPanelFooterTarget) {
        this.panelFooterTarget.classList.remove("hidden")
      }
    } else {
      // Show add header with appropriate title
      if (this.hasAddHeaderTarget) {
        this.addHeaderTarget.classList.remove("hidden")
      }
      if (this.hasAddHeaderTitleTarget) {
        this.addHeaderTitleTarget.textContent = isFabric
          ? "Add background color"
          : "Add thread color"
      }
    }
  }

  /**
   * Populate the edit header with color data
   */
  populateEditHeader(colorData) {
    if (this.hasEditColorInfoTarget) {
      this.editColorInfoTarget.style.backgroundColor = `#${colorData.hex}`
      
      // Apply contrast text colors
      const mode = this.calculateContrastMode(colorData.oklchL)
      this.applyEditInfoContrast(mode)
    }
    
    if (this.hasEditCodeTarget) {
      this.editCodeTarget.textContent = colorData.vendorCode
    }
    if (this.hasEditBrandTarget) {
      this.editBrandTarget.textContent = colorData.brandName
    }
    if (this.hasEditNameTarget) {
      this.editNameTarget.textContent = colorData.name
    }
  }

  calculateContrastMode(oklchL = null) {
    if (oklchL !== null && !isNaN(oklchL)) {
      if (oklchL > 0.62) return "light"
      if (oklchL > 0.35) return "mid"
      return "dark"
    }
  }

  applyEditInfoContrast(mode) {
    const textClasses = {
      light: "text-gray-900",
      mid: "text-white",
      dark: "text-white"
    }
    const mutedClasses = {
      light: "text-gray-900/70",
      mid: "text-white/90",
      dark: "text-white/90"
    }

    const allTextClasses = [ "text-gray-900", "text-white", "text-base-content" ]
    const allMutedClasses = [ "text-gray-900/70", "text-white/70", "text-base-content/70" ]

    if (this.hasEditCodeTarget) {
      this.editCodeTarget.classList.remove(...allTextClasses)
      this.editCodeTarget.classList.add(textClasses[ mode ])
    }
    if (this.hasEditBrandTarget) {
      this.editBrandTarget.classList.remove(...allMutedClasses)
      this.editBrandTarget.classList.add(mutedClasses[ mode ])
    }
    if (this.hasEditNameTarget) {
      this.editNameTarget.classList.remove(...allMutedClasses)
      this.editNameTarget.classList.add(mutedClasses[ mode ])
    }
  }

  loadPanelContent(mode, type, params = {}) {
    const url = new URL(`/palettes/${this.paletteIdValue}/color_picker_content`, window.location.origin)
    url.searchParams.set("mode", mode)
    url.searchParams.set("type", type)

    // Pass pending background data for thread color picker display
    if (type === "thread" && this.pendingState.background) {
      url.searchParams.set("pending_background_hex", this.pendingState.background.productColor.hex)
      const oklchL = this.pendingState.background.productColor.oklchL
      if (oklchL !== null && oklchL !== undefined) {
        url.searchParams.set("pending_background_oklch_l", oklchL)
      }
    }

    Object.entries(params).forEach(([ key, value ]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, value)
      }
    })

    // Load content into the slide panel's turbo frame with fade transition
    const frame = document.getElementById("editor_panel")
    if (frame) {
      frame.src = url.toString()
    }
  }

  // ===========================================================================
  // Selection indicators
  // ===========================================================================

  updateSelectionIndicator(slotId) {
    this.clearSelectionIndicators()

    const indicator = this.indicatorTargets.find(el =>
      parseInt(el.dataset.slotId, 10) === slotId
    )

    if (indicator) {
      indicator.classList.remove("opacity-0")
      indicator.classList.add("opacity-100")
    }
  }

  clearSelectionIndicators() {
    this.indicatorTargets.forEach(el => {
      el.classList.add("opacity-0")
      el.classList.remove("opacity-100")
    })
  }

  // ===========================================================================
  // Pending state indicators for color list
  // ===========================================================================

  handleFrameLoad(event) {
    if (event.target.id === "editor_panel") {
      requestAnimationFrame(() => {
        this.markPendingColorsInList()
        this.updatePanelMode()
        
        // Populate edit header if we have pending data
        if (this.pendingEditColorData && this.modeValue === "edit") {
          this.populateEditHeader(this.pendingEditColorData)
        }
      })
    }
  }

  handleColorsUpdated() {
    requestAnimationFrame(() => {
      this.markPendingColorsInList()
    })
  }

  markPendingColorsInList() {
    // Get all color IDs currently in pending state
    const pendingColorIds = new Set(
      this.pendingState.threadSlots.map(slot => slot.productColor.id)
    )

    if (this.pendingState.background) {
      pendingColorIds.add(this.pendingState.background.productColor.id)
    }

    // Find all swatches in the panel content
    const frame = document.getElementById("editor_panel")
    if (!frame) return

    const swatchButtons = frame.querySelectorAll("button[data-color-id]")

    swatchButtons.forEach(button => {
      const colorId = parseInt(button.dataset.colorId, 10)
      const isInPending = pendingColorIds.has(colorId)

      if (isInPending && !button.disabled) {
        // Color is in pending state but not marked by server — mark it
        this.markSwatchAsInPalette(button)
      } else if (!isInPending && button.disabled) {
        // Color was marked by server (stale state) but is no longer in pending state — un-mark it
        this.unmarkSwatchFromPalette(button)
      }
    })
  }

  markSwatchAsInPalette(button) {
    // Disable the button
    button.disabled = true
    button.classList.remove("cursor-pointer")
    button.classList.add("cursor-default")

    // Add ring to the card
    const card = button.querySelector("div.rounded-md")
    if (card) {
      card.classList.add("ring-1", "ring-base-content/30")
    }

    // Find the color preview area
    const colorPreview = button.querySelector("div.relative")
    if (!colorPreview) return

    // Remove any existing hover action icon
    const hoverIcon = colorPreview.querySelector(".group-hover\\:opacity-100")
    if (hoverIcon) {
      hoverIcon.remove()
    }

    // Add the palette indicator (matching the server-rendered version)
    const indicator = document.createElement("div")
    indicator.className = "absolute top-1.5 right-1.5 size-6 bg-white/70 text-gray-700 rounded-full flex items-center justify-center"
    indicator.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    `
    colorPreview.appendChild(indicator)
  }

  unmarkSwatchFromPalette(button) {
    // Re-enable the button
    button.disabled = false
    button.classList.remove("cursor-default")
    button.classList.add("cursor-pointer")

    // Remove ring from the card
    const card = button.querySelector("div.rounded-md")
    if (card) {
      card.classList.remove("ring-1", "ring-base-content/30")
    }

    // Find the color preview area
    const colorPreview = button.querySelector("div.relative")
    if (!colorPreview) return

    // Remove the palette indicator icon
    const paletteIndicator = colorPreview.querySelector(".absolute.top-1\\.5.right-1\\.5")
    if (paletteIndicator) {
      paletteIndicator.remove()
    }

    // Re-add the hover action icon based on current mode
    const mode = this.modeValue
    const iconSvg = mode === "edit"
      ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>`

    const hoverDiv = document.createElement("div")
    hoverDiv.className = "absolute top-1.5 right-1.5 size-6 bg-white/50 text-gray-900 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
    hoverDiv.innerHTML = iconSvg
    colorPreview.appendChild(hoverDiv)
  }

  // ===========================================================================
  // Server sync - batch save
  // ===========================================================================

  async savePalette(event) {
    event?.preventDefault()

    if (!this.hasUnsavedChanges()) {
      // No changes, just navigate to show page
      window.location.href = `/palettes`
      return
    }

    const changes = this.calculateChanges()

    // If no actual data changes, just navigate
    if (changes.additions.length === 0 &&
        changes.updates.length === 0 &&
        changes.deletions.length === 0) {
      window.location.href = `/palettes`
      return
    }

    try {
      const response = await fetch(`/palettes/${this.paletteIdValue}/batch_update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": this.getCSRFToken(),
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({ changes })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to save palette")
      }

      const result = await response.json()

      // Success - update initial state and navigate or show success
      this.initialState = JSON.parse(JSON.stringify(this.pendingState))
      this.updateUnsavedIndicator()

      this.showFlash("Palette saved successfully!", "notice")

      // Navigate to show page after brief delay
      setTimeout(() => {
        window.location.href = `/palettes`
      }, 500)

    } catch (error) {
      console.error("Error saving palette:", error)
      this.showFlash(error.message || "Failed to save palette", "alert")
    }
  }

  /**
   * Discard all pending changes and revert to initial state
   */
  discardChanges(event) {
    event?.preventDefault()

    if (!this.hasUnsavedChanges()) return

    if (confirm("Discard all unsaved changes?")) {
      this.pendingState = JSON.parse(JSON.stringify(this.initialState))
      this.renderThreadPills()
      this.renderBackgroundSelector()
      this.renderBackgroundLayer()
      this.updateHeaderStats()
      this.updateSaveButton()
      this.updateUnsavedIndicator()
      this.showFlash("Changes discarded", "notice")
    }
  }

  // ===========================================================================
  // Utilities
  // ===========================================================================

  /**
   * Extract color data from a DOM element's data attributes
   */
  extractColorDataFromElement(element) {
    return {
      id: parseInt(element.dataset.colorId, 10),
      hex: element.dataset.hex,
      vendorCode: element.dataset.vendorCode,
      name: element.dataset.name,
      brandName: element.dataset.brandName,
      oklchL: parseFloat(element.dataset.oklchL) || null,
      colorFamily: element.dataset.colorFamily || null
    }
  }

  getCSRFToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content || ""
  }

  showFlash(message, type = "notice") {
    const flashContainer = document.getElementById("flash-messages")
    if (!flashContainer) return

    const alertClass = type === "alert" ? "alert-error" : "alert-success"
    const iconPath = type === "alert"
      ? "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      : "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"

    const flash = document.createElement("div")
    flash.className = `alert ${alertClass} shadow-lg animate-fade-in`
    flash.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}" />
      </svg>
      <span>${message}</span>
    `

    flashContainer.appendChild(flash)

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      flash.classList.add("animate-fade-out")
      setTimeout(() => flash.remove(), 300)
    }, 3000)
  }
}
