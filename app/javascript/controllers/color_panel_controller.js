import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["panel", "backdrop"]

  connect() {
    this.element.addEventListener("turbo:frame-load", this.open.bind(this))
    this.handleEscape = this.handleEscape.bind(this)
  }

  disconnect() {
    this.element.removeEventListener("turbo:frame-load", this.open.bind(this))
    document.removeEventListener("keydown", this.handleEscape)
  }

  open() {
    // Make visible first, then animate in
    this.panelTarget.classList.remove("invisible")
    // Small delay to ensure visibility change happens before transform
    requestAnimationFrame(() => {
      this.panelTarget.classList.add("open")
    })
    this.backdropTarget.classList.remove("hidden")
    document.body.classList.add("overflow-hidden", "md:overflow-auto")
    document.addEventListener("keydown", this.handleEscape)
  }

  close() {
    this.panelTarget.classList.remove("open")
    this.backdropTarget.classList.add("hidden")
    document.body.classList.remove("overflow-hidden", "md:overflow-auto")
    document.removeEventListener("keydown", this.handleEscape)
    
    // Wait for the slide-out animation to finish, then hide completely
    this.panelTarget.addEventListener("transitionend", () => {
      if (!this.panelTarget.classList.contains("open")) {
        this.panelTarget.classList.add("invisible")
      }
    }, { once: true })
  }

  handleEscape(event) {
    if (event.key === "Escape") {
      this.close()
    }
  }
}
