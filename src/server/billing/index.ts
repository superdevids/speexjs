export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  interval: 'month' | 'year'
}

export class Cashier {
  private plans: SubscriptionPlan[] = []

  addPlan(plan: SubscriptionPlan): void {
    this.plans.push(plan)
  }

  getPlans(): SubscriptionPlan[] {
    return this.plans
  }

  calculateTax(amount: number, rate = 0.11): number {
    return Math.round(amount * rate)
  }

  formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`
  }
}
