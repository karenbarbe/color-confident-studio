Rails.application.routes.draw do
  get "color_libraries/index"
  get "color_libraries/show"
  root "pages#home"

  get "/dashboard" => "pages#dashboard", as: :dashboard

  # Color Libraries routes
  get "/color-libraries" => "color_libraries#index", as: :color_libraries
  get "/color-libraries/:id" => "color_libraries#show", as: :color_library

  # Custom sign in and sign out routes
  get "/login" => "sessions#new", as: :login
  post "/login" => "sessions#create"

  get "/signup" => "users#new", as: :signup

  resources :users, only: [ :new, :create, :show ]
  resource :session, only: [ :new, :create, :destroy ]
  resources :passwords, param: :token

  resources :product_colors, only: [ :index, :show ]
  resources :stash_items

end
