class ProductColorsController < ApplicationController
  allow_unauthenticated_access(only: :show)
  before_action :set_product_color, only: %i[ show edit update destroy ]

  # GET /product_colors or /product_colors.json
  def index
    authorize ProductColor
    @product_colors = policy_scope(ProductColor)
  end

  # GET /product_colors/1 or /product_colors/1.json
  def show
    authorize @product_color
    if params[:category] && params[:brand_slug]
      @category = params[:category]
      @brand = Brand.find_by!(slug: params[:brand_slug], category: @category)
    end
  end

  # GET /product_colors/new
  def new
    @product_color = ProductColor.new
    authorize @product_color
  end

  # GET /product_colors/1/edit
  def edit
  end

  # POST /product_colors or /product_colors.json
  def create
    @product_color = ProductColor.new(product_color_params)
    authorize @product_color

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
    authorize @product_color
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
    authorize @product_color
    @product_color.destroy!

    respond_to do |format|
      format.html { redirect_to product_colors_path, status: :see_other, notice: "Product color was successfully destroyed." }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_product_color
      color_param = params[:color_id] || params[:id]
      @product_color = ProductColor.find(color_param)
    end

    # Only allow a list of trusted parameters through.
    def product_color_params
      params.expect(product_color: [ :name, :vendor_code, :brand_id, :hex_color ])
    end
end
