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
 */
export default class extends Controller {
  static targets = [
    // Header
    "nameContainer", "nameDisplay", "nameForm", "nameInput",
    // Background
    "backgroundLayer",
    // Pills
    "pillsContainer", "colorPill", "addButton", "indicator",
    // Panel
    "backdrop", "panel", "panelHeader", "panelContent",
    "addModeHeader", "editModeHeader", "backgroundModeHeader",
    "editColorSwatch", "editColorCode", "editColorName",
    "deleteButtonContainer",
    // Save/status
    "saveButton", "unsavedIndicator"
  ]

  static values = {
    paletteId: Number,
    panelOpen: { type: Boolean, default: false },
    mode: { type: String, default: "add" }, // "add", "edit", or "background"
    selectedSlotId: { type: Number, default: 0 },
    maxThreadSlots: { type: Number, default: 12 },
    isNewPalette: { type: Boolean, default: true }
  }

  connect() {
    this.handleEscape = this.handleEscape.bind(this)
    
    // Initialize state management
    this.initializeState()
    
    // Generate unique IDs for new slots (negative to distinguish from server IDs)
    this.nextTempId = -1
  }

  disconnect() {
    document.removeEventListener("keydown", this.handleEscape)
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
          oklchL: parseFloat(pill.dataset.oklchL) || null
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
            brandName: backgroundSelector.dataset.brandName
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
      this.initialState.threadSlots.map(s => [s.id, s])
    )
    const pendingThreadMap = new Map(
      this.pendingState.threadSlots.map(s => [s.id, s])
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
        oklchL: colorData.oklchL
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
      oklchL: colorData.oklchL
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
        brandName: colorData.brandName
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
    this.pendingState.threadSlots.forEach(slot => {
      const needsRing = !(slot.productColor.oklchL && slot.productColor.oklchL >= 0.9)
      const ringClass = needsRing ? "ring-1 ring-inset ring-white/20" : ""

      html += `
        <div class="flex flex-col items-center gap-2 shrink-0">
          <button type="button"
                  class="w-[100px] sm:w-[120px] h-[300px] sm:h-[360px] rounded-full shadow-lg transition-all hover:scale-105 focus:outline-none focus:ring-4 focus:ring-zinc-900/20 ${ringClass}"
                  style="background-color: #${slot.productColor.hex};"
                  data-action="click->palette-editor#editColor"
                  data-slot-id="${slot.id}"
                  data-color-id="${slot.productColor.id}"
                  data-hex="${slot.productColor.hex}"
                  data-vendor-code="${slot.productColor.vendorCode}"
                  data-name="${slot.productColor.name}"
                  data-brand-name="${slot.productColor.brandName}"
                  data-oklch-l="${slot.productColor.oklchL || ''}"
                  data-palette-editor-target="colorPill"
                  title="${slot.productColor.vendorCode} - ${slot.productColor.name}">
          </button>
          <div class="h-2 w-12 rounded-full bg-zinc-900 opacity-0 transition-opacity"
               data-palette-editor-target="indicator"
               data-slot-id="${slot.id}">
          </div>
        </div>
      `
    })

    // Render add button if not full
    if (!isFull) {
      html += `
        <div class="flex flex-col items-center gap-2 shrink-0">
          <button type="button"
                  class="w-[100px] sm:w-[120px] h-[300px] sm:h-[360px] rounded-full border-2 border-dashed border-zinc-900/30 flex items-center justify-center hover:border-zinc-900/50 hover:bg-zinc-900/5 transition-all focus:outline-none focus:ring-4 focus:ring-zinc-900/20"
                  data-action="click->palette-editor#addColor"
                  data-palette-editor-target="addButton">
            <div class="size-12 rounded-full bg-zinc-900/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="size-6 text-zinc-900/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </button>
          <div class="h-2 w-12"></div>
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
    }
  }

  /**
   * Update the background layer color
   */
  renderBackgroundLayer() {
    const styleEl = document.getElementById("background-layer-style")
    if (!styleEl) return

    const bg = this.pendingState.background
    const color = bg ? `#${bg.productColor.hex}` : "transparent"

    styleEl.innerHTML = `
      <style>
        #background-layer {
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
                class="btn ${hasChanges ? 'btn-primary' : 'btn-neutral'}"
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
    // You can add an unsaved indicator element to your view
    // For now, we'll update the document title
    const hasChanges = this.hasUnsavedChanges()
    const baseTitle = document.title.replace(/^\* /, "")
    document.title = hasChanges ? `* ${baseTitle}` : baseTitle

    // Optional: Add beforeunload warning
    if (hasChanges) {
      window.onbeforeunload = () => "You have unsaved changes. Are you sure you want to leave?"
    } else {
      window.onbeforeunload = null
    }
  }

  // ===========================================================================
  // Name editing (unchanged from original)
  // ===========================================================================

  editName(event) {
    event.preventDefault()

    if (!this.hasNameDisplayTarget || !this.hasNameFormTarget) return

    this.nameDisplayTarget.classList.add("hidden")
    this.nameDisplayTarget.nextElementSibling?.classList.add("hidden")
    this.nameFormTarget.classList.remove("hidden")
    this.nameFormTarget.classList.add("flex")

    if (this.hasNameInputTarget) {
      this.nameInputTarget.focus()
      this.nameInputTarget.select()
    }
  }

  cancelNameEdit(event) {
    event?.preventDefault()
    this.closeName()
  }

  handleNameKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault()
      this.closeName()
    }
  }

  closeName() {
    if (!this.hasNameFormTarget || !this.hasNameDisplayTarget) return

    this.nameFormTarget.classList.add("hidden")
    this.nameFormTarget.classList.remove("flex")
    this.nameDisplayTarget.classList.remove("hidden")
    this.nameDisplayTarget.nextElementSibling?.classList.remove("hidden")
  }

  // ===========================================================================
  // Panel management (unchanged from original)
  // ===========================================================================

  openPanel() {
    this.panelOpenValue = true

    if (this.hasBackdropTarget) {
      this.backdropTarget.classList.remove("hidden")
    }

    document.addEventListener("keydown", this.handleEscape)

    requestAnimationFrame(() => {
      if (this.hasBackdropTarget) {
        this.backdropTarget.classList.remove("opacity-0")
        this.backdropTarget.classList.add("opacity-100")
      }
      if (this.hasPanelTarget) {
        this.panelTarget.classList.remove("translate-y-full")
      }
    })

    document.body.classList.add("overflow-hidden", "md:overflow-auto")
  }

  closePanel() {
    if (!this.panelOpenValue) return

    this.panelOpenValue = false

    if (this.hasBackdropTarget) {
      this.backdropTarget.classList.remove("opacity-100")
      this.backdropTarget.classList.add("opacity-0")
    }

    if (this.hasPanelTarget) {
      this.panelTarget.classList.add("translate-y-full")
    }

    document.removeEventListener("keydown", this.handleEscape)
    this.clearSelectionIndicators()
    this.selectedSlotIdValue = 0

    setTimeout(() => {
      if (this.hasBackdropTarget) {
        this.backdropTarget.classList.add("hidden")
      }
    }, 300)

    document.body.classList.remove("overflow-hidden", "md:overflow-auto")
  }

  handleEscape(event) {
    if (event.key === "Escape") {
      this.closePanel()
    }
  }

  // ===========================================================================
  // Color actions (modified to use client-side state)
  // ===========================================================================

  addColor(event) {
    event.preventDefault()
    this.modeValue = "add"
    this.selectedSlotIdValue = 0
    this.updatePanelMode()
    this.loadPanelContent("add")
    this.openPanel()
  }

  editColor(event) {
    event.preventDefault()
    const button = event.currentTarget

    this.modeValue = "edit"
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
    this.loadPanelContent("edit", {
      slot_id: this.selectedSlotIdValue,
      color_id: button.dataset.colorId
    })
    this.openPanel()
  }

  deleteColor() {
    if (!this.selectedSlotIdValue) return

    if (confirm("Remove this color from the palette?")) {
      this.removeThreadColor(this.selectedSlotIdValue)
    }
  }

  // ===========================================================================
  // Thread color selection (from matching_threads_list buttons)
  // Now updates client-side state instead of calling server
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
      oklchL: parseFloat(button.dataset.oklchL) || null
    }

    const mode = button.dataset.mode
    const slotId = parseInt(button.dataset.slotId, 10)

    if (mode === "edit" && slotId) {
      this.updateThreadColor(slotId, colorData)
    } else {
      this.addThreadColor(colorData)
    }
  }

  // ===========================================================================
  // Background color selection (from fabric_swatch buttons)
  // Now updates client-side state instead of calling server
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
      brandName: button.dataset.brandName
    }

    this.setBackgroundColor(colorData)
  }

  removeBackgroundColor(event) {
    event.preventDefault()

    if (confirm("Remove background color?")) {
      this.removeBackgroundColor()
    }
  }

  // ===========================================================================
  // Background picker
  // ===========================================================================

  openBackgroundPicker(event) {
    event.preventDefault()
    this.modeValue = "background"
    this.selectedSlotIdValue = 0
    this.updatePanelMode()
    this.loadBackgroundPicker()
    this.openPanel()
  }

  loadBackgroundPicker() {
    const url = new URL(`/palettes/${this.paletteIdValue}/background_picker`, window.location.origin)

    if (this.hasPanelContentTarget) {
      this.panelContentTarget.src = url.toString()
    }
  }

  // ===========================================================================
  // Panel content
  // ===========================================================================

  updatePanelMode() {
    if (this.hasAddModeHeaderTarget) {
      this.addModeHeaderTarget.classList.add("hidden")
    }
    if (this.hasEditModeHeaderTarget) {
      this.editModeHeaderTarget.classList.add("hidden")
      this.editModeHeaderTarget.classList.remove("flex")
    }
    if (this.hasBackgroundModeHeaderTarget) {
      this.backgroundModeHeaderTarget.classList.add("hidden")
    }
    if (this.hasDeleteButtonContainerTarget) {
      this.deleteButtonContainerTarget.classList.add("hidden")
    }

    switch (this.modeValue) {
      case "add":
        if (this.hasAddModeHeaderTarget) {
          this.addModeHeaderTarget.classList.remove("hidden")
        }
        break
      case "edit":
        if (this.hasEditModeHeaderTarget) {
          this.editModeHeaderTarget.classList.remove("hidden")
          this.editModeHeaderTarget.classList.add("flex")
        }
        if (this.hasDeleteButtonContainerTarget) {
          this.deleteButtonContainerTarget.classList.remove("hidden")
        }
        break
      case "background":
        if (this.hasBackgroundModeHeaderTarget) {
          this.backgroundModeHeaderTarget.classList.remove("hidden")
        }
        break
    }
  }

  loadPanelContent(mode, params = {}) {
    const url = new URL(`/palettes/${this.paletteIdValue}/panel_content`, window.location.origin)
    url.searchParams.set("mode", mode)

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    if (this.hasPanelContentTarget) {
      this.panelContentTarget.src = url.toString()
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
  // Server sync - batch save
  // ===========================================================================

  async savePalette(event) {
    event?.preventDefault()

    if (!this.hasUnsavedChanges()) {
      // No changes, just navigate to show page
      window.location.href = `/palettes/${this.paletteIdValue}`
      return
    }

    const changes = this.calculateChanges()
    
    // If no actual data changes, just navigate
    if (changes.additions.length === 0 && 
        changes.updates.length === 0 && 
        changes.deletions.length === 0) {
      window.location.href = `/palettes/${this.paletteIdValue}`
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
        window.location.href = `/palettes/${this.paletteIdValue}`
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
