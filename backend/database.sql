PRAGMA foreign_keys = ON;

CREATE TABLE category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER category_updated_at AFTER UPDATE ON category
FOR EACH ROW BEGIN
  UPDATE category SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TABLE unit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER unit_updated_at AFTER UPDATE ON unit
FOR EACH ROW BEGIN
  UPDATE unit SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TABLE packing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER packing_updated_at AFTER UPDATE ON packing
FOR EACH ROW BEGIN
  UPDATE packing SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TABLE tax_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  tax_rate REAL NOT NULL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER tax_type_updated_at AFTER UPDATE ON tax_type
FOR EACH ROW BEGIN
  UPDATE tax_type SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TABLE product (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  barcode TEXT,
  is_active INTEGER DEFAULT 1,
  is_service_item INTEGER DEFAULT 0,
  is_purchasable INTEGER DEFAULT 1,
  is_sellable INTEGER DEFAULT 1,
  cost_price NUMERIC,
  selling_price NUMERIC,
  mrp NUMERIC,
  max_stock REAL,
  min_stock REAL,
  valuation_method TEXT,
  is_batch_available INTEGER DEFAULT 0,
  has_expiry_date INTEGER DEFAULT 0,
  has_manufacturing_date INTEGER DEFAULT 0,
  remarks TEXT,
  category_id INTEGER,
  unit_id INTEGER,
  packing_id INTEGER,
  tax_type_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES category(id),
  FOREIGN KEY (unit_id) REFERENCES unit(id),
  FOREIGN KEY (packing_id) REFERENCES packing(id),
  FOREIGN KEY (tax_type_id) REFERENCES tax_type(id)
);

CREATE TRIGGER product_updated_at AFTER UPDATE ON product
FOR EACH ROW BEGIN
  UPDATE product SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TABLE bonus_info (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  min_quantity REAL,
  bonus_quantity REAL,
  product_id INTEGER,
  FOREIGN KEY (product_id) REFERENCES product(id)
);

CREATE TABLE product_stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quantity REAL,
  cost_price REAL,
  selling_price REAL,
  mrp REAL,
  product_id INTEGER,
  FOREIGN KEY (product_id) REFERENCES product(id)
);

CREATE TABLE user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  gender TEXT,
  contact TEXT,
  image_url TEXT,
  is_active INTEGER DEFAULT 1,
  account_non_locked INTEGER DEFAULT 1,
  failed_attempt INTEGER DEFAULT 0,
  lock_time DATETIME DEFAULT NULL,
  remarks TEXT,
  role_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES role(id)
);

CREATE TRIGGER user_updated_at AFTER UPDATE ON user
FOR EACH ROW BEGIN
  UPDATE user SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TABLE vendor (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  registration_number TEXT,
  is_active INTEGER DEFAULT 1,
  contact TEXT,
  address TEXT,
  email TEXT,
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER vendor_updated_at AFTER UPDATE ON vendor
FOR EACH ROW BEGIN
  UPDATE vendor SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TABLE customer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  registration_number TEXT,
  is_active INTEGER DEFAULT 1,
  contact TEXT,
  address TEXT,
  email TEXT,
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER customer_updated_at AFTER UPDATE ON customer
FOR EACH ROW BEGIN
  UPDATE customer SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TABLE account_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_code TEXT,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  deletable INTEGER DEFAULT 1,
  is_system_generated INTEGER DEFAULT 0,
  parent_account_name TEXT,
  parent_id INTEGER DEFAULT 0,
  remarks TEXT,
  vendor_id INTEGER DEFAULT NULL UNIQUE,
  customer_id INTEGER DEFAULT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendor(id),
  FOREIGN KEY (customer_id) REFERENCES customer(id)
);

CREATE TRIGGER account_master_updated_at AFTER UPDATE ON account_master
FOR EACH ROW BEGIN
  UPDATE account_master SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TABLE account_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  heading TEXT NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE master_purchase_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  bill_date TEXT,
  system_entry_no TEXT UNIQUE NOT NULL,
  bill_no TEXT,
  transaction_type TEXT,
  sub_total REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  non_taxable_amount REAL NOT NULL DEFAULT 0,
  taxable_amount REAL NOT NULL DEFAULT 0,
  total_tax REAL NOT NULL DEFAULT 0,
  rounded INTEGER DEFAULT 0,
  rounding REAL NOT NULL DEFAULT 0,
  grand_total REAL NOT NULL DEFAULT 0,
  discount_type TEXT,
  remarks TEXT,
  vendor_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendor(id),
  UNIQUE (vendor_id, bill_no)
);

