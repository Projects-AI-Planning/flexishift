import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, radius, shadow, spacing} from '../../theme';

interface CardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  rightLabel?: string;
  variant?: 'default' | 'dark' | 'accent';
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  rightLabel,
  variant = 'default',
}) => {
  const cardStyles = [
    styles.card,
    variant === 'dark' && styles.cardDark,
    variant === 'accent' && styles.cardAccent,
  ];

  const titleStyles = [
    styles.title,
    variant === 'dark' && styles.textWhite,
  ];

  const subtitleStyles = [
    styles.subtitle,
    variant === 'dark' && styles.textLight,
  ];

  return (
    <View style={cardStyles}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={titleStyles}>{title}</Text>
          {subtitle && <Text style={subtitleStyles}>{subtitle}</Text>}
        </View>
        {rightLabel && (
          <View style={[styles.pill, variant === 'dark' ? styles.pillAccent : styles.pillDark]}>
            <Text style={variant === 'dark' ? styles.pillTextDark : styles.pillTextWhite}>{rightLabel}</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
    elevation: shadow.elevation,
  },
  cardDark: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  cardAccent: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.ink,
  },
  subtitle: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 4,
  },
  textWhite: {
    color: colors.card,
  },
  textLight: {
    color: '#C8D4E3',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  pillDark: {
    backgroundColor: colors.navy,
  },
  pillAccent: {
    backgroundColor: colors.accent,
  },
  pillTextWhite: {
    color: colors.card,
    fontSize: 11,
    fontWeight: '800',
  },
  pillTextDark: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: '800',
  },
  content: {
    marginTop: 4,
  },
});

export default Card;
