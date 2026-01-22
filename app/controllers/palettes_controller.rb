class PalettesController < ApplicationController
  # Only palette record
  before_action :set_palette, only: %i[update destroy batch_update]
  # Palette + slots + product_colors for color picker actions
  before_action :set_palette_with_slots, only: %i[color_picker_content matching_colors]
  # Palette + slots + product_colors + brands - for views that display palette details
  before_action :set_palette_with_colors, only: %i[show edit]
  before_action :set_color_picker_context, only: %i[matching_colors]

  # GET /palettes
  def index
    cleanup_empty_palettes

    authorize Palette
    @palettes = policy_scope(Palette)
                  .includes(color_slots: :product_color)
                  .order(updated_at: :desc)

    # Meta tags
    set_meta_tags(
      title: "Your palettes",
      description: "Waiting for your next project",
      og: {
        title: "Your palettes",
        description: "Waiting for your next project"
        }
    )
  end

  # GET /palettes/1
  def show
    authorize @palette
    load_stash_items_for_palette
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

    # meta tags
    set_meta_tags(
      title: @palette.name.present? ? "Palette editor: #{@palette.name}" : "Palette editor",
      description: "Combine colors into palettes and preview how they'll look on embroidery samples. Experiment until you find the combination that feels just right.",
      og: {
        title: @palette.name.present? ? "Palette editor: #{@palette.name}" : "Palette editor",
        description: "Combine colors into palettes and preview how they'll look on embroidery samples. Experiment until you find the combination that feels just right." }
    )
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
          render turbo_stream: turbo_stream.replace(@palette,
            partial: "palettes/palette_card",
            locals: { palette: @palette })
        end
        format.html do
          flash[:notice] = "Palette updated."
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

  # GET /palettes/1/color_picker_content
  def color_picker_content
    authorize @palette

    @type = params[:type] || "thread"
    @mode = params[:mode] || "add"

    @palette_color_ids = @palette.product_colors.pluck(:id)
    @stashed_color_ids = Current.user.stash_items.pluck(:product_color_id)

    # Capture pending background hex for thread picker display (for unsaved palettes)
    @pending_background_hex = params[:pending_background_hex].presence

    if @type == "fabric"
      load_fabric_picker_data
    else
      load_thread_picker_data
    end

    render partial: "palettes/editor/palette_color_picker_content", locals: {
      palette: @palette,
      type: @type,
      mode: @mode,
      current_slot: @current_slot,
      current_color: @current_color,
      colors: @colors,
      total_count: @total_count,
      brands: @brands,
      selected_brand: @selected_brand,
      selected_family: @filter_params[:color_family],
      lightness: @filter_params[:lightness],
      palette_color_ids: @palette_color_ids,
      stashed_color_ids: @stashed_color_ids,
      pending_background_hex: @pending_background_hex
    }
  end

  # GET /palettes/1/matching_colors
  def matching_colors
    authorize @palette

    @type = params[:type] || "thread"

    set_current_slot_for_edit_mode

    if @filter_params[:color_family].blank?
      if @mode == "edit" && @current_color
        @filter_params[:color_family] = @current_color.color_family
      else
        @filter_params[:color_family] = "Red"
      end
    end

    @colors, @total_count = fetch_matching_colors
    @stashed_color_ids = Current.user.stash_items.pluck(:product_color_id)
    @pending_background_hex = params[:pending_background_hex].presence

    render partial: "palettes/editor/palette_color_list", locals: {
      palette: @palette,
      colors: @colors,
      total_count: @total_count,
      type: @type,
      mode: @mode,
      current_slot: @current_slot,
      current_color: @current_color,
      palette_color_ids: @palette_color_ids,
      stashed_color_ids: @stashed_color_ids,
      pending_background_hex: @pending_background_hex
    }
  end

  # PATCH /palettes/1/batch_update
  def batch_update
    authorize @palette

    changes = params.require(:changes).permit(
      additions: [ :product_color_id, :slot_type, :position ],
      updates: [ :id, :product_color_id ],
      deletions: []
    )

    ActiveRecord::Base.transaction do
      process_deletions(changes[:deletions])
      process_updates(changes[:updates])
      process_additions(changes[:additions])
    end

    # Use efficient count queries instead of loading associations
    thread_count = @palette.color_slots.where(slot_type: "thread").count
    has_background = @palette.color_slots.where(slot_type: "background").exists?

    render json: {
      success: true,
      message: "Palette updated successfully",
      palette: {
        id: @palette.id,
        complete: has_background && thread_count > 0,
        thread_count: thread_count,
        has_background: has_background
      }
    }

  rescue ActiveRecord::RecordInvalid => e
    render json: { success: false, message: e.message }, status: :unprocessable_entity

  rescue ActiveRecord::RecordNotFound => e
    render json: { success: false, message: "Color slot not found" }, status: :not_found
  end

  private

  # ============================================================================
  # Before actions
  # ============================================================================

  def set_palette
    @palette = Palette.find(params[:id])
  end

  def set_palette_with_slots
    @palette = Palette.includes(color_slots: :product_color).find(params[:id])
  end

  def set_palette_with_colors
    @palette = Palette.includes(color_slots: { product_color: :brand }).find(params[:id])
  end

  def set_color_picker_context
    @mode = params[:mode] || "add"
    @palette_color_ids = @palette.product_colors.pluck(:id)
    @filter_params = extract_filter_params
  end

  # ============================================================================
  # Color picker helpers
  # ============================================================================

  def extract_filter_params
    {
      color_family: params[:color_family].presence,
      lightness: params[:lightness].present? ? params[:lightness].to_i : nil
    }
  end

  def set_current_slot_for_edit_mode
    @current_slot = nil
    @current_color = nil

    return unless @mode == "edit"

    @current_slot = if @type == "fabric"
                      @palette.background_slots.first
    elsif params[:slot_id].present?
      @palette.color_slots.find_by(id: params[:slot_id])
    end

    @current_color = @current_slot&.product_color
  end

  def fetch_matching_colors
    matcher = build_color_matcher
    [ matcher.matching_colors.limit(45), matcher.count ]
  end

  def build_color_matcher
    category = @type == "fabric" ? "fabric" : "thread"
    brands = Brand.where(category: category).order(:name)
    selected_brand = brands.find_by(id: params[:brand_id]) || brands.first

    ColorMatcher.new(
      brand: selected_brand,
      **@filter_params
    )
  end

  # ============================================================================
  # Picker data loaders (for color_picker_content)
  # ============================================================================

  def load_thread_picker_data
    @filter_params = extract_filter_params
    @brands = Brand.where(category: "thread").order(:name)
    @selected_brand = find_selected_brand(@brands)

    set_thread_edit_mode_slot

    if @mode == "add" && @filter_params[:color_family].blank?
      @filter_params[:color_family] = "Red"
    end

    if @mode == "edit" && @current_color && @filter_params[:color_family].blank?
      @filter_params[:color_family] = @current_color.color_family
    end

    matcher = ColorMatcher.new(
      brand: @selected_brand,
      **@filter_params
    )

    @colors = matcher.matching_colors.limit(45)
    @total_count = matcher.count
  end

  def load_fabric_picker_data
    @filter_params = extract_filter_params
    @brands = Brand.where(category: "fabric").order(:name)
    @selected_brand = find_selected_brand(@brands)

    set_fabric_edit_mode_slot

    if @mode == "add" && @filter_params[:color_family].blank?
      @filter_params[:color_family] = "Red"
    end

    if @mode == "edit" && @current_color && @filter_params[:color_family].blank?
      @filter_params[:color_family] = @current_color.color_family
    end

    matcher = ColorMatcher.new(
      brand: @selected_brand,
      **@filter_params
    )

    @colors = matcher.matching_colors.limit(45)
    @total_count = matcher.count
  end

  def find_selected_brand(brands)
    if params[:brand_id].present?
      brands.find_by(id: params[:brand_id]) || brands.first
    else
      brands.first
    end
  end

  def set_thread_edit_mode_slot
    @current_slot = nil
    @current_color = nil

    if @mode == "edit" && params[:slot_id].present?
      @current_slot = @palette.color_slots.find_by(id: params[:slot_id])
      @current_color = @current_slot&.product_color
    end
  end

  def set_fabric_edit_mode_slot
    @current_slot = nil
    @current_color = nil

    if @mode == "edit"
      @current_slot = @palette.background_slots.first
      @current_color = @current_slot&.product_color
    end
  end

  # ============================================================================
  # Batch update helpers
  # ============================================================================

  def process_deletions(deletions)
    return if deletions.blank?

    @palette.color_slots.where(id: deletions).destroy_all
  end

  def process_updates(updates)
    return if updates.blank?

    updates.each do |update|
      slot = @palette.color_slots.find(update[:id])
      slot.update!(product_color_id: update[:product_color_id])
    end
  end

  def process_additions(additions)
    return if additions.blank?

    additions.each do |addition|
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

  # ============================================================================
  # Other helpers
  # ============================================================================

  def cleanup_empty_palettes
    Current.user.palettes
      .includes(:color_slots)
      .left_joins(:color_slots)
      .where(color_slots: { id: nil })
      .where(name: [ nil, "" ])
      .destroy_all
  end

  def load_stash_items_for_palette
    color_ids = @palette.product_colors.pluck(:id)
    @stash_items_by_color_id = Current.user
      .stash_items
      .where(product_color_id: color_ids)
      .index_by(&:product_color_id)
  end

  def load_edit_slots
    @background_slots = @palette.background_slots
    @thread_slots = @palette.thread_slots
  end

  def palette_params
    params.require(:palette).permit(:name, :description)
  end
end
