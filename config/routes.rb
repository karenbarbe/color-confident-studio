Rails.application.routes.draw do
  root "pages#home"

  resources :users
  resources :stash_items
  resource :session
  resources :passwords, param: :token
  resources :product_colors
  # This is a blank app! Pick your first screen, build out the RCAV, and go from there. E.g.:
  # get("/your_first_screen", { :controller => "pages", :action => "first" })
end
