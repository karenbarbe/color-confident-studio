class PalettePolicy < ApplicationPolicy
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

  def studio?
    owner?
  end

  def pick_color?
    owner?
  end

  def publish?
    owner?
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      scope.where(creator: user)
    end
  end

  private

  def owner?
    record.creator == user
  end
end
