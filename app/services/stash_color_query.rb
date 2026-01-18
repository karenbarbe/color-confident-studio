# frozen_string_literal: true

# Service object for querying fabric colors from a user's stash.
# Filters by color family, saturation, and lightness using the same
# slider conversion logic as ColorMatcher.
#
# Usage:
#   query = StashColorQuery.new(
#     user: current_user,
#     exclude_color_ids: palette.product_colors.pluck(:id),
#     color_family: "blue",
#     saturation: 50,
#     lightness: 70
#   )
#   colors = query.results
#   total = query.count
#
class StashColorQuery
  include ColorSliderConversion

  DEFAULT_LIMIT = 30
  STASH_SATURATION_TOLERANCE = 0.08
  STASH_LIGHTNESS_TOLERANCE = 0.15

  def initialize(user:, exclude_color_ids: [], color_family: nil, saturation: nil, lightness: nil, limit: DEFAULT_LIMIT)
    @user = user
    @exclude_color_ids = exclude_color_ids
    @color_family = color_family
    @saturation = saturation
    @lightness = lightness
    @limit = limit
  end

  def results
    @results ||= build_query
                   .order("product_colors.color_family, product_colors.oklch_l")
                   .limit(@limit)
                   .map(&:product_color)
  end

  def count
    @count ||= build_query.count
  end

  # Count of all fabric stash items for the user (for UI display)
  def total_stash_count
    @total_stash_count ||= base_scope.count
  end

  private

  def build_query
    scope = base_scope
    scope = scope.where.not(product_color_id: @exclude_color_ids) if @exclude_color_ids.any?
    scope = apply_color_family_filter(scope)
    scope = apply_saturation_filter(scope)
    scope = apply_lightness_filter(scope)
    scope
  end

  def base_scope
    @user.stash_items
         .joins(product_color: :brand)
         .where(brands: { category: "fabric" })
         .includes(product_color: :brand)
  end

  def apply_color_family_filter(scope)
    return scope if @color_family.blank?

    scope.where(product_colors: { color_family: @color_family })
  end

  def apply_saturation_filter(scope)
    return scope if @saturation.nil?

    center = slider_to_chroma(@saturation)
    min_c = [ center - STASH_SATURATION_TOLERANCE, SATURATION_RANGE[:min] ].max
    max_c = [ center + STASH_SATURATION_TOLERANCE, SATURATION_RANGE[:max] ].min

    scope.where(product_colors: { oklch_c: min_c..max_c })
  end

  def apply_lightness_filter(scope)
    return scope if @lightness.nil?

    center = slider_to_lightness(@lightness)
    min_l = [ center - STASH_LIGHTNESS_TOLERANCE, LIGHTNESS_RANGE[:min] ].max
    max_l = [ center + STASH_LIGHTNESS_TOLERANCE, LIGHTNESS_RANGE[:max] ].min

    scope.where(product_colors: { oklch_l: min_l..max_l })
  end
end
