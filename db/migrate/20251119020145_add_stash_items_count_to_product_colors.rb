class AddStashItemsCountToProductColors < ActiveRecord::Migration[8.0]
  def change
    add_column :product_colors, :stash_items_count, :integer, default: 0, null: false
  end
end
