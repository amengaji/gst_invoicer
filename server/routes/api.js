// server/routes/api.js
const express = require('express');
const router = express.Router();
const multer = require('multer'); // <--- 1. ADD THIS

const authController = require('../controllers/authController');
const clientController = require('../controllers/clientController');
const expenseController = require('../controllers/expenseController');
const invoiceController = require('../controllers/invoiceController');
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/auth');
const backupController = require('../controllers/backupController');
const uploadController = require('../controllers/uploadController');
// Create Multer upload handler
const upload = multer({
  storage: multer.memoryStorage(), // required for S3 buffer upload
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});



// Backup & Restore Routes
router.get('/backup', authMiddleware, backupController.createBackup);
router.post('/backup', authMiddleware, backupController.restoreBackup);

// --- Public Routes ---
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// --- Protected Routes (Require Login) ---
router.use(authMiddleware);

// Uploads (S3)
router.post('/uploads/expense-receipt', upload.single('expense-receipt'), uploadController.uploadExpenseReceipt);
//router.post('/uploads/expense-receipt', uploadController.uploadFile);


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
router.post('/invoices/delete-batch', invoiceController.deleteBulkInvoices);
router.put('/invoices/:id', invoiceController.updateInvoice);
router.put('/invoices/:id/status', invoiceController.updateInvoiceStatus);
router.delete('/invoices/:id', invoiceController.deleteInvoice);

// Settings
router.get('/settings', settingsController.getSettings);
router.put('/settings', settingsController.updateSettings);

module.exports = router;
