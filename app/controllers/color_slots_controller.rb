class ColorSlotsController < ApplicationController
  before_action :set_palette
  before_action :ensure_current_user_is_creator
  before_action :set_color_slot, only: %i[update destroy]

  def create
    @color_slot = @palette.color_slots.new(color_slot_params)

    # If adding a background and one already exists, replace it
    if @color_slot.slot_type == "background"
      @palette.color_slots.where(slot_type: "background").destroy_all
    end

    if @color_slot.save
      respond_to do |format|
        format.turbo_stream { render_success_streams }
        format.html { redirect_to edit_palette_path(@palette), notice: "Color added." }
      end
    else
      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: turbo_stream.update("flash-messages",
            partial: "shared/flash",
            locals: { notice: nil, alert: @color_slot.errors.full_messages.join(", ") })
        end
        format.html { redirect_to edit_palette_path(@palette), alert: @color_slot.errors.full_messages.join(", ") }
      end
    end
  end

  def update
    if @color_slot.update(product_color_id: params[:color_slot][:product_color_id])
      respond_to do |format|
        format.turbo_stream { render_success_streams }
        format.html { redirect_to edit_palette_path(@palette), notice: "Color updated." }
      end
    else
      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: turbo_stream.update("flash-messages",
            partial: "shared/flash",
            locals: { notice: nil, alert: @color_slot.errors.full_messages.join(", ") })
        end
        format.html { redirect_to edit_palette_path(@palette), alert: @color_slot.errors.full_messages.join(", ") }
      end
    end
  end

  def destroy
    @color_slot.destroy!

    respond_to do |format|
      format.turbo_stream { render_success_streams }
      format.html { redirect_to edit_palette_path(@palette), notice: "Color removed." }
    end
  end

  private

  def set_palette
    @palette = Palette.includes(color_slots: { product_color: :brand }).find(params[:palette_id])
  end

  def set_color_slot
    @color_slot = @palette.color_slots.find(params[:id])
  end

  def ensure_current_user_is_creator
    unless @palette.creator == Current.user
      redirect_back fallback_location: root_url, alert: "You're not authorized for that."
    end
  end

  def color_slot_params
    # Support both traditional form params and JSON params
    if request.content_type == "application/json"
      params.require(:color_slot).permit(:product_color_id, :slot_type)
    else
      params.expect(color_slot: [ :product_color_id, :slot_type ])
    end
  end

  def skip_authorization?
    true
  end

  def render_success_streams
    # Reload to get fresh associations
    @palette.reload

    background_hex = @palette.background_color&.hex_color

    streams = [
      turbo_stream.replace("color-pills-container",
        partial: "palettes/editor/color_pills_container",
        locals: { palette: @palette, thread_slots: @palette.thread_slots }),
      turbo_stream.replace("header-stats",
        partial: "palettes/editor/header_stats",
        locals: { palette: @palette, thread_slots: @palette.thread_slots }),
      turbo_stream.replace("save-button",
        partial: "palettes/editor/save_button",
        locals: { palette: @palette }),
      turbo_stream.replace("background-selector",
        partial: "palettes/editor/background_selector",
        locals: { palette: @palette }),
      turbo_stream.update("flash-messages",
        partial: "shared/flash",
        locals: { notice: "Palette updated.", alert: nil }),
      # Update the background layer's style attribute
      turbo_stream.update("background-layer-style",
        "<style>#background-layer { background-color: #{background_hex ? "##{background_hex}" : 'transparent'} !important; }</style>"),
      # Dispatch a custom event to close the panel via Stimulus
      turbo_stream.append("flash-messages",
        "<script>window.dispatchEvent(new CustomEvent('palette:color-changed'))</script>")
    ]

    render turbo_stream: streams
  end
end
