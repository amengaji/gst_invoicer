// server/routes/api.js
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const clientController = require('../controllers/clientController');
const expenseController = require('../controllers/expenseController');
const invoiceController = require('../controllers/invoiceController');
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/auth');
const backupController = require('../controllers/backupController');
const auth = require('../middleware/auth'); 


// Backup & Restore Routes
router.get('/backup', auth, backupController.createBackup);
router.post('/backup', auth, backupController.restoreBackup);

// --- Public Routes ---
router.post('/register', authController.register);
router.post('/login', authController.login);

// --- Protected Routes (Require Login) ---
router.use(authMiddleware); // All routes below this line need a token

// Clients
router.get('/clients', clientController.getAllClients);
router.post('/clients', clientController.createClient);
router.put('/clients/:id', clientController.updateClient);
router.delete('/clients/:id', clientController.deleteClient);

// Expenses
router.get('/expenses', expenseController.getAllExpenses);
router.post('/expenses', expenseController.createExpense);
router.put('/expenses/:id', expenseController.updateExpense);
router.delete('/expenses/:id', expenseController.deleteExpense);

// Invoices
router.get('/invoices', invoiceController.getAllInvoices);
router.post('/invoices', invoiceController.createInvoice);
router.post('/invoices/delete-batch', invoiceController.deleteBulkInvoices); // NEW BULK ROUTE
router.put('/invoices/:id', invoiceController.updateInvoice);
router.put('/invoices/:id/status', invoiceController.updateInvoiceStatus);
router.delete('/invoices/:id', invoiceController.deleteInvoice);

// Settings
router.get('/settings', settingsController.getSettings);
router.put('/settings', settingsController.updateSettings);

module.exports = router;