class RemoveFeaturedFromBrands < ActiveRecord::Migration[8.0]
  def change
    remove_column :brands, :featured, :string, default: "general", null: false
  end
end
