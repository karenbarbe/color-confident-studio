class AddFeaturedToBrands < ActiveRecord::Migration[8.0]
  def change
    add_column :brands, :featured, :string, default: "general", null: false
    add_index :brands, :featured
  end
end
