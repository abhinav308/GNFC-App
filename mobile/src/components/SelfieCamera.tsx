import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useT } from '../i18n';

export interface SelfieAsset {
  uri: string;
  mimeType: string;
}

// Live front-camera preview with an oval face guide, like the web portal. The photo is taken inside the app,
// so it cannot come from the gallery.
export default function SelfieCamera({ onCapture, onCancel }: { onCapture: (a: SelfieAsset) => void; onCancel: () => void }) {
  const { t } = useT();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const snap = async () => {
    if (!camera.current || !ready || busy) return;
    setBusy(true);
    setError('');
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.5 });
      // A camera photo is several MB. 720 px wide is plenty to see a face and uploads many times faster on mobile data.
      let uri = photo.uri;
      try {
        uri = (await manipulateAsync(photo.uri, [{ resize: { width: 720 } }], { compress: 0.7, format: SaveFormat.JPEG })).uri;
      } catch {
        // keep the original photo if resizing is not possible
      }
      onCapture({ uri, mimeType: 'image/jpeg' });
    } catch {
      setError(t('cameraFailed'));
      setBusy(false);
    }
  };

  if (!permission) {
    return (
      <View style={[s.frame, s.center]}>
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[s.frame, s.center, { padding: 16, gap: 12 }]}>
        <Text style={s.permText}>{t('cameraPermission')}</Text>
        {permission.canAskAgain ? (
          <TouchableOpacity style={[s.btn, s.snap]} onPress={requestPermission}>
            <Text style={s.btnText}>{t('allowCamera')}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[s.btn, s.cancel]} onPress={onCancel}>
          <Text style={s.btnText}>{t('cancel')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.frame}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="front" onCameraReady={() => setReady(true)} />
      <View style={s.guideWrap} pointerEvents="none">
        <View style={s.oval} />
      </View>
      <View style={s.bottom}>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <View style={s.row}>
          <TouchableOpacity style={[s.btn, s.cancel]} onPress={onCancel} disabled={busy}>
            <Text style={s.btnText}>{t('cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.snap, (!ready || busy) && { opacity: 0.6 }]} onPress={snap} disabled={!ready || busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t('snapPhoto')}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 1, borderRadius: 18, borderWidth: 2, borderColor: '#10b981', overflow: 'hidden', backgroundColor: '#0f172a' },
  center: { alignItems: 'center', justifyContent: 'center' },
  guideWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingBottom: 36 },
  oval: { width: '66%', height: '78%', borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 12, alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 22, minWidth: 96, alignItems: 'center' },
  cancel: { backgroundColor: 'rgba(15,23,42,0.9)' },
  snap: { backgroundColor: '#059669' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  permText: { color: '#e2e8f0', fontSize: 13, textAlign: 'center' },
  error: { color: '#fecaca', fontSize: 12 },
});
