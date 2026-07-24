import AuthPageController from './AuthPageController'
import PasswordResetPageController from './PasswordResetPageController'
import EmailVerificationPageController from './EmailVerificationPageController'
import DashboardPageController from './DashboardPageController'
import StocksPageController from './StocksPageController'
import WatchlistPageController from './WatchlistPageController'
import NewsPageController from './NewsPageController'

const Web = {
    AuthPageController: Object.assign(AuthPageController, AuthPageController),
    PasswordResetPageController: Object.assign(PasswordResetPageController, PasswordResetPageController),
    EmailVerificationPageController: Object.assign(EmailVerificationPageController, EmailVerificationPageController),
    DashboardPageController: Object.assign(DashboardPageController, DashboardPageController),
    StocksPageController: Object.assign(StocksPageController, StocksPageController),
    WatchlistPageController: Object.assign(WatchlistPageController, WatchlistPageController),
    NewsPageController: Object.assign(NewsPageController, NewsPageController),
}

export default Web