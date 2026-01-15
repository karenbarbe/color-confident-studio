import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["button", "label", "chevron", "dropdown"]
  
  static values = {
    open: { type: Boolean, default: false }
  }

  connect() {
    // Close dropdown when clicking outside
    this.outsideClickHandler = this.handleOutsideClick.bind(this)
    document.addEventListener("click", this.outsideClickHandler)
    
    // Update label based on current filter state
    this.updateLabelFromFilter()
  }

  disconnect() {
    document.removeEventListener("click", this.outsideClickHandler)
  }

  toggle(event) {
    event.stopPropagation()
    this.openValue = !this.openValue
  }

  close() {
    this.openValue = false
  }

  openValueChanged() {
    if (!this.hasDropdownTarget) return
    
    if (this.openValue) {
      this.showDropdown()
    } else {
      this.hideDropdown()
    }
  }

  showDropdown() {
    if (this.hasDropdownTarget) {
      this.dropdownTarget.classList.remove("hidden")
      // Force a reflow to ensure the transition happens
      this.dropdownTarget.offsetHeight
      this.dropdownTarget.classList.remove("opacity-0")
    }
    if (this.hasChevronTarget) {
      this.chevronTarget.classList.add("rotate-180")
    }
  }

  hideDropdown() {
    if (this.hasDropdownTarget) {
      this.dropdownTarget.classList.add("opacity-0")
      // Wait for transition to complete before hiding
      setTimeout(() => {
        this.dropdownTarget.classList.add("hidden")
      }, 150)
    }
    if (this.hasChevronTarget) {
      this.chevronTarget.classList.remove("rotate-180")
    }
  }

  handleOutsideClick(event) {
    if (this.openValue && !this.element.contains(event.target)) {
      this.close()
    }
  }

  // Called when a filter option is selected
  selectFilter(event) {
    const button = event.currentTarget
    const category = button.dataset.category
    const ownership = button.dataset.ownership
    const label = button.dataset.label

    // Update label
    if (this.hasLabelTarget) {
      this.labelTarget.textContent = label
    }

    // Dispatch to the stash-filter controller
    const filterController = this.application.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller*="stash-filter"]'),
      "stash-filter"
    )

    if (filterController) {
      if (category) {
        filterController.categoryValue = category
      }
      if (ownership) {
        filterController.filterValue = ownership
      }
    }

    // Update visual indicators
    this.updateActiveIndicators()

    this.close()
  }

  // Update label based on current stash-filter state
  updateLabelFromFilter() {
    const filterController = this.application.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller*="stash-filter"]'),
      "stash-filter"
    )

    if (filterController && this.hasLabelTarget) {
      const category = filterController.categoryValue || "thread"
      const ownership = filterController.filterValue || "all"
      
      // Build label text
      const categoryText = category.charAt(0).toUpperCase() + category.slice(1)
      const ownershipText = ownership === "all" ? "All" : 
                           ownership === "owned" ? "Owned" : 
                           "Wish list"
      
      this.labelTarget.textContent = `${categoryText} - ${ownershipText}`
      
      // Update visual indicators
      this.updateActiveIndicators()
    }
  }

  // Update checkmarks/dots to show active filters
  updateActiveIndicators() {
    const filterController = this.application.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller*="stash-filter"]'),
      "stash-filter"
    )

    if (!filterController || !this.hasDropdownTarget) return

    const currentCategory = filterController.categoryValue || "thread"
    const currentOwnership = filterController.filterValue || "all"

    // Find all filter buttons in dropdown
    const filterButtons = this.dropdownTarget.querySelectorAll('[data-action*="selectFilter"]')
    
    filterButtons.forEach(button => {
      const buttonCategory = button.dataset.category
      const buttonOwnership = button.dataset.ownership
      const indicator = button.querySelector('[data-filter-indicator]')
      
      if (!indicator) return

      // Check if this button represents the active filter
      const isActive = buttonCategory === currentCategory && buttonOwnership === currentOwnership
      
      // Toggle visibility of the indicator
      if (isActive) {
        indicator.classList.remove('invisible')
      } else {
        indicator.classList.add('invisible')
      }
    })
  }
}
