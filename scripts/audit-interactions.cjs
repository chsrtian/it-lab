const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const original = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...rest) {
  if (request.startsWith('@/')) request = path.join(root, 'src', request.slice(2));
  return original.call(this, request, parent, ...rest);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = function(module, filename) {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText, filename);
};
const { getScenarios } = require('../src/content');
const { createRun, applyAction, executeSimulatedCommand, recordCommand, resolveStepCommand } = require('../src/engine');
const { resolveGuideInteraction, isStepComplete, validateGuidedWalkthrough } = require('../src/features/guide/logic');
const { componentActions } = require('../src/features/environments/interaction');
const rows = [], mismatches = [];
for (const scenario of getScenarios()) {
  let run = createRun(scenario, 'practice');
  const errors = validateGuidedWalkthrough(scenario);
  for (const step of scenario.guidedWalkthrough?.steps ?? []) {
    const contract = resolveGuideInteraction(step, scenario);
    const action = contract.action;
    const command = resolveStepCommand(step, scenario);
    const legacy = scenario.actions.find(a => a.component === step.target.componentId || a.inspectTarget === step.target.componentId || a.matchHints?.some(h => h.toLowerCase().includes(step.target.componentId.replace(/-/g, ' '))));
    if (action && legacy?.id !== action.id && (scenario.environment.kind === 'hardware-bench' || scenario.environment.deviceFamily)) mismatches.push({scenario:scenario.id,step:step.id,target:step.target.componentId,legacy:legacy?.id ?? null,intended:action.id});
    const bound = action && componentActions(scenario, run, contract.componentId).some(a => a.id === action.id);
    let before = run;
    if (command && contract.cue === 'TYPE') {
      const result = executeSimulatedCommand({scenario,world:run.world,shell:scenario.environment.shell},command.text);
      run = recordCommand(scenario, run, result.commandId, command.text, result.worldPatch);
    } else if (action) run = applyAction(scenario,run,action.id);
    const complete = isStepComplete(step,run);
    rows.push({ scenario:scenario.id, domain:scenario.category, stepId:step.id, authoredComponent:step.target.componentId, componentId:contract.componentId, targetId:contract.surfaceId, targetLabel:contract.label, cue:contract.cue, actionId:action?.id ?? null, actionResolves:!!action, commandId:step.commandId ?? null, commandText:command?.text ?? null, commandPurpose:command?.purpose ?? null, instruction:contract.instruction, purpose:step.why, completion:step.completeWhen ?? {actionId:step.actionId}, affordance:command?'terminal input':'lab object', guideOffPath:command?'terminal input':`context inspector / ${action?.label}`, componentInspectorBound:!!bound, twoD:scenario.environment.kind==='hardware-bench'||!!scenario.environment.deviceFamily?'physical object → context operation':null, threeD:scenario.environment.kind==='hardware-bench'||!!scenario.environment.deviceFamily?'physical object → context operation':null, completed:complete, errors:errors.filter(e=>e.includes(step.id)), stateChanged:JSON.stringify(before.world)!==JSON.stringify(run.world) });
  }
}
const report={scenarioCount:getScenarios().length,stepCount:rows.length,preRepairLegacyMismatchCount:58,legacyMismatchCount:mismatches.length,legacyMismatches:mismatches,failedRows:rows.filter(r=>!r.completed||r.errors.length),rows};
fs.writeFileSync(path.join(root,'reports/interaction-audit.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({scenarios:report.scenarioCount,steps:rows.length,mismatches:mismatches.length,failed:report.failedRows.map(r=>({scenario:r.scenario,step:r.stepId,errors:r.errors,completed:r.completed})),unbound:rows.filter(r=>r.twoD&&!r.componentInspectorBound).map(r=>({scenario:r.scenario,step:r.stepId,target:r.componentId,action:r.actionId}))},null,2));
if(report.failedRows.length) process.exitCode=1;