CREATE TRIGGER master_purchase_entry_updated_at AFTER UPDATE ON master_purchase_entry
FOR EACH ROW BEGIN
  UPDATE master_purchase_entry SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TABLE purchase_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_purchase_entry_id INTEGER,
  quantity REAL,
  cost_price REAL,
  selling_price REAL,
  mrp REAL,
  product_id INTEGER,
  FOREIGN KEY (master_purchase_entry_id) REFERENCES master_purchase_entry(id),
  FOREIGN KEY (product_id) REFERENCES product(id)
);

CREATE TABLE master_sales_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  system_entry_no TEXT UNIQUE NOT NULL,
  transaction_type TEXT,
  sub_total REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  non_taxable_amount REAL NOT NULL DEFAULT 0,
  taxable_amount REAL NOT NULL DEFAULT 0,
  total_tax REAL NOT NULL DEFAULT 0,
  rounded INTEGER DEFAULT 0,
  is_cancelled INTEGER DEFAULT 0,
  rounding REAL NOT NULL DEFAULT 0,
  grand_total REAL NOT NULL DEFAULT 0,
  discount_type TEXT,
  remarks TEXT,
  cancel_remarks TEXT,
  customer_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customer(id)
);

CREATE TRIGGER master_sales_entry_updated_at AFTER UPDATE ON master_sales_entry
FOR EACH ROW BEGIN
  UPDATE master_sales_entry SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TABLE sales_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_sales_entry_id INTEGER,
  quantity REAL,
  cost_price REAL,
  selling_price REAL,
  mrp REAL,
  product_id INTEGER,
  FOREIGN KEY (master_sales_entry_id) REFERENCES master_sales_entry(id),
  FOREIGN KEY (product_id) REFERENCES product(id)
);

CREATE TABLE master_purchase_return (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  system_entry_no TEXT UNIQUE NOT NULL,
  bill_no TEXT,
  transaction_type TEXT,
  sub_total REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  non_taxable_amount REAL NOT NULL DEFAULT 0,
  taxable_amount REAL NOT NULL DEFAULT 0,
  total_tax REAL NOT NULL DEFAULT 0,
  rounded INTEGER DEFAULT 0,
  rounding REAL NOT NULL DEFAULT 0,
  grand_total REAL NOT NULL DEFAULT 0,
  discount_type TEXT,
  remarks TEXT,
  vendor_id INTEGER,
  FOREIGN KEY (vendor_id) REFERENCES vendor(id)
);

CREATE TABLE purchase_return_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_purchase_return_id INTEGER,
  quantity REAL,
  cost_price REAL,
  selling_price REAL,
  mrp REAL,
  product_id INTEGER,
  FOREIGN KEY (master_purchase_return_id) REFERENCES master_purchase_return(id),
  FOREIGN KEY (product_id) REFERENCES product(id)
);

CREATE TABLE master_sales_return (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  system_entry_no TEXT UNIQUE NOT NULL,
  transaction_type TEXT,
  sub_total REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  non_taxable_amount REAL NOT NULL DEFAULT 0,
  taxable_amount REAL NOT NULL DEFAULT 0,
  total_tax REAL NOT NULL DEFAULT 0,
  rounded INTEGER DEFAULT 0,
  rounding REAL NOT NULL DEFAULT 0,
  grand_total REAL NOT NULL DEFAULT 0,
  discount_type TEXT,
  remarks TEXT,
  customer_id INTEGER,
  FOREIGN KEY (customer_id) REFERENCES customer(id)
);

CREATE TABLE sales_return_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_sales_return_id INTEGER,
  quantity REAL,
  cost_price REAL,
  selling_price REAL,
  mrp REAL,
  product_id INTEGER,
  FOREIGN KEY (master_sales_return_id) REFERENCES master_sales_return(id),
  FOREIGN KEY (product_id) REFERENCES product(id)
);

CREATE TABLE master_payment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  system_entry_no TEXT UNIQUE NOT NULL,
  type TEXT,
  amount REAL NOT NULL DEFAULT 0,
  narration TEXT,
  total_adjusted_paid_amount REAL NOT NULL DEFAULT 0,
  unadjusted_amount REAL NOT NULL DEFAULT 0,
  total_payment_amount REAL NOT NULL DEFAULT 0,
  vendor_id INTEGER,
  customer_id INTEGER,
  transaction_type INTEGER,
  FOREIGN KEY (vendor_id) REFERENCES vendor(id),
  FOREIGN KEY (customer_id) REFERENCES customer(id),
  FOREIGN KEY (transaction_type) REFERENCES account_master(id)
);

