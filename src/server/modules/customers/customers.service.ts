import { orm } from "../../shared/db.ts";
import { 
  customers, 
  customerEmails, 
  customerPhones, 
  customerTags, 
  customerNotes, 
  customerHistory,
  users 
} from "../../shared/schema.ts";
import { eq, and, sql, ilike } from "drizzle-orm";
import { ApiError } from "../../shared/middleware/errorHandler.ts";
import { v4 as uuidv4 } from "uuid";

export interface CreateCustomerPayload {
  workspaceId: string;
  fullName: string;
  customerCompany?: string | null;
  customerSource?: string;
  emails?: Array<{ email: string; isPrimary?: boolean }>;
  phones?: Array<{ phone: string; type?: "mobile" | "work" | "home" | "other" }>;
  tags?: string[];
  notes?: string[];
  userId: string; // The agent/admin executing this action
}

export async function createCustomer(payload: CreateCustomerPayload) {
  const customerId = uuidv4();
  const now = new Date();

  // 1. Insert Base Customer
  await orm.insert(customers).values({
    id: customerId,
    workspace_id: payload.workspaceId,
    full_name: payload.fullName,
    customer_company: payload.customerCompany || null,
    customer_source: payload.customerSource || "manual",
    created_at: now,
    updated_at: now,
  });

  // 2. Insert Associated Emails
  if (payload.emails && payload.emails.length > 0) {
    for (const emailObj of payload.emails) {
      await orm.insert(customerEmails).values({
        id: uuidv4(),
        customer_id: customerId,
        email: emailObj.email.toLowerCase(),
        is_primary: emailObj.isPrimary ?? false,
      });
    }
  }

  // 3. Insert Associated Phones
  if (payload.phones && payload.phones.length > 0) {
    for (const phoneObj of payload.phones) {
      await orm.insert(customerPhones).values({
        id: uuidv4(),
        customer_id: customerId,
        phone: phoneObj.phone,
        type: phoneObj.type ?? "mobile",
      });
    }
  }

  // 4. Insert Associated Tags
  if (payload.tags && payload.tags.length > 0) {
    for (const tag of payload.tags) {
      await orm.insert(customerTags).values({
        id: uuidv4(),
        customer_id: customerId,
        tag: tag.trim(),
      });
    }
  }

  // 5. Insert Associated Notes
  if (payload.notes && payload.notes.length > 0) {
    for (const noteText of payload.notes) {
      await orm.insert(customerNotes).values({
        id: uuidv4(),
        customer_id: customerId,
        author_id: payload.userId,
        note: noteText,
      });
    }
  }

  // 6. Write to Customer History
  await orm.insert(customerHistory).values({
    id: uuidv4(),
    customer_id: customerId,
    action: "customer_created",
    metadata: JSON.stringify({
      by_user_id: payload.userId,
      full_name: payload.fullName,
      source: payload.customerSource || "manual",
    }),
  });

  return getCustomer(payload.workspaceId, customerId);
}

export async function listCustomers(workspaceId: string, filters: {
  search?: string;
  tag?: string;
  source?: string;
  company?: string;
}) {
  // Query core customers in the given workspace
  let query = orm.select().from(customers).where(eq(customers.workspace_id, workspaceId));

  if (filters.source) {
    query = orm.select().from(customers).where(
      and(
        eq(customers.workspace_id, workspaceId),
        eq(customers.customer_source, filters.source)
      )
    ) as any;
  }

  const allCustomers = await orm.query.customers.findMany({
    where: (customers, { eq, and, or, ilike }) => {
      const conditions = [eq(customers.workspace_id, workspaceId)];
      if (filters.search) {
        conditions.push(ilike(customers.full_name, `%${filters.search}%`));
      }
      if (filters.source) {
        conditions.push(eq(customers.customer_source, filters.source));
      }
      if (filters.company) {
        conditions.push(ilike(customers.customer_company, `%${filters.company}%`));
      }
      return and(...conditions);
    },
    with: {
      // If relations are set up via drizzle. For safety, we can query relations individually or together.
    } as any
  });

  // Let's rich-hydrate with relationship emails and phones
  const hydrated = [];
  for (const cust of allCustomers) {
    const emails = await orm.select().from(customerEmails).where(eq(customerEmails.customer_id, cust.id));
    const phones = await orm.select().from(customerPhones).where(eq(customerPhones.customer_id, cust.id));
    const tags = await orm.select().from(customerTags).where(eq(customerTags.customer_id, cust.id));
    
    // Support filtering by tag at JS level for safety
    if (filters.tag && !tags.some(t => t.tag.toLowerCase() === filters.tag?.toLowerCase())) {
      continue;
    }

    hydrated.push({
      ...cust,
      emails,
      phones,
      tags: tags.map(t => t.tag),
    });
  }

  return hydrated;
}

