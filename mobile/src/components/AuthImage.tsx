import { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View } from 'react-native';
import { API_URL, tokens } from '../services/api';

// Photos and selfies are only served to a signed-in user, so the image request carries the Bearer token.
// `path` is what the API returns, usually origin-relative ("/api/attendance/...").
export default function AuthImage({ path, style }: { path: string; style?: StyleProp<ImageStyle> }) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    tokens.getAccess().then(setToken);
  }, []);
  const origin = API_URL.replace(/\/api\/?$/, '');
  const uri = /^https?:/.test(path) ? path : origin + path;
  if (!token) return <View style={[styles.empty, style as object]} />;
  return <Image style={[styles.empty, style]} source={{ uri, headers: { Authorization: `Bearer ${token}` } }} />;
}

const styles = StyleSheet.create({ empty: { backgroundColor: '#e2e8f0' } });
