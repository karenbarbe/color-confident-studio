class ApplicationController < ActionController::Base
  include Authentication
  skip_forgery_protection
end
