CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255),
    email VARCHAR(255),
    gstin VARCHAR(50),
    address TEXT,
    state VARCHAR(100),
    invoice_prefix VARCHAR(20),
    currency VARCHAR(10),
    filing_frequency VARCHAR(20),
    logo TEXT, -- Storing Base64 string for simplicity
    lut_number VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(50) PRIMARY KEY, -- Using String ID to match your frontend logic (e.g., C001)
    name VARCHAR(255) NOT NULL,
    gstin VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    contacts JSONB -- Stores the array of contact objects
);

CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(50) PRIMARY KEY, -- e.g., INV-23-001
    client_id VARCHAR(50) REFERENCES clients(id) ON DELETE SET NULL,
    date DATE,
    amount NUMERIC(15, 2),
    tax NUMERIC(15, 2),
    status VARCHAR(20), -- 'Paid', 'Pending'
    type VARCHAR(50), -- 'Intrastate', 'Export', etc.
    currency VARCHAR(10),
    exchange_rate NUMERIC(10, 4) DEFAULT 1
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(50) REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT,
    hsn VARCHAR(20),
    qty NUMERIC(10, 2),
    price NUMERIC(15, 2)
);

CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(100),
    date DATE,
    amount NUMERIC(15, 2),
    gst_paid NUMERIC(15, 2),
    receipt_data TEXT, -- Base64 string of the image
    receipt_name VARCHAR(255)
);

-- Insert default settings row if not exists
INSERT INTO settings (id, company_name, email, gstin, address, state, invoice_prefix, currency, filing_frequency)
SELECT 1, 'My Tech Company', 'admin@company.com', '27AAAAA0000A1Z5', '123 Business Park, Mumbai', 'Maharashtra', 'INV-23', 'INR', 'Monthly'
WHERE NOT EXISTS (SELECT 1 FROM settings);