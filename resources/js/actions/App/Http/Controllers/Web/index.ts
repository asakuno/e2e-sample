import AuthPageController from './AuthPageController'
import EmailVerificationPageController from './EmailVerificationPageController'
import DashboardPageController from './DashboardPageController'

const Web = {
    AuthPageController: Object.assign(AuthPageController, AuthPageController),
    EmailVerificationPageController: Object.assign(EmailVerificationPageController, EmailVerificationPageController),
    DashboardPageController: Object.assign(DashboardPageController, DashboardPageController),
}

export default Web