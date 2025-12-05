class ColorSlot < ApplicationRecord
  belongs_to :palette
  belongs_to :product_color
end
