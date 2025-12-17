# == Schema Information
#
# Table name: palettes
#
#  id          :bigint           not null, primary key
#  description :text
#  name        :string
#  status      :string           default("draft"), not null
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  creator_id  :bigint           not null
#
# Indexes
#
#  index_palettes_on_status  (status)
#
# Foreign Keys
#
#  fk_rails_...  (creator_id => users.id)
#
class Palette < ApplicationRecord
  belongs_to :creator, class_name: "User"
  has_many :color_slots, dependent: :destroy
  has_many :product_colors, through: :color_slots

  enum :status, { draft: "draft", published: "published" }

  scope :with_content, -> {
    left_joins(:color_slots)
      .group("palettes.id")
      .having("palettes.name IS NOT NULL AND palettes.name != '' OR COUNT(color_slots.id) > 0")
    }

  validates :name, presence: true, if: :published?

  SLOT_LIMITS = {
    "background" => { min: 1, max: 1 },
    "main" => { min: 1, max: 6 },
    "secondary" => { min: 1, max: 4 },
    "accent" => { min: 1, max: 2 }
  }.freeze

  # Methods for accessing colors by slot type
  def section_slots(slot_type)
    color_slots.select { |slot| slot.slot_type == slot_type }
  end

  def background_color
    section_slots("background").first&.product_color
  end

  # Validation helpers

  def slot_full?(slot_type)
    section_slots(slot_type).length >= SLOT_LIMITS[slot_type][:max]
  end

  def slot_minimum_met?(slot_type)
    section_slots(slot_type).length >= SLOT_LIMITS[slot_type][:min]
  end

  def all_minimums_met?
    SLOT_LIMITS.keys.all? { |slot_type| slot_minimum_met?(slot_type) }
  end

  def can_publish?
    name.present? && all_minimums_met?
  end

  def missing_requirements
    missing = []
    missing << "Palette name is required" if name.blank?

    SLOT_LIMITS.each do |slot_type, limits|
      current = section_slots(slot_type).length
      if current < limits[:min]
        needed = limits[:min] - current
        missing << "#{slot_type.capitalize} needs #{needed} more color#{'s' if needed > 1}"
      end
    end

    missing
  end

  # Publishing method
  def publish!
    if can_publish?
      update!(status: :published)
      true
    else
      false
    end
  end
end
