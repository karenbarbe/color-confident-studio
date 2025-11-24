class ChangeOwnershipStatusDefaultInStashItems < ActiveRecord::Migration[8.0]
  def up
    # Remove default "pending"
    change_column_default :stash_items, :ownership_status, from: "pending", to: nil

    # Turn all existing "pending" values into nil
    StashItem.where(ownership_status: "pending").update_all(ownership_status: nil)
  end

  def down
    # Restore default
    change_column_default :stash_items, :ownership_status, from: nil, to: "pending"

    # Optionally turn nils back to "pending"
    StashItem.where(ownership_status: nil).update_all(ownership_status: "pending")
  end
end
