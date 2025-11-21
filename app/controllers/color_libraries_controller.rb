class ColorLibrariesController < ApplicationController
  def index
    @available_brands = Brand.all.order(:id)
    @product_colors = ProductColor.all.order(:id)
  end

  def show
    @brand = Brand.where("LOWER(name) = ?", params[:id].downcase).first!
    @available_brands = Brand.all.order(:id)
    @brand_colors = @brand.product_colors.order(:id)
  end
end
