class CreateProductColors < ActiveRecord::Migration[8.0]
  def change
    create_table :product_colors do |t|
      t.string :name
      t.string :vendor_code
      t.references :brand, null: false, foreign_key: true
      t.string :hex_color

      t.timestamps
    end
  end
end
