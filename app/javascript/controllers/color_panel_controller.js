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
    // Add class to container to show panel and push content
    this.element.classList.add("panel-open")
    
    // Mobile backdrop
    this.backdropTarget.classList.remove("hidden")
    document.body.classList.add("overflow-hidden", "md:overflow-auto")
    document.addEventListener("keydown", this.handleEscape)
  }

  close() {
    // Clear the stitch pattern preference when panel closes
    sessionStorage.removeItem(STITCH_PATTERN_STORAGE_KEY)

    this.element.classList.remove("panel-open")
    this.backdropTarget.classList.add("hidden")
    document.body.classList.remove("overflow-hidden", "md:overflow-auto")
    document.removeEventListener("keydown", this.handleEscape)
  }

  handleEscape(event) {
    if (event.key === "Escape") {
      this.close()
    }
  }
}
