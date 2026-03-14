import { describe, it, expect } from "vitest";
import RANKS from "./ranks";

describe("RANKS progression", () => {
  it("has 7 ranks: F, E, D, C, B, A, S", () => {
    expect(RANKS.map((r) => r.id)).toEqual(["F", "E", "D", "C", "B", "A", "S"]);
  });

  it("every rank has required fields", () => {
    for (const rank of RANKS) {
      expect(rank).toHaveProperty("id");
      expect(rank).toHaveProperty("name");
      expect(rank).toHaveProperty("subtitle");
      expect(rank).toHaveProperty("weeks");
      expect(rank).toHaveProperty("color");
      expect(rank).toHaveProperty("glow");
      expect(rank).toHaveProperty("exercises");
      expect(rank.exercises.length).toBeGreaterThan(0);
    }
  });

  it("every exercise has required fields", () => {
    for (const rank of RANKS) {
      for (const ex of rank.exercises) {
        expect(ex).toHaveProperty("id");
        expect(ex).toHaveProperty("name");
        expect(ex).toHaveProperty("target");
        expect(ex).toHaveProperty("icon");
        expect(ex.target).toBeGreaterThan(0);
      }
    }
  });

  it("exercises never disappear from rank to rank", () => {
    let previousIds = new Set();
    for (const rank of RANKS) {
      const currentIds = new Set(rank.exercises.map((e) => e.id));
      for (const id of previousIds) {
        expect(currentIds.has(id)).toBe(true);
      }
      previousIds = currentIds;
    }
  });

  it("exercise count only grows or stays the same", () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].exercises.length).toBeGreaterThanOrEqual(
        RANKS[i - 1].exercises.length
      );
    }
  });

  it("targets never decrease for the same exercise", () => {
    for (let i = 1; i < RANKS.length; i++) {
      const prev = RANKS[i - 1];
      const curr = RANKS[i];
      for (const ex of curr.exercises) {
        const prevEx = prev.exercises.find((e) => e.id === ex.id);
        if (prevEx) {
          expect(ex.target).toBeGreaterThanOrEqual(prevEx.target);
        }
      }
    }
  });

  it("base exercises (pushups, squats, crunches, walk_km, plank_sec) are in every rank", () => {
    const baseIds = ["pushups", "squats", "crunches", "walk_km", "plank_sec"];
    for (const rank of RANKS) {
      const ids = rank.exercises.map((e) => e.id);
      for (const baseId of baseIds) {
        expect(ids).toContain(baseId);
      }
    }
  });

  it("lunges appear from D-Rank onward", () => {
    const dIdx = RANKS.findIndex((r) => r.id === "D");
    for (let i = dIdx; i < RANKS.length; i++) {
      const ids = RANKS[i].exercises.map((e) => e.id);
      expect(ids).toContain("lunges");
    }
  });

  it("pullups appear from B-Rank onward", () => {
    const bIdx = RANKS.findIndex((r) => r.id === "B");
    for (let i = bIdx; i < RANKS.length; i++) {
      const ids = RANKS[i].exercises.map((e) => e.id);
      expect(ids).toContain("pullups");
    }
  });

  it("S-Rank has correct color, glow, and subtitle", () => {
    const sRank = RANKS.find((r) => r.id === "S");
    expect(sRank.color).toBe("#ffd700");
    expect(sRank.glow).toBe("rgba(255,215,0,0.5)");
    expect(sRank.subtitle).toBe("National Level Hunter");
    expect(sRank.weeks).toBe("∞");
  });

  it("no duplicate exercise ids within a single rank", () => {
    for (const rank of RANKS) {
      const ids = rank.exercises.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("exercise ids are consistent across ranks (same id = same concept)", () => {
    const allIds = new Set();
    for (const rank of RANKS) {
      for (const ex of rank.exercises) {
        allIds.add(ex.id);
      }
    }
    expect(allIds).toEqual(
      new Set(["pushups", "squats", "crunches", "walk_km", "plank_sec", "lunges", "pullups"])
    );
  });
});
