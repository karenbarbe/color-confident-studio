class PalettesController < ApplicationController
  before_action :set_palette, only: %i[show edit update destroy pick_color]

  # GET /palettes
  def index
    authorize Palette
    @palettes = policy_scope(Palette)
                  .includes(color_slots: :product_color)
                  .order(updated_at: :desc)
  end

  # GET /palettes/1
  def show
    authorize @palette
  end

  # GET /palettes/new
  def new
    @palette = Palette.new
    authorize @palette
  end

  # GET /palettes/1/edit
  def edit
    authorize @palette
    load_edit_slots
  end

  # POST /palettes
  def create
    @palette = Palette.new(creator: Current.user)
    authorize @palette

    if @palette.save
      redirect_to edit_palette_path(@palette)
    else
      redirect_to palettes_path, alert: "Could not create palette."
    end
  end

  # PATCH/PUT /palettes/1
  def update
    authorize @palette

    if @palette.update(palette_params)
      redirect_to @palette, notice: "Palette saved."
    else
      load_edit_slots
      render :edit, status: :unprocessable_entity
    end
  end

  # DELETE /palettes/1
  def destroy
    authorize @palette
    @palette.destroy!
    redirect_to palettes_path, status: :see_other, notice: "Palette was deleted."
  end

  # GET /palettes/1/pick_color?section=thread
  def pick_color
    authorize @palette
    @section = params[:section]

    unless ColorSlot::SLOT_TYPES.include?(@section)
      redirect_to edit_palette_path(@palette), alert: "Invalid section."
      return
    end

    if @palette.slot_full?(@section)
      redirect_to edit_palette_path(@palette), alert: "#{@section.capitalize} section is full."
      return
    end

    # Determine which category to show based on section
    @category = ColorSlot::SLOT_CATEGORIES[@section]

    # Get colors already in this palette (to exclude from selection)
    @palette_color_ids = @palette.product_colors.pluck(:id)

    # Get stash colors for this category
    @stash_items = Current.user.stash_items
                          .joins(product_color: :brand)
                          .where(brands: { category: @category })
                          .where.not(product_color_id: @palette_color_ids)
                          .includes(product_color: :brand)
                          .order("product_colors.name")

    @stash_product_colors = @stash_items.map(&:product_color)

    @brands = Brand.where(category: @category).order(:name)
  end

  private

  def set_palette
    @palette = Palette.includes(color_slots: { product_color: :brand }).find(params[:id])
  end

  def load_edit_slots
    @background_slots = @palette.background_slots
    @thread_slots = @palette.thread_slots
  end

  def palette_params
    params.require(:palette).permit(:name, :description)
  end
end
