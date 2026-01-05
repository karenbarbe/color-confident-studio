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
    owner? && record.draft?
  end

  def destroy?
    owner?
  end

  def studio?
    owner? && record.draft?
  end

  def pick_color?
    owner? && record.draft?
  end

  def publish?
    owner? && record.draft?
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
