class PalettesController < ApplicationController
  before_action :set_palette, only: %i[ show edit update destroy ]
  before_action :ensure_current_user_is_creator, only: %i[ show edit update destroy ]
  layout "dock"

  # GET /palettes or /palettes.json
  def index
    @palettes = Palette.where(creator: Current.user).order(created_at: :desc)
  end

  # GET /palettes/1 or /palettes/1.json
  def show
  end

  # GET /palettes/new
  def new
    @palette = Palette.new
  end

  # GET /palettes/1/edit
  def edit
  end

  # POST /palettes or /palettes.json
  def create
    @palette = Palette.new(palette_params)
    @palette.creator = Current.user

    respond_to do |format|
      if @palette.save
        format.html { redirect_to @palette, notice: "Palette was successfully created." }
        format.json { render :show, status: :created, location: @palette }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @palette.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /palettes/1 or /palettes/1.json
  def update
    respond_to do |format|
      if @palette.update(palette_params)
        format.html { redirect_to @palette, notice: "Palette was successfully updated." }
        format.json { render :show, status: :ok, location: @palette }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @palette.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /palettes/1 or /palettes/1.json
  def destroy
    @palette.destroy!

    respond_to do |format|
      format.html { redirect_to palettes_path, status: :see_other, notice: "Palette was successfully destroyed." }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_palette
      @palette = Palette.find(params.expect(:id))
    end

    def ensure_current_user_is_creator
      if Current.user != @palette.creator
        redirect_back fallback_location: root_url, alert: "You're not authorized for that."
      end
    end

    # Only allow a list of trusted parameters through.
    def palette_params
      params.expect(palette: [ :name, :description ])
    end
end