CREATE TABLE payment_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_payment_id INTEGER,
  invoice_date TEXT,
  invoice_number TEXT,
  total_invoice_amount REAL NOT NULL DEFAULT 0,
  due_amount REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (master_payment_id) REFERENCES master_payment(id)
);

CREATE TABLE amount_due_invoice (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE,
  total_invoice_amount REAL NOT NULL DEFAULT 0,
  due_amount REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0
);

CREATE TABLE master_stock_adjustment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  system_entry_no TEXT UNIQUE NOT NULL,
  remarks TEXT
);

CREATE TABLE stock_adjustment_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_stock_adjustment_id INTEGER,
  adjustment_type TEXT,
  quantity REAL,
  reason TEXT,
  product_id INTEGER,
  FOREIGN KEY (master_stock_adjustment_id) REFERENCES master_stock_adjustment(id),
  FOREIGN KEY (product_id) REFERENCES product(id)
);

CREATE TABLE master_journal_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  system_entry_no TEXT NOT NULL UNIQUE,
  remarks TEXT,
  master_purchase_entry_id INTEGER,
  master_sales_entry_id INTEGER,
  master_purchase_return_id INTEGER,
  master_sales_return_id INTEGER,
  master_payment_id INTEGER,
  FOREIGN KEY (master_purchase_entry_id) REFERENCES master_purchase_entry(id),
  FOREIGN KEY (master_sales_entry_id) REFERENCES master_sales_entry(id),
  FOREIGN KEY (master_purchase_return_id) REFERENCES master_purchase_return(id),
  FOREIGN KEY (master_sales_return_id) REFERENCES master_sales_return(id),
  FOREIGN KEY (master_payment_id) REFERENCES master_payment(id)
);

CREATE TABLE journal_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_journal_entry_id INTEGER,
  narration TEXT,
  debit_amount REAL,
  credit_amount REAL,
  account_master_id INTEGER,
  FOREIGN KEY (master_journal_entry_id) REFERENCES master_journal_entry(id),
  FOREIGN KEY (account_master_id) REFERENCES account_master(id)
);

INSERT INTO category (name, is_active) VALUES
('Smartphones', 1),
('Laptops', 1),
('Accessories', 1),
('Tablets', 1),
('Smartwatches', 1);

INSERT INTO unit (name, is_active) VALUES
('Piece', 1),
('Box', 1),
('Packet', 1),
('Set', 1),
('Bundle', 1);

INSERT INTO packing (name, is_active) VALUES
('Carton', 1),
('Crate', 1),
('Pallet', 1),
('Pack', 1),
('Roll', 1);

INSERT INTO tax_type (name, tax_rate, is_active) VALUES
('VAT 13%', 13, 1),
('Tax Free', 0, 1),
('Exempted', 0, 1);

