class ColorChartsController < ApplicationController
  allow_unauthenticated_access(only: [ :index, :category, :show ])
  def index
    @categories = Brand.categories.keys
    @brands_by_category = Brand.all.group_by(&:category)

    # Meta tags
    set_meta_tags(
      title: "Embroidery threads and fabrics color charts",
      description: "Explore the full range of colors available. Thousands of colors to choose from!",
      og: {
        title: "Embroidery threads and fabrics color charts",
        description: "Explore the full range of colors available. Thousands of colors to choose from!"
        }
    )
  end

  def category
    @category = params[:category]
    @brands = Brand.where(category: @category).order(:name)
    @all_categories = Brand.categories.keys
  end

  def show
    @category = params[:category]
    @brand = Brand.find_by!(slug: params[:brand_slug], category: @category)
    @q = @brand.product_colors.ransack(params[:q])
    @product_colors = @q.result.order(:id).to_a
    @search_active = params.dig(:q, :vendor_code_cont).present?

    if Current.user.present?
      @stash_items_by_color_id = Current.user.stash_items
                                  .joins(product_color: :brand)
                                  .where(brands: { id: @brand.id })
                                  .index_by(&:product_color_id)

      @stashed_color_ids = @stash_items_by_color_id.keys.to_set
      @stash_by_brand_count = @stashed_color_ids.count
    end

    # Only group when NOT searching
    unless @search_active
      colors_grouped = @product_colors.group_by(&:color_family)
      @colors_by_family = ProductColor::COLOR_FAMILIES.filter_map do |family|
        colors = colors_grouped[family]
        [ family, colors ] if colors.present?
      end
    end

    # Meta tags
    set_meta_tags(
      title: "#{@brand.name} color chart",
      description: "Explore the full range of colors available from #{@brand.name}. #{@brand.product_colors_count} colors to choose from.",
      og: {
        title: "#{@brand.name} color chart",
        description: "Explore the full range of colors available from #{@brand.name}. #{@brand.product_colors_count} colors to choose from."
        }
    )
  end

  def skip_authorization?
    true
  end
end
