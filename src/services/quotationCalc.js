// Pure quotation maths. No DB calls — feed it raw item lines + freight,
// get back enriched line items plus totals.
//
// Per line:
//   lineSubTotal = (quantity * rate) - discount
//   gstAmount    = lineSubTotal * (gstPercentage / 100)
//   total        = lineSubTotal + gstAmount
//
// Per quotation:
//   subTotal   = Σ lineSubTotal
//   gstTotal   = Σ gstAmount
//   grandTotal = subTotal + gstTotal + freightCharges
//
// Negatives are clamped at 0 (a discount can't exceed the line value).
// All returned numbers are rounded to 2 decimals to avoid float drift.

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function calcItem(rawItem) {
  const quantity = Number(rawItem.quantity || 0);
  const rate = Number(rawItem.rate || 0);
  const discount = Math.max(0, Number(rawItem.discount || 0));
  const gstPercentage = Math.max(0, Math.min(100, Number(rawItem.gstPercentage || 0)));

  const lineSubTotalRaw = quantity * rate - discount;
  const lineSubTotal = round2(Math.max(0, lineSubTotalRaw));
  const gstAmount = round2(lineSubTotal * (gstPercentage / 100));
  const total = round2(lineSubTotal + gstAmount);

  return {
    ...rawItem,
    quantity,
    rate,
    discount,
    gstPercentage,
    gstAmount,
    total,
    // expose subtotal too — handy for the UI and PDF
    lineSubTotal,
  };
}

function calcQuotation({ items = [], freightCharges = 0 } = {}) {
  const enrichedItems = items.map(calcItem);

  const subTotal = round2(
    enrichedItems.reduce((acc, i) => acc + i.lineSubTotal, 0)
  );
  const gstTotal = round2(
    enrichedItems.reduce((acc, i) => acc + i.gstAmount, 0)
  );
  const freight = round2(Math.max(0, Number(freightCharges || 0)));
  const grandTotal = round2(subTotal + gstTotal + freight);

  return {
    items: enrichedItems.map((i) => {
      // Don't persist the helper `lineSubTotal` field on the stored doc — caller may drop it.
      const { lineSubTotal, ...rest } = i;
      void lineSubTotal;
      return rest;
    }),
    subTotal,
    gstTotal,
    freightCharges: freight,
    grandTotal,
  };
}

module.exports = { calcQuotation, calcItem, round2 };
