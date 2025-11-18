# == Schema Information
#
# Table name: stash_items
#
#  id               :bigint           not null, primary key
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  owner_id         :bigint           not null
#  product_color_id :bigint           not null
#
# Indexes
#
#  index_stash_items_on_product_color_id  (product_color_id)
#
# Foreign Keys
#
#  fk_rails_...  (owner_id => users.id)
#  fk_rails_...  (product_color_id => product_colors.id)
#
class StashItem < ApplicationRecord
  belongs_to :owner, class_name: "User", counter_cache: true
  belongs_to :product_color, counter_cache: true
end
