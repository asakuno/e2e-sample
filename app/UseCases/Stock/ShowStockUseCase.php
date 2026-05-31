<?php

declare(strict_types=1);

namespace App\UseCases\Stock;

use App\Data\Stock\StockListItemData;
use App\Repositories\StockRepositoryInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class ShowStockUseCase
{
    public function __construct(
        private StockRepositoryInterface $stockRepository,
    ) {}

    public function execute(int $stockId): StockListItemData
    {
        $stock = $this->stockRepository->findActiveById($stockId);

        if ($stock === null) {
            throw new NotFoundHttpException('Stock not found.');
        }

        return StockListItemData::from($stock);
    }
}
