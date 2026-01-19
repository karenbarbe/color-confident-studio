# frozen_string_literal: true

# Service object for querying fabric colors from a user's stash.
# Filters by color family, saturation, and lightness using the same
# slider conversion logic as ColorMatcher.
#
# Features adaptive tolerance to ensure users always see results.
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
  BASE_TOLERANCE_CHROMA = 0.06
  BASE_TOLERANCE_LIGHTNESS = 0.12
  MIN_RESULTS = 3
  MAX_TOLERANCE_MULTIPLIER = 3
  TOLERANCE_EXPANSION = 1.5

  attr_reader :effective_tolerance_multiplier

  def initialize(user:, exclude_color_ids: [], color_family: nil, saturation: nil, lightness: nil, limit: DEFAULT_LIMIT, adaptive: true)
    @user = user
    @exclude_color_ids = exclude_color_ids
    @color_family = color_family
    @saturation = saturation
    @lightness = lightness
    @limit = limit
    @adaptive = adaptive
    @effective_tolerance_multiplier = 1.0
  end

  def results
    @results ||= if @adaptive && filtering_active?
                   adaptive_results
    else
      basic_results(1.0)
    end
  end

  def count
    @count ||= build_query(@effective_tolerance_multiplier).count
  end

  # Count of all fabric stash items for the user (for UI display)
  def total_stash_count
    @total_stash_count ||= base_scope.count
  end

  # Returns distribution data for rendering slider hints
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

  def adaptive_results
    multiplier = 1.0

    loop do
      query = build_query(multiplier)
      result_count = query.count

      if result_count >= MIN_RESULTS || multiplier >= MAX_TOLERANCE_MULTIPLIER
        @effective_tolerance_multiplier = multiplier
        return query
                 .order("product_colors.color_family, product_colors.oklch_l")
                 .limit(@limit)
                 .map(&:product_color)
      end

      multiplier *= TOLERANCE_EXPANSION
    end
  end

  def basic_results(multiplier)
    build_query(multiplier)
      .order("product_colors.color_family, product_colors.oklch_l")
      .limit(@limit)
      .map(&:product_color)
  end

  def build_query(tolerance_multiplier = 1.0)
    scope = base_scope
    scope = scope.where.not(product_color_id: @exclude_color_ids) if @exclude_color_ids.any?
    scope = apply_color_family_filter(scope)
    scope = apply_saturation_filter(scope, tolerance_multiplier)
    scope = apply_lightness_filter(scope, tolerance_multiplier)
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

  def apply_saturation_filter(scope, tolerance_multiplier)
    return scope if @saturation.nil?

    center = slider_to_chroma(@saturation)
    tolerance = BASE_TOLERANCE_CHROMA * tolerance_multiplier
    min_c = [ center - tolerance, SATURATION_RANGE[:min] ].max
    max_c = [ center + tolerance, SATURATION_RANGE[:max] ].min

    scope.where(product_colors: { oklch_c: min_c..max_c })
  end

  def apply_lightness_filter(scope, tolerance_multiplier)
    return scope if @lightness.nil?

    center = slider_to_lightness(@lightness)
    tolerance = BASE_TOLERANCE_LIGHTNESS * tolerance_multiplier
    min_l = [ center - tolerance, LIGHTNESS_RANGE[:min] ].max
    max_l = [ center + tolerance, LIGHTNESS_RANGE[:max] ].min

    scope.where(product_colors: { oklch_l: min_l..max_l })
  end

  # Distribution methods for slider hints

  def saturation_distribution
    buckets = Array.new(10, 0)

    stash_colors.each do |color|
      next if color.oklch_c.nil?

      slider_val = chroma_to_slider(color.oklch_c)
      bucket_index = [ (slider_val / 10).floor, 9 ].min
      bucket_index = [ bucket_index, 0 ].max
      buckets[bucket_index] += 1
    end

    normalize_distribution(buckets)
  end

  def lightness_distribution
    buckets = Array.new(10, 0)

    stash_colors.each do |color|
      next if color.oklch_l.nil?

      slider_val = lightness_to_slider(color.oklch_l)
      bucket_index = [ (slider_val / 10).floor, 9 ].min
      bucket_index = [ bucket_index, 0 ].max
      buckets[bucket_index] += 1
    end

    normalize_distribution(buckets)
  end

  def stash_colors
    @stash_colors ||= begin
      scope = base_scope
      scope = scope.where(product_colors: { color_family: @color_family }) if @color_family.present?
      scope.map(&:product_color)
    end
  end

  def normalize_distribution(buckets)
    max_val = buckets.max.to_f
    return buckets.map { 0 } if max_val.zero?

    buckets.map { |v| (v / max_val).round(2) }
  end
end
