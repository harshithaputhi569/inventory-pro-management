import User from '../models/User.js';
import Sale from '../models/Sale.js';
import Attendance from '../models/Attendance.js';
import Branch from '../models/Branch.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';

// ─── Helper: build date filter for a field name ──────────────────────────────
const buildDateFilter = (startDate, endDate, field = 'createdAt') => {
  if (!startDate && !endDate) return {};
  const filter = {};
  if (startDate) filter.$gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filter.$lte = end;
  }
  return { [field]: filter };
};

// @desc    Get employee behavior data (summary list) — fixed N+1 via single aggregation
// @route   GET /api/employees/behavior
// @access  Private/Admin/Manager
export const getEmployeeBehavior = async (req, res, next) => {
  try {
    const { startDate, endDate, branchId } = req.query;

    // ── Build user match ─────────────────────────────────────────────────────
    const userMatch = { role: 'staff', storeId: req.user.storeId };
    
    if (req.user.role === 'staff') {
      userMatch._id = new mongoose.Types.ObjectId(req.user.id || req.user._id);
    } else if (req.user.role !== 'admin' && req.user.branchId) {
      userMatch.branchId = new mongoose.Types.ObjectId(req.user.branchId);
    } else if (branchId) {
      userMatch.branchId = new mongoose.Types.ObjectId(branchId);
    }

    const dateFilter = buildDateFilter(startDate, endDate, 'createdAt');
    const attendanceDateFilter = buildDateFilter(startDate, endDate, 'loginTime');

    // ── Fetch all staff ───────────────────────────────────────────────────────
    const employees = await User.find(userMatch).populate('branchId', 'name code').lean();
    const employeeIds = employees.map((e) => e._id);

    if (employeeIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // ── Single sales aggregation for ALL employees ───────────────────────────
    const salesAgg = await Sale.aggregate([
      { $match: { soldBy: { $in: employeeIds }, ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}) } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$soldBy',
          totalSales: { $addToSet: '$_id' },
          totalItems: { $sum: '$items.quantity' },
          damagedCount: { $sum: { $cond: ['$items.isDamaged', '$items.quantity', 0] } },
          exchangeCount: { $sum: { $cond: ['$items.isExchange', '$items.quantity', 0] } },
          sampleCount: { $sum: { $cond: ['$items.isSample', '$items.quantity', 0] } },
          wrongProductCount: { $sum: { $cond: ['$items.isWrongProduct', '$items.quantity', 0] } },
        },
      },
      { $addFields: { salesTransactions: { $size: '$totalSales' } } },
    ]);

    // ── Single sales totals aggregation for ALL employees ────────────────────
    const salesTotalsAgg = await Sale.aggregate([
      { $match: { soldBy: { $in: employeeIds }, ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}) } },
      {
        $group: {
          _id: '$soldBy',
          totalSalesProcessed: { $sum: '$totalAmount' },
          transactionsCount: { $sum: 1 },
        },
      },
    ]);

    // ── Single attendance aggregation for ALL employees ──────────────────────
    const attendanceAgg = await Attendance.aggregate([
      {
        $match: {
          userId: { $in: employeeIds },
          ...(attendanceDateFilter.loginTime ? { loginTime: attendanceDateFilter.loginTime } : {}),
        },
      },
      {
        $group: {
          _id: '$userId',
          lastLogin: { $max: '$loginTime' },
          lastLogout: { $max: '$logoutTime' },
          lastHeartbeat: { $max: '$lastHeartbeat' },
          totalHours: { $sum: '$totalHours' },
          sessions: { $sum: 1 },
        },
      },
    ]);

    // ── Index by employee ID ─────────────────────────────────────────────────
    const salesMap = Object.fromEntries(salesAgg.map((s) => [s._id.toString(), s]));
    const salesTotalsMap = Object.fromEntries(salesTotalsAgg.map((s) => [s._id.toString(), s]));
    const attendanceMap = Object.fromEntries(attendanceAgg.map((a) => [a._id.toString(), a]));

    const behaviorData = employees.map((emp) => {
      const sales = salesMap[emp._id.toString()] || {};
      const salesTotals = salesTotalsMap[emp._id.toString()] || {};
      const att = attendanceMap[emp._id.toString()] || {};
      const totalItems = sales.totalItems || 0;
      return {
        id: emp._id,
        name: emp.fullName,
        role: emp.role,
        email: emp.email,
        phone: emp.phone || null,
        branchId: emp.branchId,
        branchName: emp.branchId?.name || null,
        salesTransactions: salesTotals.transactionsCount || sales.salesTransactions || 0,
        totalSalesProcessed: salesTotals.totalSalesProcessed || 0,
        salesCount: totalItems,
        damagedCount: sales.damagedCount || 0,
        exchangeCount: sales.exchangeCount || 0,
        sampleCount: sales.sampleCount || 0,
        wrongProductCount: sales.wrongProductCount || 0,
        lastLogin: att.lastLogin || null,
        lastLogout: att.lastLogout || null,
        lastHeartbeat: att.lastHeartbeat || null,
        isOnline: att.lastHeartbeat && (new Date() - new Date(att.lastHeartbeat)) < 60000, // Online if pinged in last 60s
        totalHours: att.totalHours || 0,
        sessions: att.sessions || 0,
        status: totalItems > 100 ? 'High Performer' : totalItems > 50 ? 'Good' : 'Stable',
      };
    });

    res.status(200).json({ success: true, data: behaviorData });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single employee detailed report
