// كوبون السلة — بيتنقل من السلة لصفحة الدفع جوه نفس الجلسة
export type AppliedCoupon = { code: string; discount: number } | null;
let current: AppliedCoupon = null;
export const getCoupon = () => current;
export const setCoupon = (c: AppliedCoupon) => { current = c; };
