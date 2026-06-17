import { AutomationRule, AutomationAction } from "../automations.service.ts";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  triggerType: "ticket_created" | "ticket_updated";
  conditions: AutomationRule[];
  actions: AutomationAction[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "escalate_unhappy_customers",
    name: "SLA Escalation: Negative Sentiment Finder",
    description: "Automatically sets ticket priority to high and tags it when negative sentiment is detected",
    triggerType: "ticket_created",
    conditions: [
      {
        field: "sentiment",
        operator: "eq",
        value: "negative",
      },
    ],
    actions: [
      {
        type: "set_priority",
        value: "high",
      },
      {
        type: "add_tag",
        value: "urgent-review",
      },
    ],
  },
  {
    id: "auto_tag_billing_issues",
    name: "Categorization: Auto-Tag Billing Requests",
    description: "Groups incoming tickets for billing departments by adding a critical financial tag",
    triggerType: "ticket_created",
    conditions: [
      {
        field: "category",
        operator: "eq",
        value: "billing",
      },
    ],
    actions: [
      {
        type: "add_tag",
        value: "billing-issue",
      },
    ],
  },
  {
    id: "critical_enterprise_status",
    name: "VIP Custom Handling: Critical Priority for VIPs",
    description: "Checks customer company name and assigns tickets to Tier 1 status instantly",
    triggerType: "ticket_created",
    conditions: [
      {
        field: "company",
        operator: "contains",
        value: "enterprise",
      },
    ],
    actions: [
      {
        type: "set_priority",
        value: "critical",
      },
    ],
  },
];
