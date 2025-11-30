namespace :db do
  namespace :seed do
    desc "Load all seed data"
    task all: :environment do
      require "csv"

      puts "Starting to seed data..."

      # 1. Load brands
      puts "Loading brands..."
      CSV.foreach(Rails.root.join("db", "seeds", "brands.csv"), headers: true) do |row|
        Brand.find_or_create_by!(slug: row["slug"]) do |brand|
          brand.name = row["name"]
          brand.category = row["category"]
          brand.featured = row["featured"]
        end
      end
      puts "  ✓ Loaded #{Brand.count} brands"

      # 2. Load product colors
      puts "Loading product colors..."

      # Define the mapping between brand slugs and their CSV files
      product_color_files = {
        "dmc-mouline-special" => "product_color_dmc_mouline_special.csv",
        "kona-cotton-solids" => "product_color_kona_cotton_solids.csv"
      }

      product_color_files.each do |brand_slug, csv_filename|
        brand = Brand.find_by!(slug: brand_slug)
        csv_path = Rails.root.join("db", "seeds", csv_filename)

        next unless File.exist?(csv_path)

        puts "  Loading colors for #{brand.name}..."

        CSV.foreach(csv_path, headers: true) do |row|
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
        { username: "bob_crafter", email: "bob@example.com", first_name: "Bob", last_name: "Brown" }
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
            ownership_status: %w[owned wish_list].sample,
            favorite: [ true, false, false, false ].sample
          )
        end
      end
      puts "  ✓ Created #{StashItem.count} stash items"

      puts "Seeding complete!"
    end
  end
end
