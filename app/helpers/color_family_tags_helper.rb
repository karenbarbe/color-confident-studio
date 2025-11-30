module ColorFamilyTagsHelper
  COLOR_FAMILY_TAGS = [
    { name: "Red", color: "bg-red-500" },
    { name: "Red-orange", color: "bg-orange-600" },
    { name: "Orange", color: "bg-orange-500" },
    { name: "Yellow-orange", color: "bg-amber-500" },
    { name: "Yellow", color: "bg-yellow-400" },
    { name: "Yellow-green", color: "bg-lime-500" },
    { name: "Green", color: "bg-green-600" },
    { name: "Blue-green", color: "bg-teal-500" },
    { name: "Blue", color: "bg-blue-700" },
    { name: "Blue-violet", color: "bg-indigo-500" },
    { name: "Violet", color: "bg-purple-500" },
    { name: "Red-violet", color: "bg-pink-500" },
    { name: "Warm neutral", color: "bg-stone-400" },
    { name: "Cool neutral", color: "bg-slate-400" },
    { name: "Gray", color: "bg-gray-400" }
  ].freeze

  def color_family_tags
    COLOR_FAMILY_TAGS
  end
end
