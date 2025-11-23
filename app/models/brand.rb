# == Schema Information
#
# Table name: brands
#
#  id                   :bigint           not null, primary key
#  category             :string           default("general")
#  name                 :string
#  product_colors_count :integer          default(0), not null
#  slug                 :string
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#
# Indexes
#
#  index_brands_on_category  (category)
#  index_brands_on_slug      (slug) UNIQUE
#
class Brand < ApplicationRecord
  has_many :product_colors, dependent: :destroy

  enum :category, { thread: "thread", fabric: "fabric" }

  validates :slug, presence: true, uniqueness: true
end
