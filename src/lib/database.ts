import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  User,
  Tournament,
  TournamentRegistration,
  UserStats,
  GameStats,
  Announcement,
  AdminUser,
  GameType,
  SearchResult,
  LeaderboardEntry,
} from '@/types/types';

// User Management
export const createUser = async (user: User): Promise<void> => {
  await setDoc(doc(db, 'users', user.uid), {
    ...user,
    joinDate: Timestamp.fromDate(user.joinDate),
  });
};

export const getUser = async (uid: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) return null;
  
  const data = userDoc.data();
  return {
    ...data,
    joinDate: data.joinDate.toDate(),
    lastLoginDate: data.lastLoginDate?.toDate(),
  } as User;
};

export const updateUser = async (uid: string, updates: Partial<User>): Promise<void> => {
  const docRef = doc(db, 'users', uid);
  const updateData = { ...updates };
  
  if (updates.joinDate) {
    updateData.joinDate = Timestamp.fromDate(updates.joinDate);
  }
  if (updates.lastLoginDate) {
    updateData.lastLoginDate = Timestamp.fromDate(updates.lastLoginDate);
  }
  
  await updateDoc(docRef, updateData);
};

export const updateUserProfile = async (uid: string, profileData: {
  displayName?: string;
  email?: string;
  avatar?: string;
}): Promise<void> => {
  const docRef = doc(db, 'users', uid);
  await updateDoc(docRef, {
    ...profileData,
    updatedAt: Timestamp.now()
  });
};

export const getAllUsers = async (): Promise<User[]> => {
  const usersQuery = query(collection(db, 'users'), orderBy('displayName'));
  const snapshot = await getDocs(usersQuery);
  
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    joinDate: doc.data().joinDate.toDate(),
    lastLoginDate: doc.data().lastLoginDate?.toDate(),
  })) as User[];
};

// Tournament Management
export const createTournament = async (tournament: Tournament): Promise<void> => {
  await setDoc(doc(db, 'tournaments', tournament.id), {
    ...tournament,
    date: Timestamp.fromDate(tournament.date),
    registrationDeadline: Timestamp.fromDate(tournament.registrationDeadline),
    createdAt: Timestamp.fromDate(tournament.createdAt),
  });
};

export const getTournament = async (id: string): Promise<Tournament | null> => {
  const tournamentDoc = await getDoc(doc(db, 'tournaments', id));
  if (!tournamentDoc.exists()) return null;
  
  const data = tournamentDoc.data();
  return {
    ...data,
    date: data.date.toDate(),
    registrationDeadline: data.registrationDeadline.toDate(),
    createdAt: data.createdAt.toDate(),
  } as Tournament;
};

export const getTournaments = async (gameType?: GameType, status?: string): Promise<Tournament[]> => {
  let tournamentQuery = query(collection(db, 'tournaments'), orderBy('date', 'desc'));
  
  if (gameType) {
    tournamentQuery = query(tournamentQuery, where('game', '==', gameType));
  }
  
  if (status) {
    tournamentQuery = query(tournamentQuery, where('status', '==', status));
  }
  
  const snapshot = await getDocs(tournamentQuery);
  
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    date: doc.data().date.toDate(),
    registrationDeadline: doc.data().registrationDeadline.toDate(),
    createdAt: doc.data().createdAt.toDate(),
  })) as Tournament[];
};

export const updateTournament = async (id: string, updates: Partial<Tournament>): Promise<void> => {
  const docRef = doc(db, 'tournaments', id);
  const updateData = { ...updates };
  
  if (updates.date) {
    updateData.date = Timestamp.fromDate(updates.date);
  }
  if (updates.registrationDeadline) {
    updateData.registrationDeadline = Timestamp.fromDate(updates.registrationDeadline);
  }
  if (updates.createdAt) {
    updateData.createdAt = Timestamp.fromDate(updates.createdAt);
  }
  
  await updateDoc(docRef, updateData);
};

export const deleteTournament = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'tournaments', id));
};

// Tournament Registration Management
export const registerForTournament = async (registration: TournamentRegistration): Promise<void> => {
  const batch = writeBatch(db);
  
  // Add registration document
  const registrationRef = doc(db, 'tournament_registrations', registration.id);
  batch.set(registrationRef, {
    ...registration,
    registeredAt: Timestamp.fromDate(registration.registeredAt),
  });
  
  // Update tournament participants
  const tournamentRef = doc(db, 'tournaments', registration.tournamentId);
  batch.update(tournamentRef, {
    participants: arrayUnion(registration.userId),
  });
  
  await batch.commit();
};