INSERT INTO product (name, code, barcode, is_active, is_service_item, is_purchasable, is_sellable, cost_price, selling_price, mrp, max_stock, min_stock, valuation_method, is_batch_available, has_expiry_date, has_manufacturing_date, remarks, category_id, unit_id, packing_id, tax_type_id) VALUES
('iPhone 15 Pro', 'P001', '8901234567001', 1, 0, 1, 1, 120000, 135000, 140000, 100, 5, 'FIFO', 0, 0, 0, 'Latest Apple flagship', 1, 1, 1, 1),
('Samsung Galaxy S24', 'P002', '8901234567002', 1, 0, 1, 1, 100000, 115000, 120000, 100, 5, 'FIFO', 0, 0, 0, 'Samsung flagship 2024', 1, 1, 1, 1),
('Google Pixel 8', 'P003', '8901234567003', 1, 0, 1, 1, 90000, 105000, 110000, 80, 4, 'FIFO', 0, 0, 0, 'Google AI phone', 1, 1, 1, 1),
('OnePlus 12', 'P004', '8901234567004', 1, 0, 1, 1, 85000, 99000, 105000, 80, 4, 'FIFO', 0, 0, 0, 'OnePlus flagship', 1, 1, 1, 1),
('Xiaomi Redmi Note 13', 'P005', '8901234567005', 1, 0, 1, 1, 25000, 32000, 35000, 200, 10, 'FIFO', 0, 0, 0, 'Budget smartphone', 1, 1, 1, 1),
('Realme 11 Pro', 'P006', '8901234567006', 1, 0, 1, 1, 30000, 38000, 42000, 150, 8, 'FIFO', 0, 0, 0, 'Mid-range phone', 1, 1, 1, 1),
('MacBook Pro 14', 'P007', '8901234567007', 1, 0, 1, 1, 250000, 280000, 290000, 50, 2, 'FIFO', 0, 0, 0, 'Apple Silicon M3', 2, 1, 1, 1),
('Dell XPS 15', 'P008', '8901234567008', 1, 0, 1, 1, 180000, 210000, 220000, 50, 2, 'FIFO', 0, 0, 0, 'Premium Dell laptop', 2, 1, 1, 1),
('HP Pavilion 15', 'P009', '8901234567009', 1, 0, 1, 1, 80000, 95000, 100000, 80, 4, 'FIFO', 0, 0, 0, 'Mid-range HP laptop', 2, 1, 1, 1),
('Lenovo ThinkPad X1', 'P010', '8901234567010', 1, 0, 1, 1, 200000, 230000, 240000, 40, 2, 'FIFO', 0, 0, 0, 'Business ultrabook', 2, 1, 1, 1),
('Asus ROG Strix', 'P011', '8901234567011', 1, 0, 1, 1, 220000, 250000, 260000, 30, 2, 'FIFO', 0, 0, 0, 'Gaming laptop', 2, 1, 1, 1),
('Acer Aspire 7', 'P012', '8901234567012', 1, 0, 1, 1, 75000, 90000, 95000, 70, 4, 'FIFO', 0, 0, 0, 'Budget laptop', 2, 1, 1, 1),
('USB-C Cable', 'P013', '8901234567013', 1, 0, 1, 1, 500, 800, 1000, 1000, 50, 'FIFO', 0, 0, 0, 'Type-C charging cable', 3, 1, 4, 1),
('Wireless Mouse', 'P014', '8901234567014', 1, 0, 1, 1, 1200, 1800, 2000, 500, 25, 'FIFO', 0, 0, 0, 'Bluetooth mouse', 3, 1, 4, 1),
('Mechanical Keyboard', 'P015', '8901234567015', 1, 0, 1, 1, 4500, 6500, 7000, 200, 10, 'FIFO', 0, 0, 0, 'RGB mechanical keyboard', 3, 1, 4, 1),
('Power Bank 20000mAh', 'P016', '8901234567016', 1, 0, 1, 1, 2500, 3500, 4000, 300, 15, 'FIFO', 0, 0, 0, 'Fast charge power bank', 3, 1, 4, 1),
('Bluetooth Headphones', 'P017', '8901234567017', 1, 0, 1, 1, 3500, 5000, 5500, 250, 12, 'FIFO', 0, 0, 0, 'Noise cancelling headphones', 3, 1, 4, 1),
('Phone Case', 'P018', '8901234567018', 1, 0, 1, 1, 200, 500, 700, 2000, 100, 'FIFO', 0, 0, 0, 'Universal phone case', 3, 1, 4, 1),
('iPad Pro 12.9', 'P019', '8901234567019', 1, 0, 1, 1, 130000, 150000, 160000, 60, 3, 'FIFO', 0, 0, 0, 'Apple iPad Pro', 4, 1, 1, 1),
('Samsung Galaxy Tab S9', 'P020', '8901234567020', 1, 0, 1, 1, 95000, 110000, 115000, 70, 3, 'FIFO', 0, 0, 0, 'Samsung tablet', 4, 1, 1, 1),
('Lenovo Tab P11', 'P021', '8901234567021', 1, 0, 1, 1, 35000, 45000, 50000, 100, 5, 'FIFO', 0, 0, 0, 'Budget Android tablet', 4, 1, 1, 1),
('Xiaomi Pad 6', 'P022', '8901234567022', 1, 0, 1, 1, 40000, 50000, 55000, 100, 5, 'FIFO', 0, 0, 0, 'Xiaomi tablet', 4, 1, 1, 1),
('Huawei MatePad', 'P023', '8901234567023', 1, 0, 1, 1, 45000, 55000, 60000, 80, 4, 'FIFO', 0, 0, 0, 'Huawei tablet', 4, 1, 1, 1),
('Microsoft Surface Pro', 'P024', '8901234567024', 1, 0, 1, 1, 150000, 175000, 185000, 50, 3, 'FIFO', 0, 0, 0, '2-in-1 tablet/laptop', 4, 1, 1, 1),
('Apple Watch Series 9', 'P025', '8901234567025', 1, 0, 1, 1, 45000, 55000, 60000, 100, 5, 'FIFO', 0, 0, 0, 'Apple smartwatch', 5, 1, 4, 1),
('Samsung Galaxy Watch 6', 'P026', '8901234567026', 1, 0, 1, 1, 32000, 40000, 45000, 100, 5, 'FIFO', 0, 0, 0, 'Samsung smartwatch', 5, 1, 4, 1),
('Garmin Fenix 7', 'P027', '8901234567027', 1, 0, 1, 1, 75000, 90000, 95000, 50, 3, 'FIFO', 0, 0, 0, 'Premium GPS watch', 5, 1, 4, 1),
('Fitbit Charge 6', 'P028', '8901234567028', 1, 0, 1, 1, 12000, 16000, 18000, 200, 10, 'FIFO', 0, 0, 0, 'Fitness tracker', 5, 1, 4, 1),
('Amazfit GTS 4', 'P029', '8901234567029', 1, 0, 1, 1, 15000, 20000, 22000, 150, 8, 'FIFO', 0, 0, 0, 'Affordable smartwatch', 5, 1, 4, 1),
('Huawei Watch GT 4', 'P030', '8901234567030', 1, 0, 1, 1, 20000, 26000, 28000, 120, 6, 'FIFO', 0, 0, 0, 'Huawei smartwatch', 5, 1, 4, 1);

