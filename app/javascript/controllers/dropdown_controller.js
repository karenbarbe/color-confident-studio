import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["menu", "icon"]

  connect() {
    // Close dropdown when clicking outside
    this.boundClose = this.closeOnClickOutside.bind(this)
    document.addEventListener("click", this.boundClose)
  }

  disconnect() {
    document.removeEventListener("click", this.boundClose)
  }

  toggle(event) {
    event.stopPropagation()
    
    if (this.hasMenuTarget) {
      const isHidden = this.menuTarget.classList.contains("hidden")
      
      if (isHidden) {
        this.open()
      } else {
        this.close()
      }
    }
  }

  open() {
    if (this.hasMenuTarget) {
      this.menuTarget.classList.remove("hidden")
    }
    if (this.hasIconTarget) {
      this.iconTarget.classList.add("rotate-180")
    }
  }

  close() {
    if (this.hasMenuTarget) {
      this.menuTarget.classList.add("hidden")
    }
    if (this.hasIconTarget) {
      this.iconTarget.classList.remove("rotate-180")
    }
  }

  closeOnClickOutside(event) {
    if (!this.element.contains(event.target)) {
      this.close()
    }
  }
}
