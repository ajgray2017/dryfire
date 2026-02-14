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

    <div style="margin-top: 25px">
      <button @click="once" :disabled="running">Just Once</button>
    </div>

    <div>
      <img
        style="height: 90px; margin-top: 50px; margin-bottom: 10px"
        :src="Arrow"
        alt="Arrow"
      />
      <div style="text-align: start; justify-content: center; display: flex">
        <ul>
          <li>
            For 1 Normal IPSC Target Setup
            <ul>
              <li>
                Head box top third (Aim Small Miss Small dot in the center)
              </li>
              <li>Shapes on the middle third</li>
              <li>4x3 grid with letters and numbers on the lower third</li>
            </ul>
          </li>
          <li>Numbers: 1 -> 12</li>
          <li>Letters: A -> L</li>
          <li>Shapes: Square, Circle, Triangle</li>
          <li>Math answers are between 1 -> 12</li>
          <li>
            1R1: Picks between selected modes, or number R number. Also adds 4
            seconds to the timer for resetting the spare mag
          </li>
          <li>
            Tac Reload: Picks between selected modes, adds tac reload to the
            end. Also adds 2 seconds to the timer for the reload
          </li>
        </ul>
      </div>
      <img style="height: 450px" :src="Target" alt="Target" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from "vue";
import Target from "../assets/target.svg";
import Arrow from "../assets/arrow.svg";

type Mode =
  | "triple_tap"
  | "double_tap"
  | "letters"
  | "numbers"
  | "spicy (mozambique)"
  | "simple_math"
  | "complex_math"
  | "bill_drill"
  | "cadence"
  | "reload (1R1)"
  | "tac reload";
type Operator = "+" | "-" | "*" | "/";

const MIN_WAIT = 5;
const MAX_WAIT = 7;
// const RESET_TIME = 1.5;

// const MODECHANCE = 10;

const LETTERS: string[] = Array.from({ length: 12 }, (_, i) =>
  String.fromCharCode(97 + i),
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
  "bill_drill",
  "cadence",
  "reload (1R1)",
  "tac reload",
];

const running = ref<boolean>(false);
const timerId = ref<number | null>(null);
const lastSpoken = ref<string>("");
const enabledModes = ref<Mode[]>([
  "spicy (mozambique)",
  "bill_drill",
  "cadence",
  "double_tap",
]);
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
    if (running.value) {
      stop();
      start();
    }
  },
);

function once(): void {
  stop();

  running.value = true;
  loop(false);
}

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

function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    //@ts-ignore
    utterance.onend = resolve;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
    lastSpoken.value = text;
  });
}

async function loop(keepLooping = true): Promise<void> {
  if (!running.value) {
    return;
  }

  const choices = buildChoices();

  if (choices.length === 0) {
    stop();
    return;
  }

  const drill = choices[rand(0, choices.length - 1)];

  const selection = drill?.handler() ?? "a";

  await speak(selection);

  if (drill?.post) {
    await drill?.post();
  }

  if (keepLooping) {
    timerId.value = setTimeout(
      () => loop(),
      (() => {
        const [min, max] = waitRange.value;
        return rand(min * 1000, max * 1000);
      })(),
    );
  } else {
    stop();
  }
}

function mathOp(op: Operator): string {
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
    if (a + b <= 12 && a + b > 0) return `${a} plus ${b}`;
  }

  if (op === "-") {
    const a = rand(1, 12);
    const b = rand(0, a);
    if (a - b <= 12 && a - b > 0) return `${a} minus ${b}`;
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
      if (result > 0 && result <= 12) {
        return `${a} ${mathOp(op1)} ${b} ${mathOp(op2)} ${c}`;
      }
    } catch {
      continue;
    }
  }
}

function buildChoices(): {
  handler: () => string;
  post?: () => Promise<void> | void;
}[] {
  const choices: { handler: () => string; post?: () => void }[] = [];

  if (activeModes.value.has("spicy (mozambique)")) {
    choices.push({
      handler: () => {
        const shapes = ["Square", "Triangle", "Circle"] as const;
        return `Spicy ${shapes[rand(0, shapes.length - 1)]}`;
      },
    });
  }

  if (activeModes.value.has("simple_math")) {
    choices.push({ handler: () => generateSingleMath() });
  }

  if (activeModes.value.has("complex_math")) {
    choices.push({ handler: () => generateComboMath() });
  }

  if (activeModes.value.has("letters")) {
    choices.push({
      handler: () => {
        return LETTERS[rand(0, LETTERS.length - 1)] ?? "a";
      },
    });
  }

  if (activeModes.value.has("numbers")) {
    choices.push({
      handler: () => {
        return NUMBERS[rand(0, NUMBERS.length - 1)] ?? "1";
      },
    });
  }

  if (activeModes.value.has("triple_tap")) {
    const triple = [
      "Triple Square",
      "Triple Triangle",
      "Triple Circle",
      "Triple Head",
    ];

    choices.push({
      handler: () => {
        return triple[rand(0, triple.length - 1)] ?? "Triple Square";
      },
    });
  }

  if (activeModes.value.has("double_tap")) {
    const double = [
      "Double Square",
      "Double Triangle",
      "Double Circle",
      "Double Head",
    ];

    choices.push({
      handler: () => {
        return double[rand(0, double.length - 1)] ?? "Double Square";
      },
    });
  }

  if (activeModes.value.has("bill_drill")) {
    choices.push({
      handler: () => {
        return "bill drill";
      },
    });
  }

  if (activeModes.value.has("cadence")) {
    choices.push({
      handler: () => {
        const shapes = ["Square", "Triangle", "Circle"] as const;
        return `Cadence: ${shapes[rand(0, shapes.length - 1)]} ${shapes[rand(0, shapes.length - 1)]} ${shapes[rand(0, shapes.length - 1)]}`;
      },
      post: () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(true);
          }, 3000);
        }),
    });
  }

  if (activeModes.value.has("reload (1R1)")) {
    let selection1;
    let selection2;

    if (choices.length === 0) {
      selection1 = NUMBERS[rand(0, NUMBERS.length - 1)] ?? "1";
      selection2 = NUMBERS[rand(0, NUMBERS.length - 1)] ?? "1";
    } else {
      selection1 = choices[rand(0, choices.length - 1)]?.handler() ?? "a";
      selection2 = choices[rand(0, choices.length - 1)]?.handler() ?? "a";
    }

    choices.push({
      handler: () => {
        return `${selection1} reload ${selection2}`;
      },
      post: () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(true);
          }, 4000);
        }),
    });
  }

  if (activeModes.value.has("tac reload")) {
    let selection;

    selection = choices[rand(0, choices.length - 1)]?.handler();

    if (!selection || selection?.includes("reload")) {
      selection = NUMBERS[rand(0, NUMBERS.length - 1)] ?? "1";
    }

    choices.push({
      handler: () => {
        return `${selection} tac reload`;
      },
      post: () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(true);
          }, 2000);
        }),
    });
  }

  return choices;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
</script>

<style scoped></style>
