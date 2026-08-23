import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected to MongoDB Atlas\n');

const Store = mongoose.models.Store || mongoose.model('Store', new mongoose.Schema({ name: { type: String, required: true, unique: true }, code: { type: String, required: true, unique: true, uppercase: true }, location: { type: String, required: true }, phone: String, email: String, manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, isActive: { type: Boolean, default: true } }, { timestamps: true }));
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ fullName: { type: String, required: true }, email: { type: String, required: true, unique: true, lowercase: true }, phone: String, username: { type: String, required: true, unique: true, lowercase: true }, password: { type: String, required: true, select: false }, role: { type: String, enum: ['admin', 'manager', 'staff'], default: 'staff' }, storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null }, branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null }, isActive: { type: Boolean, default: true }, isVerified: { type: Boolean, default: true }, lastLogin: { type: Date, default: null }, lastActive: { type: Date, default: Date.now }, profileImage: { type: String, default: null }, isSuperAdmin: { type: Boolean, default: false }, permissions: [String] }, { timestamps: true, discriminatorKey: 'role' }));
const Branch = mongoose.models.Branch || mongoose.model('Branch', new mongoose.Schema({ name: { type: String, required: true }, code: { type: String, required: true, uppercase: true }, location: { type: String, required: true }, phone: String, email: String, manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true }, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, isActive: { type: Boolean, default: true } }, { timestamps: true }));
const Category = mongoose.models.Category || mongoose.model('Category', new mongoose.Schema({ name: { type: String, required: true }, slug: { type: String, lowercase: true }, description: { type: String, default: '' }, color: { type: String, default: '#6366f1' }, isActive: { type: Boolean, default: true }, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true } }, { timestamps: true }));
const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({ name: { type: String, required: true }, brand: { type: String, default: '' }, sku: { type: String, unique: true, uppercase: true }, category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null }, description: { type: String, default: '' }, price: { type: Number, required: true }, costPrice: { type: Number, default: 0 }, quantity: { type: Number, required: true, default: 0 }, minStockLevel: { type: Number, default: 5 }, unit: { type: String, default: 'box' }, supplier: { type: String, default: '' }, isActive: { type: Boolean, default: true }, image: { type: String, default: '' }, color: { type: String, default: '#3b82f6' }, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true }, branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null }, damagedStock: { type: Number, default: 0 }, sampleStock: { type: Number, default: 0 }, exchangedStock: { type: Number, default: 0 }, wrongProductStock: { type: Number, default: 0 }, pieces_per_box: { type: Number, default: 1 }, ava_pieces: { type: Number, default: 0 }, weight_of_unit: { type: Number, default: 0 }, measurements: { type: String, default: '' } }, { timestamps: true }));
const Setting = mongoose.models.Setting || mongoose.model('Setting', new mongoose.Schema({ storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, unique: true }, business: { name: String, address: String, phone: String, email: String, logo: String, taxId: String, currency: { type: String, default: 'INR' }, timezone: { type: String, default: 'Asia/Kolkata' } }, sales: { defaultTax: { type: Number, default: 0 }, invoicePrefix: { type: String, default: 'INV-' }, terms: { type: String, default: 'Thank you!' }, defaultPaymentMethod: { type: String, default: 'cash' } }, inventory: { lowStockThreshold: { type: Number, default: 10 }, skuPattern: { type: String, default: 'TILE-{RAND4}' }, defaultUnit: { type: String, default: 'box' } }, notifications: { lowStockEmail: { type: Boolean, default: true }, dailyReportEmail: { type: Boolean, default: false }, inAppInventoryAlerts: { type: Boolean, default: true }, inAppSaleAlerts: { type: Boolean, default: true }, inAppStaffAlerts: { type: Boolean, default: true } }, privacy: { hideStaffPriceDetails: { type: Boolean, default: true }, hideStaffTaxDetails: { type: Boolean, default: true }, hideStaffPaymentMethod: { type: Boolean, default: true }, hideAllFinancialDetails: { type: Boolean, default: false } } }, { timestamps: true }));
const saleItemSchema = new mongoose.Schema({ product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, name: String, brand: String, quantity: { type: Number, required: true }, price: { type: Number, required: true }, subtotal: { type: Number, required: true }, pieces: { type: Number, default: 0 }, pricePerPiece: { type: Number, default: 0 }, weight: { type: Number, default: 0 }, isDamaged: { type: Boolean, default: false }, isExchange: { type: Boolean, default: false }, isSample: { type: Boolean, default: false }, isWrongProduct: { type: Boolean, default: false } });
const Sale = mongoose.models.Sale || mongoose.model('Sale', new mongoose.Schema({ invoiceNumber: { type: String, unique: true, required: true }, items: [saleItemSchema], totalAmount: { type: Number, required: true }, tax: { type: Number, default: 0 }, discount: { type: Number, default: 0 }, paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'credit'], default: 'cash' }, customer: { name: String, phone: String, companyName: String, addressLine: String }, storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true }, branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null }, soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, transporter: { name: { type: String, default: '' }, mobile: { type: String, default: '' }, vehicleType: { type: String, default: '' }, vehicleNumber: { type: String, default: '' } }, totalWeight: { type: Number, default: 0 } }, { timestamps: true }));

