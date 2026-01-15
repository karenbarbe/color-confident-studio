import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["viewButton", "gridView", "listView", "fabricPickerWrapper"]
  
  static values = {
    view: { type: String, default: "grid" } // "grid" | "list"
  }

  static classes = ["active", "inactive"]

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
    const activeClasses = this.activeClass?.split(" ") || []
    const inactiveClasses = this.inactiveClass?.split(" ") || []

    this.viewButtonTargets.forEach(button => {
      const isActive = button.dataset.view === this.viewValue
      
      if (isActive) {
        button.classList.remove(...inactiveClasses)
        button.classList.add(...activeClasses)
      } else {
        button.classList.remove(...activeClasses)
        button.classList.add(...inactiveClasses)
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
      wrapper.classList.add("opacity-40", "pointer-events-none")
      if (button) {
        button.disabled = true
        button.setAttribute("aria-disabled", "true")
        button.title = "Fabric preview is only available in grid view"
      }
    } else {
      wrapper.classList.remove("opacity-40", "pointer-events-none")
      if (button) {
        button.disabled = false
        button.removeAttribute("aria-disabled")
        button.title = ""
      }
    }
  }

  dispatchViewChanged() {
    const event = new CustomEvent("stash-view:changed", {
      detail: { view: this.viewValue },
      bubbles: true
    })
    window.dispatchEvent(event)
  }
}
