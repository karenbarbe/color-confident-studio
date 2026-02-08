# frozen_string_literal: true

# Shared module for converting lightness filter values to OKLCH lightness ranges.
#
module ColorSliderConversion
  extend ActiveSupport::Concern

  LIGHTNESS_RANGE = { min: 0.2, max: 0.95 }.freeze

  # Discrete lightness categories (OKLCH L values)
  # These ranges are designed to divide the visible spectrum into intuitive thirds
  LIGHTNESS_CATEGORIES = {
    "dark"   => 0.0..0.45,
    "medium" => 0.45..0.70,
    "light"  => 0.70..1.0
  }.freeze

  # Returns the OKLCH lightness range for a category
  # Returns nil for "all" (no filtering)
  def lightness_range_for_category(category)
    return nil if category.blank? || category == "all"

    LIGHTNESS_CATEGORIES[category.to_s.downcase]
  end

  # Legacy method - keep for backwards compatibility during migration
  def slider_to_lightness(value)
    LIGHTNESS_RANGE[:min] + (value / 100.0) * (LIGHTNESS_RANGE[:max] - LIGHTNESS_RANGE[:min])
  end

  # Legacy method - can be removed after migration
  def lightness_to_slider(lightness)
    return 0 if lightness <= LIGHTNESS_RANGE[:min]
    return 100 if lightness >= LIGHTNESS_RANGE[:max]

    ((lightness - LIGHTNESS_RANGE[:min]) / (LIGHTNESS_RANGE[:max] - LIGHTNESS_RANGE[:min]) * 100).round
  end

  # Legacy method - can be removed after migration
  def lightness_range(slider_value, tolerance_percent = 8)
    center = slider_to_lightness(slider_value)
    range_span = LIGHTNESS_RANGE[:max] - LIGHTNESS_RANGE[:min]
    tolerance = range_span * (tolerance_percent / 100.0)

    min_l = [ center - tolerance, LIGHTNESS_RANGE[:min] ].max
    max_l = [ center + tolerance, LIGHTNESS_RANGE[:max] ].min

    min_l..max_l
  end
end
