# Prepend Homebrew node so recipes invoking npm bypass the system/nvm node
# (which is too old for Vite 6).
export PATH := "/usr/local/opt/node/bin:" + env_var('PATH')

# Bare `just` opens an fzf picker over the recipes below.
[private]
default:
    @just --choose

# Run the build pipeline (Excel -> works.json). Uses on-disk cache.
scrape:
    uv run python -m scripts.build_data

# Force a fresh fetch (ignore cache).
scrape-refresh:
    uv run python -m scripts.build_data --refresh

# Print what would change without writing the JSON.
scrape-dry-run:
    uv run python -m scripts.build_data --dry-run

# Clear the Wookieepedia HTML cache.
clean-cache:
    rm -rf data/.cache

# Run pipeline tests.
test-pipeline:
    uv run pytest -v

# Lint Python.
lint:
    uv run ruff check scripts tests
    uv run ruff format --check scripts tests

# Format Python.
fmt:
    uv run ruff format scripts tests

# Start the React dev server.
dev:
    cd frontend && npm run dev

# Build the static site for production.
build:
    cd frontend && npm run build

# Preview the production build locally.
preview:
    cd frontend && npm run preview

# Type-check + lint frontend.
check-frontend:
    cd frontend && npm run typecheck && npm run lint

# Run frontend tests.
test-frontend:
    cd frontend && npm test

# Deploy to GitHub Pages (after `just build`).
deploy:
    cd frontend && npm run deploy

# Full rebuild: scrape + build.
all: scrape build
