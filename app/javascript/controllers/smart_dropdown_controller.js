import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.handleClick = () => this.adjustPosition()
    this.handleFocusin = () => this.adjustPosition()
    
    this.element.addEventListener('click', this.handleClick)
    this.element.addEventListener('focusin', this.handleFocusin)
  }

  disconnect() {
    this.element.removeEventListener('click', this.handleClick)
    this.element.removeEventListener('focusin', this.handleFocusin)
  }

  adjustPosition() {
    const rect = this.element.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    
    this.element.classList.remove('dropdown-start', 'dropdown-end', 'dropdown-center')
    
    const leftThreshold = viewportWidth * 0.33
    const rightThreshold = viewportWidth * 0.66
    
    if (rect.left > leftThreshold && rect.right < rightThreshold) {
      this.element.classList.add('dropdown-center')
    } else if (rect.left < 240) {
      this.element.classList.add('dropdown-start')
    } else {
      this.element.classList.add('dropdown-end')
    }
  }
}
