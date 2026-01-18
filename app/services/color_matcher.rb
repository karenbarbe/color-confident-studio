# frozen_string_literal: true

# Service object for finding matching product colors within a brand's catalog.
# Supports filtering by color family, saturation (chroma), and lightness.
#
# Usage:
#   matcher = ColorMatcher.new(
#     brand: brand,
#     exclude_color_ids: [1, 2, 3],
#     color_family: "blue",
#     saturation: 50,
#     lightness: 70
#   )
#   colors = matcher.matching_colors.limit(30)
#   total = matcher.count
#
class ColorMatcher
  include ColorSliderConversion

  DEFAULT_TOLERANCE = 20 # +/- percentage points for range

  def initialize(
    brand:,
    exclude_color_ids: [],
    color_family: nil,
    saturation: nil,
    lightness: nil,
    tolerance: DEFAULT_TOLERANCE
  )
    @brand = brand
    @exclude_color_ids = exclude_color_ids
    @color_family = color_family
    @saturation = saturation
    @lightness = lightness
    @tolerance = tolerance
  end

  def matching_colors
    scope = @brand.product_colors
    scope = scope.where.not(id: @exclude_color_ids) if @exclude_color_ids.any?
    scope = apply_color_family_filter(scope)
    scope = apply_saturation_filter(scope)
    scope = apply_lightness_filter(scope)
    scope.order(:color_family, :oklch_h, :oklch_l)
  end

  def count
    matching_colors.count
  end

  private

  def apply_color_family_filter(scope)
    return scope if @color_family.blank?

    scope.where(color_family: @color_family)
  end

  def apply_saturation_filter(scope)
    return scope if @saturation.nil?

    scope.where(oklch_c: chroma_range(@saturation, @tolerance))
  end

  def apply_lightness_filter(scope)
    return scope if @lightness.nil?

    scope.where(oklch_l: lightness_range(@lightness, @tolerance))
  end
end
