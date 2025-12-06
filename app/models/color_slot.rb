# == Schema Information
#
# Table name: color_slots
#
#  id               :bigint           not null, primary key
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  palette_id       :bigint           not null
#  product_color_id :bigint           not null
#
# Indexes
#
#  index_color_slots_on_palette_id        (palette_id)
#  index_color_slots_on_product_color_id  (product_color_id)
#
# Foreign Keys
#
#  fk_rails_...  (palette_id => palettes.id)
#  fk_rails_...  (product_color_id => product_colors.id)
#
class ColorSlot < ApplicationRecord
  belongs_to :palette
  belongs_to :product_color
end
