import { orm } from "../db.ts";
import { tickets, customers, kbArticles } from "../schema.ts";
import { eq, and } from "drizzle-orm";

/**
 * Repository Pattern: Strictly encapsulates data access logic away from services/domain layers
 */
export interface IRepository<T, IDID> {
  findOne(id: IDID): Promise<T | null>;
  findAll(workspaceId: string): Promise<T[]>;
  create(entity: Partial<T>): Promise<T>;
  update(id: IDID, entity: Partial<T>): Promise<T>;
  delete(id: IDID): Promise<void>;
}

export class TicketRepository implements IRepository<any, string> {
  private db: typeof orm;

  constructor(db: typeof orm = orm) {
    this.db = db;
  }

  async findOne(id: string): Promise<any | null> {
    const res = await this.db.select().from(tickets).where(eq(tickets.id, id));
    return res[0] || null;
  }

  async findAll(workspaceId: string): Promise<any[]> {
    return this.db.select().from(tickets).where(eq(tickets.workspace_id, workspaceId));
  }

  async create(entity: any): Promise<any> {
    const res = await this.db.insert(tickets).values(entity).returning();
    return res[0];
  }

  async update(id: string, entity: any): Promise<any> {
    const res = await this.db.update(tickets).set(entity).where(eq(tickets.id, id)).returning();
    return res[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(tickets).where(eq(tickets.id, id));
  }
}

export class CustomerRepository implements IRepository<any, string> {
  private db: typeof orm;

  constructor(db: typeof orm = orm) {
    this.db = db;
  }

  async findOne(id: string): Promise<any | null> {
    const res = await this.db.select().from(customers).where(eq(customers.id, id));
    return res[0] || null;
  }

  async findAll(workspaceId: string): Promise<any[]> {
    return this.db.select().from(customers).where(eq(customers.workspace_id, workspaceId));
  }

  async create(entity: any): Promise<any> {
    const res = await this.db.insert(customers).values(entity).returning();
    return res[0];
  }

  async update(id: string, entity: any): Promise<any> {
    const res = await this.db.update(customers).set(entity).where(eq(customers.id, id)).returning();
    return res[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(customers).where(eq(customers.id, id));
  }
}
