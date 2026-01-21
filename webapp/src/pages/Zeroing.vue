<template>
  <div>
    <div>
      <div>Time Between Calls</div>
      <div class="zeroing-inputs" style="white-space: nowrap">
        <label>
          <div>Target Distance (Yards)</div>
          <input
            type="number"
            min="0"
            step="0.1"
            v-model.number="targetDistanceYards"
          />
        </label>

        <label>
          <div>Impact From Target (Inches)</div>
          <input
            type="number"
            min="0"
            step="0.1"
            v-model.number="impactDistanceInches"
          />
        </label>

        <div>
          <label class="toggle" v-if="axis === 'elevation'">
            <div>Impact Direction</div>
            <input
              type="checkbox"
              v-model="offsetDirection"
              true-value="DOWN"
              false-value="UP"
            />
            <span class="track">
              <span class="label left"> Above </span>
              <span class="label right"> Below </span>
              <span class="thumb" />
            </span>
          </label>

          <label class="toggle" v-else>
            <div>Impact Direction</div>
            <input
              type="checkbox"
              v-model="offsetDirection"
              true-value="RIGHT"
              false-value="LEFT"
            />
            <span class="track">
              <span class="label left"> Left </span>
              <span class="label right"> Right </span>
              <span class="thumb" />
            </span>
          </label>
        </div>

        <label>
          <div>MOA Per Click</div>
          <input
            type="number"
            min="0"
            step="0.1"
            v-model.number="moaPerClick"
          />
        </label>

        <div>
          <label class="toggle">
            <div>Axis</div>
            <input
              type="checkbox"
              v-model="axis"
              true-value="windage"
              false-value="elevation"
            />
            <span class="track">
              <span class="label left">Elevation</span>
              <span class="label right">Windage</span>
              <span class="thumb" />
            </span>
          </label>
        </div>
      </div>
    </div>
    <div style="justify-content: space-around">
      <div style="display: flex">
        <div style="padding-top: 20px">MOA:</div>
        <div style="padding: 20px">{{ output.moa }}</div>
      </div>
      <div style="display: flex">
        <div style="padding-top: 20px">Clicks:</div>
        <div style="padding: 20px">{{ output.clicks }}</div>
      </div>
      <div style="display: flex">
        <div style="padding-top: 20px">Direction:</div>
        <div style="padding: 20px">{{ output.direction }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

type OffsetDirection = "UP" | "DOWN" | "LEFT" | "RIGHT";

const targetDistanceYards = ref(100);
const impactDistanceInches = ref(1);
const moaPerClick = ref(1 / 4);
const axis = ref<"elevation" | "windage">("elevation");
const offsetDirection = ref<OffsetDirection>("UP");

watch(
  () => axis.value,
  () => {
    if (axis.value === "elevation") {
      offsetDirection.value = "UP";
    } else {
      offsetDirection.value = "LEFT";
    }
  },
);

const output = computed(() => {
  const inchesPerMOA = (1.047 * targetDistanceYards.value) / 100;
  const moa = impactDistanceInches.value / inchesPerMOA;

  let turretDirection: OffsetDirection;

  if (axis.value === "elevation") {
    turretDirection = offsetDirection.value === "UP" ? "DOWN" : "UP";
  } else {
    turretDirection = offsetDirection.value === "RIGHT" ? "LEFT" : "RIGHT";
  }

  return {
    moa: Number(moa.toFixed(2)),
    clicks: Math.round(moa / moaPerClick.value),
    direction: turretDirection,
  };
});
</script>

<style lang="css" scoped>
.radio-selector {
  flex-direction: column;
}

.radio-track {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  height: 25px;
  padding: 2px;
}

.radio-track input {
  display: none;
}

.radio-option {
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  user-select: none;
}

.radio-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: calc(25% - 2px);
  height: calc(100% - 4px);
  background: white;
  border-radius: 999px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease;
}
</style>
