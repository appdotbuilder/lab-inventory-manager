
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { Item, User, CreateItemInput, UpdateItemInput, SearchItemsInput, CreateBorrowingInput, ReturnItemInput, BorrowingHistory } from '../../server/src/schema';

type ItemCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';

function App() {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [borrowingHistory, setBorrowingHistory] = useState<BorrowingHistory[]>([]);
  const [overdueItems, setOverdueItems] = useState<BorrowingHistory[]>([]);
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [conditionFilter, setConditionFilter] = useState<ItemCondition | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);

  // Form states
  const [itemForm, setItemForm] = useState<CreateItemInput>({
    name: '',
    asset_code: '',
    description: null,
    purchase_date: null,
    condition: 'excellent',
    storage_location: '',
    quantity: 1,
    current_user_id: null
  });

  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [borrowForm, setBorrowForm] = useState<CreateBorrowingInput>({
    item_id: 0,
    borrower_id: 0,
    expected_return_date: new Date(),
    notes: null
  });

  const [returnForm, setReturnForm] = useState<ReturnItemInput>({
    borrowing_id: 0,
    notes: null
  });

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBorrowDialog, setShowBorrowDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Current user simulation (in real app, this would come from auth)
  const currentUser: User = {
    id: 1,
    username: 'admin',
    email: 'admin@school.edu',
    full_name: 'Administrator',
    role: 'admin',
    created_at: new Date()
  };

  // Load data functions
  const loadItems = useCallback(async () => {
    try {
      const result = await trpc.getItems.query();
      setSearchResults(result);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const result = await trpc.getUsers.query();
      setUsers(result);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  const loadBorrowingHistory = useCallback(async () => {
    try {
      const result = await trpc.getBorrowingHistory.query({});
      setBorrowingHistory(result);
    } catch (error) {
      console.error('Failed to load borrowing history:', error);
    }
  }, []);

  const loadOverdueItems = useCallback(async () => {
    try {
      const result = await trpc.getOverdueItems.query();
      setOverdueItems(result);
    } catch (error) {
      console.error('Failed to load overdue items:', error);
    }
  }, []);

  useEffect(() => {
    loadItems();
    loadUsers();
    loadBorrowingHistory();
    loadOverdueItems();
  }, [loadItems, loadUsers, loadBorrowingHistory, loadOverdueItems]);

  // Search function
  const performSearch = useCallback(async () => {
    try {
      const searchInput: SearchItemsInput = {
        query: searchQuery || undefined,
        condition: conditionFilter === 'all' ? undefined : conditionFilter,
        storage_location: locationFilter || undefined,
        available_only: availableOnly || undefined
      };
      const result = await trpc.searchItems.query(searchInput);
      setSearchResults(result);
    } catch (error) {
      console.error('Failed to search items:', error);
    }
  }, [searchQuery, conditionFilter, locationFilter, availableOnly]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Item management functions
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createItem.mutate(itemForm);
      setItemForm({
        name: '',
        asset_code: '',
        description: null,
        purchase_date: null,
        condition: 'excellent',
        storage_location: '',
        quantity: 1,
        current_user_id: null
      });
      setShowAddDialog(false);
      await performSearch();
    } catch (error) {
      console.error('Failed to create item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    setIsLoading(true);
    try {
      const updateData: UpdateItemInput = {
        id: editingItem.id,
        ...itemForm
      };
      await trpc.updateItem.mutate(updateData);
      setShowEditDialog(false);
      setEditingItem(null);
      await performSearch();
    } catch (error) {
      console.error('Failed to update item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await trpc.deleteItem.mutate({ id: itemId });
      await performSearch();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleBorrowItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.borrowItem.mutate(borrowForm);
      await loadItems();
      await loadBorrowingHistory();
      setBorrowForm({
        item_id: 0,
        borrower_id: 0,
        expected_return_date: new Date(),
        notes: null
      });
      setShowBorrowDialog(false);
    } catch (error) {
      console.error('Failed to borrow item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.returnItem.mutate(returnForm);
      await loadItems();
      await loadBorrowingHistory();
      await loadOverdueItems();
      setReturnForm({
        borrowing_id: 0,
        notes: null
      });
      setShowReturnDialog(false);
    } catch (error) {
      console.error('Failed to return item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (item: Item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      asset_code: item.asset_code,
      description: item.description,
      purchase_date: item.purchase_date,
      condition: item.condition,
      storage_location: item.storage_location,
      quantity: item.quantity,
      current_user_id: item.current_user_id
    });
    setShowEditDialog(true);
  };

  const openBorrowDialog = (item: Item) => {
    setSelectedItem(item);
    setBorrowForm((prev: CreateBorrowingInput) => ({
      ...prev,
      item_id: item.id
    }));
    setShowBorrowDialog(true);
  };

  const getConditionBadgeColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-orange-100 text-orange-800';
      case 'damaged': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'borrowed': return 'bg-blue-100 text-blue-800';
      case 'returned': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
            🏫 Sistem Inventaris Sekolah
          </h1>
          <p className="text-gray-600">
            Kelola inventaris laboratorium komputer dan peralatan sekolah dengan mudah
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              📦 Inventaris
            </TabsTrigger>
            <TabsTrigger value="borrowing" className="flex items-center gap-2">
              📋 Peminjaman
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              📊 Riwayat
            </TabsTrigger>
            <TabsTrigger value="overdue" className="flex items-center gap-2">
              ⚠️ Terlambat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-6">
            {/* Search and Filter Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🔍 Pencarian & Filter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="search">Cari Barang</Label>
                    <Input
                      id="search"
                      placeholder="Nama atau kode aset..."
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="condition">Kondisi</Label>
                    <Select value={conditionFilter} onValueChange={(value: string) => setConditionFilter(value as ItemCondition | 'all')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Semua kondisi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua kondisi</SelectItem>
                        <SelectItem value="excellent">Sangat Baik</SelectItem>
                        <SelectItem value="good">Baik</SelectItem>
                        <SelectItem value="fair">Cukup</SelectItem>
                        <SelectItem value="poor">Buruk</SelectItem>
                        <SelectItem value="damaged">Rusak</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="location">Lokasi</Label>
                    <Input
                      id="location"
                      placeholder="Lab komputer, kelas, dll..."
                      value={locationFilter}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocationFilter(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="available"
                      checked={availableOnly}
                      onCheckedChange={setAvailableOnly}
                    />
                    <Label htmlFor="available">Hanya yang tersedia</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add Item Button */}
            {currentUser.role === 'admin' && (
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Daftar Inventaris</h2>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      ➕ Tambah Barang
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Tambah Barang Baru</DialogTitle>
                      <DialogDescription>
                        Masukkan detail barang inventaris baru
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateItem} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nama Barang</Label>
                        <Input
                          id="name"
                          placeholder="Contoh: Komputer Dell Optiplex"
                          value={itemForm.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setItemForm((prev: CreateItemInput) => ({ ...prev, name: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="asset_code">Kode Aset</Label>
                        <Input
                          id="asset_code"
                          placeholder="Contoh: COMP-001"
                          value={itemForm.asset_code}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setItemForm((prev: CreateItemInput) => ({ ...prev, asset_code: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Deskripsi</Label>
                        <Textarea
                          id="description"
                          placeholder="Detail tambahan tentang barang..."
                          value={itemForm.description || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setItemForm((prev: CreateItemInput) => ({
                              ...prev,
                              description: e.target.value || null
                            }))
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="condition">Kondisi</Label>
                          <Select
                            value={itemForm.condition}
                            onValueChange={(value: string) =>
                              setItemForm((prev: CreateItemInput) => ({ 
                                ...prev, 
                                condition: value as ItemCondition 
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="excellent">Sangat Baik</SelectItem>
                              <SelectItem value="good">Baik</SelectItem>
                              <SelectItem value="fair">Cukup</SelectItem>
                              <SelectItem value="poor">Buruk</SelectItem>
                              <SelectItem value="damaged">Rusak</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="quantity">Jumlah</Label>
                          <Input
                            id="quantity"
                            type="number"
                            min="1"
                            value={itemForm.quantity}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setItemForm((prev: CreateItemInput) => ({
                                ...prev,
                                quantity: parseInt(e.target.value) || 1
                              }))
                            }
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="storage_location">Lokasi Penyimpanan</Label>
                        <Input
                          id="storage_location"
                          placeholder="Contoh: Lab Komputer 1"
                          value={itemForm.storage_location}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setItemForm((prev: CreateItemInput) => ({ ...prev, storage_location: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="purchase_date">Tanggal Pembelian</Label>
                        <Input
                          id="purchase_date"
                          type="date"
                          value={itemForm.purchase_date?.toISOString().split('T')[0] || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setItemForm((prev: CreateItemInput) => ({
                              ...prev,
                              purchase_date: e.target.value ? new Date(e.target.value) : null
                            }))
                          }
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAddDialog(false)}
                        >
                          Batal
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="text-6xl mb-4">📦</div>
                  <p className="text-gray-500 text-lg">Belum ada barang inventaris</p>
                  {currentUser.role === 'admin' && (
                    <p className="text-gray-400">Klik tombol "Tambah Barang" untuk memulai</p>
                  )}
                </div>
              ) : (
                searchResults.map((item: Item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                          <CardDescription className="font-mono text-sm">
                            {item.asset_code}
                          </CardDescription>
                        </div>
                        <Badge className={getConditionBadgeColor(item.condition)}>
                          {item.condition === 'excellent' && 'Sangat Baik'}
                          {item.condition === 'good' && 'Baik'}
                          {item.condition === 'fair' && 'Cukup'}
                          {item.condition === 'poor' && 'Buruk'}
                          {item.condition === 'damaged' && 'Rusak'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {item.description && (
                        <p className="text-sm text-gray-600">{item.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Lokasi:</span>
                          <p className="font-medium">{item.storage_location}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Jumlah:</span>
                          <p className="font-medium">{item.quantity}</p>
                        </div>
                      </div>
                      {item.purchase_date && (
                        <div className="text-sm">
                          <span className="text-gray-500">Dibeli:</span>
                          <p className="font-medium">{item.purchase_date.toLocaleDateString('id-ID')}</p>
                        </div>
                      )}
                      {item.current_user_id && (
                        <div className="text-sm">
                          <span className="text-orange-600 font-medium">
                            🔄 Sedang dipinjam
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between">
                        {currentUser.role === 'admin' && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(item)}
                            >
                              ✏️ Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  🗑️ Hapus
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus Barang</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus "{item.name}"? 
                                    Tindakan ini tidak dapat dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                        {!item.current_user_id && (
                          <Button
                            size="sm"
                            onClick={() => openBorrowDialog(item)}
                            className="ml-auto"
                          >
                            📤 Pinjam
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="borrowing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📋 Manajemen Peminjaman
                </CardTitle>
                <CardDescription>
                  Kelola peminjaman dan pengembalian barang inventaris
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4">
                  <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
                    <DialogTrigger asChild>
                      <Button>📥 Kembalikan Barang</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Kembalikan Barang</DialogTitle>
                        <DialogDescription>
                          Proses pengembalian barang yang dipinjam
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleReturnItem} className="space-y-4">
                        <div>
                          <Label htmlFor="borrowing_id">ID Peminjaman</Label>
                          <Input
                            id="borrowing_id"
                            type="number"
                            value={returnForm.borrowing_id || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setReturnForm((prev: ReturnItemInput) => ({
                                ...prev,
                                borrowing_id: parseInt(e.target.value) || 0
                              }))
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="return_notes">Catatan</Label>
                          <Textarea
                            id="return_notes"
                            placeholder="Kondisi barang saat dikembalikan..."
                            value={returnForm.notes || ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                              setReturnForm((prev: ReturnItemInput) => ({
                                ...prev,
                                notes: e.target.value || null
                              }))
                            }
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowReturnDialog(false)}
                          >
                            Batal
                          </Button>
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Memproses...' : 'Kembalikan'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📊 Riwayat Peminjaman
                </CardTitle>
                <CardDescription>
                  Lihat semua riwayat peminjaman dan pengembalian barang
                </CardDescription>
              </CardHeader>
              <CardContent>
                {borrowingHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📋</div>
                    <p className="text-gray-500">Belum ada riwayat peminjaman</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {borrowingHistory.map((record: BorrowingHistory) => (
                      <Card key={record.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">ID Peminjaman: {record.id}</p>
                              <p className="text-sm text-gray-600">
                                ID Barang: {record.item_id} | ID Peminjam: {record.borrower_id}
                              </p>
                              <p className="text-sm text-gray-600">
                                Dipinjam: {record.borrowed_date.toLocaleDateString('id-ID')}
                              </p>
                              <p className="text-sm text-gray-600">
                                Target kembali: {record.expected_return_date.toLocaleDateString('id-ID')}
                              </p>
                              {record.actual_return_date && (
                                <p className="text-sm text-gray-600">
                                  Dikembalikan: {record.actual_return_date.toLocaleDateString('id-ID')}
                                </p>
                              )}
                              {record.notes && (
                                <p className="text-sm text-gray-600 italic">
                                  Catatan: {record.notes}
                                </p>
                              )}
                            </div>
                            <Badge className={getStatusBadgeColor(record.status)}>
                              {record.status === 'borrowed' && 'Dipinjam'}
                              {record.status === 'returned' && 'Dikembalikan'}
                              {record.status === 'overdue' && 'Terlambat'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overdue" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  ⚠️ Barang Terlambat Dikembalikan
                </CardTitle>
                <CardDescription>
                  Daftar barang yang telah melewati batas waktu pengembalian
                </CardDescription>
              </CardHeader>
              <CardContent>
                {overdueItems.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">✅</div>
                    <p className="text-green-600 font-medium">
                      Tidak ada barang yang terlambat dikembalikan
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {overdueItems.map((record: BorrowingHistory) => (
                      <Card key={record.id} className="border-l-4 border-l-red-500">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-red-700">
                                ID Peminjaman: {record.id}
                              </p>
                              <p className="text-sm text-gray-600">
                                ID Barang: {record.item_id}
                              </p>
                              <p className="text-sm text-gray-600">
                                ID Peminjam: {record.borrower_id}
                              </p>
                              <p className="text-sm text-gray-600">
                                Seharusnya dikembalikan: {record.expected_return_date.toLocaleDateString('id-ID')}
                              </p>
                              <p className="text-sm text-red-600 font-medium">
                                Terlambat: {Math.ceil((new Date().getTime() - record.expected_return_date.getTime()) / (1000 * 60 * 60 * 24))} hari
                              </p>
                              {record.notes && (
                                <p className="text-sm text-gray-600 italic">
                                  Catatan: {record.notes}
                                </p>
                              )}
                            </div>
                            <Badge className="bg-red-100 text-red-800">
                              Terlambat
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Item Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Barang</DialogTitle>
              <DialogDescription>
                Ubah informasi barang inventaris
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <Label htmlFor="edit_name">Nama Barang</Label>
                <Input
                  id="edit_name"
                  value={itemForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setItemForm((prev: CreateItemInput) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_asset_code">Kode Aset</Label>
                <Input
                  id="edit_asset_code"
                  value={itemForm.asset_code}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setItemForm((prev: CreateItemInput) => ({ ...prev, asset_code: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_description">Deskripsi</Label>
                <Textarea
                  id="edit_description"
                  value={itemForm.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setItemForm((prev: CreateItemInput) => ({
                      ...prev,
                      description: e.target.value || null
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_condition">Kondisi</Label>
                  <Select
                    value={itemForm.condition}
                    onValueChange={(value: string) =>
                      setItemForm((prev: CreateItemInput) => ({ 
                        ...prev, 
                        condition: value as ItemCondition 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Sangat Baik</SelectItem>
                      <SelectItem value="good">Baik</SelectItem>
                      <SelectItem value="fair">Cukup</SelectItem>
                      <SelectItem value="poor">Buruk</SelectItem>
                      <SelectItem value="damaged">Rusak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit_quantity">Jumlah</Label>
                  <Input
                    id="edit_quantity"
                    type="number"
                    min="1"
                    value={itemForm.quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setItemForm((prev: CreateItemInput) => ({
                        ...prev,
                        quantity: parseInt(e.target.value) || 1
                      }))
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit_storage_location">Lokasi Penyimpanan</Label>
                <Input
                  id="edit_storage_location"
                  value={itemForm.storage_location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setItemForm((prev: CreateItemInput) => ({ ...prev, storage_location: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Borrow Item Dialog */}
        <Dialog open={showBorrowDialog} onOpenChange={setShowBorrowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Pinjam Barang</DialogTitle>
              <DialogDescription>
                Pinjam "{selectedItem?.name}" untuk pengguna
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleBorrowItem} className="space-y-4">
              <div>
                <Label htmlFor="borrower_id">ID Peminjam</Label>
                <Select
                  value={borrowForm.borrower_id > 0 ? borrowForm.borrower_id.toString() : 'none'}
                  onValueChange={(value: string) =>
                    setBorrowForm((prev: CreateBorrowingInput) => ({
                      ...prev,
                      borrower_id: value === 'none' ? 0 : parseInt(value)
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pengguna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Pilih pengguna</SelectItem>
                    {users.length > 0 ? (
                      users.map((user: User) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.full_name} ({user.username})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>Memuat pengguna...</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expected_return_date">Tanggal Kembali</Label>
                <Input
                  id="expected_return_date"
                  type="date"
                  value={borrowForm.expected_return_date.toISOString().split('T')[0]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setBorrowForm((prev: CreateBorrowingInput) => ({
                      ...prev,
                      expected_return_date: new Date(e.target.value)
                    }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="borrow_notes">Catatan</Label>
                <Textarea
                  id="borrow_notes"
                  placeholder="Catatan tambahan tentang peminjaman..."
                  value={borrowForm.notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setBorrowForm((prev: CreateBorrowingInput) => ({
                      ...prev,
                      notes: e.target.value || null
                    }))
                  }
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBorrowDialog(false)}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || borrowForm.borrower_id === 0}
                >
                  {isLoading ? 'Memproses...' : 'Pinjam'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default App;
