class AddSubheadingToBrands < ActiveRecord::Migration[8.0]
  def change
    add_column :brands, :subheading, :text
  end
end
