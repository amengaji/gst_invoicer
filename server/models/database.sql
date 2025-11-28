-- ============================================================
-- CLEAN, FRESH, COMPLETE DATABASE STRUCTURE FOR GST INVOICER
-- ============================================================

-- =====================
-- USERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    company_name VARCHAR(255)
);

-- =====================
-- SETTINGS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,

    company_name     VARCHAR(255),
    email            VARCHAR(255),
    gstin            VARCHAR(50),
    address          TEXT,
    state            VARCHAR(100),
    invoice_prefix   VARCHAR(20),
    currency         VARCHAR(10) DEFAULT 'INR',
    filing_frequency VARCHAR(20) DEFAULT 'Monthly',
    logo             TEXT,
    lut_number       VARCHAR(50),

    bank_accounts    JSONB DEFAULT '[]'::jsonb,
    number_format    VARCHAR(20) DEFAULT 'IN',

    user_id          INTEGER,
    
    CONSTRAINT fk_settings_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- =====================
-- CLIENTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    gstin VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    contacts JSONB DEFAULT '[]'::jsonb,
    user_id INTEGER,

    CONSTRAINT fk_clients_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- =====================
-- INVOICES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(50) PRIMARY KEY,
    client_id VARCHAR(50),

    date DATE,
    amount NUMERIC(15,2),
    tax NUMERIC(15,2),

    status VARCHAR(20),     -- Paid / Pending
    type VARCHAR(50),       -- Intrastate, Export, etc.
    
    currency VARCHAR(10),
    exchange_rate NUMERIC(10,4) DEFAULT 1,

    date_paid DATE,         -- NEW COLUMN

    user_id INTEGER,

    CONSTRAINT fk_invoices_client
        FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_invoices_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- =====================
-- INVOICE ITEMS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(50),
    description TEXT,
    hsn VARCHAR(20),
    qty NUMERIC(10,2),
    price NUMERIC(15,2),

    CONSTRAINT fk_invoice_items_invoice
        FOREIGN KEY (invoice_id)
        REFERENCES invoices(id)
        ON DELETE CASCADE
);

-- =====================
-- EXPENSES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(100),
    date DATE,
    amount NUMERIC(15,2),
    gst_paid NUMERIC(15,2),
    receipt_data TEXT,
    receipt_name VARCHAR(255),

    user_id INTEGER,

    CONSTRAINT fk_expenses_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- ============================================================
-- INSERT NO DEFAULT SETTINGS OR USERS
-- The system will populate settings AFTER registration.
-- ============================================================

