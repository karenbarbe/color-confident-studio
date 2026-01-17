# frozen_string_literal: true

class ThreadMatcher
  # Default ranges for sliders (0-100 scale from UI mapped to OKLCH values)
  SATURATION_RANGE = { min: 0.0, max: 0.4 }.freeze   # oklch_c (chroma)
  LIGHTNESS_RANGE = { min: 0.2, max: 0.95 }.freeze   # oklch_l

  def initialize(
    brand:,
    exclude_color_ids: [],
    color_family: nil,
    saturation: nil,      # 0-100 from slider
    lightness: nil,       # 0-100 from slider
    tolerance: 20         # +/- percentage points for range
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

    # Convert 0-100 slider value to oklch_c range
    center = slider_to_chroma(@saturation)
    tolerance = (SATURATION_RANGE[:max] - SATURATION_RANGE[:min]) * (@tolerance / 100.0)

    min_c = [ center - tolerance, SATURATION_RANGE[:min] ].max
    max_c = [ center + tolerance, SATURATION_RANGE[:max] ].min

    scope.where(oklch_c: min_c..max_c)
  end

  def apply_lightness_filter(scope)
    return scope if @lightness.nil?

    # Convert 0-100 slider value to oklch_l range
    center = slider_to_lightness(@lightness)
    tolerance = (LIGHTNESS_RANGE[:max] - LIGHTNESS_RANGE[:min]) * (@tolerance / 100.0)

    min_l = [ center - tolerance, LIGHTNESS_RANGE[:min] ].max
    max_l = [ center + tolerance, LIGHTNESS_RANGE[:max] ].min

    scope.where(oklch_l: min_l..max_l)
  end

  # Convert 0-100 slider to oklch_c (0.0-0.4 typical range)
  def slider_to_chroma(value)
    SATURATION_RANGE[:min] + (value / 100.0) * (SATURATION_RANGE[:max] - SATURATION_RANGE[:min])
  end

  # Convert 0-100 slider to oklch_l (0.2-0.95 typical range)
  def slider_to_lightness(value)
    LIGHTNESS_RANGE[:min] + (value / 100.0) * (LIGHTNESS_RANGE[:max] - LIGHTNESS_RANGE[:min])
  end
end