export const unregisterFromTournament = async (tournamentId: string, userId: string): Promise<void> => {
  const batch = writeBatch(db);
  
  // Find and delete registration
  const registrationsQuery = query(
    collection(db, 'tournament_registrations'),
    where('tournamentId', '==', tournamentId),
    where('userId', '==', userId)
  );
  const registrations = await getDocs(registrationsQuery);
  
  registrations.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  // Update tournament participants
  const tournamentRef = doc(db, 'tournaments', tournamentId);
  batch.update(tournamentRef, {
    participants: arrayRemove(userId),
  });
  
  await batch.commit();
};

export const getTournamentRegistrations = async (tournamentId: string): Promise<TournamentRegistration[]> => {
  const registrationsQuery = query(
    collection(db, 'tournament_registrations'),
    where('tournamentId', '==', tournamentId),
    orderBy('registeredAt')
  );
  const snapshot = await getDocs(registrationsQuery);
  
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    registeredAt: doc.data().registeredAt.toDate(),
  })) as TournamentRegistration[];
};

export const getUserRegistrations = async (userId: string): Promise<TournamentRegistration[]> => {
  const registrationsQuery = query(
    collection(db, 'tournament_registrations'),
    where('userId', '==', userId),
    orderBy('registeredAt', 'desc')
  );
  const snapshot = await getDocs(registrationsQuery);
  
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    registeredAt: doc.data().registeredAt.toDate(),
  })) as TournamentRegistration[];
};

// User Statistics Management
export const createUserStats = async (userStats: UserStats): Promise<void> => {
  await setDoc(doc(db, 'user_stats', userStats.uid), {
    ...userStats,
    lastUpdated: Timestamp.fromDate(userStats.lastUpdated),
  });
};

export const getUserStats = async (uid: string): Promise<UserStats | null> => {
  const statsDoc = await getDoc(doc(db, 'user_stats', uid));
  if (!statsDoc.exists()) return null;
  
  const data = statsDoc.data();
  return {
    ...data,
    lastUpdated: data.lastUpdated.toDate(),
  } as UserStats;
};

export const updateUserStats = async (uid: string, updates: Partial<UserStats>): Promise<void> => {
  const docRef = doc(db, 'user_stats', uid);
  const updateData = { ...updates };
  
  if (updates.lastUpdated) {
    updateData.lastUpdated = Timestamp.fromDate(updates.lastUpdated);
  }
  
  await updateDoc(docRef, updateData);
};

// Leaderboard Functions
export const getLeaderboard = async (gameType?: GameType, timeframe: 'all' | 'weekly' | 'monthly' = 'all'): Promise<LeaderboardEntry[]> => {
  let pointsField = 'points';
  if (timeframe === 'weekly') pointsField = 'weeklyPoints';
  if (timeframe === 'monthly') pointsField = 'monthlyPoints';

  const usersQuery = query(
    collection(db, 'users'),
    orderBy(pointsField, 'desc'),
    limit(100)
  );

  const snapshot = await getDocs(usersQuery);

  return snapshot.docs.map((doc, index) => ({
    uid: doc.id,
    displayName: doc.data().displayName,
    avatar: doc.data().avatar,
    points: doc.data().points,
    weeklyPoints: doc.data().weeklyPoints,
    monthlyPoints: doc.data().monthlyPoints,
    rank: index + 1,
  })) as LeaderboardEntry[];
};

// Announcement Management
export const createAnnouncement = async (announcement: Announcement): Promise<void> => {
  await setDoc(doc(db, 'announcements', announcement.id), {
    ...announcement,
    createdAt: Timestamp.fromDate(announcement.createdAt),
    updatedAt: announcement.updatedAt ? Timestamp.fromDate(announcement.updatedAt) : null,
    expiresAt: announcement.expiresAt ? Timestamp.fromDate(announcement.expiresAt) : null,
  });
};

export const getAnnouncements = async (activeOnly: boolean = true): Promise<Announcement[]> => {
  let announcementsQuery = query(
    collection(db, 'announcements'),
    orderBy('createdAt', 'desc')
  );

  if (activeOnly) {
    announcementsQuery = query(announcementsQuery, where('isActive', '==', true));
  }

  const snapshot = await getDocs(announcementsQuery);

  return snapshot.docs.map(doc => ({
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
    expiresAt: doc.data().expiresAt?.toDate(),
  })) as Announcement[];
};

export const updateAnnouncement = async (id: string, updates: Partial<Announcement>): Promise<void> => {
  const docRef = doc(db, 'announcements', id);
  const updateData = { ...updates };

  if (updates.createdAt) {
    updateData.createdAt = Timestamp.fromDate(updates.createdAt);
  }
  if (updates.updatedAt) {
    updateData.updatedAt = Timestamp.fromDate(updates.updatedAt);
  }
  if (updates.expiresAt) {
    updateData.expiresAt = Timestamp.fromDate(updates.expiresAt);
  }

  await updateDoc(docRef, updateData);
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'announcements', id));
};

