import { Controller } from "@hotwired/stimulus"

/**
 * PaletteCardController
 * 
 * Handles inline rename functionality for palette cards on the index page.
 * Keeps rename action separate from the palette editor to avoid state conflicts.
 */
export default class extends Controller {
  static targets = [ "title", "form", "input" ]
  static values = { 
    paletteId: Number,
    name: String
  }

  connect() {
    this.handleKeydown = this.handleKeydown.bind(this)
  }

  // Show the inline rename form
  startRename(event) {
    event.preventDefault()
    
    // Close the dropdown
    document.activeElement?.blur()
    
    this.titleTarget.classList.add("hidden")
    this.formTarget.classList.remove("hidden")
    this.inputTarget.value = this.nameValue || "New palette"
    this.inputTarget.focus()
    this.inputTarget.select()
    
    document.addEventListener("keydown", this.handleKeydown)
  }

  // Cancel and restore the title display
  cancelRename(event) {
    event?.preventDefault()
    this.closeForm()
  }

  // Handle keyboard events
  handleKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault()
      this.closeForm()
    }
  }

  // Close the form and show the title
  closeForm() {
    document.removeEventListener("keydown", this.handleKeydown)
    this.formTarget.classList.add("hidden")
    this.titleTarget.classList.remove("hidden")
  }

  // Handle successful form submission via Turbo Stream
  submitEnd(event) {
    if (event.detail.success) {
      this.closeForm()
    }
  }
}
