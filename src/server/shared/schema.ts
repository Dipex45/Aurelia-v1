import { pgTable, text, timestamp, boolean, integer, primaryKey, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  status: text('status').$type<'active' | 'suspended' | 'deactivated'>().default('active'),
  avatar_url: text('avatar_url'),
  email_verified: boolean('email_verified').default(false).notNull(),
  email_verification_token: text('email_verification_token'),
  email_verification_expires: timestamp('email_verification_expires'),
  password_reset_token: text('password_reset_token'),
  password_reset_expires: timestamp('password_reset_expires'),
  mfa_enabled: boolean('mfa_enabled').default(false).notNull(),
  mfa_secret: text('mfa_secret'),
  mfa_backup_codes: text('mfa_backup_codes'), // secure comma-separated backup/recovery keys
  workspace_id: uuid('workspace_id').references(() => workspaces.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  owner_id: uuid('owner_id').notNull().references(() => users.id),
  status: text('status').default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const workspaceMembers = pgTable('workspace_members', {
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  user_id: uuid('user_id').notNull().references(() => users.id),
  role: text('role').$type<'owner' | 'admin' | 'agent' | 'viewer' | 'member'>().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.workspace_id, table.user_id] }),
}));

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  full_name: text('full_name').notNull(),
  customer_company: text('customer_company'),
  customer_source: text('customer_source').default('manual').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const customerEmails = pgTable('customer_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  customer_id: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  is_primary: boolean('is_primary').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const customerPhones = pgTable('customer_phones', {
  id: uuid('id').primaryKey().defaultRandom(),
  customer_id: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  phone: text('phone').notNull(),
  type: text('type').$type<'mobile' | 'work' | 'home' | 'other'>().default('mobile').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const customerTags = pgTable('customer_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  customer_id: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  tag: text('tag').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const customerNotes = pgTable('customer_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  customer_id: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  author_id: uuid('author_id').notNull().references(() => users.id),
  note: text('note').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const customerHistory = pgTable('customer_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  customer_id: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  metadata: text('metadata'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  customer_id: uuid('customer_id').references(() => customers.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').$type<'open' | 'in_progress' | 'resolved' | 'on_hold' | 'closed'>().default('open'),
  priority: text('priority').$type<'low' | 'medium' | 'high' | 'critical'>().default('low'),
  creator_id: uuid('creator_id').notNull().references(() => users.id),
  assignee_id: uuid('assignee_id').references(() => users.id),
  ai_category: text('ai_category'),
  ai_sentiment: text('ai_sentiment'),
  ai_tags: text('ai_tags'),
  ai_routing_rule: text('ai_routing_rule'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticket_id: uuid('ticket_id').notNull().references(() => tickets.id),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  author_id: uuid('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  is_internal: boolean('is_internal').default(false).notNull(),
  email_message_id: text('email_message_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const attachments = pgTable('attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  ticket_id: uuid('ticket_id').notNull().references(() => tickets.id),
  message_id: uuid('message_id').references(() => messages.id),
  user_id: uuid('user_id').notNull().references(() => users.id),
  filename: text('filename').notNull(),
  original_name: text('original_name').notNull(),
  mimetype: text('mimetype').notNull(),
  size: integer('size'),
  storage_key: text('storage_key').notNull(),
  is_internal: boolean('is_internal').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  actor_id: uuid('actor_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  metadata: text('metadata'),
  request_id: text('request_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id),
  workspace_id: uuid('workspace_id').references(() => workspaces.id),
  token_jti: text('token_jti').unique().notNull(),
  refresh_token: text('refresh_token').unique(),
  user_agent: text('user_agent'),
  ip_address: text('ip_address'),
  is_revoked: boolean('is_revoked').default(false).notNull(),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  plan: text('plan').$type<'free' | 'growth' | 'enterprise'>().default('free').notNull(),
  stripe_customer_id: text('stripe_customer_id'),
  stripe_subscription_id: text('stripe_subscription_id'),
  status: text('status').$type<'active' | 'trialing' | 'canceled' | 'past_due' | 'unpaid'>().default('active').notNull(),
  seats: integer('seats').default(1).notNull(),
  expires_at: timestamp('expires_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const aiUsage = pgTable('ai_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  model: text('model').notNull(),
  prompt_tokens: integer('prompt_tokens').default(0).notNull(),
  completion_tokens: integer('completion_tokens').default(0).notNull(),
  estimated_cost_usd: text('estimated_cost_usd').default('0.0').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// SLA Policies
export const slaPolicies = pgTable('sla_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  name: text('name').notNull(),
  description: text('description'),
  priority_low_response_mins: integer('priority_low_response_mins').default(1440).notNull(), // 24 hours
  priority_low_resolve_mins: integer('priority_low_resolve_mins').default(2880).notNull(), // 48 hours
  priority_medium_response_mins: integer('priority_medium_response_mins').default(480).notNull(), // 8 hours
  priority_medium_resolve_mins: integer('priority_medium_resolve_mins').default(1440).notNull(), // 24 hours
  priority_high_response_mins: integer('priority_high_response_mins').default(120).notNull(), // 2 hours
  priority_high_resolve_mins: integer('priority_high_resolve_mins').default(480).notNull(), // 8 hours
  priority_critical_response_mins: integer('priority_critical_response_mins').default(30).notNull(), // 30 mins
  priority_critical_resolve_mins: integer('priority_critical_resolve_mins').default(120).notNull(), // 2 hours
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// SLA Tracker Events
export const slaEvents = pgTable('sla_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  ticket_id: uuid('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  policy_id: uuid('policy_id').references(() => slaPolicies.id, { onDelete: 'set null' }),
  event_type: text('event_type').$type<'first_response' | 'resolution'>().notNull(),
  deadline_at: timestamp('deadline_at').notNull(),
  completed_at: timestamp('completed_at'),
  status: text('status').$type<'pending' | 'met' | 'breached'>().default('pending').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// SLA Breaches Historical Log
export const slaBreaches = pgTable('sla_breaches', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  ticket_id: uuid('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  sla_event_id: uuid('sla_event_id').notNull().references(() => slaEvents.id, { onDelete: 'cascade' }),
  breach_type: text('breach_type').$type<'first_response_breach' | 'resolution_breach'>().notNull(),
  assigned_to_id: uuid('assigned_to_id').references(() => users.id, { onDelete: 'set null' }),
  breached_at: timestamp('breached_at').defaultNow().notNull(),
  resolved_at: timestamp('resolved_at'),
});

// Knowledge Base Categories
export const kbCategories = pgTable('kb_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Knowledge Base Articles
export const kbArticles = pgTable('kb_articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  category_id: uuid('category_id').references(() => kbCategories.id, { onDelete: 'set null' }),
  author_id: uuid('author_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  content: text('content').notNull(),
  status: text('status').$type<'draft' | 'published' | 'archived'>().default('draft').notNull(),
  views: integer('views').default(0).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Workflow Automation Rules (IF-THEN engine)
export const automations = pgTable('automations', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  name: text('name').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  trigger_type: text('trigger_type').$type<'ticket_created' | 'ticket_updated'>().notNull(),
  conditions: text('conditions').notNull(), // JSON array of rules: [{"field": "priority" | "title" | "description", "operator": "eq" | "contains", "value": "critical" | "refund"}]
  actions: text('actions').notNull(), // JSON array of actions: [{"type": "set_priority" | "set_status" | "assign_user" | "add_tag", "value": "string"}]
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
