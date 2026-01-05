import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["filterButton", "categoryButton", "item", "emptyState", "count"]
  
  static values = {
    filter: { type: String, default: "all" }, // "all" | "owned" | "wish_list"
    category: { type: String, default: "thread" } // category: "thread" | "fabric"
  }

  static classes = ["active", "inactive"]

  connect() {
    this.updateCounts()
    this.updateFilterButtons()
    this.updateCategoryButtons() 
    this.applyFilter()
  }

  // Called when a filter button is clicked
  filter(event) {
    const newFilter = event.currentTarget.dataset.filter
    this.filterValue = newFilter
  }

  // Called when a category button is clicked
  filterByCategory(event) {
    const newCategory = event.currentTarget.dataset.category
    this.categoryValue = newCategory
  }

  // Stimulus callback when filterValue changes
  filterValueChanged() {
    this.updateFilterButtons()
    this.applyFilter()
  }

  // Stimulus callback when categoryValue changes
  categoryValueChanged() {
    this.updateCategoryButtons()
    this.updateCounts() 
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

  updateCategoryButtons() {
    this.categoryButtonTargets.forEach(button => {
      const isActive = button.dataset.category === this.categoryValue
      
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
      const category = item.dataset.category
      
      // Item must match BOTH filters
      const matchesOwnership = this.filterValue === "all" || status === this.filterValue
      const matchesCategory = this.categoryValue === "all" || category === this.categoryValue
      
      const shouldShow = matchesOwnership && matchesCategory
      
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
    
    // Only count items in the grid view to avoid double-counting
    const gridItems = this.itemTargets.filter(item => 
      item.closest('[data-stash-view-toggle-target="gridView"]')
    )
    
    gridItems.forEach(item => {
      const status = item.dataset.ownershipStatus
      const category = item.dataset.category
      
      const matchesCategory = this.categoryValue === "all" || category === this.categoryValue
      
      if (matchesCategory) {
        counts.all++
        if (status === "owned") counts.owned++
        if (status === "wish_list") counts.wish_list++
      }
    })

    this.countTargets.forEach(countEl => {
      const filter = countEl.dataset.countFor
      if (filter && counts[filter] !== undefined) {
        countEl.textContent = `(${counts[filter]})`
      }
    })
  }
}
