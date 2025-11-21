Rails.application.routes.draw do
  root "pages#home"

  get "/dashboard" => "pages#dashboard", as: :dashboard

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
