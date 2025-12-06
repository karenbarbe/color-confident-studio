class AddSlotTypeAndPositionColumnsToColorSlots < ActiveRecord::Migration[8.0]
  def change
    add_column :color_slots, :slot_type, :string, null: false, default: "main"
    add_column :color_slots, :position, :integer, null: false, default: 0

    add_index :color_slots, [ :palette_id, :slot_type, :position ]
    add_index :color_slots, [ :palette_id, :product_color_id ], unique: true
  end
end
