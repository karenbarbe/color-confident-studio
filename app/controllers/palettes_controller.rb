class PalettesController < ApplicationController
  before_action :set_palette, only: %i[ show edit update destroy studio pick_color publish ]
  before_action :ensure_current_user_is_creator, only: %i[ show edit update destroy studio pick_color publish ]
  layout "dock"

  # GET /palettes or /palettes.json
  def index
    @palettes = Current.user.palettes.published.order(created_at: :desc)
    @draft_palettes = Current.user.palettes.draft.order(updated_at: :desc)
  end

  # GET /palettes/1 or /palettes/1.json
  def show
  end

  # GET /palettes/new
  def new
    @palette = Palette.new
  end

  # GET /palettes/1/edit
  def edit
  end

  # POST /palettes or /palettes.json
  def create
    @palette = Palette.new(creator: Current.user, status: :draft)

    if @palette.save
      redirect_to studio_palette_path(@palette)
    else
      render :new, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /palettes/1 or /palettes/1.json
  def update
    if @palette.update(palette_params)
      redirect_to studio_palette_path(@palette), notice: "Palette updated."
    else
      render :studio, status: :unprocessable_entity
    end
  end

  # DELETE /palettes/1 or /palettes/1.json
  def destroy
    @palette.destroy!

    respond_to do |format|
      format.html { redirect_to palettes_path, status: :see_other, notice: "Palette was deleted." }
      format.json { head :no_content }
    end
  end

  def studio
    @background_slots = @palette.color_slots.background.includes(product_color: :brand)
    @main_slots = @palette.color_slots.main.includes(product_color: :brand)
    @secondary_slots = @palette.color_slots.secondary.includes(product_color: :brand)
    @accent_slots = @palette.color_slots.accent.includes(product_color: :brand)
  end

  def pick_color
    @section = params[:section]

    unless ColorSlot::SLOT_TYPES.include?(@section)
      redirect_to studio_palette_path(@palette), alert: "Invalid section."
      return
    end

    if @palette.slot_full?(@section)
      redirect_to studio_palette_path(@palette), alert: "The #{@section.capitalize} section is full."
      return
    end

    @category = ColorSlot::SLOT_CATEGORIES[@section]

    @palette_color_ids = @palette.product_colors.pluck(:id)

    @stash_items = Current.user.stash_items
                          .joins(product_color: :brand)
                          .where(brands: { category: @category })
                          .where.not(product_color_id: @palette_color_ids)
                          .includes(product_color: :brand)
                          .order("product_colors.name")

    @stash_product_colors = @stash_items.map(&:product_color)

    @brands = Brand.where(category: @category).order(:name)
  end

  def publish
    @palette.assign_attributes(palette_params) if params[:palette].present?

    if @palette.can_publish?
      if @palette.publish!
        add_palette_colors_to_stash
        redirect_to @palette, notice: "Palette saved!"
      else
        redirect_to studio_palette_path(@palette), alert: "Could not save palette."
      end
    else
      flash.now[:alert] = @palette.missing_requirements.join(", ")
      load_studio_slots
      render :studio, status: :unprocessable_entity
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_palette
      @palette = Palette.find(params.expect(:id))
    end

    def ensure_current_user_is_creator
      if Current.user != @palette.creator
        redirect_back fallback_location: root_url, alert: "You're not authorized for that."
      end
    end

    # Only allow a list of trusted parameters through.
    def palette_params
      params.expect(palette: [ :name, :description ])
    end

    def load_studio_slots
      @background_slots = @palette.color_slots.background.includes(product_color: :brand)
      @main_slots = @palette.color_slots.main.includes(product_color: :brand)
      @secondary_slots = @palette.color_slots.secondary.includes(product_color: :brand)
      @accent_slots = @palette.color_slots.accent.includes(product_color: :brand)
    end

    def add_palette_colors_to_stash
      @palette.product_colors.each do |product_color|
        Current.user.stash_items.find_or_create_by!(product_color: product_color)
      end
    end
end
