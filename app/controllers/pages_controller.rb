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
  end
end
