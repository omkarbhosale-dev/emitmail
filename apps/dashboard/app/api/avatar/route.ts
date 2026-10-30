import { toFacehashHandler } from "facehash/next";

export const { GET } = toFacehashHandler({
  colors: ["#F38020", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B"],
  variant: "gradient",
  showInitial: true,
  size: 128,
});

