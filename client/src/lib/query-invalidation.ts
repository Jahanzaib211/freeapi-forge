export const INVALIDATION_MAP: Record<string, string[][]> = {
  "aiLab.addProvider": [["aiLab.listProviders"], ["aiLab.getConnectedProviders"], ["aiLab.freeProviders"]],
  "aiLab.removeProvider": [["aiLab.listProviders"], ["aiLab.getConnectedProviders"]],
  "aiLab.testModel": [["aiLab.getBenchmarks"]],
  "aiLab.processQuestionnaire": [["aiLab.getOnboardingProfile"]],
  "aiLab.dismissSuggestion": [["aiLab.getSuggestions"]],
  "agents.create": [["agents.list"], ["agents.getPendingApprovals"]],
  "agents.update": [["agents.list"]],
  "agents.delete": [["agents.list"]],
  "agents.trigger": [["agents.getRuns"]],
  "mcp.installMcp": [["mcp.list"], ["mcp.getInstalled"]],
  "mcp.uninstallMcp": [["mcp.list"], ["mcp.getInstalled"]],
  "githubActions.syncRuns": [["githubActions.listRuns"], ["githubActions.getAlerts"], ["githubActions.getDeploymentHealth"], ["githubActions.getRunTimeline"]],
  "githubActions.markAlertRead": [["githubActions.getAlerts"]],
  "githubActions.markAllAlertsRead": [["githubActions.getAlerts"]],
  "githubActions.dismissAlert": [["githubActions.getAlerts"]],
  "task.create": [["task.listTasks"], ["task.getActiveTasks"]],
  "task.start": [["task.listTasks"], ["task.getActiveTasks"]],
  "task.complete": [["task.listTasks"], ["task.getActiveTasks"]],
  "task.fail": [["task.listTasks"], ["task.getActiveTasks"]],
  "task.cancel": [["task.listTasks"], ["task.getActiveTasks"]],
  "forgeBrain.createNode": [["forgeBrain.listNodes"], ["forgeBrain.getVaultStats"], ["forgeBrain.getGraphData"]],
  "forgeBrain.updateNode": [["forgeBrain.listNodes"], ["forgeBrain.getNode"], ["forgeBrain.getGraphData"]],
  "forgeBrain.archiveNode": [["forgeBrain.listNodes"], ["forgeBrain.getVaultStats"]],
  "forgeBrain.linkNodes": [["forgeBrain.getGraphData"], ["forgeBrain.getNode"], ["forgeBrain.getBacklinks"]],
  "githubExplorer.trackRepo": [["githubExplorer.trackedRepos"]],
  "githubExplorer.untrackRepo": [["githubExplorer.trackedRepos"]],
};

export function getInvalidationKeys(path: string): string[][] {
  return INVALIDATION_MAP[path] || [];
}
