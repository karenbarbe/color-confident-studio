import { Controller } from "@hotwired/stimulus"

/**
 * SlidePanelController
 * 
 * A generic slide panel that:
 * - Opens automatically when its Turbo Frame loads content
 * - Closes on backdrop click, close button, or Escape key
 * - Manages body scroll lock on mobile
 * 
 * Usage:
 *   <div data-controller="slide-panel" ...>
 *     <div data-slide-panel-target="backdrop" data-action="click->slide-panel#close">
 *     <aside data-slide-panel-target="panel">
 *       <button data-action="click->slide-panel#close">
 *       <turbo-frame id="panel_content">
 *     </aside>
 *   </div>
 * 
 * The panel opens automatically when the turbo frame receives content.
 * Add `data-slide-panel-auto-open-value="false"` to disable auto-open.
 */
export default class extends Controller {
  static targets = [ "panel", "backdrop" ]
  static values = {
    autoOpen: { type: Boolean, default: true }
  }

  connect() {
    this.handleEscape = this.handleEscape.bind(this)
    this.handleFrameLoad = this.handleFrameLoad.bind(this)
    
    if (this.autoOpenValue) {
      this.element.addEventListener("turbo:frame-load", this.handleFrameLoad)
    }
  }

  disconnect() {
    this.element.removeEventListener("turbo:frame-load", this.handleFrameLoad)
    document.removeEventListener("keydown", this.handleEscape)
  }

  handleFrameLoad(event) {
    // Only open if the frame load happened within this controller's element
    if (this.element.contains(event.target)) {
      this.open()
    }
  }

  open() {
    this.element.classList.add("panel-open")
    
    if (this.hasBackdropTarget) {
      this.backdropTarget.classList.remove("hidden")
    }
    
    document.body.classList.add("overflow-hidden", "md:overflow-auto")
    document.addEventListener("keydown", this.handleEscape)
    
    this.dispatch("opened")
  }

  close() {
    this.element.classList.remove("panel-open")
    
    if (this.hasBackdropTarget) {
      this.backdropTarget.classList.add("hidden")
    }
    
    document.body.classList.remove("overflow-hidden", "md:overflow-auto")
    document.removeEventListener("keydown", this.handleEscape)
    
    this.dispatch("closed")
  }

  handleEscape(event) {
    if (event.key === "Escape") {
      this.close()
    }
  }
}
