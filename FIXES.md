# Prioritized Improvement Plan

**Project:** Color Confident Studio
**Reviewer:** Claude Code, Ian Heraty, Adolfo Nava
**Date:** 2026-03-03

---

## P0 — Critical (Security / Architecture / Broken Patterns)

These issues block apprenticeship readiness or represent active risk.

---

### P0-1: Zero Test Coverage

**File(s):** `spec/features/sample_spec.rb` (placeholder only), all model/controller files
**Problem:** The only test in the project is `expect(1).to eq(1)`. The entire domain model — including two custom validators in `ColorSlot`, the `ColorMatcher` service, batch_update transaction logic, Pundit policies, and stash statistics calculation — is completely untested. Any refactor risks silent regressions.

**Suggested solution:** Write tests in priority order:

1. **Model specs** for domain validation logic (highest value per line of test):

```ruby
# spec/models/color_slot_spec.rb
require "rails_helper"

RSpec.describe ColorSlot, type: :model do
  describe "validations" do
    it { should belong_to(:palette) }
    it { should belong_to(:product_color) }
    it { should validate_inclusion_of(:slot_type).in_array(%w[background thread]) }

    describe "#product_color_matches_slot_category" do
      let(:fabric_brand) { create(:brand, category: "fabric") }
      let(:thread_brand) { create(:brand, category: "thread") }
      let(:fabric_color) { create(:product_color, brand: fabric_brand) }
      let(:thread_color) { create(:product_color, brand: thread_brand) }
      let(:palette)      { create(:palette) }

      it "allows a fabric color in a background slot" do
        slot = build(:color_slot, palette: palette, product_color: fabric_color, slot_type: "background")
        expect(slot).to be_valid
      end

      it "rejects a thread color in a background slot" do
        slot = build(:color_slot, palette: palette, product_color: thread_color, slot_type: "background")
        expect(slot).not_to be_valid
        expect(slot.errors[:product_color]).to include(/must be a fabric/)
      end
    end

    describe "#slot_type_limit_not_exceeded" do
      let(:palette) { create(:palette) }
      let(:fabric_brand) { create(:brand, category: "fabric") }

      it "rejects a second background slot" do
        create(:color_slot, palette: palette, slot_type: "background",
               product_color: create(:product_color, brand: fabric_brand))
        second = build(:color_slot, palette: palette, slot_type: "background",
                       product_color: create(:product_color, brand: fabric_brand))
        expect(second).not_to be_valid
        expect(second.errors[:base]).to include(/Background section is full/)
      end
    end
  end
end
```

2. **Service spec** for `ColorMatcher`:

```ruby
# spec/services/color_matcher_spec.rb
require "rails_helper"

RSpec.describe ColorMatcher do
  let(:brand) { create(:brand, category: "thread") }

  describe "#matching_colors" do
    it "returns colors for the brand" do
      color = create(:product_color, brand: brand, color_family: "Red")
      matcher = ColorMatcher.new(brand: brand, color_family: "Red")
      expect(matcher.matching_colors).to include(color)
    end

    it "excludes specified color IDs" do
      color = create(:product_color, brand: brand)
      matcher = ColorMatcher.new(brand: brand, exclude_color_ids: [color.id])
      expect(matcher.matching_colors).not_to include(color)
    end
  end
end
```

3. **Request specs** for authorization:

```ruby
# spec/requests/palettes_spec.rb
require "rails_helper"

RSpec.describe "Palettes", type: :request do
  let(:user) { create(:user) }
  let(:other_user) { create(:user) }
  let(:palette) { create(:palette, creator: user) }

  describe "DELETE /palettes/:id" do
    it "prevents other users from destroying a palette" do
      sign_in other_user
      delete palette_path(palette)
      expect(response).to redirect_to(root_path)
    end
  end
end
```

---

### P0-2: README Missing Configuration Documentation (Blocks Onboarding)

