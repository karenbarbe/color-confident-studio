module Api
  module FabricPicker
    class ColorsController < ApplicationController
      allow_unauthenticated_access

      def index
        brand = Brand.fabric.find(params[:brand_id])
        family = params[:family]

        colors = brand.product_colors
          .where(color_family: family)
          .order(:name)
          .map do |color|
            {
              id: color.id,
              vendor_code: color.vendor_code,
              name: color.name,
              hex: color.hex_color,
              oklch_l: color.oklch_l&.to_f
            }
          end

        render json: { family_name: family, colors: colors }
      end
    end
  end
end
