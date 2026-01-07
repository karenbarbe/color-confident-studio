class UserPolicy < ApplicationPolicy
  def show?
    own_record? || admin?
  end

  def destroy?
    user&.admin? && record != user
  end

  def update?
    user&.admin?
  end

  private

  def own_record?
    record == user
  end
end
