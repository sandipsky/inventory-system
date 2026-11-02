/** The documents the header's Range Print prints, by the API path of their resource. */
export type RangePrintDocument = 'purchase' | 'sales' | 'purchase-return' | 'sales-return' | 'payment';

export interface RangePrintOption {
  value: RangePrintDocument;
  label: string;
  /** The View operation the print needs, or several, any of which grants it. */
  operation: string | string[];
}

export const RANGE_PRINT_OPTIONS: RangePrintOption[] = [
  { value: 'purchase', label: 'Purchase', operation: 'ViewPurchaseEntry' },
  { value: 'sales', label: 'Sales', operation: 'ViewSalesEntries' },
  { value: 'purchase-return', label: 'Purchase Return', operation: 'ViewPurchaseReturn' },
  { value: 'sales-return', label: 'Sales Return', operation: 'ViewSalesReturns' },
  { value: 'payment', label: 'Payment', operation: ['ViewVendorPayment', 'ViewCustomerPayment'] },
];
