import { SidebarItem, SidebarSection } from './sidebar.model';

/**
 * Menu derived from the backend `operation` table (master_module → module).
 * Each link carries the backend `View*` operation that grants access to it.
 */
export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    title: 'Main Menu',
    items: [
      { label: 'Dashboard', icon: 'home', route: '/dashboard' },
      {
        label: 'Purchase',
        icon: 'bag',
        route: '/purchase',
        masterModule: 'Purchase',
        children: [
          { label: 'Purchase Entry', icon: 'cart_add', route: '/purchase/entry', operation: 'ViewPurchaseEntry' },
          { label: 'Purchase Return', icon: 'cart_return', route: '/purchase/return', operation: 'ViewPurchaseReturn' },
          { label: 'Vendors', icon: 'truck', route: '/purchase/vendors', operation: 'ViewVendor' },
        ],
      },
      {
        label: 'Sales',
        icon: 'bar_chart',
        route: '/sales',
        masterModule: 'Sales',
        children: [
          { label: 'Sales Entry', icon: 'receipt', route: '/sales/entry', operation: 'ViewSalesEntries' },
          { label: 'Sales Return', icon: 'undo', route: '/sales/return', operation: 'ViewSalesReturns' },
          { label: 'Customers', icon: 'user_card', route: '/sales/customers', operation: 'ViewCustomer' },
        ],
      },
      {
        label: 'Inventory',
        icon: 'category',
        route: '/inventory',
        masterModule: 'Inventory',
        children: [
          { label: 'Opening Stock', icon: 'checklist', route: '/inventory/opening-stock', operation: 'ViewOpeningStock' },
          { label: 'Stock Adjustment', icon: 'refresh', route: '/inventory/stock-adjustment', operation: 'ViewStockAdjustment' },
          { label: 'Stock Edit', icon: 'edit', route: '/inventory/stock-edit', operation: 'ViewStockEdit' },
        ],
      },
      {
        label: 'Accounting',
        icon: 'moneys',
        route: '/accounting',
        masterModule: 'Accounting',
        children: [
          { label: 'Chart of Accounts', icon: 'list', route: '/accounting/accounts', operation: 'ViewAccountMaster' },
          { label: 'Journal Entries', icon: 'notebook', route: '/accounting/journal', operation: 'ViewJournalEntries' },
          { label: 'Vendor Payments', icon: 'wallet', route: '/accounting/payments/vendor', operation: 'ViewVendorPayment' },
          { label: 'Customer Payments', icon: 'wallet_alt', route: '/accounting/payments/customer', operation: 'ViewCustomerPayment' },
          { label: 'Payment Adjustments', icon: 'calculator', route: '/accounting/payment-adjustment', operation: 'ViewPaymentAdjustment' },
          { label: 'Opening Balance', icon: 'bank', route: '/accounting/opening-balance', operation: 'ViewOpeningBalance' },
        ],
      },
    ],
  },
  {
    title: 'Setup',
    items: [
      {
        label: 'Products',
        icon: 'box',
        route: '/products',
        masterModule: 'Product',
        operation: 'ViewProduct',
      },
      {
        label: 'Master Data',
        icon: 'drawer',
        route: '/masters',
        masterModule: 'Masters',
        children: [
          { label: 'Categories', icon: 'category', route: '/masters/categories', operation: 'ViewCategory' },
          { label: 'Units', icon: 'hash', route: '/masters/units', operation: 'ViewUnit' },
          { label: 'Packings', icon: 'content_copy', route: '/masters/packings', operation: 'ViewPacking' },
          { label: 'Tax Types', icon: 'money', route: '/masters/tax-types', operation: 'ViewTaxType' },
        ],
      },
      {
        label: 'User & Roles',
        icon: 'users',
        route: '/user-roles',
        masterModule: 'User and Roles',
        children: [
          { label: 'Users', icon: 'user', route: '/user-roles/users', operation: 'ViewUser' },
          { label: 'Roles', icon: 'shield', route: '/user-roles/roles', operation: 'ViewRole' },
        ],
      },
      { label: 'Reports', icon: 'file_alt', route: '/reports' },
      {
        label: 'Settings',
        icon: 'settings',
        route: '/settings',
        masterModule: 'Settings',
        children: [
          { label: 'Configuration', icon: 'configuration', route: '/settings/configuration', operation: 'ViewConfiguration' },
          { label: 'Document Numbering', icon: 'file', route: '/settings/document-numbering', operation: 'ViewDocumentNumbering' },
        ],
      },
    ],
  },
];

export const SIDEBAR_FOOTER_ITEMS: SidebarItem[] = [
  { label: 'User Manual', icon: 'user_add', route: '/user-manual' },
];