export const markAnnouncementAsRead = async (announcementId: string, userId: string): Promise<void> => {
  const docRef = doc(db, 'announcements', announcementId);
  await updateDoc(docRef, {
    readBy: arrayUnion(userId),
  });
};

// Admin User Management
export const createAdminUser = async (adminUser: AdminUser): Promise<void> => {
  await setDoc(doc(db, 'admin_users', adminUser.uid), {
    ...adminUser,
    createdAt: Timestamp.fromDate(adminUser.createdAt),
    lastActivity: adminUser.lastActivity ? Timestamp.fromDate(adminUser.lastActivity) : null,
  });
};

export const getAdminUser = async (uid: string): Promise<AdminUser | null> => {
  const adminDoc = await getDoc(doc(db, 'admin_users', uid));
  if (!adminDoc.exists()) return null;

  const data = adminDoc.data();
  return {
    ...data,
    createdAt: data.createdAt.toDate(),
    lastActivity: data.lastActivity?.toDate(),
  } as AdminUser;
};

export const updateAdminUser = async (uid: string, updates: Partial<AdminUser>): Promise<void> => {
  const docRef = doc(db, 'admin_users', uid);
  const updateData = { ...updates };

  if (updates.createdAt) {
    updateData.createdAt = Timestamp.fromDate(updates.createdAt);
  }
  if (updates.lastActivity) {
    updateData.lastActivity = Timestamp.fromDate(updates.lastActivity);
  }

  await updateDoc(docRef, updateData);
};

export const promoteUserToAdmin = async (userId: string, promotedBy: string): Promise<void> => {
  const batch = writeBatch(db);

  // Update user role to admin
  const userRef = doc(db, 'users', userId);
  batch.update(userRef, { role: 'admin' });

  // Create admin user document
  const adminUser: AdminUser = {
    uid: userId,
    email: '', // Will be filled from user data
    displayName: '', // Will be filled from user data
    permissions: ['manage_tournaments', 'manage_users', 'manage_announcements', 'view_analytics', 'manage_points'],
    createdAt: new Date(),
    createdBy: promotedBy,
    isActive: true,
    lastActivity: new Date(),
  };

  const adminUserRef = doc(db, 'admin_users', userId);
  batch.set(adminUserRef, {
    ...adminUser,
    createdAt: Timestamp.fromDate(adminUser.createdAt),
    lastActivity: Timestamp.fromDate(adminUser.lastActivity),
  });

  await batch.commit();
};

export const demoteAdminToUser = async (userId: string): Promise<void> => {
  const batch = writeBatch(db);

  // Update user role to member
  const userRef = doc(db, 'users', userId);
  batch.update(userRef, { role: 'member' });

  // Delete admin user document
  const adminUserRef = doc(db, 'admin_users', userId);
  batch.delete(adminUserRef);

  await batch.commit();
};

