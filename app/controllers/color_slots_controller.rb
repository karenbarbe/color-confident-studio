class ColorSlotsController < ApplicationController
  before_action :set_palette
  before_action :ensure_current_user_is_creator
  before_action :set_color_slot, only: %i[ destroy ]

  def create
    @color_slot = @palette.color_slots.new(color_slot_params)

    if @color_slot.save
      redirect_to studio_palette_path(@palette), notice: "Color added to #{@color_slot.slot_type} section."
    else
      redirect_to studio_palette_path(@palette), alert: @color_slot.errors.full_messages.join(", ")
    end
  end

  def destroy
    slot_type = @color_slot.slot_type
    @color_slot.destroy!

    redirect_to studio_palette_path(@palette), notice: "Color removed from #{slot_type} section."
  end

  private

  def set_palette
    @palette = Palette.find(params[:palette_id])
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
    params.expect(color_slot: [ :product_color_id, :slot_type ])
  end
end
