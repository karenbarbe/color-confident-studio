import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.element.addEventListener('click', () => this.adjustPosition())
    this.element.addEventListener('focusin', () => this.adjustPosition())
  }

  adjustPosition() {
    const rect = this.element.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    
    this.element.classList.remove('dropdown-start', 'dropdown-end', 'dropdown-center')
    
    // Check if element is in the center third of the screen
    const leftThreshold = viewportWidth * 0.33
    const rightThreshold = viewportWidth * 0.66
    
    if (rect.left > leftThreshold && rect.right < rightThreshold) {
      // Element is in the middle 
      this.element.classList.add('dropdown-center')
    } else if (rect.left < 240) {
      // Element is on the left side
      this.element.classList.add('dropdown-start')
    } else {
      // Element is on the right side
      this.element.classList.add('dropdown-end')
    }
  }
}
