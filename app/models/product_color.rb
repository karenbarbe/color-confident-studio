# == Schema Information
#
# Table name: product_colors
#
#  id          :bigint           not null, primary key
#  hex_color   :string
#  name        :string
#  oklch_c     :decimal(4, 3)
#  oklch_h     :decimal(6, 3)
#  oklch_l     :decimal(4, 3)
#  vendor_code :string
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  brand_id    :bigint           not null
#
# Indexes
#
#  index_product_colors_on_brand_id  (brand_id)
#  index_product_colors_on_oklch_c   (oklch_c)
#  index_product_colors_on_oklch_h   (oklch_h)
#  index_product_colors_on_oklch_l   (oklch_l)
#
# Foreign Keys
#
#  fk_rails_...  (brand_id => brands.id)
#
class ProductColor < ApplicationRecord
  belongs_to :brand, counter_cache: true
  has_many :stash_items, dependent: :destroy
end
