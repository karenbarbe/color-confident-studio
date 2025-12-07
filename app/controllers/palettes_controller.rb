class PalettesController < ApplicationController
  before_action :set_palette, only: %i[show edit update destroy studio pick_color publish]
  before_action :ensure_current_user_is_creator, only: %i[show edit update destroy studio pick_color publish]
  layout "dock"

  # GET /palettes
  def index
    @palettes = Current.user.palettes.published.order(created_at: :desc)
    @draft_palettes = Current.user.palettes.draft.with_content.order(updated_at: :desc)
  end

  # GET /palettes/1
  def show
  end

  # GET /palettes/new
  def new
    @palette = Palette.new
  end

  # GET /palettes/1/edit
  def edit
  end

  # POST /palettes
  def create
    existing_empty_draft = find_empty_draft

    if existing_empty_draft
      redirect_to studio_palette_path(existing_empty_draft)
    else
      @palette = Palette.new(creator: Current.user, status: :draft)

      if @palette.save
        redirect_to studio_palette_path(@palette)
      else
        redirect_to palettes_path, alert: "Could not create palette."
      end
    end
  end

  # PATCH/PUT /palettes/1
  def update
    if @palette.update(palette_params)
      redirect_to studio_palette_path(@palette), notice: "Palette updated."
    else
      render :studio, status: :unprocessable_entity
    end
  end

  # DELETE /palettes/1
  def destroy
    @palette.destroy!
    redirect_to palettes_path, status: :see_other, notice: "Palette was deleted."
  end

  # GET /palettes/1/studio
  def studio
    @background_slots = @palette.color_slots.background.includes(product_color: :brand)
    @main_slots = @palette.color_slots.main.includes(product_color: :brand)
    @secondary_slots = @palette.color_slots.secondary.includes(product_color: :brand)
    @accent_slots = @palette.color_slots.accent.includes(product_color: :brand)
  end

  # GET /palettes/1/pick_color?section=main
  def pick_color
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
  # Validates and publishes the palette
  def publish
    # Update name/description if provided
    @palette.assign_attributes(palette_params) if params[:palette].present?

    if @palette.can_publish?
      if @palette.publish!
        # Add any non-stash colors to user's stash
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
    @palette = Palette.find(params[:id])
  end

  def ensure_current_user_is_creator
    unless Current.user == @palette.creator
      redirect_back fallback_location: root_url, alert: "You're not authorized for that."
    end
  end

  def palette_params
    params.expect(palette: [:name, :description])
  end

  def load_studio_slots
    @background_slots = @palette.color_slots.background.includes(product_color: :brand)
    @main_slots = @palette.color_slots.main.includes(product_color: :brand)
    @secondary_slots = @palette.color_slots.secondary.includes(product_color: :brand)
    @accent_slots = @palette.color_slots.accent.includes(product_color: :brand)
  end

  def add_palette_colors_to_stash
    @palette.product_colors.each do |product_color|
      # Find or create stash item for this user/color combination
      Current.user.stash_items.find_or_create_by(product_color: product_color)
    end
  end

  # Find an empty draft: no name and no color slots
  def find_empty_draft
    Current.user.palettes
           .draft
           .where(name: [nil, ""])
           .left_joins(:color_slots)
           .group("palettes.id")
           .having("COUNT(color_slots.id) = 0")
           .first
  end
end
