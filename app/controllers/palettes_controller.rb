class PalettesController < ApplicationController
  before_action :set_palette, only: %i[show edit update destroy pick_color panel_content matching_threads background_picker batch_update]

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
      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: [
            turbo_stream.replace("palette-name-display",
              partial: "palettes/editor/name_display",
              locals: { palette: @palette }),
            turbo_stream.update("flash-messages",
              partial: "shared/flash",
              locals: { notice: "Palette updated.", alert: nil })
          ]
        end
        format.html do
          flash[:notice] = "Palette saved."
          redirect_back(fallback_location: palette_path)
        end
      end
    else
      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: turbo_stream.update("flash-messages",
            partial: "shared/flash",
            locals: { notice: nil, alert: @palette.errors.full_messages.join(", ") })
        end
        format.html do
          load_edit_slots
          render :edit, status: :unprocessable_entity
        end
      end
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

  # GET /palettes/1/panel_content
  def panel_content
    authorize @palette
    @mode = params[:mode] || "add"

    if @mode == "edit" && params[:slot_id].present?
      @current_slot = @palette.color_slots.find(params[:slot_id])
      @current_color = @current_slot.product_color
    end

    # Get colors already in this palette (to exclude from selection)
    @palette_color_ids = @palette.product_colors.pluck(:id)

    # Get thread brands for the dropdown
    @thread_brands = Brand.where(category: "thread").order(:name)
    @selected_brand = if params[:brand_id].present?
                        @thread_brands.find_by(id: params[:brand_id]) || @thread_brands.first
    else
                        @thread_brands.first
    end

    # Parse filter params
    @selected_family = params[:color_family].presence
    @saturation = params[:saturation].present? ? params[:saturation].to_i : nil
    @lightness = params[:lightness].present? ? params[:lightness].to_i : nil

    # Use ThreadMatcher service
    matcher = ThreadMatcher.new(
      brand: @selected_brand,
      exclude_color_ids: @palette_color_ids,
      color_family: @selected_family,
      saturation: @saturation,
      lightness: @lightness
    )

    @matching_threads = matcher.matching_colors.limit(30)
    @total_count = matcher.count

    render partial: "palettes/editor/panel_content", locals: {
      palette: @palette,
      mode: @mode,
      current_slot: @current_slot,
      current_color: @current_color,
      matching_threads: @matching_threads,
      total_count: @total_count,
      thread_brands: @thread_brands,
      selected_brand: @selected_brand,
      selected_family: @selected_family,
      saturation: @saturation,
      lightness: @lightness
    }
  end

  # GET /palettes/1/matching_threads (Turbo Frame for filtered results)
  def matching_threads
    authorize @palette

    # Support edit mode
    @mode = params[:mode] || "add"
    @current_slot = nil

    if @mode == "edit" && params[:slot_id].present?
      @current_slot = @palette.color_slots.find_by(id: params[:slot_id])
    end

    @palette_color_ids = @palette.product_colors.pluck(:id)
    @thread_brands = Brand.where(category: "thread").order(:name)
    @selected_brand = @thread_brands.find_by(id: params[:brand_id]) || @thread_brands.first

    @selected_family = params[:color_family].presence
    @saturation = params[:saturation].present? ? params[:saturation].to_i : nil
    @lightness = params[:lightness].present? ? params[:lightness].to_i : nil

    matcher = ThreadMatcher.new(
      brand: @selected_brand,
      exclude_color_ids: @palette_color_ids,
      color_family: @selected_family,
      saturation: @saturation,
      lightness: @lightness
    )

    @matching_threads = matcher.matching_colors.limit(30)
    @total_count = matcher.count

    render partial: "palettes/editor/matching_threads_list", locals: {
      palette: @palette,
      matching_threads: @matching_threads,
      total_count: @total_count,
      mode: @mode,
      current_slot: @current_slot
    }
  end

  # GET /palettes/1/background_picker
  def background_picker
    authorize @palette

    # Get the current background if any
    @current_background = @palette.background_color

    # Get fabric brands
    @fabric_brands = Brand.where(category: "fabric").order(:name)
    @selected_brand = if params[:brand_id].present?
                        @fabric_brands.find_by(id: params[:brand_id]) || @fabric_brands.first
    else
                        @fabric_brands.first
    end

    # Get user's stash fabrics
    @stash_fabrics = Current.user.stash_items
                            .joins(product_color: :brand)
                            .where(brands: { category: "fabric" })
                            .includes(product_color: :brand)
                            .order("product_colors.name")
                            .map(&:product_color)

    # Get brand colors if a brand is selected
    @brand_fabrics = @selected_brand&.product_colors&.order(:color_family, :oklch_l) || []

    # Parse filter params
    @selected_family = params[:color_family].presence
    @lightness = params[:lightness].present? ? params[:lightness].to_i : nil

    # Apply filters if present
    if @selected_family.present? || @lightness.present?
      @brand_fabrics = filter_fabrics(@brand_fabrics, @selected_family, @lightness)
    end

    @brand_fabrics = @brand_fabrics.limit(30)

    render partial: "palettes/editor/background_picker_content", locals: {
      palette: @palette,
      current_background: @current_background,
      stash_fabrics: @stash_fabrics,
      fabric_brands: @fabric_brands,
      selected_brand: @selected_brand,
      brand_fabrics: @brand_fabrics,
      selected_family: @selected_family,
      lightness: @lightness
    }
  end

  def batch_update
    authorize @palette

    changes = params.require(:changes).permit(
      additions: [ :product_color_id, :slot_type, :position ],
      updates: [ :id, :product_color_id ],
      deletions: []
    )

    ActiveRecord::Base.transaction do
      # Process deletions first
      if changes[:deletions].present?
        @palette.color_slots.where(id: changes[:deletions]).destroy_all
      end

      # Process updates
      if changes[:updates].present?
        changes[:updates].each do |update|
          slot = @palette.color_slots.find(update[:id])
          slot.update!(product_color_id: update[:product_color_id])
        end
      end

      # Process additions
      if changes[:additions].present?
        changes[:additions].each do |addition|
          # If adding a background and one already exists, replace it
          if addition[:slot_type] == "background"
            @palette.color_slots.where(slot_type: "background").destroy_all
          end

          @palette.color_slots.create!(
            product_color_id: addition[:product_color_id],
            slot_type: addition[:slot_type],
            position: addition[:position] || 0
          )
        end
      end
    end

    # Reload to get fresh data
    @palette.reload

    render json: {
      success: true,
      message: "Palette updated successfully",
      palette: {
        id: @palette.id,
        complete: @palette.complete?,
        thread_count: @palette.thread_slots.count,
        has_background: @palette.background_color.present?
      }
    }

  rescue ActiveRecord::RecordInvalid => e
    render json: {
      success: false,
      message: e.message
    }, status: :unprocessable_entity

  rescue ActiveRecord::RecordNotFound => e
    render json: {
      success: false,
      message: "Color slot not found"
    }, status: :not_found
  end

  private

  def filter_fabrics(fabrics, family, lightness)
    scope = fabrics

    if family.present?
      scope = scope.where(color_family: family)
    end

    if lightness.present?
      # Convert 0-100 slider to oklch_l range (0.2-0.95)
      center = 0.2 + (lightness / 100.0) * 0.75
      tolerance = 0.15
      min_l = [ center - tolerance, 0.2 ].max
      max_l = [ center + tolerance, 0.95 ].min
      scope = scope.where(oklch_l: min_l..max_l)
    end

    scope
  end

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
