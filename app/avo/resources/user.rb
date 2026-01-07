class Avo::Resources::User < Avo::BaseResource
  self.title = :username
  self.includes = []
  self.description = "Manage user accounts"
  self.devise_password_optional = true

  def fields
    field :id, as: :id
    field :email, as: :text, required: true, link_to_record: true
    field :username, as: :text
    field :first_name, as: :text
    field :last_name, as: :text
    field :admin, as: :boolean
    field :stash_items_count, as: :number, sortable: true

    # Associations
    field :stash_items, as: :has_many
    field :palettes, as: :has_many

    # Timestamps
    field :created_at, as: :date_time, sortable: true
    field :updated_at, as: :date_time, hide_on: [ :index ]
  end
end
