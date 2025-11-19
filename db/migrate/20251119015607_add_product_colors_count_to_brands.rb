class AddProductColorsCountToBrands < ActiveRecord::Migration[8.0]
  def change
    add_column :brands, :product_colors_count, :integer, default: 0, null: false
  end
end
