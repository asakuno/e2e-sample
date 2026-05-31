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
format:
	docker compose exec app ./vendor/bin/pint
test:
	git branch --contains=HEAD
	docker compose exec app php artisan test
ssr-start:
	docker compose exec app php artisan inertia:start-ssr
ssr-daemon:
	docker compose exec -d app php artisan inertia:start-ssr
ssr-stop:
	docker compose exec app php artisan inertia:stop-ssr
ssr-build:
	docker compose exec app npm run build:ssr
npm-install:
	docker compose run --rm app npm install
vite:
	docker compose exec app npm run dev
vite-build:
	docker compose exec app npm run build
vite-build-all:
	docker compose exec app npm run build:all
js-check:
	docker compose exec app npm run check
js-test:
	docker compose exec app npm run test:ci
vite-kill:
	docker compose exec app pkill -f "vp dev"

setup-storage:
	docker compose exec app mkdir -p storage/framework/{sessions,views,cache}
	docker compose exec app chmod -R 775 storage bootstrap/cache

story:
	docker compose exec app npm run storybook

e2e:
	docker compose --profile e2e run --rm playwright
e2e-build:
	docker compose --profile e2e build playwright
e2e-headed:
	docker compose --profile e2e run --rm playwright npx playwright test --headed

server:
	@echo "Starting development server..."
	@make -j2 vite ssr-start
init:
	cp .env.example .env
	@make up-build
	@make composer-install
	@make npm-install
	@make setup-storage
	docker compose exec app php artisan key:generate
	@make migrate
	@make vite-build
