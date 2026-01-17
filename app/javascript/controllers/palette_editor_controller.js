import { Controller } from "@hotwired/stimulus"

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
    "deleteButtonContainer"
  ]

  static values = {
    paletteId: Number,
    panelOpen: { type: Boolean, default: false },
    mode: { type: String, default: "add" }, // "add", "edit", or "background"
    selectedSlotId: { type: Number, default: 0 }
  }

  connect() {
    this.handleEscape = this.handleEscape.bind(this)
    this.handleColorChanged = this.handleColorChanged.bind(this)

    // Listen for custom event from Turbo Stream to close panel
    window.addEventListener("palette:color-changed", this.handleColorChanged)
  }

  disconnect() {
    document.removeEventListener("keydown", this.handleEscape)
    window.removeEventListener("palette:color-changed", this.handleColorChanged)
  }

  handleColorChanged() {
    // Close the panel when a color is added/updated/removed
    this.closePanel()
  }

  // ===========================================================================
  // Name editing
  // ===========================================================================

  editName(event) {
    event.preventDefault()

    if (!this.hasNameDisplayTarget || !this.hasNameFormTarget) return

    // Hide display, show form
    this.nameDisplayTarget.classList.add("hidden")
    this.nameDisplayTarget.nextElementSibling?.classList.add("hidden") // hide edit button
    this.nameFormTarget.classList.remove("hidden")
    this.nameFormTarget.classList.add("flex")

    // Focus and select input
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
    // Enter will submit the form naturally
  }

  closeName() {
    if (!this.hasNameFormTarget || !this.hasNameDisplayTarget) return

    this.nameFormTarget.classList.add("hidden")
    this.nameFormTarget.classList.remove("flex")
    this.nameDisplayTarget.classList.remove("hidden")
    this.nameDisplayTarget.nextElementSibling?.classList.remove("hidden") // show edit button
  }

  // ===========================================================================
  // Panel management
  // ===========================================================================

  openPanel() {
    this.panelOpenValue = true

    if (this.hasBackdropTarget) {
      this.backdropTarget.classList.remove("hidden")
    }

    document.addEventListener("keydown", this.handleEscape)

    // Trigger animation
    requestAnimationFrame(() => {
      if (this.hasBackdropTarget) {
        this.backdropTarget.classList.remove("opacity-0")
        this.backdropTarget.classList.add("opacity-100")
      }
      if (this.hasPanelTarget) {
        this.panelTarget.classList.remove("translate-y-full")
      }
    })

    // Prevent body scroll on mobile
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

    // Clear selection indicator
    this.clearSelectionIndicators()
    this.selectedSlotIdValue = 0

    // Wait for animation then hide backdrop
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
  // Color actions
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

    // Update edit mode header with color info
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
      this.deleteColorSlot(this.selectedSlotIdValue)
    }
  }

  // ===========================================================================
  // Thread color selection (called from matching_threads_list buttons)
  // ===========================================================================

  selectThreadColor(event) {
    event.preventDefault()
    const button = event.currentTarget
    const colorId = button.dataset.colorId
    const mode = button.dataset.mode
    const slotId = button.dataset.slotId

    if (mode === "edit" && slotId) {
      // Update existing slot
      this.updateColorSlot(slotId, colorId)
    } else {
      // Create new slot
      this.createColorSlot(colorId, "thread")
    }
  }

  // ===========================================================================
  // Background color selection (called from fabric_swatch buttons)
  // ===========================================================================

  selectBackgroundColor(event) {
    event.preventDefault()
    const button = event.currentTarget
    
    if (button.disabled) return
    
    const colorId = button.dataset.colorId
    this.createColorSlot(colorId, "background")
  }

  removeBackgroundColor(event) {
    event.preventDefault()
    const button = event.currentTarget
    const slotId = button.dataset.slotId

    if (slotId && confirm("Remove background color?")) {
      this.deleteColorSlot(slotId)
    }
  }

  // ===========================================================================
  // API calls for color slot management
  // ===========================================================================

  createColorSlot(colorId, slotType) {
    const url = `/palettes/${this.paletteIdValue}/color_slots`

    // Check DOM state BEFORE
    const pillsContainerBefore = document.getElementById("color-pills-container")
    console.log("BEFORE - color-pills-container exists:", !!pillsContainerBefore)
    if (pillsContainerBefore) {
      console.log("BEFORE - pills container children count:", pillsContainerBefore.children.length)
    }

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/vnd.turbo-stream.html",
        "X-CSRF-Token": this.getCSRFToken(),
        "X-Requested-With": "XMLHttpRequest"
      },
      body: JSON.stringify({
        color_slot: {
          product_color_id: colorId,
          slot_type: slotType
        }
      })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("Network response was not ok")
        }
        return response.text()
      })
      .then(html => {
        console.log("Received HTML length:", html.length)
        
        // Check if Turbo is available and what version/state
        console.log("Turbo object:", Turbo)
        console.log("Turbo.session:", Turbo.session)
        console.log("Turbo.session.drive:", Turbo.session.drive)
        
        // Try to manually parse and apply the stream
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, "text/html")
        const streams = doc.querySelectorAll("turbo-stream")
        console.log("Number of turbo-stream elements in response:", streams.length)
        
        streams.forEach((stream, i) => {
          console.log(`Stream ${i}: action=${stream.getAttribute("action")}, target=${stream.getAttribute("target")}`)
          const targetEl = document.getElementById(stream.getAttribute("target"))
          console.log(`  Target element exists in DOM: ${!!targetEl}`)
        })
        
        // Now call Turbo
        Turbo.renderStreamMessage(html)
        
        // Check DOM state AFTER
        setTimeout(() => {
          const pillsContainerAfter = document.getElementById("color-pills-container")
          console.log("AFTER - color-pills-container exists:", !!pillsContainerAfter)
          if (pillsContainerAfter) {
            console.log("AFTER - pills container children count:", pillsContainerAfter.children.length)
            console.log("AFTER - same element as before?", pillsContainerBefore === pillsContainerAfter)
          }
        }, 100)
      })
      .catch(error => {
        console.error("Error creating color slot:", error)
      })
  }

  updateColorSlot(slotId, colorId) {
    const url = `/palettes/${this.paletteIdValue}/color_slots/${slotId}`

    fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/vnd.turbo-stream.html",
        "X-CSRF-Token": this.getCSRFToken(),
        "X-Requested-With": "XMLHttpRequest"
      },
      body: JSON.stringify({
        color_slot: {
          product_color_id: colorId
        }
      })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("Network response was not ok")
        }
        return response.text()
      })
      .then(html => {
        Turbo.renderStreamMessage(html)
        // Panel will be closed by the custom event handler
      })
      .catch(error => {
        console.error("Error updating color slot:", error)
      })
  }

  deleteColorSlot(slotId) {
    const url = `/palettes/${this.paletteIdValue}/color_slots/${slotId}`

    fetch(url, {
      method: "DELETE",
      headers: {
        "Accept": "text/vnd.turbo-stream.html",
        "X-CSRF-Token": this.getCSRFToken(),
        "X-Requested-With": "XMLHttpRequest"
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("Network response was not ok")
        }
        return response.text()
      })
      .then(html => {
        Turbo.renderStreamMessage(html)
        // Panel will be closed by the custom event handler
      })
      .catch(error => {
        console.error("Error deleting color slot:", error)
      })
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
    // Hide all headers first
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

    // Show the appropriate header based on mode
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
  // Utilities
  // ===========================================================================

  getCSRFToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content || ""
  }
}
