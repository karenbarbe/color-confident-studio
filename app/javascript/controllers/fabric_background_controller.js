import { Controller } from "@hotwired/stimulus"

// Simple controller for elements that should respond to fabric picker changes
// Usage: Add data-controller="fabric-background" to any element that should
//        change its background color when a fabric is selected.
//        The element must be within earshot of the fabric-picker:styleChanged event.

export default class extends Controller {
  static values = {
    default: { type: String, default: "" } // Optional default background color
  }

  connect() {
    // Apply any saved preference on connect
    this.loadSavedStyle()
  }

  // Listen for fabric picker style changes
  // Wire up with: data-action="fabric-picker:styleChanged@window->fabric-background#update"
  update(event) {
    const { hex } = event.detail
    this.element.style.backgroundColor = hex || this.defaultValue
  }

  loadSavedStyle() {
    try {
      const saved = localStorage.getItem("fabricPreview")
      if (saved) {
        const { hex } = JSON.parse(saved)
        this.element.style.backgroundColor = hex || this.defaultValue
      }
    } catch (e) {
      // Ignore errors
    }
  }
}
