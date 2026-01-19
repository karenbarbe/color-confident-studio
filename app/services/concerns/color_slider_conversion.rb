# frozen_string_literal: true

# Shared module for converting UI slider values (0-100) to OKLCH color space values.
# Used by ColorMatcher and StashColorQuery to ensure consistent color filtering.
#
module ColorSliderConversion
  extend ActiveSupport::Concern

  SATURATION_RANGE = { min: 0.0, max: 0.4 }.freeze   # oklch_c (chroma)
  LIGHTNESS_RANGE = { min: 0.2, max: 0.95 }.freeze   # oklch_l

  # Convert slider value (0-100) to OKLCH chroma value
  def slider_to_chroma(value)
    SATURATION_RANGE[:min] + (value / 100.0) * (SATURATION_RANGE[:max] - SATURATION_RANGE[:min])
  end

  # Convert slider value (0-100) to OKLCH lightness value
  def slider_to_lightness(value)
    LIGHTNESS_RANGE[:min] + (value / 100.0) * (LIGHTNESS_RANGE[:max] - LIGHTNESS_RANGE[:min])
  end

  # Convert OKLCH chroma back to slider value (0-100)
  def chroma_to_slider(chroma)
    ((chroma - SATURATION_RANGE[:min]) / (SATURATION_RANGE[:max] - SATURATION_RANGE[:min]) * 100).round
  end

  # Convert OKLCH lightness back to slider value (0-100)
  def lightness_to_slider(lightness)
    ((lightness - LIGHTNESS_RANGE[:min]) / (LIGHTNESS_RANGE[:max] - LIGHTNESS_RANGE[:min]) * 100).round
  end

  # Calculate tolerance range for chroma filtering
  def chroma_range(center_value, tolerance_percent = 20)
    center = slider_to_chroma(center_value)
    tolerance = (SATURATION_RANGE[:max] - SATURATION_RANGE[:min]) * (tolerance_percent / 100.0)

    min_c = [ center - tolerance, SATURATION_RANGE[:min] ].max
    max_c = [ center + tolerance, SATURATION_RANGE[:max] ].min

    min_c..max_c
  end

  # Calculate tolerance range for lightness filtering
  def lightness_range(center_value, tolerance_percent = 20)
    center = slider_to_lightness(center_value)
    tolerance = (LIGHTNESS_RANGE[:max] - LIGHTNESS_RANGE[:min]) * (tolerance_percent / 100.0)

    min_l = [ center - tolerance, LIGHTNESS_RANGE[:min] ].max
    max_l = [ center + tolerance, LIGHTNESS_RANGE[:max] ].min

    min_l..max_l
  end
end
