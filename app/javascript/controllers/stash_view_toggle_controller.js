import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["viewButton", "gridView", "listView", "fabricPickerWrapper"]
  
  static values = {
    view: { type: String, default: "grid" } // "grid" | "list"
  }

  connect() {
    this.updateViewButtons()
    this.applyView()
  }

  // Called when a view button is clicked
  switchView(event) {
    const newView = event.currentTarget.dataset.view
    this.viewValue = newView
  }

  // Stimulus callback when viewValue changes
  viewValueChanged() {
    this.updateViewButtons()
    this.applyView()
    this.updateFabricPicker()
    this.dispatchViewChanged()
  }

  updateViewButtons() {
    this.viewButtonTargets.forEach(button => {
      const isActive = button.dataset.view === this.viewValue
      
      if (isActive) {
        button.classList.add("bg-base-100", "text-base-content", "shadow-sm")
        button.classList.remove("text-base-content/60")
      } else {
        button.classList.remove("bg-base-100", "text-base-content", "shadow-sm")
        button.classList.add("text-base-content/60")
      }
    })
  }

  applyView() {
    if (this.hasGridViewTarget && this.hasListViewTarget) {
      if (this.viewValue === "grid") {
        this.gridViewTarget.classList.remove("hidden")
        this.listViewTarget.classList.add("hidden")
      } else {
        this.gridViewTarget.classList.add("hidden")
        this.listViewTarget.classList.remove("hidden")
      }
    }
  }

  updateFabricPicker() {
    if (!this.hasFabricPickerWrapperTarget) return

    const wrapper = this.fabricPickerWrapperTarget
    const button = wrapper.querySelector("button")
    
    if (this.viewValue === "list") {
      // Disable and visually de-emphasize in list view
      wrapper.classList.add("opacity-40", "pointer-events-none")
      if (button) {
        button.disabled = true
        button.setAttribute("aria-disabled", "true")
        button.title = "Fabric preview is only available in grid view"
      }
    } else {
      // Enable in grid view
      wrapper.classList.remove("opacity-40", "pointer-events-none")
      if (button) {
        button.disabled = false
        button.removeAttribute("aria-disabled")
        button.title = ""
      }
    }
  }

  // Dispatch event so other controllers can respond to view changes
  dispatchViewChanged() {
    const event = new CustomEvent("stash-view:changed", {
      detail: { view: this.viewValue },
      bubbles: true
    })
    window.dispatchEvent(event)
  }
}
