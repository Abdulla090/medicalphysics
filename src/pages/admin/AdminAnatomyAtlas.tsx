import { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, ScanLine, Layers, Magnet, Activity, Image, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const iconOptions = [
    { value: 'scan', label: 'X-Ray', icon: ScanLine },
    { value: 'layers', label: 'CT Scan', icon: Layers },
    { value: 'magnet', label: 'MRI', icon: Magnet },
    { value: 'activity', label: 'Ultrasound', icon: Activity },
];

const colorOptions = [
    { value: 'from-slate-500 to-zinc-600', label: 'Slate' },
    { value: 'from-blue-500 to-cyan-600', label: 'Blue' },
    { value: 'from-purple-500 to-violet-600', label: 'Purple' },
    { value: 'from-green-500 to-emerald-600', label: 'Green' },
    { value: 'from-amber-500 to-orange-600', label: 'Amber' },
    { value: 'from-red-500 to-rose-600', label: 'Red' },
];

function AdminAnatomyAtlas() {
    const devices = useQuery(api.anatomy.getAnatomyDevices);
    const createDevice = useMutation(api.anatomy.createAnatomyDevice);
    const updateDevice = useMutation(api.anatomy.updateAnatomyDevice);
    const deleteDevice = useMutation(api.anatomy.deleteAnatomyDevice);

    const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
    const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState<any>(null);
    const [deviceForm, setDeviceForm] = useState({
        deviceId: '', title: '', titleKu: '', description: '', descriptionKu: '',
        icon: 'scan', color: 'from-slate-500 to-zinc-600', orderIndex: 0, isPublished: false
    });

    const handleCreateDevice = async () => {
        try {
            await createDevice(deviceForm);
            toast.success('Device created successfully');
            setIsDeviceDialogOpen(false);
            resetDeviceForm();
        } catch (error) {
            toast.error('Failed to create device');
        }
    };

    const handleUpdateDevice = async () => {
        if (!editingDevice) return;
        try {
            await updateDevice({ id: editingDevice._id, ...deviceForm });
            toast.success('Device updated successfully');
            setIsDeviceDialogOpen(false);
            setEditingDevice(null);
            resetDeviceForm();
        } catch (error) {
            toast.error('Failed to update device');
        }
    };

    const handleDeleteDevice = async (id: Id<"anatomy_devices">) => {
        if (!confirm('Delete this device and all its parts?')) return;
        try {
            await deleteDevice({ id });
            toast.success('Device deleted');
        } catch (error) {
            toast.error('Failed to delete device');
        }
    };

    const handleTogglePublish = async (device: any) => {
        try {
            await updateDevice({ id: device._id, isPublished: !device.isPublished });
            toast.success(device.isPublished ? 'Device unpublished' : 'Device published');
        } catch (error) {
            toast.error('Failed to update device');
        }
    };

    const resetDeviceForm = () => {
        setDeviceForm({
            deviceId: '', title: '', titleKu: '', description: '', descriptionKu: '',
            icon: 'scan', color: 'from-slate-500 to-zinc-600', orderIndex: 0, isPublished: false
        });
    };

    const openEditDialog = (device: any) => {
        setEditingDevice(device);
        setDeviceForm({
            deviceId: device.deviceId, title: device.title, titleKu: device.titleKu,
            description: device.description, descriptionKu: device.descriptionKu,
            icon: device.icon, color: device.color, orderIndex: device.orderIndex, isPublished: device.isPublished
        });
        setIsDeviceDialogOpen(true);
    };

    const getIconComponent = (iconName: string) => {
        const found = iconOptions.find(i => i.value === iconName);
        return found ? found.icon : ScanLine;
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Anatomy Atlas</h1>
                        <p className="text-muted-foreground">Manage imaging devices and anatomy parts</p>
                    </div>
                    <Dialog open={isDeviceDialogOpen} onOpenChange={(open) => {
                        setIsDeviceDialogOpen(open);
                        if (!open) { setEditingDevice(null); resetDeviceForm(); }
                    }}>
                        <DialogTrigger asChild>
                            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Device</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{editingDevice ? 'Edit Device' : 'Add New Device'}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Device ID (unique)</Label>
                                        <Input value={deviceForm.deviceId} onChange={(e) => setDeviceForm({ ...deviceForm, deviceId: e.target.value })} placeholder="e.g. xray" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Order Index</Label>
                                        <Input type="number" value={deviceForm.orderIndex} onChange={(e) => setDeviceForm({ ...deviceForm, orderIndex: parseInt(e.target.value) || 0 })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Title (English)</Label>
                                        <Input value={deviceForm.title} onChange={(e) => setDeviceForm({ ...deviceForm, title: e.target.value })} placeholder="X-Ray Imaging" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Title (Kurdish)</Label>
                                        <Input value={deviceForm.titleKu} onChange={(e) => setDeviceForm({ ...deviceForm, titleKu: e.target.value })} placeholder="وێنەگرتنی تیشکی ئێکس" dir="rtl" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Description (English)</Label>
                                        <Textarea value={deviceForm.description} onChange={(e) => setDeviceForm({ ...deviceForm, description: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description (Kurdish)</Label>
                                        <Textarea value={deviceForm.descriptionKu} onChange={(e) => setDeviceForm({ ...deviceForm, descriptionKu: e.target.value })} dir="rtl" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Icon</Label>
                                        <Select value={deviceForm.icon} onValueChange={(v) => setDeviceForm({ ...deviceForm, icon: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {iconOptions.map(opt => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        <div className="flex items-center gap-2"><opt.icon className="w-4 h-4" />{opt.label}</div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Color</Label>
                                        <Select value={deviceForm.color} onValueChange={(v) => setDeviceForm({ ...deviceForm, color: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {colorOptions.map(opt => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-4 h-4 rounded bg-gradient-to-r ${opt.value}`} />
                                                            {opt.label}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch checked={deviceForm.isPublished} onCheckedChange={(checked) => setDeviceForm({ ...deviceForm, isPublished: checked })} />
                                    <Label>Published</Label>
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <Button variant="outline" onClick={() => setIsDeviceDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={editingDevice ? handleUpdateDevice : handleCreateDevice}>
                                        {editingDevice ? 'Update' : 'Create'}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Devices Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {devices?.map((device) => {
                        const IconComp = getIconComponent(device.icon);
                        return (
                            <Card key={device._id} className="group hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${device.color} flex items-center justify-center text-white`}>
                                                <IconComp className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{device.title}</CardTitle>
                                                <p className="text-xs text-muted-foreground">{device.deviceId}</p>
                                            </div>
                                        </div>
                                        <Badge variant={device.isPublished ? "default" : "secondary"}>
                                            {device.isPublished ? 'Published' : 'Draft'}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{device.description}</p>
                                    <div className="flex items-center justify-between">
                                        <Button variant="outline" size="sm" onClick={() => setSelectedDevice(device.deviceId)} className="gap-1">
                                            <Image className="w-3 h-3" /> Manage Parts <ChevronRight className="w-3 h-3" />
                                        </Button>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleTogglePublish(device)}>
                                                {device.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(device)}><Pencil className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteDevice(device._id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Parts Management Section */}
                {selectedDevice && (
                    <PartsManager deviceId={selectedDevice} onClose={() => setSelectedDevice(null)} />
                )}
            </div>
        </AdminLayout>
    );
}

// Parts Manager Component
function PartsManager({ deviceId, onClose }: { deviceId: string; onClose: () => void }) {
    const parts = useQuery(api.anatomy.getAnatomyPartsByDevice, { deviceId });
    const createPart = useMutation(api.anatomy.createAnatomyPart);
    const updatePart = useMutation(api.anatomy.updateAnatomyPart);
    const deletePart = useMutation(api.anatomy.deleteAnatomyPart);
    const generateUploadUrl = useMutation(api.anatomy.generateAnatomyUploadUrl);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPart, setEditingPart] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
    const [partForm, setPartForm] = useState({
        partId: '', title: '', titleKu: '', description: '', descriptionKu: '',
        imageUrl: '', imageStorageId: '', keyStructures: [{ en: '', ku: '' }], clinicalNotes: [{ en: '', ku: '' }],
        orderIndex: 0, isPublished: false
    });

    const resetForm = () => {
        setPartForm({
            partId: '', title: '', titleKu: '', description: '', descriptionKu: '',
            imageUrl: '', imageStorageId: '', keyStructures: [{ en: '', ku: '' }], clinicalNotes: [{ en: '', ku: '' }],
            orderIndex: 0, isPublished: false
        });
        setImagePreviewUrl('');
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file');
            return;
        }

        setIsUploading(true);
        try {
            console.log('Generating upload URL...');
            const uploadUrl = await generateUploadUrl();
            console.log('Upload URL generated:', uploadUrl);

            console.log('Uploading file:', file.name, file.type, file.size);
            const result = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': file.type },
                body: file
            });

            if (!result.ok) {
                throw new Error(`Upload failed with status: ${result.status}`);
            }

            const responseData = await result.json();
            console.log('Upload response:', responseData);

            const { storageId } = responseData;
            if (!storageId) {
                throw new Error('No storageId returned from upload');
            }

            // Store as imageStorageId, not imageUrl
            setPartForm(prev => ({ ...prev, imageStorageId: storageId, imageUrl: '' }));
            // Create a local preview URL
            setImagePreviewUrl(URL.createObjectURL(file));
            toast.success('Image uploaded successfully');
        } catch (error) {
            console.error('Failed to upload image:', error);
            toast.error('Failed to upload image. Please try again.');
        }
        setIsUploading(false);
    };

    const handleUrlChange = (url: string) => {
        // If user pastes a URL, clear the storage ID and use imageUrl
        setPartForm({ ...partForm, imageUrl: url, imageStorageId: '' });
        setImagePreviewUrl(url);
    };

    const handleCreate = async () => {
        const cleanStructures = partForm.keyStructures.filter(s => s.en || s.ku);
        const cleanNotes = partForm.clinicalNotes.filter(n => n.en || n.ku);
        try {
            // Properly validate imageStorageId - it must be a valid storage ID or undefined
            const validStorageId = partForm.imageStorageId && partForm.imageStorageId.trim() !== ''
                ? partForm.imageStorageId as Id<"_storage">
                : undefined;
            const validImageUrl = partForm.imageUrl && partForm.imageUrl.trim() !== ''
                ? partForm.imageUrl
                : undefined;

            await createPart({
                deviceId,
                partId: partForm.partId,
                title: partForm.title,
                titleKu: partForm.titleKu,
                description: partForm.description,
                descriptionKu: partForm.descriptionKu,
                imageStorageId: validStorageId,
                imageUrl: validImageUrl,
                keyStructures: cleanStructures.length ? cleanStructures : [{ en: '', ku: '' }],
                clinicalNotes: cleanNotes.length ? cleanNotes : [{ en: '', ku: '' }],
                orderIndex: partForm.orderIndex,
                isPublished: partForm.isPublished
            });
            toast.success('Part created');
            setIsDialogOpen(false);
            resetForm();
        } catch (error) {
            console.error('Failed to create part:', error);
            toast.error('Failed to create part');
        }
    };

    const handleUpdate = async () => {
        if (!editingPart) return;
        const cleanStructures = partForm.keyStructures.filter(s => s.en || s.ku);
        const cleanNotes = partForm.clinicalNotes.filter(n => n.en || n.ku);
        try {
            // Properly validate imageStorageId - it must be a valid storage ID or undefined
            const validStorageId = partForm.imageStorageId && partForm.imageStorageId.trim() !== ''
                ? partForm.imageStorageId as Id<"_storage">
                : undefined;
            const validImageUrl = partForm.imageUrl && partForm.imageUrl.trim() !== ''
                ? partForm.imageUrl
                : undefined;

            await updatePart({
                id: editingPart._id,
                title: partForm.title,
                titleKu: partForm.titleKu,
                description: partForm.description,
                descriptionKu: partForm.descriptionKu,
                imageStorageId: validStorageId,
                imageUrl: validImageUrl,
                keyStructures: cleanStructures,
                clinicalNotes: cleanNotes,
                orderIndex: partForm.orderIndex,
                isPublished: partForm.isPublished
            });
            toast.success('Part updated');
            setIsDialogOpen(false);
            setEditingPart(null);
            resetForm();
        } catch (error) {
            console.error('Failed to update part:', error);
            toast.error('Failed to update part');
        }
    };

    const handleDelete = async (id: Id<"anatomy_parts">) => {
        if (!confirm('Delete this part?')) return;
        try {
            await deletePart({ id });
            toast.success('Part deleted');
        } catch (error) {
            toast.error('Failed to delete part');
        }
    };

    const openEdit = (part: any) => {
        setEditingPart(part);
        setPartForm({
            partId: part.partId, title: part.title, titleKu: part.titleKu,
            description: part.description, descriptionKu: part.descriptionKu,
            imageUrl: part.imageUrl || '', imageStorageId: part.imageStorageId || '',
            keyStructures: part.keyStructures || [{ en: '', ku: '' }],
            clinicalNotes: part.clinicalNotes || [{ en: '', ku: '' }], orderIndex: part.orderIndex, isPublished: part.isPublished
        });
        // Set preview URL from existing imageUrl (already resolved by backend)
        setImagePreviewUrl(part.imageUrl || '');
        setIsDialogOpen(true);
    };

    const addStructure = () => setPartForm({ ...partForm, keyStructures: [...partForm.keyStructures, { en: '', ku: '' }] });
    const addNote = () => setPartForm({ ...partForm, clinicalNotes: [...partForm.clinicalNotes, { en: '', ku: '' }] });
    const updateStructure = (idx: number, field: 'en' | 'ku', value: string) => {
        const updated = [...partForm.keyStructures];
        updated[idx][field] = value;
        setPartForm({ ...partForm, keyStructures: updated });
    };
    const updateNote = (idx: number, field: 'en' | 'ku', value: string) => {
        const updated = [...partForm.clinicalNotes];
        updated[idx][field] = value;
        setPartForm({ ...partForm, clinicalNotes: updated });
    };

    return (
        <Card className="mt-6">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Parts for: {deviceId.toUpperCase()}</CardTitle>
                    <div className="flex gap-2">
                        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingPart(null); resetForm(); } }}>
                            <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Part</Button></DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader><DialogTitle>{editingPart ? 'Edit Part' : 'Add New Part'}</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><Label>Part ID</Label><Input value={partForm.partId} onChange={(e) => setPartForm({ ...partForm, partId: e.target.value })} disabled={!!editingPart} /></div>
                                        <div><Label>Order</Label><Input type="number" value={partForm.orderIndex} onChange={(e) => setPartForm({ ...partForm, orderIndex: parseInt(e.target.value) || 0 })} /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><Label>Title (EN)</Label><Input value={partForm.title} onChange={(e) => setPartForm({ ...partForm, title: e.target.value })} /></div>
                                        <div><Label>Title (KU)</Label><Input value={partForm.titleKu} onChange={(e) => setPartForm({ ...partForm, titleKu: e.target.value })} dir="rtl" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><Label>Description (EN)</Label><Textarea value={partForm.description} onChange={(e) => setPartForm({ ...partForm, description: e.target.value })} /></div>
                                        <div><Label>Description (KU)</Label><Textarea value={partForm.descriptionKu} onChange={(e) => setPartForm({ ...partForm, descriptionKu: e.target.value })} dir="rtl" /></div>
                                    </div>
                                    <div className="space-y-3">
                                        <Label>Image</Label>

                                        {/* Image Preview */}
                                        {imagePreviewUrl && (
                                            <div className="relative w-full h-40 bg-muted rounded-lg overflow-hidden">
                                                <img
                                                    src={imagePreviewUrl}
                                                    alt="Preview"
                                                    className="w-full h-full object-contain"
                                                    onError={() => setImagePreviewUrl('')}
                                                />
                                            </div>
                                        )}

                                        {/* Upload Section */}
                                        <div className="flex items-center gap-2">
                                            <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} className="flex-1" />
                                            {isUploading && <span className="text-xs text-muted-foreground">Uploading...</span>}
                                        </div>
                                        {partForm.imageStorageId && <p className="text-xs text-green-600">✓ Image uploaded to storage</p>}

                                        {/* URL Input */}
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Or paste external URL:</p>
                                            <Input
                                                value={partForm.imageUrl}
                                                onChange={(e) => handleUrlChange(e.target.value)}
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2"><Label>Key Structures</Label><Button type="button" variant="outline" size="sm" onClick={addStructure}>+ Add</Button></div>
                                        {partForm.keyStructures.map((s, i) => (
                                            <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                                                <Input value={s.en} onChange={(e) => updateStructure(i, 'en', e.target.value)} placeholder="English" />
                                                <Input value={s.ku} onChange={(e) => updateStructure(i, 'ku', e.target.value)} placeholder="Kurdish" dir="rtl" />
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2"><Label>Clinical Notes</Label><Button type="button" variant="outline" size="sm" onClick={addNote}>+ Add</Button></div>
                                        {partForm.clinicalNotes.map((n, i) => (
                                            <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                                                <Input value={n.en} onChange={(e) => updateNote(i, 'en', e.target.value)} placeholder="English" />
                                                <Input value={n.ku} onChange={(e) => updateNote(i, 'ku', e.target.value)} placeholder="Kurdish" dir="rtl" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2"><Switch checked={partForm.isPublished} onCheckedChange={(c) => setPartForm({ ...partForm, isPublished: c })} /><Label>Published</Label></div>
                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                        <Button onClick={editingPart ? handleUpdate : handleCreate}>{editingPart ? 'Update' : 'Create'}</Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {parts?.length === 0 && <p className="text-muted-foreground text-center py-8">No parts yet. Add your first part!</p>}
                    {parts?.map((part) => (
                        <div key={part._id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                                {part.imageUrl && <img src={part.imageUrl} alt={part.title} className="w-12 h-12 object-cover rounded" />}
                                <div>
                                    <p className="font-medium">{part.title}</p>
                                    <p className="text-xs text-muted-foreground">{part.partId}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={part.isPublished ? "default" : "secondary"}>{part.isPublished ? 'Published' : 'Draft'}</Badge>
                                <Button variant="ghost" size="icon" onClick={() => openEdit(part)}><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(part._id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default AdminAnatomyAtlas;
