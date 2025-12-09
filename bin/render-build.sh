#!/usr/bin/env bash
# exit on error
set -o errexit

bundle install
bundle exec rake assets:precompile
bundle exec rake assets:clean
bundle exec rake db:migrate

# Seed the database with initial data
# Using db:seed:all which uses find_or_create_by! (idempotent - safe to run multiple times)
bundle exec rake db:seed:all
