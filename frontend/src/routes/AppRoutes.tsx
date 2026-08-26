import { lazy, Suspense } from 'react'
import { RouteObject, Outlet, Navigate } from 'react-router-dom'
import { Layout } from 'src/components/Layouts/Layout'
import { Loading } from 'src/components/Loading'

type AppRoute = RouteObject & {
  showNavigation?: boolean
}

const UserDetailsPage = lazy(() =>
  import('src/pages/AccountSettingsPage').then(module => ({
    default: module.AccountSettingsPage,
  }))
)
const NotFoundPage = lazy(() =>
  import('src/pages/NotFoundPage').then(module => ({
    default: module.NotFoundPage,
  }))
)
const ActiveLoansPage = lazy(() =>
  import('src/pages/market/ActiveLoansPage').then(module => ({
    default: module.ActiveLoansPage,
  }))
)
const LendersPage = lazy(() =>
  import('src/pages/market/LendersPage').then(module => ({
    default: module.LendersPage,
  }))
)
const BorrowersPage = lazy(() =>
  import('src/pages/market/BorrowersPage').then(module => ({
    default: module.BorrowersPage,
  }))
)
const GetALoanPage = lazy(() =>
  import('src/pages/borrow/GetALoanPage').then(module => ({
    default: module.GetALoanPage,
  }))
)
const MaintenancePage = lazy(() =>
  import('src/pages/MaintenancePage').then(module => ({
    default: module.MaintenancePage,
  }))
)

const RefinanceLoansPage = lazy(() =>
  import('src/pages/lend/RefinanceLoansPage').then(module => ({
    default: module.RefinanceLoansPage,
  }))
)

const CollectionsPage = lazy(() =>
  import('src/pages/lend/CollectionsPage').then(module => ({
    default: module.CollectionsPage,
  }))
)

const LoansRequestsPage = lazy(() =>
  import('src/pages/lend/LoansRequestsPage').then(module => ({
    default: module.LoansRequestsPage,
  }))
)

const MyLoansPage = lazy(() =>
  import('src/pages/borrow/MyLoansPage').then(module => ({
    default: module.MyLoansPage,
  }))
)

const HistoricalBorrowerLoansPage = lazy(() =>
  import('src/pages/borrow/HistoricalBorrowerLoansPage').then(module => ({
    default: module.HistoricalBorrowerLoansPage,
  }))
)

const HistoricalLenderLoansPage = lazy(() =>
  import('src/pages/lend/HistoricalLenderLoansPage').then(module => ({
    default: module.HistoricalLenderLoansPage,
  }))
)

const ManageOffersPage = lazy(() =>
  import('src/pages/lend/ManageOffersPage').then(module => ({
    default: module.ManageOffersPage,
  }))
)

export const appRoutes: AppRoute[] = [
  {
    showNavigation: false,
    element: (
      <Suspense fallback={<Loading />}>
        <Layout>
          <Outlet />
        </Layout>
      </Suspense>
    ),
    children: [
      {
        path: '/',
        element: <Navigate to='market/active-loans' replace />,
      },

      // Borrow
      {
        path: 'borrow/get-a-loan',
        element: <GetALoanPage />,
      },
      {
        path: 'borrow/my-loans',
        element: <MyLoansPage />,
      },
      {
        path: 'borrow/my-nftfi-loans',
        element: <Navigate to='/borrow/my-loans' replace />,
      },
      {
        path: 'borrow/my-other-loans',
        element: <Navigate to='/borrow/my-loans' replace />,
      },
      {
        path: 'borrow/history',
        element: <HistoricalBorrowerLoansPage />,
      },

      // Lend
      {
        path: 'lend/collections',
        element: <CollectionsPage />,
      },
      {
        path: 'lend/refinance',
        element: <RefinanceLoansPage />,
      },
      {
        path: 'lend/listings',
        element: <LoansRequestsPage />,
      },
      {
        path: 'lend/my-offers',
        element: <ManageOffersPage />,
      },
      {
        path: 'lend/history',
        element: <HistoricalLenderLoansPage />,
      },

      // Market
      {
        path: 'market/active-loans',
        element: <ActiveLoansPage />,
      },
      {
        path: 'market/lenders',
        element: <LendersPage />,
      },
      {
        path: 'market/borrowers',
        element: <BorrowersPage />,
      },

      // Settings
      {
        path: 'user/details',
        element: <UserDetailsPage />,
      },

      // Misc
      {
        path: 'maintenance',
        element: <MaintenancePage />,
      },
      {
        path: '/*',
        element: <NotFoundPage />,
      },
    ],
  },
]
