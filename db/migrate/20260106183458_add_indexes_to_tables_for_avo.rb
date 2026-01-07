class AddIndexesToTablesForAvo < ActiveRecord::Migration[8.0]
  def change
    # Add indexes on created_at for tables that don't have them
    add_index :brands, :created_at unless index_exists?(:brands, :created_at)
    add_index :product_colors, :created_at unless index_exists?(:product_colors, :created_at)
    add_index :palettes, :created_at unless index_exists?(:palettes, :created_at)
    add_index :color_slots, :created_at unless index_exists?(:color_slots, :created_at)
    add_index :stash_items, :created_at unless index_exists?(:stash_items, :created_at)
  end
end
