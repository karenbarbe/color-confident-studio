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

  # GET /palettes/1/color_picker_content
  def color_picker_content
    authorize @palette

    @type = params[:type] || "thread"
    @mode = params[:mode] || "add"
    @source = params[:source] || "brand"

    # Colors already in palette (to exclude from selection)
    @palette_color_ids = @palette.product_colors.pluck(:id)

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
      saturation: @filter_params[:saturation],
      lightness: @filter_params[:lightness],
      source: @source,
      stash_count: @stash_count || 0
    }
  end

  # GET /palettes/1/matching_colors
  def matching_colors
    authorize @palette

    @type = params[:type] || "thread"
    @source = params[:source] || "brand"

    set_current_slot_for_edit_mode

    @colors, @total_count = fetch_matching_colors

    render partial: "palettes/editor/palette_color_list", locals: {
      palette: @palette,
      colors: @colors,
      total_count: @total_count,
      type: @type,
      mode: @mode,
      current_slot: @current_slot,
      current_color: @current_color
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
  # Before Actions
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
  # Color Picker Helpers
  # ============================================================================

  def extract_filter_params
    {
      color_family: params[:color_family].presence,
      saturation: params[:saturation].present? ? params[:saturation].to_i : nil,
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
    if @type == "fabric" && @source == "stash"
      fetch_stash_colors
    else
      fetch_brand_colors
    end
  end

  def fetch_stash_colors
    query = StashColorQuery.new(
      user: Current.user,
      exclude_color_ids: @palette_color_ids,
      **@filter_params
    )

    [query.results, query.count]
  end

  def fetch_brand_colors
    matcher = build_color_matcher
    [matcher.matching_colors.limit(30), matcher.count]
  end

  def build_color_matcher
    category = @type == "fabric" ? "fabric" : "thread"
    brands = Brand.where(category: category).order(:name)
    selected_brand = brands.find_by(id: params[:brand_id]) || brands.first

    ColorMatcher.new(
      brand: selected_brand,
      exclude_color_ids: @palette_color_ids,
      **@filter_params
    )
  end

  # ============================================================================
  # Picker Data Loaders (for color_picker_content)
  # ============================================================================

  def load_thread_picker_data
    @filter_params = extract_filter_params
    @brands = Brand.where(category: "thread").order(:name)
    @selected_brand = find_selected_brand(@brands)

    set_thread_edit_mode_slot

    matcher = ColorMatcher.new(
      brand: @selected_brand,
      exclude_color_ids: @palette_color_ids,
      **@filter_params
    )

    @colors = matcher.matching_colors.limit(30)
    @total_count = matcher.count
  end

  def load_fabric_picker_data
    @filter_params = extract_filter_params
    @brands = Brand.where(category: "fabric").order(:name)
    @selected_brand = find_selected_brand(@brands)

    stash_query = StashColorQuery.new(user: Current.user, exclude_color_ids: @palette_color_ids)
    @stash_count = stash_query.total_stash_count

    set_fabric_edit_mode_slot

    if @source == "stash"
      query = StashColorQuery.new(
        user: Current.user,
        exclude_color_ids: @palette_color_ids,
        **@filter_params
      )
      @colors = query.results
      @total_count = query.count
    else
      matcher = ColorMatcher.new(
        brand: @selected_brand,
        exclude_color_ids: @palette_color_ids,
        **@filter_params
      )
      @colors = matcher.matching_colors.limit(30)
      @total_count = matcher.count
    end
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
  # Batch Update Helpers
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
  # Other Helpers
  # ============================================================================

  def cleanup_empty_palettes
    Current.user.palettes
      .includes(:color_slots)
      .left_joins(:color_slots)
      .where(color_slots: { id: nil })
      .where(name: [nil, ""])
      .destroy_all
  end

  def load_edit_slots
    @background_slots = @palette.background_slots
    @thread_slots = @palette.thread_slots
  end

  def palette_params
    params.require(:palette).permit(:name, :description)
  end
end
