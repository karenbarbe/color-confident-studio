class ChangeWishListToWishListInStashItems < ActiveRecord::Migration[8.0]
  def up
    StashItem.where(ownership_status: "wish list").update_all(ownership_status: "wish_list")
  end

  def down
    StashItem.where(ownership_status: "wish_list").update_all(ownership_status: "wish list")
  end
end
