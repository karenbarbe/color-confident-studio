# == Schema Information
#
# Table name: palettes
#
#  id          :bigint           not null, primary key
#  description :text
#  name        :string
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  creator_id  :bigint           not null
#
# Foreign Keys
#
#  fk_rails_...  (creator_id => users.id)
#
class Palette < ApplicationRecord
  belongs_to :creator, class_name: "User"
end
