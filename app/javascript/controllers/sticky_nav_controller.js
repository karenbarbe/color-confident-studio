import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["nav"]
  static classes = ["stuck"]

  connect() {
    this.navTop = this.navTarget.getBoundingClientRect().top + window.scrollY
    this.boundOnScroll = this.onScroll.bind(this)
    window.addEventListener("scroll", this.boundOnScroll, { passive: true })
    this.onScroll() // Check initial state
  }

  disconnect() {
    window.removeEventListener("scroll", this.boundOnScroll)
  }

  onScroll() {
    const isStuck = window.scrollY >= this.navTop
    this.element.classList.toggle(this.stuckClass, isStuck)
  }

  get stuckClass() {
    return this.hasStuckClass ? this.stuckClasses[0] : "is-stuck"
  }
}