**File(s):** `README.md`
**Problem:** `lib/tasks/seed_data.rake:10` requires `Rails.application.credentials.github.seed_data_token` to seed the database. A new developer running `bin/rails db:seed:all` will get an authentication error with no guidance. The dotenv setup, required environment variables, and Rails credentials format are not documented.

**Suggested solution:** Add a "Configuration" section to `README.md`:

```markdown
## Configuration

### Environment Variables

Create a `.env` file in the project root (not committed to version control):

```
# Required for Rollbar error tracking (optional in development)
ROLLBAR_ACCESS_TOKEN=your_rollbar_token

# Required for Cloudinary file uploads (if using upload features)
CLOUDINARY_URL=cloudinary://key:secret@cloud_name
```

### Rails Credentials

This app uses Rails encrypted credentials for the seed data pipeline.

Run `bin/rails credentials:edit` and add:

```yaml
github:
  seed_data_token: your_github_personal_access_token
```

The GitHub token needs `read:repo` scope on the `karenbarbe/color-confident-data` repository.

**Without this token, `bin/rails db:seed:all` will fail.** Contact the project maintainer for access.
```

---

### P0-3: Palette Model Has No Validations

**File(s):** `app/models/palette.rb`
**Problem:** `Palette` has no validations. `name` and `description` are nullable strings with no constraints beyond the database's NULL (which is allowed, since `palettes.name` has no `null: false` in schema). This means the view must defensively nil-guard every reference to `palette.name`, as seen in `PalettesController#edit` line 47: `@palette.name.present? ? ... : "Palette editor"`. The model's job is to enforce data rules, not the controller.

**Suggested solution:**

```ruby
# app/models/palette.rb
class Palette < ApplicationRecord
  belongs_to :creator, class_name: "User"
  has_many :color_slots, -> { order(:position) }, dependent: :destroy
  has_many :product_colors, through: :color_slots

  # Add presence validation — name is optional until saved by user
  # but ensure it's a string (not arbitrary whitespace) when present
  validates :name, length: { maximum: 100 }, allow_blank: true

  SLOT_LIMITS = {
    "background" => { min: 1, max: 1 },
    "thread" => { min: 1, max: 12 }
  }.freeze

  # ... rest of model
end
```

Also add a database constraint via migration:

```ruby
# db/migrate/YYYYMMDDHHMMSS_add_name_length_check_to_palettes.rb
def change
  add_check_constraint :palettes,
    "char_length(name) <= 100",
    name: "palettes_name_length"
end
```

---

### P0-4: StashItemsController#index Skips Policy Authorization

**File(s):** `app/controllers/stash_items_controller.rb:146-148`
**Problem:** `skip_authorization?` returns `true` for the `index` action, bypassing `verify_authorized`. While `policy_scope` is still called (and limits records to the current user), the pattern of skipping `authorize StashItem` is inconsistent with the rest of the application and can mask future authorization gaps during code review.

**Evidence:**
```ruby
def skip_authorization?
  action_name == "index"
end
```

**Suggested solution:** Call `authorize StashItem` directly in the `index` action instead of skipping the callback. The `StashItemPolicy#index?` should return `true` for authenticated users:

```ruby
# app/controllers/stash_items_controller.rb
def index
  authorize StashItem  # Re-enable authorization
  @stash_items = policy_scope(StashItem)
    .joins(product_color: :brand)
    .includes(product_color: :brand)
    .order("brands.category ASC, brands.name ASC, product_colors.id ASC")
    .to_a
  # ...
end

# Remove skip_authorization? override entirely
```

```ruby
# app/policies/stash_item_policy.rb
def index?
  user.present?
end
```

---

## P1 — Important (Maintainability / Convention / Cleanliness)

These issues affect code quality, maintainability, and Rails best practices.

---

### P1-1: Remove Unused Gems from Gemfile

**File(s):** `Gemfile`
**Problem:** Five gems are declared as dependencies but have no implementation:
- `kaminari` (line 72) — no paginate calls in controllers/views
- `pagy` (line 73) — no pagy calls anywhere
- `carrierwave` (line 65) — no uploader class, no `mount_uploader`
- `cloudinary` (line 66) — no Cloudinary configuration or usage
- `ai-chat` (line 61) — no AI routes, views, or calls

