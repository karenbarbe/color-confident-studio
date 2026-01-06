class ProductColorPolicy < ApplicationPolicy
  def index?
    admin? # Only admins can see the admin list
  end

  def show?
    true # Public product details
  end

  def create?
    admin?
  end

  def update?
    admin?
  end

  def destroy?
    admin?
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      scope.all
    end
  end
end
