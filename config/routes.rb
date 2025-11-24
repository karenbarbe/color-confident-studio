Rails.application.routes.draw do
 root "pages#home"

  get "/dashboard" => "pages#dashboard", as: :dashboard

  # Color Libraries routes
  get "/color-libraries" => "color_libraries#index", as: :color_libraries
  get "/color-libraries/:category" => "color_libraries#category", as: :color_library_category
  get "/color-libraries/:category/:brand_slug" => "color_libraries#show", as: :color_library
  get "/color-libraries/:category/:brand_slug/:color_id" => "product_colors#show", as: :color_library_color

  # Custom sign in and sign out routes
  get "/login" => "sessions#new", as: :login
  post "/login" => "sessions#create"

  get "/signup" => "users#new", as: :signup

  resources :users, only: [ :new, :create, :show ]
  resource :session, only: [ :new, :create, :destroy ]
  resources :passwords, param: :token

  resources :product_colors, only: [ :index, :show ]
  resources :stash_items do
    member do
      patch :toggle_favorite
      patch :update_ownership_status
    end
  end

end
