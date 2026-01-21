import { createRouter, createWebHistory } from "vue-router";

//@ts-ignore
export enum Routes {
  HOME = "/",
  ZEROING = "/zeroing",
}

const routes = [
  {
    path: Routes.HOME,
    name: "Home",
    component: async () => import("../pages/Home.vue"),
  },
  {
    path: Routes.ZEROING,
    name: "Zeroing",
    component: async () => import("../pages/Zeroing.vue"),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
