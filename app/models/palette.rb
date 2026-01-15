# == Schema Information
#
# Table name: palettes
#
#  id          :bigint           not null, primary key
#  description :text
#  name        :string
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  creator_id  :bigint           not null
#
# Indexes
#
#  index_palettes_on_created_at  (created_at)
#
# Foreign Keys
#
#  fk_rails_...  (creator_id => users.id)
#
class Palette < ApplicationRecord
  belongs_to :creator, class_name: "User"
  has_many :color_slots, dependent: :destroy
  has_many :product_colors, through: :color_slots

  SLOT_LIMITS = {
    "background" => { min: 1, max: 1 },
    "thread" => { min: 1, max: 12 }
  }.freeze

  # Scopes
  scope :complete, -> {
    joins(:color_slots)
      .where(color_slots: { slot_type: "background" })
      .where(id: ColorSlot.where(slot_type: "thread").select(:palette_id))
      .distinct
  }

  # Methods for accessing colors by slot type
  def background_slots
    color_slots.select { |slot| slot.slot_type == "background" }
  end

  def thread_slots
    color_slots.select { |slot| slot.slot_type == "thread" }
  end

  def background_color
    background_slots.first&.product_color
  end

  # Validation helpers
  def slot_full?(slot_type)
    slots_for_type(slot_type).length >= SLOT_LIMITS[slot_type][:max]
  end

  def complete?
    background_slots.any? && thread_slots.any?
  end

  private

  def slots_for_type(slot_type)
    case slot_type
    when "background" then background_slots
    when "thread" then thread_slots
    else []
    end
  end
end
