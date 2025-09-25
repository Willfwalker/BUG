'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Settings, 
  Trophy, 
  Bell, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  Gamepad2,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Save,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  Award,
  UserCheck,
  UserX
} from 'lucide-react';
import { 
  getAdminOverviewStats, 
  getTournaments, 
  getAnnouncements, 
  getAllUsers,
  promoteUserToAdmin,
  demoteAdminToUser,
  createTournament,
  updateTournament,
  deleteTournament,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  awardPoints,
  updateUser
} from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [overviewStats, setOverviewStats] = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [promotingUser, setPromotingUser] = useState<string | null>(null);
  
  // Modal states
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [editingTournament, setEditingTournament] = useState<any>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Form states
  const [tournamentForm, setTournamentForm] = useState({
    name: '',
    description: '',
    game: 'mario_kart' as 'mario_kart' | 'super_smash_bros' | 'general',
    date: '',
    registrationDeadline: '',
    maxParticipants: 16,
    pointsAwarded: {
      first: 100,
      second: 50,
      third: 25,
      participation: 10
    },
    rules: [''],
    format: 'single_elimination' as 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss',
    entryFee: 0,
    prizePool: 0
  });
  
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'normal' | 'important' | 'urgent',
    targetAudience: 'all' as 'all' | 'members' | 'admins',
    expiresAt: ''
  });
  
  const [pointsForm, setPointsForm] = useState({
    amount: 0,
    reason: ''
  });
  
  // Search and filter states
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'admin' | 'member'>('all');

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        setLoading(true);
        const [stats, tournamentsData, announcementsData, usersData] = await Promise.all([
          getAdminOverviewStats(),
          getTournaments(),
          getAnnouncements(false),
          getAllUsers()
        ]);
        
        setOverviewStats(stats);
        setTournaments(tournamentsData.map(t => ({
          ...t,
          participants: t.participants?.length || 0,
          date: t.date.toISOString().split('T')[0]
        })));
        setAnnouncements(announcementsData.map(a => ({
          ...a,
          createdAt: a.createdAt.toISOString().split('T')[0],
          readBy: a.readBy?.length || 0
        })));
        setUsers(usersData);
      } catch (error) {
        console.error('Error loading admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, []);

  const handlePromoteToAdmin = async (userId: string) => {
    if (!user) return;
    
    try {
      setPromotingUser(userId);
      await promoteUserToAdmin(userId, user.uid);
      
      // Refresh users data
      const usersData = await getAllUsers();
      setUsers(usersData);
      
      // Show success message (you could add a toast notification here)
      console.log('User promoted to admin successfully');
    } catch (error) {
      console.error('Error promoting user to admin:', error);
    } finally {
      setPromotingUser(null);
    }
  };

  const handleDemoteFromAdmin = async (userId: string) => {
    try {
      setPromotingUser(userId);
      await demoteAdminToUser(userId);
      
      // Refresh users data
      const usersData = await getAllUsers();
      setUsers(usersData);
      
      // Show success message (you could add a toast notification here)
      console.log('Admin demoted to user successfully');
    } catch (error) {
      console.error('Error demoting admin to user:', error);
    } finally {
      setPromotingUser(null);
    }
  };

  // Tournament handlers
  const handleCreateTournament = async () => {
    if (!user) return;
    
    try {
      const tournamentData = {
        ...tournamentForm,
        id: `tournament_${Date.now()}`,
        date: new Date(tournamentForm.date),
        registrationDeadline: new Date(tournamentForm.registrationDeadline),
        participants: [],
        status: 'upcoming' as const,
        createdAt: new Date(),
        createdBy: user.uid,
        brackets: []
      };
      
      await createTournament(tournamentData);
      
      // Refresh tournaments data
      const tournamentsData = await getTournaments();
      setTournaments(tournamentsData.map(t => ({
        ...t,
        participants: t.participants?.length || 0,
        date: t.date.toISOString().split('T')[0]
      })));
      
      // Reset form and close modal
      setTournamentForm({
        name: '',
        description: '',
        game: 'mario_kart',
        date: '',
        registrationDeadline: '',
        maxParticipants: 16,
        pointsAwarded: { first: 100, second: 50, third: 25, participation: 10 },
        rules: [''],
        format: 'single_elimination',
        entryFee: 0,
        prizePool: 0
      });
      setShowTournamentModal(false);
      
      console.log('Tournament created successfully');
    } catch (error) {
      console.error('Error creating tournament:', error);
    }
  };

  const handleEditTournament = (tournament: any) => {
    setEditingTournament(tournament);
    setTournamentForm({
      name: tournament.name,
      description: tournament.description,
      game: tournament.game,
      date: tournament.date.toISOString().split('T')[0],
      registrationDeadline: tournament.registrationDeadline.toISOString().split('T')[0],
      maxParticipants: tournament.maxParticipants,
      pointsAwarded: tournament.pointsAwarded,
      rules: tournament.rules.length > 0 ? tournament.rules : [''],
      format: tournament.format,
      entryFee: tournament.entryFee || 0,
      prizePool: tournament.prizePool || 0
    });
    setShowTournamentModal(true);
  };

  const handleUpdateTournament = async () => {
    if (!editingTournament) return;
    
    try {
      const updateData = {
        ...tournamentForm,
        date: new Date(tournamentForm.date),
        registrationDeadline: new Date(tournamentForm.registrationDeadline)
      };
      
      await updateTournament(editingTournament.id, updateData);
      
      // Refresh tournaments data
      const tournamentsData = await getTournaments();
      setTournaments(tournamentsData.map(t => ({
        ...t,
        participants: t.participants?.length || 0,
        date: t.date.toISOString().split('T')[0]
      })));
      
      // Reset form and close modal
      setEditingTournament(null);
      setShowTournamentModal(false);
      
      console.log('Tournament updated successfully');
    } catch (error) {
      console.error('Error updating tournament:', error);
    }
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return;
    
    try {
      await deleteTournament(tournamentId);
      
      // Refresh tournaments data
      const tournamentsData = await getTournaments();
      setTournaments(tournamentsData.map(t => ({
        ...t,
        participants: t.participants?.length || 0,
        date: t.date.toISOString().split('T')[0]
      })));
      
      console.log('Tournament deleted successfully');
    } catch (error) {
      console.error('Error deleting tournament:', error);
    }
  };

  // Announcement handlers
  const handleCreateAnnouncement = async () => {
    if (!user) return;
    
    try {
      const announcementData = {
        ...announcementForm,
        id: `announcement_${Date.now()}`,
        authorId: user.uid,
        authorName: user.displayName,
        createdAt: new Date(),
        isActive: true,
        readBy: [],
        expiresAt: announcementForm.expiresAt ? new Date(announcementForm.expiresAt) : undefined
      };
      
      await createAnnouncement(announcementData);
      
      // Refresh announcements data
      const announcementsData = await getAnnouncements(false);
      setAnnouncements(announcementsData.map(a => ({
        ...a,
        createdAt: a.createdAt.toISOString().split('T')[0],
        readBy: a.readBy?.length || 0
      })));
      
      // Reset form and close modal
      setAnnouncementForm({
        title: '',
        content: '',
        priority: 'normal',
        targetAudience: 'all',
        expiresAt: ''
      });
      setShowAnnouncementModal(false);
      
      console.log('Announcement created successfully');
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

  const handleEditAnnouncement = (announcement: any) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      targetAudience: announcement.targetAudience,
      expiresAt: announcement.expiresAt ? announcement.expiresAt.toISOString().split('T')[0] : ''
    });
    setShowAnnouncementModal(true);
  };

  const handleUpdateAnnouncement = async () => {
    if (!editingAnnouncement) return;
    
    try {
      const updateData = {
        ...announcementForm,
        updatedAt: new Date(),
        expiresAt: announcementForm.expiresAt ? new Date(announcementForm.expiresAt) : undefined
      };
      
      await updateAnnouncement(editingAnnouncement.id, updateData);
      
      // Refresh announcements data
      const announcementsData = await getAnnouncements(false);
      setAnnouncements(announcementsData.map(a => ({
        ...a,
        createdAt: a.createdAt.toISOString().split('T')[0],
        readBy: a.readBy?.length || 0
      })));
      
      // Reset form and close modal
      setEditingAnnouncement(null);
      setShowAnnouncementModal(false);
      
      console.log('Announcement updated successfully');
    } catch (error) {
      console.error('Error updating announcement:', error);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      await deleteAnnouncement(announcementId);
      
      // Refresh announcements data
      const announcementsData = await getAnnouncements(false);
      setAnnouncements(announcementsData.map(a => ({
        ...a,
        createdAt: a.createdAt.toISOString().split('T')[0],
        readBy: a.readBy?.length || 0
      })));
      
      console.log('Announcement deleted successfully');
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  // Points management
  const handleAwardPoints = async () => {
    if (!user || !selectedUser) return;
    
    try {
      await awardPoints(selectedUser.uid, pointsForm.amount, pointsForm.reason, user.uid);
      
      // Refresh users data
      const usersData = await getAllUsers();
      setUsers(usersData);
      
      // Reset form and close modal
      setPointsForm({ amount: 0, reason: '' });
      setSelectedUser(null);
      setShowPointsModal(false);
      
      console.log('Points awarded successfully');
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  // User management
  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUser(userId, { isActive: !currentStatus });
      
      // Refresh users data
      const usersData = await getAllUsers();
      setUsers(usersData);
      
      console.log('User status updated successfully');
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  // Filter users based on search and filter
  const filteredUsers = users.filter(userData => {
    const matchesSearch = userData.displayName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                         userData.email.toLowerCase().includes(userSearchTerm.toLowerCase());
    const matchesFilter = userFilter === 'all' || userData.role === userFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge className="bg-primary text-primary-foreground">Upcoming</Badge>;
      case 'ongoing':
        return <Badge className="bg-accent text-accent-foreground">Ongoing</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-destructive text-destructive-foreground">Urgent</Badge>;
      case 'important':
        return <Badge className="bg-accent text-accent-foreground">Important</Badge>;
      case 'normal':
        return <Badge className="bg-primary text-primary-foreground">Normal</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navigation />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading admin data...</p>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              <Settings className="inline h-10 w-10 mr-3 text-primary" />
              Admin Panel
            </h1>
            <p className="text-xl text-muted-foreground">
              Manage tournaments, announcements, and community settings
            </p>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
            <Card className="glass hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{overviewStats.totalUsers}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold">{overviewStats.activeUsers}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-accent" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tournaments</p>
                    <p className="text-2xl font-bold">{overviewStats.totalTournaments}</p>
                  </div>
                  <Trophy className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Upcoming</p>
                    <p className="text-2xl font-bold">{overviewStats.upcomingTournaments}</p>
                  </div>
                  <Clock className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Announcements</p>
                    <p className="text-2xl font-bold">{overviewStats.totalAnnouncements}</p>
                  </div>
                  <Bell className="h-8 w-8 text-accent" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Unread</p>
                    <p className="text-2xl font-bold">{overviewStats.unreadAnnouncements}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">
                Overview
              </TabsTrigger>
              <TabsTrigger value="tournaments">
                Tournaments
              </TabsTrigger>
              <TabsTrigger value="announcements">
                Announcements
              </TabsTrigger>
              <TabsTrigger value="users">
                Users
              </TabsTrigger>
              <TabsTrigger value="analytics">
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent Tournaments */}
                <Card className="bg-slate-800/50 border-slate-700 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Trophy className="h-5 w-5 mr-2 text-yellow-400" />
                      Recent Tournaments
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      Latest tournament activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {tournaments.slice(0, 3).map((tournament) => (
                        <div key={tournament.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium text-white">{tournament.name}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {tournament.game === 'mario_kart' ? 'Mario Kart' : 'Super Smash Bros'}
                              </Badge>
                              {getStatusBadge(tournament.status)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-400">
                              {tournament.participants}/{tournament.maxParticipants}
                            </div>
                            <div className="text-xs text-gray-500">participants</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Announcements */}
                <Card className="bg-slate-800/50 border-slate-700 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Bell className="h-5 w-5 mr-2 text-blue-400" />
                      Recent Announcements
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      Latest community updates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {announcements.slice(0, 3).map((announcement) => (
                        <div key={announcement.id} className="p-3 bg-slate-700/50 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-white">{announcement.title}</h4>
                              <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                                {announcement.content}
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                {new Date(announcement.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="ml-4">
                              {getPriorityBadge(announcement.priority)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tournaments Tab */}
            <TabsContent value="tournaments" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700 text-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Trophy className="h-5 w-5 mr-2 text-yellow-400" />
                        Tournament Management
                      </CardTitle>
                      <CardDescription className="text-gray-300">
                        Create and manage tournaments
                      </CardDescription>
                    </div>
                    <Button 
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      onClick={() => {
                        setEditingTournament(null);
                        setShowTournamentModal(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Tournament
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-gray-300">Tournament</TableHead>
                        <TableHead className="text-gray-300">Game</TableHead>
                        <TableHead className="text-gray-300">Date</TableHead>
                        <TableHead className="text-gray-300">Participants</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tournaments.map((tournament) => (
                        <TableRow key={tournament.id} className="border-slate-700">
                          <TableCell className="text-white">{tournament.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {tournament.game === 'mario_kart' ? 'Mario Kart' : 'Super Smash Bros'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {new Date(tournament.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {tournament.participants}/{tournament.maxParticipants}
                          </TableCell>
                          <TableCell>{getStatusBadge(tournament.status)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-slate-600 text-white hover:bg-slate-700"
                                onClick={() => handleEditTournament(tournament)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                                onClick={() => handleDeleteTournament(tournament.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Announcements Tab */}
            <TabsContent value="announcements" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700 text-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Bell className="h-5 w-5 mr-2 text-blue-400" />
                        Announcement Management
                      </CardTitle>
                      <CardDescription className="text-gray-300">
                        Create and manage community announcements
                      </CardDescription>
                    </div>
                    <Button 
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      onClick={() => {
                        setEditingAnnouncement(null);
                        setShowAnnouncementModal(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Announcement
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {announcements.map((announcement) => (
                      <div key={announcement.id} className="p-4 bg-slate-700/50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium text-white">{announcement.title}</h4>
                              {getPriorityBadge(announcement.priority)}
                              <Badge variant="outline" className="text-xs">
                                {announcement.readBy} reads
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-300 mb-2">{announcement.content}</p>
                            <p className="text-xs text-gray-400">
                              Created {new Date(announcement.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-slate-600 text-white hover:bg-slate-700"
                              onClick={() => handleEditAnnouncement(announcement)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                              onClick={() => handleDeleteAnnouncement(announcement.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700 text-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2 text-green-400" />
                        User Management
                      </CardTitle>
                      <CardDescription className="text-gray-300">
                        Manage user accounts, permissions, and points
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search users..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="pl-10 w-64 bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <Select value={userFilter} onValueChange={(value: any) => setUserFilter(value)}>
                        <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          <SelectItem value="admin">Admins</SelectItem>
                          <SelectItem value="member">Members</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-gray-300">User</TableHead>
                        <TableHead className="text-gray-300">Email</TableHead>
                        <TableHead className="text-gray-300">Role</TableHead>
                        <TableHead className="text-gray-300">Points</TableHead>
                        <TableHead className="text-gray-300">Join Date</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((userData) => (
                        <TableRow key={userData.uid} className="border-slate-700">
                          <TableCell className="text-white">
                            <div className="flex items-center space-x-3">
                              {userData.avatar ? (
                                <img 
                                  src={userData.avatar} 
                                  alt={userData.displayName}
                                  className="h-8 w-8 rounded-full"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center">
                                  <span className="text-sm font-medium">
                                    {userData.displayName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <span>{userData.displayName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-300">{userData.email}</TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                userData.role === 'admin' 
                                  ? 'bg-red-600 text-white' 
                                  : 'bg-blue-600 text-white'
                              }
                            >
                              {userData.role === 'admin' ? 'Admin' : 'Member'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">{userData.points}</TableCell>
                          <TableCell className="text-gray-300">
                            {new Date(userData.joinDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {userData.role === 'admin' ? (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                                  onClick={() => handleDemoteFromAdmin(userData.uid)}
                                  disabled={promotingUser === userData.uid}
                                >
                                  {promotingUser === userData.uid ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                                  ) : (
                                    <Users className="h-3 w-3 mr-1" />
                                  )}
                                  Demote
                                </Button>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                                  onClick={() => handlePromoteToAdmin(userData.uid)}
                                  disabled={promotingUser === userData.uid}
                                >
                                  {promotingUser === userData.uid ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                                  ) : (
                                    <Users className="h-3 w-3 mr-1" />
                                  )}
                                  Promote
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                                onClick={() => {
                                  setSelectedUser(userData);
                                  setShowPointsModal(true);
                                }}
                              >
                                <Award className="h-3 w-3 mr-1" />
                                Points
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className={userData.isActive ? "border-red-500 text-red-500 hover:bg-red-500 hover:text-white" : "border-green-500 text-green-500 hover:bg-green-500 hover:text-white"}
                                onClick={() => handleToggleUserStatus(userData.uid, userData.isActive)}
                              >
                                {userData.isActive ? (
                                  <>
                                    <UserX className="h-3 w-3 mr-1" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    Activate
                                  </>
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* User Growth Chart */}
                <Card className="bg-slate-800/50 border-slate-700 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
                      User Growth
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      Monthly user registration trends
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-slate-700/50 rounded-lg">
                      <div className="text-center">
                        <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-300">Chart visualization would go here</p>
                        <p className="text-sm text-gray-400">Integration with charting library needed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tournament Participation */}
                <Card className="bg-slate-800/50 border-slate-700 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Trophy className="h-5 w-5 mr-2 text-yellow-400" />
                      Tournament Participation
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      Average participants per tournament
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                        <span className="text-gray-300">Mario Kart Tournaments</span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">
                            {tournaments.filter(t => t.game === 'mario_kart').reduce((acc, t) => acc + t.participants, 0) / Math.max(tournaments.filter(t => t.game === 'mario_kart').length, 1)}
                          </div>
                          <div className="text-sm text-gray-400">avg participants</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                        <span className="text-gray-300">Super Smash Bros</span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">
                            {tournaments.filter(t => t.game === 'super_smash_bros').reduce((acc, t) => acc + t.participants, 0) / Math.max(tournaments.filter(t => t.game === 'super_smash_bros').length, 1)}
                          </div>
                          <div className="text-sm text-gray-400">avg participants</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                        <span className="text-gray-300">General Tournaments</span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">
                            {tournaments.filter(t => t.game === 'general').reduce((acc, t) => acc + t.participants, 0) / Math.max(tournaments.filter(t => t.game === 'general').length, 1)}
                          </div>
                          <div className="text-sm text-gray-400">avg participants</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Top Performers */}
                <Card className="bg-slate-800/50 border-slate-700 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Award className="h-5 w-5 mr-2 text-yellow-400" />
                      Top Performers
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      Users with highest points
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {users
                        .sort((a, b) => b.points - a.points)
                        .slice(0, 5)
                        .map((userData, index) => (
                          <div key={userData.uid} className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center justify-center w-6 h-6 bg-yellow-500 text-black text-xs font-bold rounded-full">
                                {index + 1}
                              </div>
                              <div className="flex items-center space-x-2">
                                {userData.avatar ? (
                                  <img 
                                    src={userData.avatar} 
                                    alt={userData.displayName}
                                    className="h-6 w-6 rounded-full"
                                  />
                                ) : (
                                  <div className="h-6 w-6 rounded-full bg-slate-600 flex items-center justify-center">
                                    <span className="text-xs font-medium">
                                      {userData.displayName.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <span className="text-sm text-white">{userData.displayName}</span>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-yellow-400">{userData.points}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Activity Summary */}
                <Card className="bg-slate-800/50 border-slate-700 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-blue-400" />
                      Activity Summary
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      Recent platform activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Active Users</span>
                        <span className="text-white font-bold">{users.filter(u => u.isActive).length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Total Tournaments</span>
                        <span className="text-white font-bold">{tournaments.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Upcoming Events</span>
                        <span className="text-white font-bold">{tournaments.filter(t => t.status === 'upcoming').length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Total Announcements</span>
                        <span className="text-white font-bold">{announcements.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* System Health */}
                <Card className="bg-slate-800/50 border-slate-700 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                      System Health
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      Platform status and metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Database Status</span>
                        <Badge className="bg-green-600 text-white">Healthy</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Authentication</span>
                        <Badge className="bg-green-600 text-white">Active</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Storage Usage</span>
                        <span className="text-white font-bold">Low</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Last Backup</span>
                        <span className="text-white font-bold">Today</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Tournament Modal */}
        {showTournamentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingTournament ? 'Edit Tournament' : 'Create Tournament'}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowTournamentModal(false);
                    setEditingTournament(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tournament Name</label>
                    <Input
                      value={tournamentForm.name}
                      onChange={(e) => setTournamentForm({...tournamentForm, name: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Enter tournament name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Game</label>
                    <Select value={tournamentForm.game} onValueChange={(value: any) => setTournamentForm({...tournamentForm, game: value})}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mario_kart">Mario Kart</SelectItem>
                        <SelectItem value="super_smash_bros">Super Smash Bros</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <Textarea
                    value={tournamentForm.description}
                    onChange={(e) => setTournamentForm({...tournamentForm, description: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Enter tournament description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tournament Date</label>
                    <Input
                      type="datetime-local"
                      value={tournamentForm.date}
                      onChange={(e) => setTournamentForm({...tournamentForm, date: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Registration Deadline</label>
                    <Input
                      type="datetime-local"
                      value={tournamentForm.registrationDeadline}
                      onChange={(e) => setTournamentForm({...tournamentForm, registrationDeadline: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Participants</label>
                    <Input
                      type="number"
                      value={tournamentForm.maxParticipants}
                      onChange={(e) => setTournamentForm({...tournamentForm, maxParticipants: parseInt(e.target.value)})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Entry Fee</label>
                    <Input
                      type="number"
                      value={tournamentForm.entryFee}
                      onChange={(e) => setTournamentForm({...tournamentForm, entryFee: parseInt(e.target.value)})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Prize Pool</label>
                    <Input
                      type="number"
                      value={tournamentForm.prizePool}
                      onChange={(e) => setTournamentForm({...tournamentForm, prizePool: parseInt(e.target.value)})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Format</label>
                    <Select value={tournamentForm.format} onValueChange={(value: any) => setTournamentForm({...tournamentForm, format: value})}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_elimination">Single Elimination</SelectItem>
                        <SelectItem value="double_elimination">Double Elimination</SelectItem>
                        <SelectItem value="round_robin">Round Robin</SelectItem>
                        <SelectItem value="swiss">Swiss</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Points Awarded</label>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">1st Place</label>
                      <Input
                        type="number"
                        value={tournamentForm.pointsAwarded.first}
                        onChange={(e) => setTournamentForm({
                          ...tournamentForm, 
                          pointsAwarded: {...tournamentForm.pointsAwarded, first: parseInt(e.target.value)}
                        })}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">2nd Place</label>
                      <Input
                        type="number"
                        value={tournamentForm.pointsAwarded.second}
                        onChange={(e) => setTournamentForm({
                          ...tournamentForm, 
                          pointsAwarded: {...tournamentForm.pointsAwarded, second: parseInt(e.target.value)}
                        })}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">3rd Place</label>
                      <Input
                        type="number"
                        value={tournamentForm.pointsAwarded.third}
                        onChange={(e) => setTournamentForm({
                          ...tournamentForm, 
                          pointsAwarded: {...tournamentForm.pointsAwarded, third: parseInt(e.target.value)}
                        })}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Participation</label>
                      <Input
                        type="number"
                        value={tournamentForm.pointsAwarded.participation}
                        onChange={(e) => setTournamentForm({
                          ...tournamentForm, 
                          pointsAwarded: {...tournamentForm.pointsAwarded, participation: parseInt(e.target.value)}
                        })}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowTournamentModal(false);
                      setEditingTournament(null);
                    }}
                    className="border-slate-600 text-white hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editingTournament ? handleUpdateTournament : handleCreateTournament}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingTournament ? 'Update' : 'Create'} Tournament
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Announcement Modal */}
        {showAnnouncementModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAnnouncementModal(false);
                    setEditingAnnouncement(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                  <Input
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Enter announcement title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
                  <Textarea
                    value={announcementForm.content}
                    onChange={(e) => setAnnouncementForm({...announcementForm, content: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Enter announcement content"
                    rows={6}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                    <Select value={announcementForm.priority} onValueChange={(value: any) => setAnnouncementForm({...announcementForm, priority: value})}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="important">Important</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Target Audience</label>
                    <Select value={announcementForm.targetAudience} onValueChange={(value: any) => setAnnouncementForm({...announcementForm, targetAudience: value})}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="members">Members Only</SelectItem>
                        <SelectItem value="admins">Admins Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Expires At (Optional)</label>
                  <Input
                    type="datetime-local"
                    value={announcementForm.expiresAt}
                    onChange={(e) => setAnnouncementForm({...announcementForm, expiresAt: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAnnouncementModal(false);
                      setEditingAnnouncement(null);
                    }}
                    className="border-slate-600 text-white hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editingAnnouncement ? handleUpdateAnnouncement : handleCreateAnnouncement}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingAnnouncement ? 'Update' : 'Create'} Announcement
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Points Modal */}
        {showPointsModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Award Points</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPointsModal(false);
                    setSelectedUser(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-3 mb-2">
                    {selectedUser.avatar ? (
                      <img 
                        src={selectedUser.avatar} 
                        alt={selectedUser.displayName}
                        className="h-12 w-12 rounded-full"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-slate-600 flex items-center justify-center">
                        <span className="text-lg font-medium">
                          {selectedUser.displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-medium text-white">{selectedUser.displayName}</h3>
                      <p className="text-sm text-gray-400">Current Points: {selectedUser.points}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Points Amount</label>
                  <Input
                    type="number"
                    value={pointsForm.amount}
                    onChange={(e) => setPointsForm({...pointsForm, amount: parseInt(e.target.value)})}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Enter points to award"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
                  <Textarea
                    value={pointsForm.reason}
                    onChange={(e) => setPointsForm({...pointsForm, reason: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Enter reason for awarding points"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPointsModal(false);
                      setSelectedUser(null);
                    }}
                    className="border-slate-600 text-white hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAwardPoints}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Award className="h-4 w-4 mr-2" />
                    Award Points
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}