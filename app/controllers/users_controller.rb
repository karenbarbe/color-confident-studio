class UsersController < ApplicationController
  allow_unauthenticated_access only: [ :new, :create ]
  before_action :set_user, only: [ :show, :destroy ]
  def new
    @user = User.new
  end

  def create
    @user = User.new(registration_params)
    if @user.save
      start_new_session_for @user, remember: true
      redirect_to dashboard_path
    else
      render :new, alert: "Unable to create account."
    end
  end

  def show
    authorize @user
  end

  def destroy
    authorize @user
    @user.destroy
    redirect_to root_path, notice: "Account deleted."
  end

  private

  def registration_params
    params.require(:user).permit(:first_name, :last_name, :username, :email_address, :password, :password_confirmation)
  end

  def set_user
    @user = User.find(params[:id])
  end

  def skip_authorization?
    true
  end
end
