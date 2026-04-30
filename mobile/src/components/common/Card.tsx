import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E4DED0',
  },
  cardDark: {
    backgroundColor: '#102235',
    borderColor: '#102235',
  },
  cardAccent: {
    backgroundColor: '#FFF3D5',
    borderColor: '#DFA622',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#18232F',
  },
  subtitle: {
    fontSize: 13,
    color: '#5B6671',
    marginTop: 4,
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textLight: {
    color: '#C4CDD6',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  pillDark: {
    backgroundColor: '#102235',
  },
  pillAccent: {
    backgroundColor: '#DFA622',
  },
  pillTextWhite: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  pillTextDark: {
    color: '#102235',
    fontSize: 11,
    fontWeight: '800',
  },
  content: {
    marginTop: 4,
  },
});

export default Card;
