import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["sidebar", "dropdown"]
  static values = { 
    ready: { type: Boolean, default: false } 
  }

  connect() {
    // Prevent immediate expansion on page load when cursor is already over sidebar
    // Small delay allows the page to settle before responding to hover
    setTimeout(() => {
      this.readyValue = true
      
      // Check if mouse is currently over the sidebar after the delay
      // If so, expand it (handles case where user's cursor stayed in place)
      if (this.isMouseOverSidebar()) {
        this.expand()
      }
    }, 150)

    // Reset ready state on Turbo navigation to prevent flicker
    document.addEventListener("turbo:before-visit", this.handleBeforeVisit)
  }

  disconnect() {
    document.removeEventListener("turbo:before-visit", this.handleBeforeVisit)
  }

  handleBeforeVisit = () => {
    // Collapse sidebar before navigation and disable hover temporarily
    this.readyValue = false
    this.element.classList.remove("sidebar-expanded")
  }

  expand() {
    if (this.readyValue) {
      this.element.classList.add("sidebar-expanded")
    }
  }

  collapse() {
    this.element.classList.remove("sidebar-expanded")
    this.closeAllDropdowns()
  }

  // Close all DaisyUI dropdowns by removing focus
  closeAllDropdowns() {
    if (this.hasDropdownTarget) {
      this.dropdownTargets.forEach(dropdown => {
        // Blur any focused elements within the dropdown to close it
        const focusedElement = dropdown.querySelector("[tabindex='0']:focus")
        if (focusedElement) {
          focusedElement.blur()
        }
        // Also blur the trigger element
        const trigger = dropdown.querySelector("[tabindex='0']")
        if (trigger) {
          trigger.blur()
        }
      })
    }
    // Remove focus from any active element in the sidebar
    if (document.activeElement && this.element.contains(document.activeElement)) {
      document.activeElement.blur()
    }
  }

  isMouseOverSidebar() {
    const rect = this.element.getBoundingClientRect()
    const mouseX = this.lastMouseX ?? -1
    const mouseY = this.lastMouseY ?? -1
    
    return (
      mouseX >= rect.left &&
      mouseX <= rect.right &&
      mouseY >= rect.top &&
      mouseY <= rect.bottom
    )
  }

  // Track mouse position for the isMouseOverSidebar check
  handleMouseMove = (event) => {
    this.lastMouseX = event.clientX
    this.lastMouseY = event.clientY
  }

  initialize() {
    // Track mouse position globally
    document.addEventListener("mousemove", this.handleMouseMove, { passive: true })
  }
}