// Search Functions
export const searchUsers = async (searchTerm: string, limit_count: number = 10): Promise<SearchResult[]> => {
  const usersQuery = query(
    collection(db, 'users'),
    orderBy('displayName'),
    limit(limit_count)
  );

  const snapshot = await getDocs(usersQuery);

  return snapshot.docs
    .filter(doc =>
      doc.data().displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.data().email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .map(doc => ({
      id: doc.id,
      type: 'player' as const,
      title: doc.data().displayName,
      subtitle: doc.data().email,
      description: `${doc.data().points} points`,
      avatar: doc.data().avatar,
      metadata: {
        points: doc.data().points,
        role: doc.data().role,
      },
    }));
};

export const searchTournaments = async (searchTerm: string, limit_count: number = 10): Promise<SearchResult[]> => {
  const tournamentsQuery = query(
    collection(db, 'tournaments'),
    orderBy('name'),
    limit(limit_count)
  );

  const snapshot = await getDocs(tournamentsQuery);

  return snapshot.docs
    .filter(doc =>
      doc.data().name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.data().description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .map(doc => ({
      id: doc.id,
      type: 'tournament' as const,
      title: doc.data().name,
      subtitle: doc.data().game,
      description: doc.data().description,
      metadata: {
        status: doc.data().status,
        participants: doc.data().participants?.length || 0,
        maxParticipants: doc.data().maxParticipants,
        date: doc.data().date.toDate(),
      },
    }));
};

// Points Management
export const awardPoints = async (userId: string, points: number, reason: string, adminId: string): Promise<void> => {
  const batch = writeBatch(db);

  // Update user points
  const userRef = doc(db, 'users', userId);
  batch.update(userRef, {
    points: increment(points),
    weeklyPoints: increment(points),
    monthlyPoints: increment(points),
  });

  // Create points transaction record
  const transactionRef = doc(collection(db, 'points_transactions'));
  batch.set(transactionRef, {
    userId,
    amount: points,
    reason,
    adminId,
    timestamp: Timestamp.now(),
  });

  await batch.commit();
};

// User Dashboard Functions
export const getUserTournaments = async (userId: string): Promise<any[]> => {
  const registrationsQuery = query(
    collection(db, 'tournament_registrations'),
    where('userId', '==', userId),
    orderBy('registeredAt', 'desc')
  );
  const registrationsSnapshot = await getDocs(registrationsQuery);
  
  const tournaments = [];
  for (const regDoc of registrationsSnapshot.docs) {
    const regData = regDoc.data();
    const tournament = await getTournament(regData.tournamentId);
    if (tournament) {
      tournaments.push({
        id: tournament.id,
        name: tournament.name,
        date: tournament.date,
        status: tournament.status,
        position: tournament.winner === userId ? 1 : 
                 tournament.runnerUp === userId ? 2 : 
                 tournament.thirdPlace === userId ? 3 : null,
        points: tournament.winner === userId ? tournament.pointsAwarded.first :
                tournament.runnerUp === userId ? tournament.pointsAwarded.second :
                tournament.thirdPlace === userId ? tournament.pointsAwarded.third :
                tournament.pointsAwarded.participation,
        game: tournament.game,
      });
    }
  }
  
  return tournaments;
};

export const getUserRecentActivity = async (userId: string): Promise<any[]> => {
  const transactionsQuery = query(
    collection(db, 'points_transactions'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(10)
  );
  const snapshot = await getDocs(transactionsQuery);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data.reason.includes('tournament') ? 'tournament_win' : 
            data.reason.includes('achievement') ? 'achievement' : 'registration',
      title: data.reason,
      description: `Earned ${data.amount} points`,
      timestamp: data.timestamp.toDate(),
      points: data.amount,
    };
  });
};

export const getUserAchievements = async (userId: string): Promise<any[]> => {
  const user = await getUser(userId);
  if (!user) return [];
  
  // Define available achievements
  const availableAchievements = [
    { name: 'First Win', description: 'Win your first tournament', earned: user.points >= 50 },
    { name: 'Consistent Player', description: 'Participate in 5 tournaments', earned: (user.points / 20) >= 5 },
    { name: 'Top Performer', description: 'Finish in top 3', earned: user.points >= 100 },
    { name: 'Champion', description: 'Win 10 tournaments', earned: user.points >= 500 },
    { name: 'Legend', description: 'Reach 1000 points', earned: user.points >= 1000 },
  ];
  
  return availableAchievements;
};

export const getAdminOverviewStats = async (): Promise<any> => {
  const usersQuery = query(collection(db, 'users'));
  const tournamentsQuery = query(collection(db, 'tournaments'));
  const announcementsQuery = query(collection(db, 'announcements'), where('isActive', '==', true));
  
  const [usersSnapshot, tournamentsSnapshot, announcementsSnapshot] = await Promise.all([
    getDocs(usersQuery),
    getDocs(tournamentsQuery),
    getDocs(announcementsQuery)
  ]);
  
  const totalUsers = usersSnapshot.size;
  const activeUsers = usersSnapshot.docs.filter(doc => doc.data().isActive).length;
  const totalTournaments = tournamentsSnapshot.size;
  const upcomingTournaments = tournamentsSnapshot.docs.filter(doc => doc.data().status === 'upcoming').length;
  const totalAnnouncements = announcementsSnapshot.size;
  const unreadAnnouncements = announcementsSnapshot.docs.filter(doc => 
    !doc.data().readBy || doc.data().readBy.length === 0
  ).length;
  
  return {
    totalUsers,
    activeUsers,
    totalTournaments,
    upcomingTournaments,
    totalAnnouncements,
    unreadAnnouncements,
  };
};

// Utility Functions
export const resetWeeklyPoints = async (): Promise<void> => {
  const usersQuery = query(collection(db, 'users'));
  const snapshot = await getDocs(usersQuery);

  const batch = writeBatch(db);

  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { weeklyPoints: 0 });
  });

  await batch.commit();
};

export const resetMonthlyPoints = async (): Promise<void> => {
  const usersQuery = query(collection(db, 'users'));
  const snapshot = await getDocs(usersQuery);

  const batch = writeBatch(db);

  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { monthlyPoints: 0 });
  });

  await batch.commit();
};
