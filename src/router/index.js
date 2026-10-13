import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const MainLayout = () => import('@/layouts/MainLayout.vue')
const AuthLayout = () => import('@/layouts/AuthLayout.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      component: AuthLayout,
      meta: { guest: true },
      children: [
        {
          path: '',
          name: 'login',
          component: () => import('@/views/auth/LoginView.vue'),
        },
      ],
    },
    {
      path: '/',
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/home/DashboardView.vue'),
          meta: { title: 'Accueil', tab: 'home' },
        },
        {
          path: 'stock',
          name: 'products',
          component: () => import('@/views/stock/ProductsView.vue'),
          meta: { title: 'Produits', tab: 'stock' },
        },
        {
          path: 'stock/products/:id',
          name: 'product-detail',
          component: () => import('@/views/stock/ProductDetailView.vue'),
          meta: { title: 'Détail produit', tab: 'stock', hideNav: true },
        },
        {
          path: 'stock/movements',
          name: 'movements',
          component: () => import('@/views/stock/MovementsView.vue'),
          meta: { title: 'Mouvements', tab: 'stock', hideNav: true },
        },
        {
          path: 'stock/movements/new',
          name: 'movement-new',
          component: () => import('@/views/stock/NewMovementView.vue'),
          meta: { title: 'Nouveau mouvement', tab: 'stock', hideNav: true },
        },
        {
          path: 'ventes',
          name: 'sales',
          component: () => import('@/views/sales/NewSaleView.vue'),
          meta: { title: 'Nouvelle vente', tab: 'sales' },
        },
        {
          path: 'ventes/historique',
          name: 'sales-history',
          component: () => import('@/views/sales/SalesHistoryView.vue'),
          meta: { title: 'Historique des ventes', tab: 'more', hideNav: true },
        },
        {
          path: 'factures',
          name: 'invoices',
          component: () => import('@/views/sales/InvoicesView.vue'),
          meta: { title: 'Factures', tab: 'more', hideNav: true },
        },
        {
          path: 'ventes/:id/facture',
          name: 'invoice',
          component: () => import('@/views/sales/InvoiceView.vue'),
          meta: { title: 'Facture', tab: 'sales', hideNav: true },
        },
        {
          path: 'ventes/:id/paiements',
          name: 'payments',
          component: () => import('@/views/sales/PaymentsView.vue'),
          meta: { title: 'Paiements', tab: 'sales', hideNav: true },
        },
        {
          path: 'caisses',
          name: 'cash',
          component: () => import('@/views/cash/CashView.vue'),
          meta: { title: 'Caisses', tab: 'more', hideNav: true },
        },
        {
          path: 'clients',
          name: 'customers',
          component: () => import('@/views/customers/CustomersView.vue'),
          meta: { title: 'Clients', tab: 'customers' },
        },
        {
          path: 'depenses',
          name: 'expenses',
          component: () => import('@/views/expenses/ExpensesView.vue'),
          meta: { title: 'Dépenses', tab: 'more', hideNav: true },
        },
        {
          path: 'plus',
          name: 'more',
          component: () => import('@/views/more/MoreView.vue'),
          meta: { title: 'Plus', tab: 'more' },
        },
        {
          path: 'admin/entreprises',
          name: 'admin-companies',
          component: () => import('@/views/admin/CompaniesView.vue'),
          meta: { title: 'Entreprises', tab: 'more', hideNav: true, requiresSuperAdmin: true },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.bootstrapped) {
    try {
      await auth.fetchMe()
    } catch {
      // stay unauthenticated
    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guest && auth.isAuthenticated) {
    return auth.isSuperAdmin ? { name: 'admin-companies' } : { name: 'home' }
  }

  if (to.meta.requiresSuperAdmin && !auth.isSuperAdmin) {
    return { name: 'home' }
  }

  if (auth.isSuperAdmin && to.name === 'home') {
    return { name: 'admin-companies' }
  }

  return true
})

export default router
