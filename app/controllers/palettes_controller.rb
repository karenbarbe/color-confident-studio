class PalettesController < ApplicationController
  before_action :set_palette, only: %i[show edit update destroy studio pick_color publish]

  # GET /palettes
  def index
    authorize Palette
    @palettes = policy_scope(Palette).published.includes(color_slots: :product_color).order(created_at: :desc)
    @draft_palettes = policy_scope(Palette).draft.with_content.includes(color_slots: :product_color).order(updated_at: :desc)
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
  end

  # POST /palettes
  def create
    existing_empty_draft = find_empty_draft

    if existing_empty_draft
      authorize existing_empty_draft
      redirect_to studio_palette_path(existing_empty_draft)
    else
      @palette = Palette.new(creator: Current.user, status: :draft)
      authorize @palette

      if @palette.save
        redirect_to studio_palette_path(@palette)
      else
        redirect_to palettes_path, alert: "Could not create palette."
      end
    end
  end

  # PATCH/PUT /palettes/1
  def update
    authorize @palette
    if @palette.update(palette_params)
      redirect_to studio_palette_path(@palette), notice: "Palette updated."
    else
      render :studio, status: :unprocessable_entity
    end
  end

  # DELETE /palettes/1
  def destroy
    authorize @palette
    @palette.destroy!
    redirect_to palettes_path, status: :see_other, notice: "Palette was deleted."
  end

  # GET /palettes/1/studio
  def studio
    authorize @palette
    load_studio_slots
  end

  # GET /palettes/1/pick_color?section=main
  def pick_color
    authorize @palette
    @section = params[:section]

    unless ColorSlot::SLOT_TYPES.include?(@section)
      redirect_to studio_palette_path(@palette), alert: "Invalid section."
      return
    end

    if @palette.slot_full?(@section)
      redirect_to studio_palette_path(@palette), alert: "#{@section.capitalize} section is full."
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

  # PATCH /palettes/1/publish
  # Validates and saves the palette (publishes if draft, updates if already published)
  def publish
    authorize @palette
    @palette.assign_attributes(palette_params) if params[:palette].present?

    # If already published, just save the updates
    if @palette.published?
      if @palette.save
        redirect_to @palette, notice: "Palette updated successfully!"
      else
        flash.now[:alert] = @palette.errors.full_messages.join(", ")
        load_studio_slots
        render :studio, status: :unprocessable_entity
      end
      return
    end

    # Draft palette: validate requirements before publishing
    if @palette.can_publish?
      if @palette.publish!
        add_palette_colors_to_stash
        redirect_to @palette, notice: "Palette saved successfully!"
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

  def set_palette
    if action_name == "studio"
      @palette = Palette.includes(color_slots: :product_color).find(params[:id])
    elsif action_name == "pick_color"
      @palette = Palette.includes(:color_slots).find(params[:id])
    else
      @palette = Palette.includes(color_slots: { product_color: :brand }).find(params[:id])
    end
  end

  def load_studio_slots
    @background_slots = @palette.section_slots("background")
    @main_slots = @palette.section_slots("main")
    @secondary_slots = @palette.section_slots("secondary")
    @accent_slots = @palette.section_slots("accent")
  end

  def add_palette_colors_to_stash
    @palette.product_colors.each do |product_color|
      Current.user.stash_items.find_or_create_by(product_color: product_color)
    end
  end

  def find_empty_draft
    Current.user.palettes
           .draft
           .where(name: [nil, ""])
           .left_joins(:color_slots)
           .group("palettes.id")
           .having("COUNT(color_slots.id) = 0")
           .first
  end

  def palette_params
    params.require(:palette).permit(:name, :description)
  end
end
