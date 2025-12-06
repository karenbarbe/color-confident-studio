class AddStatusColumnToPalettes < ActiveRecord::Migration[8.0]
  def change
    add_column :palettes, :status, :string, null: false, default: "draft"
    add_index :palettes, :status
  end
end
