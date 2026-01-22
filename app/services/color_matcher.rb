# frozen_string_literal: true

class ColorMatcher
  include ColorSliderConversion

  BASE_TOLERANCE = 8
  MIN_RESULTS = 6
  MAX_TOLERANCE = 25
  TOLERANCE_STEP = 5

  attr_reader :effective_tolerance

  def initialize(
    brand:,
    exclude_color_ids: [],
    color_family: nil,
    lightness: nil,
    adaptive: true
  )
    @brand = brand
    @exclude_color_ids = exclude_color_ids
    @color_family = color_family
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

  private

  def filtering_active?
    @lightness.present?
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
    scope = apply_lightness_filter(scope, tolerance)
    scope.order(oklch_l: :asc)
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

  def apply_lightness_filter(scope, tolerance)
    return scope if @lightness.nil?

    scope.where(oklch_l: lightness_range(@lightness, tolerance))
  end
end
