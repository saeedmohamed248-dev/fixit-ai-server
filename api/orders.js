// POST /api/orders → إنشاء طلب جديد (من صفحة السلة)
// GET  /api/orders → قائمة الطلبات (إدارة)
// PUT  /api/orders → تغيير حالة طلب (إدارة)
import { getProducts, saveProducts, getOrders, saveOrders } from './_lib/db.js';
import { cors, requireAdmin } from './_lib/util.js';

const STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    if (req.method === 'POST') {
      const body = req.body || {};
      const { customer, items } = body;

      if (!customer?.name || !customer?.phone || !customer?.address) {
        return res.status(400).json({ error: 'الاسم ورقم الموبايل والعنوان مطلوبين' });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'السلة فارغة' });
      }

      const products = await getProducts();
      const orderItems = [];

      // السعر يُحسب من قاعدة البيانات وليس من المتصفح
      for (const item of items) {
        const product = products.find((p) => p.id === item.id);
        if (!product) return res.status(400).json({ error: 'منتج غير موجود في الطلب' });
        const qty = Math.max(1, Number(item.qty) || 1);
        if (product.stock < qty) {
          return res.status(400).json({ error: `الكمية المتاحة من "${product.name}" هي ${product.stock} فقط` });
        }
        orderItems.push({
          id: product.id, sku: product.sku, name: product.name,
          condition: product.condition, price: product.price, qty,
        });
      }

      // خصم المخزون
      for (const item of orderItems) {
        const product = products.find((p) => p.id === item.id);
        product.stock -= item.qty;
      }
      await saveProducts(products);

      const total = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);
      const order = {
        id: 'o' + Date.now(),
        number: 'ORD-' + String(Date.now()).slice(-6),
        createdAt: new Date().toISOString(),
        status: 'new',
        customer: {
          name: customer.name,
          phone: customer.phone,
          city: customer.city || '',
          address: customer.address,
        },
        notes: body.notes || '',
        items: orderItems,
        total,
        source: 'website',
      };

      const orders = await getOrders();
      orders.unshift(order);
      await saveOrders(orders);

      return res.status(201).json(order);
    }

    if (req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      const orders = await getOrders();
      return res.status(200).json(orders);
    }

    if (req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const { id, status } = req.body || {};
      if (!STATUSES.includes(status)) {
        return res.status(400).json({ error: 'حالة غير صحيحة' });
      }
      const orders = await getOrders();
      const order = orders.find((o) => o.id === id);
      if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
      order.status = status;
      await saveOrders(orders);
      return res.status(200).json(order);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
