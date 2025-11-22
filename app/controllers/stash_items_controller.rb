class StashItemsController < ApplicationController
  before_action :set_stash_item, only: %i[ show edit update destroy ]
  layout "dock"

  # GET /stash_items or /stash_items.json
  def index
    @stash_items = StashItem.where(owner: Current.user).includes(product_color: :brand)
  end

  # GET /stash_items/1 or /stash_items/1.json
  def show
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

    respond_to do |format|
      if @stash_item.save
        format.html { redirect_to stash_items_path, notice: "Stash item was successfully created." }
        format.json { render :show, status: :created, location: @stash_item }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @stash_item.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /stash_items/1 or /stash_items/1.json
  def update
    respond_to do |format|
      if @stash_item.update(stash_item_params)
        format.html { redirect_to stash_items_path, notice: "Stash item was successfully updated." }
        format.json { render :show, status: :ok, location: @stash_item }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @stash_item.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /stash_items/1 or /stash_items/1.json
  def destroy
    @stash_item.destroy!

    respond_to do |format|
      format.html { redirect_to stash_items_path, status: :see_other, notice: "Stash item was successfully destroyed." }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_stash_item
      @stash_item = StashItem.find(params.expect(:id))
    end

    # Only allow a list of trusted parameters through.
    def stash_item_params
      params.require(:stash_item).permit(:product_color_id)
    end
end
