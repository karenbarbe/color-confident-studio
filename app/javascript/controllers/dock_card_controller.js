import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["card"]
  static values = {
    threshold: { type: Number, default: 80 }
  }
  static classes = ["docked"]

  connect() {
    this.isTransitioning = false
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.initialize()
      })
    })
  }

  initialize() {
    this.scrollContainer = this.findScrollContainer()
    
    if (this.scrollContainer) {
      this.handleScroll = this.handleScroll.bind(this)
      this.scrollContainer.addEventListener("scroll", this.handleScroll, { passive: true })
      
      // Listen for transition end on the card
      if (this.hasCardTarget) {
        this.cardTarget.addEventListener("transitionend", this.onTransitionEnd.bind(this))
      }
      
      this.checkInitialState()
    }
  }

  checkInitialState() {
    const scrollTop = this.scrollContainer === window 
      ? window.scrollY 
      : this.scrollContainer.scrollTop
    
    if (scrollTop > this.thresholdValue && this.hasCardTarget) {
      // Set docked state immediately without animation
      this.cardTarget.style.transition = 'none'
      this.cardTarget.querySelectorAll('.dock-card-header, .dock-card-nav, .dock-card-mini-header')
        .forEach(el => el.style.transition = 'none')
      
      this.cardTarget.classList.add(this.dockedClass)
      
      this.cardTarget.offsetHeight
      
      requestAnimationFrame(() => {
        this.cardTarget.style.transition = ''
        this.cardTarget.querySelectorAll('.dock-card-header, .dock-card-nav, .dock-card-mini-header')
          .forEach(el => el.style.transition = '')
      })
    }
  }

  disconnect() {
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener("scroll", this.handleScroll)
    }
    if (this.hasCardTarget) {
      this.cardTarget.removeEventListener("transitionend", this.onTransitionEnd.bind(this))
    }
  }

  findScrollContainer() {
    let el = this.element.parentElement
    
    while (el) {
      const style = window.getComputedStyle(el)
      const overflowY = style.overflowY
      
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return el
      }
      
      el = el.parentElement
    }
    
    return window
  }

handleScroll() {
  // Ignore scroll events during transitions to prevent layout thrashing
  if (this.isTransitioning) return
  
  const scrollTop = this.scrollContainer === window 
    ? window.scrollY 
    : this.scrollContainer.scrollTop
  
  const isDocked = this.hasCardTarget && this.cardTarget.classList.contains(this.dockedClass)
  
  const dockThreshold = this.thresholdValue
  const undockThreshold = 20  // Only undock when very close to top
  
  if (!isDocked && scrollTop > dockThreshold) {
    this.dock()
  } else if (isDocked && scrollTop < undockThreshold) {
    this.undock()
  }
}

  onTransitionEnd(event) {
    // Only react to transitions on the card itself, not children
    if (event.target === this.cardTarget) {
      this.isTransitioning = false
    }
  }

  dock() {
    if (!this.hasCardTarget || this.cardTarget.classList.contains(this.dockedClass)) return
    
    this.isTransitioning = true
    this.cardTarget.classList.add(this.dockedClass)
    this.dispatch("docked")
    
    // Fallback: clear transitioning flag after max transition duration
    setTimeout(() => {
      this.isTransitioning = false
    }, 500)
  }

  undock() {
    if (!this.hasCardTarget || !this.cardTarget.classList.contains(this.dockedClass)) return
    
    this.isTransitioning = true
    this.cardTarget.classList.remove(this.dockedClass)
    this.dispatch("undocked")
    
    setTimeout(() => {
      this.isTransitioning = false
    }, 500)
  }

  toggle() {
    if (this.hasCardTarget) {
      this.cardTarget.classList.toggle(this.dockedClass)
    }
  }
}
