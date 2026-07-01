export interface ExtractedEntity {
  type: "Order ID" | "Invoice ID" | "Tracking Number" | "Email" | "Phone Number" | "Currency" | "Date" | "Urgency Word" | "Account ID";
  value: string;
}

export function extractEntities(text: string): ExtractedEntity[] {
  if (!text) return [];

  const entities: ExtractedEntity[] = [];

  // 1. Email Extraction
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailRegex);
  if (emails) {
    emails.forEach((email) => {
      entities.push({ type: "Email", value: email });
    });
  }

  // 2. Phone Number Extraction
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = text.match(phoneRegex);
  if (phones) {
    phones.forEach((phone) => {
      // Filter out pure numbers that could be IDs
      if (phone.replace(/[-.\s()]/g, "").length >= 7) {
        entities.push({ type: "Phone Number", value: phone.trim() });
      }
    });
  }

  // 3. Invoice ID Extraction
  const invoiceRegex = /INV-\d{4,8}/gi;
  const invoices = text.match(invoiceRegex);
  if (invoices) {
    invoices.forEach((inv) => {
      entities.push({ type: "Invoice ID", value: inv.toUpperCase() });
    });
  }

  // 4. Order ID Extraction
  const orderRegex = /(?:order|ord)[#\s-]*\d{4,8}/gi;
  const orders = text.match(orderRegex);
  if (orders) {
    orders.forEach((ord) => {
      entities.push({ type: "Order ID", value: ord.toUpperCase().trim() });
    });
  } else {
    // Check for standard #59392 hash pattern
    const hashNumRegex = /#\d{4,7}/g;
    const hashes = text.match(hashNumRegex);
    if (hashes) {
      hashes.forEach((hash) => {
        entities.push({ type: "Order ID", value: hash });
      });
    }
  }

  // 5. Account ID Extraction
  const accountRegex = /ACC-[A-Z0-9]{4,8}|user\s*id\s*[A-Z0-9]{4,8}/gi;
  const accounts = text.match(accountRegex);
  if (accounts) {
    accounts.forEach((acc) => {
      entities.push({ type: "Account ID", value: acc });
    });
  }

  // 6. Tracking Number Extraction
  const trackingRegex = /1Z[A-Z0-9]{16}|TRK-\d{5,10}/gi;
  const trackings = text.match(trackingRegex);
  if (trackings) {
    trackings.forEach((trk) => {
      entities.push({ type: "Tracking Number", value: trk.toUpperCase() });
    });
  } else {
    // Look for "tracking number is XXX"
    const matchTrack = text.match(/tracking\s*(?:number|id)?\s*(?:is|:)\s*([a-zA-Z0-9]{8,18})/i);
    if (matchTrack && matchTrack[1]) {
      entities.push({ type: "Tracking Number", value: matchTrack[1] });
    }
  }

  // 7. Currency / Amounts Extraction
  const currencyRegex = /(?:\$|€|£|¥)\s*\d+(?:\.\d{2})?/g;
  const currencies = text.match(currencyRegex);
  if (currencies) {
    currencies.forEach((cur) => {
      entities.push({ type: "Currency", value: cur });
    });
  }

  // 8. Dates Extraction
  const dateKeywords = ["yesterday", "tomorrow", "today", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "last week", "next week", "24 hours", "48 hours"];
  dateKeywords.forEach((kw) => {
    const rx = new RegExp(`\\b${kw}\\b`, "gi");
    if (rx.test(text)) {
      const match = text.match(rx);
      if (match) {
        entities.push({ type: "Date", value: match[0] });
      }
    }
  });

  // 9. Urgency Words Extraction
  const urgencyKeywords = ["urgent", "urgently", "immediately", "asap", "emergency", "freeze", "block", "security breach", "lawyer", "attorney general", "death threat"];
  urgencyKeywords.forEach((kw) => {
    const rx = new RegExp(`\\b${kw}\\b`, "gi");
    if (rx.test(text)) {
      entities.push({ type: "Urgency Word", value: kw.toUpperCase() });
    }
  });

  // Deduplicate entities by both type and value
  const seen = new Set<string>();
  return entities.filter((ent) => {
    const key = `${ent.type}:${ent.value.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
