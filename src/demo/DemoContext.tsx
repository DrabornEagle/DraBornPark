import React from 'react';

/**
 * v0.5.0 production-only compatibility shim.
 *
 * The interactive demo was removed from DraBornPark. A few legacy screens still
 * reference the former hook while they are being simplified. This shim keeps
 * those dead branches type-safe without exposing demo data, routes or UI.
 */
export type DemoSection = string;

type LegacyDemoState = {
  profile: Record<string, any>;
  vehicles: any[];
  parks: any[];
  notifications: any[];
  tags: any[];
  timeline: any[];
  family: any[];
  guestDrivers: any[];
  vehicleModes: any[];
  routingRules: any[];
  emergencyContacts: any[];
  privacy: Record<string, boolean>;
  supportRequests: any[];
  factoryTags: any[];
  stats: {
    parksThisMonth: number;
    reportsThisMonth: number;
    averageParkMinutes: number;
    favoritePlace: string;
    privacyScore: number;
  };
};

const emptyState: LegacyDemoState = {
  profile: {},
  vehicles: [],
  parks: [],
  notifications: [],
  tags: [],
  timeline: [],
  family: [],
  guestDrivers: [],
  vehicleModes: [],
  routingRules: [],
  emergencyContacts: [],
  privacy: {},
  supportRequests: [],
  factoryTags: [],
  stats: {
    parksThisMonth: 0,
    reportsThisMonth: 0,
    averageParkMinutes: 0,
    favoritePlace: 'Henüz yok',
    privacyScore: 100,
  },
};

export function DemoProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useDemo() {
  return {
    active: false as const,
    state: emptyState,
    start: () => undefined,
    stop: () => undefined,
    reset: () => undefined,
    patch: (_recipe: (current: LegacyDemoState) => LegacyDemoState) => undefined,
  };
}