Both `kaminari` and `pagy` for the same project is redundant even if one were used. Each unused gem increases bundle size, slows boot time, and adds security surface area.

**Suggested solution:**

```ruby
# Remove from Gemfile:
gem "kaminari"         # unused — remove or implement
gem "pagy"             # unused — remove or implement
gem "carrierwave"      # unused — remove or implement
gem "cloudinary"       # unused — remove or implement
gem "ai-chat"          # unused — remove or implement
```

Then run `bundle install` to update `Gemfile.lock`.

If pagination is intended, choose one library (prefer `pagy` for performance) and implement it on the `StashItemsController#index` which loads all items into memory.

---

### P1-2: Extract Duplicate Picker Loader Logic into Shared Method

**File(s):** `app/controllers/palettes_controller.rb:285-334`
**Problem:** `load_thread_picker_data` and `load_fabric_picker_data` are 90% identical. Both set `@filter_params`, select brands by category, find a selected brand, apply default color family, and call `ColorMatcher`. Duplication makes future changes error-prone.

**Evidence:**
```ruby
def load_thread_picker_data
  @filter_params = extract_filter_params
  @brands = Brand.where(category: "thread").order(:name)
  set_thread_edit_mode_slot
  @selected_brand = find_selected_brand(@brands)
  # ... 15 more identical lines
end

def load_fabric_picker_data
  @filter_params = extract_filter_params
  @brands = Brand.where(category: "fabric").order(:name)
  set_fabric_edit_mode_slot
  @selected_brand = find_selected_brand(@brands)
  # ... 15 more identical lines
end
```

**Suggested solution:** Extract into a shared `load_picker_data(category:)` method:

```ruby
def load_picker_data(category:)
  @filter_params = extract_filter_params
  @brands = Brand.where(category: category).order(:name)

  if category == "fabric"
    set_fabric_edit_mode_slot
  else
    set_thread_edit_mode_slot
  end

  @selected_brand = find_selected_brand(@brands)

  if @mode == "add" && @filter_params[:color_family].blank?
    @filter_params[:color_family] = "Red"
  end

  if @mode == "edit" && @current_color && @filter_params[:color_family].blank?
    @filter_params[:color_family] = @current_color.color_family
  end

  matcher = ColorMatcher.new(brand: @selected_brand, **@filter_params)
  @colors = matcher.matching_colors.limit(120)
  @total_count = matcher.count
end

def load_thread_picker_data = load_picker_data(category: "thread")
def load_fabric_picker_data = load_picker_data(category: "fabric")
```

---

### P1-3: Add ERD to README

**File(s):** `README.md`, `erd.png` (exists at repo root)
**Problem:** An `erd.png` exists at the root of the repository (generated by `rails-erd` gem) but is never referenced in the README. The rubric explicitly checks for ERD in documentation.

**Suggested solution:** Add to `README.md`:

```markdown
## Entity Relationship Diagram

![ERD](erd.png)
```

Or embed in a `## Database` section after the Technical Stack. Regenerate with `bin/rails erd` after any schema changes.

---

### P1-4: Add Client-Side Form Validation

**File(s):** Forms in `app/views/users/new.html.erb`, `app/views/sessions/new.html.erb`, `app/views/passwords/`
**Problem:** No client-side form validation exists. Users receive no immediate feedback for empty required fields, invalid email formats, or password mismatches — they must wait for a server round-trip.

**Suggested solution:** Add HTML5 native validation attributes (no JavaScript required):

```erb
<%# app/views/users/new.html.erb %>
<%= f.email_field :email_address,
    required: true,
    pattern: "[^@]+@[^@]+\.[^@]+",
    title: "Please enter a valid email address" %>

<%= f.password_field :password,
    required: true,
    minlength: 8,
    title: "Password must be at least 8 characters" %>
```

For password confirmation, a simple Stimulus controller can validate match before submission:

