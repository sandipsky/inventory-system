import { toPermissionGroups } from './permissions';

describe('toPermissionGroups', () => {
  it('puts <Action><Module> operations in their column and lists the rest as extras', () => {
    const [masters, sales, accounting] = toPermissionGroups([
      {
        master_module: 'Masters',
        modules: [
          {
            module_name: 'TaxType',
            operations: [
              { id: 13, name: 'CreateTaxType', selected: false },
              { id: 14, name: 'ViewTaxType', selected: false },
              { id: 15, name: 'EditTaxType', selected: false },
              { id: 16, name: 'DeleteTaxType', selected: false },
            ],
          },
        ],
      },
      {
        master_module: 'Sales',
        modules: [
          {
            module_name: 'SalesEntry',
            operations: [
              { id: 60, name: 'CreateSalesEntry', selected: false },
              { id: 61, name: 'ViewSalesEntries', selected: false },
              { id: 62, name: 'EditSalesEntry', selected: false },
              { id: 63, name: 'CancelSalesEntry', selected: false },
            ],
          },
        ],
      },
      {
        master_module: 'Accounting',
        modules: [
          {
            module_name: 'Payment',
            operations: [
              { id: 70, name: 'CreatePayment', selected: false },
              { id: 71, name: 'ViewVendorPayment', selected: false },
              { id: 72, name: 'ViewCustomerPayment', selected: false },
            ],
          },
        ],
      },
    ]);

    expect(masters.rows[0]).toEqual({
      module: 'TaxType',
      label: 'Tax Type',
      actions: [14, 13, 15, 16],
      extras: [],
      ids: [13, 14, 15, 16],
    });
    expect(masters.ids).toEqual([13, 14, 15, 16]);

    // A plural subject still counts as the module; an action with no column keeps its verb.
    expect(sales.rows[0].actions).toEqual([61, 60, 62, null]);
    expect(sales.rows[0].extras).toEqual([{ id: 63, label: 'Cancel' }]);

    // Operations on another subject are spelled out in full.
    expect(accounting.rows[0].actions).toEqual([null, 70, null, null]);
    expect(accounting.rows[0].extras).toEqual([
      { id: 71, label: 'View Vendor Payment' },
      { id: 72, label: 'View Customer Payment' },
    ]);
  });
});
