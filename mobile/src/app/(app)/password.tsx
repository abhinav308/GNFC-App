import { ScrollView, StyleSheet } from 'react-native';
import Back from '../../components/Back';
import ChangePasswordForm from '../../components/ChangePasswordForm';
import { useT } from '../../i18n';

export default function Password() {
  const { t } = useT();
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Back title={t('password')} sub={t('changePasswordSub')} />
      <ChangePasswordForm />
    </ScrollView>
  );
}

const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#f8fafc' } });
