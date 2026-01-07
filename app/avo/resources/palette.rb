class Avo::Resources::Palette < Avo::BaseResource
  self.title = :name
  self.includes = [ :creator ]
  self.description = "Manage user color palettes"

  def fields
    field :id, as: :id
    field :name, as: :text, required: true, link_to_record: true
    field :creator, as: :belongs_to
    field :status, as: :select, options: -> { Palette.statuses.keys.map { |k| [ k.humanize, k ] }.to_h }

    field :created_at, as: :date_time, sortable: true
  end
end
