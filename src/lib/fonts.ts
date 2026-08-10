import { Caprasimo, Figtree } from "next/font/google";

// Caprasimo ships a single 400 weight; Figtree is variable.
export const caprasimo = Caprasimo({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  variable: "--font-caprasimo",
});

export const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  display: "swap",
  variable: "--font-figtree",
});
