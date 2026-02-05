# frozen_string_literal: true

class ColorMatcher
  include ColorSliderConversion

  attr_reader :lightness_category

  def initialize(
    brand:,
    exclude_color_ids: [],
    color_family: nil,
    lightness_category: nil
  )
    @brand = brand
    @exclude_color_ids = exclude_color_ids
    @color_family = color_family
    @lightness_category = lightness_category
  end

  def matching_colors
    @matching_colors ||= build_query
  end

  def count
    @count ||= matching_colors.count
  end

  private

  def build_query
    scope = base_scope
    scope = apply_color_family_filter(scope)
    scope = apply_lightness_filter(scope)
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

  def apply_lightness_filter(scope)
    range = lightness_range_for_category(@lightness_category)
    return scope if range.nil?

    scope.where(oklch_l: range)
  end
end
