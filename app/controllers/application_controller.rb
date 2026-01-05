class ApplicationController < ActionController::Base
  include Authentication
  include Pundit::Authorization

  after_action :verify_authorized, unless: :skip_authorization?
  after_action :verify_policy_scoped, if: :verify_policy_scope?

  rescue_from Pundit::NotAuthorizedError, with: :user_not_authorized

  private

  def pundit_user
    Current.user
  end

  def user_not_authorized
    flash[:alert] = "You are not authorized to perform this action."
    redirect_back(fallback_location: root_path)
  end

  def skip_authorization?
    false
  end

  def verify_policy_scope?
    action_name == "index" && !skip_authorization?
  end
end
