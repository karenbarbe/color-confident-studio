# == Schema Information
#
# Table name: brands
#
#  id                   :bigint           not null, primary key
#  name                 :string
#  product_colors_count :integer          default(0), not null
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#
class Brand < ApplicationRecord
  has_many :product_colors, dependent: :destroy
end
