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

  def pick_color?
    owner?
  end

  def panel_content?
    edit?
  end

  def matching_threads?
    edit?
  end

  def background_picker?
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
