import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "input", "button" ]
  static classes = [ "expanded" ]

  connect() {
    this.boundCloseOnClickOutside = this.closeOnClickOutside.bind(this)
    this.boundCloseOnEscape = this.closeOnEscape.bind(this)
    
    // Start expanded if there's already a search value
    if (this.inputTarget.value) {
      this.expand()
    }
  }

  disconnect() {
    document.removeEventListener("click", this.boundCloseOnClickOutside)
    document.removeEventListener("keydown", this.boundCloseOnEscape)
  }

  toggle(event) {
    event.preventDefault()
    event.stopPropagation()

    if (this.isExpanded()) {
      this.collapse()
    } else {
      this.expand()
    }
  }

  expand() {
    this.inputTarget.classList.remove("w-0", "opacity-0", "invisible")
    this.inputTarget.classList.add("w-32", "opacity-100", "visible")
    this.inputTarget.focus()

    document.addEventListener("click", this.boundCloseOnClickOutside)
    document.addEventListener("keydown", this.boundCloseOnEscape)
  }

  collapse() {
    // Don't collapse if there's a search value
    if (this.inputTarget.value) return

    this.inputTarget.classList.remove("w-32", "opacity-100", "visible")
    this.inputTarget.classList.add("w-0", "opacity-0", "invisible")

    document.removeEventListener("click", this.boundCloseOnClickOutside)
    document.removeEventListener("keydown", this.boundCloseOnEscape)
  }

  closeOnClickOutside(event) {
    if (!this.element.contains(event.target)) {
      this.collapse()
    }
  }

  closeOnEscape(event) {
    if (event.key === "Escape") {
      this.collapse()
    }
  }

  isExpanded() {
    return this.inputTarget.classList.contains("w-32")
  }
}