```javascript
// app/javascript/controllers/password_confirm_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["password", "confirm", "submit"]

  validate() {
    const match = this.passwordTarget.value === this.confirmTarget.value
    this.confirmTarget.setCustomValidity(match ? "" : "Passwords do not match")
    this.submitTarget.disabled = !match
  }
}
```

---

### P1-5: Add Visual Screenshots to README

**File(s):** `README.md`
**Problem:** No screenshots of the application exist in the documentation. A new developer or potential employer cannot see what the app looks like without running it locally.

**Suggested solution:** Add 2–3 screenshots to `README.md`:

```markdown
## Screenshots

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Palette Editor
![Palette Editor](docs/screenshots/palette_editor.png)

### Color Charts
![Color Charts](docs/screenshots/color_charts.png)
```

Create `docs/screenshots/` directory and add screenshots. Consider adding a gif of the palette editor drag-and-drop interaction.

---

### P1-6: Stash Index Loads All Records Without Pagination

**File(s):** `app/controllers/stash_items_controller.rb:8-13`
**Problem:** The stash index loads all items for the current user into memory with `.to_a`. For users with large stashes, this is a memory and performance concern. The `kaminari` gem is already in the Gemfile (though unused).

**Evidence:**
```ruby
@stash_items = policy_scope(StashItem)
  .joins(product_color: :brand)
  .includes(product_color: :brand)
  .order("brands.category ASC, brands.name ASC, product_colors.id ASC")
  .to_a  # Load into memory once
```

**Suggested solution:** The comment says "Load into memory once" because the stash filter is done client-side via `stash_filter_controller.js`. This is a valid architectural choice for real-time filtering UX. If the stash grows large, consider:

1. Server-side pagination with category tabs (avoids full reload)
2. Virtual scrolling in the Stimulus controller
3. A lazy loading pattern per brand category

At minimum, the `.to_a` should be documented with a comment explaining why all records are intentionally pre-loaded for client-side filtering, and a scale threshold noted.

---

### P1-7: User Model Missing Presence Validations for Core Fields

**File(s):** `app/models/user.rb`
**Problem:** `User` validates uniqueness of `email_address` and `username` but not their presence. While the database has `null: false` constraints, the Rails validation layer should enforce these too for consistent error messages.

**Evidence:**
```ruby
validates :username, uniqueness: true
validates :email_address, uniqueness: true
# Missing: presence: true for both
```

**Suggested solution:**

```ruby
validates :username, presence: true, uniqueness: { case_sensitive: false }
validates :email_address, presence: true, uniqueness: { case_sensitive: false }
validates :password, length: { minimum: 8 }, allow_nil: true
```

Note: `allow_nil: true` on password length is important because `has_secure_password` handles nil password on create separately.

---

## P2 — Polish / UX / Enhancements

Nice-to-haves that would improve the experience or completeness.

---

### P2-1: Link erd.png to Regeneration Instructions

**File(s):** `README.md`
**Problem:** The ERD goes stale as the schema evolves. New contributors won't know it can be regenerated.

**Suggested solution:** Add a note:
```markdown
> To regenerate after schema changes: `bin/rails erd`
```

---

### P2-2: Add Alt Text to SVG Logo Partials

**File(s):** `app/views/shared/_logo_full.html.erb`, `app/views/shared/_logo_isotype.html.erb`
**Problem:** SVG logos embedded inline should either have a `<title>` element (for non-decorative logos) or `aria-hidden="true"` if purely decorative. No `alt=` attributes were found in any view.

**Suggested solution:** For the main logo (non-decorative, important for brand recognition by screen readers):

```erb
<%# In _logo_full.html.erb, add to the <svg> tag: %>
<svg aria-label="Color Confident Studio" role="img" ...>
  <title>Color Confident Studio</title>
  ...
</svg>
```

For purely decorative inline SVGs (stitch patterns):

```erb
<svg aria-hidden="true" focusable="false" ...>
```

---

### P2-3: Add Welcome / Account Creation Email

