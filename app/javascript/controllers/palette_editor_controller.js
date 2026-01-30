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
    "addThreadHeader", "editThreadHeader", 
    "addBackgroundHeader", "editBackgroundHeader",
    "editColorSwatch", "editColorCode", "editColorName",
    "editBackgroundSwatch", "editBackgroundCode", "editBackgroundName",
    "deleteButtonContainer",
    // Save/status
    "saveButton", "unsavedIndicator"
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

    // Cache reference to the slide panel element
    this.slidePanelElement = document.getElementById("editor-panel-container")
  }

  disconnect() {
    document.removeEventListener("turbo:frame-load", this.handleFrameLoad)
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
        productColor: {
          id: parseInt(pill.dataset.colorId, 10),
          hex: pill.dataset.hex,
          vendorCode: pill.dataset.vendorCode,
          name: pill.dataset.name,
          brandName: pill.dataset.brandName,
          oklchL: parseFloat(pill.dataset.oklchL) || null,
          colorFamily: pill.dataset.colorFamily || null
        }
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
          productColor: {
            id: parseInt(backgroundSelector.dataset.colorId, 10),
            hex: backgroundSelector.dataset.hex,
            vendorCode: backgroundSelector.dataset.vendorCode,
            name: backgroundSelector.dataset.name,
            brandName: backgroundSelector.dataset.brandName,
            colorFamily: backgroundSelector.dataset.colorFamily || null
          }
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

    let html = ""

    // Render existing pills
    // Compare markup to _color_pills_container.html.erb
    this.pendingState.threadSlots.forEach(slot => {

      html += `
        <div class="flex flex-col flex-1 min-w-0 max-w-16 items-center gap-2">
          <button type="button"
                  class="w-full aspect-1/4 rounded-full transition-all hover:scale-105 focus:outline-none focus:ring-4 focus:ring-base-content/20 cursor-pointer"
                  style="background-color: #${slot.productColor.hex};"
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
          </button>
          <div class="h-2 w-3/4 max-w-12 rounded-full bg-base-content opacity-0 transition-opacity"
              data-palette-editor-target="indicator"
              data-slot-id="${slot.id}">
          </div>
        </div>
      `
    })

    // Render add button if not full
    if (!isFull) {
      html += `
        <div class="flex flex-col flex-1 min-w-0 max-w-16 items-center gap-2">
          <button type="button"
                  class="w-full aspect-1/4 rounded-full border-2 border-dashed border-base-content/30 flex items-center justify-center hover:border-base-content/50 hover:bg-base-content/5 transition-all focus:outline-none focus:ring-4 focus:ring-base-content/20"
                  data-action="click->palette-editor#addColor"
                  data-palette-editor-target="addButton">
            <div class="size-12 rounded-full bg-white text-gray-900 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </button>
          <div class="h-2 w-3/4 max-w-12"></div>
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
    statsEl.innerHTML = `
      <svg class="size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
      <span>${count}/${this.maxThreadSlotsValue} colors</span>
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
        <svg class="size-4 text-base-content ml-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      `
      selector.dataset.slotId = bg.id
      selector.dataset.colorId = bg.productColor.id
      selector.dataset.hex = bg.productColor.hex
      selector.dataset.vendorCode = bg.productColor.vendorCode
      selector.dataset.name = bg.productColor.name
      selector.dataset.brandName = bg.productColor.brandName
      selector.dataset.colorFamily = bg.productColor.colorFamily || ''
    } else {
      selector.innerHTML = `
        <span class="size-4 rounded-full border-2 border-dashed border-zinc-400"></span>
        <span class="text-base-content/70">Select background fabric</span>
        <svg class="size-4 text-base-content ml-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
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

    // Determine if button should be enabled:
    // - New palette: enabled when complete (needs initial save)
    // - Existing palette: enabled only when there are unsaved changes AND complete
    const isEnabled = isComplete && (this.isNewPaletteValue || hasChanges)

    if (isEnabled) {
      saveButtonContainer.innerHTML = `
        <button type="button"
                class="btn ${hasChanges ? 'btn-neutral' : 'btn-neutral btn-outline'}"
                data-action="click->palette-editor#savePalette">
          ${buttonText}
        </button>
      `
    } else {
      // Disabled state - either incomplete OR existing palette with no changes
      const title = isComplete 
        ? "No changes to save" 
        : "Add at least one background and one thread color"
      
      saveButtonContainer.innerHTML = `
        <button disabled 
                class="btn btn-disabled"
                title="${title}">
          ${buttonText}
        </button>
      `
    }
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
    this.updatePanelMode()
    this.loadPanelContent("add", "thread")
    this.openPanel()
  }

  editColor(event) {
    event.preventDefault()
    const button = event.currentTarget

    this.modeValue = "edit"
    this.colorTypeValue = "thread"
    this.selectedSlotIdValue = parseInt(button.dataset.slotId, 10)

    if (this.hasEditColorSwatchTarget) {
      this.editColorSwatchTarget.style.backgroundColor = `#${button.dataset.hex}`
    }
    if (this.hasEditColorCodeTarget) {
      this.editColorCodeTarget.textContent = button.dataset.vendorCode
    }
    if (this.hasEditColorNameTarget) {
      this.editColorNameTarget.textContent = `${button.dataset.name} · ${button.dataset.brandName}`
    }

    this.updatePanelMode()
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
    
    const colorData = {
      id: parseInt(button.dataset.colorId, 10),
      hex: button.dataset.hex,
      vendorCode: button.dataset.vendorCode,
      name: button.dataset.name,
      brandName: button.dataset.brandName,
      oklchL: parseFloat(button.dataset.oklchL) || null,
      colorFamily: button.dataset.colorFamily || null
    }

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
    
    const colorData = {
      id: parseInt(button.dataset.colorId, 10),
      hex: button.dataset.hex,
      vendorCode: button.dataset.vendorCode,
      name: button.dataset.name,
      brandName: button.dataset.brandName,
      colorFamily: button.dataset.colorFamily || null
    }

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

    // Populate edit header if editing existing background
    if (hasBackground) {
      if (this.hasEditBackgroundSwatchTarget) {
        this.editBackgroundSwatchTarget.style.backgroundColor = `#${selector.dataset.hex}`
      }
      if (this.hasEditBackgroundCodeTarget) {
        this.editBackgroundCodeTarget.textContent = selector.dataset.vendorCode
      }
      if (this.hasEditBackgroundNameTarget) {
        this.editBackgroundNameTarget.textContent = `${selector.dataset.name} · ${selector.dataset.brandName}`
      }
    }

    this.updatePanelMode()
    
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
    // Hide all headers first
    const headers = [
      this.hasAddThreadHeaderTarget ? this.addThreadHeaderTarget : null,
      this.hasEditThreadHeaderTarget ? this.editThreadHeaderTarget : null,
      this.hasAddBackgroundHeaderTarget ? this.addBackgroundHeaderTarget : null,
      this.hasEditBackgroundHeaderTarget ? this.editBackgroundHeaderTarget : null
    ].filter(Boolean)
    
    headers.forEach(header => {
      header.classList.add("hidden")
      header.classList.remove("flex")
    })

    // Hide delete button by default
    if (this.hasDeleteButtonContainerTarget) {
      this.deleteButtonContainerTarget.classList.add("hidden")
    }

    // Show appropriate header based on mode and colorType
    const isEdit = this.modeValue === "edit"
    const isFabric = this.colorTypeValue === "fabric"

    if (isFabric) {
      if (isEdit && this.hasEditBackgroundHeaderTarget) {
        this.editBackgroundHeaderTarget.classList.remove("hidden")
        this.editBackgroundHeaderTarget.classList.add("flex")
        this.deleteButtonContainerTarget?.classList.remove("hidden")
      } else if (this.hasAddBackgroundHeaderTarget) {
        this.addBackgroundHeaderTarget.classList.remove("hidden")
      }
    } else {
      if (isEdit && this.hasEditThreadHeaderTarget) {
        this.editThreadHeaderTarget.classList.remove("hidden")
        this.editThreadHeaderTarget.classList.add("flex")
        this.deleteButtonContainerTarget?.classList.remove("hidden")
      } else if (this.hasAddThreadHeaderTarget) {
        this.addThreadHeaderTarget.classList.remove("hidden")
      }
    }
  }

  loadPanelContent(mode, type, params = {}) {
    const url = new URL(`/palettes/${this.paletteIdValue}/color_picker_content`, window.location.origin)
    url.searchParams.set("mode", mode)
    url.searchParams.set("type", type)

    // Pass pending background hex for thread color picker display
    if (type === "thread" && this.pendingState.background) {
      url.searchParams.set("pending_background_hex", this.pendingState.background.productColor.hex)
    }

    Object.entries(params).forEach(([ key, value ]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, value)
      }
    })

    // Load content into the slide panel's turbo frame
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
      })
    }
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
      // Only mark if in pending state but not already marked by server
      if (pendingColorIds.has(colorId) && !button.disabled) {
        this.markSwatchAsInPalette(button)
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
