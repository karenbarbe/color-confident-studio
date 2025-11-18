class CreateStashItems < ActiveRecord::Migration[8.0]
  def change
    create_table :stash_items do |t|
      t.references :owner, null: false, foreign_key: { to_table: :users }, index: false
      t.references :product_color, null: false, foreign_key: true

      t.timestamps
    end
  end
end
