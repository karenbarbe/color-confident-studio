class RemoveFavoriteFromStashItems < ActiveRecord::Migration[8.0]
  def change
    remove_column :stash_items, :favorite, :boolean
  end
end
