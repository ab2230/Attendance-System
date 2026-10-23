import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Share,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { buildProgramCheckInUrl } from '../../../utils/checkInUrl';
import TopNavigator from '../../common/TopNavigator';
import LoadingScreen from '../../common/LoadingScreen';
import supabaseService from '../../../services/supabaseService';
import { supabase } from '../../../supabase-client';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'present', label: 'Present' },
  { id: 'absent', label: 'Absent' },
];

const AttendanceRoomDetailScreen = ({ route }) => {
  const { room } = route.params;
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [now, setNow] = useState(Date.now());

  const programName = room.programs?.name || 'Program';
  const shareUrl = buildProgramCheckInUrl(room.program_id);

  const loadEntries = useCallback(async () => {
    const data = await supabaseService.getAttendanceRoomEntries(room.attendance_record_id);
    setEntries(data);
  }, [room.attendance_record_id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadEntries();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadEntries]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`room_entries_${room.attendance_record_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_entries',
          filter: `attendance_record_id=eq.${room.attendance_record_id}`,
        },
        () => {
          loadEntries();
        },
      )
      .subscribe();

    const poll = setInterval(loadEntries, 8000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [room.attendance_record_id, loadEntries]);

  const formatRemaining = () => {
    const ms = new Date(room.expires_at).getTime() - now;
    if (ms <= 0) return 'Expired';
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  };

  const stats = useMemo(() => {
    const present = entries.filter((e) => e.status === 'Present').length;
    return { present, total: entries.length, absent: entries.length - present };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((entry) => {
      const first = entry.members?.first_name || '';
      const last = entry.members?.last_name || '';
      const full = `${first} ${last}`.trim().toLowerCase();
      const matchesSearch = !q || full.includes(q);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'present' && entry.status === 'Present') ||
        (filter === 'absent' && entry.status !== 'Present');
      return matchesSearch && matchesFilter;
    });
  }, [entries, search, filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadEntries();
    } finally {
      setRefreshing(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: shareUrl, url: shareUrl });
    } catch {
      // user cancelled
    }
  };

  const renderRow = ({ item }) => {
    const isPresent = item.status === 'Present';
    const name = `${item.members?.first_name || ''} ${item.members?.last_name || ''}`.trim();
    return (
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <Text style={styles.rowName}>{name || 'Unknown'}</Text>
          {isPresent && item.arrival_time ? (
            <Text style={styles.rowTime}>{String(item.arrival_time).slice(0, 5)}</Text>
          ) : null}
        </View>
        <View style={[styles.badge, isPresent ? styles.badgePresent : styles.badgeAbsent]}>
          <Text style={[styles.badgeText, isPresent ? styles.badgeTextPresent : styles.badgeTextAbsent]}>
            {isPresent ? 'Present' : 'Absent'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <TopNavigator title="Room details" backButton />
        <LoadingScreen text="Loading…" backgroundColor="#0a0f24" color="#ffcc00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavigator title="Room details" backButton />
      <FlatList
        data={filteredEntries}
        keyExtractor={(item) => item.id || item.member_id}
        renderItem={renderRow}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffcc00" />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.headerTop}>
              <Text style={styles.programName}>{programName}</Text>
              <Text style={styles.timer}>{formatRemaining()}</Text>
            </View>

            <Text style={styles.otpLabel}>Room code</Text>
            <Text style={styles.otp}>{room.otp_code}</Text>

            <View style={styles.statsRow}>
              <Text style={styles.statPresent}>{stats.present} present</Text>
              <Text style={styles.statMuted}> · {stats.absent} not yet</Text>
            </View>

            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Icon name="share-variant" size={20} color="#0a0f24" />
              <Text style={styles.shareBtnText}>Share program link</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search students…"
              placeholderTextColor="#8892b0"
              autoCorrect={false}
            />

            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
                  onPress={() => setFilter(f.id)}
                >
                  <Text
                    style={[styles.filterChipText, filter === f.id && styles.filterChipTextActive]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.listHint}>
              Showing {filteredEntries.length} of {entries.length} · updates live
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>No students match your search.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f24',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  headerBlock: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  programName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  timer: {
    color: '#ffcc00',
    fontWeight: '700',
    fontSize: 18,
  },
  otpLabel: {
    color: '#8892b0',
    marginTop: 12,
    fontSize: 13,
  },
  otp: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 6,
    marginVertical: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  statPresent: {
    color: '#4ade80',
    fontWeight: '600',
    fontSize: 15,
  },
  statMuted: {
    color: '#8892b0',
    fontSize: 15,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffcc00',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  shareBtnText: {
    color: '#0a0f24',
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: '#162447',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f3460',
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#162447',
    borderWidth: 1,
    borderColor: '#1f3460',
  },
  filterChipActive: {
    backgroundColor: '#ffcc00',
    borderColor: '#ffcc00',
  },
  filterChipText: {
    color: '#a8b2d1',
    fontWeight: '600',
    fontSize: 13,
  },
  filterChipTextActive: {
    color: '#0a0f24',
  },
  listHint: {
    color: '#8892b0',
    fontSize: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#162447',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1f3460',
  },
  rowMain: {
    flex: 1,
    marginRight: 8,
  },
  rowName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  rowTime: {
    color: '#8892b0',
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgePresent: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
  },
  badgeAbsent: {
    backgroundColor: 'rgba(136, 146, 176, 0.2)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextPresent: {
    color: '#4ade80',
  },
  badgeTextAbsent: {
    color: '#8892b0',
  },
  empty: {
    color: '#8892b0',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 15,
  },
});

export default AttendanceRoomDetailScreen;
