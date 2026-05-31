include .env.example


up:
	docker compose up -d
up-a:
	docker compose up
up-build:
	docker compose up -d --build
down:
	docker compose down --remove-orphans
down-v:
	docker compose down --volumes --remove-orphans
down-rmi:
	docker compose down --remove-orphans --rmi local

.PHONY: app
app:
	docker compose exec app /bin/bash

.PHONY: nginx
nginx:
	docker compose exec nginx /bin/bash

.PHONY: mysql
mysql:
	docker compose exec mysql /bin/bash

.PHONY: redis
redis:
	docker compose exec redis /bin/bash

cache-clear:
	docker compose exec app php artisan cache:clear
	docker compose exec app php artisan config:clear
	docker compose exec app php artisan route:clear
	docker compose exec app php artisan view:clear
composer-install:
	docker compose run --rm app composer install
dump-autoload:
	docker compose run --rm app composer dump-autoload
migrate:
	docker compose exec app php artisan migrate
seed:
	docker compose exec app php artisan db:seed
db-fresh:
	docker compose exec app php artisan migrate:fresh
clear:
	docker compose exec app php artisan optimize:clear
test:
	git branch --contains=HEAD
	docker compose exec app php artisan test
yarn-install:
	docker compose run --rm app yarn install
vite:
	docker compose exec app yarn dev
vite-build:
	docker compose exec app yarn build
vite-kill:
	docker compose exec app pkill -f "vite"

setup-storage:
	docker compose exec app mkdir -p storage/framework/{sessions,views,cache}
	docker compose exec app chmod -R 775 storage bootstrap/cache

story:
	docker compose exec app npm run storybook

init:
	cp .env.example .env
	@make up-build
	@make composer-install
	@make yarn-install
	@make setup-storage
	docker compose exec app php artisan key:generate
	@make migrate
	@make vite-build
