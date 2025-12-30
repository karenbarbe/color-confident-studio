module Api
  module FabricPicker
    class FamiliesController < ApplicationController
      allow_unauthenticated_access

      def index
        brand = Brand.fabric.find(params[:brand_id])

        family_counts = brand.product_colors
          .where.not(color_family: nil)
          .group(:color_family)
          .count

        families = ProductColor::COLOR_FAMILIES.filter_map do |family|
          count = family_counts[family]
          { name: family, count: count } if count && count > 0
        end

        render json: { brand_name: brand.name, families: families }
      end
    end
  end
end
