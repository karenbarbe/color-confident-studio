module Api
  module FabricPicker
    class StashController < ApplicationController
      before_action :require_authentication

      def families
        stash_colors = current_user_fabric_stash_colors

        if stash_colors.empty?
          render json: { families: [], empty: true }
          return
        end

        family_counts = stash_colors.group(:color_family).count

        families = ProductColor::COLOR_FAMILIES.filter_map do |family|
          count = family_counts[family]
          { name: family, count: count } if count && count > 0
        end

        render json: { families: families, empty: false }
      end

      def colors
        family = params[:family]
        stash_colors = current_user_fabric_stash_colors.where(color_family: family)

        colors_by_brand = stash_colors
          .includes(:brand)
          .order("brands.name ASC, product_colors.name ASC")
          .group_by { |pc| pc.brand.name }

        brands = colors_by_brand.map do |brand_name, colors|
          {
            name: brand_name,
            colors: colors.map do |color|
              {
                id: color.id,
                vendor_code: color.vendor_code,
                name: color.name,
                hex: color.hex_color,
                oklch_l: color.oklch_l&.to_f
              }
            end
          }
        end

        render json: { family_name: family, brands: brands }
      end

      private

      def current_user_fabric_stash_colors
        ProductColor
          .joins(:brand, :stash_items)
          .where(brands: { category: "fabric" })
          .where(stash_items: { owner_id: Current.user.id })
      end
    end
  end
end
