/**
 * A tiny, dependency-free finite state machine helper.
 *
 * A machine state is a plain, serialisable object whose `value` field names
 * the current state; every other field is context. Transitions are declared
 * per state and are introspectable, so diagrams and docs can be generated
 * from the definition (see `toMermaid` and `docs/state-machines.md`).
 *
 * Transition forms, inside `states[name].on[EVENT]`:
 *   'target'                                   – just change `value`
 *   { target, guard?, update?, description? }  – `target` may be an array
 *                                                when `update` picks one
 *
 * `transition(state, event)` returns the *same* object when the event is not
 * accepted (unknown in this state, guard fails, or `update` returns null).
 * Callers can rely on reference equality to detect "ignored" events, which
 * makes double clicks and stale network events harmless.
 */
export function createMachine(definition) {
  const { id, initial, states } = definition;

  if (!states[initial]) {
    throw new Error(`[${id}] initial state "${initial}" is not defined`);
  }

  const normalized = Object.fromEntries(
    Object.entries(states).map(([name, node]) => [
      name,
      Object.fromEntries(
        Object.entries(node.on ?? {}).map(([type, spec]) => {
          const config = typeof spec === 'string' ? { target: spec } : spec;
          const targets = [config.target].flat();
          for (const target of targets) {
            if (!states[target]) {
              throw new Error(`[${id}] ${name} --${type}--> unknown state "${target}"`);
            }
          }
          return [type, { ...config, targets }];
        }),
      ),
    ]),
  );

  function transition(state, event) {
    const config = normalized[state.value]?.[event.type];
    if (!config) return state;
    if (config.guard && !config.guard(state, event)) return state;

    const updated = config.update ? config.update(state, event) : state;
    if (updated == null) return state;

    // With several possible targets, `update` decides by setting `value`.
    const value = config.targets.length === 1 ? config.targets[0] : updated.value;
    if (!config.targets.includes(value)) {
      throw new Error(`[${id}] ${state.value} --${event.type}--> "${value}" is not a declared target`);
    }
    return { ...updated, value };
  }

  return {
    id,
    initial,
    definition,
    transition,
    /** Event types accepted in `stateValue` (ignoring guards). */
    events: (stateValue) => Object.keys(normalized[stateValue] ?? {}),
    /** Whether `event` would change `state`. */
    can: (state, event) => transition(state, typeof event === 'string' ? { type: event } : event) !== state,
    /** Flat list of edges, for docs and exhaustive tests. */
    edges: () =>
      Object.entries(normalized).flatMap(([from, events]) =>
        Object.entries(events).flatMap(([type, config]) =>
          config.targets.map((to) => ({ from, to, type, description: config.description })),
        ),
      ),
  };
}

/** Renders a machine as a Mermaid `stateDiagram-v2`. */
export function toMermaid(machine) {
  const lines = ['stateDiagram-v2', `  [*] --> ${machine.initial}`];
  for (const { from, to, type } of machine.edges()) {
    lines.push(`  ${from} --> ${to}: ${type}`);
  }
  for (const [name, node] of Object.entries(machine.definition.states)) {
    if (node.final) lines.push(`  ${name} --> [*]`);
  }
  return lines.join('\n');
}
