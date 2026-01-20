# frozen_string_literal: true

# Shared module for converting UI slider values (0-100) to OKLCH lightness values.
#
module ColorSliderConversion
  extend ActiveSupport::Concern

  LIGHTNESS_RANGE = { min: 0.2, max: 0.95 }.freeze

  # Tighter base tolerance for more precise filtering
  BASE_TOLERANCE_PERCENT = 8

  def slider_to_lightness(value)
    LIGHTNESS_RANGE[:min] + (value / 100.0) * (LIGHTNESS_RANGE[:max] - LIGHTNESS_RANGE[:min])
  end

  def lightness_to_slider(lightness)
    return 0 if lightness <= LIGHTNESS_RANGE[:min]
    return 100 if lightness >= LIGHTNESS_RANGE[:max]

    ((lightness - LIGHTNESS_RANGE[:min]) / (LIGHTNESS_RANGE[:max] - LIGHTNESS_RANGE[:min]) * 100).round
  end

  def lightness_range(slider_value, tolerance_percent = BASE_TOLERANCE_PERCENT)
    center = slider_to_lightness(slider_value)
    range_span = LIGHTNESS_RANGE[:max] - LIGHTNESS_RANGE[:min]
    tolerance = range_span * (tolerance_percent / 100.0)

    min_l = [ center - tolerance, LIGHTNESS_RANGE[:min] ].max
    max_l = [ center + tolerance, LIGHTNESS_RANGE[:max] ].min

    min_l..max_l
  end
end
