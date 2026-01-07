class Avo::Resources::ColorSlot < Avo::BaseResource
  self.title = :id
  self.includes = [ :palette, :product_color ]
  self.description = "Color slots within palettes"

  # Hide from sidebar since it's accessed via Palette
  self.visible_on_sidebar = false

  def fields
    field :id, as: :id
    field :palette, as: :belongs_to
    field :product_color, as: :belongs_to
    field :slot_type, as: :text
    field :position, as: :number

    field :created_at, as: :date_time, sortable: true
  end
end