// @route   GET /api/employees/:id/detail
// @access  Private/Admin/Manager
export const getEmployeeDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, page = 1, limit = 20 } = req.query;

    const isStaff = req.user.role === 'staff';
    const isSelf = id === 'me' || id === req.user.id || id === req.user._id?.toString();

    // Security: Staff can only view their own detail
    if (isStaff && !isSelf) {
      return res.status(403).json({ success: false, message: 'You can only view your own report' });
    }

    const targetId = isSelf ? req.user.id : id;

    // Validate employee belongs to same store
    const employee = await User.findOne({
      _id: targetId,
      storeId: req.user.storeId,
    })
      .select('-password')
      .populate('branchId', 'name code location phone')
      .lean();

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const dateFilter = buildDateFilter(startDate, endDate, 'createdAt');
    const attendanceDateFilter = buildDateFilter(startDate, endDate, 'loginTime');
    const empId = new mongoose.Types.ObjectId(targetId);

    // ── KPI Summary ──────────────────────────────────────────────────────────
    const [kpiAgg] = await Sale.aggregate([
      { $match: { soldBy: empId, ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}) } },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          totalItems: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
          damagedCount: { $sum: { $cond: ['$items.isDamaged', '$items.quantity', 0] } },
          exchangeCount: { $sum: { $cond: ['$items.isExchange', '$items.quantity', 0] } },
          sampleCount: { $sum: { $cond: ['$items.isSample', '$items.quantity', 0] } },
          wrongProductCount: { $sum: { $cond: ['$items.isWrongProduct', '$items.quantity', 0] } },
        },
      },
    ]);

    // ── Sales Summary (Direct on Sale model for totalAmount and transaction count) ──
    const [salesSummary] = await Sale.aggregate([
      { $match: { soldBy: empId, ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}) } },
      {
        $group: {
          _id: null,
          totalSalesAmount: { $sum: '$totalAmount' },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    const [attKpi] = await Attendance.aggregate([
      {
        $match: {
          userId: empId,
          ...(attendanceDateFilter.loginTime ? { loginTime: attendanceDateFilter.loginTime } : {}),
        },
      },
      {
        $group: {
          _id: null,
          totalHours: { $sum: '$totalHours' },
          sessions: { $sum: 1 },
          lastLogin: { $max: '$loginTime' },
          lastLogout: { $max: '$logoutTime' },
        },
      },
    ]);

    // ── Sales list (paginated) ───────────────────────────────────────────────
    const salesQuery = {
      soldBy: empId,
      ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {})
    };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalSales = await Sale.countDocuments(salesQuery);
    const salesList = await Sale.find(salesQuery)
      .populate('items.product', 'name sku')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // ── Attendance log (paginated same page/limit) ───────────────────────────
    const attQuery = {
      userId: empId,
      ...(attendanceDateFilter.loginTime ? { loginTime: attendanceDateFilter.loginTime } : {}),
    };
    const totalAtt = await Attendance.countDocuments(attQuery);
    const attendanceList = await Attendance.find(attQuery)
      .sort({ loginTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // ── Incident items ───────────────────────────────────────────────────────
    const incidentSales = await Sale.aggregate([
      { $match: { soldBy: empId, ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}) } },
      { $unwind: '$items' },
      {
        $match: {
          $or: [
            { 'items.isDamaged': true },
            { 'items.isExchange': true },
            { 'items.isSample': true },
            { 'items.isWrongProduct': true },
          ],
        },
      },
      {
        $project: {
          invoiceNumber: 1,
          createdAt: 1,
          'items.name': 1,
          'items.quantity': 1,
          'items.isDamaged': 1,
          'items.isExchange': 1,
          'items.isSample': 1,
          'items.isWrongProduct': 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
    ]);

    const totalDetailItems = kpiAgg?.totalItems || 0;
    const computedStatus = totalDetailItems > 100 ? 'High Performer' : totalDetailItems > 50 ? 'Good' : 'Stable';

    res.status(200).json({
      success: true,
      data: {
        employee: {
          ...employee,
          status: computedStatus,
        },
        kpi: {
          totalSalesProcessed: salesSummary?.totalSalesAmount || 0,
          transactionCount: salesSummary?.transactionCount || totalSales || 0,
          totalItems: totalDetailItems,
          totalRevenue: salesSummary?.totalSalesAmount ?? (kpiAgg?.totalRevenue || 0),
          damagedCount: kpiAgg?.damagedCount || 0,
          exchangeCount: kpiAgg?.exchangeCount || 0,
          sampleCount: kpiAgg?.sampleCount || 0,
          wrongProductCount: kpiAgg?.wrongProductCount || 0,
          totalHours: attKpi?.totalHours || 0,
          sessions: attKpi?.sessions || 0,
          lastLogin: attKpi?.lastLogin || null,
          lastLogout: attKpi?.lastLogout || null,
          status: computedStatus,
        },
        salesList,
        salesPagination: { total: totalSales, page: parseInt(page), limit: parseInt(limit) },
        attendanceList,
        attendancePagination: { total: totalAtt, page: parseInt(page), limit: parseInt(limit) },
        incidents: incidentSales,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export multiple employees behavior as Excel
// @route   POST /api/employees/export
// @access  Private/Admin/Manager
export const exportEmployeesExcel = async (req, res, next) => {
  try {
    const { startDate, endDate, branchId } = req.body;

    const userMatch = { role: 'staff', storeId: req.user.storeId };
    if (req.user.role !== 'admin' && req.user.branchId) {
      userMatch.branchId = new mongoose.Types.ObjectId(req.user.branchId);
    } else if (branchId) {
      userMatch.branchId = new mongoose.Types.ObjectId(branchId);
    }

    const employees = await User.find(userMatch).populate('branchId', 'name code').lean();
    const employeeIds = employees.map((e) => e._id);

    const dateFilter = buildDateFilter(startDate, endDate, 'createdAt');
    const attendanceDateFilter = buildDateFilter(startDate, endDate, 'loginTime');

    // ── Aggregations ─────────────────────────────────────────────────────────
    const salesAgg = await Sale.aggregate([
      { $match: { soldBy: { $in: employeeIds }, ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}) } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$soldBy',
          totalItems: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
          damagedCount: { $sum: { $cond: ['$items.isDamaged', '$items.quantity', 0] } },
          exchangeCount: { $sum: { $cond: ['$items.isExchange', '$items.quantity', 0] } },
          sampleCount: { $sum: { $cond: ['$items.isSample', '$items.quantity', 0] } },
          wrongProductCount: { $sum: { $cond: ['$items.isWrongProduct', '$items.quantity', 0] } },
        },
      },
    ]);

    const attendanceAgg = await Attendance.aggregate([
      {
        $match: {
          userId: { $in: employeeIds },
          ...(attendanceDateFilter.loginTime ? { loginTime: attendanceDateFilter.loginTime } : {}),
        },
      },
      { $group: { _id: '$userId', totalHours: { $sum: '$totalHours' }, sessions: { $sum: 1 } } },
    ]);

    // ── Sales detail rows ────────────────────────────────────────────────────
    const salesDetail = await Sale.find({
      soldBy: { $in: employeeIds },
      ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
    })
      .populate('soldBy', 'fullName email')
      .lean();

    // ── Attendance detail rows ───────────────────────────────────────────────
    const attendanceDetail = await Attendance.find({
      userId: { $in: employeeIds },
      ...(attendanceDateFilter.loginTime ? { loginTime: attendanceDateFilter.loginTime } : {}),
    })
      .populate('userId', 'fullName email')
      .sort({ loginTime: -1 })
      .lean();

    const salesMap = Object.fromEntries(salesAgg.map((s) => [s._id.toString(), s]));
    const attMap = Object.fromEntries(attendanceAgg.map((a) => [a._id.toString(), a]));

    // ── Build Excel workbook ─────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Inventory Pro';
    workbook.created = new Date();

    // Header style helper
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      },
    };

    // ── Sheet 1: Summary ─────────────────────────────────────────────────────
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Employee Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Branch', key: 'branch', width: 20 },
      { header: 'Items Sold', key: 'totalItems', width: 14 },
      { header: 'Revenue (₹)', key: 'totalRevenue', width: 16 },
      { header: 'Damaged', key: 'damagedCount', width: 12 },
      { header: 'Exchanged', key: 'exchangeCount', width: 12 },
      { header: 'Samples', key: 'sampleCount', width: 12 },
      { header: 'Wrong Product', key: 'wrongProductCount', width: 16 },
      { header: 'Total Hours', key: 'totalHours', width: 14 },
      { header: 'Sessions', key: 'sessions', width: 12 },
      { header: 'Status', key: 'status', width: 16 },
    ];
    summarySheet.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));
    summarySheet.getRow(1).height = 28;

    employees.forEach((emp) => {
      const s = salesMap[emp._id.toString()] || {};
      const a = attMap[emp._id.toString()] || {};
      const totalItems = s.totalItems || 0;
      summarySheet.addRow({
        name: emp.fullName,
        email: emp.email,
        phone: emp.phone || '—',
        branch: emp.branchId?.name || '—',
        totalItems,
        totalRevenue: s.totalRevenue || 0,
        damagedCount: s.damagedCount || 0,
        exchangeCount: s.exchangeCount || 0,
        sampleCount: s.sampleCount || 0,
        wrongProductCount: s.wrongProductCount || 0,
        totalHours: (a.totalHours || 0).toFixed(2),
        sessions: a.sessions || 0,
        status: totalItems > 100 ? 'High Performer' : totalItems > 50 ? 'Good' : 'Stable',
      });
    });

    // ── Sheet 2: Sales Detail ────────────────────────────────────────────────
    const salesSheet = workbook.addWorksheet('Sales Detail');
    salesSheet.columns = [
      { header: 'Date', key: 'date', width: 18 },
      { header: 'Invoice #', key: 'invoice', width: 20 },
      { header: 'Employee', key: 'employee', width: 24 },
      { header: 'Brand', key: 'brand', width: 16 },
      { header: 'Product', key: 'product', width: 28 },
      { header: 'Qty', key: 'qty', width: 8 },
      { header: 'Price (₹)', key: 'price', width: 12 },
      { header: 'Subtotal (₹)', key: 'subtotal', width: 14 },
      { header: 'Damaged', key: 'damaged', width: 12 },
      { header: 'Exchange', key: 'exchange', width: 12 },
      { header: 'Sample', key: 'sample', width: 10 },
      { header: 'Wrong Product', key: 'wrongProduct', width: 16 },
      { header: 'Payment', key: 'payment', width: 12 },
    ];
    salesSheet.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));
    salesSheet.getRow(1).height = 28;

    salesDetail.forEach((sale) => {
      sale.items.forEach((item) => {
        salesSheet.addRow({
          date: new Date(sale.createdAt).toLocaleString('en-IN'),
          invoice: sale.invoiceNumber,
          employee: sale.soldBy?.fullName || '',
          brand: item.product?.brand || '—',
          product: item.name || '',
          qty: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
          damaged: item.isDamaged ? 'Yes' : 'No',
          exchange: item.isExchange ? 'Yes' : 'No',
          sample: item.isSample ? 'Yes' : 'No',
          wrongProduct: item.isWrongProduct ? 'Yes' : 'No',
          payment: sale.paymentMethod,
        });
      });
    });

    // ── Sheet 3: Attendance Log ──────────────────────────────────────────────
    const attSheet = workbook.addWorksheet('Attendance Log');
    attSheet.columns = [
      { header: 'Employee', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Login Time', key: 'loginTime', width: 22 },
      { header: 'Logout Time', key: 'logoutTime', width: 22 },
      { header: 'Hours Worked', key: 'hours', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
    ];
    attSheet.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));
    attSheet.getRow(1).height = 28;

    attendanceDetail.forEach((att) => {
      attSheet.addRow({
        name: att.userId?.fullName || '',
        email: att.userId?.email || '',
        loginTime: att.loginTime ? new Date(att.loginTime).toLocaleString('en-IN') : '',
        logoutTime: att.logoutTime ? new Date(att.logoutTime).toLocaleString('en-IN') : 'Active',
        hours: (att.totalHours || 0).toFixed(2),
        status: att.status,
      });
    });

    // ── Stream response ──────────────────────────────────────────────────────
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="employee-report-${dateStr}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};
