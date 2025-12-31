import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["filterButton", "item", "emptyState", "count"]
  
  static values = {
    filter: { type: String, default: "all" } // "all" | "owned" | "wish_list"
  }

  static classes = ["active", "inactive"]

  connect() {
    this.updateCounts()
    this.updateFilterButtons()
    this.applyFilter()
  }

  // Called when a filter button is clicked
  filter(event) {
    const newFilter = event.currentTarget.dataset.filter
    this.filterValue = newFilter
  }

  // Stimulus callback when filterValue changes
  filterValueChanged() {
    this.updateFilterButtons()
    this.applyFilter()
  }

  updateFilterButtons() {
    this.filterButtonTargets.forEach(button => {
      const isActive = button.dataset.filter === this.filterValue
      
      const activeClasses = this.activeClass?.split(" ") || []
      const inactiveClasses = this.inactiveClass?.split(" ") || []
      
      if (isActive) {
        button.classList.remove(...inactiveClasses)
        button.classList.add(...activeClasses)
      } else {
        button.classList.remove(...activeClasses)
        button.classList.add(...inactiveClasses)
      }
    })
  }

  applyFilter() {
    let visibleCount = 0

    this.itemTargets.forEach(item => {
      const status = item.dataset.ownershipStatus
      const shouldShow = this.filterValue === "all" || status === this.filterValue
      
      item.classList.toggle("hidden", !shouldShow)
      if (shouldShow) visibleCount++
    })

    // Show/hide empty state
    if (this.hasEmptyStateTarget) {
      this.emptyStateTarget.classList.toggle("hidden", visibleCount > 0)
    }
  }

  updateCounts() {
    const counts = { all: 0, owned: 0, wish_list: 0 }
    
    this.itemTargets.forEach(item => {
      const status = item.dataset.ownershipStatus
      counts.all++
      if (status === "owned") counts.owned++
      if (status === "wish_list") counts.wish_list++
    })

    // Update count displays in filter buttons
    this.countTargets.forEach(countEl => {
      const filter = countEl.dataset.countFor
      if (filter && counts[filter] !== undefined) {
        countEl.textContent = `(${counts[filter]})`
      }
    })
  }
}
