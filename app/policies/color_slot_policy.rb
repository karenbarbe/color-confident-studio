class ColorSlotPolicy < ApplicationPolicy
  def create?
    palette_owner? && record.palette.draft?
  end

  def destroy?
    palette_owner?
  end

  private

  def palette_owner?
    record.palette.creator == user
  end
end