export async function getCustomer(workspaceId: string, customerId: string) {
  const cust = await orm.query.customers.findFirst({
    where: and(eq(customers.id, customerId), eq(customers.workspace_id, workspaceId)),
  });

  if (!cust) {
    throw new ApiError(404, "Customer not found");
  }

  const emails = await orm.select().from(customerEmails).where(eq(customerEmails.customer_id, cust.id));
  const phones = await orm.select().from(customerPhones).where(eq(customerPhones.customer_id, cust.id));
  const tags = await orm.select().from(customerTags).where(eq(customerTags.customer_id, cust.id));
  const notes = await orm.select().from(customerNotes).where(eq(customerNotes.customer_id, cust.id));
  const history = await orm.select().from(customerHistory).where(eq(customerHistory.customer_id, cust.id));

  // Hydrate notes with authors if possible
  const richNotes = [];
  for (const n of notes) {
    const author = await orm.query.users.findFirst({
      where: eq(users.id, n.author_id),
      columns: { full_name: true, avatar_url: true }
    });
    richNotes.push({
      ...n,
      author_name: author?.full_name || "Unknown Agent",
      author_avatar: author?.avatar_url,
    });
  }

  return {
    ...cust,
    emails,
    phones,
    tags: tags.map(t => t.tag),
    notes: richNotes,
    history
  };
}

export interface UpdateCustomerPayload {
  fullName?: string;
  customerCompany?: string | null;
  customerSource?: string;
  emails?: Array<{ email: string; isPrimary?: boolean }>;
  phones?: Array<{ phone: string; type?: "mobile" | "work" | "home" | "other" }>;
  tags?: string[];
  userId: string;
}

export async function updateCustomer(workspaceId: string, customerId: string, payload: UpdateCustomerPayload) {
  const cust = await getCustomer(workspaceId, customerId);

  const updates: any = {};
  if (payload.fullName !== undefined) updates.full_name = payload.fullName;
  if (payload.customerCompany !== undefined) updates.customer_company = payload.customerCompany;
  if (payload.customerSource !== undefined) updates.customer_source = payload.customerSource;

  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date();
    await orm.update(customers).set(updates).where(eq(customers.id, customerId));
  }

  // Update emails if provided
  if (payload.emails !== undefined) {
    await orm.delete(customerEmails).where(eq(customerEmails.customer_id, customerId));
    for (const emailObj of payload.emails) {
      await orm.insert(customerEmails).values({
        id: uuidv4(),
        customer_id: customerId,
        email: emailObj.email.toLowerCase(),
        is_primary: emailObj.isPrimary ?? false,
      });
    }
  }

  // Update phones if provided
  if (payload.phones !== undefined) {
    await orm.delete(customerPhones).where(eq(customerPhones.customer_id, customerId));
    for (const phoneObj of payload.phones) {
      await orm.insert(customerPhones).values({
        id: uuidv4(),
        customer_id: customerId,
        phone: phoneObj.phone,
        type: phoneObj.type ?? "mobile",
      });
    }
  }

  // Update tags if provided
  if (payload.tags !== undefined) {
    await orm.delete(customerTags).where(eq(customerTags.customer_id, customerId));
    for (const tag of payload.tags) {
      await orm.insert(customerTags).values({
        id: uuidv4(),
        customer_id: customerId,
        tag: tag.trim(),
      });
    }
  }

  // Write history
  await orm.insert(customerHistory).values({
    id: uuidv4(),
    customer_id: customerId,
    action: "customer_updated",
    metadata: JSON.stringify({
      by_user_id: payload.userId,
      updates: Object.keys(updates).concat(
        payload.emails ? ["emails"] : [],
        payload.phones ? ["phones"] : [],
        payload.tags ? ["tags"] : []
      )
    }),
  });

  return getCustomer(workspaceId, customerId);
}

export async function addCustomerNote(workspaceId: string, customerId: string, noteText: string, userId: string) {
  const cust = await getCustomer(workspaceId, customerId);

  const noteId = uuidv4();
  await orm.insert(customerNotes).values({
    id: noteId,
    customer_id: customerId,
    author_id: userId,
    note: noteText,
  });

  await orm.insert(customerHistory).values({
    id: uuidv4(),
    customer_id: customerId,
    action: "note_added",
    metadata: JSON.stringify({
      by_user_id: userId,
      note_id: noteId,
    }),
  });

  return getCustomer(workspaceId, customerId);
}

export async function deleteCustomer(workspaceId: string, customerId: string, userId: string) {
  // Confirm customer existence
  await getCustomer(workspaceId, customerId);

  // Perform safe deletes (cascading helps, but explicit deletes enforce transactional cleanup)
  await orm.delete(customerHistory).where(eq(customerHistory.customer_id, customerId));
  await orm.delete(customerNotes).where(eq(customerNotes.customer_id, customerId));
  await orm.delete(customerTags).where(eq(customerTags.customer_id, customerId));
  await orm.delete(customerPhones).where(eq(customerPhones.customer_id, customerId));
  await orm.delete(customerEmails).where(eq(customerEmails.customer_id, customerId));
  await orm.delete(customers).where(eq(customers.id, customerId));

  return { success: true };
}

export * from "./segments/index.ts";

