class Avo::Resources::User < Avo::BaseResource
  # self.includes = []
  # self.attachments = []
  # self.search = {
  #   query: -> { query.ransack(id_eq: q, m: "or").result(distinct: false) }
  # }

  def fields
    field :id, as: :id
    field :email_address, as: :text
    field :username, as: :text
    field :first_name, as: :text
    field :last_name, as: :text
    field :stash_items_count, as: :number
    field :admin, as: :boolean
    field :sessions, as: :has_many
    field :stash_items, as: :has_many
    field :palettes, as: :has_many
  end
end
