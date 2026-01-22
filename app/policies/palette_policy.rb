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

  def edit?
    owner?
  end

  def matching_colors?
    edit?
  end

  def color_picker_content?
    edit?
  end

  def batch_update?
    edit?
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
