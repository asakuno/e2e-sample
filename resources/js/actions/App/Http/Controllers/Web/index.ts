import AuthPageController from './AuthPageController'
import EmailVerificationPageController from './EmailVerificationPageController'
import DashboardPageController from './DashboardPageController'
import StocksPageController from './StocksPageController'
import WatchlistPageController from './WatchlistPageController'
import NewsPageController from './NewsPageController'
import AnalysisPageController from './AnalysisPageController'
import AnalysisBatchController from './AnalysisBatchController'
import AnalysisExportController from './AnalysisExportController'
import AnalysisImportController from './AnalysisImportController'
import AnalysisReplacementImportController from './AnalysisReplacementImportController'

const Web = {
    AuthPageController: Object.assign(AuthPageController, AuthPageController),
    EmailVerificationPageController: Object.assign(EmailVerificationPageController, EmailVerificationPageController),
    DashboardPageController: Object.assign(DashboardPageController, DashboardPageController),
    StocksPageController: Object.assign(StocksPageController, StocksPageController),
    WatchlistPageController: Object.assign(WatchlistPageController, WatchlistPageController),
    NewsPageController: Object.assign(NewsPageController, NewsPageController),
    AnalysisPageController: Object.assign(AnalysisPageController, AnalysisPageController),
    AnalysisBatchController: Object.assign(AnalysisBatchController, AnalysisBatchController),
    AnalysisExportController: Object.assign(AnalysisExportController, AnalysisExportController),
    AnalysisImportController: Object.assign(AnalysisImportController, AnalysisImportController),
    AnalysisReplacementImportController: Object.assign(AnalysisReplacementImportController, AnalysisReplacementImportController),
}

export default Web