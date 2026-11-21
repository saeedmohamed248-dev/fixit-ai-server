export type Branch = { id?: number; name?: string; location?: string; stock?: number };

export type Product = {
  id: string;
  sku?: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  brand: string;
  category: string;
  condition: 'new' | 'used';
  price: number;
  oldPrice?: number;
  wholesalePrice?: number;
  stock: number;
  models?: string[];
  fits: string[];
  oem?: string;
  partNumbers?: string[];
  image?: string;
  images?: string[];
  warranty?: string;
  warrantyEn?: string;
  deliveryNote?: string;
  deliveryNoteEn?: string;
  sold?: number;
  ratingAvg?: number;
  ratingCount?: number;
  createdAt?: string;
  branches?: Branch[];
  originBranch?: string;
  originLocation?: string;
  _near?: boolean;
};

export type Settings = {
  storeName?: string;
  whatsapp?: string;
  phoneDisplay?: string;
  instapay?: string;
  wallet?: string;
  depositPct?: string | number;
  depositMin?: string | number;
  freeShippingOver?: string | number;
  freeShipOff?: boolean;
  freeShipOffUntil?: string;
  depositOff?: boolean;
  depositOffUntil?: string;
  heroProducts?: string[];
  topbarAr?: string;
  topbarEn?: string;
};

export type User = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  points?: number;
  credit?: number;
  account?: 'retail' | 'wholesale';
  company?: string;
  country?: string;
};

export type OrderItem = { id: string; name: string; qty: number; price?: number; partNumber?: string };

export type Order = {
  id?: string;
  number: string;
  createdAt: string;
  status: 'new' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  customer?: { name: string; phone: string; city?: string; address: string };
  payment: string;
  items: OrderItem[];
  subtotal?: number;
  discount?: number;
  total: number;
  deposit?: number;
  balanceDue?: number;
  pointsEarned?: number;
};

export type Review = {
  id: string;
  productId: string;
  rating: number;
  name: string;
  comment?: string;
  verified?: boolean;
  createdAt: string;
};

export type CartLine = { id: string; qty: number; partNumber?: string };
