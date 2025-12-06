class CreateColorSlots < ActiveRecord::Migration[8.0]
  def change
    create_table :color_slots do |t|
      t.references :palette, null: false, foreign_key: { to_table: :palettes }
      t.references :product_color, null: false, foreign_key: { to_table: :product_colors }

      t.timestamps
    end
  end
end
