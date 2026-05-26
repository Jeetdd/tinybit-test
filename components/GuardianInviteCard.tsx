import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

type Invite = {
  id: string;
  guardian_id: string;
  guardian_name: string;
  parent_name: string;
  relation: string;
  created_at: string;
};

export default function GuardianInviteCard() {
  const { user, profile } = useAuth();
  const [invites, setInvites]   = useState<Invite[]>([]);
  const [loading, setLoading]   = useState(true);
  const [acting,  setActing]    = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    const email = profile?.email || user?.email;
    if (!email) { setLoading(false); return; }
    try {
      const { data: links, error } = await supabase
        .from('guardian_elder_links')
        .select('id, guardian_id, parent_name, relation, created_at')
        .eq('elder_email', email.toLowerCase())
        .eq('status', 'pending');
      if (error) throw error;
      const enriched = await Promise.all(
        (links ?? []).map(async (link) => {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', link.guardian_id)
            .maybeSingle();
          return { ...link, guardian_name: prof?.full_name ?? 'Guardian' };
        })
      );
      setInvites(enriched);
    } catch (err) {
      console.log('[GuardianInviteCard] error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.email, profile?.email]);

  // Fetch on focus
  useFocusEffect(useCallback(() => { fetchInvites(); }, [fetchInvites]));

  // Real-time: re-fetch whenever a new invitation is inserted for this elder's email
  useEffect(() => {
    const email = profile?.email || user?.email;
    if (!email) return;
    const channel = supabase
      .channel(`invites-elder-${email}`)
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'guardian_elder_links',
        filter: `elder_email=eq.${email.toLowerCase()}`,
      }, () => fetchInvites())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.email, profile?.email, fetchInvites]);

  const respond = async (linkId: string, action: 'accept' | 'decline') => {
    setActing(linkId);
    try {
      const newStatus = action === 'accept' ? 'connected' : 'declined';
      const update: Record<string, string> = { status: newStatus };
      // Stamp the elder's real user ID when accepting so guardian queries work
      if (action === 'accept' && user?.id) update.elder_id = user.id;

      const { error } = await supabase
        .from('guardian_elder_links')
        .update(update)
        .eq('id', linkId);

      if (error) throw error;
      setInvites(prev => prev.filter(i => i.id !== linkId));
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong');
    } finally {
      setActing(null);
    }
  };

  const confirmDecline = (invite: Invite) => {
    Alert.alert(
      'Decline Request',
      `Decline guardian request from ${invite.guardian_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Decline', style: 'destructive', onPress: () => respond(invite.id, 'decline') },
      ]
    );
  };

  if (loading || invites.length === 0) return null;

  return (
    <View style={s.wrapper}>
      <View style={s.headerRow}>
        <Ionicons name="shield-checkmark-outline" size={16} color="#243B80" />
        <Text style={s.headerText}>Guardian Requests</Text>
        <View style={s.badge}><Text style={s.badgeText}>{invites.length}</Text></View>
      </View>

      {invites.map(invite => (
        <View key={invite.id} style={s.card}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(invite.guardian_name || 'G')[0].toUpperCase()}</Text>
          </View>

          <View style={s.info}>
            <Text style={s.name}>{invite.guardian_name}</Text>
            <Text style={s.sub}>Wants to be your Guardian · {invite.relation}</Text>
          </View>

          {acting === invite.id ? (
            <ActivityIndicator size="small" color="#243B80" style={{ marginLeft: 8 }} />
          ) : (
            <View style={s.actions}>
              <TouchableOpacity style={s.declineBtn} onPress={() => confirmDecline(invite)}>
                <Text style={s.declineText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.acceptBtn} onPress={() => respond(invite.id, 'accept')}>
                <Text style={s.acceptText}>Accept</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#243B80',
    flex: 1,
  },
  badge: {
    backgroundColor: '#E8ECF8',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#243B80',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#243B80',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EEF1F8',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8ECF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#243B80',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15253E',
  },
  sub: {
    fontSize: 12,
    color: '#6B7A99',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  declineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E4EF',
  },
  declineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7A99',
  },
  acceptBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#243B80',
  },
  acceptText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
