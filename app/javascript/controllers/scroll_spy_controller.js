import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["pill", "section", "pillContainer"]

  connect() {
    this.isScrolling = false // Flag to pause observer during programmatic scrolls
    this.activePill = null   // Track current active pill

    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersect(entries),
      {
        root: null,
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0
      }
    )

    this.sectionTargets.forEach((section) => {
      this.observer.observe(section)
    })

    // Set initial active state for first pill
    if (this.pillTargets.length > 0) {
      this.setActivePill(this.pillTargets[0], { scroll: false })
      
      // Scroll to the active pill after layout has settled
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.scrollPillToLeft(this.pillTargets[0])
        })
      })
    }
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect()
    }
  }

  handleIntersect(entries) {
    // Ignore intersection events while we're programmatically scrolling
    if (this.isScrolling) return

    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const sectionId = entry.target.id
        const correspondingPill = this.pillTargets.find(
          (pill) => pill.getAttribute("href") === `#${sectionId}`
        )

        if (correspondingPill) {
          this.setActivePill(correspondingPill)
        }
      }
    })
  }

  setActivePill(activePill, options = {}) {
    const { scroll = true } = options
    
    // Skip if already active
    if (this.activePill === activePill) return

    // Update data-active attribute for all pills (CSS handles styling)
    this.pillTargets.forEach((pill) => {
      if (pill === activePill) {
        pill.dataset.active = "true"
      } else {
        delete pill.dataset.active
      }
    })

    this.activePill = activePill

    // Scroll pill into view (left-aligned) if container is overflowing
    if (scroll) {
      this.scrollPillToLeft(activePill)
    }

    // Dispatch event for other controllers (e.g., fabric-contrast) to react
    this.dispatchActiveChanged(activePill)
  }

  dispatchActiveChanged(activePill) {
    window.dispatchEvent(new CustomEvent("scroll-spy:activeChanged", {
      detail: { 
        activePill,
        sectionId: activePill?.getAttribute("href")?.replace("#", "")
      }
    }))
  }

  scrollPillToLeft(pill) {
    const container = this.hasPillContainerTarget
      ? this.pillContainerTarget
      : pill.closest("ul")

    if (!container) return

    // Check if container is actually overflowing (scrollable)
    const isOverflowing = container.scrollWidth > container.clientWidth
    if (!isOverflowing) return

    const pillRect = pill.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    
    // Calculate where the pill is relative to the container's visible area
    const pillLeftRelativeToContainer = pillRect.left - containerRect.left
    
    // Calculate the target scroll position (pill at left edge with margin)
    const margin = 16
    const targetScroll = container.scrollLeft + pillLeftRelativeToContainer - margin
    const finalScroll = Math.max(0, targetScroll)

    container.scrollTo({
      left: finalScroll,
      behavior: "smooth"
    })
  }

  // Handle pill click - smooth scroll to section
  scrollToSection(event) {
    event.preventDefault()

    const clickedPill = event.currentTarget
    const href = clickedPill.getAttribute("href")
    const targetSection = document.querySelector(href)

    if (targetSection) {
      // Immediately set this pill as active
      this.setActivePill(clickedPill)

      // Pause the observer while scrolling
      this.isScrolling = true

      targetSection.scrollIntoView({ behavior: "smooth" })

      // Re-enable observer after scroll completes
      setTimeout(() => {
        this.isScrolling = false
      }, 1000)
    }
  }
}
