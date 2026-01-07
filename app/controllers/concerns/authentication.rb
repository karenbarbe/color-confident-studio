module Authentication
  extend ActiveSupport::Concern

  included do
    # Resume session even on pages that skip authentication,
    # so logged-in users still get personalized features (e.g., stash indicators)
    before_action :resume_session
    before_action :require_authentication
    helper_method :authenticated?
  end

  class_methods do
    def allow_unauthenticated_access(**options)
      skip_before_action :require_authentication, **options
    end
  end

  private
    def authenticated?
      resume_session
    end

    def require_authentication
      resume_session || request_authentication
    end

    def resume_session
      Current.session ||= find_session_by_cookie
    end

    def find_session_by_cookie
      Session.find_by(id: cookies.signed[:session_id]) if cookies.signed[:session_id]
    end

    def request_authentication
      session[:return_to_after_authenticating] = request.url
      redirect_to new_session_path
    end

    def after_authentication_url
      session.delete(:return_to_after_authenticating) || root_url
    end

    def start_new_session_for(user, remember: false)
      user.sessions.create!(user_agent: request.user_agent, ip_address: request.remote_ip).tap do |session|
        Current.session = session

        cookie_options = { value: session.id, httponly: true, same_site: :lax }

        if remember
          cookie_options[:expires] = 30.days.from_now
        end
        # Without :expires, cookie is deleted when browser closes

        cookies.signed[:session_id] = cookie_options
      end
    end

    def terminate_session
      Current.session.destroy
      cookies.delete(:session_id)
    end
end
