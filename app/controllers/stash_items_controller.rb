class StashItemsController < ApplicationController
  before_action :set_stash_item, only: %i[ show edit update destroy ]

  # GET /stash_items or /stash_items.json
  def index
    authorize StashItem

    @stash_items = policy_scope(StashItem)
      .joins(product_color: :brand)
      .includes(product_color: :brand)
      .order("brands.category ASC, brands.name ASC, product_colors.id ASC")
      .to_a  # Load into memory once

    # Default hash with all categories set to 0
    default_counts = Brand.categories.keys.index_with { 0 }

    # Calculate all stats from the loaded data, merging with defaults
    @counts_by_category = default_counts.merge(
      @stash_items.group_by { |si| si.product_color.brand.category }
                  .transform_values(&:count)
    )

    @owned_by_category = default_counts.merge(
      @stash_items.select(&:owned?)
                  .group_by { |si| si.product_color.brand.category }
                  .transform_values(&:count)
    )

    @wish_list_by_category = default_counts.merge(
      @stash_items.select(&:wish_list?)
                  .group_by { |si| si.product_color.brand.category }
                  .transform_values(&:count)
    )

    # Totals for the view
    @total_count = @stash_items.size
    @owned_count = @owned_by_category.values.sum
    @wish_list_count = @wish_list_by_category.values.sum
  end

  # GET /stash_items/1 or /stash_items/1.json
  def show
    authorize @stash_item
  end

  # GET /stash_items/new
  def new
    @stash_item = StashItem.new
  end

  # GET /stash_items/1/edit
  def edit
  end

  # POST /stash_items or /stash_items.json
  def create
    @stash_item = Current.user.stash_items.build(stash_item_params)
    authorize @stash_item
    @product_color = @stash_item.product_color
    @brand = @product_color.brand

    respond_to do |format|
      if @stash_item.save
        format.turbo_stream
        format.html { redirect_back fallback_location: stash_items_path, notice: "Stash item was successfully created." }
        format.json { render :show, status: :created, location: @stash_item }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @stash_item.errors, status: :unprocessable_entity }
      end
    end
  end
  def update_ownership_status
    authorize @stash_item
    if @stash_item.update(ownership_status: params[:ownership_status])
      respond_to do |format|
        format.html { redirect_back fallback_location: stash_items_path, notice: "Stash item ownership status updated." }
        format.json { render :show, status: :ok, location: @stash_item }
      end
    else
      respond_to do |format|
        format.html { redirect_back fallback_location: stash_items_path, alert: "Failed to update ownership status." }
        format.json { render json: @stash_item.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /stash_items/1 or /stash_items/1.json
  def update
    authorize @stash_item
    @product_color = @stash_item.product_color
    @brand = @product_color.brand
    respond_to do |format|
      if @stash_item.update(stash_item_params)
        format.turbo_stream
        format.html { redirect_back fallback_location: stash_items_path, notice: "Stash item was successfully updated." }
        format.json { render :show, status: :ok, location: @stash_item }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @stash_item.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /stash_items/1 or /stash_items/1.json
  def destroy
    authorize @stash_item
    @product_color = @stash_item.product_color
    @brand = @product_color.brand
    @stash_item.destroy!

    respond_to do |format|
      format.turbo_stream
      format.html { redirect_back fallback_location: stash_items_path, status: :see_other, notice: "Item was successfully removed from your stash." }
      format.json { head :no_content }
    end
  end

  private
  # Use callbacks to share common setup or constraints between actions.
  def set_stash_item
    @stash_item = StashItem.find(params[:id])
  end

  # Only allow a list of trusted parameters through.
  def stash_item_params
    params.require(:stash_item).permit(:product_color_id, :ownership_status)
  end

  def skip_authorization?
    action_name == "index"
  end
end
