<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\Watchlist\StoreWatchlistRequest;
use App\Http\Requests\Watchlist\UpdateWatchlistRequest;
use App\Http\Resources\Watchlist\WatchlistItemResource;
use App\Models\Watchlist;
use App\UseCases\Watchlist\CreateWatchlistUseCase;
use App\UseCases\Watchlist\DeleteWatchlistUseCase;
use App\UseCases\Watchlist\ListWatchlistsUseCase;
use App\UseCases\Watchlist\UpdateWatchlistUseCase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * ウォッチリストページコントローラー
 */
class WatchlistPageController extends Controller
{
    /**
     * ウォッチリストページ表示
     */
    public function __invoke(Request $request, ListWatchlistsUseCase $useCase): Response
    {
        return Inertia::render('Watchlist', [
            'watchlists' => fn (): array => WatchlistItemResource::collection(
                $useCase->execute((int) $request->user()->getAuthIdentifier()),
            )->response()->getData(true),
        ]);
    }

    /**
     * ウォッチリスト追加
     */
    public function store(StoreWatchlistRequest $request, CreateWatchlistUseCase $useCase): RedirectResponse
    {
        $useCase->execute($request->toCreateWatchlistData());

        return redirect()
            ->route('watchlist.index')
            ->with('success', 'ウォッチリストに追加しました。');
    }

    /**
     * ウォッチリスト更新
     */
    public function update(
        UpdateWatchlistRequest $request,
        Watchlist $watchlist,
        UpdateWatchlistUseCase $useCase,
    ): RedirectResponse {
        Gate::authorize('update', $watchlist);

        $useCase->execute($request->toUpdateWatchlistData($watchlist->id));

        return redirect()
            ->route('watchlist.index')
            ->with('success', 'ウォッチリストを更新しました。');
    }

    /**
     * ウォッチリスト停止
     */
    public function destroy(Watchlist $watchlist, DeleteWatchlistUseCase $useCase): RedirectResponse
    {
        Gate::authorize('delete', $watchlist);

        $useCase->execute($watchlist->id);

        return redirect()
            ->route('watchlist.index')
            ->with('success', 'ウォッチリストから削除しました。');
    }
}
