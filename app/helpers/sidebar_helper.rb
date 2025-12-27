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
      controller_name == "color_charts" ||
        (controller_name == "product_colors" && action_name == "show")
    when :create
      controller_name == "palettes" && action_name == "studio"
    when :stash
      controller_name == "stash_items"
    when :palettes
      controller_name == "palettes" && (action_name == "index" || action_name == "show")
    when :more
      false
    else
      false
    end
  end

  def sidebar_nav_classes(item)
    classes = [ "sidebar-nav-item" ]
    classes << "active" if sidebar_item_active?(item)
    classes.join(" ")
  end
end
