class StashItemPolicy < ApplicationPolicy
  def index?
    true
  end

  def show?
    owner?
  end

  def create?
    user.present?
  end

  def update?
    owner?
  end

  def destroy?
    owner?
  end

  def update_ownership_status?
    owner?
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      scope.where(owner: user)
    end
  end

  private

  def owner?
    record.owner == user
  end
end