INSERT INTO bonus_info (min_quantity, bonus_quantity, product_id) VALUES
(10, 1, 1), (25, 3, 1),
(10, 1, 2), (25, 3, 2),
(10, 1, 3), (25, 3, 3),
(10, 1, 4), (25, 3, 4),
(10, 1, 5), (25, 3, 5),
(10, 1, 6), (25, 3, 6),
(5, 1, 7), (15, 3, 7),
(5, 1, 8), (15, 3, 8),
(5, 1, 9), (15, 3, 9),
(5, 1, 10), (15, 3, 10),
(5, 1, 11), (15, 3, 11),
(5, 1, 12), (15, 3, 12),
(50, 5, 13), (100, 12, 13),
(20, 2, 14), (50, 6, 14),
(10, 1, 15), (25, 3, 15),
(10, 1, 16), (25, 3, 16),
(10, 1, 17), (25, 3, 17),
(50, 5, 18), (100, 12, 18),
(5, 1, 19), (15, 3, 19),
(5, 1, 20), (15, 3, 20),
(10, 1, 21), (25, 3, 21),
(10, 1, 22), (25, 3, 22),
(10, 1, 23), (25, 3, 23),
(5, 1, 24), (15, 3, 24),
(10, 1, 25), (25, 3, 25),
(10, 1, 26), (25, 3, 26),
(5, 1, 27), (15, 3, 27),
(20, 2, 28), (50, 6, 28),
(15, 2, 29), (40, 5, 29),
(10, 1, 30), (25, 3, 30);

INSERT INTO vendor (name, registration_number, is_active, contact, address, email, remarks)
VALUES
('Tech Distributors Inc.', 'REG12345', 1, '9876543210', 'Kathmandu, Nepal', 'vendor1@techdist.com', 'Bulk electronics supplier'),
('Digital Nepal', 'REG12347', 1, '9811122233', 'Pokhara, Nepal', 'vendor2@digitalnepal.com', 'Laptop and accessory wholesaler'),
('Everest Traders', 'REG12349', 1, '9822334455', 'Chitwan, Nepal', 'vendor3@everesttraders.com', 'Tablet and watch supplier'),
('Quick Supplies', 'REG12351', 1, '9855566778', 'Butwal, Nepal', 'vendor4@quicksupplies.com', 'General electronics vendor'),
('Ecom Vendor House', 'REG12353', 1, '9866677885', 'Nepalgunj, Nepal', 'vendor5@ecomvendor.com', 'Online platform supplier');

INSERT INTO customer (name, registration_number, is_active, contact, address, email, remarks)
VALUES
('Gadget Retailers', 'REG12346', 1, '9801234567', 'Lalitpur, Nepal', 'customer1@gadgetretail.com', 'Regular mobile retailer'),
('Smart Solutions', 'REG12348', 1, '9808765432', 'Biratnagar, Nepal', 'customer2@smartsolutions.com', 'Corporate client'),
('Valley Mobiles', 'REG12350', 1, '9841122334', 'Bhaktapur, Nepal', 'customer3@valleymobiles.com', 'Mobile shop chain'),
('GreenTech Enterprises', 'REG12352', 1, '9809988776', 'Dharan, Nepal', 'customer4@greentech.com', 'Eco-tech solutions firm'),
('City Electronics', 'REG12354', 1, '9812345678', 'Hetauda, Nepal', 'customer5@cityelectronics.com', 'Retail electronics chain');

