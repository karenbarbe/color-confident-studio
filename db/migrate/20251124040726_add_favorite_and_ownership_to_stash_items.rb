class AddFavoriteAndOwnershipToStashItems < ActiveRecord::Migration[8.0]
  def change
    add_column :stash_items, :favorite, :boolean, default: false
    add_column :stash_items, :ownership_status, :string, default: "pending"
    add_index :stash_items, :favorite
    add_index :stash_items, :ownership_status
  end
end
