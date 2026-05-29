import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

export const FUEL_TYPES = ['Diesel', 'Petrol', 'AdBlue', 'Kerosene', 'Jet Fuel', 'Chemical', 'Other'] as const;

export const FUEL_COLORS: Record<string, string> = {
  Diesel:    '#F59E0B',
  Petrol:    '#EF4444',
  AdBlue:    '#3B82F6',
  Kerosene:  '#8B5CF6',
  'Jet Fuel':'#0EA5E9',
  Chemical:  '#10B981',
  Other:     '#6B7280',
};

export interface TruckCompartment {
  id: number;
  capacityLitres: string;
  fuelType: string;
}

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
          <View style={s.windshield} />
          <View style={s.hood} />
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
                const cap   = parseFloat(cpt.capacityLitres) || 0;
                const label = cap >= 1000
                  ? `${(cap / 1000).toFixed(cap % 1000 === 0 ? 0 : 1)}k L`
                  : `${cap} L`;
                const stripeColor = FUEL_COLORS[cpt.fuelType] ?? FUEL_COLORS.Other;
                return (
                  <View
                    key={cpt.id}
                    style={[s.compartment, idx > 0 && s.divider]}>
                    <View style={[s.stripe, {backgroundColor: stripeColor}]} />
                    <Text style={s.cptNum}>C{idx + 1}</Text>
                    <Text style={s.cptCap}>{label}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      {/* ── Axles + Wheels ────────────────────────────────── */}
      <View style={s.axleRow}>
        <View style={[s.axleGroup, {marginLeft: 10}]}>
          <View style={s.axleBar} />
          <View style={s.wheelPair}>
            <View style={s.wheel} />
          </View>
        </View>

        <View style={s.axleSpacer} />

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

const BORDER  = '#111827';
const FILL    = '#F3F4F6';
const ACCENT  = '#1066b1';

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

  truckRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 84,
    gap: 0,
  },

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
    backgroundColor: ACCENT,
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
