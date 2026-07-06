// Aggregates all module routers under a single API router.
const express = require('express');
const healthRoutes = require('../modules/health/health.routes');
const authRoutes = require('../modules/auth/auth.routes');
const userRoutes = require('../modules/users/user.routes');
const roleRoutes = require('../modules/roles/role.routes');
const locationRoutes = require('../modules/locations/location.routes');
const customerRoutes = require('../modules/customers/customer.routes');
const customerContactRoutes = require('../modules/customerContacts/customerContact.routes');
const productRoutes = require('../modules/products/product.routes');
const sparePartRoutes = require('../modules/spareParts/sparePart.routes');
const customerMachineRoutes = require('../modules/customerMachines/customerMachine.routes');
const leadRoutes = require('../modules/leads/lead.routes');
const taskRoutes = require('../modules/tasks/task.routes');
const uploadRoutes = require('../modules/uploads/upload.routes');
const pdfRoutes = require('../modules/pdf/pdf.routes');
const installationReportRoutes = require('../modules/reports/installation/installationReport.routes');
const serviceReportRoutes = require('../modules/reports/service/serviceReport.routes');
const pmReportRoutes = require('../modules/reports/preventiveMaintenance/pmReport.routes');
const inspectionReportRoutes = require('../modules/reports/inspection/inspectionReport.routes');
const incidentReportRoutes = require('../modules/reports/incident/incidentReport.routes');
const reportAggregateRoutes = require('../modules/reports/shared/report.routes');
const quotationRoutes = require('../modules/quotations/quotation.routes');
const paymentRoutes = require('../modules/payments/payment.routes');
const outstandingRoutes = require('../modules/outstandings/outstanding.routes');
const expenseCategoryRoutes = require('../modules/expenseCategories/expenseCategory.routes');
const expenseRoutes = require('../modules/expenses/expense.routes');
const notificationRoutes = require('../modules/notifications/notification.routes');
const dashboardRoutes = require('../modules/dashboard/dashboard.routes');
const companySettingsRoutes = require('../modules/companySettings/companySettings.routes');
const companyRoutes = require('../modules/companies/company.routes');
const orderRoutes = require('../modules/orders/order.routes');
const orderDocumentRoutes = require('../modules/orderDocuments/orderDocument.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/locations', locationRoutes);
router.use('/customers', customerRoutes);
router.use('/customer-contacts', customerContactRoutes);
router.use('/products', productRoutes);
router.use('/spare-parts', sparePartRoutes);
router.use('/customer-machines', customerMachineRoutes);
router.use('/leads', leadRoutes);
router.use('/tasks', taskRoutes);
router.use('/uploads', uploadRoutes);
router.use('/pdf', pdfRoutes);

// Reports — sub-paths first, then the aggregate (Express matches in order).
router.use('/reports/installation', installationReportRoutes);
router.use('/reports/service', serviceReportRoutes);
router.use('/reports/preventive-maintenance', pmReportRoutes);
router.use('/reports/inspection', inspectionReportRoutes);
router.use('/reports/incident', incidentReportRoutes);
router.use('/reports', reportAggregateRoutes);

router.use('/quotations', quotationRoutes);
router.use('/orders', orderRoutes);
router.use('/order-documents', orderDocumentRoutes);

router.use('/payments', paymentRoutes);
router.use('/outstandings', outstandingRoutes);
router.use('/expense-categories', expenseCategoryRoutes);
router.use('/expenses', expenseRoutes);

router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/company-settings', companySettingsRoutes);
router.use('/companies', companyRoutes);

module.exports = router;
