import { REPORT_OPERATIONS } from '../report/report.model';
import { ManualSection } from './user-manual.model';

/** The user manual's content: one section per area of the app, each topic a task or a page. */
export const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'home',
    summary: 'Logging in, finding your way around and the tools every page shares.',
    topics: [
      {
        title: 'Log in',
        steps: [
          'Open the app in your browser. The login page appears.',
          'Type your <b>Username</b> and <b>Password</b>.',
          'Click <b>Log in</b> or press Enter. The <b>Dashboard</b> opens, or the page you were trying to reach.',
        ],
        notes: [
          'Five wrong passwords in a row lock your account for one hour. The login page then says "Account is locked. Try again later."',
          'An inactive user cannot log in. Ask your administrator to switch your account back on.',
          'A login lasts one hour. After that the app says "Session expired". Log in again and you go back to the page you were on.',
          'Reloading the page keeps you logged in.',
        ],
      },
      {
        title: 'Find your way around',
        steps: [
          'Use the menu on the left. It lists only the pages your role may open, under <b>Main Menu</b> and <b>Setup</b>. Click a group such as <b>Purchase</b> to open it, then click a page.',
          'To find a page by name, type in the <b>Search</b> box at the top of the menu. Press Escape to clear it.',
          'To make the menu narrow, click the arrow button at its top. Point at an icon to see its name. Click the arrow again to widen the menu.',
          'The trail at the top of the page shows where you are, for example <b>Home</b> › <b>Purchase</b> › <b>Purchase Entry</b>. Click <b>Home</b> to go back to the <b>Dashboard</b>.',
          'Click the calculator button in the header for a quick calculator. You can type on the keyboard too.',
          'Click <b>User Manual</b> at the bottom of the menu to open this manual.',
        ],
        notes: [
          'If you open a page your role does not allow, the app shows "Access denied" and takes you to the <b>Dashboard</b>.',
        ],
      },
      {
        title: 'Use lists and forms',
        steps: [
          'To search a list, type in its <b>Search</b> box and press Enter.',
          'To narrow it further, click <b>Filters</b>, fill in the fields you need and click <b>Apply</b>. Each filter shows above the table. Click its cross to remove it, or click <b>Reset Filters</b>.',
          'Click a column heading to sort by it. Use the pager at the bottom to move between pages or show more rows.',
          'Click a document number or a name to open it read-only. Click <b>Edit</b> at the bottom to change it.',
          'On most lists, the button at the end of each row opens its menu: <b>View</b>, <b>Edit</b>, <b>Delete</b> or, for sales, <b>Cancel</b>.',
        ],
        notes: [
          'Most lists of documents start with today in both date fields. Change the dates to see older documents.',
          'Forms open in a panel over the list. Clicking outside the panel does not close it, so you never lose what you typed. Use <b>Cancel</b>, <b>Close</b> or the cross at the top.',
          'Fields marked (Req.) are required. If one is missing, it turns red and the app says "Missing details".',
          'Buttons such as <b>Add</b>, <b>Edit</b>, <b>Delete</b> and <b>Cancel</b> appear only when your role allows them.',
          'The number shown while you add a document is the next free one. The final number is given when you save.',
        ],
      },
      {
        title: 'Switch dates between AD and BS',
        text: ['Dates can be shown in AD (the Gregorian calendar) or BS (Bikram Sambat).'],
        steps: [
          'On a list of documents, a stock list or a report, find the <b>AD</b> / <b>BS</b> switch next to the date fields.',
          'Click <b>AD</b> or <b>BS</b>. The dates in the table and in the date fields change at once.',
          'A form you open from that page shows its dates in the same calendar. Print and Export use it too.',
        ],
        notes: [
          'Each page starts in BS and has its own switch. The choice is not kept when you leave the page.',
          'The switch only changes how dates look. The saved date stays the same.',
          'While you pick a date, the calendar pop-up also has <b>AD</b> and <b>BS</b> buttons.',
          'The <b>Calendar Type</b> setting under Configuration does not change the switch on the pages.',
        ],
      },
      {
        title: 'Your profile, password and logging out',
        steps: [
          'Click your picture, or the person icon, at the top right. The menu shows your name and your role.',
          'To change your password, click <b>Change Password</b>.',
          'Type your <b>Current Password</b>, then the new one in <b>New Password</b> and again in <b>Confirm New Password</b>.',
          'Click <b>Change Password</b>. You stay logged in.',
          'To leave the app, open the same menu and click <b>Logout</b>.',
        ],
        notes: [
          'A new password needs at least 8 characters, with upper and lower case letters, a number and a symbol. The checklist under <b>New Password</b> turns green as you meet each rule.',
          'The new password must be different from the current one.',
          'A wrong current password counts towards the lock. Five wrong passwords in a row lock the account for one hour.',
        ],
      },
      {
        title: 'Notifications',
        steps: [
          'The bell in the header shows how many notifications you have not read.',
          'Click the bell to see your <b>Notifications</b>, newest first.',
          'Click a notification to mark it read and open the page it belongs to. Find the document there.',
          'Click <b>Mark all read</b> to mark them all, or <b>Clear all</b> to empty the list.',
        ],
        notes: [
          'New notifications arrive while you work. You do not need to reload the page.',
          'You are told when someone else adds, cancels or deletes a purchase, purchase return, sale, sales return, payment or stock adjustment that your role may view. Edits are not announced, and neither are your own changes.',
          'If your role can open Stock Edit, you are also warned when a product runs low (at or below the <b>Low Stock Quantity</b> setting) or runs out. These warnings also pop up in the corner of the screen.',
          'If a product runs lower again before you read its warning, the same warning is updated instead of a new one being added.',
        ],
      },
      {
        title: 'Print and Export',
        steps: [
          'On a list, click <b>Print</b> to download a PDF, or <b>Export</b> to download an Excel file.',
          'The file holds every row that matches your search, filters and dates, not only the page on screen.',
          'To print one document, open it by clicking its number. Then click <b>Print</b> or <b>Export</b> at the top of the panel.',
          'On a report, the file matches the screen exactly, including your search and sort.',
        ],
        notes: [
          'Dates in the file follow the page\'s <b>AD</b> / <b>BS</b> switch.',
          'Every file carries the company details from Configuration at the top.',
          'While a file is being made, the button reads <b>Printing…</b> or <b>Exporting…</b>. Only one file is made at a time.',
          'A cancelled sale or sales return is printed with a CANCELLED stamp and its reason.',
          'Vendors, customers, master data, the chart of accounts, users and roles have no Print or Export.',
        ],
      },
      {
        title: 'Print many documents at once (Range Print)',
        steps: [
          'Click the printer button in the header, at the top right.',
          '<b>Range Print</b> opens on the right. Set the <b>From Date</b> and <b>To Date</b>.',
          'Pick the <b>Document Type</b>: <b>Purchase</b>, <b>Sales</b>, <b>Purchase Return</b>, <b>Sales Return</b> or <b>Payment</b>.',
          'Click <b>Print</b>. One PDF downloads, with each document on its own page, oldest first.',
        ],
        notes: [
          'The printer button and the document types show only for documents your role may view.',
          'Cancelled sales and sales returns are marked in the PDF.',
          'If there is nothing in the period, the app says "Print failed" and the panel stays open so you can change the dates.',
        ],
      },
      {
        title: 'Products, batches and stock',
        text: [
          'Stock is kept per product batch. Each product also has a <b>Default batch</b>, which has no batch number.',
        ],
        steps: [
          'When goods come in (a purchase, a sales return or opening stock), you type a <b>Batch No.</b> An existing number adds to that batch, a new number creates a batch, and a blank one uses the default batch.',
          'When goods go out (a sale or a purchase return), and on a stock adjustment, you pick a <b>Batch</b> from a list that shows each batch\'s stock.',
          'The app picks the batch in stock with the earliest expiry date for you. Change it if the goods come from another batch.',
        ],
        notes: [
          'Stock can never go below zero. A sale, return or adjustment that takes more than a batch holds is refused.',
          'A batch keeps one expiry date. Leave <b>Expiry Date</b> blank when you add to an existing batch. To correct a batch\'s expiry date, use Stock Edit.',
          'The same batch can appear on only one line of a document.',
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: 'dashboard',
    summary: 'A quick look at cash, dues, sales, purchases and stock when you log in.',
    topics: [
      {
        title: 'Read the dashboard',
        text: ['The <b>Dashboard</b> opens when you log in. Click <b>Dashboard</b> in the menu to come back to it.'],
        steps: [
          '<b>Balance Summary</b> shows your cash balance. The card beside it shows <b>Outstanding Payables</b> (what you owe vendors) and <b>Outstanding Receivables</b> (what customers owe you), with the change since last week.',
          '<b>Purchase vs Sales</b> draws both totals over time. Pick <b>Daily</b>, <b>Weekly</b> or <b>Monthly</b>, and point at the chart to see the amounts.',
          '<b>Sales Summary</b> shows <b>Total Sales</b>, <b>Total Sales Return</b> and <b>Net Sales</b>. <b>Purchase Summary</b> shows <b>Total Purchase</b> and <b>Total Purchase Return</b>.',
          'Pick <b>1 Month</b>, <b>3 Months</b>, <b>6 Months</b> or <b>12 Months</b> on a summary card. The period runs from the 1st of the earliest month to today, so <b>3 Months</b> on 15 March covers 1 January to 15 March.',
        ],
        notes: [
          'Each card, figure and chart line shows only when your role may see the documents or accounts behind it. With nothing to show, the page says so.',
          'Cancelled sales and sales returns are left out of every figure.',
          'The chart names its months in AD, while expiry dates on the page follow BS.',
        ],
      },
      {
        title: 'Batches near expiry and low stock',
        steps: [
          '<b>Near Expiry Products</b> shows the batches in stock that expire within the period you pick. Expired batches are included and shown in red.',
          'Pick the period, for example <b>6 Months</b>. Point at a slice to see its batch and quantity.',
          'Click <b>View all</b> to see every batch in a list.',
          '<b>Stock Information</b> has two tabs. <b>Minimum Stock</b> lists products at or below their minimum stock, and <b>Zero Quantity</b> lists products with no stock left.',
        ],
        notes: [
          'These two cards show only if your role can open Stock Edit.',
          '<b>Minimum Stock</b> uses each product\'s own <b>Minimum Stock</b> figure. The low stock notification uses the <b>Low Stock Quantity</b> setting instead, so the two can differ.',
          'Stock is added up over all batches of a product, and only active products are listed.',
        ],
      },
    ],
  },
  {
    id: 'purchase',
    title: 'Purchase',
    icon: 'bag',
    summary: 'Record what you buy from vendors, what you send back, and the vendors themselves.',
    topics: [
      {
        title: 'Record a purchase',
        operation: 'ViewPurchaseEntry',
        steps: [
          'Open <b>Purchase</b> › <b>Purchase Entry</b> and click <b>Add Purchase Invoice</b>.',
          'Pick the <b>Vendor Name</b>, check the <b>Posting Date</b>, and type the vendor\'s <b>Bill Number</b> and <b>Bill Date</b>.',
          'Choose the <b>Transaction Type</b>: <b>Cash</b> if you paid now, <b>Credit</b> if you will pay later. Leave <b>Rounding Amount</b> on to round the total to a whole amount.',
          'Under <b>Product Details</b>, pick a <b>Product</b>. Its prices fill in. Type the <b>Batch No.</b>, <b>Expiry Date</b>, <b>Quantity</b>, <b>Rate</b>, <b>MRP</b> and <b>SP</b> (selling price).',
          'Click <b>Add Product</b> for each further line. Click the bin icon to remove a line.',
          'In <b>Summary</b>, choose a <b>Discount Type</b> (<b>Percentage</b> or <b>Flat</b>) and type the discount if there is one. Check the <b>Net Amount</b>.',
          'Add <b>Remarks</b> if needed and click <b>Add</b>.',
        ],
        notes: [
          'A credit purchase is recorded as owed to the vendor. Pay it later under Payments. A cash purchase owes nothing.',
          'The same bill number cannot be entered twice for one vendor.',
          'The discount cannot be more than the gross amount or more than 100%. Tax is worked out on the amount after the discount.',
          'Saving updates the product\'s prices to the ones on this purchase.',
        ],
      },
      {
        title: 'Change or delete a purchase',
        operation: 'ViewPurchaseEntry',
        steps: [
          'Open <b>Purchase</b> › <b>Purchase Entry</b> and set the dates to include the purchase.',
          'Click its <b>Purchase Number</b> to open it, then click <b>Edit</b>. Or choose <b>Edit</b> from the row\'s menu.',
          'Make your changes and click <b>Update</b>. Stock and accounts follow the change.',
          'To remove a purchase, choose <b>Delete</b> from the row\'s menu and confirm with <b>Delete</b>. Its stock is taken back out.',
        ],
        notes: [
          'You cannot remove or reduce stock that has already been sold.',
          'A purchase cannot be deleted once a payment is recorded against it or a purchase return names it.',
          'After a payment, a credit purchase cannot be changed to <b>Cash</b>, and its total cannot go below what has been paid.',
        ],
      },
      {
        title: 'Return goods to a vendor',
        operation: 'ViewPurchaseReturn',
        steps: [
          'Open <b>Purchase</b> › <b>Purchase Return</b> and click <b>Add Purchase Return</b>.',
          'Pick the <b>Vendor Name</b>. If the goods came on one bill, pick it in <b>Ref. Purchase</b>: its bill number, terms and every line are copied at full quantity.',
          'Check the <b>Posting Date</b> and <b>Transaction Type</b>. <b>Bill Number</b> is optional here.',
          'On each line, pick the <b>Product</b> and the <b>Batch</b> the goods leave from, then the <b>Quantity</b> and <b>Rate</b>.',
          'Remove or reduce the lines that are not going back, and click <b>Add</b>.',
        ],
        notes: [
          'You cannot return more than a batch holds. The <b>Stock</b> column shows what it has.',
          'Picking another vendor clears <b>Ref. Purchase</b>. Picking another reference replaces the lines.',
          'A purchase return can be edited or deleted. Deleting it puts the goods back into stock.',
          'A return does not lower the amount still due on the original purchase under Payments.',
        ],
      },
      {
        title: 'Manage vendors',
        operation: 'ViewVendor',
        steps: [
          'Open <b>Purchase</b> › <b>Vendors</b> and click <b>Add Vendor</b>.',
          'Under <b>Basic Details</b>, type the <b>Name</b> and, if you have them, the <b>Registration Number</b> (PAN or VAT), <b>Contact</b>, <b>Email</b>, <b>Address</b> and <b>Remarks</b>.',
          'Leave <b>Active</b> on under <b>Vendor Settings</b> and click <b>Add</b>.',
          'To change a vendor, click its name, then <b>Edit</b>, and click <b>Update</b> when done.',
        ],
        notes: [
          'Each vendor has its own account in the chart of accounts. It is named after the vendor and renamed when you rename the vendor.',
          'Inactive vendors are left out of dropdowns, but old documents still show them.',
          'A vendor used by purchases, payments or journals cannot be deleted. Switch <b>Active</b> off instead.',
        ],
      },
    ],
  },
  {
    id: 'sales',
    title: 'Sales',
    icon: 'bar_chart',
    summary: 'Invoice your customers, cancel a wrong invoice, take goods back, and keep the customer list.',
    topics: [
      {
        title: 'Make a sales invoice',
        operation: 'ViewSalesEntries',
        steps: [
          'Open <b>Sales</b> › <b>Sales Entry</b> and click <b>Add Sales Invoice</b>.',
          'Pick the <b>Customer Name</b>, check the <b>Posting Date</b>, and choose the <b>Transaction Type</b>: <b>Cash</b> or <b>Credit</b>.',
          'Under <b>Product Details</b>, pick a <b>Product</b>. The <b>Batch</b> with the earliest expiry in stock is chosen for you. Change it if needed and check the <b>Stock</b> column.',
          'Type the <b>Quantity</b>. The <b>Rate</b> fills in from the batch\'s selling price; change it if needed.',
          'Click <b>Add Product</b> for each further line. Add a discount in <b>Summary</b> if there is one.',
          'Check everything, then click <b>Add</b>.',
        ],
        notes: [
          'A saved invoice can never be edited or deleted. If it is wrong, cancel it and enter a new one.',
          'You cannot sell more than a batch holds.',
          'A credit sale is recorded as owed by the customer. Receive the money later under Payments.',
        ],
      },
      {
        title: 'Cancel a sales invoice',
        operation: 'CancelSalesEntry',
        steps: [
          'Open <b>Sales</b> › <b>Sales Entry</b> and find the invoice.',
          'Choose <b>Cancel</b> from the row\'s menu. Or open the invoice and click <b>Cancel Invoice</b> at the bottom.',
          'Type why in <b>Reason</b>.',
          'Click <b>Cancel Invoice</b>. The stock goes back into its batches.',
        ],
        notes: [
          'A cancelled invoice stays in the list as CANCELLED, with its lines. Opening it shows "This invoice is cancelled." and the reason.',
          'An invoice cannot be cancelled while a sales return names it. Cancel the return first.',
          'An invoice cannot be cancelled after a payment is recorded against it.',
          'Cancelled invoices are left out of report totals and the dashboard. Use the <b>Status</b> filter to list <b>Active</b> or <b>Cancelled</b> ones.',
        ],
      },
      {
        title: 'Take goods back from a customer',
        operation: 'ViewSalesReturns',
        steps: [
          'Open <b>Sales</b> › <b>Sales Return</b> and click <b>Add Sales Return</b>.',
          'Pick the <b>Customer Name</b>. If the goods came from one invoice, pick it in <b>Ref. Invoice</b>: every line is copied at full quantity.',
          'Check the <b>Posting Date</b> and <b>Transaction Type</b>.',
          'On each line, check the <b>Batch No.</b> the goods go back into, then the <b>Quantity</b>, <b>Rate</b> and <b>MRP</b>. Remove or reduce the lines that did not come back.',
          'Click <b>Add</b>.',
        ],
        notes: [
          '<b>Ref. Invoice</b> lists only that customer\'s invoices that are not cancelled. Picking another customer clears it.',
          'Leave <b>Expiry Date</b> blank when the goods go back into an existing batch.',
          'A sales return can never be edited or deleted. To cancel one, open it, click <b>Cancel Return</b>, type the <b>Reason</b> and confirm. This is refused if its goods have been sold since.',
          'A return does not lower the amount still due on the original invoice under Payments.',
        ],
      },
      {
        title: 'Manage customers',
        operation: 'ViewCustomer',
        steps: [
          'Open <b>Sales</b> › <b>Customers</b> and click <b>Add Customer</b>.',
          'Under <b>Basic Details</b>, type the <b>Name</b> and, if you have them, the <b>Registration Number</b>, <b>Contact</b>, <b>Email</b>, <b>Address</b> and <b>Remarks</b>.',
          'Leave <b>Active</b> on under <b>Customer Settings</b> and click <b>Add</b>.',
          'To change a customer, click its name, then <b>Edit</b>, and click <b>Update</b> when done.',
        ],
        notes: [
          'Each customer has its own account in the chart of accounts, named after the customer.',
          'Inactive customers are left out of dropdowns, but old documents still show them.',
          'A customer used by sales, payments or journals cannot be deleted. Switch <b>Active</b> off instead.',
        ],
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    icon: 'category',
    summary: 'Enter the stock you start with and correct stock outside purchases and sales.',
    topics: [
      {
        title: 'Add opening stock',
        operation: 'ViewOpeningStock',
        text: ['Opening stock is the stock you already have when you start using the app.'],
        steps: [
          'Open <b>Inventory</b> › <b>Opening Stock</b> and click <b>Add Opening Stock</b>.',
          'Pick the <b>Product</b>. Its prices fill in.',
          'Type the <b>Batch No.</b> and <b>Expiry Date</b> if the stock has them. Leave the batch blank for the product\'s default batch.',
          'Type the <b>Quantity</b> and <b>Cost Price</b>, and the <b>Selling Price</b> and <b>MRP</b> if you know them.',
          'Click <b>Add</b>.',
        ],
        notes: [
          'Each batch gets opening stock only once. A batch that already has stock is refused; use Stock Adjustment or Stock Edit instead.',
          'Opening stock cannot be edited or deleted.',
          'The list shows every batch with its current stock, not only what was entered as opening stock.',
        ],
      },
      {
        title: 'Record a stock adjustment',
        operation: 'ViewStockAdjustment',
        text: ['Use a stock adjustment after a stock count, a breakage, a loss or a found item.'],
        steps: [
          'Open <b>Inventory</b> › <b>Stock Adjustment</b> and click <b>Add Stock Adjustment</b>.',
          'Check the <b>Date</b>.',
          'On each line, pick the <b>Product</b> and its <b>Batch</b>, then choose the <b>Type</b>: <b>Stock In</b> or <b>Stock Out</b>.',
          'Type the <b>Quantity</b> and, if you like, a <b>Reason</b> such as "Broken in transit".',
          'Click <b>Add Product</b> for more lines, add <b>Remarks</b>, and click <b>Add</b>.',
        ],
        notes: [
          '<b>Stock Out</b> cannot take more than the batch holds.',
          'A product with no stock yet cannot be adjusted. Add opening stock or a purchase first.',
          'An adjustment changes stock only. It writes nothing to the accounts.',
          'You can edit or delete an adjustment. Its earlier stock changes are reversed first.',
        ],
      },
      {
        title: 'Correct a batch with Stock Edit',
        operation: 'ViewStockEdit',
        steps: [
          'Open <b>Inventory</b> › <b>Stock Edit</b>. Search for the product, or use <b>Filters</b> › <b>Batch No</b>.',
          'Click <b>Edit</b> on the batch\'s row, or click the product name.',
          'Change the <b>Quantity</b>, <b>Expiry Date</b>, <b>Cost Price</b>, <b>Selling Price</b> or <b>MRP</b>.',
          'Click <b>Update</b>.',
        ],
        notes: [
          'Stock Edit sets the figures directly and keeps no history. For a counted difference, breakage or loss, record a stock adjustment instead.',
          'Use Stock Edit to fix a batch\'s expiry date, since purchases and sales returns refuse a different date for an existing batch.',
        ],
      },
    ],
  },
  {
    id: 'accounting',
    title: 'Accounting',
    icon: 'moneys',
    summary: 'Keep the accounts, record money paid and received, and post entries that are not purchases or sales.',
    topics: [
      {
        title: 'Manage the chart of accounts',
        operation: 'ViewAccountMaster',
        steps: [
          'Open <b>Accounting</b> › <b>Chart of Accounts</b> and click <b>Add Account</b>.',
          'Type the <b>Account Name</b> and <b>Account Code</b>.',
          'Pick the <b>Account Type</b>, then a <b>Parent Account</b> if it belongs under one.',
          'Add <b>Remarks</b> if needed, leave <b>Active</b> on, and click <b>Add</b>.',
          'To change an account, click its name or choose <b>Edit</b> from the row\'s menu, then click <b>Update</b>.',
        ],
        notes: [
          'Each account code must be different.',
          'Accounts marked <b>System</b>, <b>Vendor</b> or <b>Customer</b> are locked: their name, type and parent cannot be changed, and they cannot be deleted here. A vendor\'s or customer\'s account goes when the vendor or customer is deleted.',
          'An account used by any journal line cannot be deleted.',
          'To take money in or out through a bank, add the bank with the type <b>Cash & Cash Equivalents</b>. It then appears in a payment\'s <b>Transaction Type</b>.',
          'Inactive accounts are left out of dropdowns.',
        ],
      },
      {
        title: 'Record a journal entry',
        operation: 'ViewJournalEntries',
        text: ['Use a journal entry for anything that is not a purchase, sale, return or payment, such as rent or a bank charge.'],
        steps: [
          'Open <b>Accounting</b> › <b>Journal Entries</b> and click <b>Add Journal Entry</b>.',
          'Check the <b>Date</b>.',
          'Under <b>Account Details</b>, pick an <b>Account</b> on each line and type its <b>Debit</b> or its <b>Credit</b>. Click <b>Add Account</b> for more lines.',
          'Type a <b>Narration</b> for a line if you want one.',
          'Check that <b>Total Debit</b> equals <b>Total Credit</b> and the <b>Difference</b> is zero. Add <b>Remarks</b> and click <b>Add</b>.',
        ],
        notes: [
          'A line has a debit or a credit, not both. Typing on one side clears the other.',
          'The entry must balance, and its total cannot be zero.',
          'A line left without a narration uses the remarks.',
          'Purchases, sales, returns and payments post their own entries. Those are not listed here; change the document itself instead.',
        ],
      },
      {
        title: 'Record a payment',
        operation: ['ViewVendorPayment', 'ViewCustomerPayment'],
        steps: [
          'Open <b>Accounting</b> › <b>Payments</b> and click <b>Add Payment</b>.',
          'Pick the <b>Party Type</b>: <b>Vendor</b> when you pay money out, <b>Customer</b> when you receive it. <b>Payment Type</b> shows <b>Send</b> or <b>Receive</b> to match.',
          'Check the date and pick the vendor or customer. Their credit invoices with money due appear.',
          'Pick the <b>Transaction Type</b> (<b>Cash</b> or a bank account) and type the <b>Amount</b>.',
          'Type what this payment settles in <b>Paid</b> on each invoice, or click <b>Settle Oldest First</b> to spread the amount from the oldest invoice on.',
          'Check <b>Total Adjusted Paid Amount</b>, <b>Unadjusted Amount</b> and <b>Total Payment Amount</b>, then click <b>Add</b>.',
        ],
        notes: [
          'An invoice cannot be settled for more than its <b>Amount Due</b>, and the invoices together cannot take more than the payment.',
          'Whatever is not settled stays unadjusted. Apply it later on Payment Adjustments.',
          'Cash purchases and sales owe nothing, so they never appear here.',
          'You do not type a narration. The app writes one for the vendor or customer.',
          'If your role can view only vendor payments or only customer payments, you see and record only that kind.',
        ],
      },
      {
        title: 'Change or delete a payment',
        operation: ['ViewVendorPayment', 'ViewCustomerPayment'],
        steps: [
          'Open <b>Accounting</b> › <b>Payments</b> and set the dates to include the payment.',
          'Click its <b>Payment Number</b> to open it, then click <b>Edit</b>.',
          'Change the amount or what it settles, and click <b>Update</b>.',
          'To remove a payment, choose <b>Delete</b> from the row\'s menu and confirm with <b>Delete</b>.',
        ],
        notes: [
          'While you edit, the invoices this payment settled count as due again, so you can settle them afresh.',
          'Deleting a payment makes the invoices it settled due again.',
          'An open payment prints as a voucher for a vendor or a receipt for a customer.',
          'If you can see both kinds, use the <b>Party Type</b> select (<b>All Parties</b>) on the list to show only vendor or only customer payments.',
        ],
      },
      {
        title: 'Adjust a payment\'s unadjusted amount',
        operation: 'ViewPaymentAdjustment',
        text: ['A payment received or made before its invoice existed keeps an unadjusted amount. Apply it here later.'],
        steps: [
          'Open <b>Accounting</b> › <b>Payment Adjustments</b>. The list shows every payment that still has an <b>Unadjusted</b> amount.',
          'Click <b>Adjust</b> on the payment\'s row.',
          'Under <b>Invoices Due</b>, type the amount in <b>Adjust Now</b> for each invoice, or click <b>Settle Oldest First</b>.',
          'Check <b>Unadjusted Amount</b>, <b>Adjusting Now</b> and <b>Left Unadjusted</b>.',
          'Click <b>Adjust</b>.',
        ],
        notes: [
          'You cannot adjust more than the payment has left, or more than an invoice\'s due amount.',
          'An adjustment only adds settlements. To take one back, edit the payment on the Payments page.',
          'A payment that is fully adjusted drops off this list.',
        ],
      },
      {
        title: 'Set the opening balance',
        operation: 'ViewOpeningBalance',
        text: ['The opening balance holds the balances your accounts had when you started using the app.'],
        steps: [
          'Open <b>Accounting</b> › <b>Opening Balance</b>.',
          'Click <b>Set Opening Balance</b>, or <b>Edit</b> if one is already saved.',
          'Set the <b>Date</b> and add <b>Remarks</b>.',
          'Under <b>Account Balances</b>, pick each <b>Account</b> and type its <b>Debit</b> or <b>Credit</b>. Click <b>Add Account</b> for more lines.',
          'Check that the totals balance and click <b>Save</b>. <b>Cancel</b> throws away your changes.',
        ],
        notes: [
          'There is only one opening balance. Saving replaces the whole of it.',
          'Total debit and total credit must be equal.',
        ],
      },
    ],
  },
  {
    id: 'products',
    title: 'Products',
    icon: 'box',
    summary: 'Keep the list of everything you buy, stock and sell, with its prices and tax.',
    topics: [
      {
        title: 'Add or change a product',
        operation: 'ViewProduct',
        steps: [
          'Open <b>Products</b> and click <b>Add Product</b>.',
          'Under <b>Basic Details</b>, type the <b>Product Name</b>, and the <b>Code</b> and <b>Barcode</b> if it has them. Pick the <b>Unit</b>, and the <b>Category</b>, <b>Packing</b>, <b>Tax Type</b> and <b>Valuation Method</b>.',
          'Under <b>Pricing & Stock</b>, type the <b>Cost Price</b>, <b>Selling Price</b>, <b>MRP</b>, <b>Minimum Stock</b> and <b>Maximum Stock</b>.',
          'Under <b>Product Settings</b>, set the switches such as <b>Active</b>, <b>Purchasable</b> and <b>Sellable</b>.',
          'To record a bonus scheme, click <b>Add Bonus</b> and type the <b>Min. Quantity</b> and <b>Bonus Quantity</b>.',
          'Click <b>Add</b>. To change a product later, click its name, then <b>Edit</b>, then <b>Update</b>.',
        ],
        notes: [
          '<b>Product Name</b> and <b>Unit</b> are required. <b>Minimum Stock</b> cannot be more than <b>Maximum Stock</b>.',
          'A product used on any document cannot be deleted. Switch <b>Active</b> off instead.',
          'Deleting a product also removes its batches and opening stock.',
        ],
      },
      {
        title: 'Where a product can be used',
        operation: 'ViewProduct',
        steps: [
          'Switch <b>Purchasable</b> on for products you buy. They can then be picked on purchases and purchase returns.',
          'Switch <b>Sellable</b> on for products you sell. They can then be picked on sales and sales returns.',
          'Switch <b>Service Item</b> on for services. Services carry no stock, so they are left out of the purchase, sales and stock pages.',
          'Switch <b>Active</b> off for a product you no longer use. It disappears from every dropdown, but old documents still show it.',
        ],
        notes: [
          'The <b>Tax Type</b>\'s rate taxes the product on every line. A product with no tax type counts as non-taxable.',
          'A new line takes the product\'s prices, and each purchase updates them to the latest ones.',
          '<b>Minimum Stock</b> decides when the product appears on the dashboard\'s <b>Minimum Stock</b> list.',
          'Use <b>Filters</b> to list products by <b>Code</b>, <b>Barcode</b>, <b>Category</b>, <b>Unit</b>, <b>Product Type</b>, <b>Item Type</b> or <b>Status</b>.',
        ],
      },
    ],
  },
  {
    id: 'masters',
    title: 'Master Data',
    icon: 'drawer',
    summary: 'Keep the short lists that products pick from: categories, units, packings and tax types.',
    topics: [
      {
        title: 'Manage categories, units, packings and tax types',
        operation: ['ViewCategory', 'ViewUnit', 'ViewPacking', 'ViewTaxType'],
        steps: [
          'Open <b>Master Data</b> and pick <b>Categories</b>, <b>Units</b>, <b>Packings</b> or <b>Tax Types</b>.',
          'Click <b>Add Category</b>, <b>Add Unit</b>, <b>Add Packing</b> or <b>Add Tax Type</b>. A small panel opens on the right.',
          'Type the <b>Name</b>, leave <b>Active</b> on, and click <b>Add</b>.',
          'To rename one, click its name or choose <b>Edit</b> from the row\'s menu, then click <b>Update</b>.',
          'To remove one, choose <b>Delete</b> from the row\'s menu and confirm.',
        ],
        notes: [
          'Each name must be different.',
          'A record that products still use cannot be deleted. Switch <b>Active</b> off instead: it leaves the dropdowns, and old records keep it.',
        ],
      },
      {
        title: 'Set tax rates',
        operation: 'ViewTaxType',
        steps: [
          'Open <b>Master Data</b> › <b>Tax Types</b> and click <b>Add Tax Type</b>.',
          'Type the <b>Name</b>, for example VAT, and the <b>Tax Rate</b> as a percent, for example 13.',
          'Click <b>Add</b>. Then give products this tax type on the Products page.',
        ],
        notes: [
          'The rate must be between 0 and 100.',
          'Purchase and sales lines are taxed at their product\'s tax type rate. A product with no tax type is non-taxable.',
        ],
      },
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    icon: 'file_alt',
    summary: 'Read registers, stock and the books for any period, then print or export them.',
    topics: [
      {
        title: 'Open a report',
        operation: REPORT_OPERATIONS,
        steps: [
          'Click <b>Reports</b> in the menu.',
          'The page has a card for each area: <b>Purchase</b>, <b>Purchase Return</b>, <b>Sales</b>, <b>Sales Return</b>, <b>Inventory</b> and <b>Accounting</b>. Each lists only the reports your role may open.',
          'Click a report\'s name to open it.',
        ],
        notes: [
          'Purchase has <b>Purchase Register</b>, <b>Purchase by Vendor</b>, <b>Purchase by Product</b> and <b>Purchase by Batch</b>. Purchase Return, Sales and Sales Return have the same four; Sales and Sales Return go by customer.',
          'Inventory has the <b>Stock Report</b>: current stock and stock value of every batch.',
          'Accounting has the <b>Journal Report</b>, <b>Ledger</b>, <b>Trial Balance</b>, <b>Accounts Receivable</b> and <b>Accounts Payable</b>.',
        ],
      },
      {
        title: 'Search, sort and total a report',
        operation: REPORT_OPERATIONS,
        steps: [
          'Set the From and To dates. By default they run from the 1st of this month to today.',
          'Type in <b>Search</b> to keep only the rows that match. The table updates as you type.',
          'Click a column heading to sort by it.',
          'Read the <b>Total</b> row at the bottom. The footer says how many rows are shown.',
          'Click <b>Print</b> or <b>Export</b> for a file of exactly what is on screen.',
        ],
        notes: [
          'The <b>Trial Balance</b> has one "As of" date. The <b>Stock Report</b>, <b>Accounts Receivable</b> and <b>Accounts Payable</b> show today and have no dates.',
          'The sales and sales return registers show cancelled documents marked CANCELLED, in grey, and leave them out of the totals. The footer counts them.',
          'The registers\' <b>Discount</b> column shows the discount as money, whether it was typed as a percent or an amount.',
          'The start date is the 1st of the current month by the AD calendar, even when the page shows BS.',
        ],
      },
      {
        title: 'Read an account\'s ledger',
        operation: REPORT_OPERATIONS,
        steps: [
          'Open <b>Reports</b> and click <b>Ledger</b> under Accounting.',
          'Pick the account in <b>Select account</b>, and set the From and To dates.',
          'The first row, <b>Opening Balance</b>, is everything before the From date.',
          'Each entry follows with its <b>Debit</b> or <b>Credit</b> and the running <b>Balance</b>. The <b>Total</b> row ends with the closing balance.',
          'Click <b>Print</b> or <b>Export</b> for a file of the ledger.',
        ],
        notes: [
          'Balances show as Dr (debit) or Cr (credit).',
          'The account list includes inactive accounts, since their past entries still count.',
        ],
      },
      {
        title: 'Trial balance, receivables and payables',
        operation: REPORT_OPERATIONS,
        steps: [
          'Open <b>Trial Balance</b> and set the "As of" date. Each account shows its <b>Total Debit</b>, <b>Total Credit</b>, <b>Debit Balance</b> and <b>Credit Balance</b>.',
          'Click an account\'s name to open its ledger up to the same date.',
          'Open <b>Accounts Receivable</b> to see each customer invoice with money still due: <b>Invoice Amt.</b>, <b>Paid</b> and <b>Due</b>.',
          'Open <b>Accounts Payable</b> to see the same for what you owe vendors.',
        ],
        notes: [
          'The trial balance counts every entry from the very start up to the date you pick.',
          'Only credit invoices appear in receivables and payables. Payments reduce what they show.',
        ],
      },
    ],
  },
  {
    id: 'user-roles',
    title: 'User & Roles',
    icon: 'users',
    summary: 'Give people a login and decide, through their role, what they may see and do.',
    topics: [
      {
        title: 'Add or change a user',
        operation: 'ViewUser',
        steps: [
          'Open <b>User & Roles</b> › <b>Users</b> and click <b>Add User</b>.',
          'Under <b>Basic Details</b>, type the <b>Full Name</b> and <b>Email</b>, and the <b>Contact</b> and <b>Gender</b> if you like.',
          'Under <b>Login & Access</b>, type the <b>Username</b>, pick the <b>Role</b>, and type a <b>Password</b>.',
          'Under <b>Profile Picture</b>, click <b>Upload</b> to add a picture (JPG, PNG, GIF or WEBP, up to 10 MB).',
          'Leave <b>Active</b> on under <b>User Settings</b> and click <b>Add</b>.',
          'To change a user, click the name, then <b>Edit</b>, then <b>Update</b>. Leave <b>Password</b> blank to keep the current one.',
        ],
        notes: [
          'A password needs at least 8 characters, with upper and lower case letters, a number and a symbol.',
          'Each username and email must be different. Inactive users cannot log in.',
          'On your own account (marked <b>You</b>) the role and <b>Active</b> are locked, and there is no <b>Delete</b>. Another user has to change them.',
          'Changing your own username logs you out. Log in again with the new name.',
        ],
      },
      {
        title: 'Create a role and choose its permissions',
        operation: 'ViewRole',
        steps: [
          'Open <b>User & Roles</b> › <b>Roles</b> and click <b>Add Role</b>.',
          'Type the <b>Role Name</b> and a <b>Description</b>. Leave <b>Active</b> on.',
          'Under <b>Permissions</b>, each row is a <b>Module</b>. Tick <b>View</b> to let the role open that page, and <b>Create</b>, <b>Edit</b>, <b>Delete</b> or an <b>Other</b> box (such as Cancel) for its buttons.',
          'Tick a group\'s box to grant the whole group, or use <b>Select all</b> and <b>Clear</b>. The counter shows how many are selected.',
          'Click <b>Add</b>. To change a role later, click its name, then <b>Edit</b>, then <b>Update</b>.',
        ],
        notes: [
          'Each user has one role. Pages without <b>View</b> are hidden from the menu, and buttons without their permission do not appear.',
          'Inactive roles are not offered when you add or edit a user.',
          'A role that users still have cannot be deleted. The app says "Role in use"; give those users another role first.',
          'On your own role (marked <b>Your role</b>), permissions you remove are taken from you too, as soon as you save.',
        ],
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: 'settings',
    summary: 'Set the company details and defaults, and see how documents are numbered.',
    topics: [
      {
        title: 'Update company details and preferences',
        operation: 'ViewConfiguration',
        steps: [
          'Open <b>Settings</b> › <b>Configuration</b> and click <b>Edit</b>.',
          'Under <b>Company Details</b>, change the <b>Company Name</b>, <b>Company Reg. Type</b> (<b>PAN</b> or <b>VAT</b>), <b>Company Reg. No.</b>, <b>Company Contact</b>, <b>Company Email</b> or <b>Company Address</b>.',
          'Under <b>Preferences</b>, change <b>Calendar Type</b>, <b>Fiscal Year</b>, <b>Default Rounding</b> or <b>Low Stock Quantity</b>.',
          'Click <b>Save</b>, or <b>Cancel</b> to leave everything as it was.',
        ],
        notes: [
          'The company details print at the top of every PDF and Excel file.',
          '<b>Company Name</b> is required.',
          '<b>Low Stock Quantity</b>: a warning goes out when a sale or stock change leaves a product\'s total stock at or below this number. Leave it blank to turn off both the low stock and the out of stock warnings; it then shows Off.',
          'Only the settings you changed are saved. If one is refused, none of them is saved.',
        ],
      },
      {
        title: 'See how documents are numbered',
        operation: 'ViewDocumentNumbering',
        steps: [
          'Open <b>Settings</b> › <b>Document Numbering</b>.',
          'Each row shows a <b>Document Type</b> with its <b>Prefix</b>, <b>Digits</b>, <b>Number Range</b> and <b>First Number</b>, for example PE-000001.',
        ],
        notes: [
          'Numbers are given in order when a document is saved and are never reused.',
          'These formats are view only and cannot be changed in the app.',
        ],
      },
    ],
  },
];
