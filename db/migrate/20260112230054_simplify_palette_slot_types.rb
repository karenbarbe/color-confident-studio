class SimplifyPaletteSlotTypes < ActiveRecord::Migration[8.0]
  def up
    # Convert all thread-related slot types to 'thread'
    execute <<-SQL
      UPDATE color_slots
      SET slot_type = 'thread'
      WHERE slot_type IN ('main', 'secondary', 'accent')
    SQL

    # Remove status column and its index
    remove_index :palettes, :status if index_exists?(:palettes, :status)
    remove_column :palettes, :status
  end

  def down
    add_column :palettes, :status, :string, default: 'draft', null: false
    add_index :palettes, :status
    # Note: Cannot reverse slot_type changes - data loss
  end
end
