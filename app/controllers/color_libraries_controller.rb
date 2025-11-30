class ColorLibrariesController < ApplicationController
  layout "dock"
  def index
    @categories = Brand.categories.keys
    @brands_by_category = Brand.all.group_by(&:category)
    @featured = Brand.main.first
    @featured_colors = @featured.product_colors.order(:id).first(20)
    @stashed_color_ids = Current.user.stash_items.pluck(:product_color_id).to_set
  end

  def category
    @category = params[:category]
    @brands = Brand.where(category: @category).order(:name)
    @all_categories = Brand.categories.keys
  end

  def show
    @category = params[:category]
    @brand = Brand.find_by!(slug: params[:brand_slug], category: @category)
    @product_colors = @brand.product_colors.order(:id)
    @stashed_color_ids = Current.user.stash_items
                            .joins(:brand)
                            .where(brands: { id: @brand.id })
                            .pluck(:product_color_id)
                            .to_set

    @stash_by_brand_count = @stashed_color_ids.count

    @colors_by_family = ProductColor::COLOR_FAMILIES.filter_map do |family|
      colors = @product_colors.by_family(family).to_a
      [ family, colors ] if colors.any?
    end
  end
end