INSERT INTO account_master (id, account_code, account_name, account_type, is_active, deletable, is_system_generated, parent_account_name, parent_id, remarks, vendor_id, customer_id) VALUES
(1, 'C-000', 'Cash In Hand', 'Cash & Cash Equivalents', 1, 0, 1, NULL, 0, NULL, NULL, NULL),
(2, 'S-000', 'Sales', 'Direct Income', 1, 0, 1, NULL, 0, NULL, NULL, NULL),
(3, 'C-001', 'Cash', 'Cash & Cash Equivalents', 1, 0, 1, 'Cash In Hand', 1, NULL, NULL, NULL),
(4, 'P-001', 'Purchase', 'Cost of Goods Sold', 1, 0, 1, NULL, 0, NULL, NULL, NULL),
(5, 'S-001', 'VAT Sales', 'Direct Income', 1, 0, 1, 'Sales', 2, NULL, NULL, NULL),
(6, 'C-002', 'Petty Cash', 'Cash & Cash Equivalents', 1, 0, 1, 'Cash In Hand', 1, NULL, NULL, NULL),
(7, 'VP-001', 'VAT Purchase', 'Cost of Goods Sold', 1, 0, 1, 'Purchase', 4, NULL, NULL, NULL),
(8, 'E-002', 'Printing and Stationary', 'Administrative Expenses', 1, 0, 1, NULL, 0, NULL, NULL, NULL),
(9, 'E-003', 'Fuel Expenses', 'Administrative Expenses', 1, 0, 1, NULL, 0, NULL, NULL, NULL),
(10, 'VFP-001', 'VAT Free Purchase', 'Cost of Goods Sold', 1, 0, 1, 'Purchase', 4, NULL, NULL, NULL),
(11, 'FA-001', 'Fixed Assets', 'Non-Current Assets', 1, 0, 1, NULL, 0, NULL, NULL, NULL),
(12, NULL, 'Plant and Machinery', 'Non-Current Assets', 1, 0, 1, 'Fixed Assets', 11, NULL, NULL, NULL),
(13, NULL, 'Debtors', 'Receivables', 1, 0, 1, NULL, 0, NULL, NULL, NULL),
(14, 'TP-001', 'Tax Payable', 'Other Payables', 1, 0, 1, NULL, 0, NULL, NULL, NULL),
(15, 'T-001', 'Tax', 'Other Payables', 1, 0, 1, 'Tax Payable', 14, NULL, NULL, NULL),
(16, 'OE-001', 'Other Expenses', 'Administrative Expenses', 1, 0, 1, NULL, 0, NULL, NULL, NULL),
(17, 'A-001', 'Adjustment', 'Administrative Expenses', 1, 0, 1, 'Other Expenses', 16, NULL, NULL, NULL),
(18, 'TP-002', 'Trader Payable', 'Payables', 1, 0, 1, NULL, 0, NULL, NULL, NULL),
(19, NULL, 'In. Direct', 'Indirect Income', 1, 0, 1, NULL, 0, NULL, NULL, NULL),
(20, NULL, 'Interest', 'Indirect Income', 1, 0, 1, 'In. Direct', 19, NULL, NULL, NULL),
(21, NULL, 'In. Expenses', 'Other Indirect Expenses', 1, 0, 1, NULL, 0, NULL, NULL, NULL),
(22, NULL, 'Bank Charge', 'Other Indirect Expenses', 1, 0, 1, 'In. Expenses', 21, NULL, NULL, NULL),
(23, NULL, 'Trade Receivables', 'Receivables', 1, 0, 1, NULL, 0, NULL, NULL, NULL),
(24, NULL, 'VAT Free Sales', 'Direct Income', 1, 0, 1, 'Sales', 2, NULL, NULL, NULL),
(25, NULL, 'Tech Distributors Inc.', 'Payables', 1, 1, 0, 'Trader Payable', 18, 'Bulk electronics supplier', 1, NULL),
(26, NULL, 'Digital Nepal', 'Payables', 1, 1, 0, 'Trader Payable', 18, 'Laptop and accessory wholesaler', 2, NULL),
(27, NULL, 'Everest Traders', 'Payables', 1, 1, 0, 'Trader Payable', 18, 'Tablet and watch supplier', 3, NULL),
(28, NULL, 'Quick Supplies', 'Payables', 1, 1, 0, 'Trader Payable', 18, 'General electronics vendor', 4, NULL),
(29, NULL, 'Ecom Vendor House', 'Payables', 1, 1, 0, 'Trader Payable', 18, 'Online platform supplier', 5, NULL),
(30, NULL, 'Gadget Retailers', 'Receivables', 1, 1, 0, 'Trade Receivables', 23, 'Regular mobile retailer', NULL, 1),
(31, NULL, 'Smart Solutions', 'Receivables', 1, 1, 0, 'Trade Receivables', 23, 'Corporate client', NULL, 2),
(32, NULL, 'Valley Mobiles', 'Receivables', 1, 1, 0, 'Trade Receivables', 23, 'Mobile shop chain', NULL, 3),
(33, NULL, 'GreenTech Enterprises', 'Receivables', 1, 1, 0, 'Trade Receivables', 23, 'Eco-tech solutions firm', NULL, 4),
(34, NULL, 'City Electronics', 'Receivables', 1, 1, 0, 'Trade Receivables', 23, 'Retail electronics chain', NULL, 5);

