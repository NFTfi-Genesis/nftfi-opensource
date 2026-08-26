import { TFunction } from 'src/modules/translation/TFunction'
import { NavSectionProps } from './types'

export const navAnimationDuration = 0.3 // also used in the layout component

export function getNavSections(t: TFunction): NavSectionProps[] {
  return [
    {
      subheader: '',
      items: [
        {
          title: t('navigation.borrow'),
          path: '/borrow',
          icon: 'ph:arrow-down-left',
          children: [
            {
              title: t('navigation.get-a-loan'),
              path: '/borrow/get-a-loan',
            },
            {
              title: t('navigation.my-loans'),
              path: '/borrow/my-loans',
            },
            {
              title: t('navigation.history'),
              path: '/borrow/history',
            },
          ],
        },
        {
          title: t('navigation.lend'),
          path: '/lend',
          icon: 'ph:arrow-up-right',
          children: [
            {
              title: t('navigation.collection-offers'),
              path: '/lend/collections',
            },
            {
              title: t('navigation.refinance-loans'),
              path: '/lend/refinance',
            },
            {
              title: t('navigation.loan-requests'),
              path: '/lend/listings',
            },
            {
              title: t('navigation.manage-my-offers'),
              path: '/lend/my-offers',
            },
            {
              title: t('navigation.history'),
              path: '/lend/history',
            },
          ],
        },
        {
          title: t('navigation.market'),
          path: '/market',
          icon: 'ph:chart-bar',
          children: [
            {
              title: t('dashboard.active-loans'),
              path: '/market/active-loans',
            },
            {
              title: t('dashboard.Lenders'),
              path: '/market/lenders',
            },
            {
              title: t('dashboard.Borrowers'),
              path: '/market/borrowers',
            },
          ],
        },
        {
          title: t('dashboard.contacts'),
          icon: 'ph:address-book-tabs',
        },
        {
          title: t('navigation.settings'),
          icon: 'ph:gear-six',
          path: '/user/details',
        },
      ],
    },
  ]
}

export const navWidth = {
  expanded: 280,
  collapsed: 88,
}

export const navCollapsedPopoverDelayMs = 200

export const navItemsPaddingLeft = {
  expanded: 1.5,
  collapsed: 0,
  mobile: 1,
}