**File(s):** `app/mailers/`, `app/controllers/users_controller.rb`
**Problem:** Users receive no confirmation when they create an account. The `PasswordsMailer` shows that email sending infrastructure works, but no welcome email is sent on signup.

**Suggested solution:**

```ruby
# app/mailers/users_mailer.rb
class UsersMailer < ApplicationMailer
  def welcome(user)
    @user = user
    mail(to: @user.email_address, subject: "Welcome to Color Confident Studio!")
  end
end
```

```ruby
# app/controllers/users_controller.rb
def create
  @user = User.new(user_params)
  if @user.save
    UsersMailer.welcome(@user).deliver_later  # async via SolidQueue
    start_new_session_for @user
    redirect_to dashboard_path, notice: "Welcome! Your account has been created."
  else
    render :new, status: :unprocessable_entity
  end
end
```

---

### P2-4: Add Troubleshooting / FAQ Section to README

**File(s):** `README.md`
**Problem:** Common issues are predictable (seed fails without credentials, CSS doesn't compile without bin/dev, database not set up) but undocumented.

**Suggested solution:**

```markdown
## Troubleshooting

**`bin/rails db:seed:all` fails with authentication error**
You need a GitHub personal access token with `read:repo` scope on the seed data repository.
Run `bin/rails credentials:edit` and add it under `github.seed_data_token`.

**CSS is not loading / Tailwind styles missing**
Run `bin/dev` instead of `bin/rails server` to start both the Rails server and Tailwind watcher.

**Database errors after pulling new changes**
Run `bin/rails db:migrate` to apply any new migrations.

**JavaScript changes not reflected**
Clear the importmap with `bin/rails importmap:install` or restart the server.
```

---

### P2-5: Implement Pagination on Stash Items (Long-term)

**File(s):** `app/controllers/stash_items_controller.rb`, `app/views/stash_items/index.html.erb`
**Problem:** The stash index currently loads all items into memory for client-side filtering. For users with hundreds of thread colors, this creates a large DOM and potential performance issues.

**Suggested solution:** Since client-side filtering is the UX pattern, consider category tabs with server-side pagination per category:

```ruby
# GET /stash_items?category=thread
def index
  authorize StashItem
  @category = params[:category] || "thread"
  @stash_items = policy_scope(StashItem)
    .joins(product_color: :brand)
    .where(brands: { category: @category })
    .includes(product_color: :brand)
    .order("brands.name ASC, product_colors.id ASC")
    .page(params[:page]).per(100)  # with kaminari
end
```

This would also allow removing `kaminari`/`pagy` ambiguity by settling on one library.

---

### P2-6: Add End-to-End Test Plan Document

**File(s):** `docs/test_plan.md` (new file)
**Problem:** No test plan documents the expected user flows. Even without automated tests, a manual test plan would demonstrate QA awareness and support regression testing during development.

**Suggested solution:** Create `docs/test_plan.md` with flows:

```markdown
# End-to-End Test Plan

## Critical User Flows

### Authentication
- [ ] User can create an account
- [ ] User can log in with valid credentials
- [ ] User receives error for invalid credentials
- [ ] User can reset password via email link
- [ ] Rate limiting prevents brute-force on login

### Stash Management
- [ ] User can add a color to stash from color chart
- [ ] User can toggle ownership status (owned/wish_list)
- [ ] User can remove a color from stash
- [ ] Stash summary updates on dashboard after changes

### Palette Editor
- [ ] User can create a new palette
- [ ] User can add a background fabric
- [ ] User can add up to 12 thread colors
- [ ] User cannot add a 13th thread color (slot limit enforced)
- [ ] User cannot add fabric color to thread slot
- [ ] Unsaved changes warning appears before navigating away
- [ ] Batch save persists all changes in one request
- [ ] User can delete a palette

### Authorization
- [ ] Unauthenticated user cannot access dashboard
- [ ] User cannot view/edit another user's palette
- [ ] User cannot view/edit another user's stash
- [ ] Admin can create/edit product colors
- [ ] Non-admin cannot create/edit product colors
```