INSERT INTO account_types (heading, name) VALUES
('Assets', 'Cash & Cash Equivalents'),
('Assets', 'Other Current Assets'),
('Assets', 'Receivables'),
('Assets', 'Other Receivables'),
('Assets', 'Non-Current Assets'),
('Liability', 'Other Payables'),
('Liability', 'Statutory Payables'),
('Liability', 'Secured Loan'),
('Liability', 'Unsecured Loan'),
('Liability', 'Payables'),
('Equity', 'Capital Account'),
('Equity', 'Retained Earning'),
('Income', 'Direct Income'),
('Income', 'Indirect Income'),
('Expenses', 'Administrative Expenses'),
('Expenses', 'Sales & Marketing Expenses'),
('Expenses', 'Other Indirect Expenses'),
('Expenses', 'Cost of Goods Sold');

CREATE TABLE configuration (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  label TEXT,
  value TEXT,
  is_editable INTEGER DEFAULT 1
);

INSERT INTO configuration (name, label, value, is_editable) VALUES
('company_name', 'Company Name', 'Test Pvt. Ltd.', 1),
('company_reg_type', 'Company Reg. Type', 'PAN', 1),
('company_reg', 'Company Reg. No.', '3872378734', 1),
('company_contact', 'Company Contact', '98432337382', 1),
('company_address', 'Company Address', 'Kathmandu', 1),
('company_email', 'Company Email', 'test@company.com', 1),
('calendar_type', 'Calendar Type', 'BS', 1),
('default_rounding', 'Default Rounding', '1', 1),
('fiscal_year', 'Fiscal Year', '2081', 1);

CREATE TABLE operation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  master_module TEXT NOT NULL
);

