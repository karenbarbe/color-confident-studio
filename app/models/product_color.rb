# == Schema Information
#
# Table name: product_colors
#
#  id                :bigint           not null, primary key
#  color_family      :string
#  hex_color         :string
#  name              :string
#  oklch_c           :decimal(4, 3)
#  oklch_h           :decimal(6, 3)
#  oklch_l           :decimal(4, 3)
#  stash_items_count :integer          default(0), not null
#  vendor_code       :string
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  brand_id          :bigint           not null
#
# Indexes
#
#  index_product_colors_on_brand_id      (brand_id)
#  index_product_colors_on_color_family  (color_family)
#  index_product_colors_on_created_at    (created_at)
#  index_product_colors_on_oklch_c       (oklch_c)
#  index_product_colors_on_oklch_h       (oklch_h)
#  index_product_colors_on_oklch_l       (oklch_l)
#
# Foreign Keys
#
#  fk_rails_...  (brand_id => brands.id)
#
class ProductColor < ApplicationRecord
  belongs_to :brand, counter_cache: true
  has_many :stash_items, dependent: :destroy

  COLOR_FAMILIES = [
    "Red", "Red-orange", "Orange", "Yellow-orange", "Yellow", "Yellow-green", "Green", "Blue-green", "Blue", "Blue-violet", "Violet", "Red-violet", "Warm neutral", "Cool neutral", "Gray"
  ].freeze

  validates :color_family, inclusion: { in: COLOR_FAMILIES }, allow_blank: true

  scope :by_family, ->(family) { where(color_family: family) }
  scope :neutrals, -> { where(color_family: [ "Warm neutral", "Cool neutral", "Gray" ]) }
  scope :chromatic, -> { where.not(color_family: [ "Warm neutral", "Cool neutral", "Gray" ]) }
end
