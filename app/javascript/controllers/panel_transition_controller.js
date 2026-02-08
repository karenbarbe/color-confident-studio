import { Controller } from "@hotwired/stimulus"

/**
 * PanelTransitionController
 *
 * True crossfade for turbo-frame content replacement.
 *
 * Before Turbo replaces content, we clone the old content as an
 * absolutely-positioned ghost layer. Turbo swaps in new content
 * underneath (hidden by CSS). The ghost begins fading out immediately
 * while the new content fades in once laid out — both layers overlap
 * so there is never an empty frame.
 *
 * Requires this CSS rule:
 *   turbo-frame[data-transitioning] > * { opacity: 0 !important; }
 */
export default class extends Controller {
  static values = {
    duration: { type: Number, default: 200 }
  }

  connect() {
    this.handleBeforeRender = this.handleBeforeRender.bind(this)
    this.element.addEventListener("turbo:before-frame-render", this.handleBeforeRender)
    this.isTransitioning = false
  }

  disconnect() {
    this.element.removeEventListener("turbo:before-frame-render", this.handleBeforeRender)
    this.isTransitioning = false
  }

  handleBeforeRender(event) {
    const duration = this.durationValue

    // First load — no transition needed
    if (!this.element.firstElementChild) return

    // Rapid clicking — let Turbo render normally
    if (this.isTransitioning) return

    event.preventDefault()
    this.isTransitioning = true

    const frame = this.element
    const oldContent = frame.firstElementChild
    const oldHeight = frame.scrollHeight

    // ── Step 1: Clone old content as a visual ghost layer ──
    const ghost = oldContent.cloneNode(true)
    ghost.setAttribute("aria-hidden", "true")
    ghost.style.position = "absolute"
    ghost.style.top = "0"
    ghost.style.left = "0"
    ghost.style.right = "0"
    ghost.style.zIndex = "1"
    ghost.style.opacity = "1"
    ghost.style.pointerEvents = "none"

    // Frame needs relative positioning to contain the ghost
    frame.style.position = "relative"
    frame.style.height = `${oldHeight}px`
    frame.style.overflow = "hidden"

    // ── Step 2: Mark transitioning (CSS hides new content at opacity: 0) ──
    frame.setAttribute("data-transitioning", "")

    // ── Step 3: Let Turbo swap — new content arrives invisible under the ghost ──
    event.detail.resume()

    // Insert ghost on top of the new (hidden) content
    frame.appendChild(ghost)

    // ── Step 4: Start ghost fade immediately — don't wait for rAF ──
    // The ghost is a detached clone, it needs no layout work.
    // Fading it slightly longer than the new content fade-in ensures
    // it lingers to cover the rAF gap.
    ghost.offsetHeight // reflow
    ghost.style.transition = `opacity ${duration * 1.5}ms ease-in-out`
    ghost.style.opacity = "0"

    // ── Step 5: Fade in new content once layout is ready ──
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const newContent = frame.firstElementChild
        if (!newContent || newContent === ghost) {
          ghost.remove()
          this.cleanup()
          return
        }

        // Measure new content height
        frame.style.height = "auto"
        const newHeight = frame.scrollHeight
        frame.style.height = `${oldHeight}px`
        frame.offsetHeight // reflow

        // Animate height
        frame.style.transition = `height ${duration}ms ease-out`
        frame.style.height = `${newHeight}px`

        // Lift CSS guard, set inline opacity for transition control
        frame.removeAttribute("data-transitioning")
        newContent.style.opacity = "0"
        newContent.offsetHeight // reflow

        // Fade in new content
        newContent.style.transition = `opacity ${duration}ms ease-out`
        newContent.style.opacity = "1"

        // Clean up after the longer ghost transition completes
        const cleanupDelay = Math.max(duration, duration * 1.5) + 10
        setTimeout(() => {
          ghost.remove()
          this.cleanup()
          newContent.style.transition = ""
          newContent.style.opacity = ""
          this.isTransitioning = false
        }, cleanupDelay)
      })
    })
  }

  cleanup() {
    const frame = this.element
    frame.style.position = ""
    frame.style.height = ""
    frame.style.overflow = ""
    frame.style.transition = ""
    frame.removeAttribute("data-transitioning")
  }
}
