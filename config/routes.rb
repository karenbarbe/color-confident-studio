Rails.application.routes.draw do
  root "pages#home"

  get "/dashboard" => "pages#dashboard", as: :dashboard

  # Color charts routes
  get "/color-charts" => "color_charts#index", as: :color_charts
  get "/color-charts/:category" => "color_charts#category", as: :color_chart_category
  get "/color-charts/:category/:brand_slug" => "color_charts#show", as: :color_chart
  get "/color-charts/:category/:brand_slug/:color_id" => "product_colors#show", as: :color_chart_color

  # Custom sign in and sign out routes
  get "/login" => "sessions#new", as: :login
  post "/login" => "sessions#create"

  get "/signup" => "users#new", as: :signup

  resources :users, only: [ :new, :create, :show ]
  resource :session, only: [ :new, :create, :destroy ]
  resources :passwords, param: :token

  resources :palettes do
    member do
      get :studio
      get :pick_color
      patch :publish
    end
    resources :color_slots, only: [ :create, :destroy  ]
  end

  resources :product_colors, only: [ :index, :show ]
  resources :stash_items do
    member do
      patch :update_ownership_status
    end
  end

end
