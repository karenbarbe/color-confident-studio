class AddOklchColumnsToProductColors < ActiveRecord::Migration[8.0]
  def change
    add_column :product_colors, :oklch_l, :decimal, precision: 4, scale: 3
    add_column :product_colors, :oklch_c, :decimal, precision: 4, scale: 3
    add_column :product_colors, :oklch_h, :decimal, precision: 6, scale: 3

    add_index :product_colors, :oklch_l
    add_index :product_colors, :oklch_c
    add_index :product_colors, :oklch_h
  end
end
