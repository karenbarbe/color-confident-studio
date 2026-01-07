#!/usr/bin/env bash
# exit on error
set -o errexit

bundle exec puma -C config/puma.rb -b "tcp://0.0.0.0:${PORT:-10000}"
