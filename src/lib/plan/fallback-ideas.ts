import type { EventType } from "./schema";
import type { Idea } from "./types";

/** Used when Gemini is not configured or does not answer in time. */
export const FALLBACK_IDEAS: Record<EventType, Idea[]> = {
  wedding: [
    {
      title: "Family recipe counter",
      description: "Ask each side for one family dish and serve it at a small labelled counter.",
      costHint: "low",
    },
    {
      title: "Guest photo wall",
      description: "Print a few old photos of the couple and let guests pin notes beside them.",
      costHint: "low",
    },
    {
      title: "Live flower bar",
      description: "A florist makes small posies guests can take home, doubling as favours.",
      costHint: "medium",
    },
  ],
  birthday: [
    {
      title: "Make-your-own station",
      description: "Cupcakes, pizzas or crowns; one table, a few toppings, and every guest leaves with something.",
      costHint: "low",
    },
    {
      title: "Memory jar",
      description: "Guests write a wish or memory on a slip; read a few aloud before the cake.",
      costHint: "low",
    },
    {
      title: "Themed treasure hunt",
      description: "Five clues hidden around the space, ending at the cake table.",
      costHint: "low",
    },
  ],
  community: [
    {
      title: "Skill-share corner",
      description: "Neighbours run 15-minute sessions: plant care, bike repair, a recipe.",
      costHint: "low",
    },
    {
      title: "Local stalls",
      description: "Give home bakers and small makers free stall space in return for a small donation.",
      costHint: "low",
    },
    {
      title: "Open mic hour",
      description: "Short sign-up slots for music, poetry or stories; keeps the crowd after food.",
      costHint: "medium",
    },
  ],
};
