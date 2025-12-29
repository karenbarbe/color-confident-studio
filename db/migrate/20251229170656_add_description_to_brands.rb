class AddDescriptionToBrands < ActiveRecord::Migration[8.0]
  def change
    add_column :brands, :description, :text
  end
end
