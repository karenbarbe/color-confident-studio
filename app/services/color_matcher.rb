# frozen_string_literal: true

# Service object for finding matching product colors within a brand's catalog.
# Supports filtering by color family, saturation (chroma), and lightness.
#
# Features adaptive tolerance: automatically expands search range when
# few results are found, ensuring users always see relevant colors.
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
#   distribution = matcher.distribution_data
#
class ColorMatcher
  include ColorSliderConversion

  BASE_TOLERANCE = 15        # Starting tolerance percentage
  MIN_RESULTS = 5            # Minimum results before expanding tolerance
  MAX_TOLERANCE = 50         # Maximum tolerance percentage (won't expand beyond)
  TOLERANCE_STEP = 10        # How much to expand each iteration

  attr_reader :effective_tolerance

  def initialize(
    brand:,
    exclude_color_ids: [],
    color_family: nil,
    saturation: nil,
    lightness: nil,
    adaptive: true
  )
    @brand = brand
    @exclude_color_ids = exclude_color_ids
    @color_family = color_family
    @saturation = saturation
    @lightness = lightness
    @adaptive = adaptive
    @effective_tolerance = BASE_TOLERANCE
  end

  def matching_colors
    @matching_colors ||= if @adaptive && filtering_active?
                           adaptive_matching_colors
    else
      basic_matching_colors(BASE_TOLERANCE)
    end
  end

  def count
    @count ||= matching_colors.count
  end

  # Returns distribution data for rendering slider hints
  # Each bucket represents a 10% segment of the slider (0-10, 10-20, etc.)
  def distribution_data
    @distribution_data ||= {
      saturation: saturation_distribution,
      lightness: lightness_distribution
    }
  end

  private

  def filtering_active?
    @saturation.present? || @lightness.present?
  end

  def adaptive_matching_colors
    tolerance = BASE_TOLERANCE

    loop do
      results = basic_matching_colors(tolerance)
      result_count = results.count

      if result_count >= MIN_RESULTS || tolerance >= MAX_TOLERANCE
        @effective_tolerance = tolerance
        return results
      end

      tolerance += TOLERANCE_STEP
    end
  end

  def basic_matching_colors(tolerance)
    scope = base_scope
    scope = apply_color_family_filter(scope)
    scope = apply_saturation_filter(scope, tolerance)
    scope = apply_lightness_filter(scope, tolerance)
    scope.order(:color_family, :oklch_h, :oklch_l)
  end

  def base_scope
    scope = @brand.product_colors
    scope = scope.where.not(id: @exclude_color_ids) if @exclude_color_ids.any?
    scope
  end

  def apply_color_family_filter(scope)
    return scope if @color_family.blank?

    scope.where(color_family: @color_family)
  end

  def apply_saturation_filter(scope, tolerance)
    return scope if @saturation.nil?

    scope.where(oklch_c: chroma_range(@saturation, tolerance))
  end

  def apply_lightness_filter(scope, tolerance)
    return scope if @lightness.nil?

    scope.where(oklch_l: lightness_range(@lightness, tolerance))
  end

  # Distribution methods for slider hints

  def saturation_distribution
    buckets = Array.new(10, 0)

    colors_scope = @brand.product_colors
    colors_scope = colors_scope.where(color_family: @color_family) if @color_family.present?

    colors_scope.pluck(:oklch_c).each do |chroma|
      next if chroma.nil?

      slider_val = chroma_to_slider(chroma)
      bucket_index = [ (slider_val / 10).floor, 9 ].min
      bucket_index = [ bucket_index, 0 ].max
      buckets[bucket_index] += 1
    end

    normalize_distribution(buckets)
  end

  def lightness_distribution
    buckets = Array.new(10, 0)

    colors_scope = @brand.product_colors
    colors_scope = colors_scope.where(color_family: @color_family) if @color_family.present?

    colors_scope.pluck(:oklch_l).each do |lightness|
      next if lightness.nil?

      slider_val = lightness_to_slider(lightness)
      bucket_index = [ (slider_val / 10).floor, 9 ].min
      bucket_index = [ bucket_index, 0 ].max
      buckets[bucket_index] += 1
    end

    normalize_distribution(buckets)
  end

  # Normalize to 0-1 scale for rendering
  def normalize_distribution(buckets)
    max_val = buckets.max.to_f
    return buckets.map { 0 } if max_val.zero?

    buckets.map { |v| (v / max_val).round(2) }
  end
end
