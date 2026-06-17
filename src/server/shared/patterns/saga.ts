/**
 * Saga Pattern: Manages complex workflows with transactional integrity and rollback compensating operations
 */
export interface SagaStep<TContext> {
  name: string;
  forward(context: TContext): Promise<void>;
  compensate(context: TContext): Promise<void>;
}

export class TicketAutomationSaga<TContext> {
  private steps: SagaStep<TContext>[] = [];
  private executedSteps: SagaStep<TContext>[] = [];

  public addStep(step: SagaStep<TContext>): this {
    this.steps.push(step);
    return this;
  }

  public async execute(context: TContext): Promise<void> {
    console.log(`[Saga] Initiating new workflow orchestration...`);
    for (const step of this.steps) {
      try {
        console.log(`[Saga] Executing stage: ${step.name}`);
        await step.forward(context);
        this.executedSteps.push(step);
      } catch (err) {
        console.error(`[Saga] Stage "${step.name}" failed: ${(err as Error).message}. Firing compenstation plan...`);
        await this.rollback(context);
        throw err;
      }
    }
    console.log(`[Saga] All workflow orchestrations completed clean.`);
  }

  private async rollback(context: TContext): Promise<void> {
    // Reverse order of executed transactions
    for (let i = this.executedSteps.length - 1; i >= 0; i--) {
      const step = this.executedSteps[i];
      try {
        console.log(`[Saga Rollback] Compensating step: ${step.name}`);
        await step.compensate(context);
      } catch (compensateError) {
        console.error(`[Saga Critical Error] Compensation of stage "${step.name}" failed:`, compensateError);
      }
    }
  }
}
