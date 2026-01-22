Rails.application.routes.draw do
  root "pages#home"

  get "/dashboard" => "pages#dashboard", as: :dashboard

  # Color charts routes
  get "/color-charts" => "color_charts#index", as: :color_charts
  get "/color-charts/:category" => "color_charts#category", as: :color_chart_category
  get "/color-charts/:category/:brand_slug" => "color_charts#show", as: :color_chart
  get "/color-charts/:category/:brand_slug/:color_id" => "product_colors#show", as: :color_chart_color

  # Fabric picker routes
  scope :fabric_picker, controller: :fabric_picker do
    get "/" => :root, as: :fabric_picker_root
    get "/presets" => :presets, as: :fabric_picker_presets
    get "/brands" => :brands, as: :fabric_picker_brands
    get "/brands/:brand_id/families" => :families, as: :fabric_picker_families
    get "/brands/:brand_id/families/:family/colors" => :colors, as: :fabric_picker_colors
    get "/stash/families" => :stash_families, as: :fabric_picker_stash_families
    get "/stash/families/:family/colors" => :stash_colors, as: :fabric_picker_stash_colors
  end

  # Custom sign in and sign out routes
  get "/login" => "sessions#new", as: :login
  post "/login" => "sessions#create"

  get "/signup" => "users#new", as: :signup

  resources :users, only: [ :new, :create, :show, :edit, :update ]
  resource :session, only: [ :new, :create, :destroy ]
  resources :passwords, param: :token

  resources :palettes do
    member do
      get :color_picker_content
      get :matching_colors
      patch :batch_update
    end
  end

  resources :product_colors, only: [ :index, :show ]
  resources :stash_items do
    member do
      patch :update_ownership_status
    end
  end

end
