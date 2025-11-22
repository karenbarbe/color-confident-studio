class ColorLibrariesController < ApplicationController
  layout "dock"
  def index
    @categories = Brand.categories.keys
    @brands_by_category = Brand.all.group_by(&:category)
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
    @all_categories = Brand.categories.keys
    @brands_in_category = Brand.where(category: @category).order(:name)
  end
end
