import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static classes = [ "visible", "hidden" ]

  connect() {
    this.scrollThreshold = 300
    this.handleScroll = this.handleScroll.bind(this)
    this.updatePosition = this.updatePosition.bind(this)

    window.addEventListener("scroll", this.handleScroll, { passive: true })
    this.handleScroll()

    // Watch for panel open/close
    this.panelObserver = new MutationObserver(this.updatePosition)
    const panelContainer = document.querySelector(".slide-panel-container")
    if (panelContainer) {
      this.panelObserver.observe(panelContainer, { attributes: true, attributeFilter: [ "class" ] })
    }

    // Also handle resize
    window.addEventListener("resize", this.updatePosition, { passive: true })
    this.updatePosition()
  }

  disconnect() {
    window.removeEventListener("scroll", this.handleScroll)
    window.removeEventListener("resize", this.updatePosition)
    if (this.panelObserver) {
      this.panelObserver.disconnect()
    }
  }

  handleScroll() {
    if (window.scrollY > this.scrollThreshold) {
      this.show()
    } else {
      this.hide()
    }
  }

  updatePosition() {
    const panelContainer = document.querySelector(".slide-panel-container")
    if (panelContainer && panelContainer.classList.contains("panel-open")) {
      const panelWidth = panelContainer.offsetWidth
      this.element.style.right = `${panelWidth + 24}px` // 24px = 1.5rem (right-6)
    } else {
      this.element.style.right = "1.5rem" // right-6 default
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
