import {
  accountIssues,
  auditSteps,
  auditSummary,
  demoUser,
  healthTrend,
  merchantAccount,
  notifications,
  priorityIssues,
  productDistribution,
  products,
} from '../mockData'

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

// Swap these functions for real fetch() calls when the Express endpoints exist.
// Components deliberately know nothing about where the data originates.
export const auditService = {
  async signInWithGoogle() {
    await wait(650)
    return { user: demoUser, account: merchantAccount }
  },

  async getDashboard() {
    await wait(180)
    return {
      user: demoUser,
      account: merchantAccount,
      summary: auditSummary,
      healthTrend,
      productDistribution,
      priorityIssues,
      accountIssues,
      products,
      notifications,
    }
  },

  async runAudit(onProgress) {
    for (let index = 0; index < auditSteps.length; index += 1) {
      onProgress?.({
        index,
        label: auditSteps[index],
        percent: Math.round(((index + 1) / auditSteps.length) * 100),
      })
      await wait(620)
    }
    return this.getDashboard()
  },

  async requestSpecialist(details) {
    await wait(700)
    return { success: true, reference: `REQ-${Date.now().toString().slice(-6)}`, details }
  },
}
