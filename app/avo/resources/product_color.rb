class Avo::Resources::ProductColor < Avo::BaseResource
  self.title = :name
  self.includes = [ :brand ]
  self.description = "Manage product colors from various brands"

  def fields
    field :id, as: :id
    field :name, as: :text, required: true, link_to_record: true
    field :brand, as: :belongs_to
    field :color_family, as: :text

    # OKLCH color values
    field :oklch_l, as: :number, step: 0.01, min: 0, max: 1
    field :oklch_c, as: :number, step: 0.01, min: 0
    field :oklch_h, as: :number, step: 0.1, min: 0, max: 360

    field :stash_items_count, as: :number, sortable: true

    # Associations
    field :stash_items, as: :has_many

    field :created_at, as: :date_time, sortable: true
  end
end
