<template>
  <div class="trainer">
    <h2>Reaction Time Drills</h2>

    <div class="controls">
      <label v-for="mode in ALL_MODES" :key="mode">
        <input type="checkbox" :value="mode" v-model="enabledModes" />
        {{ mode }}
      </label>
    </div>

    <div>
      <div>Time Between Calls</div>
      <div class="timing-inputs">
        <label>
          Min
          <input type="number" min="0" step="0.1" v-model.number="minWait" />
        </label>

        <label>
          Max
          <input type="number" min="0" step="0.1" v-model.number="maxWait" />
        </label>
      </div>
    </div>

    <div class="status">
      <p>
        <strong>Status:</strong>
        {{
          running
            ? "Running"
            : enabledModes.length === 0
            ? "Select A Mode"
            : "Stopped"
        }}
      </p>
      <p><strong>Last call:</strong> {{ lastSpoken }}</p>
    </div>

    <div class="buttons">
      <button @click="start" :disabled="running">Start</button>
      <button @click="stop" :disabled="!running">Stop</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from "vue";

type Mode =
  | "triple_tap"
  | "double_tap"
  | "letters"
  | "numbers"
  | "math"
  | "spicy (mozambique)"
  | "simple_math"
  | "complex_math";
type Operator = "+" | "-" | "*" | "/";

const MIN_WAIT = 2;
const MAX_WAIT = 5;
// const RESET_TIME = 1.5;

const MODECHANCE = 10;

const LETTERS: string[] = Array.from({ length: 12 }, (_, i) =>
  String.fromCharCode(97 + i)
);
const NUMBERS: string[] = Array.from({ length: 12 }, (_, i) => String(i + 1));

const ALL_MODES: Mode[] = [
  "letters",
  "numbers",
  "triple_tap",
  "double_tap",
  "simple_math",
  "complex_math",
  "spicy (mozambique)",
];

const running = ref<boolean>(false);
const timerId = ref<number | null>(null);
const lastSpoken = ref<string>("");
const enabledModes = ref<Mode[]>([]);
const minWait = ref(MIN_WAIT);
const maxWait = ref(MAX_WAIT);
// const postWait = ref<number>(RESET_TIME);

onUnmounted(() => {
  stop();
});

const activeModes = computed<Set<Mode>>(() => {
  return new Set(enabledModes.value);
});

const waitRange = computed<[number, number]>(() => {
  const min = Math.max(0, minWait.value);
  const max = Math.max(min, maxWait.value);
  return [min, max];
});

watch(
  () => [minWait.value, maxWait.value],
  () => {
    stop();
    start();
  }
);

function start(): void {
  if (running.value) {
    return;
  }
  running.value = true;
  loop();
}

function stop(): void {
  running.value = false;
  speechSynthesis.cancel();
  if (timerId.value !== null) {
    clearTimeout(timerId.value);
    timerId.value = null;
  }
}

function speak(text: string): void {
  const utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
  lastSpoken.value = text;
}

function loop(): void {
  if (!running.value) {
    return;
  }

  let selection: string;

  if (activeModes.value.has("math") && rand(1, MODECHANCE) === 1) {
    selection = generateMathPrompt();
  } else if (
    activeModes.value.has("spicy (mozambique)") &&
    rand(1, MODECHANCE) === 1
  ) {
    selection = generateSpicyPrompt();
  } else {
    const choices = buildChoices();

    if (choices.length === 0) {
      stop();
      return;
    }

    selection = choices[rand(0, choices.length - 1)] ?? "a";
  }

  speak(selection);

  timerId.value = window.setTimeout(
    () => {
      loop();
    },
    (() => {
      const [min, max] = waitRange.value;
      return rand(min * 1000, max * 1000);
    })()
  );
}

function speakOp(op: Operator): string {
  return {
    "+": "plus",
    "-": "minus",
    "*": "times",
    "/": "divided by",
  }[op];
}

