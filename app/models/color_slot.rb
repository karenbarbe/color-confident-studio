# == Schema Information
#
# Table name: color_slots
#
#  id               :bigint           not null, primary key
#  position         :integer          default(0), not null
#  slot_type        :string           default("main"), not null
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  palette_id       :bigint           not null
#  product_color_id :bigint           not null
#
# Indexes
#
#  index_color_slots_on_palette_id                             (palette_id)
#  index_color_slots_on_palette_id_and_product_color_id        (palette_id,product_color_id) UNIQUE
#  index_color_slots_on_palette_id_and_slot_type_and_position  (palette_id,slot_type,position)
#  index_color_slots_on_product_color_id                       (product_color_id)
#
# Foreign Keys
#
#  fk_rails_...  (palette_id => palettes.id)
#  fk_rails_...  (product_color_id => product_colors.id)
#
class ColorSlot < ApplicationRecord
  belongs_to :palette
  belongs_to :product_color

  SLOT_TYPES = %w[background main secondary accent].freeze

  SLOT_CATEGORIES = {
    "background" => "fabric",
    "main" => "thread",
    "secondary" => "thread",
    "accent" => "thread"
  }.freeze

  validates :slot_type, inclusion: { in: SLOT_TYPES }
  validates :position, presence: true
  validates :product_color_id, uniqueness: { scope: :palette_id, message: "is already in this palette" }
  validate :slot_type_limit_not_exceeded, on: :create
  validate :product_color_matches_slot_category

  scope :by_type, ->(type) { where(slot_type: type).order(:position) }
  scope :background, -> { by_type("background") }
  scope :main, -> { by_type("main") }
  scope :secondary, -> { by_type("secondary") }
  scope :accent, -> { by_type("accent") }

  before_create :set_position

  private

  def set_position
    max_position = palette.color_slots.where(slot_type: slot_type).maximum(:position) || -1
    self.position = max_position + 1
  end

  def slot_type_limit_not_exceeded
    return unless palette && slot_type

    max = Palette::SLOT_LIMITS[slot_type][:max]
    current_count = palette.section_slots(slot_type).select(&:persisted?).length

    if current_count >= max
      errors.add(:base, "##{slot_type.capitalize} section is full (maximum #{max})")
    end
  end

  def product_color_matches_slot_category
    return unless product_color && slot_type

    expected_category = SLOT_CATEGORIES[slot_type]
    actual_category = product_color.brand&.category

    if actual_category != expected_category
      errors.add(:product_color, "must be a #{expected_category} for the #{slot_type} slot")
    end
  end
end
