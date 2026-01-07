class Avo::Resources::Brand < Avo::BaseResource
  self.title = :name
  self.includes = []
  self.description = "Manage fabric brands"

  def fields
    field :id, as: :id
    field :name, as: :text, required: true, link_to_record: true
    field :slug, as: :text
    field :category, as: :select, options: -> { Brand.categories.keys.map { |k| [ k.humanize, k ] }.to_h }
    field :description, as: :textarea
    field :product_colors_count, as: :number, sortable: true

    field :created_at, as: :date_time, sortable: true
  end
end
