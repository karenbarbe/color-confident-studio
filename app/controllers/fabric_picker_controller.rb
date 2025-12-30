class FabricPickerController < ApplicationController
  allow_unauthenticated_access

  layout false # All actions render partials only

  # GET /fabric_picker
  def root
    @recent_colors = recent_colors_from_ids(recent_color_ids)
    @show_reset = params[:show_reset] == "true"
  end

  # GET /fabric_picker/presets
  def presets
  end

  # GET /fabric_picker/brands
  def brands
    @brands = Brand.fabric.order(:name)
  end

  # GET /fabric_picker/brands/:brand_id/families
  def families
    @brand = Brand.fabric.find(params[:brand_id])
    @families = color_families_for(@brand.product_colors)
  end

  # GET /fabric_picker/brands/:brand_id/families/:family/colors
  def colors
    @brand = Brand.fabric.find(params[:brand_id])
    @family = params[:family]
    @colors = @brand.product_colors
                    .where(color_family: @family)
                    .order(:oklch_l)
  end

  # GET /fabric_picker/stash/families
  def stash_families
    unless authenticated?
      render "fabric_picker/stash_unauthenticated"
      return
    end

    stash_colors = current_user_fabric_stash_colors
    @families = color_families_for(stash_colors)
    @empty = stash_colors.empty?
  end

  # GET /fabric_picker/stash/families/:family/colors
  def stash_colors
    unless authenticated?
      render "fabric_picker/stash_unauthenticated"
      return
    end

    @family = params[:family]
    stash_colors = current_user_fabric_stash_colors.where(color_family: @family)

    @colors_by_brand = stash_colors
      .includes(:brand)
      .order("brands.name ASC, product_colors.oklch_l ASC")
      .group_by(&:brand)
  end

  private

  def color_families_for(colors_scope)
    family_counts = colors_scope
      .where.not(color_family: nil)
      .group(:color_family)
      .count

    ProductColor::COLOR_FAMILIES.filter_map do |family|
      count = family_counts[family]
      { name: family, count: count } if count&.positive?
    end
  end

  def current_user_fabric_stash_colors
    ProductColor
      .joins(:brand, :stash_items)
      .where(brands: { category: "fabric" })
      .where(stash_items: { owner_id: Current.user.id })
  end

  # Parse recent color IDs from cookie/params
  def recent_color_ids
    params[:recent_ids].to_s.split(",").map(&:to_i).first(3)
  end

  # Load actual color records for recent IDs
  def recent_colors_from_ids(ids)
    return [] if ids.empty?

    colors = ProductColor.where(id: ids).index_by(&:id)
    ids.filter_map { |id| colors[id] }
  end
end
