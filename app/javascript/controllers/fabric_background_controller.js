import { Controller } from "@hotwired/stimulus"

// Controller for elements that should respond to fabric picker changes and view mode changes
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
    
    // Listen for view changes
    this.viewChangedHandler = this.handleViewChange.bind(this)
    window.addEventListener("stash-view:changed", this.viewChangedHandler)
  }

  disconnect() {
    window.removeEventListener("stash-view:changed", this.viewChangedHandler)
  }

  // Listen for fabric picker style changes
  // Wire up with: data-action="fabric-picker:styleChanged@window->fabric-background#update"
  update(event) {
    const { hex } = event.detail
    // Only apply if not in list view
    if (!this.isListView()) {
      this.element.style.backgroundColor = hex || this.defaultValue
    }
  }

  // Handle view mode changes
  handleViewChange(event) {
    const { view } = event.detail
    if (view === "list") {
      // Reset to default background in list view
      this.element.style.backgroundColor = this.defaultValue
    } else {
      // Re-apply saved fabric color in grid view
      this.loadSavedStyle()
    }
  }

  loadSavedStyle() {
    // Don't load saved style if in list view
    if (this.isListView()) {
      this.element.style.backgroundColor = this.defaultValue
      return
    }
    
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

  isListView() {
    // Check if we're currently in list view by looking at the toggle state
    const toggleController = document.querySelector("[data-stash-view-toggle-view-value]")
    return toggleController?.dataset.stashViewToggleViewValue === "list"
  }
}
