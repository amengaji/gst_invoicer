const express = require('express');
const router = express.Router();

const clientController = require('../controllers/clientController');
const expenseController = require('../controllers/expenseController');
const invoiceController = require('../controllers/invoiceController');
const settingsController = require('../controllers/settingsController');

// --- Client Routes ---
router.get('/clients', clientController.getAllClients);
router.post('/clients', clientController.createClient);
router.put('/clients/:id', clientController.updateClient);
router.delete('/clients/:id', clientController.deleteClient);

// --- Expense Routes ---
router.get('/expenses', expenseController.getAllExpenses);
router.post('/expenses', expenseController.createExpense);

// --- Invoice Routes ---
router.get('/invoices', invoiceController.getAllInvoices);
router.post('/invoices', invoiceController.createInvoice);
router.put('/invoices/:id', invoiceController.updateInvoice); // <--- ADD THIS LINE (Full Update)
router.put('/invoices/:id/status', invoiceController.updateInvoiceStatus);
router.delete('/invoices/:id', invoiceController.deleteInvoice);

// --- Settings Routes ---
router.get('/settings', settingsController.getSettings);
router.put('/settings', settingsController.updateSettings);

module.exports = router;