const toSlug = (str) => str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

console.log('Clearing old data...');
await Sale.deleteMany({});
await Product.deleteMany({});
await Category.deleteMany({});
await Branch.deleteMany({});
await Setting.deleteMany({});
await User.deleteMany({});
await Store.deleteMany({});
console.log('Old data cleared\n');

try {
  // STORE
  console.log('Creating Store...');
  const store = await Store.create({ name: 'Tile World', code: 'TILEWORLD', location: 'Hyderabad, Telangana, India', phone: '+91-9000000001', email: 'info@tileworld.com', isActive: true });
  console.log('Store created: ' + store.name + '\n');

  // USERS
  console.log('Creating Users...');
  const hashPw = async (pw) => { const s = await bcrypt.genSalt(12); return bcrypt.hash(pw, s); };
  const admin = await User.create({ fullName: 'Super Admin', email: 'admin@tileworld.com', phone: '+91-9000000000', username: 'admin', password: await hashPw('Admin@1234'), role: 'admin', storeId: store._id, isActive: true, isVerified: true, isSuperAdmin: true, permissions: ['manage_users','view_reports','manage_inventory','manage_sales','manage_settings'] });
  console.log('Admin -> admin / Admin@1234');
  const manager = await User.create({ fullName: 'Ravi Kumar', email: 'manager@tileworld.com', phone: '+91-9000000002', username: 'manager1', password: await hashPw('Manager@1234'), role: 'manager', storeId: store._id, isActive: true, isVerified: true });
  console.log('Manager -> manager1 / Manager@1234');
  const staff = await User.create({ fullName: 'Priya Singh', email: 'staff@tileworld.com', phone: '+91-9000000003', username: 'staff1', password: await hashPw('Staff@1234'), role: 'staff', storeId: store._id, isActive: true, isVerified: true });
  console.log('Staff -> staff1 / Staff@1234\n');

  // BRANCH
  console.log('Creating Branch...');
  const branch = await Branch.create({ name: 'Hyderabad Main Branch', code: 'HYD-01', location: 'Begumpet, Hyderabad', phone: '+91-9000000010', email: 'hyd@tileworld.com', manager: manager._id, storeId: store._id, createdBy: admin._id, isActive: true });
  console.log('Branch: ' + branch.name + '\n');

  // CATEGORIES
  console.log('Creating Categories...');
  const catDefs = [
    { name: 'Floor Tiles',               color: '#b45309', description: 'Tiles designed for flooring, high durability and anti-skid' },
    { name: 'Wall Tiles',                color: '#0ea5e9', description: 'Lightweight decorative tiles for walls and bathrooms' },
    { name: 'Vitrified Tiles',           color: '#6366f1', description: 'High-gloss vitrified tiles for modern interiors' },
    { name: 'Ceramic Tiles',             color: '#f59e0b', description: 'Classic ceramic tiles for kitchens and bathrooms' },
    { name: 'Parking Tiles',             color: '#64748b', description: 'Heavy-duty anti-skid tiles for parking and outdoor areas' },
    { name: 'Designer Tiles',            color: '#ec4899', description: 'Premium pattern and designer tiles for luxury interiors' },
    { name: 'Outdoor Elevation Tiles',   color: '#22c55e', description: 'Weather-resistant tiles for exteriors and elevation cladding' },
  ];
  const cats = {};
  for (const c of catDefs) {
    const cat = await Category.create({ ...c, slug: toSlug(c.name), storeId: store._id, createdBy: admin._id, isActive: true });
    cats[c.name] = cat;
    console.log('Category: ' + cat.name);
  }
  console.log();

  // PRODUCTS
  console.log('Creating Products...');
  const prodDefs = [
    { sku: 'KAJ-0001', brand: 'Kajaria',       name: 'Kajaria Eternity White Vitrified Tile',         category: 'Vitrified Tiles',         price: 1200, costPrice: 900,  quantity: 180, minStockLevel: 20, pieces_per_box: 4,  weight_of_unit: 22, measurements: '600x600 mm', description: 'Full-body polished vitrified tile, high gloss 9mm thick',          supplier: 'Kajaria Ceramics Ltd' },
    { sku: 'KAJ-0002', brand: 'Kajaria',       name: 'Kajaria Granito Matt Floor Tile',               category: 'Floor Tiles',             price: 950,  costPrice: 700,  quantity: 250, minStockLevel: 30, pieces_per_box: 6,  weight_of_unit: 20, measurements: '600x600 mm', description: 'Matt finish double-charged vitrified floor tile',                   supplier: 'Kajaria Ceramics Ltd' },
    { sku: 'KAJ-0003', brand: 'Kajaria',       name: 'Kajaria Designer Mosaic Wall Tile',             category: 'Designer Tiles',          price: 1450, costPrice: 1050, quantity: 90,  minStockLevel: 10, pieces_per_box: 8,  weight_of_unit: 16, measurements: '300x450 mm', description: 'Hand-crafted mosaic pattern wall tile',                            supplier: 'Kajaria Ceramics Ltd' },
    { sku: 'JOH-0001', brand: 'Johnson Tiles', name: 'Johnson Arctic White Ceramic Wall Tile',        category: 'Wall Tiles',              price: 620,  costPrice: 450,  quantity: 320, minStockLevel: 40, pieces_per_box: 10, weight_of_unit: 18, measurements: '300x450 mm', description: 'Glossy white ceramic wall tile for bathrooms and kitchens',        supplier: 'H&R Johnson India' },
    { sku: 'JOH-0002', brand: 'Johnson Tiles', name: 'Johnson Endura Heavy-Duty Floor Tile',          category: 'Floor Tiles',             price: 780,  costPrice: 580,  quantity: 200, minStockLevel: 25, pieces_per_box: 6,  weight_of_unit: 21, measurements: '600x600 mm', description: 'Slip-resistant heavy-duty floor tile 10mm thick',                  supplier: 'H&R Johnson India' },
    { sku: 'JOH-0003', brand: 'Johnson Tiles', name: 'Johnson Parking Granite Look Tile',             category: 'Parking Tiles',           price: 550,  costPrice: 400,  quantity: 150, minStockLevel: 20, pieces_per_box: 4,  weight_of_unit: 24, measurements: '400x400 mm', description: 'Anti-skid granite-finish parking tile for driveways',             supplier: 'H&R Johnson India' },
    { sku: 'SOM-0001', brand: 'Somany',        name: 'Somany Duragress Vitrified Floor Tile',         category: 'Vitrified Tiles',         price: 1100, costPrice: 820,  quantity: 210, minStockLevel: 25, pieces_per_box: 4,  weight_of_unit: 22, measurements: '600x600 mm', description: 'Anti-bacterial double-charged vitrified tile',                    supplier: 'Somany Ceramics Ltd' },
    { sku: 'SOM-0002', brand: 'Somany',        name: 'Somany Cera-Gres Wall Tile Beige',              category: 'Wall Tiles',              price: 580,  costPrice: 420,  quantity: 4,   minStockLevel: 30, pieces_per_box: 12, weight_of_unit: 17, measurements: '300x600 mm', description: 'Earthy beige ceramic wall tile semi-gloss',                       supplier: 'Somany Ceramics Ltd' },
    { sku: 'SOM-0003', brand: 'Somany',        name: 'Somany Elevation Cladding Tile',                category: 'Outdoor Elevation Tiles', price: 890,  costPrice: 660,  quantity: 120, minStockLevel: 15, pieces_per_box: 6,  weight_of_unit: 19, measurements: '200x600 mm', description: 'Weather-proof elevation cladding tile for facades',                supplier: 'Somany Ceramics Ltd' },
    { sku: 'NIT-0001', brand: 'Nitco',         name: 'Nitco Travertino Marble Look Floor Tile',       category: 'Floor Tiles',             price: 1350, costPrice: 1000, quantity: 160, minStockLevel: 20, pieces_per_box: 4,  weight_of_unit: 23, measurements: '600x600 mm', description: 'Marble-finish vitrified tile with natural texture',                supplier: 'Nitco Ltd' },
    { sku: 'NIT-0002', brand: 'Nitco',         name: 'Nitco Venezia Designer Wall Tile',              category: 'Designer Tiles',          price: 1600, costPrice: 1200, quantity: 70,  minStockLevel: 10, pieces_per_box: 6,  weight_of_unit: 15, measurements: '300x600 mm', description: 'Italian-inspired Venezia pattern wall tile',                      supplier: 'Nitco Ltd' },
    { sku: 'NIT-0003', brand: 'Nitco',         name: 'Nitco Outdoor Stone Finish Tile',               category: 'Outdoor Elevation Tiles', price: 720,  costPrice: 530,  quantity: 140, minStockLevel: 15, pieces_per_box: 5,  weight_of_unit: 20, measurements: '400x400 mm', description: 'Rough stone-finish tile for garden and outdoor use',              supplier: 'Nitco Ltd' },
    { sku: 'ASG-0001', brand: 'Asian Granito', name: 'Asian Granito Glossy Vitrified Tile 800x800',   category: 'Vitrified Tiles',         price: 1800, costPrice: 1350, quantity: 100, minStockLevel: 15, pieces_per_box: 2,  weight_of_unit: 28, measurements: '800x800 mm', description: 'Large-format super-glossy GVT tile for premium flooring',          supplier: 'Asian Granito India Ltd' },
    { sku: 'ASG-0002', brand: 'Asian Granito', name: 'Asian Granito Ceramic Kitchen Tile',            category: 'Ceramic Tiles',           price: 640,  costPrice: 470,  quantity: 280, minStockLevel: 35, pieces_per_box: 10, weight_of_unit: 18, measurements: '300x300 mm', description: 'Easy-clean ceramic tile for kitchen floors',                      supplier: 'Asian Granito India Ltd' },
    { sku: 'ASG-0003', brand: 'Asian Granito', name: 'Asian Granito Rustic Matt Floor Tile',          category: 'Floor Tiles',             price: 870,  costPrice: 640,  quantity: 190, minStockLevel: 20, pieces_per_box: 6,  weight_of_unit: 21, measurements: '600x600 mm', description: 'Rustic matt surface anti-skid floor tile',                       supplier: 'Asian Granito India Ltd' },
    { sku: 'SIM-0001', brand: 'Simpolo',       name: 'Simpolo Polished Vitrified Tile White',         category: 'Vitrified Tiles',         price: 980,  costPrice: 730,  quantity: 220, minStockLevel: 25, pieces_per_box: 4,  weight_of_unit: 22, measurements: '600x600 mm', description: 'Mirror-polished vitrified tile for living rooms',                  supplier: 'Simpolo Ceramics Pvt Ltd' },
    { sku: 'SIM-0002', brand: 'Simpolo',       name: 'Simpolo Parking Heavy Duty Tile',               category: 'Parking Tiles',           price: 600,  costPrice: 440,  quantity: 170, minStockLevel: 20, pieces_per_box: 5,  weight_of_unit: 26, measurements: '400x400 mm', description: 'Durable anti-skid tile for parking and industrial floors',         supplier: 'Simpolo Ceramics Pvt Ltd' },
    { sku: 'SIM-0003', brand: 'Simpolo',       name: 'Simpolo 3D Digital Wall Tile',                  category: 'Designer Tiles',          price: 1250, costPrice: 940,  quantity: 60,  minStockLevel: 8,  pieces_per_box: 8,  weight_of_unit: 14, measurements: '300x450 mm', description: '3D digital print designer wall tile for feature walls',           supplier: 'Simpolo Ceramics Pvt Ltd' },
    { sku: 'VAR-0001', brand: 'Varmora',       name: 'Varmora Ceramic Floor Tile Sand',               category: 'Ceramic Tiles',           price: 560,  costPrice: 400,  quantity: 300, minStockLevel: 40, pieces_per_box: 8,  weight_of_unit: 20, measurements: '400x400 mm', description: 'Sand-coloured ceramic floor tile non-slip surface',               supplier: 'Varmora Granito Pvt Ltd' },
    { sku: 'VAR-0002', brand: 'Varmora',       name: 'Varmora Glossy Bathroom Wall Tile',             category: 'Wall Tiles',              price: 510,  costPrice: 370,  quantity: 0,   minStockLevel: 30, pieces_per_box: 12, weight_of_unit: 16, measurements: '250x375 mm', description: 'Glossy white bathroom wall tile easy to clean',                   supplier: 'Varmora Granito Pvt Ltd' },
    { sku: 'VAR-0003', brand: 'Varmora',       name: 'Varmora Elevation Strip Tile',                  category: 'Outdoor Elevation Tiles', price: 780,  costPrice: 580,  quantity: 130, minStockLevel: 15, pieces_per_box: 6,  weight_of_unit: 18, measurements: '100x600 mm', description: 'Slim strip tile for elevation and exterior cladding',             supplier: 'Varmora Granito Pvt Ltd' },
    { sku: 'RAK-0001', brand: 'RAK Ceramics',  name: 'RAK Ceramics Nano Polished Vitrified Tile',     category: 'Vitrified Tiles',         price: 1550, costPrice: 1150, quantity: 130, minStockLevel: 15, pieces_per_box: 4,  weight_of_unit: 24, measurements: '600x600 mm', description: 'Nano-polished surface premium vitrified tile',                    supplier: 'RAK Ceramics India' },
    { sku: 'RAK-0002', brand: 'RAK Ceramics',  name: 'RAK Ceramics Concept Wood Look Tile',           category: 'Floor Tiles',             price: 1400, costPrice: 1040, quantity: 110, minStockLevel: 15, pieces_per_box: 4,  weight_of_unit: 20, measurements: '200x1200 mm',description: 'Wood-plank look vitrified tile for modern living spaces',          supplier: 'RAK Ceramics India' },
    { sku: 'RAK-0003', brand: 'RAK Ceramics',  name: 'RAK Ceramics Metropolis Wall Tile',             category: 'Wall Tiles',              price: 920,  costPrice: 680,  quantity: 2,   minStockLevel: 20, pieces_per_box: 8,  weight_of_unit: 15, measurements: '300x600 mm', description: 'Contemporary urban-design glazed wall tile',                      supplier: 'RAK Ceramics India' },
    { sku: 'RAK-0004', brand: 'RAK Ceramics',  name: 'RAK Ceramics Outdoor Porcelain Tile',           category: 'Outdoor Elevation Tiles', price: 1100, costPrice: 820,  quantity: 90,  minStockLevel: 10, pieces_per_box: 4,  weight_of_unit: 25, measurements: '600x600 mm', description: 'Frost-proof outdoor porcelain tile for patios and paths',         supplier: 'RAK Ceramics India' },
  ];

  const products = [];
  for (const pd of prodDefs) {
    const prod = await Product.create({ ...pd, category: cats[pd.category]._id, storeId: store._id, branchId: branch._id, createdBy: admin._id, isActive: true, unit: 'box', color: '#3b82f6' });
    console.log('[' + prod.sku + '] ' + prod.brand + ' - ' + prod.name + ' | Qty: ' + prod.quantity + ' boxes');
    products.push(prod);
  }
  console.log();

  // SETTINGS
  console.log('Creating Settings...');
  await Setting.create({ storeId: store._id, business: { name: 'Tile World', address: 'Begumpet, Hyderabad, Telangana - 500016', phone: '+91-9000000001', email: 'info@tileworld.com', currency: 'INR', timezone: 'Asia/Kolkata', taxId: 'GSTIN36XXXXX' }, sales: { defaultTax: 18, invoicePrefix: 'TW-', terms: 'Goods once sold will not be returned. Breakage is customer responsibility.', defaultPaymentMethod: 'cash' }, inventory: { lowStockThreshold: 10, skuPattern: 'TILE-{RAND4}', defaultUnit: 'box' }, notifications: { lowStockEmail: true, dailyReportEmail: false, inAppInventoryAlerts: true, inAppSaleAlerts: true, inAppStaffAlerts: true }, privacy: { hideStaffPriceDetails: true, hideStaffTaxDetails: true, hideStaffPaymentMethod: true, hideAllFinancialDetails: false } });
  console.log('Settings created\n');

  // SAMPLE SALE
  console.log('Creating Sample Sale...');
  const p1 = products[0];
  const p2 = products[6];
  const saleTotal = (p1.price * 5) + (p2.price * 3);
  const sale = await Sale.create({ invoiceNumber: 'TW-demo-0001', items: [ { product: p1._id, name: p1.name, brand: p1.brand, quantity: 5, price: p1.price, subtotal: p1.price * 5, weight: p1.weight_of_unit * 5 }, { product: p2._id, name: p2.name, brand: p2.brand, quantity: 3, price: p2.price, subtotal: p2.price * 3, weight: p2.weight_of_unit * 3 } ], totalAmount: saleTotal, tax: Math.round(saleTotal * 0.18), discount: 0, paymentMethod: 'cash', customer: { name: 'Suresh Babu', phone: '+91-9876543210', companyName: 'Sri Ram Constructions', addressLine: 'Banjara Hills, Hyderabad' }, storeId: store._id, branchId: branch._id, soldBy: staff._id, totalWeight: (p1.weight_of_unit * 5) + (p2.weight_of_unit * 3) });
  console.log('Sale: ' + sale.invoiceNumber + ' | Total: Rs.' + sale.totalAmount + '\n');

  console.log('================================================');
  console.log('  TILE WORLD DATABASE SEEDED SUCCESSFULLY');
  console.log('================================================');
  console.log('  Store    : ' + store.name);
  console.log('  Admin    : admin / Admin@1234');
  console.log('  Manager  : manager1 / Manager@1234');
  console.log('  Staff    : staff1 / Staff@1234');
  console.log('  Categories: 7 tile types');
  console.log('  Products : ' + prodDefs.length + ' tile products | 8 brands');
  console.log('  Brands   : Kajaria, Johnson, Somany, Nitco,');
  console.log('             Asian Granito, Simpolo, Varmora, RAK Ceramics');
  console.log('  Low Stock: Somany Wall Beige, RAK Metropolis');
  console.log('  OutOfStock: Varmora Glossy Bathroom Wall Tile');
  console.log('================================================\n');

} catch(err) {
  console.error('Seed error: ' + err.message);
  console.error(err.stack);
} finally {
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB Atlas');
}
