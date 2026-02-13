import { Controller } from "@hotwired/stimulus"

/**
 * OnboardingCoachController
 * 
 * Shows sequential coach marks to guide new users through
 * the palette creation process. Automatically advances through steps
 * as users complete actions.
 * 
 * Persistence:
 *   - Stores dismissal in localStorage
 *   - Dev mode: http://localhost:3000/palettes/123/edit?reset_onboarding
 *   - Console: OnboardingCoach.reset() to clear manually
 * 
 * Usage:
 *   <div data-controller="onboarding-coach"
 *        data-onboarding-coach-active-value="true">
 *     <button data-onboarding-coach-target="backgroundTrigger">...</button>
 *     <button data-onboarding-coach-target="addColorTrigger">...</button>
 *   </div>
 * 
 */


const STORAGE_KEY = "color_confident_onboarding_dismissed"

// Expose reset function globally for dev convenience
window.OnboardingCoach = {
  reset() {
    localStorage.removeItem(STORAGE_KEY)
    console.log("Onboarding reset! Refresh the page to see coach marks again.")
  },
  dismiss() {
    localStorage.setItem(STORAGE_KEY, "true")
    console.log("Onboarding dismissed.")
  },
  status() {
    const dismissed = localStorage.getItem(STORAGE_KEY) === "true"
    console.log(dismissed ? "Onboarding is dismissed." : "Onboarding is active.")
    return !dismissed
  }
}

export default class extends Controller {
  static targets = [ "backgroundTrigger", "addColorTrigger" ]

  static values = {
    active: { type: Boolean, default: false },
    currentStep: { type: Number, default: 1 },
    hasBackground: { type: Boolean, default: false }
  }

  connect() {
    // Check for dev reset via URL param
    this.checkDevReset()

    // Skip if already dismissed
    if (this.isDismissed()) {
      this.activeValue = false
      return
    }

    if (!this.activeValue) return

    this.coachMarkWrapper = null
    this.showCurrentStep()

    // Listen for background changes from palette editor
    this.handleBackgroundChange = this.handleBackgroundChange.bind(this)
    window.addEventListener("palette-editor:backgroundChanged", this.handleBackgroundChange)
  }

  disconnect() {
    this.removeCoachMark()
    window.removeEventListener("palette-editor:backgroundChanged", this.handleBackgroundChange)
  }

  // ===========================================================================
  // Persistence
  // ===========================================================================

  isDismissed() {
    return localStorage.getItem(STORAGE_KEY) === "true"
  }

  saveDismissed() {
    localStorage.setItem(STORAGE_KEY, "true")
  }

  checkDevReset() {
    const params = new URLSearchParams(window.location.search)
    if (params.has("reset_onboarding")) {
      localStorage.removeItem(STORAGE_KEY)
      // Clean up URL without reload
      params.delete("reset_onboarding")
      const newUrl = params.toString() 
        ? `${window.location.pathname}?${params}` 
        : window.location.pathname
      window.history.replaceState({}, "", newUrl)
      console.log("Onboarding reset via URL param!")
    }
  }

  // ===========================================================================
  // Step Management
  // ===========================================================================

  showCurrentStep() {
    if (!this.activeValue) return

    this.removeCoachMark()

    if (this.currentStepValue === 1 && !this.hasBackgroundValue) {
      this.showCoachMark(this.backgroundTriggerTarget, {
        title: "Start here!",
        message: "Pick a background fabric to see how your thread colors will look on it.",
        position: "top"
      })
    } else if (this.currentStepValue === 2 || (this.hasBackgroundValue && this.currentStepValue === 1)) {
      this.currentStepValue = 2
      if (this.hasAddColorTriggerTarget) {
        this.showCoachMark(this.addColorTriggerTarget, {
          title: "Now add colors!",
          message: "Tap here to browse and add thread colors to your palette.",
          position: "bottom"
        })
      }
    }
  }

  handleBackgroundChange(event) {
    const { hex } = event.detail
    const hadBackground = this.hasBackgroundValue
    this.hasBackgroundValue = !!hex

    // Advance to step 2 when background is first set
    if (!hadBackground && this.hasBackgroundValue && this.currentStepValue === 1) {
      this.currentStepValue = 2
      // Small delay to let the UI settle after panel closes
      setTimeout(() => this.showCurrentStep(), 400)
    }
  }

  advanceStep() {
    this.currentStepValue += 1
    if (this.currentStepValue > 2) {
      this.complete()
    } else {
      this.showCurrentStep()
    }
  }

  complete() {
    this.activeValue = false
    this.saveDismissed()
    this.removeCoachMark()
  }

  dismiss() {
    this.complete()
  }

  // ===========================================================================
  // Coach Mark Rendering
  // ===========================================================================

  showCoachMark(targetElement, { title, message, position }) {
    this.removeCoachMark()

    // Ensure target's parent is positioned for absolute positioning to work
    const targetParent = targetElement.parentElement
    const parentPosition = getComputedStyle(targetParent).position
    if (parentPosition === "static") {
      targetParent.style.position = "relative"
    }

    // Create wrapper that positions relative to parent
    const wrapper = document.createElement("div")
    wrapper.className = "coach-mark-wrapper"
    wrapper.dataset.position = position

    // Create the coach mark inside the wrapper
    const mark = document.createElement("div")
    mark.className = "coach-mark"
    mark.innerHTML = `
      <div class="coach-mark-bubble">
        <button type="button" class="coach-mark-close" aria-label="Dismiss tip">
          <svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
        <div class="coach-mark-title">${title}</div>
        <div class="coach-mark-message">${message}</div>
      </div>
      <div class="coach-mark-arrow"></div>
    `

    wrapper.appendChild(mark)

    // Insert wrapper as sibling to target, inside the same parent
    targetParent.appendChild(wrapper)
    this.coachMarkWrapper = wrapper

    // Bind close button
    const closeBtn = mark.querySelector(".coach-mark-close")
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      this.dismiss()
    })

    // Dismiss when target is clicked
    this.currentTargetClickHandler = () => {
      targetElement.removeEventListener("click", this.currentTargetClickHandler)
      this.removeCoachMark()
    }
    targetElement.addEventListener("click", this.currentTargetClickHandler)
    this.currentTarget = targetElement

    // Trigger entrance animation
    requestAnimationFrame(() => {
      mark.classList.add("coach-mark-visible")
    })
  }

  removeCoachMark() {
    // Clean up click handler
    if (this.currentTarget && this.currentTargetClickHandler) {
      this.currentTarget.removeEventListener("click", this.currentTargetClickHandler)
      this.currentTarget = null
      this.currentTargetClickHandler = null
    }

    if (this.coachMarkWrapper) {
      const mark = this.coachMarkWrapper.querySelector(".coach-mark")
      if (mark) {
        mark.classList.remove("coach-mark-visible")
        mark.classList.add("coach-mark-hiding")
      }
      
      const wrapper = this.coachMarkWrapper
      this.coachMarkWrapper = null

      wrapper.addEventListener("animationend", () => {
        wrapper.remove()
      }, { once: true })
      
      // Fallback removal
      setTimeout(() => {
        wrapper.remove()
      }, 300)
    }
  }
}
