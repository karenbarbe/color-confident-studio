# == Schema Information
#
# Table name: users
#
#  id                :bigint           not null, primary key
#  email_address     :string           not null
#  first_name        :string
#  last_name         :string
#  password_digest   :string           not null
#  stash_items_count :integer          default(0), not null
#  username          :string           not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#
# Indexes
#
#  index_users_on_email_address  (email_address) UNIQUE
#  index_users_on_username       (username) UNIQUE
#
class User < ApplicationRecord
  has_secure_password
  has_many :sessions, dependent: :destroy
  has_many :stash_items, foreign_key: "owner_id", dependent: :destroy

  normalizes :email_address, with: ->(e) { e.strip.downcase }
end
