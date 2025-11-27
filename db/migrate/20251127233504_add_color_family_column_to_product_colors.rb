class AddColorFamilyColumnToProductColors < ActiveRecord::Migration[8.0]
  def change
    add_column :product_colors, :color_family, :string
    add_index :product_colors, :color_family
  end
end
