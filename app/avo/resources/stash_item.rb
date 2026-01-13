class Avo::Resources::StashItem < Avo::BaseResource
  self.title = :id
  self.includes = [ :owner, :product_color ]
  self.description = "User stash items (fabric collection)"

  def fields
    field :id, as: :id
    field :owner, as: :belongs_to
    field :product_color, as: :belongs_to
    field :ownership_status, as: :select, enum: ::StashItem.ownership_statuses

    field :created_at, as: :date_time, sortable: true
  end
end