CREATE TABLE role (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER role_updated_at AFTER UPDATE ON role
FOR EACH ROW BEGIN
  UPDATE role SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TABLE role_operation (
  role_id INTEGER NOT NULL,
  operation_id INTEGER NOT NULL,
  PRIMARY KEY (role_id, operation_id),
  FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE,
  FOREIGN KEY (operation_id) REFERENCES operation(id) ON DELETE CASCADE
);

INSERT INTO operation (name, module, master_module) VALUES
('CreateCategory', 'Category', 'Masters'),
('ViewCategory', 'Category', 'Masters'),
('EditCategory', 'Category', 'Masters'),
('DeleteCategory', 'Category', 'Masters'),

('CreateUnit', 'Unit', 'Masters'),
('ViewUnit', 'Unit', 'Masters'),
('EditUnit', 'Unit', 'Masters'),
('DeleteUnit', 'Unit', 'Masters'),

('CreatePacking', 'Packing', 'Masters'),
('ViewPacking', 'Packing', 'Masters'),
('EditPacking', 'Packing', 'Masters'),
('DeletePacking', 'Packing', 'Masters'),

('CreateTaxType', 'TaxType', 'Masters'),
('ViewTaxType', 'TaxType', 'Masters'),
('EditTaxType', 'TaxType', 'Masters'),
('DeleteTaxType', 'TaxType', 'Masters'),

('CreateProduct', 'Product', 'Product'),
('ViewProduct', 'Product', 'Product'),
('EditProduct', 'Product', 'Product'),
('DeleteProduct', 'Product', 'Product'),

('CreateVendor', 'Vendor', 'Purchase'),
('ViewVendor', 'Vendor', 'Purchase'),
('EditVendor', 'Vendor', 'Purchase'),
('DeleteVendor', 'Vendor', 'Purchase'),

('CreateCustomer', 'Customer', 'Sales'),
('ViewCustomer', 'Customer', 'Sales'),
('EditCustomer', 'Customer', 'Sales'),
('DeleteCustomer', 'Customer', 'Sales'),

('CreateAccountMaster', 'AccountMaster', 'Accounting'),
('ViewAccountMaster', 'AccountMaster', 'Accounting'),
('EditAccountMaster', 'AccountMaster', 'Accounting'),
('DeleteAccountMaster', 'AccountMaster', 'Accounting'),

('CreateUser', 'User', 'User and Roles'),
('ViewUser', 'User', 'User and Roles'),
('EditUser', 'User', 'User and Roles'),
('DeleteUser', 'User', 'User and Roles'),

('CreateRole', 'Role', 'User and Roles'),
('ViewRole', 'Role', 'User and Roles'),
('EditRole', 'Role', 'User and Roles'),
('DeleteRole', 'Role', 'User and Roles'),

('CreateConfiguration', 'Configuration', 'Settings'),
('ViewConfiguration', 'Configuration', 'Settings'),
('EditConfiguration', 'Configuration', 'Settings'),
('DeleteConfiguration', 'Configuration', 'Settings'),

('CreateDocumentNumbering', 'DocumentNumbering', 'Settings'),
('ViewDocumentNumbering', 'DocumentNumbering', 'Settings'),
('EditDocumentNumbering', 'DocumentNumbering', 'Settings'),
('DeleteDocumentNumbering', 'DocumentNumbering', 'Settings'),

('CreatePurchaseEntry', 'PurchaseEntry', 'Purchase'),
('ViewPurchaseEntry', 'PurchaseEntry', 'Purchase'),
('EditPurchaseEntry', 'PurchaseEntry', 'Purchase'),
('DeletePurchaseEntry', 'PurchaseEntry', 'Purchase'),

('CreatePurchaseReturn', 'PurchaseReturn', 'Purchase'),
('ViewPurchaseReturn', 'PurchaseReturn', 'Purchase'),
('EditPurchaseReturn', 'PurchaseReturn', 'Purchase'),
('DeletePurchaseReturn', 'PurchaseReturn', 'Purchase'),

('CreateSalesEntry', 'SalesEntry', 'Sales'),
('ViewSalesEntries', 'SalesEntry', 'Sales'),
('EditSalesEntry', 'SalesEntry', 'Sales'),
('CancelSalesEntry', 'SalesEntry', 'Sales'),

('CreateSalesReturn', 'SalesReturn', 'Sales'),
('ViewSalesReturns', 'SalesReturn', 'Sales'),
('EditSalesReturn', 'SalesReturn', 'Sales'),
('DeleteSalesReturn', 'SalesReturn', 'Sales'),

('CreateStockAdjustment', 'StockAdjustment', 'Inventory'),
('ViewStockAdjustment', 'StockAdjustment', 'Inventory'),
('EditStockAdjustment', 'StockAdjustment', 'Inventory'),
('DeleteStockAdjustment', 'StockAdjustment', 'Inventory'),

('ViewStockEdit', 'StockEdit', 'Inventory'),
('EditStockEdit', 'StockEdit', 'Inventory'),

('ViewOpeningStock', 'OpeningStock', 'Inventory'),
('CreateOpeningStock', 'OpeningStock', 'Inventory'),

('CreateJournalEntry', 'JournalEntry', 'Accounting'),
('ViewJournalEntries', 'JournalEntry', 'Accounting'),
('EditJournalEntry', 'JournalEntry', 'Accounting'),
('DeleteJournalEntry', 'JournalEntry', 'Accounting'),

('CreatePayment', 'Payment', 'Accounting'),
('ViewVendorPayment', 'Payment', 'Accounting'),
('ViewCustomerPayment', 'Payment', 'Accounting'),
('EditPayment', 'Payment', 'Accounting'),
('DeletePayment', 'Payment', 'Accounting'),

('ViewPaymentAdjustment', 'PaymentAdjustment', 'Accounting'),
('CreatePaymentAdjustment', 'PaymentAdjustment', 'Accounting'),

('ViewOpeningBalance', 'OpeningBalance', 'Accounting'),
('CreateOpeningBalance', 'OpeningBalance', 'Accounting'),

('ViewAccount', 'AccountMaster', 'Accounting');


INSERT INTO role (id, name, description, is_active) VALUES
(1, 'Admin', 'Administrator with full access to all operations', 1);

INSERT INTO role_operation (role_id, operation_id)
SELECT 1, id FROM operation;

CREATE TABLE document_numbering (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  numbering_style TEXT,
  prefix TEXT,
  body_length INTEGER,
  total_length INTEGER,
  start_no INTEGER,
  end_no INTEGER
);

INSERT INTO document_numbering (id, name, prefix, body_length, start_no, end_no) VALUES
(1, 'Purchase Entry', '|PE-', 6,1, 999999),
(4, 'Purchase Order', '|PO-', 6,1, 999999),
(5, 'Purchase Return', '|PR-', 6,1, 999999),
(8, 'Sales Entry', '|SI-', 6,1, 999999),
(9, 'Sales Return', '|SR-', 6,1, 999999),
(10, 'Sales Order', '|SO-', 6,1, 999999),
(11, 'BDE', '|BDE-', 6, 1, 999999),
(12, 'Stock Adjustment', '|SA-', 6,1, 999999),
(17, 'Journal Entry', '|J-', 6, 1, 999999),
(18, 'Payment', '|P-', 6, 1, 999999);