function evalOp(x: number, op: Operator, y: number): number {
  if (op === "+") {
    return x + y;
  } else if (op === "-") {
    return x - y;
  } else if (op === "*") {
    return x * y;
  } else {
    if (y === 0 || x % y !== 0) {
      throw new Error("Invalid division");
    }
    return x / y;
  }
}

function generateSingleMath(): string {
  const ops: Operator[] = ["+", "-", "*", "/"];
  const op = ops[rand(0, ops.length - 1)];

  if (op === "+") {
    const a = rand(1, 11);
    const b = rand(1, 12 - a);
    return `${a} plus ${b}`;
  }

  if (op === "-") {
    const a = rand(1, 12);
    const b = rand(0, a);
    return `${a} minus ${b}`;
  }

  if (op === "*") {
    while (true) {
      const a = rand(1, 12);
      const b = rand(1, 12);
      if (a * b <= 12) return `${a} times ${b}`;
    }
  }

  // division
  const result = rand(1, 12);
  const b = rand(1, 12);
  return `${result * b} divided by ${b}`;
}

function generateComboMath(): string {
  const ops: Operator[] = ["+", "-", "*", "/"];

  while (true) {
    const op1 = ops[rand(0, ops.length - 1)];
    const op2 = ops[rand(0, ops.length - 1)];

    const a = rand(1, 12);
    const b = rand(1, 12);
    const c = rand(1, 12);

    if (!op1 || !op2) {
      continue;
    }

    let first: number;
    try {
      first = evalOp(a, op1, b);
    } catch {
      continue;
    }

    if (first < 0 || first > 12) continue;

    try {
      const result = evalOp(first, op2, c);
      if (result >= 0 && result <= 12) {
        return `${a} ${speakOp(op1)} ${b} ${speakOp(op2)} ${c}`;
      }
    } catch {
      continue;
    }
  }
}

function generateMathPrompt(): string {
  if (
    activeModes.value.has("simple_math") &&
    !activeModes.value.has("complex_math")
  ) {
    return generateSingleMath();
  } else if (
    activeModes.value.has("complex_math") &&
    !activeModes.value.has("simple_math")
  ) {
    return generateComboMath();
  }
  return Math.random() < 0.5 ? generateSingleMath() : generateComboMath();
}

function generateSpicyPrompt(): string {
  const shapes = ["Square", "Triangle", "Circle"] as const;
  return `Spicy ${shapes[rand(0, shapes.length - 1)]}`;
}

function buildChoices(): string[] {
  const choices: string[] = [];

  if (activeModes.value.has("letters")) {
    choices.push(...LETTERS);
  }

  if (activeModes.value.has("numbers")) {
    choices.push(...NUMBERS);
  }

  if (activeModes.value.has("triple_tap")) {
    choices.push(
      "Triple Square",
      "Triple Triangle",
      "Triple Circle",
      "Triple Head"
    );
  }

  if (activeModes.value.has("double_tap")) {
    choices.push(
      "Double Square",
      "Double Triangle",
      "Double Circle",
      "Double Head"
    );
  }

  return choices;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
</script>

<style scoped>
.trainer {
  margin: auto;
  font-family: system-ui, sans-serif;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.buttons button {
  margin-right: 8px;
}

.timing {
  margin: 16px 0;
  padding: 12px;
  border-radius: 12px;
  background: #f4f4f5;
}

.timing h3 {
  margin: 0 0 8px;
  font-size: 0.95rem;
  color: #333;
}

.timing-inputs {
  display: flex;
  gap: 12px;
}

.timing-inputs label {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  font-size: 0.8rem;
  color: #555;
}

.timing-inputs input {
  padding: 6px 8px;
  font-size: 0.9rem;
  border-radius: 8px;
  border: 1px solid #ccc;
  width: 80px;
}

button.error {
  background: #dc2626;
  color: white;
  cursor: not-allowed;
}

button.error:hover {
  background: #dc2626;
}

.error-text {
  margin-top: 8px;
  font-size: 0.8rem;
  color: #dc2626;
}
</style>
