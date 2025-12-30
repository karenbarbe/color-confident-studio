module Api
  module FabricPicker
    class BrandsController < ApplicationController
      allow_unauthenticated_access

      def index
        brands = Brand.fabric.order(:name).map do |brand|
          {
            id: brand.id,
            name: brand.name,
            count: brand.product_colors_count
          }
        end

        render json: brands
      end
    end
  end
end
