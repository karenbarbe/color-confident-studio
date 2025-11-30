import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="scroll-spy"
export default class extends Controller {
  static targets = ["pill", "section", "pillContainer"]

  static values = {
    activeClasses: { type: String, default: "bg-gray-900 text-white" },
    inactiveClasses: { type: String, default: "bg-gray-100 text-gray-700" }
  }

  connect() {
    this.isScrolling = false // Flag to pause observer during programmatic scrolls

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
      this.setActivePill(this.pillTargets[0])
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

  setActivePill(activePill) {
    const activeClasses = this.activeClassesValue.split(" ")
    const inactiveClasses = this.inactiveClassesValue.split(" ")

    this.pillTargets.forEach((pill) => {
      if (pill === activePill) {
        pill.classList.remove(...inactiveClasses)
        pill.classList.add(...activeClasses)
      } else {
        pill.classList.remove(...activeClasses)
        pill.classList.add(...inactiveClasses)
      }
    })

    // Scroll pill into view (left-aligned) if container is overflowing
    this.scrollPillToLeft(activePill)
  }

  scrollPillToLeft(pill) {
    // Find the pill container
    const container = this.hasPillContainerTarget
      ? this.pillContainerTarget
      : pill.closest("ul")

    if (!container) return

    // Check if container is actually overflowing (scrollable)
    const isOverflowing = container.scrollWidth > container.clientWidth

    // If not overflowing (e.g., on desktop), don't scroll
    if (!isOverflowing) return

    // Get the pill's position relative to the container
    const pillLeft = pill.offsetLeft
    const margin = 16 // Left margin in pixels

    // Scroll the container so the pill is aligned to the left (with margin)
    container.scrollTo({
      left: pillLeft - margin,
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
