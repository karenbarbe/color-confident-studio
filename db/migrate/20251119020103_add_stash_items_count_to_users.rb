class AddStashItemsCountToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :stash_items_count, :integer, default: 0, null: false
  end
end
