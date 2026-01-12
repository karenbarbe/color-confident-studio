class ColorSlotPolicy < ApplicationPolicy
  def create?
    palette_owner?
  end

  def destroy?
    palette_owner?
  end

  private

  def palette_owner?
    record.palette.creator == user
  end
end
