import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "nav" ]
  static classes = [ "stuck" ]

  connect() {
    this.isStuck = false
    this.boundOnScroll = this.onScroll.bind(this)
    
    this.navTop = this.calculateInitialNavTop()
    
    window.addEventListener("scroll", this.boundOnScroll, { passive: true })
    
    this.onScroll() // Check initial state
  }

  disconnect() {
    window.removeEventListener("scroll", this.boundOnScroll)
  }

  calculateInitialNavTop() {

    const wrapperRect = this.element.getBoundingClientRect()
    return wrapperRect.top + window.scrollY
  }

  onScroll() {
    const isStuck = window.scrollY >= this.navTop

    // Only dispatch if state changed
    if (isStuck !== this.isStuck) {
      this.isStuck = isStuck
      this.element.classList.toggle(this.stuckClass, isStuck)
      this.dispatchStuckChange(isStuck)
    }
  }

  dispatchStuckChange(isStuck) {
    window.dispatchEvent(new CustomEvent("sticky-nav:stuckChanged", {
      detail: { isStuck }
    }))
  }

  get stuckClass() {
    return this.hasStuckClass ? this.stuckClasses[ 0 ] : "is-stuck"
  }
}
