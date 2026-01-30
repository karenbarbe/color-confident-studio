import { Controller } from "@hotwired/stimulus"

/**
 * SlidePanelController
 * 
 * A generic slide panel that:
 * - Opens automatically when its Turbo Frame loads content (if autoOpen is true)
 * - Can be opened programmatically via open() method or "slide-panel:open" event
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
 * 
 * Programmatic control:
 *   - Call open() / close() methods directly
 *   - Dispatch "slide-panel:request-open" event on the controller element
 */
export default class extends Controller {
  static targets = [ "panel", "backdrop" ]
  static values = {
    autoOpen: { type: Boolean, default: true }
  }

  connect() {
    this.handleEscape = this.handleEscape.bind(this)
    this.handleFrameLoad = this.handleFrameLoad.bind(this)
    this.handleTransitionEnd = this.handleTransitionEnd.bind(this)
    this.handleRequestOpen = this.handleRequestOpen.bind(this)
    
    if (this.autoOpenValue) {
      this.element.addEventListener("turbo:frame-load", this.handleFrameLoad)
    }

    if (this.hasPanelTarget) {
      this.panelTarget.addEventListener("transitionend", this.handleTransitionEnd)
    }

    // Listen for programmatic open requests
    this.element.addEventListener("slide-panel:request-open", this.handleRequestOpen)
  }

  disconnect() {
    this.element.removeEventListener("turbo:frame-load", this.handleFrameLoad)
    this.element.removeEventListener("slide-panel:request-open", this.handleRequestOpen)
    document.removeEventListener("keydown", this.handleEscape)

    if (this.hasPanelTarget) {
      this.panelTarget.removeEventListener("transitionend", this.handleTransitionEnd)
    }
  }

  handleFrameLoad(event) {
    // Only open if the frame load happened within this controller's element
    if (this.element.contains(event.target)) {
      this.open()
    }
  }

  handleRequestOpen(event) {
    this.open()
  }

  open() {
    this.element.classList.add("panel-transitioning")
    // Force reflow to ensure the transitioning class is applied before adding panel-open
    this.panelTarget.offsetHeight
    this.element.classList.add("panel-open")
    
    if (this.hasBackdropTarget) {
      this.backdropTarget.classList.remove("hidden")
    }
    
    document.body.classList.add("overflow-hidden", "md:overflow-auto")
    document.addEventListener("keydown", this.handleEscape)
    
    this.dispatch("opened")
  }

  close() {
    this.element.classList.add("panel-transitioning")
    this.element.classList.remove("panel-open")
    
    if (this.hasBackdropTarget) {
      this.backdropTarget.classList.add("hidden")
    }
    
    document.body.classList.remove("overflow-hidden", "md:overflow-auto")
    document.removeEventListener("keydown", this.handleEscape)
    
    this.dispatch("closed")
  }

  handleTransitionEnd(event) {
    // Only respond to transform transitions on the panel itself
    if (event.target === this.panelTarget && event.propertyName === "transform") {
      this.element.classList.remove("panel-transitioning")
    }
  }

  handleEscape(event) {
    if (event.key === "Escape") {
      this.close()
    }
  }
}
