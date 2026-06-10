import { useMemo } from 'react';
import {
  Linking,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { useScaledTheme } from '@/constants/theme';

export type RichDescriptionTextProps = {
  fallback?: string;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  value: string | null | undefined;
};

type RichToken =
  | {
      text: string;
      type: 'bold' | 'italic' | 'text';
    }
  | {
      text: string;
      type: 'link';
      url: string;
    };

const richTokenPattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|_([^_]+)_/g;

function normalizeUrl(value: string) {
  const trimmedValue = value.trim();

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

function parseRichDescription(value: string): RichToken[] {
  const tokens: RichToken[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(richTokenPattern)) {
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      tokens.push({ text: value.slice(lastIndex, matchIndex), type: 'text' });
    }

    if (match[1] && match[2]) {
      tokens.push({ text: match[1], type: 'link', url: normalizeUrl(match[2]) });
    } else if (match[3]) {
      tokens.push({ text: match[3], type: 'bold' });
    } else if (match[4]) {
      tokens.push({ text: match[4], type: 'italic' });
    }

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < value.length) {
    tokens.push({ text: value.slice(lastIndex), type: 'text' });
  }

  return tokens;
}

export function getPlainDescriptionText(value: string | null | undefined, fallback = '') {
  const text = value?.trim();

  if (!text) {
    return fallback;
  }

  return parseRichDescription(text)
    .map((token) => token.text)
    .join('');
}

export function RichDescriptionText({
  fallback = 'Sem descrição cadastrada.',
  numberOfLines,
  style,
  value,
}: RichDescriptionTextProps) {
  const text = value?.trim() || fallback;
  const scaledTheme = useScaledTheme();
  const { Colors, Fonts } = scaledTheme;
  const styles = useMemo(() => createStyles(scaledTheme), [scaledTheme]);
  const tokens = useMemo(() => parseRichDescription(text), [text]);

  return (
    <Text numberOfLines={numberOfLines} style={style}>
      {tokens.map((token, index) => {
        if (token.type === 'bold') {
          return (
            <Text key={`${token.type}-${index}`} style={{ fontFamily: Fonts.interBold }}>
              {token.text}
            </Text>
          );
        }

        if (token.type === 'italic') {
          return (
            <Text key={`${token.type}-${index}`} style={styles.italicText}>
              {token.text}
            </Text>
          );
        }

        if (token.type === 'link') {
          return (
            <Text
              key={`${token.type}-${index}`}
              onPress={() => Linking.openURL(token.url)}
              style={[styles.linkText, { color: Colors.ocean[600] }]}>
              {token.text}
            </Text>
          );
        }

        return <Text key={`${token.type}-${index}`}>{token.text}</Text>;
      })}
    </Text>
  );
}

function createStyles({ Fonts }: ReturnType<typeof useScaledTheme>) {
  return StyleSheet.create({
    italicText: {
      fontFamily: Fonts.inter,
      fontStyle: 'italic',
    },
    linkText: {
      fontFamily: Fonts.interBold,
      textDecorationLine: 'underline',
    },
  });
}
