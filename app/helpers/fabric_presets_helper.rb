module FabricPresetsHelper
  FABRIC_PRESETS = [
    { name: "White", hex: "#FFFFFF", oklch_l: 1.0 },
    { name: "Warm White", hex: "#FAF8F5", oklch_l: 0.97 },
    { name: "Natural Linen", hex: "#E8E0D5", oklch_l: 0.91 },
    { name: "Taupe", hex: "#897e7c", oklch_l: 0.60 },
    { name: "Navy", hex: "#1E3A5F", oklch_l: 0.34 },
    { name: "Charcoal", hex: "#36454F", oklch_l: 0.38 },
    { name: "Black", hex: "#1a1a1a", oklch_l: 0.12 }
  ].freeze

  def fabric_presets
    FABRIC_PRESETS
  end
end
