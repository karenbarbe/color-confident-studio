# == Schema Information
#
# Table name: product_colors
#
#  id          :bigint           not null, primary key
#  hex_color   :string
#  name        :string
#  vendor_code :string
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  brand_id    :bigint           not null
#
# Indexes
#
#  index_product_colors_on_brand_id  (brand_id)
#
# Foreign Keys
#
#  fk_rails_...  (brand_id => brands.id)
#
class ProductColor < ApplicationRecord
  belongs_to :brand, counter_cache: true
end
