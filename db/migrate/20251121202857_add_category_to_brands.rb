class AddCategoryToBrands < ActiveRecord::Migration[8.0]
  def change
    add_column :brands, :category, :string, default: "general"
    add_index :brands, :category
  end
end
