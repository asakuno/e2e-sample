import AuthPageController from './AuthPageController'
import EmailVerificationPageController from './EmailVerificationPageController'
import DashboardPageController from './DashboardPageController'
import StocksPageController from './StocksPageController'
import WatchlistPageController from './WatchlistPageController'
import NewsPageController from './NewsPageController'

const Web = {
    AuthPageController: Object.assign(AuthPageController, AuthPageController),
    EmailVerificationPageController: Object.assign(EmailVerificationPageController, EmailVerificationPageController),
    DashboardPageController: Object.assign(DashboardPageController, DashboardPageController),
    StocksPageController: Object.assign(StocksPageController, StocksPageController),
    WatchlistPageController: Object.assign(WatchlistPageController, WatchlistPageController),
    NewsPageController: Object.assign(NewsPageController, NewsPageController),
}

export default Web