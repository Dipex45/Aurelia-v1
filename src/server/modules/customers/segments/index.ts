import { orm } from "../../../shared/db.ts";
import { customers, customerEmails, customerPhones, customerTags } from "../../../shared/schema.ts";
import { eq, and } from "drizzle-orm";

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  matchFn: (customer: any) => boolean;
}

export const CUSTOMER_SEGMENTS: CustomerSegment[] = [
  {
    id: "vip",
    name: "VIP / Enterprise Accounts",
    description: "Customers belonging to large enterprise accounts or explicitly tagged VIP",
    matchFn: (cust: any) => {
      const isVipCompany = cust.customer_company?.toLowerCase().includes("enterprise") || 
                           cust.customer_company?.toLowerCase().includes("inc") ||
                           cust.customer_company?.toLowerCase().includes("corp");
      const isVipTag = cust.tags?.some((t: string) => t.toLowerCase() === "vip" || t.toLowerCase() === "premium");
      return !!(isVipCompany || isVipTag);
    },
  },
  {
    id: "new_leads",
    name: "New Leads",
    description: "Freshly introduced client contacts via marketing or landing campaigns",
    matchFn: (cust: any) => {
      return cust.customer_source === "lead" || cust.customer_source === "campaign";
    },
  },
  {
    id: "active_conversations",
    name: "Attention Required",
    description: "Contacts with tags signifying active work or pending support tickets",
    matchFn: (cust: any) => {
      return cust.tags?.some((t: string) => t.toLowerCase() === "support" || t.toLowerCase() === "follow-up");
    },
  },
];

export async function filterCustomerBySegment(workspaceId: string, segmentId: string) {
  const segment = CUSTOMER_SEGMENTS.find(s => s.id === segmentId);
  if (!segment) {
    throw new Error(`Customer Segment '${segmentId}' not found.`);
  }

  // Load all workspace customers
  const allCustomers = await orm.query.customers.findMany({
    where: eq(customers.workspace_id, workspaceId),
  });

  const hydrated = [];
  for (const cust of allCustomers) {
    const emails = await orm.select().from(customerEmails).where(eq(customerEmails.customer_id, cust.id));
    const phones = await orm.select().from(customerPhones).where(eq(customerPhones.customer_id, cust.id));
    const tags = await orm.select().from(customerTags).where(eq(customerTags.customer_id, cust.id));

    const fullCust = {
      ...cust,
      emails,
      phones,
      tags: tags.map(t => t.tag),
    };

    if (segment.matchFn(fullCust)) {
      hydrated.push(fullCust);
    }
  }

  return hydrated;
}
