module FabricPresetsHelper
  FABRIC_PRESETS = [
    { name: "White", hex: "#FFFFFF", oklch_l: 1.0 },
    { name: "Antique White", hex: "#FAF0E6", oklch_l: 0.95 },
    { name: "Natural Linen", hex: "#C4B69C", oklch_l: 0.74 },
    { name: "Black", hex: "#1a1a1a", oklch_l: 0.12 }
  ].freeze

  def fabric_presets
    FABRIC_PRESETS
  end
end
