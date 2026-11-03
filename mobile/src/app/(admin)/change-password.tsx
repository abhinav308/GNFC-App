import { ScrollView, View } from 'react-native';
import { Header } from '../../components/AdminList';
import ChangePasswordForm from '../../components/ChangePasswordForm';

export default function ChangePassword() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Header title="Change password" sub="You will be signed out and sign in again with the new password." back />
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <ChangePasswordForm />
      </ScrollView>
    </View>
  );
}
