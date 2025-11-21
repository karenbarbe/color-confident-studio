class ProductColorsController < ApplicationController
  before_action :set_product_color, only: %i[ show edit update destroy ]

  # GET /product_colors or /product_colors.json
  def index
    @product_colors = ProductColor.all
  end

  # GET /product_colors/1 or /product_colors/1.json
  def show
  end

  # GET /product_colors/new
  def new
    @product_color = ProductColor.new
  end

  # GET /product_colors/1/edit
  def edit
  end

  # POST /product_colors or /product_colors.json
  def create
    @product_color = ProductColor.new(product_color_params)

    respond_to do |format|
      if @product_color.save
        format.html { redirect_to @product_color, notice: "Product color was successfully created." }
        format.json { render :show, status: :created, location: @product_color }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @product_color.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /product_colors/1 or /product_colors/1.json
  def update
    respond_to do |format|
      if @product_color.update(product_color_params)
        format.html { redirect_to @product_color, notice: "Product color was successfully updated." }
        format.json { render :show, status: :ok, location: @product_color }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @product_color.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /product_colors/1 or /product_colors/1.json
  def destroy
    @product_color.destroy!

    respond_to do |format|
      format.html { redirect_to product_colors_path, status: :see_other, notice: "Product color was successfully destroyed." }
      format.json { head :no_content }
    end
  end

  def color_libraries
    @available_brands = Brand.all.order(:id)
    @product_colors = ProductColor.all.order(:id)
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_product_color
      @product_color = ProductColor.find(params.expect(:id))
    end

    # Only allow a list of trusted parameters through.
    def product_color_params
      params.expect(product_color: [ :name, :vendor_code, :brand_id, :hex_color ])
    end
end
