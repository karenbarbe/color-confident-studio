class PagesController < ApplicationController
  allow_unauthenticated_access(only: :home)

  def home
    if authenticated?
      redirect_to dashboard_path
    else
      render :home
    end
  end

  def dashboard
    @recent_palettes = Current.user.palettes
                              .complete
                              .includes(color_slots: :product_color)
                              .order(updated_at: :desc)
                              .limit(6)

    load_stash_summary
  end

  def skip_authorization?
    true
  end

  private

  def load_stash_summary
    stash_items = Current.user.stash_items
                         .joins(product_color: :brand)
                         .includes(product_color: :brand)

    @stash_total_count = stash_items.count
    @stash_owned_count = stash_items.where(ownership_status: :owned).count
    @stash_wish_list_count = stash_items.where(ownership_status: :wish_list).count

    # Find top color family
    @top_color_family = stash_items
                      .joins(:product_color)
                      .where.not(product_colors: { color_family: [ nil, "" ] })
                      .group("product_colors.color_family")
                      .order(Arel.sql("COUNT(*) DESC"))
                      .limit(1)
                      .pick("product_colors.color_family")
  end
end
