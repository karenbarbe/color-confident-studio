import { Controller } from "@hotwired/stimulus"
const STITCH_PATTERN_STORAGE_KEY = "stitchPreviewPattern"

export default class extends Controller {
  static targets = [ "panel", "backdrop" ]

  connect() {
    this.element.addEventListener("turbo:frame-load", this.open.bind(this))
    this.handleEscape = this.handleEscape.bind(this)
  }

  disconnect() {
    this.element.removeEventListener("turbo:frame-load", this.open.bind(this))
    document.removeEventListener("keydown", this.handleEscape)
  }

  open() {
    this.panelTarget.classList.remove("invisible")
    requestAnimationFrame(() => {
      this.panelTarget.classList.add("open")
    })
    this.backdropTarget.classList.remove("hidden")
    document.body.classList.add("overflow-hidden", "md:overflow-auto")
    document.addEventListener("keydown", this.handleEscape)
  }

  close() {
    // Clear the stitch pattern preference when panel closes
    sessionStorage.removeItem(STITCH_PATTERN_STORAGE_KEY)

    this.panelTarget.classList.remove("open")
    this.backdropTarget.classList.add("hidden")
    document.body.classList.remove("overflow-hidden", "md:overflow-auto")
    document.removeEventListener("keydown", this.handleEscape)

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
