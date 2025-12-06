class CreatePalettes < ActiveRecord::Migration[8.0]
  def change
    create_table :palettes do |t|
      t.string :name
      t.references :creator, null: false, foreign_key: { to_table: :users }, index: false
      t.text :description

      t.timestamps
    end
  end
end
