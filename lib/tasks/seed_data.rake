namespace :db do
  namespace :seed do
    desc "Load all seed data"

    def fetch_csv_from_github(filename)
      require "http"
      require "base64"

      url = "https://api.github.com/repos/karenbarbe/color-confident-data/contents/#{filename}"
      response = HTTP.auth("Bearer #{Rails.application.credentials.github.seed_data_token}").get(url)
      data = JSON.parse(response.body.to_s)
      Base64.decode64(data["content"])
    end

    task all: :environment do
      require "csv"

      puts "Starting to seed data..."

      # 1. Load brands
      puts "Loading brands..."
      brands_content = fetch_csv_from_github("brands.csv")
      CSV.parse(brands_content, headers: true) do |row|
        Brand.find_or_create_by!(slug: row["slug"]) do |brand|
          brand.name = row["name"]
          brand.category = row["category"]
          brand.description = row["description"]
        end
      end
      puts "  ✓ Loaded #{Brand.count} brands"

      # 2. Load product colors
      puts "Loading product colors..."

      # Define the mapping between brand slugs and their CSV files
      product_color_files = {
        "dmc-mouline-special" => "product_color_dmc_mouline_special.csv",
        "kona-cotton-solids" => "product_color_kona_cotton_solids.csv",
        "aurifil-cotton-floss" => "product_color_aurifil_cotton_floss.csv"
      }

      product_color_files.each do |brand_slug, csv_filename|
        brand = Brand.find_by!(slug: brand_slug)
        colors_content = fetch_csv_from_github(csv_filename)

        puts "  Loading colors for #{brand.name}..."

        CSV.parse(colors_content, headers: true) do |row|
          ProductColor.find_or_create_by!(brand: brand, vendor_code: row["vendor_code"]) do |color|
            color.name = row["name"]
            color.hex_color = row["hex_color"]
            color.oklch_l = row["oklch_l"]
            color.oklch_c = row["oklch_c"]
            color.oklch_h = row["oklch_h"]
            color.color_family = row["color_family"]
          end
        end
      end

      puts "  ✓ Loaded #{ProductColor.count} product colors"

      # 3. Create users
      puts "Creating sample users..."
      users_data = [
        { username: "alice_artist", email: "alice@example.com", first_name: "Alice", last_name: "Anderson" },
        { username: "carmen_crafter", email: "carmen@example.com", first_name: "Carmen", last_name: "Barista" }
      ]
      users_data.each do |user_data|
        User.find_or_create_by!(username: user_data[:username]) do |user|
          user.email_address = user_data[:email]
          user.first_name = user_data[:first_name]
          user.last_name = user_data[:last_name]
          user.password = "appdev"
        end
      end
      puts "  ✓ Created #{User.count} users"

      # 4. Create stash items
      puts "Creating sample stash items..."
      User.find_each do |user|
        next if user.stash_items.any?

        num_colors = rand(5..15)
        ProductColor.order("RANDOM()").limit(num_colors).each do |color|
          StashItem.create!(
            owner: user,
            product_color: color,
            ownership_status: %w[owned wish_list].sample
          )
        end
      end
      puts "  ✓ Created #{StashItem.count} stash items"

      puts "Seeding complete!"
    end
  end
end
