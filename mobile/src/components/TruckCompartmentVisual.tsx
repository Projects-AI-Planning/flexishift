import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

export interface TruckCompartment {
  id: number;
  capacityLitres: string;
  fuelType: string;
}

export const FUEL_TYPES = [
  'Petrol',
  'Diesel',
  'LPG',
  'CNG',
  'Kerosene',
  'Water',
  'Chemicals',
  'Other',
];

export const FUEL_COLORS: Record<string, string> = {
  Petrol:    '#F97316',
  Diesel:    '#2563EB',
  LPG:       '#10B981',
  CNG:       '#8B5CF6',
  Kerosene:  '#EAB308',
  Water:     '#06B6D4',
  Chemicals: '#EF4444',
  Other:     '#6B7280',
};

interface Props {
  compartments: TruckCompartment[];
}

export default function TruckCompartmentVisual({compartments}: Props) {
  return (
    <View style={s.wrapper}>
      {/* ── Truck diagram ─────────────────────────────────── */}
      <View style={s.truckRow}>

        {/* CAB */}
        <View style={s.cab}>
          {/* Windshield */}
          <View style={s.windshield} />
          {/* Hood bump */}
          <View style={s.hood} />
          {/* Front bumper */}
          <View style={s.bumper} />
        </View>

        {/* Coupling bar */}
        <View style={s.coupling} />

        {/* TANKER / TRAILER */}
        <View style={s.tanker}>
          {compartments.length === 0 ? (
            <View style={s.emptySlot}>
              <Text style={s.emptyText}>No compartments</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              bounces={false}
              showsHorizontalScrollIndicator={false}
              style={s.scroll}
              contentContainerStyle={s.scrollContent}>
              {compartments.map((cpt, idx) => {
                const color = FUEL_COLORS[cpt.fuelType] ?? FUEL_COLORS.Other;
                const cap   = parseFloat(cpt.capacityLitres) || 0;
                const label = cap >= 1000
                  ? `${(cap / 1000).toFixed(cap % 1000 === 0 ? 0 : 1)}k L`
                  : `${cap} L`;
                return (
                  <View
                    key={cpt.id}
                    style={[s.compartment, idx > 0 && s.divider]}>
                    {/* Fuel-type stripe */}
                    <View style={[s.stripe, {backgroundColor: color}]} />
                    <Text style={s.cptNum}>C{idx + 1}</Text>
                    <Text style={s.cptCap}>{label}</Text>
                    <View style={s.fuelRow}>
                      <View style={[s.fuelDot, {backgroundColor: color}]} />
                      <Text style={s.fuelLabel} numberOfLines={1}>{cpt.fuelType}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      {/* ── Axles + Wheels ────────────────────────────────── */}
      <View style={s.axleRow}>
        {/* Front axle (cab) */}
        <View style={[s.axleGroup, {marginLeft: 10}]}>
          <View style={s.axleBar} />
          <View style={s.wheelPair}>
            <View style={s.wheel} />
          </View>
        </View>

        <View style={s.axleSpacer} />

        {/* Rear double axle (trailer) */}
        <View style={[s.axleGroup, {marginRight: 24}]}>
          <View style={s.axleBar} />
          <View style={s.wheelPair}>
            <View style={s.wheel} />
            <View style={[s.wheel, s.wheelOuter]} />
          </View>
        </View>
        <View style={[s.axleGroup, {marginRight: 8}]}>
          <View style={s.axleBar} />
          <View style={s.wheelPair}>
            <View style={s.wheel} />
            <View style={[s.wheel, s.wheelOuter]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const BORDER = '#111827';
const FILL   = '#F3F4F6';

const s = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 6,
    overflow: 'hidden',
  },

  // ── Truck row ──────────────────────────────────────────────────────────────
  truckRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 84,
    gap: 0,
  },

  // Cab
  cab: {
    width: 44,
    height: 72,
    backgroundColor: FILL,
    borderWidth: 2,
    borderColor: BORDER,
    borderRadius: 6,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 2,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 8,
    gap: 4,
    overflow: 'hidden',
  },
  windshield: {
    width: 28,
    height: 18,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  hood: {
    width: 34,
    height: 8,
    backgroundColor: '#D1D5DB',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 2,
  },
  bumper: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 8,
    backgroundColor: '#9CA3AF',
    borderTopWidth: 1.5,
    borderTopColor: BORDER,
  },

  // Coupling
  coupling: {
    width: 8,
    height: 6,
    backgroundColor: '#6B7280',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    alignSelf: 'flex-end',
    marginBottom: 14,
  },

  // Tanker
  tanker: {
    flex: 1,
    height: 72,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: BORDER,
    borderRadius: 4,
    overflow: 'hidden',
  },
  emptySlot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  scroll: {flex: 1},
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 68,
  },

  // Compartments inside tanker
  compartment: {
    width: 76,
    alignItems: 'center',
    paddingBottom: 6,
  },
  divider: {
    borderLeftWidth: 1.5,
    borderLeftColor: BORDER,
  },
  stripe: {
    width: '100%',
    height: 5,
    marginBottom: 4,
  },
  cptNum: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6B7280',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cptCap: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  fuelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  fuelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  fuelLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#374151',
    maxWidth: 50,
  },

  // ── Axles & Wheels ─────────────────────────────────────────────────────────
  axleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 0,
    paddingBottom: 2,
  },
  axleGroup: {
    alignItems: 'center',
  },
  axleBar: {
    width: 2,
    height: 5,
    backgroundColor: BORDER,
  },
  wheelPair: {
    flexDirection: 'row',
    gap: 2,
  },
  wheel: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1F2937',
    borderWidth: 3,
    borderColor: BORDER,
    // inner hub
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelOuter: {
    backgroundColor: '#374151',
  },
  axleSpacer: {
    flex: 1,
  },
});
