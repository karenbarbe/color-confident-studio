import { Controller } from "@hotwired/stimulus"

//   threshold: Minimum scroll position before hiding
//   deadZone:  Minimum scroll difference to trigger show/hide

export default class extends Controller {
  
  static values = {
    threshold: { type: Number, default: 50 },
    deadZone: { type: Number, default: 5 }
  }

  connect() {
    // Initial scroll position
    this.lastScrollY = window.scrollY
    
    // Performance flag for requestAnimationFrame
    this.ticking = false
    
    this.boundOnScroll = this.onScroll.bind(this)
    
    window.addEventListener("scroll", this.boundOnScroll, { passive: true })
  }

  disconnect() {
    window.removeEventListener("scroll", this.boundOnScroll)
  }

  onScroll() {
    // This limits updates to ~60fps instead of potentially hundreds per second
    if (!this.ticking) {
      window.requestAnimationFrame(() => {
        this.update()
        this.ticking = false
      })
      this.ticking = true
    }
  }

  update() {
    const currentScrollY = window.scrollY
    const scrollDifference = Math.abs(currentScrollY - this.lastScrollY)
    
    // Show navbar when near the top of the page
    if (currentScrollY < this.thresholdValue) {
      this.show()
      this.lastScrollY = currentScrollY
      return
    }
    
    // Ignore tiny scroll movements (dead zone)
    if (scrollDifference < this.deadZoneValue) {
      return 
    }
    
    if (currentScrollY > this.lastScrollY) {
      // Scrolling DOWN
      this.hide()
    } else {
      // Scrolling UP
      this.show()
    }
    
    this.lastScrollY = currentScrollY
  }

  hide() {
    this.element.classList.add("navbar-hidden")
  }

  show() {
    this.element.classList.remove("navbar-hidden")
  }
}
