module SidebarHelper
  def user_initials(user)
    if user.first_name.present? && user.last_name.present?
      "#{user.first_name[0]}#{user.last_name[0]}".upcase
    elsif user.first_name.present?
      user.first_name[0..1].upcase
    elsif user.username.present?
      user.username[0..1].upcase
    else
      "??"
    end
  end

  def sidebar_item_active?(item)
    case item
    when :home
      current_page?(dashboard_path)
    when :browse
      controller_name == "color_libraries" ||
        (controller_name == "product_colors" && action_name == "show")
    when :create
      controller_name == "palettes" && action_name == "studio"
    when :stash
      controller_name == "stash_items"
    when :palettes
      controller_name == "palettes" && (action_name == "index" || action_name == "show")
    when :more
      false # "More" dropdown is never active
    else
      false
    end
  end

  def sidebar_item_classes(item)
    base_classes = "sidebar-item group"
    active_classes = sidebar_item_active?(item) ? "active" : "text-base-content/60"
    "#{base_classes} #{active_classes}"
  end
end
