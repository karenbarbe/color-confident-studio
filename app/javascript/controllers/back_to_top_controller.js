import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static classes = ["visible", "hidden"]

  connect() {
    this.scrollThreshold = 300
    this.handleScroll = this.handleScroll.bind(this)
    window.addEventListener("scroll", this.handleScroll, { passive: true })
    this.handleScroll() // Check initial state
  }

  disconnect() {
    window.removeEventListener("scroll", this.handleScroll)
  }

  handleScroll() {
    if (window.scrollY > this.scrollThreshold) {
      this.show()
    } else {
      this.hide()
    }
  }

  show() {
    this.hiddenClasses.forEach(cls => this.element.classList.remove(cls))
    this.visibleClasses.forEach(cls => this.element.classList.add(cls))
  }

  hide() {
    this.visibleClasses.forEach(cls => this.element.classList.remove(cls))
    this.hiddenClasses.forEach(cls => this.element.classList.add(cls))
  }
}
